-- Migration: 0048_fix_chat_messages_uuid.sql
-- Fix chat_messages.id type from VARCHAR to UUID
-- This migration converts existing VARCHAR IDs to proper UUIDs and enables foreign key constraints

-- ============================================================================
-- PART 1: Backup existing data
-- ============================================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS chat_messages_backup_0048 AS
SELECT * FROM chat_messages;

-- Log backup count
DO $$
DECLARE
  backup_count integer;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM chat_messages_backup_0048;
  RAISE NOTICE 'Backup created with % messages', backup_count;
END $$;

-- ============================================================================
-- PART 2: Add temporary column for proper UUID
-- ============================================================================

-- Add new UUID column
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS new_id uuid;

-- Check if we need to convert data (if id is VARCHAR)
DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type INTO id_type FROM information_schema.columns
  WHERE table_name='chat_messages' AND column_name='id';

  IF id_type = 'character varying' THEN
    RAISE NOTICE 'Converting chat_messages.id from VARCHAR to UUID';

    -- Update messages where id is already a valid UUID format
    UPDATE chat_messages
    SET new_id = id::uuid
    WHERE id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

    -- For non-UUID values, generate new UUIDs (rare case, but handle it)
    UPDATE chat_messages
    SET new_id = gen_random_uuid()
    WHERE new_id IS NULL;

    RAISE NOTICE 'UUID conversion complete';
  ELSE
    RAISE NOTICE 'chat_messages.id is already UUID, skipping conversion';
    -- Copy existing UUIDs to new_id
    UPDATE chat_messages SET new_id = id::uuid WHERE new_id IS NULL;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Handle dependent tables
-- ============================================================================

-- Drop foreign key constraints that reference chat_messages.id
DO $$
BEGIN
  -- Drop parent_message_id constraint if it exists
  ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_parent_message_id_fk;

  -- Drop message_attachments.message_id constraint if it exists
  ALTER TABLE message_attachments
    DROP CONSTRAINT IF EXISTS message_attachments_message_id_fk;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Some constraints did not exist, continuing...';
END $$;

-- ============================================================================
-- PART 4: Convert dependent table columns
-- ============================================================================

-- Check if parent_message_id needs conversion
DO $$
DECLARE
  parent_id_type text;
BEGIN
  SELECT data_type INTO parent_id_type FROM information_schema.columns
  WHERE table_name='chat_messages' AND column_name='parent_message_id';

  IF parent_id_type = 'character varying' THEN
    RAISE NOTICE 'Converting chat_messages.parent_message_id from VARCHAR to UUID';
    ALTER TABLE chat_messages ALTER COLUMN parent_message_id TYPE uuid USING parent_message_id::uuid;
  END IF;
END $$;

-- Check if message_attachments.message_id needs conversion (only if table exists)
DO $$
DECLARE
  attach_msg_id_type text;
  table_exists boolean;
BEGIN
  -- Check if message_attachments table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'message_attachments'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT data_type INTO attach_msg_id_type FROM information_schema.columns
    WHERE table_name='message_attachments' AND column_name='message_id';

    IF attach_msg_id_type = 'character varying' THEN
      RAISE NOTICE 'Converting message_attachments.message_id from VARCHAR to UUID';
      ALTER TABLE message_attachments ALTER COLUMN message_id TYPE uuid USING message_id::uuid;
    END IF;
  ELSE
    RAISE NOTICE 'message_attachments table does not exist yet - skipping conversion';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Convert chat_messages.id to UUID
-- ============================================================================

DO $$
DECLARE
  id_type text;
BEGIN
  SELECT data_type INTO id_type FROM information_schema.columns
  WHERE table_name='chat_messages' AND column_name='id';

  IF id_type = 'character varying' THEN
    RAISE NOTICE 'Converting chat_messages.id from VARCHAR to UUID';

    -- Drop primary key constraint
    ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_pkey;

    -- Convert column type
    ALTER TABLE chat_messages ALTER COLUMN id TYPE uuid USING new_id;

    -- Add primary key constraint back
    ALTER TABLE chat_messages ADD PRIMARY KEY (id);

    RAISE NOTICE 'chat_messages.id converted to UUID successfully';
  END IF;
END $$;

-- ============================================================================
-- PART 6: Recreate foreign key constraints
-- ============================================================================

-- Add parent_message_id foreign key constraint
DO $$
BEGIN
  ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_parent_message_id_fk
    FOREIGN KEY (parent_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'chat_messages_parent_message_id_fk already exists';
END $$;

-- Add message_attachments.message_id foreign key constraint (only if table exists)
DO $$
DECLARE
  table_exists boolean;
BEGIN
  -- Check if message_attachments table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'message_attachments'
  ) INTO table_exists;

  IF table_exists THEN
    BEGIN
      ALTER TABLE message_attachments
        ADD CONSTRAINT message_attachments_message_id_fk
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'message_attachments_message_id_fk already exists';
    END;
  ELSE
    RAISE NOTICE 'message_attachments table does not exist yet - skipping foreign key constraint';
  END IF;
END $$;

-- ============================================================================
-- PART 7: Drop temporary column
-- ============================================================================

ALTER TABLE chat_messages DROP COLUMN IF EXISTS new_id;

-- ============================================================================
-- PART 8: Verify the changes
-- ============================================================================

DO $$
DECLARE
  id_type text;
  parent_id_type text;
  attach_msg_id_type text;
  msg_count integer;
  table_exists boolean;
BEGIN
  -- Check column types
  SELECT data_type INTO id_type FROM information_schema.columns
  WHERE table_name='chat_messages' AND column_name='id';

  SELECT data_type INTO parent_id_type FROM information_schema.columns
  WHERE table_name='chat_messages' AND column_name='parent_message_id';

  -- Check if message_attachments table exists before querying its columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'message_attachments'
  ) INTO table_exists;

  IF table_exists THEN
    SELECT data_type INTO attach_msg_id_type FROM information_schema.columns
    WHERE table_name='message_attachments' AND column_name='message_id';
  END IF;

  -- Count messages
  SELECT COUNT(*) INTO msg_count FROM chat_messages;

  RAISE NOTICE '========== Migration Verification ==========';
  RAISE NOTICE 'chat_messages.id type: %', id_type;
  RAISE NOTICE 'chat_messages.parent_message_id type: %', COALESCE(parent_id_type, 'NULL');
  IF table_exists THEN
    RAISE NOTICE 'message_attachments.message_id type: %', COALESCE(attach_msg_id_type, 'NULL');
  ELSE
    RAISE NOTICE 'message_attachments table: DOES NOT EXIST (will be created in migration 0047)';
  END IF;
  RAISE NOTICE 'Total messages: %', msg_count;
  RAISE NOTICE '==============================================';

  IF id_type = 'uuid' THEN
    RAISE NOTICE 'SUCCESS: chat_messages.id is now UUID type';
  ELSE
    RAISE NOTICE 'WARNING: chat_messages.id is still % type', id_type;
  END IF;
END $$;

-- ============================================================================
-- PART 9: Cleanup (optional - remove backup after verification)
-- ============================================================================

-- Uncomment the following line after successful verification to remove backup:
-- DROP TABLE IF EXISTS chat_messages_backup_0048;

-- Add comment for documentation
COMMENT ON TABLE chat_messages IS 'Chat messages with UUID primary key for proper foreign key constraints';
COMMENT ON COLUMN chat_messages.id IS 'Primary key as UUID (converted from VARCHAR in migration 0048)';