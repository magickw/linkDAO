-- Migration: Add Messaging Templates and Quick Replies Tables
-- Created: 2025-10-19
-- Description: Adds support for message templates and quick replies for marketplace messaging

-- =====================================================
-- Message Templates Table
-- =====================================================
-- Stores reusable message templates for sellers
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(66) NOT NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64),
  tags JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_wallet_address CHECK (wallet_address ~* '^0x[a-f0-9]{40}$')
);

-- Indexes for message_templates
CREATE INDEX IF NOT EXISTS idx_message_templates_user_id
  ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_wallet_address
  ON message_templates(wallet_address);
CREATE INDEX IF NOT EXISTS idx_message_templates_category
  ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_is_active
  ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_at
  ON message_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_templates_usage_count
  ON message_templates(usage_count DESC);

-- Comments
COMMENT ON TABLE message_templates IS 'Stores reusable message templates for marketplace messaging';
COMMENT ON COLUMN message_templates.wallet_address IS 'Ethereum wallet address of template owner';
COMMENT ON COLUMN message_templates.category IS 'Template category (e.g., greeting, order_update, shipping)';
COMMENT ON COLUMN message_templates.tags IS 'JSON array of tags for filtering/searching';
COMMENT ON COLUMN message_templates.usage_count IS 'Track how many times template has been used';

-- =====================================================
-- Quick Replies Table
-- =====================================================
-- Stores automated quick reply rules based on keywords
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(66) NOT NULL,
  trigger_keywords JSONB NOT NULL,
  response_text TEXT NOT NULL,
  category VARCHAR(64),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_wallet_address CHECK (wallet_address ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT valid_trigger_keywords CHECK (jsonb_array_length(trigger_keywords) > 0)
);

-- Indexes for quick_replies
CREATE INDEX IF NOT EXISTS idx_quick_replies_user_id
  ON quick_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_wallet_address
  ON quick_replies(wallet_address);
CREATE INDEX IF NOT EXISTS idx_quick_replies_category
  ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_quick_replies_is_active
  ON quick_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_quick_replies_priority
  ON quick_replies(priority DESC);
CREATE INDEX IF NOT EXISTS idx_quick_replies_usage_count
  ON quick_replies(usage_count DESC);

-- GIN index for keyword searching
CREATE INDEX IF NOT EXISTS idx_quick_replies_trigger_keywords_gin
  ON quick_replies USING GIN (trigger_keywords);

-- Comments
COMMENT ON TABLE quick_replies IS 'Stores automated quick reply rules for marketplace messaging';
COMMENT ON COLUMN quick_replies.trigger_keywords IS 'JSON array of keywords that trigger this reply';
COMMENT ON COLUMN quick_replies.response_text IS 'The automated response text';
COMMENT ON COLUMN quick_replies.priority IS 'Higher priority replies are suggested first';
COMMENT ON COLUMN quick_replies.usage_count IS 'Track how many times quick reply has been triggered';

-- =====================================================
-- Conversation Participants Table
-- =====================================================
-- Tracks individual participants in conversations with roles
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address VARCHAR(66) NOT NULL,
  role VARCHAR(32) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  last_read_at TIMESTAMP,
  is_muted BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,
  custom_title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_wallet_address CHECK (wallet_address ~* '^0x[a-f0-9]{40}$'),
  CONSTRAINT valid_role CHECK (role IN ('buyer', 'seller', 'admin', 'member', 'moderator')),
  CONSTRAINT unique_conversation_user UNIQUE (conversation_id, user_id)
);

