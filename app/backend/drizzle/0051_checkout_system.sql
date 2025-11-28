-- Checkout Sessions Table
-- Stores temporary checkout session data with 30-minute expiry
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_address VARCHAR(255),
  items JSONB NOT NULL,
  totals JSONB NOT NULL,
  payment_method VARCHAR(50),
  recommendation JSONB,
  prioritization_result JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session_id ON checkout_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_expires_at ON checkout_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user_address ON checkout_sessions(user_address);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_created_at ON checkout_sessions(created_at);

-- Discount Codes Table
-- Stores promotional discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10, 2) NOT NULL,
  description TEXT,
  min_purchase DECIMAL(10, 2),
  max_discount DECIMAL(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

-- Indexes for discount codes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_discount_codes_valid_until ON discount_codes(valid_until);

-- Saved Shipping Addresses Table
-- Stores user's saved shipping addresses
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) NOT NULL,
  phone VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for shipping addresses
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user ON shipping_addresses(user_address);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_default ON shipping_addresses(user_address, is_default);

-- Discount Code Usage Tracking
-- Tracks which users have used which discount codes
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  user_address VARCHAR(255) NOT NULL,
  order_id VARCHAR(255),
  discount_amount DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(discount_code_id, user_address)
);

-- Indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_discount_usage_code ON discount_code_usage(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_user ON discount_code_usage(user_address);
CREATE INDEX IF NOT EXISTS idx_discount_usage_order ON discount_code_usage(order_id);

-- Insert sample discount codes for testing
INSERT INTO discount_codes (code, type, value, description, valid_until, is_active)
VALUES 
  ('WELCOME10', 'percentage', 10, '10% off your first order', NOW() + INTERVAL '1 year', true),
  ('SAVE20', 'percentage', 20, '20% off', NOW() + INTERVAL '6 months', true),
  ('FLAT50', 'fixed', 50, '$50 off orders over $200', NOW() + INTERVAL '3 months', true)
ON CONFLICT (code) DO NOTHING;

-- Function to automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM checkout_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired sessions
-- This requires pg_cron extension
-- SELECT cron.schedule('cleanup-sessions', '*/30 * * * *', 'SELECT cleanup_expired_sessions()');

COMMENT ON TABLE checkout_sessions IS 'Temporary checkout session data with 30-minute expiry';
COMMENT ON TABLE discount_codes IS 'Promotional discount codes for marketplace';
COMMENT ON TABLE shipping_addresses IS 'User saved shipping addresses';
COMMENT ON TABLE discount_code_usage IS 'Tracks discount code usage per user';
