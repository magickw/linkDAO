-- Bridge Monitoring System Schema
-- This migration creates tables for tracking cross-chain bridge transactions and events

-- Bridge transactions table
CREATE TABLE IF NOT EXISTS "bridge_transactions" (
    "id" VARCHAR(255) PRIMARY KEY,
    "nonce" INTEGER NOT NULL,
    "user" VARCHAR(42) NOT NULL,
    "amount" VARCHAR(78) NOT NULL, -- Support for large numbers as strings
    "source_chain" INTEGER NOT NULL,
    "destination_chain" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    "tx_hash" VARCHAR(66),
    "fee" VARCHAR(78) NOT NULL,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP,
    "validator_count" INTEGER NOT NULL DEFAULT 0,
    "required_validators" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bridge events table
CREATE TABLE IF NOT EXISTS "bridge_events" (
    "id" VARCHAR(255) PRIMARY KEY,
    "transaction_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "block_number" INTEGER NOT NULL,
    "tx_hash" VARCHAR(66) NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bridge metrics table
CREATE TABLE IF NOT EXISTS "bridge_metrics" (
    "id" VARCHAR(255) PRIMARY KEY,
    "timestamp" TIMESTAMP NOT NULL,
    "total_transactions" INTEGER NOT NULL DEFAULT 0,
    "total_volume" VARCHAR(78) NOT NULL DEFAULT '0',
    "total_fees" VARCHAR(78) NOT NULL DEFAULT '0',
    "success_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "average_completion_time" INTEGER NOT NULL DEFAULT 0, -- in milliseconds
    "active_validators" INTEGER NOT NULL DEFAULT 0,
    "chain_metrics" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bridge validator performance table
CREATE TABLE IF NOT EXISTS "bridge_validator_performance" (
    "id" VARCHAR(255) PRIMARY KEY,
    "validator_address" VARCHAR(42) NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "total_validations" INTEGER NOT NULL DEFAULT 0,
    "successful_validations" INTEGER NOT NULL DEFAULT 0,
    "failed_validations" INTEGER NOT NULL DEFAULT 0,
    "reputation_score" INTEGER NOT NULL DEFAULT 100,
    "stake_amount" VARCHAR(78) NOT NULL DEFAULT '0',
    "last_activity" TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(validator_address, chain_id)
);

-- Bridge alerts table
CREATE TABLE IF NOT EXISTS "bridge_alerts" (
    "id" VARCHAR(255) PRIMARY KEY,
    "alert_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "chain_id" INTEGER,
    "transaction_id" VARCHAR(255),
    "validator_address" VARCHAR(42),
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP,
    "resolved_by" VARCHAR(42),
    "metadata" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bridge chain status table
CREATE TABLE IF NOT EXISTS "bridge_chain_status" (
    "id" VARCHAR(255) PRIMARY KEY,
    "chain_id" INTEGER NOT NULL UNIQUE,
    "chain_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_block_processed" INTEGER NOT NULL DEFAULT 0,
    "last_health_check" TIMESTAMP,
    "is_healthy" BOOLEAN NOT NULL DEFAULT true,
    "rpc_url" VARCHAR(255) NOT NULL,
    "bridge_address" VARCHAR(42) NOT NULL,
    "validator_address" VARCHAR(42) NOT NULL,
    "total_locked" VARCHAR(78) NOT NULL DEFAULT '0',
    "total_bridged" VARCHAR(78) NOT NULL DEFAULT '0',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_nonce" ON "bridge_transactions" ("nonce");
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_user" ON "bridge_transactions" ("user");
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_status" ON "bridge_transactions" ("status");
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_timestamp" ON "bridge_transactions" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_source_chain" ON "bridge_transactions" ("source_chain");
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_destination_chain" ON "bridge_transactions" ("destination_chain");

CREATE INDEX IF NOT EXISTS "idx_bridge_events_transaction_id" ON "bridge_events" ("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_bridge_events_event_type" ON "bridge_events" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_bridge_events_timestamp" ON "bridge_events" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_bridge_events_tx_hash" ON "bridge_events" ("tx_hash");

CREATE INDEX IF NOT EXISTS "idx_bridge_metrics_timestamp" ON "bridge_metrics" ("timestamp");

CREATE INDEX IF NOT EXISTS "idx_bridge_validator_performance_validator" ON "bridge_validator_performance" ("validator_address");
CREATE INDEX IF NOT EXISTS "idx_bridge_validator_performance_chain" ON "bridge_validator_performance" ("chain_id");
CREATE INDEX IF NOT EXISTS "idx_bridge_validator_performance_active" ON "bridge_validator_performance" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_bridge_alerts_type" ON "bridge_alerts" ("alert_type");
CREATE INDEX IF NOT EXISTS "idx_bridge_alerts_severity" ON "bridge_alerts" ("severity");
CREATE INDEX IF NOT EXISTS "idx_bridge_alerts_resolved" ON "bridge_alerts" ("is_resolved");
CREATE INDEX IF NOT EXISTS "idx_bridge_alerts_created_at" ON "bridge_alerts" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_bridge_chain_status_chain_id" ON "bridge_chain_status" ("chain_id");
CREATE INDEX IF NOT EXISTS "idx_bridge_chain_status_active" ON "bridge_chain_status" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_bridge_chain_status_healthy" ON "bridge_chain_status" ("is_healthy");

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bridge_transactions_updated_at 
    BEFORE UPDATE ON bridge_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bridge_validator_performance_updated_at 
    BEFORE UPDATE ON bridge_validator_performance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bridge_alerts_updated_at 
    BEFORE UPDATE ON bridge_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bridge_chain_status_updated_at 
    BEFORE UPDATE ON bridge_chain_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial chain configurations
INSERT INTO "bridge_chain_status" (
    "id", "chain_id", "chain_name", "is_active", "rpc_url", 
    "bridge_address", "validator_address"
) VALUES 
(
    'ethereum-mainnet', 1, 'Ethereum Mainnet', true, 
    'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    '0x0000000000000000000000000000000000000000', -- To be updated after deployment
    '0x0000000000000000000000000000000000000000'  -- To be updated after deployment
),
(
    'polygon-mainnet', 137, 'Polygon Mainnet', true,
    'https://polygon-mainnet.g.alchemy.com/v2/your-api-key',
    '0x0000000000000000000000000000000000000000', -- To be updated after deployment
    '0x0000000000000000000000000000000000000000'  -- To be updated after deployment
),
(
    'arbitrum-one', 42161, 'Arbitrum One', true,
    'https://arb-mainnet.g.alchemy.com/v2/your-api-key',
    '0x0000000000000000000000000000000000000000', -- To be updated after deployment
    '0x0000000000000000000000000000000000000000'  -- To be updated after deployment
)
ON CONFLICT (chain_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE "bridge_transactions" IS 'Stores all cross-chain bridge transactions with their current status';
COMMENT ON TABLE "bridge_events" IS 'Stores all blockchain events related to bridge operations';
COMMENT ON TABLE "bridge_metrics" IS 'Stores aggregated metrics about bridge performance and usage';
COMMENT ON TABLE "bridge_validator_performance" IS 'Tracks individual validator performance and reputation';
COMMENT ON TABLE "bridge_alerts" IS 'Stores alerts and notifications for bridge monitoring';
COMMENT ON TABLE "bridge_chain_status" IS 'Tracks the status and configuration of each supported chain';

COMMENT ON COLUMN "bridge_transactions"."amount" IS 'Token amount in wei as string to handle large numbers';
COMMENT ON COLUMN "bridge_transactions"."fee" IS 'Bridge fee in wei as string to handle large numbers';
COMMENT ON COLUMN "bridge_transactions"."validator_count" IS 'Number of validators who have signed this transaction';
COMMENT ON COLUMN "bridge_transactions"."required_validators" IS 'Number of validators required for completion';

COMMENT ON COLUMN "bridge_events"."data" IS 'JSON data containing event-specific information';
COMMENT ON COLUMN "bridge_metrics"."chain_metrics" IS 'JSON object containing per-chain metrics';
COMMENT ON COLUMN "bridge_validator_performance"."reputation_score" IS 'Validator reputation score (0-100)';
COMMENT ON COLUMN "bridge_alerts"."metadata" IS 'JSON metadata specific to the alert type';