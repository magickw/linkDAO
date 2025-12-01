-- Performance Indexes for Return and Refund Admin Monitoring
-- Task 1.1: Set up database indexes for performance
-- Adds optimized indexes for returnId, userId, timestamp, and composite queries

-- ============================================================================
-- RETURN EVENTS TABLE - Additional Performance Indexes
-- ============================================================================

-- Composite index for common query pattern: return events by user over time
CREATE INDEX IF NOT EXISTS idx_return_events_user_timestamp 
  ON return_events(actor_id, timestamp DESC) 
  WHERE actor_id IS NOT NULL;

-- Composite index for return lifecycle queries
CREATE INDEX IF NOT EXISTS idx_return_events_return_type_timestamp 
  ON return_events(return_id, event_type, timestamp DESC);

-- Index for filtering by category and time
CREATE INDEX IF NOT EXISTS idx_return_events_category_timestamp 
  ON return_events(event_category, timestamp DESC);

-- ============================================================================
-- RETURN ANALYTICS HOURLY - Performance Indexes
-- ============================================================================

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_return_analytics_hourly_timestamp 
  ON return_analytics_hourly(hour_timestamp DESC);

-- Composite index for filtering by time range and metrics
CREATE INDEX IF NOT EXISTS idx_return_analytics_hourly_time_volume 
  ON return_analytics_hourly(hour_timestamp DESC, total_returns);

-- ============================================================================
-- RETURN ANALYTICS DAILY - Performance Indexes
-- ============================================================================

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_return_analytics_daily_timestamp 
  ON return_analytics_daily(day_date DESC);

-- Composite index for trend analysis
CREATE INDEX IF NOT EXISTS idx_return_analytics_daily_date_metrics 
  ON return_analytics_daily(day_date DESC, total_returns, total_refund_amount);

-- ============================================================================
-- RETURN METRICS REALTIME - Performance Indexes
-- ============================================================================

-- Index for latest metrics retrieval
CREATE INDEX IF NOT EXISTS idx_return_metrics_realtime_timestamp 
  ON return_metrics_realtime(interval_timestamp DESC);

-- Composite index for alert queries
CREATE INDEX IF NOT EXISTS idx_return_metrics_realtime_alerts 
  ON return_metrics_realtime(interval_timestamp DESC, alert_volume_spike, alert_processing_delay);

-- ============================================================================
-- SELLER RETURN PERFORMANCE - Performance Indexes
-- ============================================================================

-- Composite index for seller performance queries by period
CREATE INDEX IF NOT EXISTS idx_seller_return_perf_seller_period 
  ON seller_return_performance(seller_id, period_type, period_start DESC);

-- Index for compliance monitoring
CREATE INDEX IF NOT EXISTS idx_seller_return_perf_compliance 
  ON seller_return_performance(compliance_score DESC, period_start DESC) 
  WHERE compliance_score < 80;

-- Index for high-risk sellers
CREATE INDEX IF NOT EXISTS idx_seller_return_perf_risk 
  ON seller_return_performance(seller_id, risk_score DESC) 
  WHERE risk_score > 50;

-- Composite index for ranking queries
CREATE INDEX IF NOT EXISTS idx_seller_return_perf_ranking 
  ON seller_return_performance(period_type, period_start DESC, performance_rank);

-- ============================================================================
-- CATEGORY RETURN ANALYTICS - Performance Indexes
-- ============================================================================

-- Composite index for category analysis by period
CREATE INDEX IF NOT EXISTS idx_category_return_analytics_cat_period 
  ON category_return_analytics(category_id, period_type, period_start DESC);

-- Index for high return rate categories
CREATE INDEX IF NOT EXISTS idx_category_return_analytics_rate 
  ON category_return_analytics(return_rate DESC, period_start DESC) 
  WHERE return_rate > 10;

-- Index for trend analysis
CREATE INDEX IF NOT EXISTS idx_category_return_analytics_trend 
  ON category_return_analytics(trend_direction, period_start DESC);

