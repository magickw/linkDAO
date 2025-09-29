-- 0034_chat_tables.sql
-- Create conversations and chat_messages tables
-- Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(255),
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_message_id uuid,
  last_activity timestamptz,
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_address varchar(66) NOT NULL,
  content text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

-- Index creation is guarded below to avoid errors when columns are missing

-- Make migration tolerant: ensure columns exist on pre-existing tables
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_activity timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Create index only if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='last_activity') THEN
    CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity DESC);
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='conversation_id') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_timestamp ON chat_messages(conversation_id, timestamp DESC);
  END IF;
END$$;
