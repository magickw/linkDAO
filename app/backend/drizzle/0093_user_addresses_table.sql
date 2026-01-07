-- Migration: Centralized Buyer Data System - User Addresses
-- Number: 0093
-- Created: 2026-01-06
-- Description: Creates user_addresses table for multiple shipping/billing addresses per user

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Address Type
  address_type VARCHAR(20) NOT NULL CHECK (address_type IN ('shipping', 'billing', 'both')),
  label VARCHAR(100), -- 'Home', 'Work', 'Mom''s House', etc.
  
  -- Contact Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(200),
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Address Details
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'US',
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  
  -- Delivery Instructions
  delivery_instructions TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_type ON user_addresses(address_type);
CREATE INDEX idx_user_addresses_default ON user_addresses(is_default) WHERE is_default = true;
CREATE INDEX idx_user_addresses_last_used ON user_addresses(last_used_at DESC NULLS LAST);

-- Ensure only one default shipping address per user
CREATE UNIQUE INDEX idx_user_addresses_unique_default_shipping 
ON user_addresses(user_id) 
WHERE is_default = true AND address_type IN ('shipping', 'both');

-- Ensure only one default billing address per user
CREATE UNIQUE INDEX idx_user_addresses_unique_default_billing 
ON user_addresses(user_id) 
WHERE is_default = true AND address_type IN ('billing', 'both');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_addresses_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_addresses IS 'Multiple shipping and billing addresses per user';
COMMENT ON COLUMN user_addresses.address_type IS 'Type of address: shipping, billing, or both';
COMMENT ON COLUMN user_addresses.label IS 'User-defined label like Home, Work, etc.';
COMMENT ON COLUMN user_addresses.is_default IS 'Whether this is the default address for its type';
COMMENT ON COLUMN user_addresses.is_verified IS 'Whether address has been verified (e.g., via USPS)';
COMMENT ON COLUMN user_addresses.delivery_instructions IS 'Special delivery instructions for shipping addresses';
COMMENT ON COLUMN user_addresses.last_used_at IS 'Last time this address was used in an order';
