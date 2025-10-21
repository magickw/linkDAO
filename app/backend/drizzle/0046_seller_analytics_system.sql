-- Seller Analytics System Schema
-- This migration adds comprehensive analytics tracking for sellers

-- Seller performance tracking table
CREATE TABLE IF NOT EXISTS seller_performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,4) NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seller tier definitions table
CREATE TABLE IF NOT EXISTS seller_tiers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]',
  benefits JSONB NOT NULL DEFAULT '[]',
  limitations JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seller tier progression tracking
CREATE TABLE IF NOT EXISTS seller_tier_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  current_tier_id VARCHAR(50) NOT NULL REFERENCES seller_tiers(id),
  previous_tier_id VARCHAR(50) REFERENCES seller_tiers(id),
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  requirements_met JSONB DEFAULT '[]',
  tier_changed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(seller_id)
);

-- Seller insights and recommendations
CREATE TABLE IF NOT EXISTS seller_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL, -- 'opportunity', 'warning', 'achievement', 'recommendation'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  impact VARCHAR(20) NOT NULL, -- 'high', 'medium', 'low'
  actionable BOOLEAN DEFAULT true,
  suggested_actions JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'dismissed', 'completed'
  priority INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seller bottleneck analysis
CREATE TABLE IF NOT EXISTS seller_bottlenecks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  area VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  description TEXT NOT NULL,
  impact TEXT NOT NULL,
  root_cause TEXT NOT NULL,
  solutions JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'identified', -- 'identified', 'in_progress', 'resolved', 'ignored'
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seller benchmarks and comparisons
CREATE TABLE IF NOT EXISTS seller_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  benchmark_type VARCHAR(50) NOT NULL, -- 'industry_average', 'top_performers', 'category_average'
  metric_name VARCHAR(100) NOT NULL,
  seller_value DECIMAL(15,4),
  benchmark_value DECIMAL(15,4),
  percentile DECIMAL(5,2),
  ranking INTEGER,
  total_sellers INTEGER,
  category VARCHAR(100),
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seller customer insights
CREATE TABLE IF NOT EXISTS seller_customer_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  insight_category VARCHAR(50) NOT NULL, -- 'demographics', 'preferences', 'behavior'
  insight_data JSONB NOT NULL,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seller reports