-- ============================================================================
-- REFUND PROVIDER PERFORMANCE - Performance Indexes
-- ============================================================================

-- Composite index for provider monitoring
CREATE INDEX IF NOT EXISTS idx_refund_provider_perf_provider_time 
  ON refund_provider_performance(provider_name, period_start DESC);

-- Index for provider health monitoring
CREATE INDEX IF NOT EXISTS idx_refund_provider_perf_health 
  ON refund_provider_performance(operational_status, success_rate DESC) 
  WHERE operational_status != 'operational';

-- Index for error analysis
CREATE INDEX IF NOT EXISTS idx_refund_provider_perf_errors 
  ON refund_provider_performance(error_rate DESC, period_start DESC) 
  WHERE error_rate > 5;

-- ============================================================================
-- RETURN ADMIN ALERTS - Performance Indexes
-- ============================================================================

-- Composite index for active alerts by severity
CREATE INDEX IF NOT EXISTS idx_return_admin_alerts_active 
  ON return_admin_alerts(status, severity, created_at DESC) 
  WHERE status IN ('active', 'acknowledged');

-- Index for alert type analysis
CREATE INDEX IF NOT EXISTS idx_return_admin_alerts_type_time 
  ON return_admin_alerts(alert_type, created_at DESC);

-- Index for user-specific alerts
CREATE INDEX IF NOT EXISTS idx_return_admin_alerts_user 
  ON return_admin_alerts(related_user_id, created_at DESC) 
  WHERE related_user_id IS NOT NULL;

-- Index for return-specific alerts
CREATE INDEX IF NOT EXISTS idx_return_admin_alerts_return 
  ON return_admin_alerts(related_return_id, created_at DESC) 
  WHERE related_return_id IS NOT NULL;

-- ============================================================================
-- RETURN ADMIN AUDIT LOG - Performance Indexes
-- ============================================================================

-- Composite index for admin action history
CREATE INDEX IF NOT EXISTS idx_return_admin_audit_admin_time 
  ON return_admin_audit_log(admin_id, timestamp DESC);

-- Index for action type analysis
CREATE INDEX IF NOT EXISTS idx_return_admin_audit_action_time 
  ON return_admin_audit_log(action_type, timestamp DESC);

-- Index for return-specific audit trail
CREATE INDEX IF NOT EXISTS idx_return_admin_audit_return 
  ON return_admin_audit_log(return_id, timestamp DESC) 
  WHERE return_id IS NOT NULL;

-- Index for user-specific audit trail
CREATE INDEX IF NOT EXISTS idx_return_admin_audit_user 
  ON return_admin_audit_log(user_id, timestamp DESC) 
  WHERE user_id IS NOT NULL;

-- Composite index for change tracking
CREATE INDEX IF NOT EXISTS idx_return_admin_audit_changes 
  ON return_admin_audit_log(action_type, timestamp DESC) 
  WHERE before_state IS NOT NULL AND after_state IS NOT NULL;

-- ============================================================================
-- REFUND FINANCIAL RECORDS - Additional Performance Indexes
-- ============================================================================

-- Composite index for return-based refund queries
CREATE INDEX IF NOT EXISTS idx_refund_records_return_status 
  ON refund_financial_records(return_id, status, created_at DESC);

-- Composite index for provider-based queries with time
CREATE INDEX IF NOT EXISTS idx_refund_records_provider_time 
  ON refund_financial_records(payment_provider, created_at DESC);

-- Index for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_refund_records_reconciliation 
  ON refund_financial_records(reconciled, reconciled_at DESC);

-- Index for failed refunds
CREATE INDEX IF NOT EXISTS idx_refund_records_failures 
  ON refund_financial_records(status, retry_count, created_at DESC) 
  WHERE status = 'failed';

