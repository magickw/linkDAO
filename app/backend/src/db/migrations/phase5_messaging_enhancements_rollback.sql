-- ============================================================================
-- Phase 5: Messaging System Enhancements - ROLLBACK
-- ============================================================================
-- Use this script to rollback the Phase 5 migration if needed
-- WARNING: This will remove data stored in the new columns!
-- ============================================================================

SET search_path TO public;

-- Remove new columns from chat_messages
ALTER TABLE chat_messages DROP COLUMN IF EXISTS delivery_status;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS search_vector;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS original_content;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS reply_count;

-- Remove new columns from conversations
ALTER TABLE conversations DROP COLUMN IF EXISTS channel_name;
ALTER TABLE conversations DROP COLUMN IF EXISTS is_channel;
ALTER TABLE conversations DROP COLUMN IF EXISTS channel_description;
ALTER TABLE conversations DROP COLUMN IF EXISTS channel_avatar;
ALTER TABLE conversations DROP COLUMN IF EXISTS max_members;

-- Drop new tables (WARNING: This deletes all data!)
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_chat_message_search_vector() CASCADE;
DROP FUNCTION IF EXISTS update_message_reply_count() CASCADE;
DROP FUNCTION IF EXISTS get_unread_count(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS search_messages(TEXT, UUID, VARCHAR, INTEGER, INTEGER) CASCADE;

-- Drop indexes (including both possible naming conventions)
DROP INDEX IF EXISTS idx_chat_messages_delivery_status;
DROP INDEX IF EXISTS idx_chat_messages_search;
DROP INDEX IF EXISTS idx_conversations_is_channel;
DROP INDEX IF EXISTS idx_conversations_channel_name;
DROP INDEX IF EXISTS idx_chat_messages_conv_time_deleted;
DROP INDEX IF EXISTS idx_chat_messages_unread;
DROP INDEX IF EXISTS idx_conversation_participants_user;
DROP INDEX IF EXISTS idx_conversation_participants_wallet;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = 'phase5_messaging_enhancements_v1';

DO $$
BEGIN
    RAISE NOTICE 'Phase 5 Messaging Enhancements Rollback Complete';
END $$;
