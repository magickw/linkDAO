-- Enhanced Payment Method Preferences System
-- This migration creates comprehensive payment preference storage with learning capabilities

-- Drop existing simple payment preferences table if it exists
DROP TABLE IF EXISTS payment_method_preferences CASCADE;

-- Create enhanced payment method preferences table
CREATE TABLE IF NOT EXISTS payment_method_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted preference data
    encrypted_preferences TEXT NOT NULL, -- JSON encrypted with user-specific key
    
    -- Quick access fields for performance (non-encrypted)
    preferred_methods JSONB DEFAULT '[]'::jsonb, -- Array of preferred payment method types in order
    avoided_methods JSONB DEFAULT '[]'::jsonb, -- Array of avoided payment method types
    max_gas_fee_threshold DECIMAL(10, 2) DEFAULT 50.00, -- Maximum acceptable gas fee in USD
    prefer_stablecoins BOOLEAN DEFAULT TRUE,
    prefer_fiat BOOLEAN DEFAULT FALSE,
    
    -- Learning algorithm data
    total_transactions INTEGER DEFAULT 0,
    method_usage_counts JSONB DEFAULT '{}'::jsonb, -- Count of usage per payment method
    last_used_methods JSONB DEFAULT '[]'::jsonb, -- Recent payment methods with timestamps
    preference_scores JSONB DEFAULT '{}'::jsonb, -- Calculated preference scores per method
    
    -- Metadata
    learning_enabled BOOLEAN DEFAULT TRUE,
    last_preference_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment method usage history table for learning
CREATE TABLE IF NOT EXISTS payment_method_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method_type VARCHAR(50) NOT NULL, -- 'STABLECOIN_USDC', 'FIAT_STRIPE', 'NATIVE_ETH', etc.
    transaction_amount DECIMAL(20, 8),
    transaction_currency VARCHAR(10),
    gas_fee_usd DECIMAL(10, 2),
    total_cost_usd DECIMAL(10, 2),
    network_id INTEGER,
    was_preferred BOOLEAN DEFAULT FALSE, -- Whether this was the user's preferred choice
    was_suggested BOOLEAN DEFAULT FALSE, -- Whether this was system-suggested
    context_data JSONB DEFAULT '{}'::jsonb, -- Additional context (market conditions, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payment method preference overrides table
CREATE TABLE IF NOT EXISTS payment_method_preference_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    override_type VARCHAR(50) NOT NULL, -- 'manual_selection', 'temporary_preference', 'network_specific'
    payment_method_type VARCHAR(50) NOT NULL,
    network_id INTEGER,
    priority_boost INTEGER DEFAULT 0, -- How much to boost this method's priority
    expires_at TIMESTAMP, -- When this override expires (NULL for permanent)
    reason TEXT, -- User-provided reason for override
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_preferences_user_id ON payment_method_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_preferences_updated_at ON payment_method_preferences(updated_at);
CREATE INDEX IF NOT EXISTS idx_payment_preferences_learning_enabled ON payment_method_preferences(learning_enabled);

CREATE INDEX IF NOT EXISTS idx_payment_usage_history_user_id ON payment_method_usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_usage_history_method_type ON payment_method_usage_history(payment_method_type);
CREATE INDEX IF NOT EXISTS idx_payment_usage_history_created_at ON payment_method_usage_history(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_usage_history_user_method ON payment_method_usage_history(user_id, payment_method_type);

CREATE INDEX IF NOT EXISTS idx_payment_preference_overrides_user_id ON payment_method_preference_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_preference_overrides_expires_at ON payment_method_preference_overrides(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_preference_overrides_method_type ON payment_method_preference_overrides(payment_method_type);

-- Create function to update preference timestamps
CREATE OR REPLACE FUNCTION update_payment_preference_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_preference_update = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_preferences_timestamp
    BEFORE UPDATE ON payment_method_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_preference_timestamp();

-- Create function to clean up expired overrides
CREATE OR REPLACE FUNCTION cleanup_expired_preference_overrides()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM payment_method_preference_overrides 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE payment_method_preferences IS 'Enhanced user payment method preferences with learning capabilities and encrypted storage';
COMMENT ON TABLE payment_method_usage_history IS 'Historical record of payment method usage for preference learning algorithms';
COMMENT ON TABLE payment_method_preference_overrides IS 'User-defined overrides for payment method preferences';

COMMENT ON COLUMN payment_method_preferences.encrypted_preferences IS 'Encrypted JSON containing sensitive preference data';
COMMENT ON COLUMN payment_method_preferences.preference_scores IS 'Calculated preference scores for each payment method based on usage patterns';
COMMENT ON COLUMN payment_method_usage_history.was_preferred IS 'Whether this payment method was the users preferred choice at time of transaction';
COMMENT ON COLUMN payment_method_preference_overrides.priority_boost IS 'How much to boost this methods priority in the selection algorithm';