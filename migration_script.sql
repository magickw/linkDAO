-- ============================================================================
-- LinkDAO Database Migration Script
-- Generated: 2025-12-17
-- Description: Manual migration for recent schema.ts changes
-- ============================================================================

-- IMPORTANT: Review each section before executing
-- Backup your database before running this script
-- Test in a staging environment first

BEGIN;

-- ============================================================================
-- 1. POSTS TABLE - Add status column
-- ============================================================================
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS status VARCHAR(24) DEFAULT 'active';

COMMENT ON COLUMN posts.status IS 'Alias for moderationStatus for consistency';

-- ============================================================================
-- 2. PRODUCTS TABLE - Add salesCount column
-- ============================================================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;

COMMENT ON COLUMN products.sales_count IS 'Track number of sales for analytics';

-- ============================================================================
-- 3. DISPUTES TABLE - Add updatedAt column
-- ============================================================================
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

COMMENT ON COLUMN disputes.updated_at IS 'Track when dispute was last updated';

-- ============================================================================
-- 4. ORDERS TABLE - Add metadata column (JSONB)
-- ============================================================================
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS metadata JSONB;

COMMENT ON COLUMN orders.metadata IS 'Additional metadata as JSONB for flexible data storage';

-- ============================================================================
-- 5. ORDER EVENTS TABLE - Change orderId type to UUID
-- ============================================================================
-- Drop existing foreign key constraint
ALTER TABLE order_events 
DROP CONSTRAINT IF EXISTS order_events_order_id_orders_id_fk;

-- Change column type
ALTER TABLE order_events 
ALTER COLUMN order_id TYPE UUID USING order_id::text::uuid;

-- Recreate foreign key
ALTER TABLE order_events 
ADD CONSTRAINT order_events_order_id_orders_id_fk 
FOREIGN KEY (order_id) REFERENCES orders(id);

-- ============================================================================
-- 6. TRACKING RECORDS TABLE - Change orderId type to UUID
-- ============================================================================
-- Drop existing foreign key constraint
ALTER TABLE tracking_records 
DROP CONSTRAINT IF EXISTS tracking_records_order_id_orders_id_fk;

-- Change column type
ALTER TABLE tracking_records 
ALTER COLUMN order_id TYPE UUID USING order_id::text::uuid;

-- Recreate foreign key
ALTER TABLE tracking_records 
ADD CONSTRAINT tracking_records_order_id_orders_id_fk 
FOREIGN KEY (order_id) REFERENCES orders(id);

-- ============================================================================
-- 7. COMMUNITY MEMBERS TABLE - Add ban-related columns
-- ============================================================================
ALTER TABLE community_members 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ban_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS ban_reason TEXT;

COMMENT ON COLUMN community_members.updated_at IS 'Track when membership was last updated';
COMMENT ON COLUMN community_members.banned_at IS 'When the user was banned from the community';
COMMENT ON COLUMN community_members.ban_expiry IS 'When the ban expires (NULL for permanent bans)';
COMMENT ON COLUMN community_members.ban_reason IS 'Reason for the ban';

-- ============================================================================
-- 8. NFTS TABLE - Add verification and media hash columns
-- ============================================================================
ALTER TABLE nfts 
ADD COLUMN IF NOT EXISTS image_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS animation_url TEXT,
ADD COLUMN IF NOT EXISTS animation_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

COMMENT ON COLUMN nfts.image_hash IS 'IPFS hash for image integrity verification';
COMMENT ON COLUMN nfts.animation_url IS 'URL for animated NFT content';
COMMENT ON COLUMN nfts.animation_hash IS 'IPFS hash for animation integrity verification';
COMMENT ON COLUMN nfts.is_verified IS 'Whether the NFT has been verified';
COMMENT ON COLUMN nfts.verified_at IS 'When the NFT was verified';

-- ============================================================================
-- 9. REVIEWS TABLE - Change orderId type to UUID
-- ============================================================================
-- Drop existing foreign key constraint
ALTER TABLE reviews 
DROP CONSTRAINT IF EXISTS reviews_order_id_orders_id_fk;

