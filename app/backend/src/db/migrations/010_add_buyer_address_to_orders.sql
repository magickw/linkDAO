-- Migration: Add buyerAddress field to orders table
-- Description: This migration adds buyer wallet address to orders table for easier
--              lookup and receipt generation without requiring JOINs

-- Add buyerAddress field to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS buyer_address VARCHAR(66);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_address 
ON orders(buyer_address);

-- Add comment for documentation
COMMENT ON COLUMN orders.buyer_address IS 'Wallet address of the buyer (in addition to buyer_id UUID)';

-- Update existing orders with buyer addresses from users table
-- This will populate buyerAddress for existing orders
UPDATE orders 
SET buyer_address = u.wallet_address
FROM users u
WHERE orders.buyer_id = u.id 
  AND orders.buyer_address IS NULL;