-- Migration: Add share_id to posts table for community post sharing
-- This enables Facebook-style community post routing

-- Add share_id column to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS share_id VARCHAR(16) UNIQUE;

-- Create index for fast lookups by share_id
CREATE INDEX IF NOT EXISTS idx_posts_share_id ON posts(share_id);

-- Function to generate base62 share IDs (reuse from quick_posts)
CREATE OR REPLACE FUNCTION generate_community_share_id() RETURNS VARCHAR(16) AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * 62 + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Populate existing posts with share_ids
-- Only for posts that have a communityId (community posts)
UPDATE posts 
SET share_id = generate_community_share_id()
WHERE share_id IS NULL 
AND communityId IS NOT NULL;

-- Make share_id NOT NULL for community posts
-- Note: We don't make it NOT NULL globally since some posts might not be community posts
-- The application layer should enforce this for community posts

-- Add comment for documentation
COMMENT ON COLUMN posts.share_id IS 'Short, shareable ID for community posts (8-char base62)';