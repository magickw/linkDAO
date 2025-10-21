-- Automated Tier Upgrade System Schema
-- Migration: 0047_automated_tier_upgrade_system.sql

-- Add tier-related columns to sellers table
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS tier_upgrade_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_tier_evaluation TIMESTAMP,
ADD COLUMN IF NOT EXISTS listing_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS priority_support BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS analytics_access VARCHAR(20) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS custom_branding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS featured_placement BOOLEAN DEFAULT FALSE;

-- Create tier evaluation history table
CREATE TABLE IF NOT EXISTS tier_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  evaluation_date TIMESTAMP DEFAULT NOW(),
  current_tier VARCHAR(50) NOT NULL,
  evaluated_tier VARCHAR(50) NOT NULL,
  upgrade_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  requirements_met JSONB NOT NULL DEFAULT '[]',
  metrics JSONB NOT NULL DEFAULT '{}',
  upgrade_processed BOOLEAN DEFAULT FALSE,
  upgrade_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tier upgrade notifications table
CREATE TABLE IF NOT EXISTS tier_upgrade_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  from_tier VARCHAR(50) NOT NULL,
  to_tier VARCHAR(50) NOT NULL,
  upgrade_date TIMESTAMP NOT NULL,
  new_benefits JSONB NOT NULL DEFAULT '[]',
  congratulatory_message TEXT,
  read BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tier criteria configuration table
CREATE TABLE IF NOT EXISTS tier_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id VARCHAR(50) UNIQUE NOT NULL,
  tier_name VARCHAR(100) NOT NULL,
  tier_level INTEGER NOT NULL,
  requirements JSONB NOT NULL DEFAULT '{}',
  benefits JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create seller metrics cache table for performance
