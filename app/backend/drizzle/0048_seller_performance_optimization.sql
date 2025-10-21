-- Seller Performance Optimization Migration
-- Task 15: Optimize database queries and performance for seller integration consistency
-- Adds new seller fields, optimized indexes, and performance monitoring

-- Add new seller performance fields to existing sellers table
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS tier_id VARCHAR(50) DEFAULT 'bronze';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS tier_progress JSONB DEFAULT '{}';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS cache_version INTEGER DEFAULT 1;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS last_cache_invalidation TIMESTAMP DEFAULT NOW();
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS performance_score NUMERIC(5,2) DEFAULT 0.0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS total_sales NUMERIC(20,8) DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0.0;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,2) DEFAULT 100.0;

-- Create seller analytics tracking table
CREATE TABLE IF NOT EXISTS seller_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  seller_wallet_address VARCHAR(66) NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,2),
  recorded_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Create seller tier definitions table
CREATE TABLE IF NOT EXISTS seller_tiers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL,
  requirements JSONB NOT NULL,
  benefits JSONB NOT NULL,
  limitations JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default seller tiers
INSERT INTO seller_tiers (id, name, level, requirements, benefits, limitations) VALUES
('bronze', 'Bronze', 1, '{"min_sales": 0, "min_rating": 0}', '{"listing_limit": 10, "commission_rate": 5.0}', '{"withdrawal_limit": 1000}'),
('silver', 'Silver', 2, '{"min_sales": 1000, "min_rating": 4.0}', '{"listing_limit": 50, "commission_rate": 4.0}', '{"withdrawal_limit": 5000}'),
('gold', 'Gold', 3, '{"min_sales": 10000, "min_rating": 4.5}', '{"listing_limit": 200, "commission_rate": 3.0}', '{"withdrawal_limit": 25000}'),
('platinum', 'Platinum', 4, '{"min_sales": 50000, "min_rating": 4.8}', '{"listing_limit": 1000, "commission_rate": 2.0}', '{"withdrawal_limit": 100000}')
ON CONFLICT (id) DO NOTHING;

-- Create seller cache invalidation tracking table
CREATE TABLE IF NOT EXISTS seller_cache_invalidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES sellers(id),
  seller_wallet_address VARCHAR(66) NOT NULL,
  invalidation_type VARCHAR(50) NOT NULL,
  component VARCHAR(100),
  triggered_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create seller query performance monitoring table
CREATE TABLE IF NOT EXISTS seller_query_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type VARCHAR(100) NOT NULL,
  seller_wallet_address VARCHAR(66),
  execution_time_ms NUMERIC(10,3) NOT NULL,
  rows_returned INTEGER DEFAULT 0,
  query_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Optimized indexes for seller queries
-- Primary seller lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_wallet_address_optimized 
ON sellers(wallet_address) WHERE wallet_address IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_tier_performance 
ON sellers(tier_id, performance_score DESC, total_sales DESC) 
WHERE tier_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_verification_status 
ON sellers(is_verified, onboarding_completed, created_at DESC) 
WHERE is_verified = true AND onboarding_completed = true;

