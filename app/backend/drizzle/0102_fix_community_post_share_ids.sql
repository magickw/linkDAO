-- Migration: Fix share_id for community posts
-- Previous migration used wrong column name (communityId instead of community_id)
-- This migration correctly populates share_ids for community posts

-- First, ensure the function exists
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

-- Populate share_ids for all posts that don't have one
-- This includes community posts (with community_id) and regular posts
UPDATE posts
SET share_id = generate_community_share_id()
WHERE share_id IS NULL;

-- Add default for new posts (so all new posts automatically get a share_id)
ALTER TABLE posts
ALTER COLUMN share_id SET DEFAULT generate_community_share_id();

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM posts WHERE share_id IS NOT NULL;
  RAISE NOTICE 'Posts with share_id: %', updated_count;
END $$;
