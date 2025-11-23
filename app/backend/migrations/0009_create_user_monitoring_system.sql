-- Migration: Create User Monitoring System Tables
-- Description: Creates tables for tracking user behavior, transactions, purchases, wallet activity, risk flags, and audit logs
-- Author: Generated from schema.ts lines 4150-4277
-- Date: 2025-11-23

-- =================================================================================================
-- USER MONITORING SYSTEM TABLES
-- =================================================================================================

-- Table 1: User Behavior Logs
-- Purpose: Track frontend events like page views, button clicks, searches, etc.
CREATE TABLE IF NOT EXISTS user_behavior_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    metadata TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    path VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for user_behavior_logs
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_id ON user_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_event_type ON user_behavior_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_timestamp ON user_behavior_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_session_id ON user_behavior_logs(session_id);

-- Comments for user_behavior_logs
COMMENT ON TABLE user_behavior_logs IS 'Tracks frontend user behavior events for analytics and monitoring';
COMMENT ON COLUMN user_behavior_logs.event_type IS 'Event type: VIEW_PRODUCT, CLICK_BUTTON, SEARCH, etc.';
COMMENT ON COLUMN user_behavior_logs.metadata IS 'JSON string with event details and context';
COMMENT ON COLUMN user_behavior_logs.session_id IS 'Browser session identifier for tracking user sessions';

-- =================================================================================================

-- Table 2: User Transactions
-- Purpose: Track on-chain blockchain transactions linked to users
CREATE TABLE IF NOT EXISTS user_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    chain VARCHAR(50) DEFAULT 'ethereum',
    event_type VARCHAR(50) NOT NULL,
    token VARCHAR(64),
    amount NUMERIC(30, 18),
    status VARCHAR(20) DEFAULT 'pending',
    block_number INTEGER,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for user_transactions
CREATE INDEX IF NOT EXISTS idx_user_transactions_user_id ON user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_transactions_tx_hash ON user_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_user_transactions_event_type ON user_transactions(event_type);
CREATE INDEX IF NOT EXISTS idx_user_transactions_timestamp ON user_transactions(timestamp);

-- Comments for user_transactions
COMMENT ON TABLE user_transactions IS 'Tracks blockchain transactions associated with user accounts';
COMMENT ON COLUMN user_transactions.tx_hash IS 'Unique blockchain transaction hash (66 chars for Ethereum 0x...)';
COMMENT ON COLUMN user_transactions.event_type IS 'Transaction type: TRANSFER, SWAP, MINT, BURN, STAKE, etc.';
COMMENT ON COLUMN user_transactions.amount IS 'Transaction amount with 18 decimal precision for token values';
COMMENT ON COLUMN user_transactions.status IS 'Transaction status: pending, confirmed, failed';

-- =================================================================================================

