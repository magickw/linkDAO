-- Enhanced Performance Indexes Migration
-- Additional indexes for optimal query performance based on common access patterns

-- Community-related indexes for social features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_community_created_at 
ON posts(community_id, created_at DESC) WHERE community_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_community 
ON posts(author_id, community_id) WHERE community_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_staked_value_desc 
ON posts(staked_value DESC) WHERE staked_value > 0;

-- Reaction system indexes for engagement queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_post_type_amount 
ON reactions(post_id, type, amount DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_user_created_at 
ON reactions(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_type_created_at 
ON reactions(type, created_at DESC);

-- Tips system indexes for social features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_to_user_created_at 
ON tips(to_user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_from_user_created_at 
ON tips(from_user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tips_post_amount_desc 
ON tips(post_id, amount DESC);

-- Follow relationship indexes for social graph queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_following_created_at 
ON follows(following_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_follower_created_at 
ON follows(follower_id, created_at DESC);

-- Governance system indexes for DAO functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_dao_status_created 
ON proposals(dao_id, status, start_block DESC) WHERE dao_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_proposer_created 
ON proposals(proposer_id, start_block DESC) WHERE proposer_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_end_block 
ON proposals(end_block) WHERE end_block IS NOT NULL AND status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_proposal_created_at 
ON votes(proposal_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_voter_voting_power 
ON votes(voter_id, voting_power DESC);

-- Voting delegation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voting_delegations_active_dao 
ON voting_delegations(dao_id, active, voting_power DESC) WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_voting_power_snapshots_proposal_user 
ON voting_power_snapshots(proposal_id, user_id, total_voting_power DESC);

-- Product and marketplace indexes for e-commerce queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_price_created 
ON products(category_id, price_amount, created_at DESC) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_status_updated 
ON products(seller_id, status, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_views_desc 
ON products(views DESC) WHERE status = 'active' AND views > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_favorites_desc 
ON products(favorites DESC) WHERE status = 'active' AND favorites > 0;

-- Product tags indexes for search functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_tags_tag_product 
ON product_tags(tag, product_id);

-- Seller profile indexes for marketplace functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_tier_created_at 
ON sellers(tier, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_verified_online 
ON sellers(is_verified, is_online, last_seen DESC) WHERE is_verified = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_ens_verified 
ON sellers(ens_verified, ens_last_verified DESC) WHERE ens_verified = true;

-- Seller activity indexes for timeline features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_activities_wallet_type_created 
ON seller_activities(seller_wallet_address, activity_type, created_at DESC);

-- Order management indexes for transaction tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_buyer_status_created 
ON orders(buyer_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_status_created 
ON orders(seller_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_payment_method_created 
ON orders(payment_method, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tracking_number 
ON orders(tracking_number) WHERE tracking_number IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_estimated_delivery 
ON orders(estimated_delivery) WHERE estimated_delivery IS NOT NULL;

-- Listing indexes for marketplace browsing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_type_status_created 
ON listings(listing_type, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_item_type_price 
ON listings(item_type, price DESC) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_end_time_status 
ON listings(end_time, status) WHERE listing_type = 'AUCTION' AND status = 'active';

-- Auction-specific indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_highest_bid_desc 
ON listings(highest_bid DESC) WHERE listing_type = 'AUCTION' AND highest_bid IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_listing_amount_timestamp 
ON bids(listing_id, amount DESC, timestamp DESC);

-- Escrow system indexes for transaction security
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrows_buyer_created_at 
ON escrows(buyer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrows_seller_created_at 
ON escrows(seller_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_escrows_dispute_opened 
ON escrows(dispute_opened, created_at DESC) WHERE dispute_opened = true;

-- Dispute resolution indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_status_created_at 
ON disputes(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_reporter_created_at 
ON disputes(reporter_id, created_at DESC);

-- Notification system indexes for real-time features
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_address, read, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type_created_at 
ON notifications(type, created_at DESC);

-- Blockchain event tracking indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blockchain_events_type_timestamp 
ON blockchain_events(event_type, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blockchain_events_block_number 
ON blockchain_events(block_number DESC);

-- AI moderation indexes for content management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_moderation_object_status 
ON ai_moderation(object_type, object_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_moderation_status_created 
ON ai_moderation(status, created_at DESC);

-- Full-text search indexes for content discovery
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_search 
ON posts USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || content_cid));

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_dao_author_created 
ON posts(dao, author_id, created_at DESC) WHERE dao IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_category_status_created 
ON products(seller_id, category_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_buyer_seller_status 
ON orders(buyer_id, seller_id, status, created_at DESC);

-- Partial indexes for active/published content optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_price_created 
ON products(price_amount, created_at DESC) WHERE status = 'active' AND listing_status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_auctions 
ON listings(end_time ASC) WHERE listing_type = 'AUCTION' AND status = 'active' AND end_time > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_recent_active 
ON posts(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Reputation and social proof indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reputations_score_desc 
ON reputations(score DESC) WHERE dao_approved = true;

-- Category hierarchy indexes for navigation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_sort_order 
ON categories(parent_id, sort_order, name) WHERE is_active = true;

-- Time-based partitioning support indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_created_at_month 
ON posts(date_trunc('month', created_at), created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at_month 
ON orders(date_trunc('month', created_at), created_at DESC);

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_events_order_timestamp 
ON order_events(order_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_records_order_updated 
ON tracking_records(order_id, last_updated DESC);

-- User engagement indexes for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_reputation_created 
ON posts(author_id, reputation_score DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_post_created_amount 
ON reactions(post_id, created_at DESC, amount DESC);

-- Covering indexes for frequently accessed columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet_handle_created 
ON users(wallet_address, handle, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_title_price_status 
ON products(seller_id, title, price_amount, status) WHERE status = 'active';

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE posts;
ANALYZE products;
ANALYZE sellers;
ANALYZE orders;
ANALYZE listings;
ANALYZE reactions;
ANALYZE tips;
ANALYZE follows;
ANALYZE proposals;
ANALYZE votes;
ANALYZE categories;
ANALYZE escrows;
ANALYZE disputes;
ANALYZE notifications;

-- Create statistics for multi-column correlations
CREATE STATISTICS IF NOT EXISTS stats_posts_author_community_created 
ON author_id, community_id, created_at FROM posts;

CREATE STATISTICS IF NOT EXISTS stats_products_seller_category_price 
ON seller_id, category_id, price_amount FROM products;

CREATE STATISTICS IF NOT EXISTS stats_orders_buyer_seller_status 
ON buyer_id, seller_id, status FROM orders;

-- Refresh materialized views if any exist (placeholder for future use)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_products;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_posts;

-- Log completion
INSERT INTO sync_status (key, value) 
VALUES ('enhanced_performance_indexes_applied', NOW()::text)
ON CONFLICT (key) DO UPDATE SET value = NOW()::text;