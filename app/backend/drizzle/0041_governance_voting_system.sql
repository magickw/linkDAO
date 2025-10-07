-- Enhanced governance voting system
-- Add votes table for tracking individual votes
CREATE TABLE IF NOT EXISTS "votes" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "proposal_id" INTEGER NOT NULL REFERENCES "proposals"("id") ON DELETE CASCADE,
    "voter_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "vote_choice" VARCHAR(10) NOT NULL CHECK (vote_choice IN ('yes', 'no', 'abstain')),
    "voting_power" NUMERIC(20, 8) NOT NULL DEFAULT 0,
    "delegated_power" NUMERIC(20, 8) DEFAULT 0,
    "total_power" NUMERIC(20, 8) NOT NULL DEFAULT 0,
    "transaction_hash" VARCHAR(66),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, voter_id)
);

-- Add delegation table for voting power delegation
CREATE TABLE IF NOT EXISTS "voting_delegations" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "delegator_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "delegate_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "dao_id" UUID,
    "voting_power" NUMERIC(20, 8) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    UNIQUE(delegator_id, delegate_id, dao_id)
);

-- Add voting power snapshots for historical tracking
CREATE TABLE IF NOT EXISTS "voting_power_snapshots" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "dao_id" UUID,
    "proposal_id" INTEGER REFERENCES "proposals"("id") ON DELETE CASCADE,
    "token_balance" NUMERIC(20, 8) NOT NULL DEFAULT 0,
    "staking_multiplier" NUMERIC(5, 2) DEFAULT 1.0,
    "delegated_power" NUMERIC(20, 8) DEFAULT 0,
    "total_voting_power" NUMERIC(20, 8) NOT NULL DEFAULT 0,
    "snapshot_block" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add governance settings table for DAO-specific configurations
CREATE TABLE IF NOT EXISTS "governance_settings" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "dao_id" UUID UNIQUE,
    "voting_token_address" VARCHAR(66),
    "voting_delay" INTEGER DEFAULT 86400, -- 1 day in seconds
    "voting_period" INTEGER DEFAULT 604800, -- 7 days in seconds
    "proposal_threshold" NUMERIC(20, 8) DEFAULT 1000, -- Minimum tokens to create proposal
    "quorum_percentage" INTEGER DEFAULT 10, -- Percentage of total supply needed for quorum
    "execution_delay" INTEGER DEFAULT 172800, -- 2 days in seconds
    "required_majority" INTEGER DEFAULT 50, -- Percentage needed to pass
    "allow_delegation" BOOLEAN DEFAULT true,
    "staking_enabled" BOOLEAN DEFAULT false,
    "staking_multiplier_max" NUMERIC(5, 2) DEFAULT 2.0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_votes_proposal_id" ON "votes"("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_votes_voter_id" ON "votes"("voter_id");
CREATE INDEX IF NOT EXISTS "idx_votes_created_at" ON "votes"("created_at");

CREATE INDEX IF NOT EXISTS "idx_voting_delegations_delegator" ON "voting_delegations"("delegator_id");
CREATE INDEX IF NOT EXISTS "idx_voting_delegations_delegate" ON "voting_delegations"("delegate_id");
CREATE INDEX IF NOT EXISTS "idx_voting_delegations_dao" ON "voting_delegations"("dao_id");
CREATE INDEX IF NOT EXISTS "idx_voting_delegations_active" ON "voting_delegations"("active");

CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_user" ON "voting_power_snapshots"("user_id");
CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_dao" ON "voting_power_snapshots"("dao_id");
CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_proposal" ON "voting_power_snapshots"("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_voting_power_snapshots_block" ON "voting_power_snapshots"("snapshot_block");

CREATE INDEX IF NOT EXISTS "idx_governance_settings_dao" ON "governance_settings"("dao_id");

-- Update proposals table to include vote counts
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "yes_votes" NUMERIC(20, 8) DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "no_votes" NUMERIC(20, 8) DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "abstain_votes" NUMERIC(20, 8) DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "total_votes" NUMERIC(20, 8) DEFAULT 0;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "quorum_reached" BOOLEAN DEFAULT false;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "proposer_id" UUID REFERENCES "users"("id");
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "execution_eta" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "executed_at" TIMESTAMP(3);
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

-- Add triggers to update vote counts when votes are inserted/updated/deleted
CREATE OR REPLACE FUNCTION update_proposal_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts for the proposal
    UPDATE proposals SET
        yes_votes = (
            SELECT COALESCE(SUM(total_power), 0) 
            FROM votes 
            WHERE proposal_id = COALESCE(NEW.proposal_id, OLD.proposal_id) 
            AND vote_choice = 'yes'
        ),
        no_votes = (
            SELECT COALESCE(SUM(total_power), 0) 
            FROM votes 
            WHERE proposal_id = COALESCE(NEW.proposal_id, OLD.proposal_id) 
            AND vote_choice = 'no'
        ),
        abstain_votes = (
            SELECT COALESCE(SUM(total_power), 0) 
            FROM votes 
            WHERE proposal_id = COALESCE(NEW.proposal_id, OLD.proposal_id) 
            AND vote_choice = 'abstain'
        ),
        total_votes = (
            SELECT COALESCE(SUM(total_power), 0) 
            FROM votes 
            WHERE proposal_id = COALESCE(NEW.proposal_id, OLD.proposal_id)
        )
    WHERE id = COALESCE(NEW.proposal_id, OLD.proposal_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_vote_counts_insert ON votes;
CREATE TRIGGER trigger_update_vote_counts_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_proposal_vote_counts();

DROP TRIGGER IF EXISTS trigger_update_vote_counts_update ON votes;
CREATE TRIGGER trigger_update_vote_counts_update
    AFTER UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_proposal_vote_counts();

DROP TRIGGER IF EXISTS trigger_update_vote_counts_delete ON votes;
CREATE TRIGGER trigger_update_vote_counts_delete
    AFTER DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_proposal_vote_counts();