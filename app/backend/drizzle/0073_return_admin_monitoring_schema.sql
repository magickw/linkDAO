-- Return and Refund Admin Monitoring System
-- Comprehensive analytics and monitoring schema for admin dashboard
-- Builds on top of existing returns/refunds system (0055_returns_refunds_system.sql)

-- ============================================================================
-- RETURN EVENTS TABLE - Comprehensive event tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'created', 'approved', 'rejected', 'label_generated', 'shipped', 
    'in_transit', 'received', 'inspected', 'refund_initiated', 
    'refund_completed', 'refund_failed', 'completed', 'cancelled',
    'status_changed', 'message_sent', 'escalated', 'risk_flagged'
  )),
  event_category VARCHAR(30) NOT NULL CHECK (event_category IN (
    'lifecycle', 'communication', 'financial', 'risk', 'admin_action'
  )),
  
  -- Event data
  event_data JSONB NOT NULL DEFAULT '{}', -- Flexible event-specific data
  previous_state JSONB, -- State before event
  new_state JSONB, -- State after event
  
  -- Actor information
  actor_id UUID REFERENCES users(id),
  actor_role VARCHAR(20) CHECK (actor_role IN ('buyer', 'seller', 'admin', 'system')),
  actor_ip_address VARCHAR(45), -- IPv4 or IPv6
  actor_user_agent TEXT,
  
  -- Context
  session_id VARCHAR(100),
  automated BOOLEAN DEFAULT false, -- Was this automated or manual?
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for return events
CREATE INDEX idx_return_events_return_id ON return_events(return_id);
CREATE INDEX idx_return_events_event_type ON return_events(event_type);
CREATE INDEX idx_return_events_event_category ON return_events(event_category);
CREATE INDEX idx_return_events_timestamp ON return_events(timestamp DESC);
CREATE INDEX idx_return_events_actor_id ON return_events(actor_id);
CREATE INDEX idx_return_events_automated ON return_events(automated);
CREATE INDEX idx_return_events_composite ON return_events(return_id, timestamp DESC);

-- ============================================================================
-- RETURN ANALYTICS AGGREGATIONS - Pre-computed metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_analytics_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time dimension
  hour_timestamp TIMESTAMP NOT NULL, -- Start of the hour
  
  -- Volume metrics
  total_returns INTEGER DEFAULT 0,
  new_returns INTEGER DEFAULT 0,
  approved_returns INTEGER DEFAULT 0,
  rejected_returns INTEGER DEFAULT 0,
  completed_returns INTEGER DEFAULT 0,
  cancelled_returns INTEGER DEFAULT 0,
  
  -- Status distribution
  status_requested INTEGER DEFAULT 0,
  status_approved INTEGER DEFAULT 0,
  status_rejected INTEGER DEFAULT 0,
  status_in_transit INTEGER DEFAULT 0,
  status_received INTEGER DEFAULT 0,
  status_inspected INTEGER DEFAULT 0,
  status_refund_processing INTEGER DEFAULT 0,
  status_completed INTEGER DEFAULT 0,
  
  -- Financial metrics
  total_refund_amount DECIMAL(20, 8) DEFAULT 0,
  avg_refund_amount DECIMAL(20, 8) DEFAULT 0,
  max_refund_amount DECIMAL(20, 8) DEFAULT 0,
  min_refund_amount DECIMAL(20, 8) DEFAULT 0,
  total_restocking_fees DECIMAL(20, 8) DEFAULT 0,
  total_shipping_costs DECIMAL(20, 8) DEFAULT 0,
  
  -- Processing time metrics (in hours)
  avg_approval_time DECIMAL(10, 2),
  avg_refund_time DECIMAL(10, 2),
  avg_total_resolution_time DECIMAL(10, 2),
  median_approval_time DECIMAL(10, 2),
  p95_approval_time DECIMAL(10, 2), -- 95th percentile
  
  -- Return reasons breakdown
  reason_defective INTEGER DEFAULT 0,
  reason_wrong_item INTEGER DEFAULT 0,
  reason_not_as_described INTEGER DEFAULT 0,
  reason_damaged_shipping INTEGER DEFAULT 0,
  reason_changed_mind INTEGER DEFAULT 0,
  reason_better_price INTEGER DEFAULT 0,
  reason_no_longer_needed INTEGER DEFAULT 0,
  reason_other INTEGER DEFAULT 0,
  
  -- Risk metrics
  high_risk_returns INTEGER DEFAULT 0,
  medium_risk_returns INTEGER DEFAULT 0,
  low_risk_returns INTEGER DEFAULT 0,
  flagged_for_review INTEGER DEFAULT 0,
  fraud_detected INTEGER DEFAULT 0,
  
  -- Customer satisfaction
  avg_satisfaction_score DECIMAL(3, 2), -- 1.00 to 5.00
  satisfaction_responses INTEGER DEFAULT 0,
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(hour_timestamp)
);

