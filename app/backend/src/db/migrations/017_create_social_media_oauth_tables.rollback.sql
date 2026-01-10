-- Rollback Migration: Drop Social Media OAuth Tables
-- Description: Removes the OAuth tables for social media integration
-- Date: 2026-01-10

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_social_media_connections_updated_at
    ON social_media_connections;

DROP FUNCTION IF EXISTS update_social_media_connections_updated_at();

-- Drop tables in reverse order (due to foreign key constraints)
DROP TABLE IF EXISTS oauth_states;
DROP TABLE IF EXISTS social_media_posts;
DROP TABLE IF EXISTS social_media_connections;
