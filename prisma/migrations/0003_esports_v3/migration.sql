CREATE TABLE "competitions_v3" (
  "id" VARCHAR(64) PRIMARY KEY,
  "slug" VARCHAR(96) NOT NULL UNIQUE,
  "name" VARCHAR(60) NOT NULL,
  "game" VARCHAR(24) NOT NULL CHECK ("game" IN ('CLASH_ROYALE', 'MOBILE_LEGENDS')),
  "rules" JSONB NOT NULL,
  "contract_id" VARCHAR(56) NOT NULL,
  "anchored_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "competitions_v3_anchored_at_idx" ON "competitions_v3"("anchored_at");

CREATE TABLE "competition_operations_v3" (
  "id" UUID PRIMARY KEY,
  "competition_id" VARCHAR(64) NOT NULL,
  "kind" VARCHAR(30) NOT NULL,
  "actor" VARCHAR(56) NOT NULL,
  "intent" VARCHAR(64) NOT NULL,
  "hash" VARCHAR(64) NOT NULL UNIQUE,
  "unsigned_xdr" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'PREPARED' CHECK ("status" IN ('PREPARED', 'CONFIRMED', 'EXPIRED', 'FAILED')),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "competition_operations_v3_competition_id_fkey" FOREIGN KEY ("competition_id")
    REFERENCES "competitions_v3"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "competition_operations_v3_competition_id_status_created_at_idx"
  ON "competition_operations_v3"("competition_id", "status", "created_at");
CREATE INDEX "competition_operations_v3_competition_id_actor_intent_status_idx"
  ON "competition_operations_v3"("competition_id", "actor", "intent", "status");

CREATE TABLE "entry_fee_contributions" (
  "competition_id" VARCHAR(64) NOT NULL,
  "team_id" VARCHAR(64) NOT NULL,
  "payer" VARCHAR(56) NOT NULL,
  "stroops" BIGINT NOT NULL CHECK ("stroops" > 0),
  "payment_hash" VARCHAR(64) NOT NULL UNIQUE,
  "refund_hash" VARCHAR(64) UNIQUE,
  "paid_at" TIMESTAMP(3) NOT NULL,
  "refunded_at" TIMESTAMP(3),
  PRIMARY KEY ("competition_id", "team_id"),
  CONSTRAINT "entry_fee_contributions_competition_id_fkey" FOREIGN KEY ("competition_id")
    REFERENCES "competitions_v3"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (("refund_hash" IS NULL) = ("refunded_at" IS NULL))
);

CREATE TABLE "sandbox_verifications" (
  "subject" UUID PRIMARY KEY,
  "wallet" VARCHAR(56) NOT NULL UNIQUE,
  "applicant" VARCHAR(64) UNIQUE,
  "status" VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
  "reviewed_at" TIMESTAMP(3)
);
