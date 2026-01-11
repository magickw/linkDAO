-- ============================================================================
-- Phase 5: Messaging System Enhancements Migration
-- ============================================================================
-- This migration adds support for:
-- 1. Message delivery status tracking (sent/delivered/read)
-- 2. Channel/Group support for conversations
-- 3. Full-text search indexing
-- 4. Additional indexes for performance
-- ============================================================================

-- Ensure we're using the correct search path
SET search_path TO public;

-- ============================================================================
-- 1. MESSAGE DELIVERY STATUS
-- ============================================================================
-- Add delivery_status column to track message state (sent -> delivered -> read)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'delivery_status'
    ) THEN
        ALTER TABLE chat_messages
        ADD COLUMN delivery_status VARCHAR(16) DEFAULT 'sent';

        COMMENT ON COLUMN chat_messages.delivery_status IS 'Message delivery state: sent, delivered, read';
    END IF;
END $$;

-- Create index for delivery status queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_delivery_status
ON chat_messages(conversation_id, delivery_status);

-- ============================================================================
-- 2. CHANNEL/GROUP SUPPORT
-- ============================================================================
-- Add columns to support channel-style conversations (like Discord/Slack)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'channel_name'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN channel_name VARCHAR(100);

        COMMENT ON COLUMN conversations.channel_name IS 'Display name for channel/group conversations';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'is_channel'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN is_channel BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN conversations.is_channel IS 'Whether this is a channel (true) or direct message (false)';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'channel_description'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN channel_description TEXT;

        COMMENT ON COLUMN conversations.channel_description IS 'Optional description for channel/group';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'channel_avatar'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN channel_avatar VARCHAR(500);

        COMMENT ON COLUMN conversations.channel_avatar IS 'Avatar/icon URL for channel/group';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'max_members'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN max_members INTEGER DEFAULT 100;

        COMMENT ON COLUMN conversations.max_members IS 'Maximum number of members allowed in group';
    END IF;
END $$;

-- Create indexes for channel queries
CREATE INDEX IF NOT EXISTS idx_conversations_is_channel
ON conversations(is_channel) WHERE is_channel = TRUE;

CREATE INDEX IF NOT EXISTS idx_conversations_channel_name
ON conversations(channel_name) WHERE channel_name IS NOT NULL;

-- ============================================================================
-- 3. CONVERSATION PARTICIPANTS TABLE (Enhanced)
-- ============================================================================
-- Create or update conversation_participants for role-based access

-- Note: conversation_participants table may already exist
-- Use dynamic SQL to create with correct type if it doesn't exist

DO $$
DECLARE
    v_col_type TEXT;
    v_create_sql TEXT;
BEGIN
    -- Only create if table doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'conversation_participants'
    ) THEN
        SELECT format_type(atttypid, atttypmod) INTO v_col_type
        FROM pg_attribute
        WHERE attrelid = 'public.conversations'::regclass
        AND attname = 'id';

        RAISE NOTICE 'Creating conversation_participants with conversation_id type: %', COALESCE(v_col_type, 'NULL');

        IF v_col_type IS NOT NULL THEN
            v_create_sql := format(
                'CREATE TABLE public.conversation_participants (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    conversation_id %s NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
                    wallet_address VARCHAR(66) NOT NULL,
                    user_id UUID,
                    role VARCHAR(32) DEFAULT ''member'',
                    nickname VARCHAR(100),
                    custom_title VARCHAR(255),
                    joined_at TIMESTAMP DEFAULT NOW(),
                    left_at TIMESTAMP,
                    last_read_at TIMESTAMP,
                    is_muted BOOLEAN DEFAULT FALSE,
                    muted_until TIMESTAMP,
                    notifications_enabled BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(conversation_id, wallet_address)
                )',
                v_col_type
            );

            EXECUTE v_create_sql;
            RAISE NOTICE 'Successfully created conversation_participants table';
        ELSE
            RAISE WARNING 'Could not determine conversations.id type, skipping conversation_participants creation';
        END IF;
    ELSE
        RAISE NOTICE 'conversation_participants table already exists';
    END IF;
