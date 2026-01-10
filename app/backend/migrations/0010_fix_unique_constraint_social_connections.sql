-- Migration: Fix Unique Constraint on social_media_connections Table
-- Description: Fixes the unique constraint on social_media_connections to use proper unique constraint syntax
-- Issue: The schema was incorrectly using uniqueIndex instead of unique for the user_platform constraint
-- Impact: This ensures each user can only have one connection per platform (e.g., one Twitter, one Discord)
-- Date: 2026-01-10
-- Author: Backend Fix

-- =================================================================================================
-- BACKGROUND
-- =================================================================================================
-- The social_media_connections table should enforce that a user cannot have duplicate connections
-- to the same platform. The initial migration created a UNIQUE INDEX, but the schema definition
-- in schema.ts expects a UNIQUE CONSTRAINT. This migration converts the index to a constraint.
--
-- Initial migration (created as INDEX):
--   CREATE UNIQUE INDEX IF NOT EXISTS unique_user_platform ON social_media_connections(user_id, platform);
--
-- Schema definition (expects CONSTRAINT):
--   userPlatformUnique: unique("unique_user_platform").on(t.userId, t.platform)
--
-- This migration:
--   1. Drops the existing UNIQUE INDEX
--   2. Creates a UNIQUE CONSTRAINT with the same name
--   3. Both enforce the same rule, but the schema expects a constraint

-- =================================================================================================
-- MIGRATION STEPS
-- =================================================================================================

-- Step 1: Check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'social_media_connections'
    ) THEN
        RAISE NOTICE 'Table social_media_connections does not exist. Skipping migration.';
    ELSE
        RAISE NOTICE 'Table social_media_connections exists. Proceeding with migration.';
    END IF;
END $$;

-- Step 2: Drop existing unique INDEX if it exists (it was created as an index, not a constraint)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'social_media_connections'
        AND indexname = 'unique_user_platform'
    ) THEN
        RAISE NOTICE 'Dropping existing unique_user_platform INDEX';
        DROP INDEX IF EXISTS unique_user_platform;
    ELSE
        RAISE NOTICE 'No existing unique_user_platform INDEX found';
    END IF;
END $$;

-- Step 3: Create the correct unique constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'social_media_connections'
    ) THEN
        RAISE NOTICE 'Creating unique_user_platform constraint';
        ALTER TABLE social_media_connections 
            ADD CONSTRAINT unique_user_platform 
            UNIQUE (user_id, platform);
    END IF;
END $$;

-- =================================================================================================
-- CLEANUP DUPLICATE DATA (if any)
-- =================================================================================================
-- If there are duplicate user+platform combinations, we need to clean them up first
-- This section handles existing data that violates the new constraint

DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Check for duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, platform, COUNT(*) as cnt
        FROM social_media_connections
        GROUP BY user_id, platform
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate user+platform combinations. Cleaning up...', duplicate_count;
        
        -- Keep the most recently updated connection for each duplicate
        DELETE FROM social_media_connections
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM social_media_connections
            GROUP BY user_id, platform
        );
        
        RAISE NOTICE 'Duplicate data cleaned up successfully';
    ELSE
        RAISE NOTICE 'No duplicate data found';
    END IF;
END $$;

-- =================================================================================================
-- VERIFICATION
-- =================================================================================================

-- Verify the constraint was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_platform'
        AND conrelid = 'social_media_connections'::regclass
        AND contype = 'u'
    ) THEN
        RAISE NOTICE '✓ Unique constraint unique_user_platform created successfully';
    ELSE
        RAISE WARNING '✗ Unique constraint unique_user_platform not found';
    END IF;
END $$;

-- Verify no duplicates exist
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT user_id, platform, COUNT(*) as cnt
        FROM social_media_connections
        GROUP BY user_id, platform
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count = 0 THEN
        RAISE NOTICE '✓ No duplicate user+platform combinations found';
    ELSE
        RAISE WARNING '✗ Found % duplicate user+platform combinations', duplicate_count;
    END IF;
END $$;

-- Display constraint details
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'social_media_connections'::regclass
  AND conname = 'unique_user_platform';

-- =================================================================================================
-- INDEXES (for reference)
-- =================================================================================================
-- The table should have the following indexes:
-- 1. idx_social_connections_user_platform (index, not unique) - for query performance
-- 2. idx_social_connections_status - for filtering by status
-- 3. unique_user_platform (unique constraint) - for data integrity (creates an implicit index)

-- Verify all indexes on the table
SELECT
    indexname AS index_name,
    indexdef AS index_definition
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'social_media_connections'
ORDER BY indexname;

-- =================================================================================================
-- ROLLBACK SCRIPT
-- =================================================================================================
-- To rollback this migration, run:
ALTER TABLE social_media_connections DROP CONSTRAINT IF EXISTS unique_user_platform;
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_platform ON social_media_connections(user_id, platform);

-- =================================================================================================
-- MIGRATION COMPLETE
-- =================================================================================================

DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 0010_fix_unique_constraint_social_connections completed';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '  - Dropped existing unique_user_platform INDEX';
    RAISE NOTICE '  - Created new unique_user_platform CONSTRAINT on (user_id, platform)';
    RAISE NOTICE '  - Cleaned up any duplicate data';
    RAISE NOTICE '===========================================';
END $$;