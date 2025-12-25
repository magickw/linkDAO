-- Migration: Update Seller Tier System (Fixed)
-- Description: Update both sellers and seller_verifications tables to use the new tier system
-- Date: 2025-01-24

-- First, update any existing invalid tier values to 'bronze'
UPDATE sellers SET tier = 'bronze' WHERE tier IS NULL OR tier NOT IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- Update seller_verifications table first to avoid constraint issues
UPDATE seller_verifications SET current_tier = 'bronze' WHERE current_tier IS NULL OR current_tier NOT IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- Update sellers table tier default value and constraint
ALTER TABLE sellers ALTER COLUMN tier SET DEFAULT 'bronze';
ALTER TABLE sellers ADD CONSTRAINT sellers_tier_check 
  CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'));

-- Update sellerVerifications table currentTier default value and constraint
ALTER TABLE seller_verifications ALTER COLUMN current_tier SET DEFAULT 'bronze';
ALTER TABLE seller_verifications ADD CONSTRAINT seller_verifications_current_tier_check 
  CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond'));

-- Update existing records to new tier system
-- Map old 'basic' to 'bronze' if any exist
UPDATE sellers SET tier = 'bronze' WHERE tier = 'basic';

-- Map old verification levels to new tier system
UPDATE seller_verifications SET current_tier = 'bronze' WHERE current_tier = 'unverified';
UPDATE seller_verifications SET current_tier = 'silver' WHERE current_tier = 'standard';
UPDATE seller_verifications SET current_tier = 'gold' WHERE current_tier = 'verified';
UPDATE seller_verifications SET current_tier = 'platinum' WHERE current_tier = 'premium';