CREATE TABLE IF NOT EXISTS return_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time dimension
  date DATE NOT NULL,
  
  -- Volume metrics
  total_returns INTEGER DEFAULT 0,
  new_returns INTEGER DEFAULT 0,
  approved_returns INTEGER DEFAULT 0,
  rejected_returns INTEGER DEFAULT 0,
  completed_returns INTEGER DEFAULT 0,
  cancelled_returns INTEGER DEFAULT 0,
  
  -- Status distribution
  status_requested INTEGER DEFAULT 0,
  status_approved INTEGER DEFAULT 0,
  status_rejected INTEGER DEFAULT 0,
  status_in_transit INTEGER DEFAULT 0,
  status_received INTEGER DEFAULT 0,
  status_inspected INTEGER DEFAULT 0,
  status_refund_processing INTEGER DEFAULT 0,
  status_completed INTEGER DEFAULT 0,
  
  -- Financial metrics
  total_refund_amount DECIMAL(20, 8) DEFAULT 0,
  avg_refund_amount DECIMAL(20, 8) DEFAULT 0,
  max_refund_amount DECIMAL(20, 8) DEFAULT 0,
  min_refund_amount DECIMAL(20, 8) DEFAULT 0,
  total_restocking_fees DECIMAL(20, 8) DEFAULT 0,
  total_shipping_costs DECIMAL(20, 8) DEFAULT 0,
  net_refund_impact DECIMAL(20, 8) DEFAULT 0, -- Total refunds - fees
  
  -- Processing time metrics (in hours)
  avg_approval_time DECIMAL(10, 2),
  avg_refund_time DECIMAL(10, 2),
  avg_total_resolution_time DECIMAL(10, 2),
  median_approval_time DECIMAL(10, 2),
  p95_approval_time DECIMAL(10, 2),
  p99_approval_time DECIMAL(10, 2),
  
  -- Return reasons breakdown
  reason_defective INTEGER DEFAULT 0,
  reason_wrong_item INTEGER DEFAULT 0,
  reason_not_as_described INTEGER DEFAULT 0,
  reason_damaged_shipping INTEGER DEFAULT 0,
  reason_changed_mind INTEGER DEFAULT 0,
  reason_better_price INTEGER DEFAULT 0,
  reason_no_longer_needed INTEGER DEFAULT 0,
  reason_other INTEGER DEFAULT 0,
  
  -- Risk metrics
  high_risk_returns INTEGER DEFAULT 0,
  medium_risk_returns INTEGER DEFAULT 0,
  low_risk_returns INTEGER DEFAULT 0,
  flagged_for_review INTEGER DEFAULT 0,
  fraud_detected INTEGER DEFAULT 0,
  avg_risk_score DECIMAL(5, 2),
  
  -- Customer satisfaction
  avg_satisfaction_score DECIMAL(3, 2),
  satisfaction_responses INTEGER DEFAULT 0,
  nps_score INTEGER, -- Net Promoter Score
  
  -- Return rate
  return_rate DECIMAL(5, 2), -- Percentage of orders returned
  total_orders INTEGER DEFAULT 0,
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(date)
);

-- Indexes for analytics aggregations
CREATE INDEX idx_return_analytics_hourly_timestamp ON return_analytics_hourly(hour_timestamp DESC);
CREATE INDEX idx_return_analytics_daily_date ON return_analytics_daily(date DESC);

-- ============================================================================
-- TIME-SERIES METRICS - Real-time monitoring data
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_metrics_realtime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamp (5-minute intervals)
  timestamp TIMESTAMP NOT NULL,
  
  -- Current state metrics
  active_returns INTEGER DEFAULT 0,
  pending_approval INTEGER DEFAULT 0,
  pending_refund INTEGER DEFAULT 0,
  in_transit_returns INTEGER DEFAULT 0,
  
  -- Rate metrics (per minute)
  returns_per_minute DECIMAL(10, 2) DEFAULT 0,
  approvals_per_minute DECIMAL(10, 2) DEFAULT 0,
  refunds_per_minute DECIMAL(10, 2) DEFAULT 0,
  
  -- Processing queue depth
  manual_review_queue_depth INTEGER DEFAULT 0,
  refund_processing_queue_depth INTEGER DEFAULT 0,
  inspection_queue_depth INTEGER DEFAULT 0,
  
  -- Alert triggers
  volume_spike_detected BOOLEAN DEFAULT false,
  processing_delay_detected BOOLEAN DEFAULT false,
  refund_failure_spike BOOLEAN DEFAULT false,
  
  -- System health
  avg_api_response_time_ms INTEGER,
  error_rate DECIMAL(5, 2), -- Percentage
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(timestamp)
);

