-- Safe Database Migration Script for Quick Posts Table
-- Run this directly in your PostgreSQL database to fix the "column content_cid does not exist" error

-- Add content_cid column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_posts' AND column_name = 'content_cid') THEN
        ALTER TABLE "quick_posts" ADD COLUMN "content_cid" TEXT NOT NULL DEFAULT '';
        -- Remove default after adding
        ALTER TABLE "quick_posts" ALTER COLUMN "content_cid" DROP DEFAULT;
    END IF;
END $$;

-- Add other potentially missing columns just in case (based on schema definition)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_posts' AND column_name = 'content') THEN
        ALTER TABLE "quick_posts" ADD COLUMN "content" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_posts' AND column_name = 'media_cids') THEN
        ALTER TABLE "quick_posts" ADD COLUMN "media_cids" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_posts' AND column_name = 'tags') THEN
        ALTER TABLE "quick_posts" ADD COLUMN "tags" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_posts' AND column_name = 'gated_content_preview') THEN
        ALTER TABLE "quick_posts" ADD COLUMN "gated_content_preview" TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quick_posts' AND column_name = 'moderation_warning') THEN
        ALTER TABLE "quick_posts" ADD COLUMN "moderation_warning" TEXT;
    END IF;
END $$;

-- Success message
SELECT 'Quick posts schema updated successfully!' as status;
