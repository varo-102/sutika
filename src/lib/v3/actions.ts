import "server-only";
import { PublicError } from "../errors.ts";
import { createHash } from "node:crypto";
import { Contract } from "@stellar/stellar-sdk";
import { Prisma } from "@prisma/client";
import type { CompetitionV3 } from "@prisma/client";
import { shortText, wallet, type ActionInput } from "../auth";
import { database } from "../prisma";
import { gameOf, games, UNIT } from "../rules";
import { activeCore, hex, manifest, onChain, rosterOnChain, settingsOnChain, tournamentRules, type ChainCompetition, type Setup } from "./chain";
import { buildEscrow, confirmVendorFunding } from "./trustless";
import { decimalAmount, distribute, fundingMode, MAX_TEAMS, MIN_ENTRY, MIN_TEAMS, quote, sponsorQuote, weights } from "./rules";
import { verifiedWallet } from "./verification";
import { addr, bool, bytes, u32, u64, vec } from "./xdr";

export const actionHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const hexId = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new PublicError("Falta un identificador de Stellar.", "A Stellar identifier is missing.");
  return value;
};
const wholeNumber = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new PublicError("Revisa el cupo, el puesto o el turno asignado.", "Check the entry limit, place, or assigned slot.");
  }
  return value;
};
export const setup = (row: CompetitionV3) => row.rules as unknown as Setup;
const sum = (list: string[]) => list.reduce((a, b) => a + BigInt(b), 0n);
const requireRole = (actor: string, expected: string) => {
  if (actor !== expected) throw new PublicError("Esta acción requiere la billetera del rol indicado.", "Connect the account assigned to this role.");
};
const ledgerNow = () => Math.floor(Date.now() / 1000);

export const operationKinds = [
  "create", "escrow", "fund", "join", "freeze", "declare", "approve", "dispute",
  "resolve", "verify", "ready", "pay", "cancel", "refund", "refund_sponsor",
] as const;
export type V3Kind = typeof operationKinds[number];
export type Context = {
  escrow?: string;
  salt?: string;
  team?: string;
  name?: string;
  member?: string;
  evidence?: string;
  place?: number;
  from?: string;
  to?: string[];
  amounts?: string[];
  contribution?: string;
};
type Operation = ReturnType<Contract["call"]>;

export async function locate(actor: string, action: ActionInput) {
  if (action.kind !== "create") {
    const row = await database().competitionV3.findUnique({ where: { slug: shortText(action.slug, 96) } });
    if (!row?.anchoredAt) throw new PublicError("El torneo todavía no está publicado.", "This tournament has not been published yet.");
    return row;
  }

  const core = activeCore();
  if (!core) throw new PublicError("La V3 aún no está habilitada en este entorno.", "SUTIKA V3 is unavailable in this environment.");
  const nonce = shortText(action.nonce, 36);
  if (!/^[0-9a-f-]{36}$/.test(nonce)) throw new PublicError("Vuelve a abrir el formulario para crear el torneo.", "Open the creation form again.");
  const id = actionHash("sutika:v3:" + actor + ":" + nonce);
  const name = shortText(action.name, 60);
  const game = gameOf(shortText(action.game, 24));
  const mode = fundingMode(action.mode);
  const places = weights(action.places, [1, 3]);
  const min = wholeNumber(action.min, MIN_TEAMS, MAX_TEAMS);
  const max = wholeNumber(action.max, min, MAX_TEAMS);
  const deadline = wholeNumber(action.deadline, 1, 4_000_000_000);
  const sponsor = mode === "entry" ? actor : wallet(action.sponsor || actor);
  const referee = wallet(action.referee);
  if (referee === actor || referee === sponsor) {
    throw new PublicError("El árbitro debe usar una billetera distinta del organizador y del patrocinador.", "The referee must use an account different from the organizer and sponsor.");
  }
  const entry = mode === "sponsored" ? 0n : decimalAmount(shortText(action.entry, 32), MIN_ENTRY);
  const sponsorParts = mode === "entry" ? [] :
    sponsorQuote(decimalAmount(shortText(action.net, 32), UNIT / 100n), mode, places).map((p) => p.gross.toString());
  const now = ledgerNow();
  const rules = {
    organizer: actor, sponsor, referee, mode, size: games[game].size, min, max,
    deadline, entry: entry.toString(), places, sponsorParts,
  } satisfies Setup;

  const current = await database().competitionV3.findUnique({ where: { id } });
  if (current) {
    verifyCreate(current, name, game, rules);
    return current;
  }
  if (deadline < now + 60 || deadline > now + 30 * 86_400 - 300) {
    throw new PublicError("El cierre debe quedar entre un minuto y 30 días a partir de ahora.", "The deadline must be between one minute and 30 days from now.");
  }
  const slug = (name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "copa") + "-" + id.slice(0, 12);
  const row = await database().competitionV3.upsert({
    where: { id }, create: { id, slug, name, game, rules: rules as Prisma.InputJsonValue, contractId: core }, update: {},
  });
  verifyCreate(row, name, game, rules);
  return row;
}

