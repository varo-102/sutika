import "server-only";
import { scValToNative } from "@stellar/stellar-sdk";
import { database } from "../prisma";
import { gameOf, type Game } from "../rules";
import { actionHash, setup, type Context } from "./actions";
import { activeCore, hex, ledgerKey, onChain, rostersOnChain, stellarV3, type Setup } from "./chain";
import { verificationEnabled } from "./verification";
import { addr, bytes } from "./xdr";

export type Player = { address: string; verified: boolean; ready: boolean };
export type RosterView = {
  id: string;
  name: string;
  payer: string;
  contribution: string;
  refunded: boolean;
  locked: boolean;
  weights: number[];
  players: Player[];
};
export type RoomView = {
  slug: string;
  name: string;
  game: Game;
  rules: Setup;
  now: number;
  isExpired: boolean;
  escrowDraft: boolean;
  escrow?: string;
  closeHash?: string;
  stake: string;
  stakeLocked: string;
  isCancelled: boolean;
  sponsorRefunded: boolean;
  verificationEnabled: boolean;
  result?: { ids: string[]; evidence?: string; end: number; disputed: boolean; approved: boolean; revision: number };
  paid: number[];
  rosters: RosterView[];
};
export type PublicReceipt = { kind: string; hash: string; date: string | undefined; context: Context };
export const receiptLabels: Record<string, { es: string; en: string }> = {
  create: { es: "Torneo registrado", en: "Tournament registered" },
  escrow: { es: "Reserva abierta", en: "Escrow opened" },
  fund: { es: "Aporte del patrocinador", en: "Sponsor contribution" },
  join: { es: "Inscripción confirmada", en: "Entry confirmed" },
  freeze: { es: "Cierre de inscripciones", en: "Registration closed" },
  declare: { es: "Resultado publicado", en: "Result published" },
  approve: { es: "Resultado aprobado", en: "Result approved" },
  dispute: { es: "Impugnación abierta", en: "Dispute opened" },
  resolve: { es: "Impugnación resuelta", en: "Dispute resolved" },
  pay: { es: "Premio entregado", en: "Prize delivered" },
  cancel: { es: "Torneo cancelado", en: "Tournament canceled" },
  refund: { es: "Cuota devuelta", en: "Entry fee refunded" },
  refund_sponsor: { es: "Aporte del patrocinador devuelto", en: "Sponsor contribution refunded" },
};

export async function publicCompetition(slug: string) {
  const row = await database().competitionV3.findUnique({
    where: { slug },
    include: { operations: { where: { status: "CONFIRMED" }, orderBy: { confirmedAt: "desc" } } },
  });
  if (!row?.anchoredAt) return null;
  const rules = setup(row);
  const now = Math.floor(Date.now() / 1000);
  // Identity operations stay out of the public receipt feed.
  const receipts: PublicReceipt[] = row.operations
    .filter(({ kind }) => Boolean(receiptLabels[kind]))
    .map(({ kind, hash, confirmedAt, context }) =>
      ({ kind, hash, date: confirmedAt?.toISOString(), context: context as Context }));
  const fallback = { name: row.name, game: gameOf(row.game), core: row.contractId, receipts };
  try {
    const chain = await onChain(row.contractId, row.id);
    if (!chain) return { ...fallback, view: null };
    const fallbackReceipt = (kind: string) => receipts.find((r) => r.kind === kind);
    const result = chain.outcome[0];
    const rosters = await rostersOnChain(row.contractId, row.id, chain.teams);
    const resultIds = result?.places.map(hex) ?? [];
    const winners = rosters.filter((r) => resultIds.includes(r.id)).flatMap((r) => r.members);
    const consent = await readiness(row.contractId, row.id, winners, now, result?.revision);
    const locked = chain.locked_teams.map(hex);
    const summaries = new Map(receipts.filter((x) => x.kind === "join" && x.context.name && x.context.team)
      .map((x) => [x.context.team!, x.context.name!]));
    const evidence = result && receipts.find((r) => r.context.evidence && actionHash(r.context.evidence) === hex(result.evidence))?.context.evidence;
    const view: RoomView = {
      slug: row.slug, name: row.name, game: fallback.game, rules, now,
      isExpired: now >= rules.deadline, escrowDraft: Boolean(fallbackReceipt("escrow")),
      escrow: chain.escrow ?? undefined,
      closeHash: chain.roster_hash ? hex(chain.roster_hash) : undefined,
      stake: chain.entry_gross.toString(), stakeLocked: chain.entry_locked.toString(),
      isCancelled: chain.cancelled, sponsorRefunded: Boolean(fallbackReceipt("refund_sponsor")),
      verificationEnabled: verificationEnabled(),
      result: result && {
        ids: resultIds, evidence, end: Number(result.challenge_ends),
        disputed: result.disputed, approved: result.approved, revision: result.revision,
      },
      paid: chain.paid_slots.filter((place) => receipts.some((r) => r.kind === "pay" && r.context.place === place)),
      rosters: rosters.map((r) => ({
        id: r.id, payer: r.payer,
        name: summaries.get(r.id) || ("Equipo " + r.id.slice(0, 6).toUpperCase()),
        contribution: r.contribution.toString(),
        refunded: r.refunded && receipts.some((proof) => proof.kind === "refund" && proof.context.team === r.id),
        locked: locked.includes(r.id),
        weights: r.weights,
        players: r.members.map((address) => consent.get(address) ?? { address, ready: false, verified: false }),
      })),
    };
    return { ...fallback, view };
  } catch {
    return { ...fallback, view: null };
  }
}

async function readiness(core: string, id: string, winners: string[], now: number, revision?: number) {
  const members = new Map<string, Player>();
  if (!winners.length || revision === undefined) return members;
  const entries = await stellarV3().getLedgerEntries(...winners.flatMap((winner) =>
    ["Verified", "Ready"].map((key) => ledgerKey(core, key, [bytes(id), addr(winner)]))));
  const ready = new Set<string>();
  const verified = new Set<string>();
  for (const entry of entries.entries) {
    if (entry.key.type !== "contractData" || entry.val.type !== "contractData") continue;
    const [kind,, address] = scValToNative(entry.key.contractData.key);
    const value = scValToNative(entry.val.contractData.val);
    if (kind === "Ready" && value === revision) ready.add(address);
    if (kind === "Verified" && typeof value?.expires === "bigint" && value.expires > BigInt(now)) {
      verified.add(address);
    }
  }
  for (const address of winners) {
    members.set(address, { address, verified: verified.has(address), ready: verified.has(address) && ready.has(address) });
  }
  return members;
}

export async function recentCompetitionsV3() {
  if (!activeCore()) return [];
  try {
    const rows = await database().competitionV3.findMany({
      where: { anchoredAt: { not: null } }, orderBy: { anchoredAt: "desc" }, take: 6,
    });
    return rows.map((row) => ({ slug: row.slug, name: row.name, game: gameOf(row.game), mode: setup(row).mode }));
  } catch {
    return [];
  }
}
