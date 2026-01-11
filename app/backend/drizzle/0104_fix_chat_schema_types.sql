-- Migration to fix chat_messages schema mismatch and enforce UUIDs

-- 1. Clean up invalid data that violates UUID constraints
-- Delete messages with invalid UUID IDs
DELETE FROM "chat_messages" WHERE "id" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Delete messages with invalid conversation_id UUIDs
DELETE FROM "chat_messages" WHERE "conversation_id" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Handle reply_to_id: Set invalid UUIDs to NULL instead of deleting the message
-- This allows us to keep the message content even if the reply link is broken
UPDATE "chat_messages" SET "reply_to_id" = NULL WHERE "reply_to_id" IS NOT NULL AND "reply_to_id" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Delete messages that point to non-existent conversations (orphans)
-- This is necessary before adding the FK constraint
DELETE FROM "chat_messages"
WHERE "conversation_id"::uuid NOT IN (SELECT "id" FROM "conversations");

-- 2. Alter columns to proper UUID type
-- We must drop potential existing constraints first to avoid "cannot be implemented" errors during type change
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_reply_to_id_fkey";
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_reply_to_id_chat_messages_id_fk";
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_conversation_id_conversations_id_fk";

ALTER TABLE "chat_messages" 
  ALTER COLUMN "id" TYPE uuid USING "id"::uuid,
  ALTER COLUMN "conversation_id" TYPE uuid USING "conversation_id"::uuid,
  ALTER COLUMN "reply_to_id" TYPE uuid USING "reply_to_id"::uuid;

-- 3. Add Foreign Key constraints
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_conversation_id_conversations_id_fk') THEN 
    ALTER TABLE "chat_messages" 
    ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" 
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE; 
  END IF; 

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_reply_to_id_chat_messages_id_fk') THEN 
    ALTER TABLE "chat_messages" 
    ADD CONSTRAINT "chat_messages_reply_to_id_chat_messages_id_fk" 
    FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL; 
  END IF;
END $$;
