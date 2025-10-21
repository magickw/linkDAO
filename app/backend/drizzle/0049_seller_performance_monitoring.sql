-- Seller Performance Monitoring Tables
-- This migration creates tables for comprehensive seller performance monitoring

-- Table for storing performance metrics
CREATE TABLE IF NOT EXISTS seller_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Component performance metrics (JSON)
  component_load_times JSONB NOT NULL DEFAULT '{}',
  
  -- API performance metrics (JSON)
  api_response_times JSONB NOT NULL DEFAULT '{}',
  
  -- Cache performance metrics (JSON)
  cache_metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Error metrics (JSON)
  error_metrics JSONB NOT NULL DEFAULT '{}',
  
  -- User experience metrics (JSON)
  user_experience_metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Mobile performance metrics (JSON)
  mobile_metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Real-time features performance (JSON)
  real_time_metrics JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for performance alerts
CREATE TABLE IF NOT EXISTS seller_performance_alerts (
  id VARCHAR(255) PRIMARY KEY,
  seller_id UUID NOT NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('performance', 'error', 'availability', 'security')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  actions JSONB NOT NULL DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for performance regressions
CREATE TABLE IF NOT EXISTS seller_performance_regressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  metric VARCHAR(100) NOT NULL,
  current_value DECIMAL(10,4) NOT NULL,
  baseline_value DECIMAL(10,4) NOT NULL,
  regression_percentage DECIMAL(6,2) NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),
  affected_components JSONB NOT NULL DEFAULT '[]',
  potential_causes JSONB NOT NULL DEFAULT '[]',
  recommended_actions JSONB NOT NULL DEFAULT '[]',
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for performance tests
CREATE TABLE IF NOT EXISTS seller_performance_tests (
  test_id VARCHAR(255) PRIMARY KEY,
  seller_id UUID NOT NULL,
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('load', 'stress', 'endurance', 'spike', 'volume')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in milliseconds
  results JSONB,
  regressions JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for performance baselines
CREATE TABLE IF NOT EXISTS seller_performance_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  baseline_value DECIMAL(10,4) NOT NULL,
  confidence_interval DECIMAL(6,2) DEFAULT 95.0,
  sample_size INTEGER DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(seller_id, metric_name)
);

-- Table for performance recommendations
CREATE TABLE IF NOT EXISTS seller_performance_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  expected_impact TEXT,
  effort VARCHAR(20) CHECK (effort IN ('low', 'medium', 'high')),
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'implemented', 'dismissed')),
  implemented_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_seller_performance_metrics_seller_timestamp 
