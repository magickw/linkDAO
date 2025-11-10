-- Add updated_at column to posts table
-- This migration adds the updated_at column that will track when posts are last modified

-- Add updated_at column with default value of current timestamp
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create an index for better query performance on updated_at
CREATE INDEX IF NOT EXISTS idx_posts_updated_at ON posts(updated_at);

-- Add a comment to describe the purpose of this column
COMMENT ON COLUMN posts.updated_at IS 'Timestamp of when the post was last updated';

-- Update existing rows to have updated_at match created_at (for consistency)
UPDATE posts SET updated_at = created_at WHERE updated_at IS NULL;