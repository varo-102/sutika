import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de torneos en Neon PostgreSQL...");

  // 1. Organizadores
  const org1 = await prisma.user.upsert({
    where: { whatsappPhone: "+591 70011223" },
    update: {},
    create: {
      fullName: "Comunidad Gamer Bolivia",
      whatsappPhone: "+591 70011223",
      phoneVerified: true,
      kycLevel: "LEVEL_2_LIGHT",
    },
  });

  const org2 = await prisma.user.upsert({
    where: { whatsappPhone: "+591 77788990" },
    update: {},
    create: {
      fullName: "Complejo Deportivo Calacoto",
      whatsappPhone: "+591 77788990",
      phoneVerified: true,
      kycLevel: "LEVEL_1_COUNTER",
    },
  });

  // 2. Torneo Dota 2 (ON_CHAIN_ESCROW)
  const dotaTournament = await prisma.tournament.upsert({
    where: { publicSlug: "dota-andes-2026" },
    update: {},
    create: {
      name: "Dota 2 Andes Championship (Esports 5v5)",
      category: "ESPORTS_DOTA",
      mode: "ON_CHAIN_ESCROW",
      status: "COMPLETED",
      teamMaxSize: 5,
      rosterLocked: true,
      sorobanContractId: "CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T",
      publicSlug: "dota-andes-2026",
      organizerId: org1.id,
    },
  });

  // 3. Torneo Fútbol 7
  await prisma.tournament.upsert({
    where: { publicSlug: "copa-futbol7-lapaz" },
    update: {},
    create: {
      name: "Copa Relámpago La Paz (Fútbol 7 Nocturno)",
      category: "FOOTBALL",
      mode: "ON_CHAIN_ESCROW",
      status: "IN_PROGRESS",
      teamMaxSize: 12,
      rosterLocked: true,
      sorobanContractId: "CDDXP3Q3I3T77BRG65F7FB5Q2CA4WLWO5AKYSLZTOLUTTMWVO5B2TA2T",
      publicSlug: "copa-futbol7-lapaz",
      organizerId: org2.id,
    },
  });

  console.log("✅ Seed completado con éxito.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
