-- ROLLBACK: Rename statuses back to quick_posts
-- Use this if migration 0098 needs to be rolled back
-- Created: 2026-01-06

BEGIN;

-- Part 1: Rename the main table back
ALTER TABLE statuses RENAME TO quick_posts;

-- Rename indexes back on main table
ALTER INDEX idx_statuses_share_id RENAME TO idx_quick_posts_share_id;
ALTER INDEX idx_statuses_moderation_status RENAME TO idx_quick_posts_moderation_status;
ALTER INDEX idx_statuses_author_id RENAME TO idx_quick_posts_author_id;
ALTER INDEX idx_statuses_created_at RENAME TO idx_quick_posts_created_at;

-- Rename foreign key constraints back on main table
DO $$
DECLARE
    fk_name text;
BEGIN
    -- Parent ID constraint
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'quick_posts'::regclass
    AND confrelid = 'quick_posts'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE quick_posts RENAME CONSTRAINT %I TO quick_posts_parent_id_fkey', fk_name);
    END IF;
    
    -- Author ID constraint
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'quick_posts'::regclass
    AND confrelid = 'users'::regclass
    AND contype = 'f'
    LIMIT 1;
    
    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE quick_posts RENAME CONSTRAINT %I TO quick_posts_author_id_fkey', fk_name);
    END IF;
END $$;

-- Part 2: Rename related tables and columns back

-- status_tags -> quick_post_tags
ALTER TABLE status_tags RENAME TO quick_post_tags;
ALTER TABLE quick_post_tags RENAME COLUMN status_id TO quick_post_id;
-- Rename FKs and Indexes for Tags (Simplified for rollback)
DO $$
DECLARE
    fk_name text;
    idx_name text;
BEGIN
    SELECT conname INTO fk_name FROM pg_constraint WHERE conrelid = 'quick_post_tags'::regclass AND confrelid = 'quick_posts'::regclass AND contype = 'f' LIMIT 1;
    IF fk_name IS NOT NULL THEN EXECUTE format('ALTER TABLE quick_post_tags RENAME CONSTRAINT %I TO quick_post_tags_quick_post_id_fkey', fk_name); END IF;
    
    FOR idx_name IN SELECT indexname FROM pg_indexes WHERE tablename = 'quick_post_tags' AND indexname LIKE '%status%'
    LOOP EXECUTE format('ALTER INDEX %I RENAME TO %I', idx_name, replace(idx_name, 'status', 'quick_post')); END LOOP;
END $$;

-- status_reactions -> quick_post_reactions
ALTER TABLE status_reactions RENAME TO quick_post_reactions;
ALTER TABLE quick_post_reactions RENAME COLUMN status_id TO quick_post_id;
-- Rename FKs and Indexes for Reactions
DO $$
DECLARE
    fk_name text;
    idx_name text;
BEGIN
    SELECT conname INTO fk_name FROM pg_constraint WHERE conrelid = 'quick_post_reactions'::regclass AND confrelid = 'quick_posts'::regclass AND contype = 'f' LIMIT 1;
    IF fk_name IS NOT NULL THEN EXECUTE format('ALTER TABLE quick_post_reactions RENAME CONSTRAINT %I TO quick_post_reactions_quick_post_id_fkey', fk_name); END IF;

    FOR idx_name IN SELECT indexname FROM pg_indexes WHERE tablename = 'quick_post_reactions' AND indexname LIKE '%status%'
    LOOP EXECUTE format('ALTER INDEX %I RENAME TO %I', idx_name, replace(idx_name, 'status', 'quick_post')); END LOOP;
END $$;

-- status_tips -> quick_post_tips
ALTER TABLE status_tips RENAME TO quick_post_tips;
ALTER TABLE quick_post_tips RENAME COLUMN status_id TO quick_post_id;
-- Rename FKs and Indexes for Tips
DO $$
DECLARE
    fk_name text;
    idx_name text;
BEGIN
    SELECT conname INTO fk_name FROM pg_constraint WHERE conrelid = 'quick_post_tips'::regclass AND confrelid = 'quick_posts'::regclass AND contype = 'f' LIMIT 1;
    IF fk_name IS NOT NULL THEN EXECUTE format('ALTER TABLE quick_post_tips RENAME CONSTRAINT %I TO quick_post_tips_quick_post_id_fkey', fk_name); END IF;

    FOR idx_name IN SELECT indexname FROM pg_indexes WHERE tablename = 'quick_post_tips' AND indexname LIKE '%status%'
    LOOP EXECUTE format('ALTER INDEX %I RENAME TO %I', idx_name, replace(idx_name, 'status', 'quick_post')); END LOOP;
