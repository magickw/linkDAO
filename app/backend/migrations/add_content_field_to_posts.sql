-- Migration: Add content field to posts and quick_posts tables
-- This allows storing actual content as a fallback when IPFS is unavailable
-- Created: 2025-11-20

BEGIN;

-- Add content column to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add content column to quick_posts table  
ALTER TABLE quick_posts 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Create index for faster lookups by contentCid
CREATE INDEX IF NOT EXISTS idx_posts_content_cid ON posts(content_cid);
CREATE INDEX IF NOT EXISTS idx_quick_posts_content_cid ON quick_posts(content_cid);

COMMIT;