-- Composite index for financial reporting
CREATE INDEX IF NOT EXISTS idx_refund_records_financial 
  ON refund_financial_records(processed_at DESC, refund_amount, currency) 
  WHERE processed_at IS NOT NULL;

-- ============================================================================
-- REFUND PROVIDER TRANSACTIONS - Performance Indexes
-- ============================================================================

-- Composite index for provider transaction lookup
CREATE INDEX IF NOT EXISTS idx_provider_tx_provider_status_time 
  ON refund_provider_transactions(provider_name, provider_status, created_at DESC);

-- Index for blockchain transaction tracking
CREATE INDEX IF NOT EXISTS idx_provider_tx_blockchain 
  ON refund_provider_transactions(blockchain_network, blockchain_tx_hash) 
  WHERE blockchain_tx_hash IS NOT NULL;

-- Index for failed transactions
CREATE INDEX IF NOT EXISTS idx_provider_tx_failures 
  ON refund_provider_transactions(provider_status, failed_at DESC) 
  WHERE failed_at IS NOT NULL;

-- Composite index for refund record transactions
CREATE INDEX IF NOT EXISTS idx_provider_tx_refund_time 
  ON refund_provider_transactions(refund_record_id, created_at DESC);

-- ============================================================================
-- REFUND RECONCILIATION RECORDS - Performance Indexes
-- ============================================================================

-- Composite index for reconciliation status queries
CREATE INDEX IF NOT EXISTS idx_reconciliation_status_date 
  ON refund_reconciliation_records(reconciliation_status, reconciliation_date DESC);

-- Index for unreconciled records
CREATE INDEX IF NOT EXISTS idx_reconciliation_pending 
  ON refund_reconciliation_records(reconciliation_date DESC) 
  WHERE reconciliation_status = 'pending';

-- Index for discrepancy tracking
CREATE INDEX IF NOT EXISTS idx_reconciliation_discrepancies 
  ON refund_reconciliation_records(discrepancy_amount DESC, reconciliation_date DESC) 
  WHERE discrepancy_amount > 0;

-- Composite index for refund record reconciliation
CREATE INDEX IF NOT EXISTS idx_reconciliation_refund_date 
  ON refund_reconciliation_records(refund_record_id, reconciliation_date DESC);

-- ============================================================================
-- REFUND TRANSACTION AUDIT LOG - Performance Indexes
-- ============================================================================

-- Composite index for refund audit trail
CREATE INDEX IF NOT EXISTS idx_refund_audit_refund_time 
  ON refund_transaction_audit_log(refund_record_id, timestamp DESC);

-- Index for action type analysis
CREATE INDEX IF NOT EXISTS idx_refund_audit_action_time 
  ON refund_transaction_audit_log(action_type, timestamp DESC);

-- Index for admin action tracking
CREATE INDEX IF NOT EXISTS idx_refund_audit_admin 
  ON refund_transaction_audit_log(performed_by, timestamp DESC) 
  WHERE performed_by IS NOT NULL;

-- ============================================================================
-- RISK ASSESSMENTS - Additional Performance Indexes
-- ============================================================================

-- Composite index for user risk history
CREATE INDEX IF NOT EXISTS idx_risk_assessments_user_time 
  ON risk_assessments(user_id, created_at DESC);

-- Composite index for return risk analysis
CREATE INDEX IF NOT EXISTS idx_risk_assessments_return_score 
  ON risk_assessments(return_id, risk_score DESC, created_at DESC);

-- Index for high-risk assessments requiring review
CREATE INDEX IF NOT EXISTS idx_risk_assessments_review_needed 
  ON risk_assessments(reviewed, risk_level, created_at DESC) 
  WHERE reviewed = false AND risk_level IN ('high', 'critical');

-- Composite index for model performance tracking
CREATE INDEX IF NOT EXISTS idx_risk_assessments_model_outcome 
  ON risk_assessments(model_version, actual_outcome, created_at DESC) 
  WHERE actual_outcome IS NOT NULL;