CREATE TABLE IF NOT EXISTS seller_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  wallet_address VARCHAR(255) NOT NULL,
  sales_volume DECIMAL(15,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  time_active_days INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  dispute_rate DECIMAL(5,2) DEFAULT 0,
  response_time_hours DECIMAL(8,2) DEFAULT 24,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default tier criteria
INSERT INTO tier_criteria (tier_id, tier_name, tier_level, requirements, benefits) VALUES
('bronze', 'Bronze', 1, 
  '{"salesVolume": 0, "averageRating": 0, "totalReviews": 0, "timeActive": 0}',
  '{"listingLimit": 5, "commissionRate": 5.0, "prioritySupport": false, "analyticsAccess": "basic", "customBranding": false, "featuredPlacement": false}'
),
('silver', 'Silver', 2,
  '{"salesVolume": 1000, "averageRating": 4.0, "totalReviews": 10, "timeActive": 30, "disputeRate": 5.0, "responseTime": 24, "completionRate": 95.0}',
  '{"listingLimit": 15, "commissionRate": 4.0, "prioritySupport": false, "analyticsAccess": "advanced", "customBranding": false, "featuredPlacement": false}'
),
('gold', 'Gold', 3,
  '{"salesVolume": 5000, "averageRating": 4.5, "totalReviews": 50, "timeActive": 90, "disputeRate": 2.0, "responseTime": 12, "completionRate": 98.0}',
  '{"listingLimit": 50, "commissionRate": 3.0, "prioritySupport": true, "analyticsAccess": "premium", "customBranding": true, "featuredPlacement": false}'
),
('platinum', 'Platinum', 4,
  '{"salesVolume": 25000, "averageRating": 4.8, "totalReviews": 200, "timeActive": 180, "disputeRate": 1.0, "responseTime": 6, "completionRate": 99.0}',
  '{"listingLimit": 100, "commissionRate": 2.0, "prioritySupport": true, "analyticsAccess": "premium", "customBranding": true, "featuredPlacement": true}'
)
ON CONFLICT (tier_id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tier_evaluations_seller_id ON tier_evaluations(seller_id);
CREATE INDEX IF NOT EXISTS idx_tier_evaluations_wallet_address ON tier_evaluations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tier_evaluations_evaluation_date ON tier_evaluations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_tier_evaluations_upgrade_eligible ON tier_evaluations(upgrade_eligible);

CREATE INDEX IF NOT EXISTS idx_tier_upgrade_notifications_seller_id ON tier_upgrade_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_tier_upgrade_notifications_wallet_address ON tier_upgrade_notifications(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tier_upgrade_notifications_read ON tier_upgrade_notifications(read);
CREATE INDEX IF NOT EXISTS idx_tier_upgrade_notifications_created_at ON tier_upgrade_notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_tier_criteria_tier_level ON tier_criteria(tier_level);
CREATE INDEX IF NOT EXISTS idx_tier_criteria_is_active ON tier_criteria(is_active);

CREATE INDEX IF NOT EXISTS idx_seller_metrics_cache_seller_id ON seller_metrics_cache(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_metrics_cache_wallet_address ON seller_metrics_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_metrics_cache_last_updated ON seller_metrics_cache(last_updated);

CREATE INDEX IF NOT EXISTS idx_sellers_tier ON sellers(tier);
CREATE INDEX IF NOT EXISTS idx_sellers_last_tier_evaluation ON sellers(last_tier_evaluation);
CREATE INDEX IF NOT EXISTS idx_sellers_tier_upgrade_date ON sellers(tier_upgrade_date);

-- Create function to update seller metrics cache
CREATE OR REPLACE FUNCTION update_seller_metrics_cache(seller_uuid UUID)
RETURNS VOID AS $$
DECLARE
  seller_wallet VARCHAR(255);
  sales_data RECORD;
  review_data RECORD;
  account_age INTEGER;
BEGIN
  -- Get seller wallet address
  SELECT wallet_address INTO seller_wallet FROM sellers WHERE id = seller_uuid;
  
  IF seller_wallet IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate sales metrics
  SELECT 
    COALESCE(SUM(total_amount), 0) as total_sales,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
  INTO sales_data
  FROM orders 
  WHERE seller_id = seller_uuid;
  
  -- Calculate review metrics
  SELECT 
    COUNT(r.id) as total_reviews,
    COALESCE(AVG(r.rating), 0) as average_rating
  INTO review_data
  FROM reviews r
  INNER JOIN products p ON r.product_id = p.id
  WHERE p.seller_id = seller_uuid;
  
  -- Calculate account age
  SELECT EXTRACT(DAY FROM NOW() - created_at) INTO account_age FROM sellers WHERE id = seller_uuid;
  
  -- Update or insert metrics cache
  INSERT INTO seller_metrics_cache (
    seller_id, 
    wallet_address, 
    sales_volume, 
    total_orders, 
    completed_orders, 
    total_reviews, 
    average_rating, 
    time_active_days,
    completion_rate,
    last_updated
  ) VALUES (
    seller_uuid,
    seller_wallet,
    sales_data.total_sales,
    sales_data.total_orders,
    sales_data.completed_orders,
    review_data.total_reviews,
    review_data.average_rating,
    account_age,
    CASE WHEN sales_data.total_orders > 0 THEN (sales_data.completed_orders::DECIMAL / sales_data.total_orders) * 100 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (seller_id) DO UPDATE SET
    sales_volume = EXCLUDED.sales_volume,
    total_orders = EXCLUDED.total_orders,
    completed_orders = EXCLUDED.completed_orders,
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    time_active_days = EXCLUDED.time_active_days,
    completion_rate = EXCLUDED.completion_rate,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update metrics cache when orders change
CREATE OR REPLACE FUNCTION trigger_update_seller_metrics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_seller_metrics_cache(COALESCE(NEW.seller_id, OLD.seller_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_seller_metrics_on_order_change ON orders;
CREATE TRIGGER update_seller_metrics_on_order_change
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_seller_metrics();

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_tier_evaluations_updated_at
  BEFORE UPDATE ON tier_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tier_upgrade_notifications_updated_at
  BEFORE UPDATE ON tier_upgrade_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tier_criteria_updated_at
  BEFORE UPDATE ON tier_criteria
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tier_evaluations TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON tier_upgrade_notifications TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON tier_criteria TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON seller_metrics_cache TO postgres;

-- Add comments for documentation
COMMENT ON TABLE tier_evaluations IS 'Stores history of tier evaluations for sellers';
COMMENT ON TABLE tier_upgrade_notifications IS 'Stores tier upgrade notifications for sellers';
COMMENT ON TABLE tier_criteria IS 'Stores tier criteria and requirements configuration';
COMMENT ON TABLE seller_metrics_cache IS 'Cached seller performance metrics for tier evaluation';

COMMENT ON COLUMN sellers.tier IS 'Current seller tier (bronze, silver, gold, platinum)';
COMMENT ON COLUMN sellers.tier_upgrade_date IS 'Date of last tier upgrade';
COMMENT ON COLUMN sellers.last_tier_evaluation IS 'Date of last automated tier evaluation';
COMMENT ON COLUMN sellers.listing_limit IS 'Maximum number of active listings allowed';
COMMENT ON COLUMN sellers.commission_rate IS 'Platform commission rate percentage';
COMMENT ON COLUMN sellers.priority_support IS 'Whether seller has priority support access';
COMMENT ON COLUMN sellers.analytics_access IS 'Level of analytics access (basic, advanced, premium)';
COMMENT ON COLUMN sellers.custom_branding IS 'Whether seller can use custom branding';
COMMENT ON COLUMN sellers.featured_placement IS 'Whether seller is eligible for featured placement';