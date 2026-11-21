-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserKycLevel" AS ENUM ('NONE', 'LEVEL_1_COUNTER', 'LEVEL_2_LIGHT', 'LEVEL_3_FULL');

-- CreateEnum
CREATE TYPE "TournamentCategory" AS ENUM ('FOOTBALL', 'FUTSAL', 'VOLLEYBALL', 'BASKETBALL', 'SCHOOL_EVENT', 'CHESS', 'ESPORTS_DOTA', 'HACKATHON');

-- CreateEnum
CREATE TYPE "TournamentMode" AS ENUM ('OFF_CHAIN', 'ON_CHAIN_ESCROW');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_EXPIRED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('ORGANIZER', 'CAPTAIN', 'SUBCAPTAIN', 'PLAYER', 'SPECTATOR');

-- CreateEnum
CREATE TYPE "PrizeType" AS ENUM ('USDC_TOKEN', 'MERCHANT_QR_VOUCHER');

-- CreateEnum
CREATE TYPE "PrizeClaimStatus" AS ENUM ('PENDING_TOURNAMENT_END', 'AWAITING_CAPTAIN_KYC', 'READY_TO_CLAIM', 'CLAIMED_VERIFIED', 'REFUNDED_TO_SPONSOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "whatsapp_phone" TEXT,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyc_level" "UserKycLevel" NOT NULL DEFAULT 'NONE',
    "stellar_smart_wallet_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "document_front_url" TEXT,
    "selfie_or_liveness_id" TEXT,
    "identity_commitment_hash" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "verified_by" TEXT,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TournamentCategory" NOT NULL,
    "mode" "TournamentMode" NOT NULL DEFAULT 'OFF_CHAIN',
    "status" "TournamentStatus" NOT NULL DEFAULT 'REGISTRATION_OPEN',
    "team_max_size" INTEGER NOT NULL DEFAULT 10,
    "roster_locked" BOOLEAN NOT NULL DEFAULT false,
    "soroban_contract_id" TEXT,
    "soroban_escrow_id" TEXT,
    "deadline_ledger" INTEGER,
    "public_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captain_user_id" TEXT NOT NULL,
    "subcaptain_user_id" TEXT,
    "whatsapp_invite_token" TEXT NOT NULL,
    "final_standing" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "team_id" TEXT,
    "user_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "joined_via_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_prizes" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "sponsor_name" TEXT NOT NULL,
    "sponsor_wallet_or_id" TEXT,
    "target_standing" INTEGER NOT NULL,
    "prize_type" "PrizeType" NOT NULL,
    "amount_usdc" DECIMAL(12,2),
    "voucher_description" TEXT,
    "required_kyc_level" "UserKycLevel" NOT NULL,
    "winning_team_id" TEXT,
    "claimed_by_user_id" TEXT,
    "claim_status" "PrizeClaimStatus" NOT NULL DEFAULT 'PENDING_TOURNAMENT_END',
    "soroban_tx_hash" TEXT,
    "accounting_receipt_pdf" TEXT,
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "tournament_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_whatsapp_phone_key" ON "users"("whatsapp_phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_verifications_document_type_document_number_country_co_key" ON "user_verifications"("document_type", "document_number", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_public_slug_key" ON "tournaments"("public_slug");

-- CreateIndex
CREATE UNIQUE INDEX "teams_whatsapp_invite_token_key" ON "teams"("whatsapp_invite_token");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_user_id_key" ON "tournament_participants"("tournament_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_user_id_fkey" FOREIGN KEY ("captain_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_subcaptain_user_id_fkey" FOREIGN KEY ("subcaptain_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_prizes" ADD CONSTRAINT "tournament_prizes_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_prizes" ADD CONSTRAINT "tournament_prizes_winning_team_id_fkey" FOREIGN KEY ("winning_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_prizes" ADD CONSTRAINT "tournament_prizes_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
