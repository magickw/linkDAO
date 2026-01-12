-- Add missing columns to chat_messages and conversations tables
-- detected from schema mismatch

DO $$
BEGIN
    -- chat_messages.message_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'message_type'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(32) DEFAULT 'text';
    END IF;

    -- chat_messages.encryption_metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'encryption_metadata'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN encryption_metadata JSONB;
    END IF;

    -- chat_messages.attachments
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chat_messages' AND column_name = 'attachments'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN attachments JSONB;
    END IF;

    -- conversations.archived_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'conversations' AND column_name = 'archived_by'
    ) THEN
        ALTER TABLE conversations ADD COLUMN archived_by JSONB DEFAULT '[]';
    END IF;
END $$;
