-- Migration: Update reactions table to reference quickPosts with UUIDs
-- Up migration

-- Add temporary column to store UUID references
ALTER TABLE reactions ADD COLUMN post_id_temp UUID;

-- Create index on temporary column for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_post_id_temp ON reactions(post_id_temp);

-- Only drop the foreign key constraint if it exists
DO $$ 
BEGIN
   IF EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'reactions_post_id_fkey' 
      AND table_name = 'reactions'
   ) THEN
      ALTER TABLE reactions DROP CONSTRAINT reactions_post_id_fkey;
   END IF;
END $$;

-- Rename columns to make the UUID column primary
ALTER TABLE reactions RENAME COLUMN post_id TO post_id_old;
ALTER TABLE reactions RENAME COLUMN post_id_temp TO post_id;

-- Add new foreign key constraint referencing quick_posts
ALTER TABLE reactions ADD CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES quick_posts(id) ON DELETE CASCADE;

-- Rename index to final name
ALTER INDEX IF EXISTS idx_reactions_post_id_temp RENAME TO idx_reactions_post_id;