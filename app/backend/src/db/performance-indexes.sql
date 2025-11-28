-- Performance Indexes for Communities System
-- These indexes optimize the most common queries and improve overall performance

-- Communities table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_search_gin 
ON communities USING GIN (
  to_tsvector('english', COALESCE(display_name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(tags, ''))
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_category_member_count 
ON communities(category, member_count DESC) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_created_at_public 
ON communities(created_at DESC) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_member_count 
ON communities(member_count DESC) WHERE is_public = true;

-- Community members table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_composite 
ON community_members(community_id, user_address, is_active, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_joined_at 
ON community_members(joined_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_reputation 
ON community_members(reputation DESC) WHERE is_active = true;

-- Community stats table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_stats_growth_rate 
ON community_stats(growth_rate_7d DESC, growth_rate_30d DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_stats_activity 
ON community_stats(active_members_7d DESC, posts_7d DESC);

-- Community governance proposals indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_status_time 
ON community_governance_proposals(community_id, status, voting_start_time, voting_end_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_proposals_type_created 
ON community_governance_proposals(type, created_at DESC);

-- Community governance votes indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_votes_proposal_voter 
ON community_governance_votes(proposal_id, voter_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_governance_votes_voted_at 
ON community_governance_votes(voted_at DESC);

-- Community delegations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delegations_composite 
ON community_delegations(community_id, delegator_address, delegate_address, is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_delegations_delegate_active 
ON community_delegations(delegate_address, is_active, expiry_date) WHERE is_active = true;

-- Community proxy votes indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proxy_votes_proposal_voter 
ON community_proxy_votes(proposal_id, voter_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proxy_votes_proxy_voter 
ON community_proxy_votes(proxy_address, voter_address);

-- Community subscription tiers indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_tiers_community_active 
ON community_subscription_tiers(community_id, is_active, price);

-- Community user subscriptions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_user_active 
ON community_user_subscriptions(user_address, status, expires_at) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_tier_expires 
ON community_user_subscriptions(tier_id, expires_at DESC);

-- Token-gated content indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_gated_content_community_type 
ON community_token_gated_content(community_id, gating_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_token_gated_content_post_access 
ON community_token_gated_content(post_id, access_type);

-- User content access indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_content_access_composite 
ON community_user_content_access(user_address, content_id, access_level, access_expires_at);

-- Community staking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staking_user_active 
ON community_staking(user_address, is_active, created_at DESC) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staking_community_amount 
ON community_staking(community_id, amount DESC) WHERE is_active = true;

-- Community staking rewards indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staking_rewards_user_status 
ON community_staking_rewards(user_address, status, created_at DESC);

-- Posts table community-specific indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_community_created 
ON posts(community_id, created_at DESC) WHERE moderation_status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_community_votes 
ON posts(community_id, upvotes DESC, downvotes) WHERE moderation_status = 'active';

CREATE INDEX CONCURRENTITY IF NOT EXISTS idx_posts_community_staked 
ON posts(community_id, staked_value DESC) WHERE moderation_status = 'active';

-- Comments table indexes for community posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_created 
ON comments(post_id, created_at DESC) WHERE moderation_status = 'active';

-- Quick posts indexes for community content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quick_posts_community_created 
ON quick_posts(community_id, created_at DESC) WHERE moderation_status = 'active';

-- Quick post reactions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quick_post_reactions_post_type 
ON quick_post_reactions(quick_post_id, type, created_at DESC);

-- Partial indexes for frequently filtered data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_public_recent 
ON communities(created_at DESC, member_count DESC) WHERE is_public = true AND created_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_members_active_recent 
ON community_members(joined_at DESC) WHERE is_active = true AND joined_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_voting_active 
ON community_governance_proposals(voting_end_time DESC) WHERE status = 'active' AND voting_end_time > NOW();

-- Analytics and reporting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_analytics_composite 
ON communities(category, created_at, member_count) WHERE is_public = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stats_analytics_time_series 
ON community_stats(last_calculated_at DESC, community_id);

-- Text search indexes for improved search performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_name_search 
ON communities USING gin(to_tsvector('simple', name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_display_name_search 
ON communities USING gin(to_tsvector('simple', display_name));

-- Composite index for community discovery
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_discovery 
ON communities(is_public, member_count DESC, post_count DESC, created_at DESC) 
WHERE is_public = true;

-- Index for community member count updates
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_member_count_update 
ON communities(member_count) WHERE member_count > 0;

-- Index for community activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stats_activity_tracking 
ON community_stats(community_id, last_calculated_at DESC, active_members_7d, posts_7d);

-- Index for trending communities based on stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stats_trending_composite 
ON community_stats(community_id) WHERE trending_score > 0;

-- Comment on indexes for documentation
COMMENT ON INDEX idx_communities_search_gin IS 'Full-text search index for community discovery';
COMMENT ON INDEX idx_communities_trending_score IS 'Optimizes trending communities queries';
COMMENT ON INDEX idx_community_members_composite IS 'Primary lookup for community membership operations';
COMMENT ON INDEX idx_governance_proposals_status_time IS 'Optimizes governance proposal listing and filtering';
COMMENT ON INDEX idx_delegations_composite IS 'Optimizes delegation lookup and management';
COMMENT ON INDEX idx_user_subscriptions_user_active IS 'Optimizes user subscription queries';
COMMENT ON INDEX idx_posts_community_created IS 'Optimizes community feed loading';
COMMENT ON INDEX idx_communities_discovery IS 'Composite index for community discovery algorithms';