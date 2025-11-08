-- Returns and Refunds System
-- Comprehensive return request and refund processing system

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id),
  seller_id UUID NOT NULL REFERENCES users(id),
  
  -- Return details
  return_reason VARCHAR(50) NOT NULL CHECK (return_reason IN (
    'defective', 'wrong_item', 'not_as_described', 'damaged_shipping',
    'changed_mind', 'better_price', 'no_longer_needed', 'other'
  )),
  return_reason_details TEXT,
  items_to_return JSONB NOT NULL, -- Array of {itemId, quantity, reason, photos}
  
  -- Status tracking
  status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'approved', 'rejected', 'label_generated', 'in_transit', 
    'received', 'inspected', 'refund_processing', 'completed', 'cancelled'
  )),
  
  -- Return shipping
  return_shipping_method VARCHAR(50),
  return_tracking_number VARCHAR(100),
  return_label_url TEXT,
  return_carrier VARCHAR(50),
  return_shipped_at TIMESTAMP,
  return_received_at TIMESTAMP,
  estimated_delivery_date TIMESTAMP,
  
  -- Inspection
  inspection_notes TEXT,
  inspection_photos JSONB, -- Array of photo URLs
  item_condition VARCHAR(30) CHECK (item_condition IN (
    'as_new', 'good', 'acceptable', 'damaged', 'unusable'
  )),
  inspection_passed BOOLEAN,
  inspected_at TIMESTAMP,
  inspected_by UUID REFERENCES users(id),
  
  -- Refund details
  original_amount DECIMAL(20, 8) NOT NULL,
  refund_amount DECIMAL(20, 8),
  restocking_fee DECIMAL(20, 8) DEFAULT 0,
  return_shipping_cost DECIMAL(20, 8) DEFAULT 0,
  refund_method VARCHAR(30) CHECK (refund_method IN (
    'original_payment', 'store_credit', 'exchange'
  )),
  refund_status VARCHAR(30) DEFAULT 'pending' CHECK (refund_status IN (
    'pending', 'approved', 'processing', 'completed', 'failed', 'cancelled'
  )),
  refunded_at TIMESTAMP,
  refund_transaction_id VARCHAR(100),
  refund_provider VARCHAR(30), -- 'stripe', 'paypal', 'blockchain'
  
  -- Approval/Rejection
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  
  -- Risk assessment
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors JSONB, -- Array of risk indicators
  requires_manual_review BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_refund_amount CHECK (refund_amount <= original_amount),
  CONSTRAINT valid_fees CHECK (restocking_fee >= 0 AND return_shipping_cost >= 0)
);

-- Create return policies table
CREATE TABLE IF NOT EXISTS return_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Policy settings
  accepts_returns BOOLEAN DEFAULT true,
  return_window_days INTEGER NOT NULL DEFAULT 30 CHECK (return_window_days > 0),
  extended_return_window_days INTEGER, -- For premium customers
  
  -- Fees
  restocking_fee_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (restocking_fee_percentage >= 0 AND restocking_fee_percentage <= 100),
  restocking_fee_applies_to JSONB, -- Array of conditions when fee applies
  
  -- Conditions
  requires_original_packaging BOOLEAN DEFAULT true,
  requires_unused_condition BOOLEAN DEFAULT true,
  requires_tags_attached BOOLEAN DEFAULT false,
  buyer_pays_return_shipping BOOLEAN DEFAULT true,
  free_return_shipping_threshold DECIMAL(20, 8), -- Free returns over this amount
  
  -- Exclusions
  non_returnable_categories JSONB, -- Array of category IDs
  non_returnable_items JSONB, -- Array of specific item IDs
  final_sale_items JSONB, -- Array of item IDs that are final sale
  
  -- Refund options
  offers_store_credit BOOLEAN DEFAULT false,
  store_credit_bonus_percentage DECIMAL(5, 2) DEFAULT 0, -- Extra % if choosing store credit
  offers_exchanges BOOLEAN DEFAULT true,
  
  -- Policy text
  policy_title VARCHAR(200) DEFAULT 'Return Policy',
  policy_text TEXT NOT NULL,
  policy_highlights JSONB, -- Array of key points
  
  -- Automation settings
  auto_approve_low_risk BOOLEAN DEFAULT false,
  auto_approve_threshold_amount DECIMAL(20, 8), -- Auto-approve returns under this amount
  require_photos BOOLEAN DEFAULT true,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(seller_id)
);

-- Create return status history
CREATE TABLE IF NOT EXISTS return_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  notes TEXT,
  metadata JSONB, -- Additional context
  
  changed_by UUID REFERENCES users(id),
  changed_by_role VARCHAR(20), -- 'buyer', 'seller', 'admin', 'system'
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create return messages table (for buyer-seller communication)
CREATE TABLE IF NOT EXISTS return_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('buyer', 'seller', 'admin')),
  
  message TEXT NOT NULL,
  attachments JSONB, -- Array of file URLs
  is_internal BOOLEAN DEFAULT false, -- Internal notes not visible to buyer
  
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create refund transactions table
CREATE TABLE IF NOT EXISTS refund_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  
  -- Transaction details
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  refund_type VARCHAR(30) NOT NULL CHECK (refund_type IN (
    'full', 'partial', 'restocking_fee_deducted', 'shipping_deducted'
  )),
  
  -- Provider details
  provider VARCHAR(30) NOT NULL, -- 'stripe', 'paypal', 'blockchain'
  provider_transaction_id VARCHAR(100),
  provider_refund_id VARCHAR(100),
  original_transaction_id VARCHAR(100),
  
  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),
  
  -- Timing
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Error handling
  error_code VARCHAR(50),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create return analytics table
