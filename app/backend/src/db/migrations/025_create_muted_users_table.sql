-- Migration: 025 - Create muted_users table
-- Description: Track which users have muted other users

CREATE TABLE IF NOT EXISTS muted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who muted whom
  muter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Reason (optional)
  reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT muted_users_unique UNIQUE (muter_id, muted_id),
  CONSTRAINT muted_users_self_check CHECK (muter_id != muted_id) -- Can't mute yourself
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_muted_users_muter_id ON muted_users(muter_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_muted_id ON muted_users(muted_id);
CREATE INDEX IF NOT EXISTS idx_muted_users_created_at ON muted_users(created_at DESC);

COMMENT ON TABLE muted_users IS 'Tracks which users have muted other users';
COMMENT ON COLUMN muted_users.muter_id IS 'The user who performed the mute action';
COMMENT ON COLUMN muted_users.muted_id IS 'The user who was muted';
COMMENT ON COLUMN muted_users.reason IS 'Optional reason for muting (for user notes)';