-- Table 3: Purchases
-- Purpose: Track marketplace purchases (distinct from blockchain transactions)
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    price NUMERIC(20, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    escrow_id VARCHAR(100),
    status VARCHAR(32) DEFAULT 'pending',
    dispute_status VARCHAR(32),
    tx_hash VARCHAR(66),
    metadata TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_seller_id ON purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_timestamp ON purchases(timestamp);

-- Comments for purchases
COMMENT ON TABLE purchases IS 'Tracks marketplace purchase transactions between buyers and sellers';
COMMENT ON COLUMN purchases.status IS 'Purchase status: pending, completed, disputed, refunded, cancelled';
COMMENT ON COLUMN purchases.escrow_id IS 'Smart contract escrow identifier for secure transactions';
COMMENT ON COLUMN purchases.dispute_status IS 'Dispute resolution status if purchase is disputed';
COMMENT ON COLUMN purchases.metadata IS 'JSON string with additional purchase details';

-- =================================================================================================

-- Table 4: Wallet Activity
-- Purpose: Track raw wallet events and blockchain activity
CREATE TABLE IF NOT EXISTS wallet_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(66) NOT NULL,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(66),
    amount NUMERIC(30, 18),
    token VARCHAR(64),
    chain_id INTEGER,
    metadata TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_activity
CREATE INDEX IF NOT EXISTS idx_wallet_activity_wallet ON wallet_activity(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_user_id ON wallet_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_type ON wallet_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_wallet_activity_timestamp ON wallet_activity(timestamp);

-- Comments for wallet_activity
COMMENT ON TABLE wallet_activity IS 'Tracks raw blockchain wallet activity and events';
COMMENT ON COLUMN wallet_activity.activity_type IS 'Activity type: TRANSFER_IN, TRANSFER_OUT, VOTE, STAKE, etc.';
COMMENT ON COLUMN wallet_activity.user_id IS 'Optional link to user if wallet ownership is known';
COMMENT ON COLUMN wallet_activity.chain_id IS 'Blockchain network ID (1=Ethereum Mainnet, 11155111=Sepolia)';

-- =================================================================================================

-- Table 5: Risk Flags
-- Purpose: Store risk scores and security flags for user accounts
CREATE TABLE IF NOT EXISTS risk_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    flag_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    score INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for risk_flags
CREATE INDEX IF NOT EXISTS idx_risk_flags_user_id ON risk_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_severity ON risk_flags(severity);
CREATE INDEX IF NOT EXISTS idx_risk_flags_status ON risk_flags(status);
CREATE INDEX IF NOT EXISTS idx_risk_flags_created_at ON risk_flags(created_at);

-- Comments for risk_flags
COMMENT ON TABLE risk_flags IS 'Stores security risk flags and scores for user monitoring';
COMMENT ON COLUMN risk_flags.flag_type IS 'Risk type: High Transaction Velocity, Suspicious Wallet Cluster, etc.';
COMMENT ON COLUMN risk_flags.severity IS 'Risk severity level: low, medium, high, critical';
COMMENT ON COLUMN risk_flags.score IS 'Numerical risk score contribution (higher = more risky)';
COMMENT ON COLUMN risk_flags.status IS 'Flag status: active, resolved, ignored';
COMMENT ON COLUMN risk_flags.metadata IS 'JSON string with supporting evidence and details';

-- =================================================================================================

-- Table 6: Audit Logs
-- Purpose: Immutable log of critical actions for compliance and security
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    payload TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Comments for audit_logs
COMMENT ON TABLE audit_logs IS 'Immutable audit trail of critical system actions for compliance';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action (actor)';
COMMENT ON COLUMN audit_logs.action IS 'Action performed: CREATE_USER, UPDATE_PRODUCT, DELETE_POST, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected: user, product, post, etc.';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the specific resource affected';
COMMENT ON COLUMN audit_logs.payload IS 'JSON string of changes, before/after values, or action details';

-- =================================================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =================================================================================================

-- Trigger for user_transactions.updated_at
CREATE OR REPLACE FUNCTION update_user_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_transactions_updated_at
    BEFORE UPDATE ON user_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_transactions_updated_at();

-- Trigger for purchases.updated_at
CREATE OR REPLACE FUNCTION update_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_purchases_updated_at();

-- Trigger for risk_flags.updated_at
CREATE OR REPLACE FUNCTION update_risk_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_risk_flags_updated_at
    BEFORE UPDATE ON risk_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_risk_flags_updated_at();

-- =================================================================================================
-- DATA RETENTION POLICIES (Optional - Uncomment if needed)
-- =================================================================================================

-- Automatically archive old user_behavior_logs (older than 90 days)
-- CREATE OR REPLACE FUNCTION archive_old_behavior_logs()
-- RETURNS void AS $$
-- BEGIN
--     DELETE FROM user_behavior_logs
--     WHERE created_at < NOW() - INTERVAL '90 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- Create a scheduled job to run monthly (requires pg_cron extension)
-- SELECT cron.schedule('archive-behavior-logs', '0 2 1 * *', 'SELECT archive_old_behavior_logs()');

-- =================================================================================================
-- VALIDATION CONSTRAINTS
-- =================================================================================================

-- Ensure severity is valid
ALTER TABLE risk_flags
    ADD CONSTRAINT check_risk_severity
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Ensure status is valid
ALTER TABLE risk_flags
    ADD CONSTRAINT check_risk_status
    CHECK (status IN ('active', 'resolved', 'ignored'));

-- Ensure purchase status is valid
ALTER TABLE purchases
    ADD CONSTRAINT check_purchase_status
    CHECK (status IN ('pending', 'completed', 'disputed', 'refunded', 'cancelled'));

-- Ensure transaction status is valid
ALTER TABLE user_transactions
    ADD CONSTRAINT check_transaction_status
    CHECK (status IN ('pending', 'confirmed', 'failed'));

-- Ensure price is positive
ALTER TABLE purchases
    ADD CONSTRAINT check_purchase_price_positive
    CHECK (price > 0);

-- =================================================================================================
-- GRANT PERMISSIONS (Adjust based on your user roles)
-- =================================================================================================

-- Grant read/write access to backend service user
-- GRANT SELECT, INSERT, UPDATE ON user_behavior_logs TO linkdao_backend;
-- GRANT SELECT, INSERT, UPDATE ON user_transactions TO linkdao_backend;
-- GRANT SELECT, INSERT, UPDATE ON purchases TO linkdao_backend;
-- GRANT SELECT, INSERT, UPDATE ON wallet_activity TO linkdao_backend;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON risk_flags TO linkdao_backend;
-- GRANT SELECT, INSERT ON audit_logs TO linkdao_backend; -- INSERT only, no UPDATE/DELETE

-- Grant read-only access to analytics user
-- GRANT SELECT ON user_behavior_logs TO linkdao_analytics;
-- GRANT SELECT ON user_transactions TO linkdao_analytics;
-- GRANT SELECT ON purchases TO linkdao_analytics;
-- GRANT SELECT ON wallet_activity TO linkdao_analytics;

-- =================================================================================================
-- ROLLBACK SCRIPT (Run this to undo the migration)
-- =================================================================================================

-- To rollback this migration, uncomment and run:
-- DROP TRIGGER IF EXISTS trigger_update_user_transactions_updated_at ON user_transactions;
-- DROP TRIGGER IF EXISTS trigger_update_purchases_updated_at ON purchases;
-- DROP TRIGGER IF EXISTS trigger_update_risk_flags_updated_at ON risk_flags;
-- DROP FUNCTION IF EXISTS update_user_transactions_updated_at();
-- DROP FUNCTION IF EXISTS update_purchases_updated_at();
-- DROP FUNCTION IF EXISTS update_risk_flags_updated_at();
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TABLE IF EXISTS risk_flags;
-- DROP TABLE IF EXISTS wallet_activity;
-- DROP TABLE IF EXISTS purchases;
-- DROP TABLE IF EXISTS user_transactions;
-- DROP TABLE IF EXISTS user_behavior_logs;

-- =================================================================================================
-- VERIFICATION QUERIES
-- =================================================================================================

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_behavior_logs',
    'user_transactions',
    'purchases',
    'wallet_activity',
    'risk_flags',
    'audit_logs'
  )
ORDER BY table_name;

-- Verify indexes were created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'user_behavior_logs',
    'user_transactions',
    'purchases',
    'wallet_activity',
    'risk_flags',
    'audit_logs'
  )
