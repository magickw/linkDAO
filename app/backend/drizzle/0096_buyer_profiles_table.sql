-- Migration: Centralized Buyer Data System - Buyer Profiles
-- Number: 0096
-- Created: 2026-01-06
-- Description: Creates buyer_profiles table for centralized buyer data and preferences

CREATE TABLE IF NOT EXISTS buyer_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Quick Stats
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(20, 2) DEFAULT 0,
  average_order_value NUMERIC(20, 2) DEFAULT 0,
  
  -- Saved Items Count
  saved_addresses_count INTEGER DEFAULT 0,
  saved_payment_methods_count INTEGER DEFAULT 0,
  wishlist_items_count INTEGER DEFAULT 0,
  
  -- Preferences
  preferred_currency VARCHAR(10) DEFAULT 'USD',
  preferred_payment_method_id UUID REFERENCES payment_methods_v2(id) ON DELETE SET NULL,
  preferred_shipping_address_id UUID REFERENCES user_addresses(id) ON DELETE SET NULL,
  preferred_billing_address_id UUID REFERENCES user_addresses(id) ON DELETE SET NULL,
  
  -- Communication Preferences
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,
  
  -- Marketing Preferences
  marketing_emails BOOLEAN DEFAULT true,
  price_drop_alerts BOOLEAN DEFAULT true,
  order_updates BOOLEAN DEFAULT true,
  
  -- Privacy
  profile_visibility VARCHAR(20) DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'friends')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_purchase_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_buyer_profiles_last_purchase ON buyer_profiles(last_purchase_at DESC NULLS LAST);
CREATE INDEX idx_buyer_profiles_total_spent ON buyer_profiles(total_spent DESC);
CREATE INDEX idx_buyer_profiles_total_orders ON buyer_profiles(total_orders DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_buyer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_buyer_profiles_updated_at
  BEFORE UPDATE ON buyer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_buyer_profiles_updated_at();

-- Function to update buyer profile stats when order is created
CREATE OR REPLACE FUNCTION update_buyer_profile_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Update buyer profile stats
  INSERT INTO buyer_profiles (user_id, total_orders, total_spent, last_purchase_at, created_at)
  VALUES (
    NEW.buyer_id,
    1,
    NEW.total_amount,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_orders = buyer_profiles.total_orders + 1,
    total_spent = buyer_profiles.total_spent + NEW.total_amount,
    average_order_value = (buyer_profiles.total_spent + NEW.total_amount) / (buyer_profiles.total_orders + 1),
    last_purchase_at = NEW.created_at,
    updated_at = CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_buyer_profile_on_order
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'processing'))
  EXECUTE FUNCTION update_buyer_profile_on_order();

-- Comments for documentation
COMMENT ON TABLE buyer_profiles IS 'Centralized buyer profile with stats and preferences';
COMMENT ON COLUMN buyer_profiles.total_orders IS 'Total number of completed orders';
COMMENT ON COLUMN buyer_profiles.total_spent IS 'Total amount spent across all orders';
COMMENT ON COLUMN buyer_profiles.average_order_value IS 'Average order value';
COMMENT ON COLUMN buyer_profiles.preferred_payment_method_id IS 'Users preferred payment method';
COMMENT ON COLUMN buyer_profiles.preferred_shipping_address_id IS 'Users preferred shipping address';
COMMENT ON COLUMN buyer_profiles.preferred_billing_address_id IS 'Users preferred billing address';
COMMENT ON COLUMN buyer_profiles.profile_visibility IS 'Privacy setting for profile visibility';
