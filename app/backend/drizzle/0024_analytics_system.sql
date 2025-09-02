-- Analytics and Business Intelligence System
-- Migration for comprehensive analytics tracking

-- User behavior tracking
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
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_analytics_user_id (user_id),
    INDEX idx_user_analytics_event_type (event_type),
    INDEX idx_user_analytics_timestamp (timestamp),
    INDEX idx_user_analytics_session (session_id)
);

-- Platform metrics tracking
CREATE TABLE platform_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20,8) NOT NULL,
    metric_unit VARCHAR(50),
    dimensions JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_platform_metrics_name (metric_name),
    INDEX idx_platform_metrics_timestamp (timestamp)
);

-- Transaction analytics
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
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_transaction_analytics_order (order_id),
    INDEX idx_transaction_analytics_type (transaction_type),
    INDEX idx_transaction_analytics_timestamp (timestamp)
);

-- Seller performance analytics
CREATE TABLE seller_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES users(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales DECIMAL(20,8) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    avg_order_value DECIMAL(20,8) DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    customer_satisfaction DECIMAL(3,2) DEFAULT 0,
    return_rate DECIMAL(5,4) DEFAULT 0,
    dispute_rate DECIMAL(5,4) DEFAULT 0,
    response_time_hours DECIMAL(8,2) DEFAULT 0,
    shipping_time_days DECIMAL(6,2) DEFAULT 0,
    repeat_customer_rate DECIMAL(5,4) DEFAULT 0,
    revenue_growth DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(seller_id, period_start, period_end),
    INDEX idx_seller_analytics_seller (seller_id),
    INDEX idx_seller_analytics_period (period_start, period_end)
);

-- Market trend analytics
CREATE TABLE market_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    trend_type VARCHAR(50) NOT NULL,
    trend_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, seasonal
    trend_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_market_trends_category (category_id),
    INDEX idx_market_trends_type (trend_type),
    INDEX idx_market_trends_period (trend_period)
);

-- Anomaly detection logs
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    description TEXT NOT NULL,
    affected_entity_type VARCHAR(50),
    affected_entity_id UUID,
    detection_data JSONB,
    confidence_score DECIMAL(3,2),
    status VARCHAR(20) DEFAULT 'detected', -- detected, investigating, resolved, false_positive
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_anomaly_detections_type (anomaly_type),
    INDEX idx_anomaly_detections_severity (severity),
    INDEX idx_anomaly_detections_status (status),
    INDEX idx_anomaly_detections_timestamp (created_at)
);

-- Real-time dashboard metrics cache
CREATE TABLE dashboard_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_key VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(metric_key),
    INDEX idx_dashboard_metrics_key (metric_key),
    INDEX idx_dashboard_metrics_expires (expires_at)
);

-- Customer insights and segmentation
CREATE TABLE customer_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    segment VARCHAR(50),
    lifetime_value DECIMAL(20,8),
    avg_order_frequency DECIMAL(8,2),
    preferred_categories TEXT[],
    preferred_payment_methods TEXT[],
    risk_score DECIMAL(3,2),
    churn_probability DECIMAL(3,2),
    last_calculated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id),
    INDEX idx_customer_insights_segment (segment),
    INDEX idx_customer_insights_ltv (lifetime_value),
    INDEX idx_customer_insights_risk (risk_score)
);

-- Search and discovery analytics
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
    timestamp TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_search_analytics_query (search_query),
    INDEX idx_search_analytics_user (user_id),
    INDEX idx_search_analytics_timestamp (timestamp)
);