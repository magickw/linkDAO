-- Migration: Add pin posts functionality
-- Created: 2025-12-03

-- Add pin-related fields to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS pinned_by TEXT;

-- Create index for efficient querying of pinned posts
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(community_id, is_pinned, created_at DESC) WHERE is_pinned = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN posts.is_pinned IS 'Whether this post is pinned to the top of the community feed';
COMMENT ON COLUMN posts.pinned_at IS 'Timestamp when the post was pinned';
COMMENT ON COLUMN posts.pinned_by IS 'Address of the admin/moderator who pinned the post';