-- Index for real-time metrics
CREATE INDEX idx_return_metrics_realtime_timestamp ON return_metrics_realtime(timestamp DESC);
CREATE INDEX idx_return_metrics_realtime_alerts ON return_metrics_realtime(timestamp DESC) 
  WHERE volume_spike_detected = true OR processing_delay_detected = true OR refund_failure_spike = true;

-- ============================================================================
-- SELLER RETURN PERFORMANCE - Seller-specific analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_return_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
  
  -- Volume metrics
  total_returns INTEGER DEFAULT 0,
  approved_returns INTEGER DEFAULT 0,
  rejected_returns INTEGER DEFAULT 0,
  approval_rate DECIMAL(5, 2), -- Percentage
  
  -- Financial impact
  total_refund_amount DECIMAL(20, 8) DEFAULT 0,
  total_revenue DECIMAL(20, 8) DEFAULT 0,
  refund_to_revenue_ratio DECIMAL(5, 4), -- Ratio
  
  -- Processing performance
  avg_approval_time_hours DECIMAL(10, 2),
  avg_refund_time_hours DECIMAL(10, 2),
  sla_compliance_rate DECIMAL(5, 2), -- Percentage meeting SLA
  
  -- Quality metrics
  return_rate DECIMAL(5, 2), -- Returns / Total orders
  defect_rate DECIMAL(5, 2), -- Defective returns / Total returns
  customer_satisfaction DECIMAL(3, 2), -- Average satisfaction score
  
  -- Risk indicators
  fraud_incidents INTEGER DEFAULT 0,
  policy_violations INTEGER DEFAULT 0,
  avg_risk_score DECIMAL(5, 2),
  
  -- Compliance
  policy_compliant BOOLEAN DEFAULT true,
  compliance_score DECIMAL(5, 2), -- 0-100
  violations JSONB DEFAULT '[]', -- Array of violation details
  
  -- Rankings
  performance_rank INTEGER, -- Rank among all sellers
  category_rank INTEGER, -- Rank within category
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(seller_id, period_start, period_end, period_type)
);

-- Indexes for seller performance
CREATE INDEX idx_seller_return_performance_seller_id ON seller_return_performance(seller_id);
CREATE INDEX idx_seller_return_performance_period ON seller_return_performance(period_start, period_end);
CREATE INDEX idx_seller_return_performance_rank ON seller_return_performance(performance_rank);
CREATE INDEX idx_seller_return_performance_compliance ON seller_return_performance(policy_compliant, compliance_score);

-- ============================================================================
-- CATEGORY RETURN ANALYTICS - Category-level insights
-- ============================================================================

CREATE TABLE IF NOT EXISTS category_return_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Volume metrics
  total_returns INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  return_rate DECIMAL(5, 2), -- Percentage
  
  -- Financial metrics
  total_refund_amount DECIMAL(20, 8) DEFAULT 0,
  avg_refund_amount DECIMAL(20, 8) DEFAULT 0,
  
  -- Return reasons (category-specific patterns)
  top_return_reasons JSONB, -- Array of {reason, count, percentage}
  
  -- Quality indicators
  defect_rate DECIMAL(5, 2),
  damage_rate DECIMAL(5, 2),
  misdescription_rate DECIMAL(5, 2),
  
  -- Trends
  return_rate_trend VARCHAR(20) CHECK (return_rate_trend IN ('increasing', 'decreasing', 'stable')),
  trend_percentage DECIMAL(5, 2), -- Change from previous period
  
  -- Benchmarks
  industry_benchmark_return_rate DECIMAL(5, 2),
  performance_vs_benchmark VARCHAR(20) CHECK (performance_vs_benchmark IN ('above', 'at', 'below')),
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(category_id, period_start, period_end)
);

-- Indexes for category analytics
CREATE INDEX idx_category_return_analytics_category_id ON category_return_analytics(category_id);
CREATE INDEX idx_category_return_analytics_period ON category_return_analytics(period_start, period_end);
CREATE INDEX idx_category_return_analytics_return_rate ON category_return_analytics(return_rate DESC);

