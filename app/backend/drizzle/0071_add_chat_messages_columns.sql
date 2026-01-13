DO $$ 
BEGIN 
    -- Add delivery_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'delivery_status') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "delivery_status" varchar(16) DEFAULT 'sent';
    END IF;

    -- Add reply_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'reply_count') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "reply_count" integer DEFAULT 0;
    END IF;

    -- Add original_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'original_content') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "original_content" text;
    END IF;

    -- Add encryption_metadata column if it doesn't exist (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'encryption_metadata') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "encryption_metadata" jsonb;
    END IF;

    -- Add attachments column if it doesn't exist (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'attachments') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "attachments" jsonb;
    END IF;

    -- Add reply_to_id column if it doesn't exist (just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'reply_to_id') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "reply_to_id" uuid REFERENCES "chat_messages"("id");
    END IF;
END $$;
