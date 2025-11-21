-- Create user_analytics table
CREATE TABLE IF NOT EXISTS "user_analytics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id"),
    "session_id" VARCHAR(255),
    "event_type" VARCHAR(100) NOT NULL,
    "event_data" JSONB,
    "page_url" TEXT,
    "user_agent" TEXT,
    "ip_address" INET,
    "country" VARCHAR(2),
    "city" VARCHAR(100),
    "device_type" VARCHAR(50),
    "browser" VARCHAR(50),
    "referrer" TEXT,
    "timestamp" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_user_analytics_user_id" ON "user_analytics"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_analytics_event_type" ON "user_analytics"("event_type");
CREATE INDEX IF NOT EXISTS "idx_user_analytics_timestamp" ON "user_analytics"("timestamp");
CREATE INDEX IF NOT EXISTS "idx_user_analytics_session" ON "user_analytics"("session_id");

-- Add missing columns to proposals table
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "proposer_address" VARCHAR(66);
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "category" VARCHAR(32) DEFAULT 'general';
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "quorum" DECIMAL(20,8);
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "execution_delay" INTEGER;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "requires_staking" BOOLEAN DEFAULT false;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "min_stake_to_vote" DECIMAL(20,8) DEFAULT '0';
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "targets" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "values" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "signatures" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "calldatas" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "queued_at" TIMESTAMP;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "required_majority" INTEGER DEFAULT 50;

CREATE INDEX IF NOT EXISTS "idx_proposals_category" ON "proposals"("category");
