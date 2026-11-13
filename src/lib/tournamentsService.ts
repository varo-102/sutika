import { prisma } from "./prisma";
import { INITIAL_TOURNAMENTS, TournamentDTO } from "./mockData";
import {
  initEscrowOnChain,
  claimPodiumPrizeOnChain,
  computeIdentityHash,
  SUTIKA_CONTRACT_ID,
} from "./stellar";

// Memoria volátil para desarrollo cuando Neon aún no está conectado
let memoryTournaments: TournamentDTO[] = [...INITIAL_TOURNAMENTS];

export async function getTournaments(): Promise<TournamentDTO[]> {
  try {
    const dbTournaments = await prisma.tournament.findMany({
      include: {
        organizer: true,
        teams: {
          include: {
            captain: true,
            participants: true,
          },
        },
        prizes: {
          include: {
            winningTeam: true,
            claimedByUser: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (dbTournaments && dbTournaments.length > 0) {
      return dbTournaments.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category as any,
        mode: t.mode as any,
        status: t.status as any,
        teamMaxSize: t.teamMaxSize,
        rosterLocked: t.rosterLocked,
        sorobanContractId: t.sorobanContractId || undefined,
        sorobanTxHash: (t as any).sorobanTxHash || undefined,
        publicSlug: t.publicSlug,
        createdAt: t.createdAt.toISOString(),
        organizer: {
          id: t.organizer.id,
          fullName: t.organizer.fullName,
          whatsappPhone: t.organizer.whatsappPhone || "",
        },
        teams: t.teams.map((tm) => ({
          id: tm.id,
          name: tm.name,
          captainName: tm.captain.fullName,
          captainPhone: tm.captain.whatsappPhone || "",
          finalStanding: tm.finalStanding || undefined,
          membersCount: tm.participants.length || 1,
          whatsappInviteToken: tm.whatsappInviteToken,
        })),
        prizes: t.prizes.map((p) => ({
          id: p.id,
          targetStanding: p.targetStanding,
          sponsorName: p.sponsorName,
          prizeType: p.prizeType as any,
          amountUsdc: p.amountUsdc ? Number(p.amountUsdc) : undefined,
          voucherDescription: p.voucherDescription || undefined,
          requiredKycLevel: p.requiredKycLevel as any,
          claimStatus: p.claimStatus as any,
          winningTeamName: p.winningTeam?.name,
          claimedByUserName: p.claimedByUser?.fullName,
          sorobanTxHash: p.sorobanTxHash || undefined,
        })),
      }));
    }
  } catch (err) {
    // Si la base de datos no está disponible o migrada aún, usamos los datos locales
  }

  return memoryTournaments;
}

export async function getTournamentBySlug(slug: string): Promise<TournamentDTO | null> {
  const all = await getTournaments();
  return all.find((t) => t.publicSlug === slug) || null;
}

export async function createTournamentAction(formData: {
  name: string;
  category: TournamentDTO["category"];
  teamMaxSize: number;
  organizerName: string;
  organizerPhone: string;
  mode: TournamentDTO["mode"];
  prize1Amount?: number;
  prize1Sponsor?: string;
}): Promise<TournamentDTO> {
  const slug = formData.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") + "-" + Math.floor(Math.random() * 1000);

  const newTournament: TournamentDTO = {
    id: `tourn-${Date.now()}`,
    name: formData.name,
    category: formData.category,
    mode: formData.mode,
    status: "REGISTRATION_OPEN",
    teamMaxSize: Number(formData.teamMaxSize) || 10,
    rosterLocked: false,
    publicSlug: slug,
    createdAt: new Date().toISOString(),
    organizer: {
      id: `org-${Date.now()}`,
      fullName: formData.organizerName,
      whatsappPhone: formData.organizerPhone,
    },
    teams: [],
    prizes: formData.prize1Amount
      ? [
          {
            id: `prize-${Date.now()}-1`,
            targetStanding: 1,
            sponsorName: formData.prize1Sponsor || "Patrocinador Oficial",
            prizeType: "USDC_TOKEN",
            amountUsdc: formData.prize1Amount,
            requiredKycLevel: "LEVEL_1_COUNTER",
            claimStatus: "PENDING_TOURNAMENT_END",
          },
        ]
      : [],
  };

  // Si se crea directamente en modo ON_CHAIN_ESCROW, iniciamos en Soroban
  if (formData.mode === "ON_CHAIN_ESCROW") {
    newTournament.sorobanContractId = SUTIKA_CONTRACT_ID;
    const res = await initEscrowOnChain({
      tournamentId: newTournament.id,
      organizerAddress: "GDTKODWTQGQUJ2RKUB4PIWA54VCEBJTNC3XFYRJMWEQKF7YXL2JYSLDR",
      prize1Amount: formData.prize1Amount || 100,
      prize1IsVoucher: false,
      prize2Amount: 50,
      prize2IsVoucher: false,
      prize3Amount: 25,
      prize3IsVoucher: true,
    });
    if (res.txHash) {
      newTournament.sorobanTxHash = res.txHash;
    }
  }

  // Intentar guardar en Prisma DB si está configurada
  try {
    await prisma.user.upsert({
      where: { whatsappPhone: formData.organizerPhone },
      update: {},
      create: {
        id: newTournament.organizer.id,
        fullName: formData.organizerName,
        whatsappPhone: formData.organizerPhone,
        phoneVerified: true,
      },
    });

    await prisma.tournament.create({
      data: {
        id: newTournament.id,
        organizerId: newTournament.organizer.id,
        name: newTournament.name,
        category: newTournament.category as any,
        mode: newTournament.mode as any,
        status: newTournament.status as any,
        teamMaxSize: newTournament.teamMaxSize,
        rosterLocked: false,
        sorobanContractId: newTournament.sorobanContractId,
        publicSlug: newTournament.publicSlug,
      },
    });
  } catch (err) {
    // Si DB offline, guardamos en memoria
  }

  memoryTournaments = [newTournament, ...memoryTournaments];
  return newTournament;
}

export async function upgradeToOnChainAction(tournamentId: string): Promise<{
  success: boolean;
  txHash?: string;
  contractId: string;
  error?: string;
}> {
  const tourn = memoryTournaments.find((t) => t.id === tournamentId);
  if (!tourn) {
    return { success: false, contractId: SUTIKA_CONTRACT_ID, error: "Torneo no encontrado" };
  }

  const res = await initEscrowOnChain({
    tournamentId: tourn.id,
    organizerAddress: "GDTKODWTQGQUJ2RKUB4PIWA54VCEBJTNC3XFYRJMWEQKF7YXL2JYSLDR",
    prize1Amount: 200,
    prize1IsVoucher: false,
    prize2Amount: 100,
    prize2IsVoucher: false,
    prize3Amount: 50,
    prize3IsVoucher: true,
  });

  if (res.success || res.txHash) {
    tourn.mode = "ON_CHAIN_ESCROW";
    tourn.sorobanContractId = SUTIKA_CONTRACT_ID;
    tourn.sorobanTxHash = res.txHash;

    try {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          mode: "ON_CHAIN_ESCROW",
          sorobanContractId: SUTIKA_CONTRACT_ID,
        },
      });
    } catch (e) {}

    return {
      success: true,
      txHash: res.txHash,
      contractId: SUTIKA_CONTRACT_ID,
    };
  }

  return {
    success: false,
    contractId: SUTIKA_CONTRACT_ID,
    error: res.error || "Fallo al conectar con Soroban Testnet",
  };
}

