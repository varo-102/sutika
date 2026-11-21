import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import deployment from "../src/lib/deployment.json" with { type: "json" };
import { WINNER_USDC } from "../src/lib/rules.ts";

if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL.");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const previousCore = "CDP6M3LLHZPXFAWM7O2I6ZQHG2WYSRY6GCNNJZYDXDZSNZKGBWAYAI57";
const demos = [
  ["demo-clash-royale", "Copa de la Corona", "CLASH_ROYALE", 1],
  ["demo-mobile-legends", "Copa del Alba", "MOBILE_LEGENDS", 5],
];

try {
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(831716522)`;
      const org = await tx.user.upsert({
        where: { stellarSmartWalletAddress: deployment.deployer },
        update: {},
        create: {
          fullName: "Sutika · Pruebas Testnet",
          stellarSmartWalletAddress: deployment.deployer,
        },
      });
      for (const [slug, name, category, size] of demos) {
        const previous = await tx.tournament.findUnique({
          where: { publicSlug: slug },
          include: {
            prizes: true,
            ledgerOperations: true,
            _count: { select: { participants: true, teams: true } },
          },
        });
        if (previous?.sorobanContractId === deployment.contractId) {
          if (
            previous.prizes.length !== 1 ||
            previous.prizes[0].targetStanding !== 1 ||
            Number(previous.prizes[0].amountUsdc) !== WINNER_USDC
          )
            throw new Error(
              "La política del torneo existente difiere del contrato.",
            );
          continue;
        }
        if (previous) {
          // Migrate only the two known, unfunded demo registrations. Keep their hashes and prizes in the archive.
          const id = createHash("sha256")
            .update("sutika:testnet:v2:" + previousCore + ":" + slug)
            .digest("hex");
          if (
            previous.ledgerId !== id ||
            previous._count.participants ||
            previous._count.teams ||
            previous.sorobanEscrowId ||
            previous.ledgerOperations.some(
              (o) =>
                o.kind !== "anchor" ||
                !["CONFIRMED", "FAILED", "EXPIRED"].includes(o.status),
            )
          ) {
            throw new Error(
              "La copa anterior tiene actividad. Se necesita revisar la migración antes de sustituirla.",
            );
          }
          await tx.tournament.update({
            where: { id: previous.id },
            data: {
              publicSlug: slug + "-archivo-" + id.slice(0, 8),
              sorobanContractId: previousCore,
              status: "CANCELLED_EXPIRED",
            },
          });
        }
        await tx.tournament.create({
          data: {
            name,
            publicSlug: slug,
            category,
            teamMaxSize: size,
            organizerId: org.id,
            sponsorWallet: deployment.demoSponsor,
            resolverWallet: deployment.resolver,
            sorobanContractId: deployment.contractId,
            ledgerId: createHash("sha256")
              .update(
                "sutika:testnet:winner:" + deployment.contractId + ":" + slug,
              )
              .digest("hex"),
            prizes: {
              create: {
                targetStanding: 1,
                amountUsdc: WINNER_USDC,
                sponsorName: "Sutika · Pruebas Testnet",
                sponsorWalletOrId: deployment.demoSponsor,
                prizeType: "USDC_TOKEN",
                requiredKycLevel: "NONE",
              },
            },
          },
        });
      }
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
  console.log(
    "Dos torneos activos con un premio neto de 5 USDC para el primer puesto.",
  );
} finally {
  await db.$disconnect();
}
