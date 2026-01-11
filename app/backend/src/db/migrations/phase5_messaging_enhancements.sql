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

-- Note: conversation_participants table may already exist with different column names
-- This creates it if it doesn't exist, dynamically detecting conversations.id type

DO $$
DECLARE
    v_id_type TEXT;
BEGIN
    -- Get the data type of conversations.id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'id';

    -- Only create if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_participants') THEN
        IF v_id_type = 'uuid' THEN
            CREATE TABLE conversation_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                wallet_address VARCHAR(66) NOT NULL,
                user_id UUID,
                role VARCHAR(32) DEFAULT 'member',
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
            );
        ELSIF v_id_type IN ('integer', 'bigint') THEN
            CREATE TABLE conversation_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                wallet_address VARCHAR(66) NOT NULL,
                user_id UUID,
                role VARCHAR(32) DEFAULT 'member',
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
            );
        ELSE
            CREATE TABLE conversation_participants (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                wallet_address VARCHAR(66) NOT NULL,
                user_id UUID,
                role VARCHAR(32) DEFAULT 'member',
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
            );
        END IF;
        RAISE NOTICE 'Created conversation_participants table with conversation_id type: %', v_id_type;
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
-- Dynamically detect chat_messages.id type for proper foreign key

DO $$
DECLARE
    v_id_type TEXT;
BEGIN
    -- Get the data type of chat_messages.id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'id';

    -- Only create if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_reactions') THEN
        IF v_id_type = 'uuid' THEN
            CREATE TABLE message_reactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                emoji VARCHAR(32) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(message_id, user_address, emoji)
            );
        ELSIF v_id_type IN ('integer', 'bigint') THEN
            CREATE TABLE message_reactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                emoji VARCHAR(32) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(message_id, user_address, emoji)
            );
        ELSE
            -- Default to UUID if type is unknown
            CREATE TABLE message_reactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                emoji VARCHAR(32) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(message_id, user_address, emoji)
            );
        END IF;
        RAISE NOTICE 'Created message_reactions table with message_id type: %', v_id_type;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user
ON message_reactions(user_address);

-- ============================================================================
-- 6. MESSAGE READ STATUS TABLE (Ensure exists)
-- ============================================================================
-- Dynamically detect chat_messages.id type for proper foreign key

DO $$
DECLARE
    v_id_type TEXT;
BEGIN
    -- Get the data type of chat_messages.id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'id';

    -- Only create if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_read_status') THEN
        IF v_id_type = 'uuid' THEN
            CREATE TABLE message_read_status (
                message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                read_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(message_id, user_address)
            );
        ELSIF v_id_type IN ('integer', 'bigint') THEN
            CREATE TABLE message_read_status (
                message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                read_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(message_id, user_address)
            );
        ELSE
            CREATE TABLE message_read_status (
                message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                read_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(message_id, user_address)
            );
        END IF;
        RAISE NOTICE 'Created message_read_status table with message_id type: %', v_id_type;
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
-- Dynamically detect chat_messages.id type for proper self-reference

DO $$
DECLARE
    v_id_type TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'reply_to_id'
    ) THEN
        -- Get the data type of chat_messages.id
        SELECT data_type INTO v_id_type
        FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'id';

        IF v_id_type = 'uuid' THEN
            ALTER TABLE chat_messages
            ADD COLUMN reply_to_id UUID REFERENCES chat_messages(id);
        ELSIF v_id_type IN ('integer', 'bigint') THEN
            ALTER TABLE chat_messages
            ADD COLUMN reply_to_id INTEGER REFERENCES chat_messages(id);
        ELSE
            ALTER TABLE chat_messages
            ADD COLUMN reply_to_id UUID REFERENCES chat_messages(id);
        END IF;
        RAISE NOTICE 'Added reply_to_id column with type: %', v_id_type;
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
-- Ephemeral table for tracking who is typing
-- Dynamically detect conversations.id type for proper foreign key

DO $$
DECLARE
    v_id_type TEXT;
BEGIN
    -- Get the data type of conversations.id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'id';

    -- Only create if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'typing_indicators') THEN
        IF v_id_type = 'uuid' THEN
            CREATE TABLE typing_indicators (
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                started_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(conversation_id, user_address)
            );
        ELSIF v_id_type IN ('integer', 'bigint') THEN
            CREATE TABLE typing_indicators (
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                started_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(conversation_id, user_address)
            );
        ELSE
            CREATE TABLE typing_indicators (
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                user_address VARCHAR(66) NOT NULL,
                started_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(conversation_id, user_address)
            );
        END IF;
        RAISE NOTICE 'Created typing_indicators table with conversation_id type: %', v_id_type;
    END IF;
END $$;

-- Auto-cleanup old typing indicators (older than 10 seconds)
CREATE INDEX IF NOT EXISTS idx_typing_indicators_started
ON typing_indicators(started_at);

-- ============================================================================
-- 11. USER PRESENCE TABLE
-- ============================================================================
-- Track user online/offline status
-- Dynamically detect conversations.id type for proper foreign key

DO $$
DECLARE
    v_id_type TEXT;
BEGIN
    -- Get the data type of conversations.id
    SELECT data_type INTO v_id_type
    FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'id';

    -- Only create if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
        IF v_id_type = 'uuid' THEN
            CREATE TABLE user_presence (
                user_address VARCHAR(66) PRIMARY KEY,
                status VARCHAR(20) DEFAULT 'offline',
                last_seen TIMESTAMP DEFAULT NOW(),
                current_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
                device_info JSONB DEFAULT '{}'
            );
        ELSIF v_id_type IN ('integer', 'bigint') THEN
            CREATE TABLE user_presence (
                user_address VARCHAR(66) PRIMARY KEY,
                status VARCHAR(20) DEFAULT 'offline',
                last_seen TIMESTAMP DEFAULT NOW(),
                current_conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
                device_info JSONB DEFAULT '{}'
            );
        ELSE
            CREATE TABLE user_presence (
                user_address VARCHAR(66) PRIMARY KEY,
                status VARCHAR(20) DEFAULT 'offline',
                last_seen TIMESTAMP DEFAULT NOW(),
                current_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
                device_info JSONB DEFAULT '{}'
            );
        END IF;
        RAISE NOTICE 'Created user_presence table with current_conversation_id type: %', v_id_type;
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
    timestamp TIMESTAMP,
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
