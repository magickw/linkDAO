-- Migration: Add share_id to quick_posts table for shareable URLs
-- This enables Facebook-style post sharing with short, stable URLs

-- Add share_id column to quick_posts table
ALTER TABLE quick_posts 
ADD COLUMN IF NOT EXISTS share_id VARCHAR(16) UNIQUE;

-- Create index for fast lookups by share_id
CREATE INDEX IF NOT EXISTS idx_quick_posts_share_id ON quick_posts(share_id);

-- Function to generate base62 share IDs
CREATE OR REPLACE FUNCTION generate_share_id() RETURNS VARCHAR(16) AS $$
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
UPDATE quick_posts 
SET share_id = generate_share_id()
WHERE share_id IS NULL;

-- Make share_id NOT NULL after populating
ALTER TABLE quick_posts 
ALTER COLUMN share_id SET NOT NULL;

-- Add default for new posts
ALTER TABLE quick_posts 
ALTER COLUMN share_id SET DEFAULT generate_share_id();
