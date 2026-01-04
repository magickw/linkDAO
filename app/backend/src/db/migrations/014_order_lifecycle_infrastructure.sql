-- Create order_receipts table
CREATE TABLE IF NOT EXISTS order_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  receipt_number varchar(64),
  buyer_info jsonb,
  items jsonb,
  pricing jsonb,
  payment_details jsonb,
  pdf_url text,
  email_sent_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Create order_cancellations table
CREATE TABLE IF NOT EXISTS order_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  buyer_id uuid REFERENCES users(id),
  seller_id uuid REFERENCES users(id),
  reason text,
  status varchar(32) DEFAULT 'pending', -- 'pending', 'approved', 'denied', 'auto_approved'
  requested_at timestamp DEFAULT now(),
  responded_at timestamp,
  response_reason text,
  refund_status varchar(32), -- 'pending', 'processing', 'completed', 'failed'
  refund_details jsonb
);

-- Create inventory_holds table
CREATE TABLE IF NOT EXISTS inventory_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  held_by uuid REFERENCES users(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  order_id varchar(255),
  hold_type varchar(50) DEFAULT 'order_pending',
  expires_at timestamp NOT NULL,
  status varchar(20) DEFAULT 'active',
  metadata text,
  release_reason varchar(50),
  released_at timestamp,
  checkout_session_id varchar(255),
  created_at timestamp DEFAULT now()
);

-- Create indexes for inventory_holds
CREATE INDEX IF NOT EXISTS idx_inventory_holds_product_id ON inventory_holds(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_held_by ON inventory_holds(held_by);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_order_id ON inventory_holds(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_expires_at ON inventory_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_status ON inventory_holds(status);
CREATE INDEX IF NOT EXISTS idx_inventory_holds_hold_type ON inventory_holds(hold_type);

-- Create delivery_estimates table
CREATE TABLE IF NOT EXISTS delivery_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  estimated_delivery_min timestamp,
  estimated_delivery_max timestamp,
  confidence varchar(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  factors jsonb,
  updated_at timestamp DEFAULT now()
);

-- Create seller_notification_queue table
CREATE TABLE IF NOT EXISTS seller_notification_queue (
  id serial PRIMARY KEY,
  seller_id uuid REFERENCES users(id),
  type varchar(64),
  priority varchar(20) DEFAULT 'normal', -- 'normal', 'high', 'urgent'
  title varchar(255),
  body text,
  data jsonb,
  channels text[], -- Array of channels e.g. ['push', 'email']
  status varchar(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  created_at timestamp DEFAULT now()
);

-- Create seller_notification_preferences table
CREATE TABLE IF NOT EXISTS seller_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  quiet_hours_start varchar(5), -- HH:mm
  quiet_hours_end varchar(5), -- HH:mm
  batching_enabled boolean DEFAULT true
);

-- Add columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamp,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS receipt_generated_at timestamp,
ADD COLUMN IF NOT EXISTS receipt_id uuid REFERENCES order_receipts(id),
ADD COLUMN IF NOT EXISTS estimated_delivery_min timestamp,
ADD COLUMN IF NOT EXISTS estimated_delivery_max timestamp;

-- Add columns to tracking_records table
ALTER TABLE tracking_records
ADD COLUMN IF NOT EXISTS delivery_estimate_updated_at timestamp,
ADD COLUMN IF NOT EXISTS exception_type varchar(64),
ADD COLUMN IF NOT EXISTS exception_details text;
