import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const cache = globalThis as typeof globalThis & {
  sutikaDatabase?: PrismaClient;
};
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("Falta la conexión a Neon.");
  return (cache.sutikaDatabase ??= new PrismaClient({
    transactionOptions: { maxWait: 15_000, timeout: 30_000 },
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    }),
  }));
}
