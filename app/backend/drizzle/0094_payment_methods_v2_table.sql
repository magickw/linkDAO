-- Migration: Centralized Buyer Data System - Payment Methods
-- Number: 0094
-- Created: 2026-01-06
-- Description: Creates enhanced payment_methods table for multiple payment options per user

CREATE TABLE IF NOT EXISTS payment_methods_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Payment Method Type
  method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('credit_card', 'debit_card', 'crypto_wallet', 'bank_account')),
  provider VARCHAR(50), -- 'stripe', 'coinbase', 'metamask', etc.
  
  -- Display Information
  label VARCHAR(100), -- 'Personal Visa', 'Business Amex', etc.
  
  -- Card Information (encrypted/tokenized)
  card_last4 VARCHAR(4), -- Last 4 digits for display
  card_brand VARCHAR(20), -- 'visa', 'mastercard', 'amex', etc.
  card_exp_month INTEGER CHECK (card_exp_month >= 1 AND card_exp_month <= 12),
  card_exp_year INTEGER CHECK (card_exp_year >= EXTRACT(YEAR FROM CURRENT_DATE)),
  card_fingerprint VARCHAR(255), -- Unique card identifier
  
  -- Crypto Wallet Information
  wallet_address VARCHAR(66), -- Ethereum address
  wallet_type VARCHAR(20), -- 'metamask', 'coinbase', 'walletconnect'
  chain_id INTEGER, -- Network chain ID
  
  -- External Provider References
  stripe_payment_method_id VARCHAR(255), -- Stripe PM ID
  stripe_customer_id VARCHAR(255), -- Stripe Customer ID
  external_id VARCHAR(255), -- Generic external reference
  
  -- Billing Address
  billing_address_id UUID REFERENCES user_addresses(id) ON DELETE SET NULL,
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  
  -- Security
  requires_cvv BOOLEAN DEFAULT true,
  requires_3ds BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled', 'failed_verification')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_payment_methods_v2_user_id ON payment_methods_v2(user_id);
CREATE INDEX idx_payment_methods_v2_type ON payment_methods_v2(method_type);
CREATE INDEX idx_payment_methods_v2_default ON payment_methods_v2(is_default) WHERE is_default = true;
CREATE INDEX idx_payment_methods_v2_status ON payment_methods_v2(status);
CREATE INDEX idx_payment_methods_v2_stripe_pm ON payment_methods_v2(stripe_payment_method_id) WHERE stripe_payment_method_id IS NOT NULL;
CREATE INDEX idx_payment_methods_v2_last_used ON payment_methods_v2(last_used_at DESC NULLS LAST);

-- Ensure only one default payment method per user
CREATE UNIQUE INDEX idx_payment_methods_v2_unique_default 
ON payment_methods_v2(user_id) 
WHERE is_default = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_methods_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_methods_v2_updated_at
  BEFORE UPDATE ON payment_methods_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_v2_updated_at();

-- Comments for documentation
COMMENT ON TABLE payment_methods_v2 IS 'Multiple payment methods per user (cards and crypto wallets)';
COMMENT ON COLUMN payment_methods_v2.method_type IS 'Type of payment method';
COMMENT ON COLUMN payment_methods_v2.label IS 'User-defined label for the payment method';
COMMENT ON COLUMN payment_methods_v2.card_last4 IS 'Last 4 digits of card for display (safe to store)';
COMMENT ON COLUMN payment_methods_v2.stripe_payment_method_id IS 'Stripe PaymentMethod ID (tokenized, secure)';
COMMENT ON COLUMN payment_methods_v2.wallet_address IS 'Crypto wallet address for blockchain payments';
COMMENT ON COLUMN payment_methods_v2.is_default IS 'Whether this is the users default payment method';
COMMENT ON COLUMN payment_methods_v2.status IS 'Current status of the payment method';
COMMENT ON COLUMN payment_methods_v2.last_used_at IS 'Last time this payment method was used';
