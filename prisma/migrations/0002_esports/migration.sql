-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TournamentCategory" ADD VALUE 'CLASH_ROYALE';
ALTER TYPE "TournamentCategory" ADD VALUE 'MOBILE_LEGENDS';

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "ledger_id" TEXT,
ADD COLUMN     "podium" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "resolver_wallet" TEXT,
ADD COLUMN     "sponsor_wallet" TEXT;

-- CreateTable
CREATE TABLE "wallet_challenges" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_operations" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slot" INTEGER NOT NULL DEFAULT 0,
    "actor" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "unsigned_xdr" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREPARED',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_challenges_address_expires_at_idx" ON "wallet_challenges"("address", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_operations_hash_key" ON "ledger_operations"("hash");

-- CreateIndex
CREATE INDEX "ledger_operations_tournament_id_kind_slot_status_idx" ON "ledger_operations"("tournament_id", "kind", "slot", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_stellar_smart_wallet_address_key" ON "users"("stellar_smart_wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_ledger_id_key" ON "tournaments"("ledger_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_prizes_tournament_id_target_standing_key" ON "tournament_prizes"("tournament_id", "target_standing");

-- AddForeignKey
ALTER TABLE "ledger_operations" ADD CONSTRAINT "ledger_operations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
