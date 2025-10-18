-- AI Insights Engine Database Schema

-- Prediction Results Table
CREATE TABLE IF NOT EXISTS prediction_results (
    id SERIAL PRIMARY KEY,
    prediction_id VARCHAR(255) UNIQUE NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    target_metric VARCHAR(255) NOT NULL,
    predicted_value DECIMAL(15,4) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    prediction_horizon INTEGER NOT NULL,
    factors JSONB,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    upper_bound DECIMAL(15,4),
    lower_bound DECIMAL(15,4),
    actual_value DECIMAL(15,4),
    accuracy DECIMAL(5,4),
    error DECIMAL(15,4),
    within_confidence_interval BOOLEAN,
    evaluated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anomaly Detections Table
CREATE TABLE IF NOT EXISTS anomaly_detections (
    id SERIAL PRIMARY KEY,
    anomaly_id VARCHAR(255) UNIQUE NOT NULL,
    anomaly_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    affected_entity_type VARCHAR(100),
    affected_entity_id VARCHAR(255),
    affected_metrics JSONB,
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    suggested_actions JSONB,
    investigation_data JSONB,
    possible_causes JSONB,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'detected' CHECK (status IN ('detected', 'investigating', 'resolved', 'false_positive')),
    is_false_positive BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Insights Table
CREATE TABLE IF NOT EXISTS ai_insights (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('trend', 'anomaly', 'recommendation', 'alert', 'opportunity', 'risk')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    action_items JSONB,
    related_metrics JSONB,
    category VARCHAR(100) NOT NULL,
    priority INTEGER DEFAULT 0,
    impact VARCHAR(20) CHECK (impact IN ('positive', 'negative', 'neutral')),
    timeframe VARCHAR(100),
    metadata JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'implemented', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insight Tracking Table
CREATE TABLE IF NOT EXISTS insight_tracking (
    id SERIAL PRIMARY KEY,
    insight_id VARCHAR(255) NOT NULL REFERENCES ai_insights(id),
    action_taken BOOLEAN NOT NULL DEFAULT FALSE,
    action_type VARCHAR(100),
    implementation_date TIMESTAMP WITH TIME ZONE,
    measured_impact JSONB,
    outcome VARCHAR(50) CHECK (outcome IN ('successful', 'failed', 'partial', 'pending')),
    feedback TEXT,
    tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend Analyses Table
CREATE TABLE IF NOT EXISTS trend_analyses (
    id SERIAL PRIMARY KEY,
    trend_id VARCHAR(255) UNIQUE NOT NULL,
    metric VARCHAR(255) NOT NULL,
    timeframe VARCHAR(50) NOT NULL,
    trend_type VARCHAR(50) NOT NULL CHECK (trend_type IN ('linear', 'exponential', 'logarithmic', 'polynomial', 'seasonal', 'cyclical')),
    direction VARCHAR(50) NOT NULL CHECK (direction IN ('increasing', 'decreasing', 'stable', 'volatile')),
    strength DECIMAL(5,4) NOT NULL CHECK (strength >= 0 AND strength <= 1),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    statistical_significance DECIMAL(10,8),
    data_points JSONB,
    trend_line JSONB,
    seasonality JSONB,
    change_points JSONB,
    forecast JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seasonal Patterns Table
CREATE TABLE IF NOT EXISTS seasonal_patterns (
    id SERIAL PRIMARY KEY,
    pattern_id VARCHAR(255) UNIQUE NOT NULL,
    metric VARCHAR(255) NOT NULL,
    season_type VARCHAR(50) NOT NULL CHECK (season_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    period INTEGER NOT NULL,
    amplitude DECIMAL(15,4),
    phase DECIMAL(15,4),
    confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    examples JSONB,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend Alerts Table
CREATE TABLE IF NOT EXISTS trend_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) UNIQUE NOT NULL,
    trend_id VARCHAR(255),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('trend_change', 'threshold_breach', 'anomaly', 'forecast_deviation')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metric VARCHAR(255) NOT NULL,
    current_value DECIMAL(15,4) NOT NULL,
    expected_value DECIMAL(15,4),
    threshold DECIMAL(15,4),
    recommended_actions JSONB,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forecast Models Table
CREATE TABLE IF NOT EXISTS forecast_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(255) UNIQUE NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('arima', 'exponential_smoothing', 'linear_regression', 'prophet', 'lstm')),
    metric VARCHAR(255) NOT NULL,
    parameters JSONB,
    accuracy JSONB,
    training_period_start TIMESTAMP WITH TIME ZONE,
    training_period_end TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metric Data Table (for storing time series data)
CREATE TABLE IF NOT EXISTS metric_data (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    value DECIMAL(15,4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    dimensions JSONB,
    tags JSONB,
    source VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prediction_results_metric ON prediction_results(target_metric);
CREATE INDEX IF NOT EXISTS idx_prediction_results_timestamp ON prediction_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_id ON prediction_results(prediction_id);

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_type ON anomaly_detections(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_detected_at ON anomaly_detections(detected_at);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_status ON anomaly_detections(status);

CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);

CREATE INDEX IF NOT EXISTS idx_insight_tracking_insight_id ON insight_tracking(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_tracking_outcome ON insight_tracking(outcome);
CREATE INDEX IF NOT EXISTS idx_insight_tracking_tracked_at ON insight_tracking(tracked_at);

CREATE INDEX IF NOT EXISTS idx_trend_analyses_metric ON trend_analyses(metric);
CREATE INDEX IF NOT EXISTS idx_trend_analyses_direction ON trend_analyses(direction);
CREATE INDEX IF NOT EXISTS idx_trend_analyses_created_at ON trend_analyses(created_at);

CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_metric ON seasonal_patterns(metric);
CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_season_type ON seasonal_patterns(season_type);
CREATE INDEX IF NOT EXISTS idx_seasonal_patterns_detected_at ON seasonal_patterns(detected_at);

CREATE INDEX IF NOT EXISTS idx_trend_alerts_metric ON trend_alerts(metric);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_severity ON trend_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_triggered_at ON trend_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_status ON trend_alerts(status);

CREATE INDEX IF NOT EXISTS idx_forecast_models_metric ON forecast_models(metric);
CREATE INDEX IF NOT EXISTS idx_forecast_models_model_type ON forecast_models(model_type);
CREATE INDEX IF NOT EXISTS idx_forecast_models_is_active ON forecast_models(is_active);

CREATE INDEX IF NOT EXISTS idx_metric_data_metric_name ON metric_data(metric_name);
CREATE INDEX IF NOT EXISTS idx_metric_data_timestamp ON metric_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_metric_data_metric_timestamp ON metric_data(metric_name, timestamp);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity_detected_at ON anomaly_detections(severity, detected_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type_severity ON ai_insights(type, severity);
CREATE INDEX IF NOT EXISTS idx_trend_alerts_metric_triggered_at ON trend_alerts(metric, triggered_at);

-- Add comments for documentation
COMMENT ON TABLE prediction_results IS 'Stores results from predictive analytics models';
COMMENT ON TABLE anomaly_detections IS 'Stores detected anomalies and their investigation results';
COMMENT ON TABLE ai_insights IS 'Stores AI-generated insights and recommendations';
COMMENT ON TABLE insight_tracking IS 'Tracks the implementation and outcomes of insights';
COMMENT ON TABLE trend_analyses IS 'Stores trend analysis results for various metrics';
COMMENT ON TABLE seasonal_patterns IS 'Stores detected seasonal patterns in data';
COMMENT ON TABLE trend_alerts IS 'Stores trend-based alerts and notifications';
COMMENT ON TABLE forecast_models IS 'Stores information about forecasting models';
COMMENT ON TABLE metric_data IS 'Stores time series data for various metrics';

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prediction_results_updated_at BEFORE UPDATE ON prediction_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_anomaly_detections_updated_at BEFORE UPDATE ON anomaly_detections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_insights_updated_at BEFORE UPDATE ON ai_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_insight_tracking_updated_at BEFORE UPDATE ON insight_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trend_analyses_updated_at BEFORE UPDATE ON trend_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasonal_patterns_updated_at BEFORE UPDATE ON seasonal_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trend_alerts_updated_at BEFORE UPDATE ON trend_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forecast_models_updated_at BEFORE UPDATE ON forecast_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();