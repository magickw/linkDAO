-- Search Optimization Indexes
-- Migration for marketplace search performance

-- Full-text search index on products table
CREATE INDEX IF NOT EXISTS idx_products_title_search ON products
USING GIN (to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_products_description_search ON products
USING GIN (to_tsvector('english', description));

-- Composite indexes for common search filters
CREATE INDEX IF NOT EXISTS idx_products_category_status
ON products(category, status)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_products_price_range
ON products(price)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_products_seller_status
ON products(sellerId, status)
WHERE status = 'active';

-- Index for sort queries
CREATE INDEX IF NOT EXISTS idx_products_created_at_desc
ON products(createdAt DESC)
WHERE status = 'active';

-- Indexes for seller searches
CREATE INDEX IF NOT EXISTS idx_sellers_name_search
ON sellers USING GIN (to_tsvector('english', name));

CREATE INDEX IF NOT EXISTS idx_sellers_wallet_address_lower
ON sellers(LOWER(walletAddress));

-- Indexes for reviews (for rating queries)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_status
ON reviews(revieweeId, status)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_reviews_rating_helpful
ON reviews(revieweeId, rating, helpfulCount DESC)
WHERE status = 'active';

-- Indexes for disputes
CREATE INDEX IF NOT EXISTS idx_disputes_status_created
ON disputes(status, createdAt DESC);

-- Indexes for orders (for search and filtering)
CREATE INDEX IF NOT EXISTS idx_orders_seller_buyer_status
ON orders(sellerId, buyerId, status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at_seller
ON orders(sellerId, createdAt DESC);
