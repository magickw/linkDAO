-- Validation Script for Return Admin Monitoring Schema
-- Run this after applying migration 0073 to verify schema integrity

-- ============================================================================
-- TABLE EXISTENCE CHECKS
-- ============================================================================

SELECT 'Checking table existence...' as status;

SELECT 
  CASE 
    WHEN COUNT(*) = 9 THEN '✓ All 9 tables exist'
    ELSE '✗ Missing tables: ' || (9 - COUNT(*))::text
  END as table_check
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'return_events',
    'return_analytics_hourly',
    'return_analytics_daily',
    'return_metrics_realtime',
    'seller_return_performance',
    'category_return_analytics',
    'refund_provider_performance',
    'return_admin_alerts',
    'return_admin_audit_log'
  );

-- ============================================================================
-- INDEX CHECKS
-- ============================================================================

SELECT 'Checking indexes...' as status;

SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'return_events',
    'return_analytics_hourly',
    'return_analytics_daily',
    'return_metrics_realtime',
    'seller_return_performance',
    'category_return_analytics',
    'refund_provider_performance',
    'return_admin_alerts',
    'return_admin_audit_log'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- TRIGGER CHECKS
-- ============================================================================

SELECT 'Checking triggers...' as status;

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%return%monitoring%'
    OR trigger_name = 'log_return_status_change_trigger'
    OR trigger_name = 'return_admin_alerts_updated_at'
  )
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- FUNCTION CHECKS
-- ============================================================================

SELECT 'Checking functions...' as status;

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name = 'update_return_monitoring_updated_at'
    OR routine_name = 'log_return_status_change'
  )
ORDER BY routine_name;

-- ============================================================================
-- MATERIALIZED VIEW CHECKS
-- ============================================================================

SELECT 'Checking materialized views...' as status;

SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname = 'return_dashboard_summary';

-- ============================================================================
-- FOREIGN KEY CHECKS
-- ============================================================================

SELECT 'Checking foreign key constraints...' as status;

SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'return_events',
    'seller_return_performance',
    'category_return_analytics',
    'return_admin_alerts',
    'return_admin_audit_log'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- COLUMN CHECKS
-- ============================================================================

SELECT 'Checking key columns...' as status;

-- Check return_events columns
SELECT 
  'return_events' as table_name,
  COUNT(*) as column_count,
  BOOL_AND(column_name IN (
    'id', 'return_id', 'event_type', 'event_category', 'event_data',
    'actor_id', 'actor_role', 'timestamp', 'created_at'
  )) as has_required_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'return_events';

-- Check return_analytics_hourly columns
SELECT 
  'return_analytics_hourly' as table_name,
  COUNT(*) as column_count,
  BOOL_AND(column_name IN (
    'id', 'hour_timestamp', 'total_returns', 'total_refund_amount',
    'avg_approval_time', 'high_risk_returns', 'calculated_at'
  )) as has_required_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'return_analytics_hourly';

-- ============================================================================
-- DATA TYPE CHECKS
-- ============================================================================

SELECT 'Checking data types...' as status;

SELECT 
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'return_events',
    'return_analytics_hourly',
    'return_admin_alerts'
  )
  AND column_name IN ('id', 'event_type', 'total_refund_amount', 'severity')
ORDER BY table_name, column_name;

-- ============================================================================
-- CONSTRAINT CHECKS
-- ============================================================================

SELECT 'Checking constraints...' as status;

SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'return_events',
    'return_metrics_realtime',
    'return_admin_alerts',
    'return_admin_audit_log'
  )
  AND tc.constraint_type IN ('CHECK', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ============================================================================
-- SAMPLE DATA CHECKS (if data exists)
-- ============================================================================

SELECT 'Checking for sample data...' as status;

SELECT 
  'return_events' as table_name,
  COUNT(*) as row_count
FROM return_events
UNION ALL
SELECT 
  'return_analytics_hourly' as table_name,
  COUNT(*) as row_count
FROM return_analytics_hourly
UNION ALL
SELECT 
  'return_analytics_daily' as table_name,
  COUNT(*) as row_count
FROM return_analytics_daily
UNION ALL
SELECT 
  'return_metrics_realtime' as table_name,
  COUNT(*) as row_count
FROM return_metrics_realtime
UNION ALL
SELECT 
  'return_admin_alerts' as table_name,
  COUNT(*) as row_count
FROM return_admin_alerts
UNION ALL
SELECT 
  'return_admin_audit_log' as table_name,
  COUNT(*) as row_count
FROM return_admin_audit_log;

-- ============================================================================
-- PERFORMANCE CHECKS
-- ============================================================================

SELECT 'Checking table sizes...' as status;

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'return_events',
    'return_analytics_hourly',
    'return_analytics_daily',
    'return_metrics_realtime',
    'seller_return_performance',
    'category_return_analytics',
    'refund_provider_performance',
    'return_admin_alerts',
    'return_admin_audit_log'
  )
ORDER BY size_bytes DESC;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'Schema validation complete!' as status;

SELECT 
  'Tables: ' || COUNT(DISTINCT table_name)::text as summary
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'return_events',
    'return_analytics_hourly',
    'return_analytics_daily',
    'return_metrics_realtime',
    'seller_return_performance',
    'category_return_analytics',
    'refund_provider_performance',
    'return_admin_alerts',
    'return_admin_audit_log'
  )
UNION ALL
SELECT 
  'Indexes: ' || COUNT(*)::text as summary
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'return_events',
    'return_analytics_hourly',
    'return_analytics_daily',
    'return_metrics_realtime',
    'seller_return_performance',
    'category_return_analytics',
    'refund_provider_performance',
    'return_admin_alerts',
    'return_admin_audit_log'
  )
UNION ALL
SELECT 
  'Triggers: ' || COUNT(*)::text as summary
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%return%monitoring%'
    OR trigger_name = 'log_return_status_change_trigger'
    OR trigger_name = 'return_admin_alerts_updated_at'
  )
UNION ALL
SELECT 
  'Functions: ' || COUNT(*)::text as summary
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name = 'update_return_monitoring_updated_at'
    OR routine_name = 'log_return_status_change'
  );

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

SELECT 'Recommendations:' as status;

SELECT 
  '1. Refresh materialized view: REFRESH MATERIALIZED VIEW CONCURRENTLY return_dashboard_summary;' as recommendation
UNION ALL
SELECT 
  '2. Set up cron job for hourly aggregations'
UNION ALL
SELECT 
  '3. Set up cron job for daily aggregations'
UNION ALL
SELECT 
  '4. Configure monitoring for table sizes'
UNION ALL
SELECT 
  '5. Set up alerts for high event volumes'
UNION ALL
SELECT 
  '6. Review and adjust retention policies';