function verifyCreate(row: CompetitionV3, name: string, game: string, rules: Setup) {
  // Compare canonical XDR. PostgreSQL JSONB can reorder the original object.
  if (row.name !== name || row.game !== game ||
    tournamentRules(setup(row)).toXDR("base64") !== tournamentRules(rules).toXDR("base64")) {
    throw new PublicError("La solicitud de creación cambió. Vuelve a revisar la ficha.", "The creation request changed. Review the tournament details again.");
  }
}

export async function state(row: CompetitionV3) {
  const value = await onChain(row.contractId, row.id);
  if (!value) throw new PublicError("Stellar todavía no devuelve el estado del torneo.", "Stellar has not returned the tournament status yet.");
  return value;
}

export async function winner(row: CompetitionV3, t: ChainCompetition, member: string) {
  const outcome = t.outcome[0];
  if (t.cancelled || !outcome || outcome.disputed) throw new PublicError("Todavía no hay un resultado válido.", "There is no valid result yet.");
  const teams = await Promise.all(outcome.places.map((id) => rosterOnChain(row.contractId, row.id, hex(id))));
  if (!teams.some((r) => r?.members.includes(member))) throw new PublicError("Esta acción solo está disponible para ganadores.", "This action is available to winners only.");
  return outcome;
}

function evidence(value: unknown) {
  const link = new URL(shortText(value, 500));
  if (link.protocol !== "https:" || link.username || link.password) {
    throw new PublicError("Usa un enlace HTTPS público a la evidencia de la partida.", "Use a public HTTPS link to the match evidence.");
  }
  const url = link.toString();
  return { url, digest: bytes(actionHash(url)) };
}

function podium(value: unknown, current: ChainCompetition, count: number) {
  if (!Array.isArray(value) || value.length !== count) throw new PublicError("Selecciona un equipo para cada puesto.", "Select an entrant for every prize place.");
  const places = value.map(hexId);
  const choices = current.locked_teams.map(hex);
  if (new Set(places).size !== places.length || places.some((place) => !choices.includes(place))) {
    throw new PublicError("Elige plantillas distintas y confirmadas.", "Choose different confirmed entrants.");
  }
  return vec(places.map(bytes));
}

function transfer(from: string, pairs: [string, bigint][]): Context {
  const positive = pairs.filter(([, amount]) => amount > 0n);
  return { from, to: positive.map(([to]) => to), amounts: positive.map(([, amount]) => amount.toString()) };
}

