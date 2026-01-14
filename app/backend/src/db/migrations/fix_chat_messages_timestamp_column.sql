-- Migration: Fix chat_messages timestamp column name
-- Date: 2026-01-14
-- Description: Rename 'timestamp' column to 'sent_at' to match code usage

-- Rename the column from timestamp to sent_at
ALTER TABLE chat_messages RENAME COLUMN timestamp TO sent_at;

-- Update any indexes that reference the old column name
-- Note: The index idx_chat_messages_conversation_id_timestamp should already reference sent_at
-- after the rename since PostgreSQL automatically updates index references

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name IN ('sent_at', 'timestamp');

-- Expected result: Only 'sent_at' should exist, 'timestamp' should not