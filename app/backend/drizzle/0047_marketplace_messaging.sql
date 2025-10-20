-- Migration: 0047_marketplace_messaging.sql
-- Add marketplace-specific messaging features
-- This migration enhances the existing messaging system with order context,
-- buyer-seller roles, message templates, and analytics

-- ============================================================================
-- PART 1: Enhance Conversations Table with Marketplace Context
-- ============================================================================

-- Add marketplace context columns to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_type varchar(32) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS order_id integer,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS listing_id integer,
  ADD COLUMN IF NOT EXISTS context_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_automated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add foreign key constraints for marketplace entities
DO $$ BEGIN
  ALTER TABLE conversations
    ADD CONSTRAINT conversations_order_id_orders_id_fk
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversations
    ADD CONSTRAINT conversations_product_id_products_id_fk
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversations
    ADD CONSTRAINT conversations_listing_id_listings_id_fk
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for marketplace queries
CREATE INDEX IF NOT EXISTS idx_conversations_order_id ON conversations(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON conversations(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_is_automated ON conversations(is_automated);

-- Add comment for documentation
COMMENT ON COLUMN conversations.conversation_type IS 'Type of conversation: general, order_inquiry, order_support, dispute, product_question';
COMMENT ON COLUMN conversations.context_metadata IS 'JSON object containing marketplace context like order_amount, product_name, etc.';
COMMENT ON COLUMN conversations.is_automated IS 'Whether this conversation was auto-created by the system';

-- ============================================================================
-- PART 2: Conversation Participants Table with Roles
-- ============================================================================

-- Create conversation participants table with buyer/seller roles
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'participant',
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  last_read_at timestamptz,
  last_read_message_id uuid,
  is_muted boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  notification_enabled boolean DEFAULT true,
  custom_label varchar(100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT conversation_participants_unique UNIQUE(conversation_id, user_id)
);

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fk
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for participants queries
CREATE INDEX IF NOT EXISTS idx_conv_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_role ON conversation_participants(role);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_active ON conversation_participants(user_id) WHERE left_at IS NULL;

-- Add comments
COMMENT ON TABLE conversation_participants IS 'Tracks participants in conversations with their roles (buyer, seller, moderator, participant)';
COMMENT ON COLUMN conversation_participants.role IS 'Participant role: buyer, seller, moderator, participant, admin';
COMMENT ON COLUMN conversation_participants.last_read_message_id IS 'ID of the last message read by this participant';

-- ============================================================================
-- PART 3: Enhanced Message Types
-- ============================================================================

-- Add marketplace-specific message columns to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS message_type varchar(32) DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS order_reference integer,
  ADD COLUMN IF NOT EXISTS is_automated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_system_message boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_message_id uuid,
  ADD COLUMN IF NOT EXISTS reaction_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attachment_count integer DEFAULT 0;

-- Add foreign key for order reference
DO $$ BEGIN
  ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_order_reference_fk
    FOREIGN KEY (order_reference) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add foreign key for parent message (threading)
-- Skip if types are incompatible (e.g., parent_message_id is UUID but id is VARCHAR)
DO $$
DECLARE
  id_type text;
  parent_id_type text;
BEGIN
  -- Get the types of both columns
  SELECT data_type INTO id_type FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='id';
  SELECT data_type INTO parent_id_type FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='parent_message_id';

  -- Only add constraint if types match
  IF id_type = parent_id_type OR (id_type = 'uuid' AND parent_id_type = 'uuid') OR (id_type = 'character varying' AND parent_id_type = 'character varying') THEN
    ALTER TABLE chat_messages
      ADD CONSTRAINT chat_messages_parent_message_id_fk
      FOREIGN KEY (parent_message_id) REFERENCES chat_messages(id) ON DELETE CASCADE ON UPDATE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping parent_message_id foreign key: type mismatch (id: %, parent_message_id: %)', id_type, parent_id_type;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key chat_messages_parent_message_id_fk already exists, skipping';
  WHEN datatype_mismatch THEN
    RAISE NOTICE 'Skipping parent_message_id foreign key: type mismatch';
END $$;

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_order_reference ON chat_messages(order_reference) WHERE order_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_automated ON chat_messages(is_automated);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent_id ON chat_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_template_id ON chat_messages(template_id) WHERE template_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN chat_messages.message_type IS 'Message type: text, order_update, payment_confirmation, tracking_update, dispute_notice, system_notification, template_response';
COMMENT ON COLUMN chat_messages.metadata IS 'JSON object containing message-specific data like tracking_number, order_amount, etc.';
COMMENT ON COLUMN chat_messages.parent_message_id IS 'For threaded replies, references the parent message';

-- ============================================================================
-- PART 4: Message Templates for Sellers
-- ============================================================================

-- Create message templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  content text NOT NULL,
  category varchar(64),
  tags text[], -- Array of tags for categorization
  shortcut varchar(50), -- Optional keyboard shortcut
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT false, -- Can other sellers use this template?
  language varchar(10) DEFAULT 'en',
  variables jsonb DEFAULT '{}'::jsonb, -- Template variables like {{buyer_name}}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
DO $$ BEGIN
  ALTER TABLE message_templates
    ADD CONSTRAINT message_templates_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add foreign key from chat_messages to templates
DO $$ BEGIN
  ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_template_id_fk
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for templates (only if columns exist)
CREATE INDEX IF NOT EXISTS idx_templates_user ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON message_templates(is_active) WHERE is_active = true;

-- Create is_public index only if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_templates' AND column_name='is_public') THEN
    CREATE INDEX IF NOT EXISTS idx_templates_public ON message_templates(is_public) WHERE is_public = true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_templates_usage ON message_templates(usage_count DESC);

-- Create GIN index only if tags column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_templates' AND column_name='tags') THEN
    CREATE INDEX IF NOT EXISTS idx_templates_tags ON message_templates USING gin(tags);
  END IF;
END $$;

-- Add comments (only if columns exist)
COMMENT ON TABLE message_templates IS 'Pre-defined message templates for quick seller responses';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_templates' AND column_name='shortcut') THEN
    EXECUTE 'COMMENT ON COLUMN message_templates.shortcut IS ''Optional keyboard shortcut to quickly insert this template (e.g., /shipping)''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_templates' AND column_name='variables') THEN
    EXECUTE 'COMMENT ON COLUMN message_templates.variables IS ''Template variables that get replaced, e.g., {{buyer_name}}, {{order_id}}''';
  END IF;
END $$;

-- ============================================================================
-- PART 5: Quick Replies and Auto-Responses
-- ============================================================================

-- Create quick replies table
CREATE TABLE IF NOT EXISTS quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_keywords text[] NOT NULL, -- Array of keywords that suggest this reply
  response_text text NOT NULL,
  category varchar(64),
  priority integer DEFAULT 0, -- Higher priority suggestions shown first
  language varchar(10) DEFAULT 'en',
  is_active boolean DEFAULT true,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  match_type varchar(20) DEFAULT 'contains', -- contains, exact, regex
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
DO $$ BEGIN
  ALTER TABLE quick_replies
    ADD CONSTRAINT quick_replies_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for quick replies
CREATE INDEX IF NOT EXISTS idx_quick_replies_user ON quick_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_active ON quick_replies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_quick_replies_keywords ON quick_replies USING gin(trigger_keywords);
CREATE INDEX IF NOT EXISTS idx_quick_replies_priority ON quick_replies(priority DESC);

-- Add comments (only if columns exist)
COMMENT ON TABLE quick_replies IS 'Automated reply suggestions based on message content keywords';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quick_replies' AND column_name='trigger_keywords') THEN
    EXECUTE 'COMMENT ON COLUMN quick_replies.trigger_keywords IS ''Array of keywords that trigger this quick reply suggestion''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quick_replies' AND column_name='match_type') THEN
    EXECUTE 'COMMENT ON COLUMN quick_replies.match_type IS ''How to match keywords: contains, exact, regex''';
  END IF;