-- ============================================================================
-- REFUND PROVIDER PERFORMANCE - Payment provider tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS refund_provider_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider identification
  provider VARCHAR(30) NOT NULL, -- 'stripe', 'paypal', 'blockchain'
  
  -- Time period
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Volume metrics
  total_refunds INTEGER DEFAULT 0,
  successful_refunds INTEGER DEFAULT 0,
  failed_refunds INTEGER DEFAULT 0,
  pending_refunds INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2), -- Percentage
  
  -- Financial metrics
  total_refund_amount DECIMAL(20, 8) DEFAULT 0,
  total_fees DECIMAL(20, 8) DEFAULT 0,
  avg_refund_amount DECIMAL(20, 8) DEFAULT 0,
  
  -- Performance metrics
  avg_processing_time_minutes DECIMAL(10, 2),
  median_processing_time_minutes DECIMAL(10, 2),
  p95_processing_time_minutes DECIMAL(10, 2),
  
  -- Reliability metrics
  uptime_percentage DECIMAL(5, 2),
  error_rate DECIMAL(5, 2),
  retry_rate DECIMAL(5, 2), -- Percentage requiring retries
  
  -- Error analysis
  error_breakdown JSONB, -- {error_code: count}
  top_errors JSONB, -- Array of most common errors
  
  -- Status
  operational_status VARCHAR(20) CHECK (operational_status IN ('operational', 'degraded', 'down')),
  last_successful_refund TIMESTAMP,
  last_failure TIMESTAMP,
  
  -- Metadata
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(provider, period_start, period_end)
);

-- Indexes for provider performance
CREATE INDEX idx_refund_provider_performance_provider ON refund_provider_performance(provider);
CREATE INDEX idx_refund_provider_performance_period ON refund_provider_performance(period_start, period_end);
CREATE INDEX idx_refund_provider_performance_status ON refund_provider_performance(operational_status);

-- ============================================================================
-- ADMIN ALERTS - Alert tracking and management
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alert classification
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'volume_spike', 'processing_delay', 'refund_failure_spike', 
    'high_risk_pattern', 'fraud_detected', 'policy_violation',
    'sla_breach', 'provider_degradation', 'system_error'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Alert details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  affected_entity_type VARCHAR(30), -- 'return', 'seller', 'category', 'provider'
  affected_entity_id UUID,
  
  -- Metrics that triggered alert
  trigger_metric VARCHAR(50),
  trigger_threshold DECIMAL(20, 8),
  actual_value DECIMAL(20, 8),
  
  -- Context
  context_data JSONB DEFAULT '{}',
  recommended_actions JSONB, -- Array of suggested actions
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  
  -- Notification
  notified_admins JSONB, -- Array of admin IDs notified
  notification_sent_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for admin alerts
CREATE INDEX idx_return_admin_alerts_type ON return_admin_alerts(alert_type);
CREATE INDEX idx_return_admin_alerts_severity ON return_admin_alerts(severity);
CREATE INDEX idx_return_admin_alerts_status ON return_admin_alerts(status);
CREATE INDEX idx_return_admin_alerts_created_at ON return_admin_alerts(created_at DESC);
CREATE INDEX idx_return_admin_alerts_active ON return_admin_alerts(status, severity) WHERE status = 'active';

-- ============================================================================
-- AUDIT LOG - Comprehensive admin action tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Admin identification
  admin_id UUID NOT NULL REFERENCES users(id),
  admin_email VARCHAR(255),
  admin_role VARCHAR(50),
  
  -- Action details
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'view_return', 'approve_return', 'reject_return', 'modify_return',
    'process_refund', 'cancel_refund', 'update_policy', 'generate_report',
    'export_data', 'modify_settings', 'escalate_case', 'resolve_dispute'
  )),
  action_category VARCHAR(30) NOT NULL CHECK (action_category IN (
    'read', 'write', 'approve', 'reject', 'export', 'configure'
  )),
  
  -- Target entity
  entity_type VARCHAR(30) NOT NULL, -- 'return', 'refund', 'policy', 'report'
  entity_id UUID,
  
  -- Change tracking
  before_state JSONB,
  after_state JSONB,
  changes JSONB, -- Specific fields changed
  
  -- Context
  reason TEXT,
  justification TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(100),
  
  -- Security
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Metadata
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_return_admin_audit_log_admin_id ON return_admin_audit_log(admin_id);
CREATE INDEX idx_return_admin_audit_log_action_type ON return_admin_audit_log(action_type);
CREATE INDEX idx_return_admin_audit_log_entity ON return_admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_return_admin_audit_log_timestamp ON return_admin_audit_log(timestamp DESC);
CREATE INDEX idx_return_admin_audit_log_sensitive ON return_admin_audit_log(action_category, timestamp DESC) 
  WHERE action_category IN ('write', 'approve', 'reject', 'export');

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_return_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER return_admin_alerts_updated_at
  BEFORE UPDATE ON return_admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_return_monitoring_updated_at();

