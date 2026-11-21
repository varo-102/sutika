import "server-only";
import { createHash } from "node:crypto";
import { verifiedTransfers } from "./receipts";
import {
  Address,
  BASE_FEE,
  Contract,
  Networks,
  nativeToScVal,
  rpc,
  scValToNative,
  StrKey,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Prisma } from "@prisma/client";
import { database } from "./prisma";
import { getTournament, details } from "./tournamentsService";
import { shortText, wallet, type ActionInput } from "./auth";
import { deployment, SUTIKA_CONTRACT_ID, TESTNET_RPC_URL } from "./stellar";
import { display, split, units, WINNER_FUNDING, WINNER_UNITS } from "./rules";

const network = Networks.TESTNET;
const usdc = deployment.usdc;
const server = () => new rpc.Server(TESTNET_RPC_URL);
const addressVal = (s: string) => Address.fromString(s).toScVal();
const u32 = (n: number) => xdr.ScVal.scvU32(n);
const bytes = (hex: string) => xdr.ScVal.scvBytes(Buffer.from(hex, "hex"));
const vec = (xs: xdr.ScVal[]) => xdr.ScVal.scvVec(xs);
const i128 = (n: bigint) => nativeToScVal(n, { type: "i128" });
type Loaded = NonNullable<Awaited<ReturnType<typeof getTournament>>>;
type Context = {
  intent?: string;
  escrow?: string;
  roster?: string[][];
  podium?: string[];
  uphold?: boolean;
  from?: string;
  to?: string[];
  amounts?: string[];
  ledgerId?: string;
  core?: string;
};
type Built = { unsignedXdr: string; context: Context };
const active = (op: { status: string }) =>
  ["PENDING", "PREPARED"].includes(op.status);
const rosterOf = (t: Loaded) =>
  t.teams.map((team) =>
    team.participants.map((p) => wallet(p.user.stellarSmartWalletAddress)),
  );
const proof = (t: Loaded, kind: string) =>
  t.ledgerOperations.some((o) => o.kind === kind && o.status === "CONFIRMED");
async function tw(path: string, body: object) {
  const key = process.env.TRUSTLESS_WORK_API_KEY;
  if (!key) throw new Error("Falta configurar Trustless Work Testnet.");
  const res = await fetch(
    "https://beta.api.trustlesswork.com/escrow/multi-release/v2/" + path,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(18_000),
      cache: "no-store",
    },
  );
  if (!res.ok)
    throw new Error(
      "Trustless Work no preparó la operación (" + res.status + ").",
    );
  const result = await res.json();
  if (typeof result.unsignedXdr !== "string")
    throw new Error("Trustless Work devolvió una respuesta incompleta.");
  return result as { unsignedXdr: string; contractId?: string };
}
async function core(
  actor: string,
  fn: string,
  args: xdr.ScVal[],
): Promise<Built> {
  const rpcServer = server();
  const acct = await rpcServer.getAccount(actor);
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: network,
  })
    .addOperation(new Contract(SUTIKA_CONTRACT_ID).call(fn, ...args))
    .setTimeout(240)
    .build();
  try {
    return {
      unsignedXdr: (await rpcServer.prepareTransaction(tx)).toXDR(),
      context: {},
    };
  } catch {
    throw new Error(
      "Stellar rechazó la simulación. Comprueba los roles, el plazo y los fondos.",
    );
  }
}

