-- Migration: Add Views Table
-- Created: 2025-10-18
-- Description: Adds view tracking for posts with deduplication support

-- Create views table
CREATE TABLE IF NOT EXISTS views (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  user_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_views_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS view_post_user_idx ON views(post_id, user_id);
CREATE INDEX IF NOT EXISTS view_post_created_idx ON views(post_id, created_at);

-- Add comment
COMMENT ON TABLE views IS 'Tracks post views with user and anonymous tracking';
COMMENT ON COLUMN views.user_id IS 'Nullable - allows tracking anonymous views';
COMMENT ON COLUMN views.ip_address IS 'Used for deduplication of anonymous views';