CREATE TABLE IF NOT EXISTS seller_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'custom'
  report_data JSONB NOT NULL,
  period_start DATE,
  period_end DATE,
  generated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'generated', -- 'generated', 'sent', 'viewed'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seller_performance_tracking_seller_id ON seller_performance_tracking(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_performance_tracking_metric_type ON seller_performance_tracking(metric_type);
CREATE INDEX IF NOT EXISTS idx_seller_performance_tracking_recorded_at ON seller_performance_tracking(recorded_at);
CREATE INDEX IF NOT EXISTS idx_seller_performance_tracking_seller_metric ON seller_performance_tracking(seller_id, metric_type);

CREATE INDEX IF NOT EXISTS idx_seller_tier_progression_seller_id ON seller_tier_progression(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_tier_progression_current_tier ON seller_tier_progression(current_tier_id);

CREATE INDEX IF NOT EXISTS idx_seller_insights_seller_id ON seller_insights(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_insights_type ON seller_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_seller_insights_status ON seller_insights(status);
CREATE INDEX IF NOT EXISTS idx_seller_insights_priority ON seller_insights(priority);

CREATE INDEX IF NOT EXISTS idx_seller_bottlenecks_seller_id ON seller_bottlenecks(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_bottlenecks_severity ON seller_bottlenecks(severity);
CREATE INDEX IF NOT EXISTS idx_seller_bottlenecks_status ON seller_bottlenecks(status);

CREATE INDEX IF NOT EXISTS idx_seller_benchmarks_seller_id ON seller_benchmarks(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_benchmarks_type ON seller_benchmarks(benchmark_type);
CREATE INDEX IF NOT EXISTS idx_seller_benchmarks_metric ON seller_benchmarks(metric_name);

CREATE INDEX IF NOT EXISTS idx_seller_customer_insights_seller_id ON seller_customer_insights(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_customer_insights_category ON seller_customer_insights(insight_category);

CREATE INDEX IF NOT EXISTS idx_seller_reports_seller_id ON seller_reports(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_reports_type ON seller_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_seller_reports_generated_at ON seller_reports(generated_at);

-- Insert default seller tiers
INSERT INTO seller_tiers (id, name, level, requirements, benefits, limitations) VALUES
('bronze', 'Bronze', 1, 
  '[
    {"metric": "total_sales", "value": 0, "description": "No minimum sales required"},
    {"metric": "customer_satisfaction", "value": 0, "description": "No minimum rating required"}
  ]',
  '[
    {"type": "listing_limit", "description": "Up to 10 active listings", "value": "10"},
    {"type": "commission_rate", "description": "Standard commission rate", "value": "5%"}
  ]',
  '[
    {"type": "listing_limit", "description": "Maximum 10 active listings", "value": "10"},
    {"type": "withdrawal_limit", "description": "Weekly withdrawal limit", "value": "$1,000"}
  ]'
),
('silver', 'Silver', 2,
  '[
    {"metric": "total_sales", "value": 5000, "description": "Achieve $5,000 in total sales"},
    {"metric": "customer_satisfaction", "value": 4.0, "description": "Maintain 4.0+ star rating"},
    {"metric": "response_time", "value": 3600, "description": "Average response time under 1 hour"}
  ]',
  '[
    {"type": "listing_limit", "description": "Up to 25 active listings", "value": "25"},
    {"type": "commission_rate", "description": "Reduced commission rate", "value": "4.5%"},
    {"type": "priority_support", "description": "Priority customer support", "value": "Yes"}
  ]',
  '[
    {"type": "listing_limit", "description": "Maximum 25 active listings", "value": "25"},
    {"type": "withdrawal_limit", "description": "Weekly withdrawal limit", "value": "$5,000"}
  ]'
),
('gold', 'Gold', 3,
  '[
    {"metric": "total_sales", "value": 25000, "description": "Achieve $25,000 in total sales"},
    {"metric": "customer_satisfaction", "value": 4.3, "description": "Maintain 4.3+ star rating"},
    {"metric": "response_time", "value": 1800, "description": "Average response time under 30 minutes"},
    {"metric": "return_rate", "value": 5, "description": "Return rate below 5%"}
  ]',
  '[
    {"type": "listing_limit", "description": "Up to 50 active listings", "value": "50"},
    {"type": "commission_rate", "description": "Lower commission rate", "value": "4%"},
    {"type": "analytics_access", "description": "Advanced analytics dashboard", "value": "Yes"},
    {"type": "marketing_tools", "description": "Access to marketing tools", "value": "Yes"}
  ]',
  '[
    {"type": "listing_limit", "description": "Maximum 50 active listings", "value": "50"},
    {"type": "withdrawal_limit", "description": "Weekly withdrawal limit", "value": "$25,000"}
  ]'
),
('platinum', 'Platinum', 4,
  '[
    {"metric": "total_sales", "value": 100000, "description": "Achieve $100,000 in total sales"},
    {"metric": "customer_satisfaction", "value": 4.5, "description": "Maintain 4.5+ star rating"},
    {"metric": "response_time", "value": 900, "description": "Average response time under 15 minutes"},
    {"metric": "return_rate", "value": 3, "description": "Return rate below 3%"},
    {"metric": "dispute_rate", "value": 1, "description": "Dispute rate below 1%"}
  ]',
  '[
    {"type": "listing_limit", "description": "Up to 100 active listings", "value": "100"},
    {"type": "commission_rate", "description": "Lowest commission rate", "value": "3.5%"},
    {"type": "dedicated_support", "description": "Dedicated account manager", "value": "Yes"},
    {"type": "early_access", "description": "Early access to new features", "value": "Yes"},
    {"type": "custom_branding", "description": "Custom store branding", "value": "Yes"}
  ]',
  '[
    {"type": "listing_limit", "description": "Maximum 100 active listings", "value": "100"},
    {"type": "withdrawal_limit", "description": "Weekly withdrawal limit", "value": "$100,000"}
  ]'
),
('diamond', 'Diamond', 5,
  '[
    {"metric": "total_sales", "value": 500000, "description": "Achieve $500,000 in total sales"},
    {"metric": "customer_satisfaction", "value": 4.7, "description": "Maintain 4.7+ star rating"},
    {"metric": "response_time", "value": 600, "description": "Average response time under 10 minutes"},
    {"metric": "return_rate", "value": 2, "description": "Return rate below 2%"},
    {"metric": "dispute_rate", "value": 0.5, "description": "Dispute rate below 0.5%"},
    {"metric": "repeat_customer_rate", "value": 30, "description": "Repeat customer rate above 30%"}
  ]',
  '[
    {"type": "listing_limit", "description": "Unlimited active listings", "value": "Unlimited"},
    {"type": "commission_rate", "description": "VIP commission rate", "value": "3%"},
    {"type": "white_glove_support", "description": "White-glove support service", "value": "Yes"},
    {"type": "revenue_sharing", "description": "Revenue sharing opportunities", "value": "Yes"},
    {"type": "exclusive_events", "description": "Exclusive seller events", "value": "Yes"},
    {"type": "api_access", "description": "Advanced API access", "value": "Yes"}
  ]',
  '[
    {"type": "withdrawal_limit", "description": "No withdrawal limits", "value": "Unlimited"}
  ]'
) ON CONFLICT (id) DO NOTHING;

-- Create function to update seller tier progression
CREATE OR REPLACE FUNCTION update_seller_tier_progression()
RETURNS TRIGGER AS $$
BEGIN
  -- This function would be called when seller metrics are updated
  -- to automatically evaluate tier progression
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tier progression updates
-- CREATE TRIGGER trigger_update_seller_tier_progression
--   AFTER INSERT OR UPDATE ON seller_performance_tracking
--   FOR EACH ROW
--   EXECUTE FUNCTION update_seller_tier_progression();

-- Add some sample insights for testing
INSERT INTO seller_insights (seller_id, insight_type, title, description, impact, suggested_actions, metrics)
SELECT 
  s.id,
  'opportunity',
  'Improve Product Images',
  'Products with high-quality images convert 40% better than those with basic images.',
  'high',
  '["Add professional product photos", "Include multiple angles", "Show products in use"]',
  '{"current_conversion": 2.1, "potential_conversion": 2.9}'
FROM sellers s
WHERE s.id IN (SELECT id FROM sellers LIMIT 5)
ON CONFLICT DO NOTHING;

-- Add performance tracking triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seller_performance_tracking_updated_at
  BEFORE UPDATE ON seller_performance_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_tier_progression_updated_at
  BEFORE UPDATE ON seller_tier_progression
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_insights_updated_at
  BEFORE UPDATE ON seller_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_bottlenecks_updated_at
  BEFORE UPDATE ON seller_bottlenecks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_benchmarks_updated_at
  BEFORE UPDATE ON seller_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_customer_insights_updated_at
  BEFORE UPDATE ON seller_customer_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();