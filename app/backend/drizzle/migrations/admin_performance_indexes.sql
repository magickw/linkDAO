-- Performance optimization indexes for admin operations
-- Created: 2025-10-27

-- ============================================================================
-- User Management Indexes
-- ============================================================================

-- Composite index for admin user queries (role + status + created date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_admin_queries
  ON users(role, created_at DESC)
  WHERE role IN ('super_admin', 'admin', 'moderator', 'analyst');

-- Index for user search by email/handle
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search
  ON users USING gin(to_tsvector('english', COALESCE(handle, '') || ' ' || COALESCE(billing_first_name, '') || ' ' || COALESCE(billing_last_name, '')));

-- ============================================================================
-- Content Moderation Indexes
-- ============================================================================

-- Index for pending moderation queue (if moderation_status column exists on posts)
-- Note: Adjust column name based on actual schema
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_moderation_pending
  ON posts(created_at DESC)
  WHERE title IS NOT NULL; -- Using title as proxy for active posts

-- Index for community-based moderation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_community_moderation
  ON posts(community_id, created_at DESC)
  WHERE community_id IS NOT NULL;

-- Index for author moderation history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_history
  ON posts(author_id, created_at DESC);

-- ============================================================================
-- Analytics and Reporting Indexes
-- ============================================================================

-- Index for date-range analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_analytics_date
  ON posts(created_at DESC)
  INCLUDE (author_id, community_id);

-- Index for reaction analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_analytics
  ON reactions(created_at DESC, type)
  INCLUDE (post_id, user_id, amount);

-- Index for view analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_views_analytics
  ON views(created_at DESC)
  INCLUDE (post_id, user_id);

-- ============================================================================
-- Marketplace Admin Indexes (if marketplace tables exist)
-- ============================================================================

-- Note: Add these if marketplace_users and seller_verifications tables exist
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_users_status
--   ON marketplace_users(status, created_at DESC);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_verifications_pending
--   ON seller_verifications(verification_status, submitted_at DESC)
--   WHERE verification_status = 'pending';

-- ============================================================================
-- Activity Tracking Indexes
-- ============================================================================

-- Index for user activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_date
  ON posts(author_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reaction_activity_date
  ON reactions(user_id, created_at DESC);

-- ============================================================================
-- Full-text Search Indexes
-- ============================================================================

-- Full-text search on post content (if contentCid stores text, otherwise skip)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_fulltext
--   ON posts USING gin(to_tsvector('english', title || ' ' || COALESCE(content_cid, '')));

-- ============================================================================
-- Admin Dashboard Metrics - Materialized View
-- ============================================================================

-- Create materialized view for fast dashboard metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_dashboard_metrics AS
SELECT
  (SELECT COUNT(*) FROM users WHERE role IN ('super_admin', 'admin', 'moderator', 'analyst')) as total_admins,
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as new_users_24h,
  (SELECT COUNT(*) FROM posts WHERE created_at > NOW() - INTERVAL '24 hours') as new_posts_24h,
  (SELECT COUNT(*) FROM reactions WHERE created_at > NOW() - INTERVAL '24 hours') as new_reactions_24h,
  (SELECT COUNT(*) FROM views WHERE created_at > NOW() - INTERVAL '24 hours') as total_views_24h,
  NOW() as last_updated;

-- Create unique index on materialized view (required for CONCURRENTLY refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_dashboard_metrics_unique
  ON admin_dashboard_metrics(last_updated);

-- Create function to refresh metrics automatically
CREATE OR REPLACE FUNCTION refresh_admin_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_dashboard_metrics;
END;
$$;

-- ============================================================================
-- Partial Indexes for Common Admin Filters
-- ============================================================================

-- Index for token-gated posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_token_gated
  ON posts(is_token_gated, created_at DESC)
  WHERE is_token_gated = true;

-- Index for posts with polls
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_with_polls
  ON posts(poll_id, created_at DESC)
  WHERE poll_id IS NOT NULL;

-- ============================================================================
-- Cleanup Old Indexes (if they exist and are redundant)
-- ============================================================================

-- Run ANALYZE to update statistics after creating indexes
ANALYZE users;
ANALYZE posts;
ANALYZE reactions;
ANALYZE views;

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- To manually refresh dashboard metrics, run:
-- SELECT refresh_admin_metrics();

-- To check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- To find missing indexes:
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats
-- WHERE schemaname = 'public'
-- AND n_distinct > 100
-- ORDER BY abs(correlation) DESC;
