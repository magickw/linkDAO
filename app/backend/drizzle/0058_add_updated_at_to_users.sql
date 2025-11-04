-- Add updated_at column to users table
-- This migration adds the missing updated_at column to the users table

ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Add a comment to indicate the purpose of this column
COMMENT ON COLUMN users.updated_at IS 'Timestamp of last update to user record';

-- Create an index on the updated_at column for better query performance
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);