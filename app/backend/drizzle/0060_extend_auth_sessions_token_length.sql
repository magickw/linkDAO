-- Extend auth_sessions token column lengths for JWT tokens
-- JWT tokens can exceed 255 characters, causing PostgreSQL error code 22001 (string data right truncation)
-- This migration extends session_token and refresh_token from VARCHAR(255) to VARCHAR(512)

-- Alter session_token column
ALTER TABLE auth_sessions
ALTER COLUMN session_token TYPE VARCHAR(512);

-- Alter refresh_token column
ALTER TABLE auth_sessions
ALTER COLUMN refresh_token TYPE VARCHAR(512);

-- Add comment explaining the change
COMMENT ON COLUMN auth_sessions.session_token IS 'JWT session token (extended to 512 chars to accommodate full JWT length)';
COMMENT ON COLUMN auth_sessions.refresh_token IS 'JWT refresh token (extended to 512 chars to accommodate full JWT length)';
