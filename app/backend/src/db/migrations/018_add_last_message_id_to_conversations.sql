-- Add missing last_message_id column to conversations table
-- This column is used to track the latest message in each conversation for efficient display

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'last_message_id'
    ) THEN
        ALTER TABLE conversations ADD COLUMN last_message_id UUID REFERENCES chat_messages(id);
        COMMENT ON COLUMN conversations.last_message_id IS 'Reference to the most recent message in the conversation';
    END IF;

    -- conversations.last_activity
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'last_activity'
    ) THEN
        ALTER TABLE conversations ADD COLUMN last_activity TIMESTAMP DEFAULT NOW();
    END IF;

    -- conversations.updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;

    -- conversations.unread_count
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'unread_count'
    ) THEN
        ALTER TABLE conversations ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;

    -- conversations.conversation_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'conversation_type'
    ) THEN
        ALTER TABLE conversations ADD COLUMN conversation_type VARCHAR(32) DEFAULT 'general';
    END IF;
END $$;
