-- Migration: Add ens, avatarCid, and bioCid columns to users table
-- This migration adds proper columns for public profile data that was previously stored in encrypted or legacy fields

-- Add new columns for public profile data
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ens" VARCHAR(255);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_cid" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio_cid" TEXT;

-- Migrate existing data from profileCid to avatarCid
-- Note: This assumes profileCid currently holds avatar data
UPDATE "users" SET "avatar_cid" = "profile_cid" WHERE "profile_cid" IS NOT NULL AND "avatar_cid" IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN "users"."ens" IS 'ENS name (public)';
COMMENT ON COLUMN "users"."avatar_cid" IS 'Avatar image IPFS CID or URL (public)';
COMMENT ON COLUMN "users"."bio_cid" IS 'Bio text (public)';
COMMENT ON COLUMN "users"."profile_cid" IS 'Legacy IPFS metadata (deprecated, use avatar_cid instead)';