END $$;

-- status_views -> quick_post_views
ALTER TABLE status_views RENAME TO quick_post_views;
ALTER TABLE quick_post_views RENAME COLUMN status_id TO quick_post_id;
-- Rename FKs and Indexes for Views
DO $$
DECLARE
    fk_name text;
    idx_name text;
BEGIN
    SELECT conname INTO fk_name FROM pg_constraint WHERE conrelid = 'quick_post_views'::regclass AND confrelid = 'quick_posts'::regclass AND contype = 'f' LIMIT 1;
    IF fk_name IS NOT NULL THEN EXECUTE format('ALTER TABLE quick_post_views RENAME CONSTRAINT %I TO quick_post_views_quick_post_id_fkey', fk_name); END IF;

    FOR idx_name IN SELECT indexname FROM pg_indexes WHERE tablename = 'quick_post_views' AND indexname LIKE '%status%'
    LOOP EXECUTE format('ALTER INDEX %I RENAME TO %I', idx_name, replace(idx_name, 'status', 'quick_post')); END LOOP;
END $$;

-- status_bookmarks -> quick_post_bookmarks
ALTER TABLE status_bookmarks RENAME TO quick_post_bookmarks;
ALTER TABLE quick_post_bookmarks RENAME COLUMN status_id TO quick_post_id;
-- Rename FKs and Indexes for Bookmarks
DO $$
DECLARE
    fk_name text;
    idx_name text;
BEGIN
    SELECT conname INTO fk_name FROM pg_constraint WHERE conrelid = 'quick_post_bookmarks'::regclass AND confrelid = 'quick_posts'::regclass AND contype = 'f' LIMIT 1;
    IF fk_name IS NOT NULL THEN EXECUTE format('ALTER TABLE quick_post_bookmarks RENAME CONSTRAINT %I TO quick_post_bookmarks_quick_post_id_fkey', fk_name); END IF;

    FOR idx_name IN SELECT indexname FROM pg_indexes WHERE tablename = 'quick_post_bookmarks' AND indexname LIKE '%status%'
    LOOP EXECUTE format('ALTER INDEX %I RENAME TO %I', idx_name, replace(idx_name, 'status', 'quick_post')); END LOOP;
END $$;

-- status_shares -> quick_post_shares
ALTER TABLE status_shares RENAME TO quick_post_shares;
ALTER TABLE quick_post_shares RENAME COLUMN status_id TO quick_post_id;
-- Rename FKs and Indexes for Shares
DO $$
DECLARE
    fk_name text;
    idx_name text;
BEGIN
    SELECT conname INTO fk_name FROM pg_constraint WHERE conrelid = 'quick_post_shares'::regclass AND confrelid = 'quick_posts'::regclass AND contype = 'f' LIMIT 1;
    IF fk_name IS NOT NULL THEN EXECUTE format('ALTER TABLE quick_post_shares RENAME CONSTRAINT %I TO quick_post_shares_quick_post_id_fkey', fk_name); END IF;

    FOR idx_name IN SELECT indexname FROM pg_indexes WHERE tablename = 'quick_post_shares' AND indexname LIKE '%status%'
    LOOP EXECUTE format('ALTER INDEX %I RENAME TO %I', idx_name, replace(idx_name, 'status', 'quick_post')); END LOOP;
END $$;

-- Part 3: Rename columns in other tables back

-- Comments table
ALTER TABLE comments RENAME COLUMN status_id TO quick_post_id;
-- Rename FK and Index for Comments
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name FROM pg_constraint WHERE conrelid = 'comments'::regclass AND confrelid = 'quick_posts'::regclass AND contype = 'f' LIMIT 1;
    IF fk_name IS NOT NULL THEN EXECUTE format('ALTER TABLE comments RENAME CONSTRAINT %I TO comments_quick_post_id_fkey', fk_name); END IF;
END $$;
ALTER INDEX IF EXISTS idx_comments_status_id RENAME TO idx_comments_quick_post_id;


-- Part 4: Verification
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quick_posts') THEN
        RAISE EXCEPTION 'Rollback failed: quick_posts table does not exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'statuses') THEN
        RAISE EXCEPTION 'Rollback failed: statuses table still exists';
    END IF;
    
    RAISE NOTICE 'Rollback successful: statuses renamed back to quick_posts';
END $$;

-- Log rollback
UPDATE migration_log 
SET status = 'rolled_back', rolled_back_at = NOW()
WHERE migration_name = '0098_rename_quick_posts_to_statuses';

COMMIT;