CREATE TABLE IF NOT EXISTS return_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Metrics
  total_returns INTEGER DEFAULT 0,
  approved_returns INTEGER DEFAULT 0,
  rejected_returns INTEGER DEFAULT 0,
  completed_returns INTEGER DEFAULT 0,
  
  total_refund_amount DECIMAL(20, 8) DEFAULT 0,
  avg_refund_amount DECIMAL(20, 8) DEFAULT 0,
  
  -- Return reasons breakdown
  defective_count INTEGER DEFAULT 0,
  wrong_item_count INTEGER DEFAULT 0,
  not_as_described_count INTEGER DEFAULT 0,
  damaged_shipping_count INTEGER DEFAULT 0,
  changed_mind_count INTEGER DEFAULT 0,
  
  -- Timing metrics
  avg_approval_time_hours DECIMAL(10, 2),
  avg_refund_time_hours DECIMAL(10, 2),
  avg_total_resolution_time_hours DECIMAL(10, 2),
  
  -- Quality metrics
  return_rate_percentage DECIMAL(5, 2), -- Returns / Total orders
  refund_rate_percentage DECIMAL(5, 2), -- Refunds / Total revenue
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(seller_id, period_start, period_end)
);

-- Indexes for performance
CREATE INDEX idx_returns_order_id ON returns(order_id);
CREATE INDEX idx_returns_buyer_id ON returns(buyer_id);
CREATE INDEX idx_returns_seller_id ON returns(seller_id);
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_refund_status ON returns(refund_status);
CREATE INDEX idx_returns_created_at ON returns(created_at);
CREATE INDEX idx_returns_risk_level ON returns(risk_level);
CREATE INDEX idx_returns_requires_review ON returns(requires_manual_review) WHERE requires_manual_review = true;

CREATE INDEX idx_return_policies_seller_id ON return_policies(seller_id);
CREATE INDEX idx_return_policies_active ON return_policies(is_active) WHERE is_active = true;

CREATE INDEX idx_return_status_history_return_id ON return_status_history(return_id);
CREATE INDEX idx_return_status_history_created_at ON return_status_history(created_at);

CREATE INDEX idx_return_messages_return_id ON return_messages(return_id);
CREATE INDEX idx_return_messages_sender_id ON return_messages(sender_id);
CREATE INDEX idx_return_messages_created_at ON return_messages(created_at);

CREATE INDEX idx_refund_transactions_return_id ON refund_transactions(return_id);
CREATE INDEX idx_refund_transactions_order_id ON refund_transactions(order_id);
CREATE INDEX idx_refund_transactions_status ON refund_transactions(status);
CREATE INDEX idx_refund_transactions_provider ON refund_transactions(provider);

CREATE INDEX idx_return_analytics_seller_id ON return_analytics(seller_id);
CREATE INDEX idx_return_analytics_period ON return_analytics(period_start, period_end);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();

CREATE TRIGGER return_policies_updated_at
  BEFORE UPDATE ON return_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();

CREATE TRIGGER refund_transactions_updated_at
  BEFORE UPDATE ON refund_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();

-- Function to calculate return rate
CREATE OR REPLACE FUNCTION calculate_return_rate(seller_uuid UUID, days INTEGER DEFAULT 30)
RETURNS DECIMAL AS $$
DECLARE
  total_orders INTEGER;
  total_returns INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_orders
  FROM orders
  WHERE seller_id = seller_uuid
    AND created_at >= NOW() - (days || ' days')::INTERVAL;
  
  SELECT COUNT(*) INTO total_returns
  FROM returns
  WHERE seller_id = seller_uuid
    AND created_at >= NOW() - (days || ' days')::INTERVAL
    AND status IN ('completed', 'refund_processing');
  
  IF total_orders = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN (total_returns::DECIMAL / total_orders::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql;

-- Insert default return policy for existing sellers
INSERT INTO return_policies (seller_id, policy_text)
SELECT 
  id,
  'We accept returns within 30 days of delivery. Items must be unused and in original packaging. Buyer is responsible for return shipping costs unless the item is defective or not as described.'
FROM users
WHERE role = 'seller'
ON CONFLICT (seller_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE returns IS 'Tracks all return requests and their lifecycle';
COMMENT ON TABLE return_policies IS 'Seller-configurable return policies';
COMMENT ON TABLE return_status_history IS 'Audit trail of return status changes';
COMMENT ON TABLE return_messages IS 'Communication between buyer and seller regarding returns';
COMMENT ON TABLE refund_transactions IS 'Financial transactions for refunds';
COMMENT ON TABLE return_analytics IS 'Aggregated return metrics for sellers';

COMMENT ON COLUMN returns.risk_score IS 'Calculated risk score 0-100 for fraud detection';
COMMENT ON COLUMN returns.requires_manual_review IS 'Flags returns that need human review';
COMMENT ON COLUMN return_policies.auto_approve_low_risk IS 'Automatically approve low-risk returns';
COMMENT ON COLUMN refund_transactions.retry_count IS 'Number of retry attempts for failed refunds';
