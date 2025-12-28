-- Migration: Add missing fields to goldTransaction table for receipt generation
-- Description: This migration adds orderId, network, and transactionHash fields
--              required for gold purchase receipts and transaction tracking

-- Add orderId field (unique constraint for transaction tracking)
ALTER TABLE gold_transaction 
ADD COLUMN IF NOT EXISTS order_id VARCHAR(255) UNIQUE;

-- Add network field (e.g., 'Ethereum', 'Base', 'Polygon')
ALTER TABLE gold_transaction 
ADD COLUMN IF NOT EXISTS network VARCHAR(50);

-- Add transactionHash field (blockchain transaction ID)
ALTER TABLE gold_transaction 
ADD COLUMN IF NOT EXISTS transaction_hash VARCHAR(66);

-- Add index for network field
CREATE INDEX IF NOT EXISTS idx_gold_transaction_network 
ON gold_transaction(network);

-- Add index for transactionHash field
CREATE INDEX IF NOT EXISTS idx_gold_transaction_hash 
ON gold_transaction(transaction_hash);

-- Add composite index for orderId and network
CREATE INDEX IF NOT EXISTS idx_gold_transaction_order_network 
ON gold_transaction(order_id, network);

-- Add comments for documentation
COMMENT ON COLUMN gold_transaction.order_id IS 'Unique order ID for tracking gold purchases';
COMMENT ON COLUMN gold_transaction.network IS 'Blockchain network used for payment (e.g., Ethereum, Base, Polygon)';
COMMENT ON COLUMN gold_transaction.transaction_hash IS 'Blockchain transaction hash for crypto payments';