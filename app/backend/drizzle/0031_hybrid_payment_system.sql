-- Hybrid Payment System Schema Enhancement
-- This migration adds support for both crypto and fiat escrow flows

-- Add hybrid payment fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_type VARCHAR(20) DEFAULT 'smart_contract';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_transfer_group VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_seller_account_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_path VARCHAR(10) DEFAULT 'crypto';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fallback_method VARCHAR(10);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_decision_reason TEXT;

-- Create indexes for hybrid payment queries
CREATE INDEX IF NOT EXISTS idx_orders_escrow_type ON orders(escrow_type);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_transfer_group ON orders(stripe_transfer_group);
CREATE INDEX IF NOT EXISTS idx_orders_payment_path ON orders(payment_path);

-- Create payment path decisions table for analytics
CREATE TABLE IF NOT EXISTS payment_path_decisions (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    user_address VARCHAR(42) NOT NULL,
    recommended_path VARCHAR(10) NOT NULL,
    selected_path VARCHAR(10) NOT NULL,
    decision_reason TEXT,
    crypto_balance_sufficient BOOLEAN,
    fiat_methods_available INTEGER DEFAULT 0,
    user_preference VARCHAR(10),
    fees_crypto DECIMAL(20, 8),
    fees_fiat DECIMAL(20, 8),
    processing_time_crypto VARCHAR(50),
    processing_time_fiat VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment path decisions
CREATE INDEX IF NOT EXISTS idx_payment_decisions_order_id ON payment_path_decisions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_decisions_user_address ON payment_path_decisions(user_address);
CREATE INDEX IF NOT EXISTS idx_payment_decisions_recommended_path ON payment_path_decisions(recommended_path);
CREATE INDEX IF NOT EXISTS idx_payment_decisions_selected_path ON payment_path_decisions(selected_path);
CREATE INDEX IF NOT EXISTS idx_payment_decisions_created_at ON payment_path_decisions(created_at);

-- Create hybrid payment events table for tracking
CREATE TABLE IF NOT EXISTS hybrid_payment_events (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    event_type VARCHAR(50) NOT NULL,
    payment_path VARCHAR(10) NOT NULL,
    escrow_type VARCHAR(20) NOT NULL,
    event_data JSONB,
    transaction_hash VARCHAR(66),
    stripe_event_id VARCHAR(255),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment events
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON hybrid_payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON hybrid_payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_path ON hybrid_payment_events(payment_path);
CREATE INDEX IF NOT EXISTS idx_payment_events_escrow_type ON hybrid_payment_events(escrow_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_status ON hybrid_payment_events(status);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON hybrid_payment_events(created_at);

-- Create stripe connect accounts table for seller management
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL UNIQUE,
    stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
    account_status VARCHAR(20) DEFAULT 'pending',
    capabilities JSONB,
    requirements JSONB,
    verification_status VARCHAR(20) DEFAULT 'unverified',
    payouts_enabled BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for Stripe accounts
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_user_address ON stripe_connect_accounts(user_address);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_stripe_id ON stripe_connect_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_status ON stripe_connect_accounts(account_status);
CREATE INDEX IF NOT EXISTS idx_stripe_accounts_verification ON stripe_connect_accounts(verification_status);

-- Create payment method preferences table
CREATE TABLE IF NOT EXISTS payment_method_preferences (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL UNIQUE,
    preferred_method VARCHAR(10) DEFAULT 'auto',
    crypto_enabled BOOLEAN DEFAULT TRUE,
    fiat_enabled BOOLEAN DEFAULT TRUE,
    auto_fallback BOOLEAN DEFAULT TRUE,
    preferred_crypto_token VARCHAR(10) DEFAULT 'USDC',
    preferred_fiat_currency VARCHAR(3) DEFAULT 'USD',
    max_gas_fee_usd DECIMAL(10, 2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payment preferences
CREATE INDEX IF NOT EXISTS idx_payment_preferences_user_address ON payment_method_preferences(user_address);
CREATE INDEX IF NOT EXISTS idx_payment_preferences_method ON payment_method_preferences(preferred_method);

-- Create hybrid payment analytics view
CREATE OR REPLACE VIEW hybrid_payment_analytics AS
SELECT 
    DATE_TRUNC('day', o.created_at) as date,
    o.payment_path,
    o.escrow_type,
    COUNT(*) as order_count,
    SUM(CAST(o.amount AS DECIMAL)) as total_volume,
    AVG(CAST(o.amount AS DECIMAL)) as avg_order_value,
    COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN o.status = 'disputed' THEN 1 END) as disputed_orders,
    COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders
FROM orders o
WHERE o.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', o.created_at), o.payment_path, o.escrow_type
ORDER BY date DESC;

-- Create payment path success rates view
CREATE OR REPLACE VIEW payment_path_success_rates AS
SELECT 
    payment_path,
    escrow_type,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END) as successful,
    ROUND(
        COUNT(CASE WHEN status IN ('completed', 'delivered') THEN 1 END)::DECIMAL / 
        COUNT(*)::DECIMAL * 100, 2
    ) as success_rate_percent,
    AVG(
        CASE 
            WHEN status = 'completed' AND updated_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at))/60 
        END
    ) as avg_completion_time_minutes
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY payment_path, escrow_type;

-- Add comments for documentation
COMMENT ON TABLE payment_path_decisions IS 'Tracks payment path decision logic and user preferences for analytics';
COMMENT ON TABLE hybrid_payment_events IS 'Event log for hybrid payment system tracking both crypto and fiat flows';
COMMENT ON TABLE stripe_connect_accounts IS 'Manages Stripe Connect accounts for sellers in fiat escrow flow';
COMMENT ON TABLE payment_method_preferences IS 'User preferences for payment methods and fallback behavior';

COMMENT ON COLUMN orders.escrow_type IS 'Type of escrow: smart_contract for crypto, stripe_connect for fiat';
COMMENT ON COLUMN orders.payment_path IS 'Actual payment path taken: crypto or fiat';
COMMENT ON COLUMN orders.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for fiat escrow';
COMMENT ON COLUMN orders.stripe_transfer_group IS 'Stripe transfer group for escrow-like behavior';
COMMENT ON COLUMN orders.payment_decision_reason IS 'Reason for payment path selection';

-- Insert default payment preferences for existing users (if any)
DO $$
BEGIN
    -- Check if buyer_wallet_address column exists in orders table
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
        AND column_name = 'buyer_wallet_address'
    ) THEN
        INSERT INTO payment_method_preferences (user_address, preferred_method)
        SELECT DISTINCT buyer_wallet_address, 'auto'
        FROM orders
        WHERE buyer_wallet_address IS NOT NULL
        ON CONFLICT (user_address) DO NOTHING;
    ELSE
        RAISE NOTICE 'Column buyer_wallet_address does not exist in orders table, skipping INSERT';
    END IF;
END$$;

-- Create function to automatically log payment events
CREATE OR REPLACE FUNCTION log_payment_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Log order status changes as payment events
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO hybrid_payment_events (
            order_id,
            event_type,
            payment_path,
            escrow_type,
            event_data,
            status
        ) VALUES (
            NEW.id,
            'status_change',
            COALESCE(NEW.payment_path, 'crypto'),
            COALESCE(NEW.escrow_type, 'smart_contract'),
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'updated_at', NEW.updated_at
            ),
            NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic payment event logging
DROP TRIGGER IF EXISTS payment_event_logger ON orders;
CREATE TRIGGER payment_event_logger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_payment_event();

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON payment_path_decisions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON hybrid_payment_events TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON stripe_connect_accounts TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON payment_method_preferences TO your_app_user;