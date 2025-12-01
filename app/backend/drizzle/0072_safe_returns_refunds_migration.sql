-- Safe Migration Script for Return and Refund System
-- This script uses CREATE TABLE IF NOT EXISTS to safely apply the migration
-- Run this script manually if automated migrations fail

-- ============================================================================
-- RETURN AND REFUND SYSTEM TABLES
-- ============================================================================

-- 1. Return Policies Table
CREATE TABLE IF NOT EXISTS return_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  accepts_returns BOOLEAN DEFAULT true,
  return_window_days INTEGER DEFAULT 30,
  auto_approve_low_risk BOOLEAN DEFAULT false,
  requires_original_packaging BOOLEAN DEFAULT true,
  restocking_fee_percentage DECIMAL(5, 2) DEFAULT 0,
  return_shipping_paid_by VARCHAR(10) DEFAULT 'buyer',
  accepted_reasons TEXT[] DEFAULT ARRAY['defective', 'not_as_described', 'changed_mind', 'damaged_in_shipping'],
  excluded_categories TEXT[],
  minimum_order_value DECIMAL(10, 2),
  maximum_returns_per_customer INTEGER DEFAULT 10,
  policy_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Returns Table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  return_reason VARCHAR(50) NOT NULL,
  return_reason_details TEXT,
  items_to_return JSONB NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  refund_amount DECIMAL(10, 2),
  restocking_fee DECIMAL(10, 2) DEFAULT 0,
  return_shipping_cost DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'requested',
  refund_status VARCHAR(20) DEFAULT 'pending',
  risk_score INTEGER DEFAULT 0,
  risk_level VARCHAR(10) DEFAULT 'low',
  risk_factors TEXT[],
  requires_manual_review BOOLEAN DEFAULT false,
  return_label_url TEXT,
  return_tracking_number VARCHAR(100),
  return_carrier VARCHAR(50),
  refund_transaction_id VARCHAR(100),
  approved_at TIMESTAMP,
  approved_by UUID,
  rejected_at TIMESTAMP,
  rejected_by UUID,
  rejection_reason TEXT,
  shipped_at TIMESTAMP,
  received_at TIMESTAMP,
  inspected_at TIMESTAMP,
  refunded_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Return Status History Table
CREATE TABLE IF NOT EXISTS return_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL,
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  notes TEXT,
  changed_by UUID,
  changed_by_role VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Return Messages Table
CREATE TABLE IF NOT EXISTS return_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB,
  is_internal BOOLEAN DEFAULT false,
  read_by_buyer BOOLEAN DEFAULT false,
  read_by_seller BOOLEAN DEFAULT false,
  read_by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Refund Transactions Table
CREATE TABLE IF NOT EXISTS refund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL,
  order_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  refund_type VARCHAR(20) DEFAULT 'full',
  provider VARCHAR(50) NOT NULL,
  provider_refund_id VARCHAR(100),
  provider_fee DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  failure_reason TEXT,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Return Analytics Table
CREATE TABLE IF NOT EXISTS return_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID,
  buyer_id UUID,
  date DATE DEFAULT CURRENT_DATE,
  total_returns INTEGER DEFAULT 0,
  approved_returns INTEGER DEFAULT 0,
  rejected_returns INTEGER DEFAULT 0,
  completed_returns INTEGER DEFAULT 0,
  total_refund_amount DECIMAL(12, 2) DEFAULT 0,
  average_processing_time_hours DECIMAL(8, 2),
  return_rate_percentage DECIMAL(5, 2),
  top_return_reasons JSONB,
  risk_distribution JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS (only if they don't exist)
-- ============================================================================

DO $$
BEGIN
  -- return_status_history foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'return_status_history_return_id_fkey'
  ) THEN
    ALTER TABLE return_status_history
    ADD CONSTRAINT return_status_history_return_id_fkey
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;
  END IF;

  -- return_messages foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'return_messages_return_id_fkey'
  ) THEN
    ALTER TABLE return_messages
    ADD CONSTRAINT return_messages_return_id_fkey
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;
  END IF;

  -- refund_transactions foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'refund_transactions_return_id_fkey'
  ) THEN
    ALTER TABLE refund_transactions
    ADD CONSTRAINT refund_transactions_return_id_fkey
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES (only if they don't exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_buyer_id ON returns(buyer_id);
CREATE INDEX IF NOT EXISTS idx_returns_seller_id ON returns(seller_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_refund_status ON returns(refund_status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_risk_level ON returns(risk_level);

CREATE INDEX IF NOT EXISTS idx_return_status_history_return_id ON return_status_history(return_id);
CREATE INDEX IF NOT EXISTS idx_return_status_history_created_at ON return_status_history(created_at);

CREATE INDEX IF NOT EXISTS idx_return_messages_return_id ON return_messages(return_id);
CREATE INDEX IF NOT EXISTS idx_return_messages_sender_id ON return_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_return_messages_created_at ON return_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_refund_transactions_return_id ON refund_transactions(return_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_order_id ON refund_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_status ON refund_transactions(status);
CREATE INDEX IF NOT EXISTS idx_refund_transactions_provider ON refund_transactions(provider);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that all tables were created
SELECT 
  'Tables Created' as check_type,
  COUNT(*) as count,
  ARRAY_AGG(table_name ORDER BY table_name) as tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'returns',
  'return_policies', 
  'return_status_history',
  'return_messages',
  'refund_transactions',
  'return_analytics'
);

-- Check indexes
SELECT 
  'Indexes Created' as check_type,
  COUNT(*) as count
FROM pg_indexes 
WHERE tablename IN ('returns', 'return_policies', 'refund_transactions', 'return_status_history', 'return_messages');

-- Check foreign keys
SELECT 
  'Foreign Keys Created' as check_type,
  COUNT(*) as count
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY'
AND table_name IN ('return_status_history', 'return_messages', 'refund_transactions');

SELECT '✅ Migration completed successfully!' as status;