END $$;

-- Create indexes for participant queries (only if columns exist)
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation
ON conversation_participants(conversation_id);

-- Conditionally create address index based on which column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_participants'
        AND column_name = 'wallet_address'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_conversation_participants_wallet
        ON conversation_participants(wallet_address);
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversation_participants'
        AND column_name = 'user_address'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
        ON conversation_participants(user_address);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_role
ON conversation_participants(conversation_id, role);

COMMENT ON TABLE conversation_participants IS 'Tracks participants and their roles in conversations';

-- ============================================================================
-- 4. FULL-TEXT SEARCH SUPPORT
-- ============================================================================
-- Add full-text search capabilities for message content

-- Add tsvector column for full-text search
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE chat_messages
        ADD COLUMN search_vector tsvector;
    END IF;
END $$;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_chat_messages_search
ON chat_messages USING GIN(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_chat_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS chat_messages_search_vector_update ON chat_messages;
CREATE TRIGGER chat_messages_search_vector_update
    BEFORE INSERT OR UPDATE OF content ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_message_search_vector();

-- Update existing messages with search vectors
UPDATE chat_messages
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;

-- ============================================================================
-- 5. MESSAGE REACTIONS TABLE (Ensure exists with all columns)
-- ============================================================================
-- This table may already exist, but ensure it has all required columns
-- Use dynamic SQL to match exact type of chat_messages.id

-- First, drop table if it exists but has wrong structure (to fix partial migrations)
DROP TABLE IF EXISTS public.message_reactions CASCADE;

DO $$
DECLARE
    v_col_type TEXT;
    v_create_sql TEXT;
BEGIN
    -- Get the exact column type definition from pg_catalog
    SELECT format_type(atttypid, atttypmod) INTO v_col_type
    FROM pg_attribute
    WHERE attrelid = 'public.chat_messages'::regclass
    AND attname = 'id';

    RAISE NOTICE 'chat_messages.id exact type: %', COALESCE(v_col_type, 'NULL');

    IF v_col_type IS NOT NULL THEN
        -- Build dynamic CREATE TABLE statement with exact type
        v_create_sql := format(
            'CREATE TABLE public.message_reactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                message_id %s NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                emoji VARCHAR(32) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(message_id, user_address, emoji)
            )',
            v_col_type
        );

        RAISE NOTICE 'Creating message_reactions with SQL: %', v_create_sql;
        EXECUTE v_create_sql;
        RAISE NOTICE 'Successfully created message_reactions table';
    ELSE
        RAISE WARNING 'Could not determine chat_messages.id type, skipping message_reactions creation';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user
ON message_reactions(user_address);

-- ============================================================================
-- 6. MESSAGE READ STATUS TABLE (Ensure exists)
-- ============================================================================
-- Use dynamic SQL to match exact type of chat_messages.id

DROP TABLE IF EXISTS public.message_read_status CASCADE;

DO $$
DECLARE
    v_col_type TEXT;
    v_create_sql TEXT;
BEGIN
    SELECT format_type(atttypid, atttypmod) INTO v_col_type
    FROM pg_attribute
    WHERE attrelid = 'public.chat_messages'::regclass
    AND attname = 'id';

    RAISE NOTICE 'Creating message_read_status with message_id type: %', COALESCE(v_col_type, 'NULL');

    IF v_col_type IS NOT NULL THEN
        v_create_sql := format(
            'CREATE TABLE public.message_read_status (
                message_id %s NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                read_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(message_id, user_address)
            )',
            v_col_type
        );

        EXECUTE v_create_sql;
        RAISE NOTICE 'Successfully created message_read_status table';
    ELSE
        RAISE WARNING 'Could not determine chat_messages.id type, skipping message_read_status creation';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_read_status_message
ON message_read_status(message_id);

CREATE INDEX IF NOT EXISTS idx_message_read_status_user
ON message_read_status(user_address);

