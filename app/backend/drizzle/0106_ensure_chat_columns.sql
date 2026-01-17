DO $$ 
BEGIN 
    -- Ensure encryption_metadata column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'encryption_metadata') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "encryption_metadata" jsonb;
    END IF;

    -- Ensure attachments column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'attachments') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "attachments" jsonb;
    END IF;

    -- Ensure reply_to_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'reply_to_id') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "reply_to_id" uuid REFERENCES "chat_messages"("id");
    END IF;

    -- Ensure other potentially missing columns from 0071
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'delivery_status') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "delivery_status" varchar(16) DEFAULT 'sent';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'reply_count') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "reply_count" integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'original_content') THEN
        ALTER TABLE "chat_messages" ADD COLUMN "original_content" text;
    END IF;

END $$;
