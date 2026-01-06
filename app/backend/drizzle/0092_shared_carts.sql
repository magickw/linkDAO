-- Migration: Add shared_carts table for cart sharing functionality
-- Created: 2026-01-06

CREATE TABLE IF NOT EXISTS shared_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cart_snapshot JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_shared_carts_token ON shared_carts(share_token);
CREATE INDEX idx_shared_carts_user_id ON shared_carts(user_id);
CREATE INDEX idx_shared_carts_expires_at ON shared_carts(expires_at);

-- Add comment
COMMENT ON TABLE shared_carts IS 'Stores shareable cart snapshots with expiration';
