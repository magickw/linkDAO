-- Performance Optimization Indexes Migration
-- This migration adds indexes for frequently queried fields to improve API performance

-- Seller profile indexes for wallet address lookups and onboarding queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_wallet_address_btree 
ON sellers USING btree(wallet_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_created_at_desc 
ON sellers(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_onboarding_completed 
ON sellers(onboarding_completed) WHERE onboarding_completed = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_ens_handle 
ON sellers(ens_handle) WHERE ens_handle IS NOT NULL;

-- Marketplace listings indexes for filtering and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_seller_address 
ON marketplace_listings(seller_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_created_at_desc 
ON marketplace_listings(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_status_created_at 
ON marketplace_listings(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_price_range 
ON marketplace_listings(price) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_category_price 
ON marketplace_listings(category, price) WHERE status = 'active';

-- Authentication sessions indexes for session management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_wallet_address 
ON auth_sessions(wallet_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_expires_at 
ON auth_sessions(expires_at) WHERE expires_at > NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_session_token_hash 
ON auth_sessions USING hash(session_token);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_refresh_token_hash 
ON auth_sessions USING hash(refresh_token);

-- User reputation indexes for reputation queries and caching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_wallet_address 
ON user_reputation(wallet_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_score_desc 
ON user_reputation(reputation_score DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_last_calculated 
ON user_reputation(last_calculated DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_total_transactions 
ON user_reputation(total_transactions DESC);

-- Products table optimization indexes for marketplace queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_status_created 
ON products(seller_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_price 
ON products(category_id, price_amount) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_listing_status_published 
ON products(listing_status, published_at DESC) WHERE listing_status = 'published';

-- Full-text search index for products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_vector 
ON products USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Users table indexes for wallet address lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet_address_btree 
ON users USING btree(wallet_address);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_handle 
ON users(handle) WHERE handle IS NOT NULL;

-- Posts table indexes for social feed queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_author_created_at 
ON posts(author_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_dao_created_at 
ON posts(dao, created_at DESC) WHERE dao IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_reputation_score 
ON posts(reputation_score DESC);

-- Orders table indexes for order management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_buyer_created_at 
ON orders(buyer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_created_at 
ON orders(seller_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created_at 
ON orders(status, created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_seller_status_date 
ON marketplace_listings(seller_address, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_category_status 
ON products(seller_id, category_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_wallet_expires 
ON auth_sessions(wallet_address, expires_at) WHERE expires_at > NOW();

-- Partial indexes for active/published content only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_active_only 
ON marketplace_listings(created_at DESC, price) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_published_only 
ON products(created_at DESC, price_amount) WHERE listing_status = 'published';

-- Indexes for reputation calculations and caching
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_cache_key 
ON user_reputation(wallet_address, last_calculated) WHERE last_calculated > NOW() - INTERVAL '1 hour';

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_payment_method_status 
ON orders(payment_method, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_price_sort 
ON marketplace_listings(price ASC, created_at DESC) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_popularity 
ON marketplace_listings(views DESC, created_at DESC) WHERE status = 'active';

-- Add statistics collection for query optimization
ANALYZE sellers;
ANALYZE marketplace_listings;
ANALYZE auth_sessions;
ANALYZE user_reputation;
ANALYZE products;
ANALYZE users;
ANALYZE posts;
ANALYZE orders;

-- Update table statistics for better query planning
UPDATE pg_stat_user_tables SET last_analyze = NOW() 
WHERE schemaname = 'public' AND tablename IN (
  'sellers', 'marketplace_listings', 'auth_sessions', 'user_reputation', 
  'products', 'users', 'posts', 'orders'
);