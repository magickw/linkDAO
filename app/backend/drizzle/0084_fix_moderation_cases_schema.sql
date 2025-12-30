-- Migration to fix moderation_cases schema mismatch
-- Issue: Logs show "content_type" column missing in moderation_cases table

-- 1. Add content_type column with default for existing rows
ALTER TABLE "moderation_cases" ADD COLUMN IF NOT EXISTS "content_type" varchar(24) DEFAULT 'post' NOT NULL;

-- 2. Add content_id column with default for existing rows (if missing)
ALTER TABLE "moderation_cases" ADD COLUMN IF NOT EXISTS "content_id" varchar(64) DEFAULT 'unknown' NOT NULL;

-- 3. Drop defaults if they were only for migration (optional, keeping them might be safer but schema says NOT NULL without default usually)
-- Ref schema: contentId: varchar("content_id", { length: 64 }).notNull(),
-- Ref schema: contentType: varchar("content_type", { length: 24 }).notNull(),

ALTER TABLE "moderation_cases" ALTER COLUMN "content_type" DROP DEFAULT;
ALTER TABLE "moderation_cases" ALTER COLUMN "content_id" DROP DEFAULT;
