import "server-only";
import deployment from "./deployment.json";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { database } from "./prisma";
import { shortText, wallet, type ActionInput } from "./auth";
import { gameOf, games, units } from "./rules";

export const details = {
  organizer: { select: { stellarSmartWalletAddress: true } },
  prizes: { orderBy: { targetStanding: "asc" as const } },
  teams: {
    orderBy: { id: "asc" as const },
    include: {
      participants: {
        orderBy: { userId: "asc" as const },
        include: { user: { select: { stellarSmartWalletAddress: true } } },
      },
    },
  },
  ledgerOperations: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      kind: true,
      slot: true,
      hash: true,
      status: true,
      confirmedAt: true,
      expiresAt: true,
    },
  },
} satisfies Prisma.TournamentInclude;

export async function getTournament(slug: string) {
  return database().tournament.findUnique({
    where: { publicSlug: slug },
    include: details,
  });
}
export async function listTournaments() {
  return database().tournament.findMany({
    where: { category: { in: ["CLASH_ROYALE", "MOBILE_LEGENDS"] } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      name: true,
      category: true,
      publicSlug: true,
      _count: { select: { participants: true } },
      prizes: { select: { amountUsdc: true } },
      ledgerOperations: {
        where: { kind: "fund", status: "CONFIRMED" },
        select: { id: true },
        take: 1,
      },
    },
  });
}
export async function createTournament(address: string, action: ActionInput) {
  const name = shortText(action.name, 80),
    category = gameOf(String(action.game));
  const sponsor = wallet(action.sponsor),
    resolver = wallet(deployment.resolver);
  if (new Set([address, sponsor, resolver]).size !== 3)
    throw new Error(
      "Organizador, patrocinador y árbitro necesitan billeteras diferentes.",
    );
  if (!Array.isArray(action.amounts) || action.amounts.length !== 3)
    throw new Error("Completa los tres importes del podio.");
  const amounts = action.amounts.map((n) => {
    const s = String(n);
    units(s);
    return s;
  });
  const id = randomUUID();
  const namePart = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = (namePart || "torneo") + "-" + id.slice(0, 8);
  await database().$transaction(async (tx) => {
    const organizer = await tx.user.upsert({
      where: { stellarSmartWalletAddress: address },
      update: {},
      create: { fullName: "Organizador", stellarSmartWalletAddress: address },
    });
    await tx.tournament.create({
      data: {
        id,
        publicSlug: slug,
        name,
        organizerId: organizer.id,
        category,
        teamMaxSize: games[category].size,
        sponsorWallet: sponsor,
        resolverWallet: resolver,
        ledgerId: createHash("sha256")
          .update("sutika:testnet:" + id)
          .digest("hex"),
        prizes: {
          create: amounts.map((amount, i) => ({
            targetStanding: i + 1,
            prizeType: "USDC_TOKEN",
            sponsorName: "Patrocinador",
            sponsorWalletOrId: sponsor,
            amountUsdc: amount,
            requiredKycLevel: "NONE",
          })),
        },
      },
    });
  });
  return { slug };
}
export async function join(address: string, action: ActionInput) {
  const slug = shortText(action.slug, 100),
    name = shortText(action.team, 48);
  const db = database();
  return db.$transaction(async (tx) => {
    // Serialize registrations with freezes, including two simultaneous registrations for the last seat.
    await tx.$queryRaw`SELECT id FROM tournaments WHERE public_slug = ${slug} FOR UPDATE`;
    const t = await tx.tournament.findUnique({ where: { publicSlug: slug } });
    if (
      !t?.ledgerId ||
      t.rosterLocked ||
      (await tx.ledgerOperation.count({
        where: {
          tournamentId: t.id,
          kind: "freeze",
          status: { in: ["CONFIRMED", "PREPARED", "PENDING"] },
        },
      }))
    )
      throw new Error("Las inscripciones están cerradas.");
    const user = await tx.user.upsert({
      where: { stellarSmartWalletAddress: address },
      update: {},
      create: { fullName: "Participante", stellarSmartWalletAddress: address },
    });
    const existing = await tx.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId: t.id, userId: user.id } },
    });
    if (existing) return { slug };
    const teamId = typeof action.teamId === "string" ? action.teamId : "";
    let team = teamId
      ? await tx.team.findFirst({ where: { id: teamId, tournamentId: t.id } })
      : null;
    if (teamId && !team) throw new Error("El equipo no pertenece al torneo.");
    if (!team) {
      if ((await tx.team.count({ where: { tournamentId: t.id } })) >= 16)
        throw new Error("Se completó el cupo de equipos.");
      team = await tx.team.create({
        data: {
          name,
          tournamentId: t.id,
          captainUserId: user.id,
          whatsappInviteToken: randomUUID(),
        },
      });
    }
    if (
      (await tx.tournamentParticipant.count({
        where: { tournamentId: t.id, teamId: team.id },
      })) >= t.teamMaxSize
    )
      throw new Error("El equipo ya está completo.");
    await tx.tournamentParticipant.create({
      data: {
        tournamentId: t.id,
        teamId: team.id,
        userId: user.id,
        joinedViaWhatsapp: false,
        role: team.captainUserId === user.id ? "CAPTAIN" : "PLAYER",
      },
    });
    return { slug };
  });
}