-- Indexes for conversation_participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id
  ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
  ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_wallet_address
  ON conversation_participants(wallet_address);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_role
  ON conversation_participants(role);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_joined_at
  ON conversation_participants(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active
  ON conversation_participants(conversation_id, left_at)
  WHERE left_at IS NULL;

-- Comments
COMMENT ON TABLE conversation_participants IS 'Tracks individual participants in conversations with detailed metadata';
COMMENT ON COLUMN conversation_participants.role IS 'Participant role: buyer, seller, admin, member, moderator';
COMMENT ON COLUMN conversation_participants.left_at IS 'Timestamp when participant left (NULL if still active)';
COMMENT ON COLUMN conversation_participants.last_read_at IS 'Last time participant read messages in this conversation';
COMMENT ON COLUMN conversation_participants.custom_title IS 'Optional custom display title for participant in conversation';

-- =====================================================
-- Conversation Analytics Table (Optional - for caching)
-- =====================================================
-- Stores pre-aggregated analytics for better performance
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  total_messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMP,
  average_response_time INTERVAL,
  participant_stats JSONB DEFAULT '{}',
  message_types JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for conversation_analytics
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conversation_id
  ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_last_message_at
  ON conversation_analytics(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_updated_at
  ON conversation_analytics(updated_at DESC);

-- Comments
COMMENT ON TABLE conversation_analytics IS 'Pre-aggregated conversation analytics for performance';
COMMENT ON COLUMN conversation_analytics.participant_stats IS 'JSON object with per-participant message counts and activity';
COMMENT ON COLUMN conversation_analytics.message_types IS 'JSON object counting messages by type';

-- =====================================================
-- Update Triggers
-- =====================================================

-- Trigger to update updated_at on message_templates
CREATE OR REPLACE FUNCTION update_message_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_templates_update_timestamp
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_timestamp();

-- Trigger to update updated_at on quick_replies
CREATE OR REPLACE FUNCTION update_quick_replies_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quick_replies_update_timestamp
  BEFORE UPDATE ON quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_quick_replies_timestamp();

-- Trigger to update updated_at on conversation_participants
CREATE OR REPLACE FUNCTION update_conversation_participants_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_participants_update_timestamp
  BEFORE UPDATE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_participants_timestamp();

-- Trigger to update conversation_analytics on message insert
CREATE OR REPLACE FUNCTION update_conversation_analytics_on_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversation_analytics (conversation_id, total_messages, last_message_at, updated_at)
  VALUES (NEW.conversation_id, 1, NEW.sent_at, NOW())
  ON CONFLICT (conversation_id)
  DO UPDATE SET
    total_messages = conversation_analytics.total_messages + 1,
    last_message_at = NEW.sent_at,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_update_analytics
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_analytics_on_message();

-- =====================================================
-- Sample Data (Optional - for testing)
-- =====================================================

-- Insert sample message templates
INSERT INTO message_templates (wallet_address, name, content, category, tags)
VALUES
  ('0x0000000000000000000000000000000000000001', 'Welcome Message', 'Thank you for your purchase! We''re processing your order and will keep you updated.', 'greeting', '["order", "welcome"]'),
  ('0x0000000000000000000000000000000000000001', 'Shipping Update', 'Your order has been shipped! Tracking number: {tracking_number}', 'shipping', '["order", "shipping"]'),
  ('0x0000000000000000000000000000000000000001', 'Order Delivered', 'Your order has been delivered! We hope you enjoy your purchase.', 'delivery', '["order", "delivery"]')
ON CONFLICT DO NOTHING;

-- Insert sample quick replies
INSERT INTO quick_replies (wallet_address, trigger_keywords, response_text, category, priority)
VALUES
  ('0x0000000000000000000000000000000000000001', '["hi", "hello", "hey"]', 'Hello! How can I help you today?', 'greeting', 10),
  ('0x0000000000000000000000000000000000000001', '["shipping", "delivery", "ship"]', 'Our standard shipping time is 3-5 business days. Express shipping is also available!', 'shipping', 8),
  ('0x0000000000000000000000000000000000000001', '["return", "refund"]', 'We offer a 30-day return policy. Please contact us for a return authorization.', 'returns', 8)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Completion Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Created tables: message_templates, quick_replies, conversation_participants, conversation_analytics';
  RAISE NOTICE 'Created indexes for all tables';
  RAISE NOTICE 'Created triggers for timestamp updates and analytics';
  RAISE NOTICE 'Inserted sample data for testing';
END $$;