-- Function to automatically create return event on return status change
CREATE OR REPLACE FUNCTION log_return_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO return_events (
      return_id,
      event_type,
      event_category,
      event_data,
      previous_state,
      new_state,
      automated
    ) VALUES (
      NEW.id,
      'status_changed',
      'lifecycle',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      ),
      to_jsonb(OLD),
      to_jsonb(NEW),
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to returns table
CREATE TRIGGER log_return_status_change_trigger
  AFTER UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION log_return_status_change();

-- ============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- Real-time dashboard summary view
CREATE MATERIALIZED VIEW return_dashboard_summary AS
SELECT
  COUNT(*) FILTER (WHERE status = 'requested') as pending_approval,
  COUNT(*) FILTER (WHERE status IN ('approved', 'label_generated', 'in_transit')) as in_progress,
  COUNT(*) FILTER (WHERE status = 'received') as pending_inspection,
  COUNT(*) FILTER (WHERE refund_status = 'processing') as pending_refund,
  COUNT(*) FILTER (WHERE requires_manual_review = true AND status NOT IN ('completed', 'cancelled')) as requires_review,
  COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk,
  AVG(risk_score) as avg_risk_score,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as returns_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as returns_7d,
  SUM(refund_amount) FILTER (WHERE refunded_at >= NOW() - INTERVAL '24 hours') as refunds_24h,
  NOW() as last_updated
FROM returns
WHERE status NOT IN ('completed', 'cancelled');

-- Create index on materialized view
CREATE UNIQUE INDEX idx_return_dashboard_summary_refresh ON return_dashboard_summary(last_updated);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE return_events IS 'Comprehensive event log for all return-related activities';
COMMENT ON TABLE return_analytics_hourly IS 'Hourly aggregated return metrics for trend analysis';
COMMENT ON TABLE return_analytics_daily IS 'Daily aggregated return metrics for reporting';
COMMENT ON TABLE return_metrics_realtime IS 'Real-time metrics for live monitoring dashboard';
COMMENT ON TABLE seller_return_performance IS 'Seller-specific return performance analytics';
COMMENT ON TABLE category_return_analytics IS 'Category-level return patterns and benchmarks';
COMMENT ON TABLE refund_provider_performance IS 'Payment provider reliability and performance tracking';
COMMENT ON TABLE return_admin_alerts IS 'Alert management system for admin notifications';
COMMENT ON TABLE return_admin_audit_log IS 'Complete audit trail of all admin actions';

COMMENT ON COLUMN return_events.event_data IS 'Flexible JSONB field for event-specific data';
COMMENT ON COLUMN return_events.automated IS 'Indicates if event was triggered by automation';
COMMENT ON COLUMN return_analytics_hourly.p95_approval_time IS '95th percentile approval time in hours';
COMMENT ON COLUMN seller_return_performance.compliance_score IS 'Overall compliance score 0-100';
COMMENT ON COLUMN return_admin_alerts.recommended_actions IS 'System-generated action recommendations';
COMMENT ON COLUMN return_admin_audit_log.requires_approval IS 'Flags actions requiring secondary approval';

-- ============================================================================
-- INITIAL DATA AND SETUP
-- ============================================================================

-- Create initial real-time metrics entry
INSERT INTO return_metrics_realtime (timestamp, active_returns, pending_approval, pending_refund)
SELECT 
  date_trunc('minute', NOW() - (NOW()::time % interval '5 minutes')),
  COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled')),
  COUNT(*) FILTER (WHERE status = 'requested'),
  COUNT(*) FILTER (WHERE refund_status = 'processing')
FROM returns
ON CONFLICT (timestamp) DO NOTHING;

-- Grant appropriate permissions (adjust based on your role structure)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin_readonly;
-- GRANT SELECT, INSERT, UPDATE ON return_admin_alerts TO admin_user;
-- GRANT SELECT, INSERT ON return_admin_audit_log TO admin_user;