export async function build(
  row: CompetitionV3, actor: string, action: ActionInput, kind: V3Kind,
): Promise<{ operation: Operation; context: Context }> {
  const r = setup(row);
  const core = new Contract(row.contractId);
  const id = bytes(row.id);
  if (kind === "create") {
    requireRole(actor, r.organizer);
    await settingsOnChain(row.contractId);
    return { operation: core.call("create", id, tournamentRules(r)), context: {} };
  }
  const t = await state(row);
  const outcome = t.outcome[0];
  if (kind === "escrow") {
    requireRole(actor, r.sponsor);
    if (r.mode === "entry" || t.escrow || t.cancelled || ledgerNow() >= r.deadline) {
      throw new PublicError("El torneo no necesita otra custodia.", "The tournament does not need another escrow.");
    }
    const config = await settingsOnChain(row.contractId);
    const created = buildEscrow({
      id: row.id, name: row.name, core: row.contractId, organizer: r.organizer,
      sponsor: r.sponsor, referee: r.referee, admin: config.escrow_admin, token: config.token,
      factory: config.factory, wasm: manifest.trustlessWasm, mode: r.mode, parts: r.sponsorParts.map(BigInt),
    });
    return { operation: created.operation, context: { escrow: created.escrow, salt: created.salt } };
  }
  if (kind === "fund") {
    requireRole(actor, r.sponsor);
    if (t.escrow) throw new PublicError("El depósito ya está confirmado.", "The deposit is already confirmed.");
    const deployment = await database().competitionOperationV3.findFirst({
      where: { competitionId: row.id, kind: "escrow", status: "CONFIRMED" },
      orderBy: { confirmedAt: "desc" },
    });
    const ctx = deployment?.context as Context | undefined;
    if (!ctx?.escrow || !ctx.salt) throw new PublicError("Primero confirma la apertura de la custodia.", "Confirm that the escrow is open first.");
    const total = sum(r.sponsorParts);
    await confirmVendorFunding(ctx.escrow, actor, total);
    return {
      operation: core.call("fund_sponsor", id, addr(ctx.escrow), bytes(ctx.salt)),
      context: { escrow: ctx.escrow, ...transfer(actor, [[ctx.escrow, total]]) },
    };
  }
  if (kind === "join") {
    const captain = action.team === undefined || action.team === "";
    const team = captain ? actionHash(row.id + ":" + actor) : hexId(action.team);
    const current = captain ? null : await rosterOnChain(row.contractId, row.id, team);
    if (!captain && !current) throw new PublicError("Este equipo todavía no está inscrito.", "This team has not signed up yet.");
    const shares = weights(action.shares, [r.size]);
    const slot = wholeNumber(action.slot, 0, r.size - 1);
    if (slot !== (current?.members.length ?? 0)) throw new PublicError("Cambió el turno de inscripción. Actualiza la página.", "The available team slot changed. Refresh the page.");
    const name = captain ? shortText(action.teamName, 48) : undefined;
    const amount = captain ? BigInt(r.entry) : 0n;
    return {
      operation: core.call("join", id, bytes(team), addr(actor), vec(shares.map(u32)), bool(captain), u32(slot)),
      context: {
        team, ...(name ? { name } : {}), member: actor, contribution: amount.toString(),
        ...(amount > 0n ? transfer(actor, [[row.contractId, amount]]) : {}),
      },
    };
  }
  if (kind === "freeze") {
    return { operation: core.call("freeze", id), context: {} };
  }
  if (kind === "declare") {
    requireRole(actor, r.organizer);
    const proof = evidence(action.evidence);
    return { operation: core.call("declare", id, podium(action.places, t, r.places.length), proof.digest), context: { evidence: proof.url } };
  }
  if (kind === "approve") {
    requireRole(actor, r.mode === "entry" ? r.referee : r.sponsor);
    if (!outcome || wholeNumber(action.revision, 1, 100) !== outcome.revision) {
      throw new PublicError("El resultado cambió. Vuelve a revisar el podio.", "The result changed. Review the standings again.");
    }
    return { operation: core.call("approve", id, u32(outcome.revision)), context: {} };
  }
  if (kind === "dispute") {
    return { operation: core.call("dispute", id, addr(actor)), context: {} };
  }
  if (kind === "resolve") {
    requireRole(actor, r.referee);
    if (action.uphold === true) return { operation: core.call("resolve", id, vec([]), bytes("00".repeat(32))), context: {} };
    const proof = evidence(action.evidence);
    return { operation: core.call("resolve", id, podium(action.places, t, r.places.length), proof.digest), context: { evidence: proof.url } };
  }
  if (kind === "verify") {
    requireRole(actor, r.referee);
    const member = wallet(action.member);
    await winner(row, t, member);
    const check = await verifiedWallet(member);
    return { operation: core.call("verify", id, addr(member), bytes(check.evidence), u64(check.expires)), context: { member } };
  }
  if (kind === "ready") {
    const current = await winner(row, t, actor);
    if (wholeNumber(action.revision, 1, 100) !== current.revision) throw new PublicError("El resultado cambió. Vuelve a revisar el podio.", "The result changed. Review the standings again.");
    await verifiedWallet(actor);
    return { operation: core.call("ready", id, addr(actor), u32(current.revision)), context: { member: actor } };
  }
  if (kind === "pay") {
    if (!outcome) throw new PublicError("El torneo todavía no tiene podio.", "The tournament does not have a result yet.");
    const place = wholeNumber(action.place, 0, r.places.length - 1);
    const target = await rosterOnChain(row.contractId, row.id, hex(outcome.places[place]));
    if (!target) throw new PublicError("No se encontró la plantilla ganadora.", "The winning roster could not be found.");
    await Promise.all(target.members.map(verifiedWallet));
    const config = await settingsOnChain(row.contractId);
    const entry = quote(distribute(t.entry_locked, r.places)[place], r.mode);
    const sponsor = quote(BigInt(r.sponsorParts[place] ?? 0), r.mode);
    const amounts = distribute(entry.net + sponsor.net, target.weights);
    return {
      operation: core.call("pay", id, u32(place), u32(outcome.revision)),
      context: { place, ...transfer(row.contractId, [
        ...target.members.map((key, idx): [string, bigint] => [key, amounts[idx]]),
        [config.platform, entry.platform + sponsor.platform],
        [config.protocol, entry.protocol],
      ]) },
    };
  }
  if (kind === "cancel") {
    return { operation: core.call("cancel", id, addr(actor)), context: {} };
  }
  if (kind === "refund") {
    const team = hexId(action.team);
    const rowTeam = await rosterOnChain(row.contractId, row.id, team);
    if (!rowTeam) throw new PublicError("No se encontró el aporte original.", "The original contribution could not be found.");
    return {
      operation: core.call("refund", id, bytes(team)),
      context: { team, ...transfer(row.contractId, [[rowTeam.payer, rowTeam.contribution]]) },
    };
  }
  requireRole(actor, r.referee);
  if (!t.escrow) throw new PublicError("No hay un aporte patrocinado para devolver.", "There is no sponsored contribution to refund.");
  const config = await settingsOnChain(row.contractId);
  const q = quote(sum(r.sponsorParts), r.mode);
  return {
    operation: core.call("refund_sponsor", id),
    context: { ...transfer(t.escrow, [[r.sponsor, q.net], [row.contractId, q.platform], [config.protocol, q.protocol]]) },
  };
}
