-- Add fulfillment enhancement tables
-- Migration: 0108_add_fulfillment_enhancements

-- Fulfillment metrics cache for performance
CREATE TABLE IF NOT EXISTS fulfillment_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  avg_time_to_ship_hours DECIMAL(10,2),
  avg_delivery_time_hours DECIMAL(10,2),
  on_time_rate DECIMAL(5,2),
  fulfillment_rate DECIMAL(5,2),
  exception_rate DECIMAL(5,2),
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  disputed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(seller_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_metrics_seller ON fulfillment_metrics(seller_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_metrics_period ON fulfillment_metrics(period_start, period_end);

-- Shipping labels for carrier integration
CREATE TABLE IF NOT EXISTS shipping_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  easypost_shipment_id VARCHAR(255),
  easypost_tracker_id VARCHAR(255),
  tracking_number VARCHAR(255),
  carrier VARCHAR(100),
  service VARCHAR(100),
  label_url TEXT,
  tracking_url TEXT,
  postage_label_pdf_url TEXT,
  rate_amount DECIMAL(10,2),
  rate_currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'created',
  from_address JSONB,
  to_address JSONB,
  parcel_info JSONB,
  tracking_events JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  purchased_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  last_tracking_update TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipping_labels_order ON shipping_labels(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_tracking ON shipping_labels(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_status ON shipping_labels(status);

-- Order automation logs for audit trail
CREATE TABLE IF NOT EXISTS order_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  action_taken VARCHAR(255) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  triggered_by VARCHAR(100) DEFAULT 'system',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_order ON order_automation_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created ON order_automation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_rule ON order_automation_logs(rule_name);

-- Add indexes to orders table for fulfillment queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON orders(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;

COMMENT ON TABLE fulfillment_metrics IS 'Cached fulfillment performance metrics for sellers';
COMMENT ON TABLE shipping_labels IS 'Shipping labels purchased through carrier integrations (EasyPost)';
COMMENT ON TABLE order_automation_logs IS 'Audit log of automated order status changes and actions';
