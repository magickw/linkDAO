-- Migration: Rename Gold tables to Gems
-- Description: Renames user_gold_balance and gold_transaction tables to user_gem_balance and gem_transaction
--              to match the new Web3-themed currency naming.

-- Rename user_gold_balance table
ALTER TABLE IF EXISTS user_gold_balance RENAME TO user_gem_balance;

-- Rename indexes for user_gem_balance (if they exist)
ALTER INDEX IF EXISTS idx_user_gold_balance_user RENAME TO idx_user_gem_balance_user;

-- Rename gold_transaction table
ALTER TABLE IF EXISTS gold_transaction RENAME TO gem_transaction;

-- Rename indexes for gem_transaction (if they exist)
ALTER INDEX IF EXISTS idx_gold_transaction_user RENAME TO idx_gem_transaction_user;
ALTER INDEX IF EXISTS idx_gold_transaction_type RENAME TO idx_gem_transaction_type;
ALTER INDEX IF EXISTS idx_gold_transaction_status RENAME TO idx_gem_transaction_status;
ALTER INDEX IF EXISTS idx_gold_transaction_created RENAME TO idx_gem_transaction_created;
ALTER INDEX IF EXISTS idx_gold_transaction_network RENAME TO idx_gem_transaction_network;
ALTER INDEX IF EXISTS idx_gold_transaction_hash RENAME TO idx_gem_transaction_hash;
ALTER INDEX IF EXISTS idx_gold_transaction_order_network RENAME TO idx_gem_transaction_order_network;

-- Update comments
COMMENT ON TABLE user_gem_balance IS 'Stores user gem balance and purchase history';
COMMENT ON TABLE gem_transaction IS 'Stores all gem transactions (purchases, spends, refunds)';
