-- Migration: Fix Quick Posts Schema
-- This ensures all required columns exist for the quick posts functionality

-- Add content_cid column if it doesn't exist
ALTER TABLE "quick_posts" 
ADD COLUMN IF NOT EXISTS "content_cid" TEXT NOT NULL DEFAULT '';

-- Add other potentially missing columns
ALTER TABLE "quick_posts" 
ADD COLUMN IF NOT EXISTS "content" TEXT;

ALTER TABLE "quick_posts" 
ADD COLUMN IF NOT EXISTS "media_cids" TEXT;

ALTER TABLE "quick_posts" 
ADD COLUMN IF NOT EXISTS "tags" TEXT;

ALTER TABLE "quick_posts" 
ADD COLUMN IF NOT EXISTS "gated_content_preview" TEXT;

ALTER TABLE "quick_posts" 
ADD COLUMN IF NOT EXISTS "moderation_warning" TEXT;

-- Update any existing rows that might have null content_cid
UPDATE "quick_posts" 
SET "content_cid" = COALESCE("content_cid", '') 
WHERE "content_cid" IS NULL OR "content_cid" = '';