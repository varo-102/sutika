import { createHash } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import deployment from "../src/lib/deployment.json" with { type: "json" };

if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL.");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  await db.$transaction(
    async (tx) => {
      const org = await tx.user.upsert({
        where: { stellarSmartWalletAddress: deployment.deployer },
        update: {},
        create: {
          fullName: "Sutika · Pruebas Testnet",
          stellarSmartWalletAddress: deployment.deployer,
        },
      });
      for (const [slug, name, category, size] of [
        [
          "demo-clash-royale",
          "Copa de prueba · Clash Royale",
          "CLASH_ROYALE",
          1,
        ],
        [
          "demo-mobile-legends",
          "Copa de prueba · Mobile Legends",
          "MOBILE_LEGENDS",
          5,
        ],
      ]) {
        await tx.tournament.upsert({
          where: { publicSlug: slug },
          update: {},
          create: {
            name,
            publicSlug: slug,
            category,
            teamMaxSize: size,
            organizerId: org.id,
            sponsorWallet: deployment.demoSponsor,
            resolverWallet: deployment.resolver,
            ledgerId: createHash("sha256")
              .update("sutika:testnet:v2:" + deployment.contractId + ":" + slug)
              .digest("hex"),
            prizes: {
              create: ["10", "6", "4"].map((amount, i) => ({
                targetStanding: i + 1,
                amountUsdc: amount,
                sponsorName: "Sutika · Pruebas Testnet",
                sponsorWalletOrId: deployment.demoSponsor,
                prizeType: "USDC_TOKEN",
                requiredKycLevel: "NONE",
              })),
            },
          },
        });
      }
    },
    { maxWait: 15_000, timeout: 30_000 },
  );
  console.log(
    "Dos torneos de prueba disponibles. El fondeo y los pagos requieren confirmación en Stellar.",
  );
} finally {
  await db.$disconnect();
}
