-- Force fix for moderation_cases table schema
-- This migration ensures all required columns exist, even if table was created by older migration

-- 1. Ensure moderation_cases exists (if not created by 0014 or 0084)
CREATE TABLE IF NOT EXISTS "moderation_cases" (
  "id" serial PRIMARY KEY,
  "content_id" varchar(64) NOT NULL,
  "content_type" varchar(24) NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "assigned_moderator_id" uuid REFERENCES "users"("id"),
  "status" varchar(24) DEFAULT 'pending',
  "risk_score" numeric(5, 4) DEFAULT 0,
  "decision" varchar(24),
  "reason_code" varchar(48),
  "confidence" numeric(5, 4) DEFAULT 0,
  "vendor_scores" text, -- JSON string
  "evidence_cid" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Add any potentially missing columns individually
DO $$ 
BEGIN 
    -- content_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='moderation_cases' AND column_name='content_type') THEN
        ALTER TABLE "moderation_cases" ADD COLUMN "content_type" varchar(24);
    END IF;

    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='moderation_cases' AND column_name='user_id') THEN
        ALTER TABLE "moderation_cases" ADD COLUMN "user_id" uuid REFERENCES "users"("id");
    END IF;

    -- assigned_moderator_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='moderation_cases' AND column_name='assigned_moderator_id') THEN
        ALTER TABLE "moderation_cases" ADD COLUMN "assigned_moderator_id" uuid REFERENCES "users"("id");
    END IF;

    -- vendor_scores (might be jsonb in old version, ensuring it exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='moderation_cases' AND column_name='vendor_scores') THEN
        ALTER TABLE "moderation_cases" ADD COLUMN "vendor_scores" text;
    END IF;
    
    -- evidence_cid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='moderation_cases' AND column_name='evidence_cid') THEN
        ALTER TABLE "moderation_cases" ADD COLUMN "evidence_cid" text;
    END IF;
END $$;

-- 3. Ensure validation constraints are compatible (drop strict checks if they exist from 0014)
-- We need flexibility for now, as schema.ts defines simple varchars
DO $$
BEGIN
    ALTER TABLE "moderation_cases" DROP CONSTRAINT IF EXISTS "moderation_cases_content_type_check";
    ALTER TABLE "moderation_cases" DROP CONSTRAINT IF EXISTS "moderation_cases_status_check";
    ALTER TABLE "moderation_cases" DROP CONSTRAINT IF EXISTS "moderation_cases_decision_check";
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
