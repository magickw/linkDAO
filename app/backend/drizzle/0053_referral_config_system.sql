-- Referral Program Configuration System

-- Create referral configuration table
CREATE TABLE IF NOT EXISTS "referral_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "config_key" varchar(255) NOT NULL UNIQUE,
  "config_value" text NOT NULL,
  "config_type" varchar(50) DEFAULT 'string',
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for referral config
CREATE INDEX IF NOT EXISTS "idx_referral_config_key" ON "referral_config" ("config_key");
CREATE INDEX IF NOT EXISTS "idx_referral_config_active" ON "referral_config" ("is_active");

-- Insert default referral configuration values
INSERT INTO "referral_config" ("config_key", "config_value", "config_type", "description") VALUES
('referral_bonus_percentage', '10', 'number', 'Default bonus percentage for successful referrals'),
('referral_bonus_tokens', '25', 'number', 'Default token reward for successful referrals'),
('referral_code_length', '8', 'number', 'Length of generated referral codes'),
('max_referrals_per_user', '100', 'number', 'Maximum number of referrals per user'),
('referral_program_active', 'true', 'boolean', 'Whether the referral program is active'),
('referral_tiers_enabled', 'true', 'boolean', 'Whether multi-tier referrals are enabled'),
('referral_expiration_days', '365', 'number', 'Number of days before referral code expires'),
('referral_first_purchase_bonus', '50', 'number', 'Bonus tokens for first purchase via referral'),
('referral_activity_bonus_percentage', '5', 'number', 'Percentage bonus for referral activity'),
('referral_milestone_rewards', '{"5": 100, "10": 250, "25": 500, "50": 1000, "100": 2500}', 'json', 'Milestone rewards for number of referrals');

-- Create referral program settings view
CREATE OR REPLACE VIEW "referral_program_settings" AS
SELECT 
  (SELECT config_value FROM referral_config WHERE config_key = 'referral_program_active')::boolean AS program_active,
  (SELECT config_value FROM referral_config WHERE config_key = 'referral_bonus_percentage')::numeric AS bonus_percentage,
  (SELECT config_value FROM referral_config WHERE config_key = 'referral_bonus_tokens')::numeric AS bonus_tokens,
  (SELECT config_value FROM referral_config WHERE config_key = 'max_referrals_per_user')::integer AS max_referrals,
  (SELECT config_value FROM referral_config WHERE config_key = 'referral_tiers_enabled')::boolean AS tiers_enabled,
  (SELECT config_value FROM referral_config WHERE config_key = 'referral_expiration_days')::integer AS expiration_days;