-- Change column type
ALTER TABLE reviews 
ALTER COLUMN order_id TYPE UUID USING order_id::text::uuid;

-- Recreate foreign key
ALTER TABLE reviews 
ADD CONSTRAINT reviews_order_id_orders_id_fk 
FOREIGN KEY (order_id) REFERENCES orders(id);

-- ============================================================================
-- 10. CONTENT REPORTS TABLE - Add moderation columns
-- ============================================================================
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS resolution TEXT,
ADD COLUMN IF NOT EXISTS moderator_notes TEXT,
ADD COLUMN IF NOT EXISTS consensus_score NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

COMMENT ON COLUMN content_reports.resolution IS 'Resolution details for closed reports';
COMMENT ON COLUMN content_reports.moderator_notes IS 'Internal notes from moderators';
COMMENT ON COLUMN content_reports.consensus_score IS 'Agreement score among moderators (0-100)';
COMMENT ON COLUMN content_reports.updated_at IS 'Track when report was last updated';

-- ============================================================================
-- 11. PAYMENT TRANSACTIONS TABLE - Change orderId type to UUID
-- ============================================================================
-- Drop existing foreign key constraint
ALTER TABLE payment_transactions 
DROP CONSTRAINT IF EXISTS payment_transactions_order_id_orders_id_fk;

-- Change column type
ALTER TABLE payment_transactions 
ALTER COLUMN order_id TYPE UUID USING order_id::text::uuid;

-- Recreate foreign key
ALTER TABLE payment_transactions 
ADD CONSTRAINT payment_transactions_order_id_orders_id_fk 
FOREIGN KEY (order_id) REFERENCES orders(id);

-- ============================================================================
-- 12. PAYMENT RECEIPTS TABLE - Change orderId type to UUID
-- ============================================================================
-- Drop existing foreign key constraint
ALTER TABLE payment_receipts 
DROP CONSTRAINT IF EXISTS payment_receipts_order_id_orders_id_fk;

-- Change column type
ALTER TABLE payment_receipts 
ALTER COLUMN order_id TYPE UUID USING order_id::text::uuid;

-- Recreate foreign key
ALTER TABLE payment_receipts 
ADD CONSTRAINT payment_receipts_order_id_orders_id_fk 
FOREIGN KEY (order_id) REFERENCES orders(id);

-- ============================================================================
-- 13. ORDER PAYMENT EVENTS TABLE - Change orderId type to UUID
-- ============================================================================
-- Drop existing foreign key constraint
ALTER TABLE order_payment_events 
DROP CONSTRAINT IF EXISTS order_payment_events_order_id_orders_id_fk;

-- Change column type
ALTER TABLE order_payment_events 
ALTER COLUMN order_id TYPE UUID USING order_id::text::uuid;

-- Recreate foreign key
ALTER TABLE order_payment_events 
ADD CONSTRAINT order_payment_events_order_id_orders_id_fk 
FOREIGN KEY (order_id) REFERENCES orders(id);

-- ============================================================================
-- 14. STAKING POSITIONS TABLE - Add reward tracking columns
-- ============================================================================
ALTER TABLE staking_positions 
ADD COLUMN IF NOT EXISTS accumulated_rewards NUMERIC(20, 8) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reward_claim TIMESTAMP;

COMMENT ON COLUMN staking_positions.accumulated_rewards IS 'Total accumulated rewards over time';
COMMENT ON COLUMN staking_positions.last_reward_claim IS 'Last time rewards were claimed';

-- ============================================================================
-- 15. REFERRAL CONFIG TABLE - Create new table
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) DEFAULT 'string' NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_config_config_key ON referral_config(config_key);

COMMENT ON TABLE referral_config IS 'Configuration settings for referral program';
COMMENT ON COLUMN referral_config.config_type IS 'Type of config: string, number, boolean, json';

-- ============================================================================
-- 16. BRIDGE TRANSACTIONS TABLE - Add validator count
-- ============================================================================
ALTER TABLE bridge_transactions 
ADD COLUMN IF NOT EXISTS validator_count INTEGER DEFAULT 0;

COMMENT ON COLUMN bridge_transactions.validator_count IS 'Number of validators for this bridge transaction';

