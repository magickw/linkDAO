-- Migration: Add missing schema columns
-- Date: 2025-12-17
-- Description: Adds reason, resolution, and referralConfig table to fix TypeScript warnings

-- ============================================================================
-- 1. Add 'reason' column to returns table
-- ============================================================================
ALTER TABLE returns 
ADD COLUMN IF NOT EXISTS reason VARCHAR(255);

COMMENT ON COLUMN returns.reason IS 'Alias for returnReason for analytics queries';

-- ============================================================================
-- 2. Add 'resolution' column to content_reports table
-- ============================================================================
ALTER TABLE content_reports 
ADD COLUMN IF NOT EXISTS resolution TEXT;

COMMENT ON COLUMN content_reports.resolution IS 'Resolution details for closed reports';

-- ============================================================================
-- 3. Create referralConfig table
-- ============================================================================
CREATE TABLE IF NOT EXISTS referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on config_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_referral_config_config_key 
ON referral_config(config_key);

COMMENT ON TABLE referral_config IS 'Referral program configuration settings';
COMMENT ON COLUMN referral_config.config_key IS 'Unique configuration key';
COMMENT ON COLUMN referral_config.config_value IS 'Configuration value stored as text';
COMMENT ON COLUMN referral_config.config_type IS 'Type of value: string, number, boolean, or json';

-- ============================================================================
-- 4. Insert default referral configuration values
-- ============================================================================
INSERT INTO referral_config (config_key, config_value, config_type, description, is_active)
VALUES 
  ('program_active', 'true', 'boolean', 'Whether the referral program is currently active', true),
  ('referral_bonus_tokens', '25', 'number', 'Number of tokens awarded for successful referrals', true),
  ('referral_code_length', '8', 'number', 'Length of generated referral codes', true),
  ('max_referrals_per_user', '100', 'number', 'Maximum number of referrals per user', true),
  ('tiers_enabled', 'true', 'boolean', 'Whether referral tiers are enabled', true),
  ('referral_expiration_days', '365', 'number', 'Number of days before referral links expire', true),
  ('milestone_rewards', '{"10": 50, "25": 150, "50": 350, "100": 1000}', 'json', 'Bonus tokens awarded at referral milestones', true)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 5. Verification queries (optional - comment out in production)
-- ============================================================================

-- Verify returns.reason column exists
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'returns' AND column_name = 'reason';

-- Verify content_reports.resolution column exists
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'content_reports' AND column_name = 'resolution';

-- Verify referral_config table exists
-- SELECT table_name, table_type 
-- FROM information_schema.tables 
-- WHERE table_name = 'referral_config';

-- Verify referral_config has data
-- SELECT config_key, config_value, config_type, is_active 
-- FROM referral_config 
-- ORDER BY config_key;

-- ============================================================================
-- Rollback script (save separately if needed)
-- ============================================================================
-- ALTER TABLE returns DROP COLUMN IF EXISTS reason;
-- ALTER TABLE content_reports DROP COLUMN IF EXISTS resolution;
-- DROP TABLE IF EXISTS referral_config;