-- ============================================================================
-- 7. PINNING COLUMNS (Ensure exist on chat_messages)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'pinned_by'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN pinned_by VARCHAR(66);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'pinned_at'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN pinned_at TIMESTAMP;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
ON chat_messages(conversation_id, is_pinned) WHERE is_pinned = TRUE;

-- ============================================================================
-- 8. EDITING COLUMNS (Ensure exist on chat_messages)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'edited_at'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN deleted_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'original_content'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN original_content TEXT;
        COMMENT ON COLUMN chat_messages.original_content IS 'Stores original content before edit for audit';
    END IF;
END $$;

-- ============================================================================
-- 9. THREADING COLUMNS (Ensure reply_to_id exists)
-- ============================================================================
-- Use dynamic SQL to match exact type of chat_messages.id for self-reference

DO $$
DECLARE
    v_col_type TEXT;
    v_alter_sql TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'reply_to_id'
    ) THEN
        SELECT format_type(atttypid, atttypmod) INTO v_col_type
        FROM pg_attribute
        WHERE attrelid = 'public.chat_messages'::regclass
        AND attname = 'id';

        RAISE NOTICE 'Adding reply_to_id column with type: %', COALESCE(v_col_type, 'NULL');

        IF v_col_type IS NOT NULL THEN
            v_alter_sql := format(
                'ALTER TABLE public.chat_messages ADD COLUMN reply_to_id %s REFERENCES public.chat_messages(id)',
                v_col_type
            );
            EXECUTE v_alter_sql;
            RAISE NOTICE 'Successfully added reply_to_id column';
        END IF;
    ELSE
        RAISE NOTICE 'reply_to_id column already exists';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to
ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Add thread reply count cache column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'reply_count'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN reply_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN chat_messages.reply_count IS 'Cached count of replies to this message';
    END IF;
END $$;

-- Function to update reply count
CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL THEN
        UPDATE chat_messages
        SET reply_count = reply_count + 1
        WHERE id = NEW.reply_to_id;
    ELSIF TG_OP = 'DELETE' AND OLD.reply_to_id IS NOT NULL THEN
        UPDATE chat_messages
        SET reply_count = GREATEST(0, reply_count - 1)
        WHERE id = OLD.reply_to_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_messages_reply_count_update ON chat_messages;
CREATE TRIGGER chat_messages_reply_count_update
    AFTER INSERT OR DELETE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_reply_count();

-- ============================================================================
-- 10. TYPING INDICATORS TABLE
-- ============================================================================
-- Use dynamic SQL to match exact type of conversations.id

DROP TABLE IF EXISTS public.typing_indicators CASCADE;

DO $$
DECLARE
    v_col_type TEXT;
    v_create_sql TEXT;
BEGIN
    SELECT format_type(atttypid, atttypmod) INTO v_col_type
    FROM pg_attribute
    WHERE attrelid = 'public.conversations'::regclass
    AND attname = 'id';

    RAISE NOTICE 'Creating typing_indicators with conversation_id type: %', COALESCE(v_col_type, 'NULL');

    IF v_col_type IS NOT NULL THEN
        v_create_sql := format(
            'CREATE TABLE public.typing_indicators (
                conversation_id %s NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                started_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(conversation_id, user_address)
            )',
            v_col_type
        );

        EXECUTE v_create_sql;
        RAISE NOTICE 'Successfully created typing_indicators table';
    ELSE
        RAISE WARNING 'Could not determine conversations.id type, skipping typing_indicators creation';
    END IF;
END $$;

-- Auto-cleanup old typing indicators (older than 10 seconds)
CREATE INDEX IF NOT EXISTS idx_typing_indicators_started
ON typing_indicators(started_at);

-- ============================================================================
-- 11. USER PRESENCE TABLE
-- ============================================================================
-- Use dynamic SQL to match exact type of conversations.id

DROP TABLE IF EXISTS public.user_presence CASCADE;

DO $$
DECLARE
    v_col_type TEXT;
    v_create_sql TEXT;
