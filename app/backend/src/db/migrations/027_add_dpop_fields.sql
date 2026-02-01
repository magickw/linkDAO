-- Migration: Add DPoP fields to social_media_connections table
-- For AT Protocol OAuth 2.0 with DPoP (Bluesky)

-- Add DPoP fields to social_media_connections
ALTER TABLE social_media_connections
ADD COLUMN IF NOT EXISTS dpop_private_key TEXT,
ADD COLUMN IF NOT EXISTS dpop_public_key_id VARCHAR(64);

-- Add metadata field to oauth_states for DPoP state
ALTER TABLE oauth_states
ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Add comments for documentation
COMMENT ON COLUMN social_media_connections.dpop_private_key IS 'Encrypted JWK for DPoP signing (used for Bluesky AT Protocol OAuth)';
COMMENT ON COLUMN social_media_connections.dpop_public_key_id IS 'Key thumbprint for DPoP key identification';
COMMENT ON COLUMN oauth_states.metadata IS 'JSON metadata for DPoP state during OAuth flow';