-- ============================================================================
-- USER RISK PROFILES - Performance Indexes
-- ============================================================================

-- Index for risk level monitoring
CREATE INDEX IF NOT EXISTS idx_user_risk_profiles_level_score 
  ON user_risk_profiles(current_risk_level, current_risk_score DESC);

-- Index for watchlist queries
CREATE INDEX IF NOT EXISTS idx_user_risk_profiles_watchlist_status 
  ON user_risk_profiles(on_watchlist, account_status) 
  WHERE on_watchlist = true;

-- Index for fraud incident tracking
CREATE INDEX IF NOT EXISTS idx_user_risk_profiles_fraud 
  ON user_risk_profiles(confirmed_fraud_incidents DESC, last_fraud_incident_at DESC) 
  WHERE confirmed_fraud_incidents > 0;

-- Composite index for return behavior analysis
CREATE INDEX IF NOT EXISTS idx_user_risk_profiles_returns 
  ON user_risk_profiles(total_returns DESC, approval_rate, current_risk_score DESC);

-- ============================================================================
-- FRAUD PATTERNS - Performance Indexes
-- ============================================================================

-- Composite index for active pattern monitoring
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_active_severity 
  ON fraud_patterns(status, severity, last_detected_at DESC) 
  WHERE status IN ('active', 'investigating');

-- Index for entity-specific patterns
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_entity_scope 
  ON fraud_patterns(scope, entity_id, pattern_type) 
  WHERE entity_id IS NOT NULL;

-- Index for pattern cluster analysis
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_cluster_time 
  ON fraud_patterns(pattern_cluster_id, first_detected_at DESC) 
  WHERE pattern_cluster_id IS NOT NULL;

-- Composite index for financial impact analysis
CREATE INDEX IF NOT EXISTS idx_fraud_patterns_financial 
  ON fraud_patterns(estimated_loss DESC, actual_loss DESC, status);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_return_events_user_timestamp IS 'Optimizes queries for user activity timeline';
COMMENT ON INDEX idx_return_events_return_type_timestamp IS 'Optimizes return lifecycle event queries';
COMMENT ON INDEX idx_seller_return_perf_seller_period IS 'Optimizes seller performance dashboard queries';
COMMENT ON INDEX idx_refund_records_return_status IS 'Optimizes return-to-refund tracking queries';
COMMENT ON INDEX idx_risk_assessments_user_time IS 'Optimizes user risk history queries';
COMMENT ON INDEX idx_fraud_patterns_active_severity IS 'Optimizes active fraud pattern monitoring';

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner optimization
ANALYZE return_events;
ANALYZE return_analytics_hourly;
ANALYZE return_analytics_daily;
ANALYZE return_metrics_realtime;
ANALYZE seller_return_performance;
ANALYZE category_return_analytics;
ANALYZE refund_provider_performance;
ANALYZE return_admin_alerts;
ANALYZE return_admin_audit_log;
ANALYZE refund_financial_records;
ANALYZE refund_provider_transactions;
ANALYZE refund_reconciliation_records;
ANALYZE refund_transaction_audit_log;
ANALYZE risk_assessments;
ANALYZE user_risk_profiles;
ANALYZE fraud_patterns;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

/*
Index Strategy:
1. Single-column indexes for frequently filtered columns (returnId, userId, timestamp)
2. Composite indexes for common query patterns (multi-column filters and sorts)
3. Partial indexes for specific conditions (WHERE clauses) to reduce index size
4. Covering indexes where possible to avoid table lookups

Query Optimization:
- Indexes support ORDER BY timestamp DESC for time-series queries
- Composite indexes match common WHERE + ORDER BY patterns
- Partial indexes reduce storage for conditional queries
- ANALYZE updates statistics for optimal query planning

Maintenance:
- Run VACUUM ANALYZE weekly on high-write tables
- Monitor index usage with pg_stat_user_indexes
- Consider index-only scans for frequently accessed columns
- Review and drop unused indexes periodically
*/