-- ============================================================================
-- 17. RETURNS TABLE - Add enhanced tracking columns
-- ============================================================================
ALTER TABLE returns 
ADD COLUMN IF NOT EXISTS reason VARCHAR(255),
ADD COLUMN IF NOT EXISTS refund_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS inspected_by UUID,
ADD COLUMN IF NOT EXISTS item_condition VARCHAR(20),
ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
ADD COLUMN IF NOT EXISTS inspection_photos TEXT,
ADD COLUMN IF NOT EXISTS inspection_passed BOOLEAN;

COMMENT ON COLUMN returns.reason IS 'Alias for return_reason for analytics compatibility';
COMMENT ON COLUMN returns.refund_method IS 'Method used for refund (original_payment, store_credit, etc.)';
COMMENT ON COLUMN returns.inspected_by IS 'User ID of inspector';
COMMENT ON COLUMN returns.item_condition IS 'Condition: as_new, good, acceptable, damaged, unusable';
COMMENT ON COLUMN returns.inspection_notes IS 'Detailed inspection notes';
COMMENT ON COLUMN returns.inspection_photos IS 'JSON array of photo URLs';
COMMENT ON COLUMN returns.inspection_passed IS 'Whether item passed inspection';

-- ============================================================================
-- 18. REFUND TRANSACTIONS TABLE - Add tracking columns
-- ============================================================================
ALTER TABLE refund_transactions 
ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS response_payload JSONB;

COMMENT ON COLUMN refund_transactions.initiated_at IS 'When refund was initiated';
COMMENT ON COLUMN refund_transactions.response_payload IS 'Raw API response from payment provider';

-- ============================================================================
-- 19. REFUND PROVIDER TRANSACTIONS TABLE - Add tracking fields
-- ============================================================================
ALTER TABLE refund_provider_transactions 
ADD COLUMN IF NOT EXISTS provider_refund_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS response_payload JSONB,
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;

COMMENT ON COLUMN refund_provider_transactions.provider_refund_id IS 'Provider-specific refund ID';
COMMENT ON COLUMN refund_provider_transactions.response_payload IS 'Raw API response payload';
COMMENT ON COLUMN refund_provider_transactions.processing_time_ms IS 'Processing time in milliseconds';

-- ============================================================================
-- 20. SUPPORT TABLES - Create new support system tables
-- ============================================================================

-- Support Chat Sessions
CREATE TABLE IF NOT EXISTS support_chat_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  initial_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_sessions_status ON support_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_chat_sessions_created_at ON support_chat_sessions(created_at);

COMMENT ON TABLE support_chat_sessions IS 'Live chat sessions between users and support agents';
COMMENT ON COLUMN support_chat_sessions.status IS 'Status: waiting, active, closed';

