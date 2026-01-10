-- Add new columns to escrows table for auto-release functionality
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS paypal_capture_id VARCHAR(255);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS token_address VARCHAR(66);
ALTER TABLE escrows ADD COLUMN IF NOT EXISTS resolution TEXT;

-- Create index for efficient escrow expiry and release queries
CREATE INDEX IF NOT EXISTS idx_escrows_expires_at ON escrows(expires_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_escrows_delivery_confirmed_at ON escrows(delivery_confirmed_at) WHERE resolved_at IS NULL AND delivery_confirmed = true;
CREATE INDEX IF NOT EXISTS idx_escrows_dispute_opened ON escrows(dispute_opened) WHERE resolved_at IS NULL;
