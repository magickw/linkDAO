-- Fix social_media_posts table to support both statuses and posts
-- This migration allows social media sharing for both community posts and user statuses

-- Step 1: Create a new column for postId (nullable, for backward compatibility)
ALTER TABLE social_media_posts 
ADD COLUMN IF NOT EXISTS post_id UUID REFERENCES posts(id) ON DELETE CASCADE;

-- Step 2: Create a new column for statusId (nullable, for backward compatibility)
ALTER TABLE social_media_posts 
ADD COLUMN IF NOT EXISTS status_id_new UUID REFERENCES statuses(id) ON DELETE CASCADE;

-- Step 3: Migrate existing data from statusId to status_id_new
UPDATE social_media_posts 
SET status_id_new = status_id
WHERE status_id IS NOT NULL;

-- Step 4: Drop the old statusId column
ALTER TABLE social_media_posts 
DROP COLUMN IF EXISTS status_id;

-- Step 5: Rename status_id_new to status_id
ALTER TABLE social_media_posts 
RENAME COLUMN status_id_new TO status_id;

-- Step 6: Add constraint to ensure either postId or statusId is set
ALTER TABLE social_media_posts 
ADD CONSTRAINT chk_social_media_posts_content_type 
CHECK (
  (post_id IS NOT NULL AND status_id IS NULL) OR 
  (post_id IS NULL AND status_id IS NOT NULL)
);

-- Step 7: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_social_posts_post_id ON social_media_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status_id ON social_media_posts(status_id);

-- Step 8: Add comment to document the change
COMMENT ON COLUMN social_media_posts.post_id IS 'Reference to posts table (for community posts)';
COMMENT ON COLUMN social_media_posts.status_id IS 'Reference to statuses table (for user statuses)';
COMMENT ON TABLE social_media_posts IS 'Stores social media posts for both community posts and user statuses. Either postId or statusId must be set, but not both.';