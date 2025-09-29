-- 0034_chat_tables.sql
-- Create conversations and chat_messages tables
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

CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_timestamp ON chat_messages(conversation_id, timestamp DESC);
