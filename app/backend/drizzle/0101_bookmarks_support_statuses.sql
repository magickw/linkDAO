-- Migration: Add status support to bookmarks table
-- This allows users to bookmark both posts (community posts) and statuses (feed posts)

-- First, drop the existing primary key and foreign key constraints
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_pkey;
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_post_id_posts_id_fk;
ALTER TABLE bookmarks DROP CONSTRAINT IF EXISTS bookmarks_post_fk;

-- Add content_type column to distinguish between posts and statuses
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS content_type varchar(16) DEFAULT 'post';

-- Add status_id column for status references
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS status_id uuid REFERENCES statuses(id) ON DELETE CASCADE;

-- Make post_id nullable (since it can be a status instead)
ALTER TABLE bookmarks ALTER COLUMN post_id DROP NOT NULL;

-- Add unique constraint for user_id + post_id when post_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS bookmark_user_post_unique_idx ON bookmarks(user_id, post_id) WHERE post_id IS NOT NULL;

-- Add unique constraint for user_id + status_id when status_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS bookmark_user_status_unique_idx ON bookmarks(user_id, status_id) WHERE status_id IS NOT NULL;

-- Create index for status_id lookups
CREATE INDEX IF NOT EXISTS bookmark_status_idx ON bookmarks(status_id) WHERE status_id IS NOT NULL;

-- Update existing bookmarks to have correct content_type
UPDATE bookmarks SET content_type = 'post' WHERE post_id IS NOT NULL AND content_type IS NULL;