-- Seller analytics indexes for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_analytics_wallet_type_recorded 
ON seller_analytics(seller_wallet_address, metric_type, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_analytics_type_value 
ON seller_analytics(metric_type, metric_value DESC, recorded_at DESC);

-- Seller cache invalidation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_cache_invalidations_wallet_type 
ON seller_cache_invalidations(seller_wallet_address, invalidation_type, triggered_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_cache_invalidations_pending 
ON seller_cache_invalidations(triggered_at DESC) 
WHERE completed_at IS NULL;

-- Seller query performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_query_performance_type_time 
ON seller_query_performance(query_type, execution_time_ms DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_query_performance_wallet_time 
ON seller_query_performance(seller_wallet_address, execution_time_ms DESC) 
WHERE seller_wallet_address IS NOT NULL;

-- Products table seller-related optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_status_updated_optimized 
ON products(seller_id, status, updated_at DESC) 
WHERE status IN ('active', 'published');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_category_price_optimized 
ON products(seller_id, category_id, price_amount, created_at DESC) 
WHERE status = 'active' AND listing_status = 'published';

-- Orders table seller optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_status_amount 
ON orders(seller_id, status, total_amount DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_seller_payment_method 
ON orders(seller_id, payment_method, created_at DESC) 
WHERE status IN ('completed', 'pending');

-- Seller activities optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_activities_wallet_recent 
ON seller_activities(seller_wallet_address, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Seller badges optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_badges_wallet_active 
ON seller_badges(seller_wallet_address, earned_at DESC) 
WHERE is_active = true;

-- Seller transactions optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seller_transactions_wallet_type_amount 
ON seller_transactions(seller_wallet_address, transaction_type, amount DESC, created_at DESC);

-- Composite indexes for complex seller queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_comprehensive_lookup 
ON sellers(wallet_address, tier_id, is_verified, performance_score DESC, total_sales DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_comprehensive 
ON products(seller_id, status, category_id, price_amount, views DESC, created_at DESC) 
WHERE status = 'active';

-- Partial indexes for active sellers only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_active_performance 
ON sellers(performance_score DESC, total_sales DESC, average_rating DESC) 
WHERE is_verified = true AND onboarding_completed = true AND tier_id != 'bronze';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_recent_activity 
ON sellers(last_seen DESC, is_online) 
WHERE last_seen > NOW() - INTERVAL '7 days';

-- Covering indexes for frequently accessed seller data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_profile_data_covering 
ON sellers(wallet_address, display_name, store_name, tier_id, is_verified, performance_score, total_sales);

-- Full-text search index for seller stores
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_search_text 
ON sellers USING gin(to_tsvector('english', 
  COALESCE(display_name, '') || ' ' || 
  COALESCE(store_name, '') || ' ' || 
  COALESCE(bio, '') || ' ' || 
  COALESCE(description, '')
));

-- Statistics for better query planning
CREATE STATISTICS IF NOT EXISTS stats_sellers_tier_performance 
ON tier_id, performance_score, total_sales FROM sellers;

CREATE STATISTICS IF NOT EXISTS stats_products_seller_category 
ON seller_id, category_id, status FROM products;

CREATE STATISTICS IF NOT EXISTS stats_orders_seller_status 
ON seller_id, status, payment_method FROM orders;

-- Update table statistics
ANALYZE sellers;
ANALYZE seller_analytics;
ANALYZE seller_cache_invalidations;
ANALYZE seller_query_performance;
ANALYZE products;
ANALYZE orders;
ANALYZE seller_activities;
ANALYZE seller_badges;
ANALYZE seller_transactions;

-- Create materialized view for seller performance dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_seller_performance_dashboard AS
SELECT 
  s.wallet_address,
  s.display_name,
  s.store_name,
  s.tier_id,
  s.performance_score,
  s.total_sales,
  s.total_orders,
  s.average_rating,
  s.is_verified,
  s.onboarding_completed,
  COUNT(p.id) as active_listings,
  COUNT(o.id) as recent_orders,
  AVG(o.total_amount) as average_order_value,
  MAX(s.last_seen) as last_activity
FROM sellers s
LEFT JOIN products p ON s.id = p.seller_id AND p.status = 'active'
LEFT JOIN orders o ON s.id = o.seller_id AND o.created_at > NOW() - INTERVAL '30 days'
WHERE s.is_verified = true AND s.onboarding_completed = true
GROUP BY s.id, s.wallet_address, s.display_name, s.store_name, s.tier_id, 
         s.performance_score, s.total_sales, s.total_orders, s.average_rating,
         s.is_verified, s.onboarding_completed;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_seller_performance_wallet 
ON mv_seller_performance_dashboard(wallet_address);

-- Create additional indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_seller_performance_tier_score 
ON mv_seller_performance_dashboard(tier_id, performance_score DESC);

CREATE INDEX IF NOT EXISTS idx_mv_seller_performance_sales 
ON mv_seller_performance_dashboard(total_sales DESC, average_rating DESC);

-- Function to refresh seller performance materialized view
CREATE OR REPLACE FUNCTION refresh_seller_performance_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_seller_performance_dashboard;
END;
$$ LANGUAGE plpgsql;

-- Create function to track seller query performance
CREATE OR REPLACE FUNCTION track_seller_query_performance(
  p_query_type VARCHAR(100),
  p_seller_wallet_address VARCHAR(66),
  p_execution_time_ms NUMERIC(10,3),
  p_rows_returned INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO seller_query_performance (
    query_type,
    seller_wallet_address,
    execution_time_ms,
    rows_returned,
    query_hash,
    metadata
  ) VALUES (
    p_query_type,
    p_seller_wallet_address,
    p_execution_time_ms,
    p_rows_returned,
    md5(p_query_type || COALESCE(p_seller_wallet_address, '')),
    p_metadata
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to invalidate seller cache
CREATE OR REPLACE FUNCTION invalidate_seller_cache(
  p_seller_wallet_address VARCHAR(66),
  p_invalidation_type VARCHAR(50),
  p_component VARCHAR(100) DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO seller_cache_invalidations (
    seller_wallet_address,
    invalidation_type,
    component,
    triggered_at
  ) VALUES (
    p_seller_wallet_address,
    p_invalidation_type,
    p_component,
    NOW()
  );
  
  -- Update cache version in sellers table
  UPDATE sellers 
  SET cache_version = cache_version + 1,
      last_cache_invalidation = NOW()
  WHERE wallet_address = p_seller_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Create function to update seller performance metrics
CREATE OR REPLACE FUNCTION update_seller_performance_metrics(
  p_seller_wallet_address VARCHAR(66)
)
RETURNS void AS $$
DECLARE
  v_total_sales NUMERIC(20,8);
  v_total_orders INTEGER;
  v_average_rating NUMERIC(3,2);
  v_completion_rate NUMERIC(5,2);
  v_performance_score NUMERIC(5,2);
BEGIN
  -- Calculate total sales
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_sales
  FROM orders o
  JOIN sellers s ON o.seller_id = s.id
  WHERE s.wallet_address = p_seller_wallet_address
    AND o.status = 'completed';
  
  -- Calculate total orders
  SELECT COALESCE(COUNT(*), 0)
  INTO v_total_orders
  FROM orders o
  JOIN sellers s ON o.seller_id = s.id
  WHERE s.wallet_address = p_seller_wallet_address;
  
  -- Calculate average rating (placeholder - would need reviews table)
  v_average_rating := 4.5; -- Default rating
  
  -- Calculate completion rate
  SELECT CASE 
    WHEN COUNT(*) = 0 THEN 100.0
    ELSE (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*))
  END
  INTO v_completion_rate
  FROM orders o
  JOIN sellers s ON o.seller_id = s.id
  WHERE s.wallet_address = p_seller_wallet_address;
  
  -- Calculate performance score (weighted average)
  v_performance_score := (
    (v_average_rating / 5.0) * 0.4 +
    (v_completion_rate / 100.0) * 0.3 +
    (CASE WHEN v_total_orders > 0 THEN LEAST(v_total_orders / 100.0, 1.0) ELSE 0 END) * 0.3
  ) * 100.0;
  
  -- Update seller metrics
  UPDATE sellers
  SET total_sales = v_total_sales,
      total_orders = v_total_orders,
      average_rating = v_average_rating,
      completion_rate = v_completion_rate,
      performance_score = v_performance_score,
      updated_at = NOW()
  WHERE wallet_address = p_seller_wallet_address;
  
  -- Record analytics
  INSERT INTO seller_analytics (
    seller_wallet_address,
    metric_type,
    metric_value,
    metadata
  ) VALUES 
  (p_seller_wallet_address, 'total_sales', v_total_sales, '{"auto_calculated": true}'),
  (p_seller_wallet_address, 'total_orders', v_total_orders, '{"auto_calculated": true}'),
  (p_seller_wallet_address, 'performance_score', v_performance_score, '{"auto_calculated": true}');
  
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update performance metrics
CREATE OR REPLACE FUNCTION trigger_update_seller_performance()
RETURNS trigger AS $$
BEGIN
  -- Update performance metrics when order status changes to completed
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM update_seller_performance_metrics(
      (SELECT wallet_address FROM sellers WHERE id = NEW.seller_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_seller_performance_update ON orders;
CREATE TRIGGER trigger_seller_performance_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_seller_performance();

-- Log completion
INSERT INTO sync_status (key, value) 
VALUES ('seller_performance_optimization_applied', NOW()::text)
ON CONFLICT (key) DO UPDATE SET value = NOW()::text;

-- Create indexes for sync_status table if not exists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_status_key 
ON sync_status(key);