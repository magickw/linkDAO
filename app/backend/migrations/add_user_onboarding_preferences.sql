-- Add user_onboarding_preferences table for storing user interests and content preferences
-- This table supports personalized content recommendations for new users

-- Enable uuid-ossp extension if not already enabled (for older PostgreSQL versions)
-- For PostgreSQL 13+, gen_random_uuid() is built-in
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS user_onboarding_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_categories TEXT[], -- e.g. ARRAY['defi', 'nft', 'dao', 'gaming']
  preferred_tags TEXT[], -- e.g. ARRAY['ethereum', 'trading', 'governance', 'art']
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  skip_onboarding BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_completed ON user_onboarding_preferences(onboarding_completed);

-- Add unique constraint to ensure one preference record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_onboarding_unique_user ON user_onboarding_preferences(user_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_onboarding_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_onboarding_preferences_updated_at
  BEFORE UPDATE ON user_onboarding_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_onboarding_preferences_updated_at();
