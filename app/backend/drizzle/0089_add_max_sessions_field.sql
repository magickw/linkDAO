-- Migration 0089: Add maxSessions field to users table for concurrent session limits
-- This migration enforces a maximum number of concurrent sessions per user

-- Add maxSessions column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS max_sessions INTEGER DEFAULT 5;

-- Add comment to document the field
COMMENT ON COLUMN users.max_sessions IS 'Maximum number of concurrent active sessions allowed for this user (default: 5)';

-- Create index for performance on session queries
CREATE INDEX IF NOT EXISTS idx_users_max_sessions ON users(max_sessions);

-- Update existing users to have a default limit of 5 sessions
UPDATE users 
SET max_sessions = 5 
WHERE max_sessions IS NULL;

-- Set NOT NULL constraint after updating existing rows
ALTER TABLE users 
ALTER COLUMN max_sessions SET NOT NULL;

-- Add default value for new records
ALTER TABLE users 
ALTER COLUMN max_sessions SET DEFAULT 5;