async function build(
  t: Loaded,
  actor: string,
  action: ActionInput,
  slot: number,
): Promise<Built> {
  const kind = String(action.kind);
  const org = wallet(t.organizer.stellarSmartWalletAddress),
    sponsor = wallet(t.sponsorWallet);
  const resolver = wallet(t.resolverWallet),
    id = bytes(t.ledgerId!);
  const escrow = t.sorobanEscrowId;
  const prize = t.prizes[0];
  if (
    t.prizes.length !== 1 ||
    prize?.targetStanding !== 1 ||
    !prize.amountUsdc ||
    units(prize.amountUsdc.toString()) !== WINNER_UNITS
  )
    throw new Error("El premio configurado no coincide con el torneo.");
  if (
    (["anchor", "freeze", "declare", "mark"].includes(kind) && actor !== org) ||
    (["escrow", "bind", "fund", "approve_tw", "approve"].includes(kind) &&
      actor !== sponsor) ||
    (kind === "resolve" && actor !== resolver)
  )
    throw new Error("Esta billetera no tiene el rol requerido.");
  if (kind === "anchor")
    return core(actor, "create", [
      id,
      addressVal(org),
      addressVal(sponsor),
      addressVal(resolver),
      u32(t.teamMaxSize),
    ]);
  if (!proof(t, "anchor"))
    throw new Error("Primero registra el torneo en Stellar.");
  if (kind === "escrow") {
    const result = await tw("deploy", {
      signer: sponsor,
      engagementId: t.ledgerId,
      title: t.name,
      description: "Premio al primer puesto de Sutika",
      roles: {
        approvers: [sponsor],
        serviceProviders: [org],
        releaseSigners: [SUTIKA_CONTRACT_ID],
        platform: wallet(deployment.platform),
        disputeResolvers: [resolver],
        admin: wallet(deployment.admin),
      },
      trustline: { contractId: usdc },
      platformFee: 2,
      milestones: [
        {
          description: "Primer puesto",
          amount: Number(display(WINNER_FUNDING.gross)),
          receiver: SUTIKA_CONTRACT_ID,
          approvalsTarget: 1,
        },
      ],
    });
    if (!result.contractId || !StrKey.isValidContract(result.contractId))
      throw new Error("El proveedor no devolvió la dirección del escrow.");
    return {
      unsignedXdr: result.unsignedXdr,
      context: { escrow: result.contractId },
    };
  }
  if (!escrow) throw new Error("Primero despliega el escrow.");
  if (kind === "bind")
    return core(actor, "bind_escrow", [id, addressVal(escrow)]);
  if (!proof(t, "bind"))
    throw new Error("Primero vincula el escrow al torneo.");
  if (kind === "fund") {
    const total = WINNER_FUNDING.gross;
    const result = await tw("fund", {
      contractId: escrow,
      signer: sponsor,
      amount: Number(display(total)),
    });
    return {
      unsignedXdr: result.unsignedXdr,
      context: { from: sponsor, to: [escrow], amounts: [String(total)] },
    };
  }
  if (!proof(t, "fund"))
    throw new Error("Primero confirma el depósito de USDC.");
  if (kind === "freeze") {
    const roster = rosterOf(t);
    if (
      roster.length < 2 ||
      roster.some((team) => team.length !== t.teamMaxSize)
    )
      throw new Error("Se necesitan al menos dos plantillas completas.");
    const tx = await core(actor, "freeze", [
      id,
      vec(roster.map((team) => vec(team.map(addressVal)))),
    ]);
    return { ...tx, context: { roster } };
  }
  if (!t.rosterLocked) throw new Error("Primero congela las plantillas.");
  if (kind === "declare") {
    const winner = shortText(action.winnerTeamId, 80);
    const index = t.teams.findIndex((team) => team.id === winner);
    if (index < 0) throw new Error("El ganador debe pertenecer al torneo.");
    const tx = await core(actor, "declare", [
      id,
      vec([u32(index)]),
      vec([i128(WINNER_UNITS)]),
    ]);
    return { ...tx, context: { podium: [winner] } };
  }
  if (t.podium.length !== 1) throw new Error("Primero declara al ganador.");
  if (kind === "mark" || kind === "approve_tw") {
    if (kind === "approve_tw" && !proof(t, "mark"))
      throw new Error("Falta registrar el resultado en el escrow.");
    const result =
      kind === "mark"
        ? await tw("change-milestone-status", {
            contractId: escrow,
            serviceProvider: actor,
            updates: [
              {
                index: 0,
                newStatus: "completed",
                newEvidence: t.publicSlug + " / " + t.podium[0],
              },
            ],
          })
        : await tw("approve-milestones", {
            contractId: escrow,
            approver: actor,
            milestoneIndexes: [0],
          });
    return { unsignedXdr: result.unsignedXdr, context: {} };
  }
  if (kind === "approve") {
    if (!proof(t, "approve_tw"))
      throw new Error(
        "Falta la aprobación del patrocinador en Trustless Work.",
      );
    return core(actor, "approve", [id]);
  }
  if (kind === "dispute")
    return core(actor, "dispute", [id, addressVal(actor)]);
  if (kind === "resolve") {
    if (typeof action.uphold !== "boolean")
      throw new Error("Selecciona una resolución.");
    const tx = await core(actor, "resolve", [
      id,
      xdr.ScVal.scvBool(action.uphold),
    ]);
    return { ...tx, context: { uphold: action.uphold } };
  }
  if (kind !== "release" || slot !== 1)
    throw new Error("Acción de pago inválida.");
  const team = t.teams.find((tm) => tm.id === t.podium[slot - 1]);
  if (!team) throw new Error("Falta el equipo ganador.");
  const to = team.participants.map((p) =>
    wallet(p.user.stellarSmartWalletAddress),
  );
  if (!to.includes(actor))
    throw new Error(
      "Solo un titular del equipo ganador puede pedir el reparto.",
    );
  const tx = await core(actor, "release", [id, u32(slot), addressVal(actor)]);
  return {
    ...tx,
    context: {
      from: SUTIKA_CONTRACT_ID,
      to,
      amounts: split(WINNER_UNITS, to.length).map(String),
      core: SUTIKA_CONTRACT_ID,
      ledgerId: t.ledgerId!,
    },
  };
}

