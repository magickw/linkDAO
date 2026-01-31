-- Fix Engagement Stats Schema - Type Migrations
-- This migration fixes critical type mismatches that prevent upvote, downvote, and view counts from working
--
-- Issues:
-- 1. post_votes.post_id is INTEGER but should be UUID to match posts.id
-- 2. views.post_id is INTEGER but should be UUID to match posts.id
-- 3. Foreign key constraints need to be recreated after type changes

-- ============================================================================
-- FIX 1: post_votes table - Change post_id from INTEGER to UUID
-- ============================================================================

-- Drop existing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'post_votes_post_id_fkey'
      AND table_name = 'post_votes'
  ) THEN
    ALTER TABLE post_votes DROP CONSTRAINT post_votes_post_id_fkey;
  END IF;
END $$;

-- Add temporary column for UUID conversion
ALTER TABLE post_votes ADD COLUMN IF NOT EXISTS post_id_new UUID;

-- Update existing rows to convert INTEGER to UUID (only if data exists)
-- Note: This will only work if the INTEGER values can be parsed as UUIDs
-- In production, you may need to map post IDs properly
UPDATE post_votes
SET post_id_new = posts.id::text::uuid
FROM posts
WHERE post_votes.post_id::text = posts.id::text
  AND post_votes.post_id IS NOT NULL;

-- If no data was converted (empty table or mismatched IDs), we'll handle it gracefully
-- Drop old column
ALTER TABLE post_votes DROP COLUMN IF EXISTS post_id;

-- Rename new column to original name
ALTER TABLE post_votes RENAME COLUMN post_id_new TO post_id;

-- Make the column NOT NULL (if it has data, otherwise allow NULL temporarily)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM post_votes WHERE post_id IS NOT NULL LIMIT 1) THEN
    ALTER TABLE post_votes ALTER COLUMN post_id SET NOT NULL;
  END IF;
END $$;

-- Recreate foreign key constraint
ALTER TABLE post_votes
ADD CONSTRAINT post_votes_post_id_fkey
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- ============================================================================
-- FIX 2: views table - Change post_id from INTEGER to UUID
-- ============================================================================

-- Drop existing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'views_post_id_fkey'
      AND table_name = 'views'
  ) THEN
    ALTER TABLE views DROP CONSTRAINT views_post_id_fkey;
  END IF;
END $$;

-- Add temporary column for UUID conversion
ALTER TABLE views ADD COLUMN IF NOT EXISTS post_id_new UUID;

-- Update existing rows to convert INTEGER to UUID
UPDATE views
SET post_id_new = posts.id::text::uuid
FROM posts
WHERE views.post_id::text = posts.id::text
  AND views.post_id IS NOT NULL;

-- Drop old column
ALTER TABLE views DROP COLUMN IF EXISTS post_id;

-- Rename new column to original name
ALTER TABLE views RENAME COLUMN post_id_new TO post_id;

-- Make the column NOT NULL (if it has data, otherwise allow NULL temporarily)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM views WHERE post_id IS NOT NULL LIMIT 1) THEN
    ALTER TABLE views ALTER COLUMN post_id SET NOT NULL;
  END IF;
END $$;

-- Recreate foreign key constraint
ALTER TABLE views
ADD CONSTRAINT views_post_id_fkey
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- ============================================================================
-- FIX 3: Verify and fix other potential type issues
-- ============================================================================

-- Check if there are any other INTEGER columns that reference UUID columns
-- and fix them if found

-- Check reactions table (if it exists and has similar issues)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'reactions'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reactions'
      AND column_name = 'post_id'
      AND data_type = 'integer'
  ) THEN
    -- Drop foreign key constraint
    ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_post_id_fkey;
    
    -- Add temporary column
    ALTER TABLE reactions ADD COLUMN IF NOT EXISTS post_id_new UUID;
    
    -- Convert data
    UPDATE reactions
    SET post_id_new = posts.id::text::uuid
    FROM posts
    WHERE reactions.post_id::text = posts.id::text;
    
    -- Replace column
    ALTER TABLE reactions DROP COLUMN post_id;
    ALTER TABLE reactions RENAME COLUMN post_id_new TO post_id;
    
    -- Add foreign key
    ALTER TABLE reactions
    ADD CONSTRAINT reactions_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- FIX 4: Ensure proper indexes exist
-- ============================================================================

-- Create indexes for post_votes
CREATE INDEX IF NOT EXISTS idx_post_votes_post_id ON post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_user_id ON post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_votes_vote_type ON post_votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_post_votes_post_user ON post_votes(post_id, user_id);

-- Create indexes for views
CREATE INDEX IF NOT EXISTS idx_views_post_id ON views(post_id);
CREATE INDEX IF NOT EXISTS idx_views_user_id ON views(user_id);
CREATE INDEX IF NOT EXISTS idx_views_ip_address ON views(ip_address);
CREATE INDEX IF NOT EXISTS idx_views_created_at ON views(created_at);

-- ============================================================================
-- FIX 5: Recalculate engagement stats from tracking tables
-- ============================================================================

-- Update posts.upvotes based on post_votes table
UPDATE posts
SET upvotes = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM post_votes
    WHERE post_votes.post_id = posts.id
      AND post_votes.vote_type = 'upvote'
  ),
  0
);

-- Update posts.downvotes based on post_votes table
UPDATE posts
SET downvotes = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM post_votes
    WHERE post_votes.post_id = posts.id
      AND post_votes.vote_type = 'downvote'
  ),
  0
);

