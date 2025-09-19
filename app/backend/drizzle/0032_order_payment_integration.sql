-- Order Payment Integration Schema
-- This migration adds comprehensive payment transaction tracking and receipt management

-- Create payment_transactions table for detailed transaction tracking
CREATE TABLE IF NOT EXISTS payment_transactions (
    id VARCHAR(255) PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('crypto', 'fiat', 'escrow')),
    transaction_hash VARCHAR(66), -- Blockchain transaction hash
    payment_intent_id VARCHAR(255), -- Stripe PaymentIntent ID
    escrow_id VARCHAR(255), -- Escrow contract ID or address
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'confirmed', 'completed', 'failed', 'cancelled', 'refunded')),
    processing_fee DECIMAL(20, 8) DEFAULT 0,
    platform_fee DECIMAL(20, 8) DEFAULT 0,
    gas_fee DECIMAL(20, 8) DEFAULT 0,
    total_fees DECIMAL(20, 8) DEFAULT 0,
    receipt_url VARCHAR(500),
    receipt_data JSONB,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Create indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_method ON payment_transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_hash ON payment_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_intent_id ON payment_transactions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_escrow_id ON payment_transactions(escrow_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_confirmed_at ON payment_transactions(confirmed_at);

-- Create payment_receipts table for receipt management
CREATE TABLE IF NOT EXISTS payment_receipts (
    id VARCHAR(255) PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    payment_method VARCHAR(20) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    fees JSONB NOT NULL, -- JSON object with fee breakdown
    transaction_details JSONB NOT NULL, -- JSON object with transaction-specific details
    receipt_url VARCHAR(500) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment_receipts
CREATE INDEX IF NOT EXISTS idx_payment_receipts_transaction_id ON payment_receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_order_id ON payment_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number ON payment_receipts(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment_method ON payment_receipts(payment_method);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_created_at ON payment_receipts(created_at);

-- Create order_payment_events table for detailed event tracking
CREATE TABLE IF NOT EXISTS order_payment_events (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) REFERENCES payment_transactions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT NOT NULL,
    payment_status VARCHAR(20),
    order_status VARCHAR(20),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for order_payment_events
CREATE INDEX IF NOT EXISTS idx_order_payment_events_order_id ON order_payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_events_transaction_id ON order_payment_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_events_event_type ON order_payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_order_payment_events_payment_status ON order_payment_events(payment_status);
CREATE INDEX IF NOT EXISTS idx_order_payment_events_created_at ON order_payment_events(created_at);

-- Add payment integration fields to orders table if not already present
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0;

-- Create indexes for new order payment fields
CREATE INDEX IF NOT EXISTS idx_orders_payment_transaction_id ON orders(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_confirmed_at ON orders(payment_confirmed_at);

-- Create payment analytics views
CREATE OR REPLACE VIEW payment_transaction_analytics AS
SELECT 
    DATE_TRUNC('day', pt.created_at) as date,
    pt.payment_method,
    pt.currency,
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN pt.status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN pt.status = 'refunded' THEN 1 END) as refunded_count,
    SUM(CASE WHEN pt.status = 'completed' THEN pt.amount ELSE 0 END) as completed_volume,
    SUM(CASE WHEN pt.status = 'refunded' THEN ABS(pt.amount) ELSE 0 END) as refunded_volume,
    AVG(CASE WHEN pt.status = 'completed' THEN pt.amount END) as avg_transaction_amount,
    AVG(CASE WHEN pt.status = 'completed' THEN pt.total_fees END) as avg_fees,
    ROUND(
        COUNT(CASE WHEN pt.status = 'completed' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*)::DECIMAL, 0) * 100, 2
    ) as success_rate_percent
FROM payment_transactions pt
WHERE pt.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', pt.created_at), pt.payment_method, pt.currency
ORDER BY date DESC, pt.payment_method, pt.currency;

-- Create order payment status view
CREATE OR REPLACE VIEW order_payment_status_view AS
SELECT 
    o.id as order_id,
    o.status as order_status,
    o.payment_method,
    o.payment_status,
    o.payment_confirmed_at,
    o.total_amount as order_amount,
    o.currency,
    COUNT(pt.id) as transaction_count,
    SUM(CASE WHEN pt.status = 'completed' AND pt.amount > 0 THEN pt.amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN pt.status = 'refunded' OR pt.amount < 0 THEN ABS(pt.amount) ELSE 0 END) as total_refunded,
    COALESCE(o.total_amount, 0) - 
    COALESCE(SUM(CASE WHEN pt.status = 'completed' AND pt.amount > 0 THEN pt.amount ELSE 0 END), 0) + 
    COALESCE(SUM(CASE WHEN pt.status = 'refunded' OR pt.amount < 0 THEN ABS(pt.amount) ELSE 0 END), 0) as outstanding_amount,
    MAX(pt.created_at) as last_payment_attempt,
    COUNT(CASE WHEN pt.status = 'failed' THEN 1 END) > 0 AND 
    COALESCE(o.total_amount, 0) - 
    COALESCE(SUM(CASE WHEN pt.status = 'completed' AND pt.amount > 0 THEN pt.amount ELSE 0 END), 0) > 0 as can_retry,
    SUM(CASE WHEN pt.status = 'completed' AND pt.amount > 0 THEN pt.amount ELSE 0 END) > 0 AND 
    o.status NOT IN ('refunded', 'cancelled') as can_refund,
    COUNT(pr.id) as receipt_count
FROM orders o
LEFT JOIN payment_transactions pt ON o.id = pt.order_id
LEFT JOIN payment_receipts pr ON o.id = pr.order_id
GROUP BY o.id, o.status, o.payment_method, o.payment_status, o.payment_confirmed_at, o.total_amount, o.currency;

-- Create function to automatically update order payment status
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update order payment status based on transaction status
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE orders 
        SET 
            payment_status = NEW.status,
            payment_confirmed_at = CASE 
                WHEN NEW.status IN ('confirmed', 'completed') AND payment_confirmed_at IS NULL 
                THEN COALESCE(NEW.confirmed_at, NEW.updated_at)
                ELSE payment_confirmed_at
            END,
            payment_failure_reason = CASE 
                WHEN NEW.status = 'failed' THEN NEW.failure_reason
                ELSE payment_failure_reason
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.order_id;

        -- Log payment event
        INSERT INTO order_payment_events (
            order_id,
            transaction_id,
            event_type,
            event_description,
            payment_status,
            order_status,
            event_data
        ) VALUES (
            NEW.order_id,
            NEW.id,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'transaction_created'
                ELSE 'transaction_updated'
            END,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'Payment transaction created'
                ELSE 'Payment transaction status updated to ' || NEW.status
            END,
            NEW.status,
            (SELECT status FROM orders WHERE id = NEW.order_id),
            jsonb_build_object(
                'transaction_id', NEW.id,
                'payment_method', NEW.payment_method,
                'amount', NEW.amount,
                'currency', NEW.currency,
                'transaction_hash', NEW.transaction_hash,
                'payment_intent_id', NEW.payment_intent_id,
                'escrow_id', NEW.escrow_id
            )
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic order payment status updates
DROP TRIGGER IF EXISTS payment_transaction_status_trigger ON payment_transactions;
CREATE TRIGGER payment_transaction_status_trigger
    AFTER INSERT OR UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_order_payment_status();

-- Create function to automatically update payment transaction timestamps
CREATE OR REPLACE FUNCTION update_payment_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Set confirmed_at when status changes to confirmed or completed
    IF NEW.status IN ('confirmed', 'completed') AND OLD.status NOT IN ('confirmed', 'completed') THEN
        NEW.confirmed_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS payment_transaction_timestamp_trigger ON payment_transactions;
CREATE TRIGGER payment_transaction_timestamp_trigger
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transaction_timestamp();

-- Add comments for documentation
COMMENT ON TABLE payment_transactions IS 'Detailed tracking of all payment transactions for orders';
COMMENT ON TABLE payment_receipts IS 'Payment receipts generated for completed transactions';
COMMENT ON TABLE order_payment_events IS 'Event log for order payment status changes and transaction updates';

COMMENT ON COLUMN payment_transactions.id IS 'Unique transaction identifier';
COMMENT ON COLUMN payment_transactions.order_id IS 'Reference to the order this transaction belongs to';
COMMENT ON COLUMN payment_transactions.payment_method IS 'Payment method: crypto, fiat, or escrow';
COMMENT ON COLUMN payment_transactions.transaction_hash IS 'Blockchain transaction hash for crypto payments';
COMMENT ON COLUMN payment_transactions.payment_intent_id IS 'Stripe PaymentIntent ID for fiat payments';
COMMENT ON COLUMN payment_transactions.escrow_id IS 'Escrow contract ID or address for escrow payments';
COMMENT ON COLUMN payment_transactions.status IS 'Current status of the payment transaction';
COMMENT ON COLUMN payment_transactions.retry_count IS 'Number of retry attempts for failed transactions';

COMMENT ON COLUMN payment_receipts.receipt_number IS 'Human-readable receipt number';
COMMENT ON COLUMN payment_receipts.fees IS 'JSON object containing fee breakdown';
COMMENT ON COLUMN payment_receipts.transaction_details IS 'JSON object with payment method specific details';

COMMENT ON COLUMN orders.payment_transaction_id IS 'Reference to the primary payment transaction';
COMMENT ON COLUMN orders.payment_status IS 'Current payment status synchronized from transactions';
COMMENT ON COLUMN orders.payment_confirmed_at IS 'Timestamp when payment was confirmed';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON payment_transactions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON payment_receipts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON order_payment_events TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE order_payment_events_id_seq TO your_app_user;

-- Create sample data for testing (optional - remove in production)
-- INSERT INTO payment_transactions (id, order_id, payment_method, amount, currency, status) 
-- VALUES ('test_txn_1', 1, 'crypto', 100.00, 'USDC', 'completed')
-- ON CONFLICT (id) DO NOTHING;