BEGIN
    SELECT format_type(atttypid, atttypmod) INTO v_col_type
    FROM pg_attribute
    WHERE attrelid = 'public.conversations'::regclass
    AND attname = 'id';

    RAISE NOTICE 'Creating user_presence with current_conversation_id type: %', COALESCE(v_col_type, 'NULL');

    IF v_col_type IS NOT NULL THEN
        v_create_sql := format(
            'CREATE TABLE public.user_presence (
                user_address VARCHAR(66) PRIMARY KEY,
                status VARCHAR(20) DEFAULT ''offline'',
                last_seen TIMESTAMP DEFAULT NOW(),
                current_conversation_id %s REFERENCES public.conversations(id) ON DELETE SET NULL,
                device_info JSONB DEFAULT ''{}''
            )',
            v_col_type
        );

        EXECUTE v_create_sql;
        RAISE NOTICE 'Successfully created user_presence table';
    ELSE
        RAISE WARNING 'Could not determine conversations.id type, skipping user_presence creation';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_presence_status
ON user_presence(status);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen
ON user_presence(last_seen);

-- ============================================================================
-- 12. PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for efficient message loading
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_time_deleted
ON chat_messages(conversation_id, timestamp DESC)
WHERE deleted_at IS NULL;

-- Index for unread message counting
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread
ON chat_messages(conversation_id, sender_address, timestamp)
WHERE deleted_at IS NULL;

-- ============================================================================
-- 13. HELPER FUNCTIONS
-- ============================================================================

-- Dynamic function that detects column name in conversation_participants
-- Supports both wallet_address and user_address columns using dynamic SQL
CREATE OR REPLACE FUNCTION get_unread_count(
    p_conversation_id UUID,
    p_address VARCHAR(66)
)
RETURNS INTEGER AS $$
DECLARE
    v_last_read TIMESTAMP;
    v_count INTEGER;
    v_address_column VARCHAR(32);
BEGIN
    -- Detect which address column exists in conversation_participants
    SELECT column_name INTO v_address_column
    FROM information_schema.columns
    WHERE table_name = 'conversation_participants'
    AND column_name IN ('wallet_address', 'user_address')
    LIMIT 1;

    -- Get last read timestamp using dynamic SQL
    IF v_address_column IS NOT NULL THEN
        EXECUTE format(
            'SELECT last_read_at FROM conversation_participants WHERE conversation_id = $1 AND %I = $2',
            v_address_column
        ) INTO v_last_read USING p_conversation_id, p_address;
    END IF;

    -- Count messages after last read
    SELECT COUNT(*) INTO v_count
    FROM chat_messages
    WHERE conversation_id = p_conversation_id
    AND sender_address != p_address
    AND deleted_at IS NULL
    AND (v_last_read IS NULL OR timestamp > v_last_read);

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to search messages with full-text search
CREATE OR REPLACE FUNCTION search_messages(
    p_query TEXT,
    p_conversation_id UUID DEFAULT NULL,
    p_wallet_address VARCHAR(66) DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id UUID,
    conversation_id UUID,
    content TEXT,
    sender_address VARCHAR(66),
    message_timestamp TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cm.id,
        cm.conversation_id,
        cm.content,
        cm.sender_address,
        cm.timestamp,
        ts_rank(cm.search_vector, plainto_tsquery('english', p_query)) as rank
    FROM chat_messages cm
    WHERE cm.search_vector @@ plainto_tsquery('english', p_query)
    AND cm.deleted_at IS NULL
    AND (p_conversation_id IS NULL OR cm.conversation_id = p_conversation_id)
    ORDER BY rank DESC, cm.timestamp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Run this script with: psql -d your_database -f phase5_messaging_enhancements.sql
-- Or through your migration tool (drizzle-kit, knex, etc.)

-- Add migration record
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_migrations (version)
VALUES ('phase5_messaging_enhancements_v1')
ON CONFLICT (version) DO NOTHING;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Phase 5 Messaging Enhancements Migration Complete!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Added: delivery_status, channel support, full-text search';
    RAISE NOTICE 'Added: typing indicators, user presence tracking';
    RAISE NOTICE 'Added: reply count caching, performance indexes';
    RAISE NOTICE '===========================================';
END $$;
