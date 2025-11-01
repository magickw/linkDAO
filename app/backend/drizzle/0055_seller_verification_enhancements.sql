-- Migration to enhance seller verification system with comprehensive verification fields
-- This migration adds the necessary columns to support the enhanced seller verification system

-- Add comprehensive verification fields to seller_verifications table
ALTER TABLE "seller_verifications" 
ADD COLUMN IF NOT EXISTS "legal_name" varchar(255),
ADD COLUMN IF NOT EXISTS "ein" varchar(10), -- Format: ##-#######
ADD COLUMN IF NOT EXISTS "business_address" text,
ADD COLUMN IF NOT EXISTS "ein_document_id" uuid, -- Reference to encrypted document
ADD COLUMN IF NOT EXISTS "business_license_id" uuid, -- Reference to encrypted document
ADD COLUMN IF NOT EXISTS "address_proof_id" uuid, -- Reference to encrypted document
ADD COLUMN IF NOT EXISTS "verification_method" varchar(50), -- 'irs_tin_match', 'trulioo', 'manual_review', 'open_corporates'
ADD COLUMN IF NOT EXISTS "verification_reference" varchar(255), -- External reference ID
ADD COLUMN IF NOT EXISTS "risk_score" varchar(10), -- 'low', 'medium', 'high'
ADD COLUMN IF NOT EXISTS "risk_factors" text, -- JSON array of risk factors
ADD COLUMN IF NOT EXISTS "submitted_at" timestamp NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS "verified_at" timestamp,
ADD COLUMN IF NOT EXISTS "expires_at" timestamp, -- For periodic re-verification
ADD COLUMN IF NOT EXISTS "reviewed_by" uuid, -- Admin user ID for manual reviews
ADD COLUMN IF NOT EXISTS "rejection_reason" text,
ADD COLUMN IF NOT EXISTS "notes" text;

-- Update the status column to use the new enum values
ALTER TABLE "seller_verifications" 
ALTER COLUMN "current_tier" TYPE varchar(20),
ALTER COLUMN "current_tier" SET DEFAULT 'pending';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "seller_verifications_user_idx" ON "seller_verifications" ("user_id");
CREATE INDEX IF NOT EXISTS "seller_verifications_status_idx" ON "seller_verifications" ("current_tier");
CREATE INDEX IF NOT EXISTS "seller_verifications_ein_idx" ON "seller_verifications" ("ein");
CREATE INDEX IF NOT EXISTS "seller_verifications_method_idx" ON "seller_verifications" ("verification_method");
CREATE INDEX IF NOT EXISTS "seller_verifications_risk_idx" ON "seller_verifications" ("risk_score");
CREATE INDEX IF NOT EXISTS "seller_verifications_submitted_idx" ON "seller_verifications" ("submitted_at");