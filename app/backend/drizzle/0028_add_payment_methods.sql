-- Migration: Add secure payment methods table
-- Created: 2025-01-27
-- Description: Creates payment_methods table with encrypted storage for sensitive payment data

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet_address VARCHAR(42) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('card', 'bank', 'crypto')),
  nickname VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  
  -- Tokenized/encrypted payment data (never store raw sensitive info)
  encrypted_token TEXT NOT NULL, -- Encrypted payment token from payment processor
  last_four VARCHAR(4), -- Last 4 digits for display (safe to store)
  expiry_month INTEGER CHECK (expiry_month >= 1 AND expiry_month <= 12),
  expiry_year INTEGER CHECK (expiry_year >= EXTRACT(YEAR FROM CURRENT_DATE)),
  brand VARCHAR(20), -- Visa, Mastercard, etc.
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  FOREIGN KEY (user_wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_payment_methods_user ON payment_methods(user_wallet_address);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_wallet_address, is_default) WHERE is_default = TRUE;
CREATE INDEX idx_payment_methods_type ON payment_methods(type);

-- Ensure only one default payment method per user
CREATE UNIQUE INDEX idx_payment_methods_unique_default 
ON payment_methods(user_wallet_address) 
WHERE is_default = TRUE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

-- Comments for documentation
COMMENT ON TABLE payment_methods IS 'Secure storage for tokenized payment methods';
COMMENT ON COLUMN payment_methods.encrypted_token IS 'Encrypted payment token from processor - never store raw payment data';
COMMENT ON COLUMN payment_methods.last_four IS 'Last 4 digits for display purposes only';
COMMENT ON COLUMN payment_methods.is_default IS 'Whether this is the users default payment method';