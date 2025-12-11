-- Migration: Rollback - revert reactions table to reference posts with integer IDs
-- Down migration

-- Drop the new foreign key constraint if it exists
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

-- Rename columns back to original names
ALTER TABLE reactions RENAME COLUMN post_id TO post_id_temp;
ALTER TABLE reactions RENAME COLUMN post_id_old TO post_id;

-- Drop the temporary UUID column
ALTER TABLE reactions DROP COLUMN IF EXISTS post_id_temp;

-- Recreate the original foreign key constraint if the old posts.id column exists
DO $$ 
BEGIN
   IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'posts' 
      AND column_name = 'id'
   ) THEN
      ALTER TABLE reactions ADD CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
   END IF;
END $$;

-- Recreate the original index
DROP INDEX IF EXISTS idx_reactions_post_id;
CREATE INDEX idx_reactions_post_id ON reactions(post_id);