-- Create seller tier requirements table for tracking tier progression
CREATE TABLE IF NOT EXISTS seller_tier_requirements (
  id SERIAL PRIMARY KEY,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  requirement_type VARCHAR(50) NOT NULL, -- 'total_sales', 'rating', 'response_time', 'return_rate', 'dispute_rate', 'repeat_rate'
  required_value NUMERIC(20, 8) NOT NULL,
  current_value NUMERIC(20, 8) DEFAULT 0,
  description TEXT,
  is_met BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert tier requirements
INSERT INTO seller_tier_requirements (tier, requirement_type, required_value, description) VALUES
-- Bronze Tier Requirements
('bronze', 'total_sales', 0, 'No minimum sales required'),
('bronze', 'rating', 0, 'No minimum rating required'),
('bronze', 'response_time', 0, 'No response time requirement'),
('bronze', 'return_rate', 100, 'No return rate requirement'),

-- Silver Tier Requirements  
('silver', 'total_sales', 5000, 'Achieve $5,000 in total sales'),
('silver', 'rating', 4.0, 'Maintain 4.0+ star rating'),
('silver', 'response_time', 3600, 'Maintain response time under 1 hour'),
('silver', 'return_rate', 5.0, 'Keep return rate below 5%'),

-- Gold Tier Requirements
('gold', 'total_sales', 25000, 'Achieve $25,000 in total sales'),
('gold', 'rating', 4.3, 'Maintain 4.3+ star rating'),
('gold', 'response_time', 1800, 'Maintain response time under 30 minutes'),
('gold', 'return_rate', 5.0, 'Keep return rate below 5%'),

-- Platinum Tier Requirements
('platinum', 'total_sales', 100000, 'Achieve $100,000 in total sales'),
('platinum', 'rating', 4.5, 'Maintain 4.5+ star rating'),
('platinum', 'response_time', 900, 'Maintain response time under 15 minutes'),
('platinum', 'return_rate', 3.0, 'Keep return rate below 3%'),
('platinum', 'dispute_rate', 1.0, 'Keep dispute rate below 1%'),

-- Diamond Tier Requirements
('diamond', 'total_sales', 500000, 'Achieve $500,000 in total sales'),
('diamond', 'rating', 4.7, 'Maintain 4.7+ star rating'),
('diamond', 'response_time', 600, 'Maintain response time under 10 minutes'),
('diamond', 'return_rate', 2.0, 'Keep return rate below 2%'),
('diamond', 'dispute_rate', 0.5, 'Keep dispute rate below 0.5%'),
('diamond', 'repeat_rate', 30.0, 'Maintain repeat customer rate above 30%')
ON CONFLICT DO NOTHING;

-- Create seller tier benefits table
CREATE TABLE IF NOT EXISTS seller_tier_benefits (
  id SERIAL PRIMARY KEY,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  benefit_type VARCHAR(50) NOT NULL, -- 'commission_rate', 'withdrawal_limit', 'support_level', 'feature_access'
  benefit_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert tier benefits
INSERT INTO seller_tier_benefits (tier, benefit_type, benefit_value, description) VALUES
-- Bronze Tier Benefits
('bronze', 'commission_rate', '5.0', 'Standard 5% platform commission rate'),
('bronze', 'withdrawal_limit', '1000', 'Weekly withdrawal limit of $1,000'),
('bronze', 'support_level', 'standard', 'Access to basic seller tools'),
('bronze', 'feature_access', 'basic', 'Basic analytics dashboard'),

-- Silver Tier Benefits
('silver', 'commission_rate', '4.5', 'Reduced 4.5% platform commission rate'),
('silver', 'withdrawal_limit', '5000', 'Weekly withdrawal limit of $5,000'),
('silver', 'support_level', 'priority', 'Priority customer support'),
('silver', 'feature_access', 'enhanced', 'Basic analytics dashboard'),

-- Gold Tier Benefits
('gold', 'commission_rate', '4.0', 'Lower 4% platform commission rate'),
('gold', 'withdrawal_limit', '25000', 'Weekly withdrawal limit of $25,000'),
('gold', 'support_level', 'priority', 'Priority customer support'),
('gold', 'feature_access', 'advanced', 'Advanced analytics dashboard, marketing tools'),

-- Platinum Tier Benefits
('platinum', 'commission_rate', '3.5', 'Lowest 3.5% platform commission rate'),
('platinum', 'withdrawal_limit', '100000', 'Weekly withdrawal limit of $100,000'),
('platinum', 'support_level', 'dedicated', 'Dedicated account manager'),
('platinum', 'feature_access', 'premium', 'Early access to new platform features, custom store branding'),

-- Diamond Tier Benefits
('diamond', 'commission_rate', '3.0', 'VIP 3% platform commission rate'),
('diamond', 'withdrawal_limit', 'unlimited', 'No withdrawal limits'),
('diamond', 'support_level', 'white_glove', 'White-glove support service'),
('diamond', 'feature_access', 'vip', 'Revenue sharing opportunities, exclusive seller events, advanced API access')
ON CONFLICT DO NOTHING;

-- Create seller tier progression tracking table
CREATE TABLE IF NOT EXISTS seller_tier_progression (
  id SERIAL PRIMARY KEY,
  seller_wallet_address VARCHAR(66) NOT NULL,
  current_tier VARCHAR(20) NOT NULL CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  next_eligible_tier VARCHAR(20),
  progress_percentage NUMERIC(5, 2) DEFAULT 0,
  requirements_met INTEGER DEFAULT 0,
  total_requirements INTEGER DEFAULT 0,
  last_evaluation_at TIMESTAMP DEFAULT NOW(),
  next_evaluation_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_tier_progression_seller ON seller_tier_progression(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_tier_progression_current_tier ON seller_tier_progression(current_tier);
CREATE INDEX IF NOT EXISTS idx_seller_tier_progression_next_evaluation ON seller_tier_progression(next_evaluation_at);

-- Create seller tier history table for tracking changes
CREATE TABLE IF NOT EXISTS seller_tier_history (
  id SERIAL PRIMARY KEY,
  seller_wallet_address VARCHAR(66) NOT NULL,
  from_tier VARCHAR(20) NOT NULL,
  to_tier VARCHAR(20) NOT NULL,
  upgrade_reason TEXT,
  auto_upgraded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for history tracking
CREATE INDEX IF NOT EXISTS idx_seller_tier_history_seller ON seller_tier_history(seller_wallet_address);
CREATE INDEX IF NOT EXISTS idx_seller_tier_history_created_at ON seller_tier_history(created_at);

-- Initialize seller tier progression for existing sellers
INSERT INTO seller_tier_progression (seller_wallet_address, current_tier)
SELECT wallet_address, tier FROM sellers
ON CONFLICT (seller_wallet_address) DO UPDATE SET
  current_tier = EXCLUDED.current_tier,
  updated_at = NOW();

-- Create function to calculate seller tier based on metrics
CREATE OR REPLACE FUNCTION calculate_seller_tier(
  p_total_sales NUMERIC,
  p_rating NUMERIC,
  p_response_time NUMERIC, -- in seconds
  p_return_rate NUMERIC, -- percentage
  p_dispute_rate NUMERIC, -- percentage  
  p_repeat_rate NUMERIC -- percentage
) RETURNS VARCHAR(20) AS $$
BEGIN
  -- Check Diamond tier requirements
  IF p_total_sales >= 500000 AND 
     p_rating >= 4.7 AND 
     p_response_time <= 600 AND 
     p_return_rate <= 2.0 AND 
     p_dispute_rate <= 0.5 AND 
     p_repeat_rate >= 30 THEN
    RETURN 'diamond';
  
  -- Check Platinum tier requirements
  IF p_total_sales >= 100000 AND 
     p_rating >= 4.5 AND 
     p_response_time <= 900 AND 
     p_return_rate <= 3.0 AND 
     p_dispute_rate <= 1.0 THEN
    RETURN 'platinum';
  
  -- Check Gold tier requirements
  IF p_total_sales >= 25000 AND 
     p_rating >= 4.3 AND 
     p_response_time <= 1800 AND 
     p_return_rate <= 5.0 THEN
    RETURN 'gold';
  
  -- Check Silver tier requirements
  IF p_total_sales >= 5000 AND 
     p_rating >= 4.0 AND 
     p_response_time <= 3600 AND 
     p_return_rate <= 5.0 THEN
    RETURN 'silver';
  
  -- Default to Bronze
  RETURN 'bronze';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update seller tiers
CREATE OR REPLACE FUNCTION update_seller_tier() RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by the automated tier upgrade system
  -- to evaluate and update seller tiers based on their performance metrics
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tier evaluation (will be called by scheduled job)
CREATE OR REPLACE TRIGGER trigger_seller_tier_evaluation
AFTER UPDATE ON sellers
FOR EACH ROW
EXECUTE FUNCTION update_seller_tier();

-- Create view for seller tier analytics
CREATE OR REPLACE VIEW seller_tier_analytics AS
SELECT 
  s.wallet_address as seller_wallet_address,
  s.tier as current_tier,
  s.store_name,
  s.is_verified,
  stp.progress_percentage,
  stp.requirements_met,
  stp.total_requirements,
  stp.next_eligible_tier,
  stp.last_evaluation_at,
  stp.next_evaluation_at,
  -- Calculate metrics from orders and reviews
  COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END), 0) as total_sales,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) as completed_orders,
  COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN r.id END) as total_reviews,
  COUNT(DISTINCT CASE WHEN o.status = 'disputed' THEN o.id END) as disputed_orders
FROM sellers s
LEFT JOIN seller_tier_progression stp ON s.wallet_address = stp.seller_wallet_address
LEFT JOIN marketplace_orders o ON o.seller_id = s.wallet_address
LEFT JOIN marketplace_reviews r ON r.reviewee_id = s.wallet_address
GROUP BY s.wallet_address, s.tier, s.store_name, s.is_verified, stp.progress_percentage, stp.requirements_met, stp.total_requirements, stp.next_eligible_tier, stp.last_evaluation_at, stp.next_evaluation_at;