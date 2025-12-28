-- Migration: Create gold balance and transaction tables
-- Description: This migration creates the user_gold_balance and gold_transaction tables
--              required for the gold purchase system

-- Create user_gold_balance table
CREATE TABLE IF NOT EXISTS user_gold_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(66) NOT NULL UNIQUE,
    balance INTEGER NOT NULL DEFAULT 0,
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_spent INTEGER NOT NULL DEFAULT 0,
    last_purchase_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_user_gold_balance_user 
ON user_gold_balance(user_id);

-- Create gold_transaction table
CREATE TABLE IF NOT EXISTS gold_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(66) NOT NULL,
    amount INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    price DECIMAL(10, 2),
    payment_method VARCHAR(50),
    payment_intent_id VARCHAR(255),
    reference_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for gold_transaction
CREATE INDEX IF NOT EXISTS idx_gold_transaction_user 
ON gold_transaction(user_id);

CREATE INDEX IF NOT EXISTS idx_gold_transaction_type 
ON gold_transaction(type);

CREATE INDEX IF NOT EXISTS idx_gold_transaction_status 
ON gold_transaction(status);

CREATE INDEX IF NOT EXISTS idx_gold_transaction_created 
ON gold_transaction(created_at);

-- Add comments for documentation
COMMENT ON TABLE user_gold_balance IS 'Stores user gold balance and purchase history';
COMMENT ON TABLE gold_transaction IS 'Stores all gold transactions (purchases, spends, refunds)';
COMMENT ON COLUMN gold_transaction.type IS 'Transaction type: purchase, spend, refund';
COMMENT ON COLUMN gold_transaction.price IS 'Price in USD for purchases';
COMMENT ON COLUMN gold_transaction.payment_method IS 'Payment method: stripe, crypto, etc.';
COMMENT ON COLUMN gold_transaction.reference_id IS 'Related post/comment ID for spends';