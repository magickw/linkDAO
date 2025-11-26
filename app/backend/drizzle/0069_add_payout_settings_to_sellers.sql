-- Migration: Add payout_settings column to sellers table
-- This enables storing detailed payout configuration including bank account information

-- Add payout_settings column to sellers table
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS payout_settings JSONB;

-- Add comment for documentation
COMMENT ON COLUMN sellers.payout_settings IS 'JSON object containing payout configuration including bank account details, crypto addresses, and fiat withdrawal preferences';

-- Update statistics for query planner
ANALYZE sellers;