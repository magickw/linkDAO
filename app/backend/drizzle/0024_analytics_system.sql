-- Analytics and Business Intelligence System
-- Migration for comprehensive analytics tracking

-- User behavior tracking
DROP TABLE IF EXISTS "user_analytics" CASCADE;
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    page_url TEXT,
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    city VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(50),
    referrer TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
    
);

-- Platform metrics tracking
DROP TABLE IF EXISTS "platform_metrics" CASCADE;
CREATE TABLE platform_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20,8) NOT NULL,
    metric_unit VARCHAR(50),
    dimensions JSONB,
    timestamp TIMESTAMP DEFAULT NOW()
    
);

-- Transaction analytics
DROP TABLE IF EXISTS "transaction_analytics" CASCADE;
CREATE TABLE transaction_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID,
    order_id UUID REFERENCES orders(id),
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20,8),
    currency VARCHAR(10),
    fee_amount DECIMAL(20,8),
    gas_used BIGINT,
    gas_price DECIMAL(20,8),
    block_number BIGINT,
    transaction_hash VARCHAR(66),
    status VARCHAR(20),
    processing_time_ms INTEGER,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
    
);

-- Seller performance analytics
DROP TABLE IF EXISTS "seller_analytics" CASCADE;
CREATE TABLE seller_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales DECIMAL(20,8) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    avg_order_value DECIMAL(20,8) DEFAULT 0,
    conversion_rate DECIMAL(10,4) DEFAULT 0,
    customer_satisfaction DECIMAL(10,4) DEFAULT 0,
    return_rate DECIMAL(10,4) DEFAULT 0,
    dispute_rate DECIMAL(10,4) DEFAULT 0,
    response_time_hours DECIMAL(8,2) DEFAULT 0,
    shipping_time_days DECIMAL(10,4) DEFAULT 0,
    repeat_customer_rate DECIMAL(10,4) DEFAULT 0,
    revenue_growth DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(seller_id, period_start, period_end)
);

-- Market trend analytics
DROP TABLE IF EXISTS "market_trends" CASCADE;
CREATE TABLE market_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    trend_type VARCHAR(50) NOT NULL,
    trend_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, seasonal
    trend_data JSONB NOT NULL,
    confidence_score DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT NOW()
    
);

-- Anomaly detection logs
DROP TABLE IF EXISTS "anomaly_detections" CASCADE;
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    description TEXT NOT NULL,
    affected_entity_type VARCHAR(50),
    affected_entity_id UUID,
    detection_data JSONB,
    confidence_score DECIMAL(10,4),
    status VARCHAR(20) DEFAULT 'detected', -- detected, investigating, resolved, false_positive
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
    
);

-- Real-time dashboard metrics cache
DROP TABLE IF EXISTS "dashboard_metrics_cache" CASCADE;
CREATE TABLE dashboard_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(metric_key)
);

-- Customer insights and segmentation
DROP TABLE IF EXISTS "customer_insights" CASCADE;
CREATE TABLE customer_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    segment VARCHAR(50),
    lifetime_value DECIMAL(20,8),
    avg_order_frequency DECIMAL(8,2),
    preferred_categories TEXT[],
    preferred_payment_methods TEXT[],
    risk_score DECIMAL(10,4),
    churn_probability DECIMAL(10,4),
    last_calculated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Search and discovery analytics
DROP TABLE IF EXISTS "search_analytics" CASCADE;
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255),
    user_id UUID REFERENCES users(id),
    search_query TEXT,
    search_filters JSONB,
    results_count INTEGER,
    clicked_results INTEGER[],
    conversion_product_id UUID,
    search_duration_ms INTEGER,
    timestamp TIMESTAMP DEFAULT NOW()
    
);
-- Extracted Indexes
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics (event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_timestamp ON user_analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_user_analytics_session ON user_analytics (session_id);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_name ON platform_metrics (metric_name);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_timestamp ON platform_metrics (timestamp);
CREATE INDEX IF NOT EXISTS idx_transaction_analytics_order ON transaction_analytics (order_id);
CREATE INDEX IF NOT EXISTS idx_transaction_analytics_type ON transaction_analytics (transaction_type);
CREATE INDEX IF NOT EXISTS idx_transaction_analytics_timestamp ON transaction_analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_seller ON seller_analytics (seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_analytics_period ON seller_analytics (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_market_trends_category ON market_trends (category_id);
CREATE INDEX IF NOT EXISTS idx_market_trends_type ON market_trends (trend_type);
CREATE INDEX IF NOT EXISTS idx_market_trends_period ON market_trends (trend_period);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_type ON anomaly_detections (anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON anomaly_detections (severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_status ON anomaly_detections (status);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_timestamp ON anomaly_detections (created_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_key ON dashboard_metrics_cache (metric_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_expires ON dashboard_metrics_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_insights_segment ON customer_insights (segment);
CREATE INDEX IF NOT EXISTS idx_customer_insights_ltv ON customer_insights (lifetime_value);
CREATE INDEX IF NOT EXISTS idx_customer_insights_risk ON customer_insights (risk_score);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics (search_query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics (timestamp);
