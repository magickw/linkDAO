-- Migration: Add LDAO token purchase fields to receipts table
-- Description: This migration adds tokensPurchased and pricePerToken fields
--              required for LDAO token purchase receipts and historical tracking

-- Add tokensPurchased field
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS tokens_purchased VARCHAR(255);

-- Add pricePerToken field
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS price_per_token VARCHAR(50);

-- Add index for tokensPurchased field
CREATE INDEX IF NOT EXISTS idx_receipts_tokens_purchased 
ON receipts(tokens_purchased);

-- Add index for pricePerToken field
CREATE INDEX IF NOT EXISTS idx_receipts_price_per_token 
ON receipts(price_per_token);

-- Add comments for documentation
COMMENT ON COLUMN receipts.tokens_purchased IS 'Number of LDAO tokens purchased (as string for precision)';
COMMENT ON COLUMN receipts.price_per_token IS 'Price per LDAO token in the transaction currency';

-- Update existing LDAO receipts with metadata values
-- This will populate tokensPurchased and pricePerToken from metadata JSON
UPDATE receipts 
SET 
  tokens_purchased = (metadata->>'tokensPurchased')::VARCHAR,
  price_per_token = (metadata->>'pricePerToken')::VARCHAR
WHERE type = 'LDAO_TOKEN' 
  AND metadata IS NOT NULL
  AND metadata ? 'tokensPurchased'
  AND metadata ? 'pricePerToken';