ON seller_performance_metrics(seller_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_seller_performance_metrics_timestamp 
ON seller_performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_seller_performance_alerts_seller_severity 
ON seller_performance_alerts(seller_id, severity, resolved);

CREATE INDEX IF NOT EXISTS idx_seller_performance_alerts_timestamp 
ON seller_performance_alerts(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_seller_performance_regressions_seller_severity 
ON seller_performance_regressions(seller_id, severity, resolved);

CREATE INDEX IF NOT EXISTS idx_seller_performance_regressions_detected 
ON seller_performance_regressions(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_performance_tests_seller_status 
ON seller_performance_tests(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_seller_performance_tests_start_time 
ON seller_performance_tests(start_time DESC);

CREATE INDEX IF NOT EXISTS idx_seller_performance_baselines_seller_metric 
ON seller_performance_baselines(seller_id, metric_name);

CREATE INDEX IF NOT EXISTS idx_seller_performance_recommendations_seller_priority 
ON seller_performance_recommendations(seller_id, priority, status);

-- GIN indexes for JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_seller_performance_metrics_component_load_times 
ON seller_performance_metrics USING GIN (component_load_times);

CREATE INDEX IF NOT EXISTS idx_seller_performance_metrics_api_response_times 
ON seller_performance_metrics USING GIN (api_response_times);

CREATE INDEX IF NOT EXISTS idx_seller_performance_metrics_cache_metrics 
ON seller_performance_metrics USING GIN (cache_metrics);

CREATE INDEX IF NOT EXISTS idx_seller_performance_metrics_error_metrics 
ON seller_performance_metrics USING GIN (error_metrics);

CREATE INDEX IF NOT EXISTS idx_seller_performance_alerts_metrics 
ON seller_performance_alerts USING GIN (metrics);

-- Partial indexes for active/unresolved items
CREATE INDEX IF NOT EXISTS idx_seller_performance_alerts_active 
ON seller_performance_alerts(seller_id, timestamp DESC) 
WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_seller_performance_regressions_active 
ON seller_performance_regressions(seller_id, detected_at DESC) 
WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_seller_performance_recommendations_active 
ON seller_performance_recommendations(seller_id, priority) 
WHERE status = 'active';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_seller_performance_metrics_updated_at 
BEFORE UPDATE ON seller_performance_metrics 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_performance_alerts_updated_at 
BEFORE UPDATE ON seller_performance_alerts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_performance_regressions_updated_at 
BEFORE UPDATE ON seller_performance_regressions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_performance_tests_updated_at 
BEFORE UPDATE ON seller_performance_tests 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_performance_baselines_updated_at 
BEFORE UPDATE ON seller_performance_baselines 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_performance_recommendations_updated_at 
BEFORE UPDATE ON seller_performance_recommendations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old performance metrics (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete metrics older than 90 days
    DELETE FROM seller_performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete resolved alerts older than 30 days
    DELETE FROM seller_performance_alerts 
    WHERE resolved = TRUE AND resolved_at < NOW() - INTERVAL '30 days';
    
    -- Delete resolved regressions older than 30 days
    DELETE FROM seller_performance_regressions 
    WHERE resolved = TRUE AND resolved_at < NOW() - INTERVAL '30 days';
    
    -- Delete completed tests older than 60 days
    DELETE FROM seller_performance_tests 
    WHERE status = 'completed' AND end_time < NOW() - INTERVAL '60 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-performance-metrics', '0 2 * * *', 'SELECT cleanup_old_performance_metrics();');

-- Insert some sample performance thresholds/configurations
INSERT INTO seller_performance_baselines (seller_id, metric_name, baseline_value, confidence_interval, sample_size) 
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'api_response_time_get_profile', 1000.0, 95.0, 100),
  ('00000000-0000-0000-0000-000000000000', 'api_response_time_update_profile', 1500.0, 95.0, 100),
  ('00000000-0000-0000-0000-000000000000', 'cache_hit_rate', 90.0, 95.0, 100),
  ('00000000-0000-0000-0000-000000000000', 'error_rate', 1.0, 95.0, 100),
  ('00000000-0000-0000-0000-000000000000', 'first_contentful_paint', 2000.0, 95.0, 100),
  ('00000000-0000-0000-0000-000000000000', 'largest_contentful_paint', 3500.0, 95.0, 100)
ON CONFLICT (seller_id, metric_name) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE seller_performance_metrics IS 'Stores comprehensive performance metrics for seller components and APIs';
COMMENT ON TABLE seller_performance_alerts IS 'Stores performance alerts with severity levels and resolution tracking';
COMMENT ON TABLE seller_performance_regressions IS 'Tracks performance regressions detected through automated monitoring';
COMMENT ON TABLE seller_performance_tests IS 'Records automated performance regression test results';
COMMENT ON TABLE seller_performance_baselines IS 'Maintains performance baselines for regression detection';
COMMENT ON TABLE seller_performance_recommendations IS 'Stores AI-generated performance improvement recommendations';

COMMENT ON COLUMN seller_performance_metrics.component_load_times IS 'JSON object containing load times for seller components';
COMMENT ON COLUMN seller_performance_metrics.api_response_times IS 'JSON object containing API endpoint response times';
COMMENT ON COLUMN seller_performance_metrics.cache_metrics IS 'JSON object containing cache performance metrics';
COMMENT ON COLUMN seller_performance_metrics.error_metrics IS 'JSON object containing error rates and types';
COMMENT ON COLUMN seller_performance_metrics.user_experience_metrics IS 'JSON object containing Web Vitals and UX metrics';
COMMENT ON COLUMN seller_performance_metrics.mobile_metrics IS 'JSON object containing mobile-specific performance metrics';
COMMENT ON COLUMN seller_performance_metrics.real_time_metrics IS 'JSON object containing WebSocket and real-time feature metrics';