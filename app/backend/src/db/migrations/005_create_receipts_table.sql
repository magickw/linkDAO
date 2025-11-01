-- Create receipts table for storing payment receipts
CREATE TABLE IF NOT EXISTS receipts (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    order_id VARCHAR(255),
    transaction_id VARCHAR(255),
    buyer_address VARCHAR(66) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(66),
    status VARCHAR(20) NOT NULL,
    items JSONB,
    fees JSONB,
    seller_address VARCHAR(66),
    seller_name VARCHAR(255),
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    download_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_receipts_buyer_address ON receipts(buyer_address);
CREATE INDEX IF NOT EXISTS idx_receipts_order_id ON receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_receipts_type ON receipts(type);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);

-- Add foreign key constraints if referenced tables exist
-- ALTER TABLE receipts ADD CONSTRAINT fk_receipts_order FOREIGN KEY (order_id) REFERENCES marketplace_orders(id);
-- ALTER TABLE receipts ADD CONSTRAINT fk_receipts_transaction FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id);