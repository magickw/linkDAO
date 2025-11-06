-- Add missing moderation columns to posts table
-- This migration adds the moderation-related columns that are expected by the application but missing from the database

-- Add moderation_status column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(24) DEFAULT 'active';

-- Add moderation_warning column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_warning TEXT;

-- Add risk_score column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS risk_score NUMERIC(5,4) DEFAULT '0';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_moderation_status ON posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_posts_risk_score ON posts(risk_score);

-- Add comments to describe the purpose of these columns
COMMENT ON COLUMN posts.moderation_status IS 'Moderation status of the post (active, limited, pending_review, blocked)';
COMMENT ON COLUMN posts.moderation_warning IS 'Warning message for posts with moderation issues';
COMMENT ON COLUMN posts.risk_score IS 'Risk score for content moderation (0.0000 to 1.0000)';