function checkProviderTransaction(
  t: Loaded,
  actor: string,
  kind: string,
  tx: Transaction,
) {
  const op = tx.operations[0];
  const invalid = () => {
    throw new Error(
      "El XDR del proveedor no coincide con la operación solicitada.",
    );
  };
  if (
    op.type !== "invokeHostFunction" ||
    (op.source && op.source !== actor) ||
    op.func.type !== "hostFunctionTypeInvokeContract"
  )
    return invalid();
  const call = op.func.invokeContract,
    fn = call.functionName.toString(),
    args = call.args.map(scValToNative);
  const target = Address.fromScAddress(call.contractAddress).toString();
  if (kind === "escrow") {
    if (
      fn !== "tw_new_multi_release_escrow" ||
      args[0] !== actor ||
      args[3] !== "initialize_escrow"
    )
      return invalid();
    const props = args[4]?.[0],
      roles = props?.roles,
      m = props?.milestones;
    const one = (v: unknown, who: string | null) =>
      Array.isArray(v) && v.length === 1 && v[0] === who;
    if (
      props?.engagement_id !== t.ledgerId ||
      props?.trustline?.address !== usdc ||
      Number(props?.platform_fee) !== 200 ||
      !one(roles?.approvers, t.sponsorWallet) ||
      !one(roles?.service_providers, t.organizer.stellarSmartWalletAddress) ||
      !one(roles?.release_signers, SUTIKA_CONTRACT_ID) ||
      !one(roles?.dispute_resolvers, t.resolverWallet) ||
      roles?.platform !== deployment.platform ||
      roles?.admin !== deployment.admin ||
      !Array.isArray(m) ||
      m.length !== 1 ||
      m.some(
        (item) =>
          item.receiver !== SUTIKA_CONTRACT_ID ||
          Number(item.approvals?.target) !== 1 ||
          item.amount !== WINNER_FUNDING.gross,
      )
    )
      return invalid();
    return;
  }
  if (target !== t.sorobanEscrowId) return invalid();
  if (
    kind === "fund" &&
    (fn !== "fund_escrow" ||
      args[0] !== actor ||
      args[2] !== WINNER_FUNDING.gross)
  )
    return invalid();
  if (
    kind === "approve_tw" &&
    (fn !== "approve_milestones" ||
      !args.some((v) => v === actor) ||
      !args.some(
        (v) =>
          Array.isArray(v) &&
          v.length === 1 &&
          v.every((x, i) => Number(x) === i),
      ))
  )
    return invalid();
  if (
    kind === "mark" &&
    (fn !== "change_milestone_status" ||
      !args.some((v) => v === actor) ||
      !args.some(
        (v) =>
          Array.isArray(v) &&
          v.length === 1 &&
          v.every(
            (x, i) =>
              Number(x?.milestone_index) === i && x?.new_status === "completed",
          ),
      ))
  )
    return invalid();
}

