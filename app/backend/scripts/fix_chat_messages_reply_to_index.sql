-- Fix script to handle missing reply_to_id column in chat_messages table
-- This script checks if the column exists before creating the index

DO $$
BEGIN
    -- Check if reply_to_id column exists in chat_messages table
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'chat_messages'
        AND column_name = 'reply_to_id'
    ) THEN
        -- Column exists, create the index
        CREATE INDEX IF NOT EXISTS "idx_chat_messages_reply_to"
        ON "chat_messages" USING btree ("reply_to_id");
        RAISE NOTICE 'Created index idx_chat_messages_reply_to';
    ELSE
        -- Column doesn't exist, skip index creation
        RAISE NOTICE 'Column reply_to_id does not exist in chat_messages table, skipping index creation';
    END IF;
END$$;