-- Support Chat Messages
CREATE TABLE IF NOT EXISTS support_chat_messages (
  id VARCHAR(36) PRIMARY KEY,
  chat_session_id VARCHAR(36) NOT NULL REFERENCES support_chat_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_agent BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_chat_messages_timestamp ON support_chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_support_chat_messages_read ON support_chat_messages(read);

COMMENT ON TABLE support_chat_messages IS 'Messages in support chat sessions';

-- Support FAQ
CREATE TABLE IF NOT EXISTS support_faq (
  id VARCHAR(36) PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_faq_category ON support_faq(category);
CREATE INDEX IF NOT EXISTS idx_support_faq_priority ON support_faq(priority);
CREATE INDEX IF NOT EXISTS idx_support_faq_is_active ON support_faq(is_active);

COMMENT ON TABLE support_faq IS 'Frequently asked questions for self-service support';

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(36) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);

COMMENT ON TABLE support_tickets IS 'Support tickets for issue tracking';
COMMENT ON COLUMN support_tickets.status IS 'Status: open, in_progress, resolved, closed';
COMMENT ON COLUMN support_tickets.priority IS 'Priority: low, medium, high, urgent';

-- ============================================================================
-- DATA MIGRATION - Populate new columns with sensible defaults
-- ============================================================================

-- Update posts.status from moderationStatus
UPDATE posts 
SET status = moderation_status 
WHERE status IS NULL AND moderation_status IS NOT NULL;

-- Update returns.reason from returnReason
UPDATE returns 
SET reason = return_reason 
WHERE reason IS NULL AND return_reason IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns exist
SELECT 
  'posts.status' as column_check,
  COUNT(*) as records_with_value
FROM posts 
WHERE status IS NOT NULL
UNION ALL
SELECT 
  'products.sales_count',
  COUNT(*)
FROM products 
WHERE sales_count IS NOT NULL
UNION ALL
SELECT 
  'community_members.updated_at',
  COUNT(*)
FROM community_members 
WHERE updated_at IS NOT NULL
UNION ALL
SELECT 
  'nfts.is_verified',
  COUNT(*)
FROM nfts 
WHERE is_verified IS NOT NULL;

-- Verify new tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN (
  'referral_config',
  'support_chat_sessions',
  'support_chat_messages',
  'support_faq',
  'support_tickets'
)
AND table_schema = 'public';

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Keep for reference, run separately if needed)
-- ============================================================================
/*
BEGIN;

-- Rollback in reverse order
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS support_faq CASCADE;
DROP TABLE IF EXISTS support_chat_messages CASCADE;
DROP TABLE IF EXISTS support_chat_sessions CASCADE;
DROP TABLE IF EXISTS referral_config CASCADE;

ALTER TABLE refund_provider_transactions DROP COLUMN IF EXISTS processing_time_ms;
ALTER TABLE refund_provider_transactions DROP COLUMN IF EXISTS response_payload;
ALTER TABLE refund_provider_transactions DROP COLUMN IF EXISTS provider_refund_id;

ALTER TABLE refund_transactions DROP COLUMN IF EXISTS response_payload;
ALTER TABLE refund_transactions DROP COLUMN IF EXISTS initiated_at;

ALTER TABLE returns DROP COLUMN IF EXISTS inspection_passed;
ALTER TABLE returns DROP COLUMN IF EXISTS inspection_photos;
ALTER TABLE returns DROP COLUMN IF EXISTS inspection_notes;
ALTER TABLE returns DROP COLUMN IF EXISTS item_condition;
ALTER TABLE returns DROP COLUMN IF EXISTS inspected_by;
ALTER TABLE returns DROP COLUMN IF EXISTS refund_method;
ALTER TABLE returns DROP COLUMN IF EXISTS reason;

ALTER TABLE bridge_transactions DROP COLUMN IF EXISTS validator_count;
ALTER TABLE staking_positions DROP COLUMN IF EXISTS last_reward_claim;
ALTER TABLE staking_positions DROP COLUMN IF EXISTS accumulated_rewards;
ALTER TABLE content_reports DROP COLUMN IF EXISTS updated_at;
ALTER TABLE content_reports DROP COLUMN IF EXISTS consensus_score;
ALTER TABLE content_reports DROP COLUMN IF EXISTS moderator_notes;
ALTER TABLE content_reports DROP COLUMN IF EXISTS resolution;
ALTER TABLE nfts DROP COLUMN IF EXISTS verified_at;
ALTER TABLE nfts DROP COLUMN IF EXISTS is_verified;
ALTER TABLE nfts DROP COLUMN IF EXISTS animation_hash;
ALTER TABLE nfts DROP COLUMN IF EXISTS animation_url;
ALTER TABLE nfts DROP COLUMN IF EXISTS image_hash;
ALTER TABLE community_members DROP COLUMN IF EXISTS ban_reason;
ALTER TABLE community_members DROP COLUMN IF EXISTS ban_expiry;
ALTER TABLE community_members DROP COLUMN IF EXISTS banned_at;
ALTER TABLE community_members DROP COLUMN IF EXISTS updated_at;
ALTER TABLE orders DROP COLUMN IF EXISTS metadata;
ALTER TABLE disputes DROP COLUMN IF EXISTS updated_at;
ALTER TABLE products DROP COLUMN IF EXISTS sales_count;
ALTER TABLE posts DROP COLUMN IF EXISTS status;

COMMIT;
*/