export async function prepare(actor: string, action: ActionInput) {
  const t = await getTournament(shortText(action.slug, 100));
  if (!t?.ledgerId || t.sorobanContractId !== SUTIKA_CONTRACT_ID)
    throw new Error("Torneo no disponible para operaciones.");
  const kind = shortText(action.kind, 24),
    slot = kind === "release" ? Number(action.place) : 0;
  if (!Number.isInteger(slot) || (kind === "release" && slot !== 1))
    throw new Error("Solo el primer puesto recibe premio.");
  const match = (o: { kind: string; slot: number }) =>
    o.kind === kind && o.slot === slot;
  const intent = createHash("sha256")
    .update(JSON.stringify(action))
    .digest("hex");
  const existing = t.ledgerOperations.find(
    (o) => match(o) && (active(o) || o.status === "CONFIRMED"),
  );
  if (existing) {
    const op = await database().ledgerOperation.findUniqueOrThrow({
      where: { id: existing.id },
    });
    if (active(op) && op.expiresAt <= new Date()) {
      const checked = await settle(op.id);
      if (checked.status === "EXPIRED" || checked.status === "FAILED")
        return prepare(actor, action);
      return { id: op.id, status: checked.status, hash: op.hash };
    }
    if (
      op.status === "PREPARED" &&
      (op.actor !== actor || (op.context as Context).intent !== intent)
    )
      throw new Error(
        "Otra solicitud de firma sigue vigente. Espera a que venza antes de cambiar los datos.",
      );
    return {
      id: op.id,
      status: op.status,
      xdr: op.status === "PREPARED" ? op.unsignedXdr : undefined,
      hash: op.hash,
    };
  }
  const built = await build(t, actor, action, slot);
  const tx = TransactionBuilder.fromXDR(built.unsignedXdr, network);
  if (
    !(tx instanceof Transaction) ||
    tx.source !== actor ||
    tx.operations.length !== 1
  )
    throw new Error("El XDR no corresponde a esta billetera.");
  if (["escrow", "fund", "mark", "approve_tw"].includes(kind))
    checkProviderTransaction(t, actor, kind, tx);
  const hash = Buffer.from(tx.hash()).toString("hex"),
    until = Number(tx.timeBounds?.maxTime);
  if (!Number.isSafeInteger(until) || until <= Date.now() / 1000)
    throw new Error("La transacción no tiene un vencimiento válido.");
  const db = database();
  const op = await db.$transaction(async (trx) => {
    await trx.$queryRaw`SELECT id FROM tournaments WHERE id = ${t.id} FOR UPDATE`;
    const current = await trx.tournament.findUniqueOrThrow({
      where: { id: t.id },
      include: details,
    });
    const pending = current.ledgerOperations.find(
      (o) => match(o) && (o.status === "CONFIRMED" || active(o)),
    );
    if (pending)
      throw new Error(
        "Ya hay una operación para este paso. Actualiza su estado.",
      );
    if (
      kind === "freeze" &&
      JSON.stringify(rosterOf(current)) !== JSON.stringify(built.context.roster)
    )
      throw new Error("La plantilla cambió. Vuelve a preparar el cierre.");
    return trx.ledgerOperation.upsert({
      where: { hash },
      update: {},
      create: {
        tournamentId: t.id,
        kind,
        slot,
        actor,
        hash,
        unsignedXdr: built.unsignedXdr,
        context: { ...built.context, intent } as Prisma.InputJsonValue,
        expiresAt: new Date(until * 1000),
      },
    });
  });
  return { id: op.id, status: op.status, xdr: op.unsignedXdr, hash: op.hash };
}