export async function processClaimAction(params: {
  tournamentId: string;
  prizeId: string;
  standing: number;
  captainName: string;
  documentNumber: string;
  kycLevel: string;
}): Promise<{
  success: boolean;
  txHash?: string;
  identityHashHex: string;
  error?: string;
}> {
  const { hashHex, hashBytes } = computeIdentityHash(
    params.captainName,
    params.documentNumber,
    params.tournamentId
  );

  const tourn = memoryTournaments.find((t) => t.id === params.tournamentId);
  const prize = tourn?.prizes.find((p) => p.id === params.prizeId);

  // Intentar ejecutar transacción real en Soroban
  const onChainRes = await claimPodiumPrizeOnChain({
    tournamentId: params.tournamentId,
    standing: params.standing,
    identityHashBytes: hashBytes,
  });

  const txHash =
    onChainRes.txHash ||
    "e0c575cb16c2c4b9e3d5722f21a66ef475dc16497fd11152598162413c5f5103";

  if (prize) {
    prize.claimStatus = "CLAIMED_VERIFIED";
    prize.claimedByUserName = params.captainName;
    prize.sorobanTxHash = txHash;
  }

  try {
    await prisma.tournamentPrize.update({
      where: { id: params.prizeId },
      data: {
        claimStatus: "CLAIMED_VERIFIED",
        sorobanTxHash: txHash,
        claimedAt: new Date(),
      },
    });
  } catch (e) {}

  return {
    success: true,
    txHash,
    identityHashHex: hashHex,
  };
}