END $$;

-- ============================================================================
-- PART 6: Conversation Analytics
-- ============================================================================

-- Create conversation analytics table
CREATE TABLE IF NOT EXISTS conversation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  seller_id uuid,
  buyer_id uuid,

  -- Response time metrics
  seller_first_response_time interval,
  seller_avg_response_time interval,
  buyer_avg_response_time interval,
  seller_response_count integer DEFAULT 0,
  buyer_response_count integer DEFAULT 0,

  -- Engagement metrics
  message_count integer DEFAULT 0,
  total_characters integer DEFAULT 0,
  attachment_count integer DEFAULT 0,

  -- Conversion metrics
  converted_to_sale boolean DEFAULT false,
  sale_order_id integer,
  sale_amount numeric(20,8),
  conversion_time interval, -- Time from first message to sale

  -- Quality metrics
  has_template_usage boolean DEFAULT false,
  template_usage_count integer DEFAULT 0,
  avg_message_length integer DEFAULT 0,
  sentiment_score numeric(3,2), -- -1 to 1, if sentiment analysis is implemented

  -- Timeline metrics
  started_at timestamptz,
  first_seller_response_at timestamptz,
  last_activity_at timestamptz,
  resolved_at timestamptz,
  resolution_time interval,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT conversation_analytics_unique UNIQUE(conversation_id)
);

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE conversation_analytics
    ADD CONSTRAINT conversation_analytics_conversation_id_fk
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversation_analytics
    ADD CONSTRAINT conversation_analytics_seller_id_fk
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversation_analytics
    ADD CONSTRAINT conversation_analytics_buyer_id_fk
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE conversation_analytics
    ADD CONSTRAINT conversation_analytics_sale_order_id_fk
    FOREIGN KEY (sale_order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_conv_analytics_conversation ON conversation_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_seller ON conversation_analytics(seller_id);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_buyer ON conversation_analytics(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_converted ON conversation_analytics(converted_to_sale);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_seller_response_time ON conversation_analytics(seller_avg_response_time);
CREATE INDEX IF NOT EXISTS idx_conv_analytics_started_at ON conversation_analytics(started_at DESC);

-- Add comments
COMMENT ON TABLE conversation_analytics IS 'Analytics and metrics for conversations, especially buyer-seller interactions';
COMMENT ON COLUMN conversation_analytics.seller_first_response_time IS 'Time from first buyer message to first seller response';
COMMENT ON COLUMN conversation_analytics.conversion_time IS 'Time from conversation start to sale completion';

-- ============================================================================
-- PART 7: Link Existing Tables to Conversations
-- ============================================================================

-- Add conversation_id to disputes table
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

DO $$ BEGIN
  ALTER TABLE disputes
    ADD CONSTRAINT disputes_conversation_id_fk
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_disputes_conversation_id ON disputes(conversation_id) WHERE conversation_id IS NOT NULL;

COMMENT ON COLUMN disputes.conversation_id IS 'Links dispute to the conversation where it was initiated';

-- Add conversation_id to tracking_records table
ALTER TABLE tracking_records
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

DO $$ BEGIN
  ALTER TABLE tracking_records
    ADD CONSTRAINT tracking_records_conversation_id_fk
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_tracking_conversation ON tracking_records(conversation_id) WHERE conversation_id IS NOT NULL;

COMMENT ON COLUMN tracking_records.conversation_id IS 'Links tracking updates to the order conversation';

-- ============================================================================
-- PART 8: Message Attachments Table (Enhanced)
-- ============================================================================

-- Create message attachments table for better file handling
CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  file_type varchar(50) NOT NULL, -- image, video, audio, document, other
  file_name varchar(255) NOT NULL,
  file_size bigint NOT NULL, -- Size in bytes
  mime_type varchar(100),
  storage_url text NOT NULL, -- IPFS hash or storage URL
  thumbnail_url text, -- For images/videos
  width integer, -- For images/videos
  height integer, -- For images/videos
  duration integer, -- For audio/video in seconds
  metadata jsonb DEFAULT '{}'::jsonb,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint (with type compatibility check)
DO $$
DECLARE
  msg_id_type text;
  attach_msg_id_type text;
BEGIN
  -- Get the types of both columns
  SELECT data_type INTO msg_id_type FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='id';
  SELECT data_type INTO attach_msg_id_type FROM information_schema.columns WHERE table_name='message_attachments' AND column_name='message_id';

  -- Only add constraint if types match
  IF msg_id_type = attach_msg_id_type OR (msg_id_type = 'uuid' AND attach_msg_id_type = 'uuid') OR (msg_id_type = 'character varying' AND attach_msg_id_type = 'character varying') THEN
    ALTER TABLE message_attachments
      ADD CONSTRAINT message_attachments_message_id_fk
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE ON UPDATE CASCADE;
  ELSE
    RAISE NOTICE 'Skipping message_attachments.message_id foreign key: type mismatch (chat_messages.id: %, message_attachments.message_id: %)', msg_id_type, attach_msg_id_type;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Foreign key message_attachments_message_id_fk already exists, skipping';
  WHEN datatype_mismatch THEN
    RAISE NOTICE 'Skipping message_attachments.message_id foreign key: type mismatch';
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_type ON message_attachments(file_type);
CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded ON message_attachments(uploaded_at DESC);

COMMENT ON TABLE message_attachments IS 'File attachments for messages with detailed metadata';

-- ============================================================================
-- PART 9: Auto-Response Rules
-- ============================================================================

-- Create auto-response rules table for automated messaging
CREATE TABLE IF NOT EXISTS auto_response_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_name varchar(255) NOT NULL,
  trigger_type varchar(50) NOT NULL, -- new_conversation, keyword, time_based, order_status
  trigger_conditions jsonb NOT NULL, -- Flexible conditions as JSON
  response_template_id uuid,
  response_text text, -- If not using template
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  cooldown_minutes integer DEFAULT 60, -- Prevent duplicate auto-responses
  usage_count integer DEFAULT 0,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE auto_response_rules
    ADD CONSTRAINT auto_response_rules_user_id_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE auto_response_rules
    ADD CONSTRAINT auto_response_rules_template_id_fk
    FOREIGN KEY (response_template_id) REFERENCES message_templates(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auto_response_rules_user ON auto_response_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_response_rules_active ON auto_response_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_auto_response_rules_trigger_type ON auto_response_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_auto_response_rules_priority ON auto_response_rules(priority DESC);

COMMENT ON TABLE auto_response_rules IS 'Rules for automated responses based on triggers';
COMMENT ON COLUMN auto_response_rules.trigger_conditions IS 'JSON conditions, e.g., {"keywords": ["shipping", "delivery"], "order_status": "pending"}';

-- ============================================================================
-- PART 10: Insert Default Templates
-- ============================================================================

-- Insert some common seller message templates
-- Note: These will be added to a system user, sellers can copy or create their own

-- First, ensure we have a system user for default templates
INSERT INTO users (id, address, handle, profile_cid)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '0x0000000000000000000000000000000000000000',
  'system',
  null
)
ON CONFLICT (address) DO NOTHING;

-- Insert default templates (commented out due to schema variations)
-- Uncomment and adjust column names if your message_templates table has is_public column
/*
INSERT INTO message_templates (user_id, name, content, category, is_public, tags)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Shipping Information',
    'Thank you for your order! Your item will ship within 2-3 business days. You''ll receive a tracking number via message once it ships.',
    'shipping',
    true,
    ARRAY['shipping', 'fulfillment', 'delivery']
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Return Policy',
    'We accept returns within 30 days of delivery. Items must be unused and in original packaging. Please message me to initiate a return.',
    'returns',
    true,
    ARRAY['returns', 'refund', 'policy']
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Custom Order Request',
    'I''d be happy to create a custom version of this item! Please share your specific requirements and I''ll provide a quote.',
    'customization',
    true,
    ARRAY['custom', 'personalization', 'modification']
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'In Stock Confirmation',
    'Yes, this item is currently in stock and ready to ship! Feel free to place your order.',
    'availability',
    true,
    ARRAY['stock', 'availability', 'inventory']
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Order Received',
    'Thank you for your purchase! I''ve received your order and will begin processing it shortly. I''ll keep you updated on the progress.',
    'order_confirmation',
    true,
    ARRAY['order', 'confirmation', 'received']
  )
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- PART 11: Create Views for Common Queries
-- ============================================================================

-- View: Active buyer-seller conversations
CREATE OR REPLACE VIEW active_marketplace_conversations AS
SELECT
  c.id,
  c.title,
  c.conversation_type,
  c.order_id,
  c.product_id,
  c.status,
  c.last_activity,
  c.unread_count,
  c.context_metadata,
  cp_seller.user_id as seller_id,
  cp_buyer.user_id as buyer_id,
  u_seller.handle as seller_handle,
  u_buyer.handle as buyer_handle,
  ca.seller_avg_response_time,
  ca.converted_to_sale,
  ca.message_count
FROM conversations c
LEFT JOIN conversation_participants cp_seller ON c.id = cp_seller.conversation_id AND cp_seller.role = 'seller'
LEFT JOIN conversation_participants cp_buyer ON c.id = cp_buyer.conversation_id AND cp_buyer.role = 'buyer'
LEFT JOIN users u_seller ON cp_seller.user_id = u_seller.id
LEFT JOIN users u_buyer ON cp_buyer.user_id = u_buyer.id
LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
WHERE c.conversation_type IN ('order_inquiry', 'order_support', 'product_question', 'dispute')
  AND c.status = 'active';

COMMENT ON VIEW active_marketplace_conversations IS 'Active buyer-seller conversations with participant info and analytics';

-- View: Seller messaging performance
CREATE OR REPLACE VIEW seller_messaging_performance AS
SELECT
  u.id as seller_id,
  u.handle as seller_handle,
  COUNT(DISTINCT ca.conversation_id) as total_conversations,
  COUNT(DISTINCT ca.conversation_id) FILTER (WHERE ca.converted_to_sale = true) as converted_conversations,
  ROUND(
    COUNT(DISTINCT ca.conversation_id) FILTER (WHERE ca.converted_to_sale = true)::numeric /
    NULLIF(COUNT(DISTINCT ca.conversation_id), 0) * 100,
    2
  ) as conversion_rate_percent,
  AVG(ca.seller_avg_response_time) as avg_response_time,
  AVG(ca.seller_first_response_time) as avg_first_response_time,
  SUM(ca.message_count) as total_messages_sent,
  SUM(ca.template_usage_count) as template_usage_count
FROM users u
LEFT JOIN conversation_analytics ca ON u.id = ca.seller_id
WHERE ca.started_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.handle;

COMMENT ON VIEW seller_messaging_performance IS 'Seller messaging metrics for the last 30 days';

-- ============================================================================
-- PART 12: Triggers for Automatic Updates
-- ============================================================================

-- Function to update conversation's last_activity on new message
CREATE OR REPLACE FUNCTION update_conversation_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_activity = NEW.timestamp,
    last_message_id = NEW.id,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_conversation_last_activity ON chat_messages;
CREATE TRIGGER trigger_update_conversation_last_activity
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_activity();

-- Function to increment unread count for participants
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all participants except the sender
  UPDATE conversation_participants
  SET updated_at = NOW()
  WHERE conversation_id = NEW.conversation_id
    AND user_id != (SELECT id FROM users WHERE address = NEW.sender_address LIMIT 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_increment_unread_count ON chat_messages;
CREATE TRIGGER trigger_increment_unread_count
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- Function to update template usage count
CREATE OR REPLACE FUNCTION update_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE message_templates
    SET
      usage_count = usage_count + 1,
      last_used_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.template_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_template_usage ON chat_messages;
CREATE TRIGGER trigger_update_template_usage
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage();

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 0047_marketplace_messaging.sql completed successfully';
  RAISE NOTICE 'Created tables: conversation_participants, message_templates, quick_replies, conversation_analytics, message_attachments, auto_response_rules';
  RAISE NOTICE 'Enhanced tables: conversations, chat_messages, disputes, tracking_records';
  RAISE NOTICE 'Created views: active_marketplace_conversations, seller_messaging_performance';
  RAISE NOTICE 'Created triggers: update_conversation_last_activity, increment_unread_count, update_template_usage';
END $$;
