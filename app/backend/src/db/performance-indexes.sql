-- Performance optimization indexes for communities
-- Run these commands on your database

-- Trending communities performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_stats_trending 
ON community_stats(trending_score DESC, community_id);

-- Community listing performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_public_category 
ON communities(is_public, category, member_count DESC) 
WHERE is_public = true;

-- Posts by community performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_community_created 
ON posts(community_id, created_at DESC);

-- Community members activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_activity 
ON community_members(community_id, is_active, last_activity_at DESC) 
WHERE is_active = true;

-- Search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_search 
ON communities USING gin(to_tsvector('english', display_name || ' ' || description));

-- Governance proposals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_community 
ON community_governance_proposals(community_id, status, created_at DESC);

-- Moderation actions audit
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moderation_actions_community 
ON community_moderation_actions(community_id, created_at DESC);