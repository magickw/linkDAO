-- Migration to fix seller_verifications table schema
-- The table was originally created with wallet_address but schema now uses user_id

-- First, add the user_id column if it doesn't exist
ALTER TABLE "seller_verifications"
ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE;

-- Add status column with proper enum values (schema expects this)
ALTER TABLE "seller_verifications"
ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'pending';

-- Add progress_status column (schema expects this)
ALTER TABLE "seller_verifications"
ADD COLUMN IF NOT EXISTS "progress_status" varchar(50) DEFAULT 'submitted';

-- Add progress_updated_at column
ALTER TABLE "seller_verifications"
ADD COLUMN IF NOT EXISTS "progress_updated_at" timestamp DEFAULT now();

-- Migrate existing wallet_address data to user_id where possible
UPDATE "seller_verifications" sv
SET "user_id" = u.id
FROM "users" u
WHERE sv."wallet_address" = u."wallet_address"
  AND sv."user_id" IS NULL;

-- Change primary key from serial id to uuid id if needed
-- First check if id column is still serial type and update it
DO $$
BEGIN
    -- Check if the id column exists and is of type integer/serial
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'seller_verifications'
        AND column_name = 'id'
        AND data_type = 'integer'
    ) THEN
        -- Add new uuid column if doesn't exist
        ALTER TABLE "seller_verifications" ADD COLUMN IF NOT EXISTS "new_id" uuid DEFAULT gen_random_uuid();

        -- Note: We can't easily change the PK type, so we leave the existing id column
        -- and just ensure the new schema columns are present
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS "seller_verifications_user_idx" ON "seller_verifications" ("user_id");
CREATE INDEX IF NOT EXISTS "seller_verifications_status_idx" ON "seller_verifications" ("status");
CREATE INDEX IF NOT EXISTS "seller_verifications_progress_status_idx" ON "seller_verifications" ("progress_status");

-- Add marketplace_verifications table if it doesn't exist
-- Note: seller_verification_id is left as uuid without FK since seller_verifications.id may be integer in old schema
CREATE TABLE IF NOT EXISTS "marketplace_verifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "seller_verification_id" uuid,
    "verification_level" varchar(20) DEFAULT 'basic' NOT NULL,
    "seller_tier" varchar(20) DEFAULT 'bronze' NOT NULL,
    "risk_score" numeric(3, 2) DEFAULT '0' NOT NULL,
    "proof_of_ownership" jsonb,
    "brand_verification" jsonb,
    "verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
    "verified_by" varchar(64),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add review_helpfulness table if it doesn't exist
CREATE TABLE IF NOT EXISTS "review_helpfulness" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "review_id" uuid NOT NULL REFERENCES "marketplace_reviews"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "is_helpful" boolean NOT NULL,
    "created_at" timestamp DEFAULT now()
);

-- Add review_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS "review_reports" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "review_id" uuid NOT NULL REFERENCES "marketplace_reviews"("id") ON DELETE CASCADE,
    "reporter_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "reason" varchar(100) NOT NULL,
    "description" text,
    "status" varchar(20) DEFAULT 'pending',
    "created_at" timestamp DEFAULT now()
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS "marketplace_verifications_user_idx" ON "marketplace_verifications" ("user_id");
CREATE INDEX IF NOT EXISTS "marketplace_verifications_status_idx" ON "marketplace_verifications" ("verification_status");
CREATE INDEX IF NOT EXISTS "review_helpfulness_review_idx" ON "review_helpfulness" ("review_id");
CREATE INDEX IF NOT EXISTS "review_helpfulness_user_idx" ON "review_helpfulness" ("user_id");
CREATE INDEX IF NOT EXISTS "review_reports_review_idx" ON "review_reports" ("review_id");
CREATE INDEX IF NOT EXISTS "review_reports_status_idx" ON "review_reports" ("status");