export async function settle(id: string, signed?: string) {
  const db = database(),
    op = await db.ledgerOperation.findUniqueOrThrow({ where: { id } });
  if (!["PREPARED", "PENDING"].includes(op.status))
    return { status: op.status, hash: op.hash };
  const chain = server();
  if (signed && op.status === "PREPARED") {
    const tx = TransactionBuilder.fromXDR(signed, network);
    if (
      !(tx instanceof Transaction) ||
      Buffer.from(tx.hash()).toString("hex") !== op.hash ||
      tx.signatures.length === 0
    )
      throw new Error("La firma no corresponde a la transacción preparada.");
    await db.ledgerOperation.updateMany({
      where: { id, status: "PREPARED" },
      data: { status: "PENDING" },
    });
    const result = await chain.sendTransaction(tx);
    if (!["PENDING", "DUPLICATE"].includes(result.status))
      throw new Error(
        "Stellar no aceptó el envío. Se puede consultar el estado antes de reintentar.",
      );
  }
  const r = await chain.getTransaction(op.hash);
  if (r.status === "NOT_FOUND") {
    const expires = op.expiresAt.getTime() / 1000;
    if (
      r.latestLedgerCloseTime > expires &&
      r.oldestLedgerCloseTime <= op.createdAt.getTime() / 1000 - 30
    ) {
      await db.ledgerOperation.updateMany({
        where: { id, status: { in: ["PENDING", "PREPARED"] } },
        data: { status: "EXPIRED" },
      });
      return { status: "EXPIRED", hash: op.hash };
    }
    return {
      status: signed || op.status === "PENDING" ? "PENDING" : "PREPARED",
      hash: op.hash,
    };
  }
  if (r.status === "FAILED") {
    await db.ledgerOperation.updateMany({
      where: { id, status: { in: ["PREPARED", "PENDING"] } },
      data: { status: "FAILED" },
    });
    return { status: "FAILED", hash: op.hash };
  }
  if (r.status !== "SUCCESS") return { status: "PENDING", hash: op.hash };
  const c = op.context as Context;
  if (
    ["fund", "release"].includes(op.kind) &&
    !verifiedTransfers(
      op.kind,
      c,
      op.slot,
      usdc,
      r.events?.contractEventsXdr.flat() ?? [],
    )
  )
    throw new Error(
      "La red no acredita los importes esperados. El comprobante queda pendiente de revisión.",
    );
  if (op.kind === "escrow") {
    const returned = r.returnValue && scValToNative(r.returnValue);
    const address = Array.isArray(returned) ? returned[0] : returned;
    if (address !== c.escrow)
      throw new Error("El contrato desplegado difiere del esperado.");
  }
  await db.$transaction(async (trx) => {
    await trx.$queryRaw`SELECT id FROM tournaments WHERE id = ${op.tournamentId} FOR UPDATE`;
    if (
      (
        await trx.ledgerOperation.updateMany({
          where: { id, status: { in: ["PREPARED", "PENDING"] } },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(r.createdAt * 1000),
          },
        })
      ).count === 0
    )
      return;
    const tid = op.tournamentId;
    if (op.kind === "escrow")
      await trx.tournament.update({
        where: { id: tid },
        data: { sorobanEscrowId: c.escrow },
      });
    if (op.kind === "fund")
      await trx.tournament.update({
        where: { id: tid },
        data: {
          mode: "ON_CHAIN_ESCROW",
          sorobanContractId: SUTIKA_CONTRACT_ID,
        },
      });
    if (op.kind === "freeze")
      await trx.tournament.update({
        where: { id: tid },
        data: { rosterLocked: true, status: "IN_PROGRESS" },
      });
    if (op.kind === "declare")
      await trx.tournament.update({
        where: { id: tid },
        data: { podium: c.podium },
      });
    // Preserve the immutable hashes of prior rounds while allowing a corrected podium and a fresh dispute.
    if (op.kind === "resolve") {
      const reset = c.uphold
        ? ["dispute", "resolve"]
        : ["declare", "mark", "approve_tw", "approve", "dispute", "resolve"];
      await trx.ledgerOperation.updateMany({
        where: { tournamentId: tid, kind: { in: reset }, status: "CONFIRMED" },
        data: { status: "SUPERSEDED" },
      });
      if (!c.uphold)
        await trx.tournament.update({
          where: { id: tid },
          data: { podium: [] },
        });
    }
    if (op.kind === "release") {
      const t = await trx.tournament.findUniqueOrThrow({ where: { id: tid } });
      await trx.tournamentPrize.update({
        where: {
          tournamentId_targetStanding: {
            tournamentId: tid,
            targetStanding: op.slot,
          },
        },
        data: {
          winningTeamId: t.podium[op.slot - 1],
          claimStatus: "CLAIMED_VERIFIED",
          sorobanTxHash: op.hash,
          claimedAt: new Date(r.createdAt * 1000),
        },
      });
      if (
        (await trx.tournamentPrize.count({
          where: {
            tournamentId: tid,
            claimStatus: { not: "CLAIMED_VERIFIED" },
          },
        })) === 0
      )
        await trx.tournament.update({
          where: { id: tid },
          data: { status: "COMPLETED" },
        });
    }
  });
  return { status: "CONFIRMED", hash: op.hash };
}
