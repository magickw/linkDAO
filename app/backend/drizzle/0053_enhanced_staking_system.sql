-- Enhanced Staking System Schema
-- This migration adds tables for the enhanced staking system with flexible and fixed-term options

-- Staking tiers configuration table
CREATE TABLE IF NOT EXISTS "staking_tiers" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "lock_period" INTEGER NOT NULL DEFAULT 0, -- in seconds, 0 for flexible
  "base_apr_rate" INTEGER NOT NULL, -- basis points (e.g., 500 = 5%)
  "premium_bonus_rate" INTEGER NOT NULL DEFAULT 0, -- additional APR for premium members
  "min_stake_amount" VARCHAR(50) NOT NULL, -- in wei as string
  "max_stake_amount" VARCHAR(50) DEFAULT NULL, -- in wei as string, NULL for unlimited
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "allows_auto_compound" BOOLEAN NOT NULL DEFAULT false,
  "early_withdrawal_penalty" INTEGER NOT NULL DEFAULT 0, -- basis points
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual staking positions
CREATE TABLE IF NOT EXISTS "staking_positions" (
  "id" VARCHAR(100) PRIMARY KEY,
  "user_id" VARCHAR(100) NOT NULL,
  "wallet_address" VARCHAR(42) NOT NULL,
  "amount" VARCHAR(50) NOT NULL, -- in wei as string
  "start_time" TIMESTAMP NOT NULL,
  "lock_period" INTEGER NOT NULL, -- in seconds
  "apr_rate" INTEGER NOT NULL, -- effective APR including premium bonus
  "last_reward_claim" TIMESTAMP NOT NULL,
  "accumulated_rewards" VARCHAR(50) NOT NULL DEFAULT '0',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_auto_compound" BOOLEAN NOT NULL DEFAULT false,
  "is_fixed_term" BOOLEAN NOT NULL DEFAULT false,
  "tier_id" INTEGER NOT NULL REFERENCES "staking_tiers"("id"),
  "contract_address" VARCHAR(42) NOT NULL,
  "transaction_hash" VARCHAR(66) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User staking summary information
CREATE TABLE IF NOT EXISTS "user_staking_info" (
  "user_id" VARCHAR(100) PRIMARY KEY,
  "total_staked" VARCHAR(50) NOT NULL DEFAULT '0',
  "total_rewards" VARCHAR(50) NOT NULL DEFAULT '0',
  "active_positions" INTEGER NOT NULL DEFAULT 0,
  "is_premium_member" BOOLEAN NOT NULL DEFAULT false,
  "premium_member_since" TIMESTAMP DEFAULT NULL,
  "last_activity_time" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staking events log for audit trail
CREATE TABLE IF NOT EXISTS "staking_events" (
  "id" SERIAL PRIMARY KEY,
  "user_id" VARCHAR(100) NOT NULL,
  "position_id" VARCHAR(100) DEFAULT NULL,
  "event_type" VARCHAR(50) NOT NULL, -- 'stake', 'unstake', 'claim_rewards', 'auto_compound', 'partial_unstake'
  "amount" VARCHAR(50) NOT NULL,
  "penalty_amount" VARCHAR(50) DEFAULT '0',
  "transaction_hash" VARCHAR(66) NOT NULL,
  "block_number" BIGINT DEFAULT NULL,
  "gas_used" BIGINT DEFAULT NULL,
  "gas_price" VARCHAR(50) DEFAULT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auto-compound queue for batch processing
CREATE TABLE IF NOT EXISTS "auto_compound_queue" (
  "id" SERIAL PRIMARY KEY,
  "position_id" VARCHAR(100) NOT NULL REFERENCES "staking_positions"("id"),
  "user_id" VARCHAR(100) NOT NULL,
  "reward_amount" VARCHAR(50) NOT NULL,
  "scheduled_time" TIMESTAMP NOT NULL,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP DEFAULT NULL,
  "transaction_hash" VARCHAR(66) DEFAULT NULL,
  "error_message" TEXT DEFAULT NULL,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_staking_positions_user_id" ON "staking_positions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_staking_positions_active" ON "staking_positions"("is_active");
CREATE INDEX IF NOT EXISTS "idx_staking_positions_tier_id" ON "staking_positions"("tier_id");
CREATE INDEX IF NOT EXISTS "idx_staking_positions_wallet" ON "staking_positions"("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_staking_positions_auto_compound" ON "staking_positions"("is_auto_compound") WHERE "is_auto_compound" = true;

CREATE INDEX IF NOT EXISTS "idx_staking_events_user_id" ON "staking_events"("user_id");
CREATE INDEX IF NOT EXISTS "idx_staking_events_type" ON "staking_events"("event_type");
CREATE INDEX IF NOT EXISTS "idx_staking_events_created_at" ON "staking_events"("created_at");

CREATE INDEX IF NOT EXISTS "idx_auto_compound_queue_scheduled" ON "auto_compound_queue"("scheduled_time") WHERE "processed" = false;
CREATE INDEX IF NOT EXISTS "idx_auto_compound_queue_user" ON "auto_compound_queue"("user_id");

CREATE INDEX IF NOT EXISTS "idx_user_staking_info_premium" ON "user_staking_info"("is_premium_member") WHERE "is_premium_member" = true;

-- Insert default staking tiers
INSERT INTO "staking_tiers" (
  "name", 
  "lock_period", 
  "base_apr_rate", 
  "premium_bonus_rate", 
  "min_stake_amount", 
  "allows_auto_compound", 
  "early_withdrawal_penalty"
) VALUES 
  ('Flexible Staking', 0, 500, 200, '100000000000000000000', true, 0), -- 5% base, 2% premium bonus, min 100 LDAO
  ('Short Term Fixed', 2592000, 800, 300, '500000000000000000000', true, 1000), -- 30 days, 8% base, 3% premium bonus, min 500 LDAO, 10% penalty
  ('Medium Term Fixed', 7776000, 1200, 400, '1000000000000000000000', true, 1500), -- 90 days, 12% base, 4% premium bonus, min 1000 LDAO, 15% penalty
  ('Long Term Fixed', 15552000, 1600, 500, '2000000000000000000000', true, 2000), -- 180 days, 16% base, 5% premium bonus, min 2000 LDAO, 20% penalty
  ('Premium Long Term', 31536000, 2000, 800, '5000000000000000000000', true, 2500); -- 365 days, 20% base, 8% premium bonus, min 5000 LDAO, 25% penalty

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_staking_tiers_updated_at BEFORE UPDATE ON "staking_tiers" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staking_positions_updated_at BEFORE UPDATE ON "staking_positions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_staking_info_updated_at BEFORE UPDATE ON "user_staking_info" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for active staking positions with tier information
CREATE OR REPLACE VIEW "active_staking_positions" AS
SELECT 
  sp.*,
  st.name as tier_name,
  st.lock_period as tier_lock_period,
  st.allows_auto_compound as tier_allows_auto_compound,
  st.early_withdrawal_penalty as tier_penalty,
  CASE 
    WHEN sp.is_fixed_term = true AND (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM sp.start_time)) < sp.lock_period 
    THEN true 
    ELSE false 
  END as is_locked,
  CASE 
    WHEN sp.is_fixed_term = true 
    THEN sp.start_time + INTERVAL '1 second' * sp.lock_period 
    ELSE NULL 
  END as unlock_time,
  EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM sp.last_reward_claim) as seconds_since_last_claim
FROM "staking_positions" sp
JOIN "staking_tiers" st ON sp.tier_id = st.id
WHERE sp.is_active = true;

-- Create view for user staking analytics
CREATE OR REPLACE VIEW "user_staking_analytics" AS
SELECT 
  usi.user_id,
  usi.total_staked,
  usi.total_rewards,
  usi.active_positions,
  usi.is_premium_member,
  usi.premium_member_since,
  COUNT(CASE WHEN asp.is_auto_compound = true THEN 1 END) as auto_compound_positions,
  COUNT(CASE WHEN asp.is_fixed_term = true THEN 1 END) as fixed_term_positions,
  COUNT(CASE WHEN asp.is_fixed_term = false THEN 1 END) as flexible_positions,
  AVG(asp.apr_rate) as average_apr_rate,
  MIN(asp.unlock_time) as next_unlock_time,
  SUM(CASE WHEN asp.seconds_since_last_claim >= 86400 THEN 1 ELSE 0 END) as positions_ready_for_claim
FROM "user_staking_info" usi
LEFT JOIN "active_staking_positions" asp ON usi.user_id = asp.user_id
GROUP BY usi.user_id, usi.total_staked, usi.total_rewards, usi.active_positions, usi.is_premium_member, usi.premium_member_since;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;