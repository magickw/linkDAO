-- Migration: Rename quick_posts to statuses
-- Phase 1 of QuickPost → Status Migration
-- Created: 2026-01-06
-- Estimated Time: 5-10 minutes on production

BEGIN;

-- Step 1: Rename the main table
ALTER TABLE quick_posts RENAME TO statuses;

-- Step 2: Rename indexes on main table
ALTER INDEX idx_quick_posts_share_id RENAME TO idx_statuses_share_id;
ALTER INDEX idx_quick_posts_moderation_status RENAME TO idx_statuses_moderation_status;
ALTER INDEX idx_quick_posts_author_id RENAME TO idx_statuses_author_id;
ALTER INDEX idx_quick_posts_created_at RENAME TO idx_statuses_created_at;

-- Step 3: Rename foreign key constraints on main table
-- The foreign key names are auto-generated, so we need to find and rename them

-- Rename parent_id self-reference constraint
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'statuses'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE statuses RENAME CONSTRAINT %I TO statuses_parent_id_fkey', fk_name);
    END IF;
END $$;

-- Rename author_id foreign key constraint
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'statuses'::regclass
    AND confrelid = 'users'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE statuses RENAME CONSTRAINT %I TO statuses_author_id_fkey', fk_name);
    END IF;
END $$;

-- Step 4: Rename quick_post_tags to status_tags
ALTER TABLE quick_post_tags RENAME TO status_tags;
ALTER TABLE status_tags RENAME COLUMN quick_post_id TO status_id;

-- Update foreign key constraint for status_tags
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'status_tags'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE status_tags RENAME CONSTRAINT %I TO status_tags_status_id_fkey', fk_name);
    END IF;
END $$;

-- Rename indexes on status_tags
DO $$
DECLARE
    idx_name text;
BEGIN
    FOR idx_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'status_tags' 
        AND indexname LIKE '%quick_post%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx_name, 
            replace(idx_name, 'quick_post', 'status')
        );
    END LOOP;
END $$;

-- Step 5: Rename quick_post_reactions to status_reactions
ALTER TABLE quick_post_reactions RENAME TO status_reactions;
ALTER TABLE status_reactions RENAME COLUMN quick_post_id TO status_id;

-- Update foreign key constraint for status_reactions
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'status_reactions'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE status_reactions RENAME CONSTRAINT %I TO status_reactions_status_id_fkey', fk_name);
    END IF;
END $$;

-- Rename indexes on status_reactions
DO $$
DECLARE
    idx_name text;
BEGIN
    FOR idx_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'status_reactions' 
        AND indexname LIKE '%quick_post%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx_name, 
            replace(idx_name, 'quick_post', 'status')
        );
    END LOOP;
END $$;

-- Step 6: Rename quick_post_tips to status_tips
ALTER TABLE quick_post_tips RENAME TO status_tips;
ALTER TABLE status_tips RENAME COLUMN quick_post_id TO status_id;

-- Update foreign key constraint for status_tips
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'status_tips'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE status_tips RENAME CONSTRAINT %I TO status_tips_status_id_fkey', fk_name);
    END IF;
END $$;

-- Rename indexes on status_tips
DO $$
DECLARE
    idx_name text;
BEGIN
    FOR idx_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'status_tips' 
        AND indexname LIKE '%quick_post%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx_name, 
            replace(idx_name, 'quick_post', 'status')
        );
    END LOOP;
END $$;

-- Step 7: Rename quick_post_views to status_views
ALTER TABLE quick_post_views RENAME TO status_views;
ALTER TABLE status_views RENAME COLUMN quick_post_id TO status_id;

-- Update foreign key constraint for status_views
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'status_views'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE status_views RENAME CONSTRAINT %I TO status_views_status_id_fkey', fk_name);
    END IF;
END $$;

-- Rename indexes on status_views
DO $$
DECLARE
    idx_name text;
BEGIN
    FOR idx_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'status_views' 
        AND indexname LIKE '%quick_post%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx_name, 
            replace(idx_name, 'quick_post', 'status')
        );
    END LOOP;
END $$;

-- Step 8: Rename quick_post_bookmarks to status_bookmarks
ALTER TABLE quick_post_bookmarks RENAME TO status_bookmarks;
ALTER TABLE status_bookmarks RENAME COLUMN quick_post_id TO status_id;

-- Update foreign key constraint for status_bookmarks
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'status_bookmarks'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE status_bookmarks RENAME CONSTRAINT %I TO status_bookmarks_status_id_fkey', fk_name);
    END IF;
END $$;

-- Rename indexes on status_bookmarks
DO $$
DECLARE
    idx_name text;
BEGIN
    FOR idx_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'status_bookmarks' 
        AND indexname LIKE '%quick_post%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx_name, 
            replace(idx_name, 'quick_post', 'status')
        );
    END LOOP;
END $$;

-- Step 9: Rename quick_post_shares to status_shares
ALTER TABLE quick_post_shares RENAME TO status_shares;
ALTER TABLE status_shares RENAME COLUMN quick_post_id TO status_id;

-- Update foreign key constraint for status_shares
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'status_shares'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE status_shares RENAME CONSTRAINT %I TO status_shares_status_id_fkey', fk_name);
    END IF;
END $$;

-- Rename indexes on status_shares
DO $$
DECLARE
    idx_name text;
BEGIN
    FOR idx_name IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'status_shares' 
        AND indexname LIKE '%quick_post%'
    LOOP
        EXECUTE format('ALTER INDEX %I RENAME TO %I', 
            idx_name, 
            replace(idx_name, 'quick_post', 'status')
        );
    END LOOP;
END $$;

-- Step 10: Update comments table reference
-- Rename column quick_post_id to status_id in comments table
ALTER TABLE comments RENAME COLUMN quick_post_id TO status_id;

-- Update foreign key constraint for comments
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'comments'::regclass
    AND confrelid = 'statuses'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE comments RENAME CONSTRAINT %I TO comments_status_id_fkey', fk_name);
    END IF;
END $$;

-- Rename index on comments
ALTER INDEX IF EXISTS idx_comments_quick_post_id RENAME TO idx_comments_status_id;

-- Step 11: Verification queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'statuses') THEN
        RAISE EXCEPTION 'Migration failed: statuses table does not exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quick_posts') THEN
        RAISE EXCEPTION 'Migration failed: quick_posts table still exists';
    END IF;

    -- Verify related tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'status_reactions') THEN
        RAISE EXCEPTION 'Migration failed: status_reactions table does not exist';
    END IF;
    
    -- Verify column rename in comments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'status_id') THEN
        RAISE EXCEPTION 'Migration failed: status_id column in comments table does not exist';
    END IF;
    
    RAISE NOTICE 'Migration successful: quick_posts and all related tables/columns renamed to statuses';
END $$;

-- Log migration
INSERT INTO migration_log (migration_name, executed_at, status)
VALUES ('0098_rename_quick_posts_to_statuses', NOW(), 'completed')
ON CONFLICT DO NOTHING;

COMMIT;
