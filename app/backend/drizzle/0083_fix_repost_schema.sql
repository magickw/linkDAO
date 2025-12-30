-- Migration to fix repost schema
-- 1. Change posts.parent_id from integer to uuid
ALTER TABLE posts ALTER COLUMN parent_id TYPE uuid USING (parent_id::text::uuid);

-- 2. Add is_repost column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_repost boolean DEFAULT false;

-- 3. Add is_repost column to quick_posts
ALTER TABLE quick_posts ADD COLUMN IF NOT EXISTS is_repost boolean DEFAULT false;