ORDER BY tablename, indexname;

-- Verify constraints
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
    'user_behavior_logs'::regclass,
    'user_transactions'::regclass,
    'purchases'::regclass,
    'wallet_activity'::regclass,
    'risk_flags'::regclass,
    'audit_logs'::regclass
)
ORDER BY table_name, constraint_name;

-- =================================================================================================
-- SAMPLE DATA (For testing - remove in production)
-- =================================================================================================

-- Insert sample behavior log
-- INSERT INTO user_behavior_logs (user_id, event_type, metadata, session_id, path)
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     'VIEW_PRODUCT',
--     '{"product_id": "123", "duration_ms": 5000}',
--     'session_abc123',
--     '/marketplace/product/123'
-- );

-- Insert sample transaction
-- INSERT INTO user_transactions (user_id, tx_hash, chain, event_type, token, amount, status)
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     '0x1234567890123456789012345678901234567890123456789012345678901234',
--     'ethereum',
--     'TRANSFER',
--     'LDAO',
--     100.50,
--     'confirmed'
-- );

-- =================================================================================================
-- MIGRATION COMPLETE
-- =================================================================================================

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 0009_create_user_monitoring_system completed successfully';
    RAISE NOTICE 'Tables created: 6 (user_behavior_logs, user_transactions, purchases, wallet_activity, risk_flags, audit_logs)';
    RAISE NOTICE 'Indexes created: 24';
    RAISE NOTICE 'Triggers created: 3';
    RAISE NOTICE 'Constraints added: 5';
END $$;
