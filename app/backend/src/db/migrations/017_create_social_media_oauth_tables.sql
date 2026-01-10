-- Migration: Create Social Media OAuth Tables
-- Description: Adds tables for OAuth connections (Twitter, Facebook, LinkedIn, Threads),
--              cross-posted content tracking, and OAuth state management
-- Date: 2026-01-10

-- ============================================================================
-- Table 1: social_media_connections
-- Stores OAuth tokens and connection info for each user's social media accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_media_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL, -- 'twitter' | 'facebook' | 'linkedin' | 'threads'

    -- Encrypted OAuth tokens (using encryptionService)
    access_token TEXT NOT NULL, -- Encrypted
    refresh_token TEXT, -- Encrypted (nullable - not all platforms use it)
    token_expiry TIMESTAMP,

    -- Platform-specific user info
    platform_user_id VARCHAR(255) NOT NULL,
    platform_username VARCHAR(255),
    platform_display_name VARCHAR(255),
    platform_avatar_url TEXT,

    -- OAuth metadata
    scopes TEXT, -- JSON array of granted scopes

    -- Status tracking
    status VARCHAR(32) DEFAULT 'active', -- 'active' | 'expired' | 'revoked' | 'error'
    last_error TEXT,
    last_used_at TIMESTAMP,
    connected_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for social_media_connections
CREATE INDEX IF NOT EXISTS idx_social_connections_user_platform
    ON social_media_connections(user_id, platform);

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_platform
    ON social_media_connections(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_social_connections_status
    ON social_media_connections(status);

-- ============================================================================
-- Table 2: social_media_posts
-- Tracks cross-posted content for analytics and retry logic
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_media_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id UUID NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES social_media_connections(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,

    -- External post reference
    external_post_id VARCHAR(255),
    external_post_url TEXT,

    -- Content sent
    content_sent TEXT NOT NULL,
    media_sent TEXT, -- JSON array of media URLs/IDs

    -- Status
    post_status VARCHAR(32) DEFAULT 'pending', -- 'pending' | 'posted' | 'failed' | 'deleted'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Timestamps
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for social_media_posts
CREATE INDEX IF NOT EXISTS idx_social_posts_status_id
    ON social_media_posts(status_id);

CREATE INDEX IF NOT EXISTS idx_social_posts_connection_id
    ON social_media_posts(connection_id);

CREATE INDEX IF NOT EXISTS idx_social_posts_post_status
    ON social_media_posts(post_status);

-- ============================================================================
-- Table 3: oauth_states
-- Temporary storage for OAuth state parameters (CSRF protection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(128) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,
    code_verifier TEXT, -- For PKCE (Twitter OAuth 2.0)
    redirect_uri TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for oauth_states
CREATE INDEX IF NOT EXISTS idx_oauth_states_state
    ON oauth_states(state);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires
    ON oauth_states(expires_at);

CREATE INDEX IF NOT EXISTS idx_oauth_states_user
    ON oauth_states(user_id);

-- ============================================================================
-- Trigger: Auto-update updated_at for social_media_connections
-- ============================================================================
CREATE OR REPLACE FUNCTION update_social_media_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist (PostgreSQL 14+)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_update_social_media_connections_updated_at'
    ) THEN
        CREATE TRIGGER trigger_update_social_media_connections_updated_at
            BEFORE UPDATE ON social_media_connections
            FOR EACH ROW
            EXECUTE FUNCTION update_social_media_connections_updated_at();
    END IF;
END;
$$;

-- ============================================================================
-- Cleanup job helper: Delete expired OAuth states
-- This can be run periodically via cron or database scheduler
-- ============================================================================
-- To manually clean up expired states:
-- DELETE FROM oauth_states WHERE expires_at < NOW();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE social_media_connections IS
    'Stores OAuth connections for Twitter, Facebook, LinkedIn, and Threads. Tokens are encrypted at rest.';

COMMENT ON TABLE social_media_posts IS
    'Tracks statuses that have been cross-posted to social media platforms for analytics and retry logic.';

COMMENT ON TABLE oauth_states IS
    'Temporary storage for OAuth state parameters to prevent CSRF attacks. Entries expire after 10 minutes.';

COMMENT ON COLUMN social_media_connections.access_token IS
    'Encrypted OAuth access token using DataEncryptionService';

COMMENT ON COLUMN social_media_connections.refresh_token IS
    'Encrypted OAuth refresh token (nullable - Twitter uses PKCE, Facebook uses long-lived tokens)';

COMMENT ON COLUMN oauth_states.code_verifier IS
    'PKCE code verifier for Twitter OAuth 2.0 (base64url encoded random string)';