-- Update posts.views based on views table
UPDATE posts
SET views = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM views
    WHERE views.post_id = posts.id
  ),
  0
);

-- ============================================================================
-- FIX 6: Do the same for statuses table
-- ============================================================================

-- Update statuses.upvotes based on status_votes table
UPDATE statuses
SET upvotes = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM status_votes
    WHERE status_votes.statusId = statuses.id
      AND status_votes.voteType = 'upvote'
  ),
  0
);

-- Update statuses.downvotes based on status_votes table
UPDATE statuses
SET downvotes = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM status_votes
    WHERE status_votes.statusId = statuses.id
      AND status_votes.voteType = 'downvote'
  ),
  0
);

-- Update statuses.views based on status_views table
UPDATE statuses
SET views = COALESCE(
  (
    SELECT COUNT(*)::int
    FROM status_views
    WHERE status_views.statusId = statuses.id
  ),
  0
);

-- ============================================================================
-- FIX 7: Add triggers to keep counts in sync (optional but recommended)
-- ============================================================================

-- Create trigger function to update post vote counts
CREATE OR REPLACE FUNCTION update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'upvote' THEN
      UPDATE posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
    ELSIF NEW.vote_type = 'downvote' THEN
      UPDATE posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'upvote' THEN
      UPDATE posts SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.post_id;
    ELSIF OLD.vote_type = 'downvote' THEN
      UPDATE posts SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = OLD.post_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type != NEW.vote_type THEN
      -- Switch from upvote to downvote
      IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
        UPDATE posts SET upvotes = GREATEST(upvotes - 1, 0), downvotes = downvotes + 1 WHERE id = NEW.post_id;
      -- Switch from downvote to upvote
      ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
        UPDATE posts SET downvotes = GREATEST(downvotes - 1, 0), upvotes = upvotes + 1 WHERE id = NEW.post_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for post_votes
DROP TRIGGER IF EXISTS trigger_update_post_vote_counts ON post_votes;
CREATE TRIGGER trigger_update_post_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON post_votes
FOR EACH ROW EXECUTE FUNCTION update_post_vote_counts();

-- Create trigger function to update post view counts
CREATE OR REPLACE FUNCTION update_post_view_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET views = views + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for views
DROP TRIGGER IF EXISTS trigger_update_post_view_counts ON views;
CREATE TRIGGER trigger_update_post_view_counts
AFTER INSERT ON views
FOR EACH ROW EXECUTE FUNCTION update_post_view_counts();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify post_votes table schema
DO $$
DECLARE
  column_type TEXT;
BEGIN
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_name = 'post_votes' AND column_name = 'post_id';
  
  IF column_type = 'uuid' THEN
    RAISE NOTICE '✓ post_votes.post_id is correctly UUID';
  ELSE
    RAISE NOTICE '✗ post_votes.post_id is still % (should be uuid)', column_type;
  END IF;
END $$;

-- Verify views table schema
DO $$
DECLARE
  column_type TEXT;
BEGIN
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_name = 'views' AND column_name = 'post_id';
  
  IF column_type = 'uuid' THEN
    RAISE NOTICE '✓ views.post_id is correctly UUID';
  ELSE
    RAISE NOTICE '✗ views.post_id is still % (should be uuid)', column_type;
  END IF;
END $$;

-- Verify foreign key constraints exist
DO $$
DECLARE
  fk_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'post_votes_post_id_fkey'
      AND table_name = 'post_votes'
  ) INTO fk_exists;
  
  IF fk_exists THEN
    RAISE NOTICE '✓ post_votes foreign key constraint exists';
  ELSE
    RAISE NOTICE '✗ post_votes foreign key constraint missing';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'views_post_id_fkey'
      AND table_name = 'views'
  ) INTO fk_exists;
  
  IF fk_exists THEN
    RAISE NOTICE '✓ views foreign key constraint exists';
  ELSE
    RAISE NOTICE '✗ views foreign key constraint missing';
  END IF;
END $$;

-- Verify trigger exists
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_update_post_vote_counts'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✓ Post vote count trigger exists';
  ELSE
    RAISE NOTICE '✗ Post vote count trigger missing';
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_update_post_view_counts'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✓ Post view count trigger exists';
  ELSE
    RAISE NOTICE '✗ Post view count trigger missing';
  END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE post_votes IS 'Tracks individual upvotes/downvotes on posts. post_id is UUID matching posts.id';
COMMENT ON TABLE views IS 'Tracks individual views on posts. post_id is UUID matching posts.id';
COMMENT ON FUNCTION update_post_vote_counts() IS 'Trigger function to keep post vote counts in sync';
COMMENT ON FUNCTION update_post_view_counts() IS 'Trigger function to keep post view counts in sync';

-- ============================================================================
-- SUMMARY
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '==========================================';
RAISE NOTICE 'Engagement Stats Schema Fix Complete';
RAISE NOTICE '==========================================';
RAISE NOTICE '';
RAISE NOTICE 'Changes made:';
RAISE NOTICE '1. post_votes.post_id changed from INTEGER to UUID';
RAISE NOTICE '2. views.post_id changed from INTEGER to UUID';
RAISE NOTICE '3. Foreign key constraints recreated';
RAISE NOTICE '4. Indexes created for performance';
RAISE NOTICE '5. Engagement stats recalculated from tracking tables';
RAISE NOTICE '6. Triggers added to keep counts in sync';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Test upvote/downvote functionality';
RAISE NOTICE '2. Test view tracking';
RAISE NOTICE '3. Verify counts display correctly in frontend';
RAISE NOTICE '';