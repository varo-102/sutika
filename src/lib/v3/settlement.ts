import "server-only";
import { PublicError } from "../errors.ts";
import { rpc, scValToNative, StrKey, Transaction, TransactionBuilder, type xdr } from "@stellar/stellar-sdk";
import type { CompetitionOperationV3 } from "@prisma/client";
import type { ActionInput } from "../auth";
import { database } from "../prisma";
import { verifiedTransfers } from "../receipts";
import { actionHash, build, locate, type Context, type V3Kind } from "./actions";
import { hex, prepareTransaction, stellarV3, testnet, usdc } from "./chain";

const lasting = ["CONFIRMED", "FAILED", "EXPIRED"];
const eventFor: Record<string, string[]> = {
  create: ["created"],
  fund: ["funded"],
  join: ["joined"],
  freeze: ["frozen", "cancelled"],
  declare: ["result"],
  cancel: ["cancelled"],
  pay: ["paid"],
  refund: ["refund"],
};

function eventMatches(
  events: xdr.ContractEvent[], operation: CompetitionOperationV3, core: string, context: Context,
) {
  const topics = eventFor[operation.kind];
  if (!topics) return true;
  return events.some((event) => {
    if (!event.contractId || StrKey.encodeContract(event.contractId.toBytes()) !== core) return false;
    const body = event.body.v0;
    const [topic, id, place] = body.topics.map(scValToNative);
    if (!topics.includes(topic) || !(id instanceof Uint8Array) || hex(id) !== operation.competitionId) return false;
    if (operation.kind === "pay" && place !== context.place) return false;
    if (operation.kind === "join" || operation.kind === "refund") {
      const [subject, address, amount] = scValToNative(body.data);
      return subject instanceof Uint8Array && hex(subject) === context.team &&
        (operation.kind === "join"
          ? address === context.member && String(amount) === context.contribution
          : address === context.to?.[0] && String(amount) === context.amounts?.[0]);
    }
    return true;
  });
}

export async function prepare(actor: string, action: ActionInput, kind: V3Kind) {
  const row = await locate(actor, action);
  const intent = actionHash(JSON.stringify(action));
  const db = database();
  const previous = await db.competitionOperationV3.findFirst({
    where: { competitionId: row.id, actor, intent, status: { in: ["PREPARED", "CONFIRMED"] } },
    orderBy: { createdAt: "desc" },
  });
  if (previous) {
    const known = await settle(previous.id);
    if (known.status === "CONFIRMED") return known;
    if (known.status === "PREPARED") {
      return { ...known, xdr: previous.unsignedXdr };
    }
  }

  const { operation, context } = await build(row, actor, action, kind);
  const ready = await prepareTransaction(actor, operation, kind === "join");
  const hash = hex(ready.hash());
  const expiresAt = new Date(Number(ready.timeBounds?.maxTime) * 1000);
  const tx = await db.competitionOperationV3.upsert({
    where: { hash },
    update: {},
    create: {
      competitionId: row.id, kind, actor, intent, hash, context,
      unsignedXdr: ready.toXDR(), expiresAt,
    },
  });
  return { id: tx.id, hash, status: tx.status, xdr: tx.unsignedXdr, slug: row.slug };
}

export async function settle(id: string, signedXdr?: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new PublicError("No se encontró esta solicitud de Stellar.", "This Stellar request could not be found.");
  const db = database();
  const op = await db.competitionOperationV3.findUnique({
    where: { id }, include: { competition: { select: { slug: true, contractId: true } } },
  });
  if (!op) throw new PublicError("No se encontró esta solicitud de Stellar.", "This Stellar request could not be found.");
  const { hash } = op;
  const reply = { id, hash, slug: op.competition.slug };
  if (lasting.includes(op.status)) return { ...reply, status: op.status };

  const server = stellarV3();
  let status = await server.getTransaction(hash);
  if (status.status === rpc.Api.GetTransactionStatus.NOT_FOUND && signedXdr) {
    const signed = TransactionBuilder.fromXDR(signedXdr, testnet);
    if (!(signed instanceof Transaction) || signed.source !== op.actor ||
      hex(signed.hash()) !== hash || signed.signatures.length < 1) {
      throw new PublicError("La firma no corresponde a la transacción de la ficha.", "The signature does not match this tournament transaction.");
    }
    const sent = await server.sendTransaction(signed);
    if (!["PENDING", "DUPLICATE", "TRY_AGAIN_LATER"].includes(sent.status)) {
      // A parallel submission can win the race. Consult Testnet before reporting failure.
      status = await server.getTransaction(hash);
      if (status.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
        throw new PublicError("Stellar rechazó la transacción. Comprueba tu saldo Testnet o vuelve a intentarlo.", "Stellar rejected the transaction. Check your test balance and try again.");
      }
    }
  }
  if (status.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    const expired = status.latestLedgerCloseTime * 1000 >= op.expiresAt.getTime();
    if (!expired) return { ...reply, status: "PREPARED" };
    await db.competitionOperationV3.updateMany({ where: { id, status: "PREPARED" }, data: { status: "EXPIRED" } });
    return { ...reply, status: "EXPIRED" };
  }
  if (status.status === rpc.Api.GetTransactionStatus.FAILED) {
    await db.competitionOperationV3.updateMany({ where: { id, status: "PREPARED" }, data: { status: "FAILED" } });
    return { ...reply, status: "FAILED" };
  }

  const ctx = op.context as Context;
  const events = status.events?.contractEventsXdr.flat() ?? [];
  if (!eventMatches(events, op, op.competition.contractId, ctx)
    || (ctx.from && !verifiedTransfers(op.kind, ctx, ctx.place ?? 0, usdc, events))
    || (op.kind === "escrow" && (!status.returnValue || scValToNative(status.returnValue)?.[0] !== ctx.escrow))) {
    throw new PublicError("La transacción requiere revisión. Su comprobante todavía no coincide con la operación.", "The transaction needs review. Its receipt does not yet match the operation.");
  }
  const confirmedAt = new Date(status.createdAt * 1000);
  await db.$transaction(async (projection) => {
    const changed = await projection.competitionOperationV3.updateMany({
      where: { id, status: "PREPARED" }, data: { status: "CONFIRMED", confirmedAt },
    });
    if (!changed.count) return;
    if (op.kind === "create") {
      await projection.competitionV3.update({
        where: { id: op.competitionId }, data: { anchoredAt: confirmedAt },
      });
    }
    if (op.kind === "join" && ctx.team && ctx.contribution && BigInt(ctx.contribution) > 0n) {
      await projection.entryFeeContribution.create({
        data: {
          competitionId: op.competitionId, teamId: ctx.team, payer: op.actor,
          paymentHash: hash, stroops: BigInt(ctx.contribution), paidAt: confirmedAt,
        },
      });
    }
    if (op.kind === "refund" && ctx.team) {
      await projection.entryFeeContribution.updateMany({
        where: { competitionId: op.competitionId, teamId: ctx.team, refundHash: null },
        data: { refundHash: hash, refundedAt: confirmedAt },
      });
    }
  });
  return { ...reply, status: "CONFIRMED" };
}
