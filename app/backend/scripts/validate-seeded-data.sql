-- Validation Script for Return and Refund Admin Monitoring Seeded Data
-- Run this after seeding to verify data integrity and relationships

-- ============================================================================
-- RECORD COUNT VALIDATION
-- ============================================================================

\echo '=== Record Count Validation ==='
\echo ''

SELECT 
  'Users (Test)' as table_name, 
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) >= 10 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM users 
WHERE handle LIKE 'testuser%'

UNION ALL

SELECT 
  'Returns', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 50 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM returns

UNION ALL

SELECT 
  'Return Events', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 100 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM return_events

UNION ALL

SELECT 
  'Refund Records', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 40 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM refund_financial_records

UNION ALL

SELECT 
  'Provider Transactions', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 40 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM refund_provider_transactions

UNION ALL

SELECT 
  'Risk Assessments', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 35 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM risk_assessments

UNION ALL

SELECT 
  'User Risk Profiles', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 10 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM user_risk_profiles

UNION ALL

SELECT 
  'Fraud Patterns', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 15 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM fraud_patterns

UNION ALL

SELECT 
  'Admin Alerts', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 20 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM return_admin_alerts

UNION ALL

SELECT 
  'Audit Logs', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 50 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM return_admin_audit_log

UNION ALL

SELECT 
  'Hourly Analytics', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 168 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM return_analytics_hourly

UNION ALL

SELECT 
  'Daily Analytics', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 90 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM return_analytics_daily

UNION ALL

SELECT 
  'Realtime Metrics', 
  COUNT(*),
  CASE WHEN COUNT(*) >= 288 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM return_metrics_realtime;

-- ============================================================================
-- DATA INTEGRITY VALIDATION
-- ============================================================================

\echo ''
\echo '=== Data Integrity Validation ==='
\echo ''

-- Check for orphaned return events
SELECT 
  'Orphaned Return Events' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM return_events re
LEFT JOIN returns r ON re.return_id = r.id
WHERE r.id IS NULL;

-- Check for orphaned refund records
SELECT 
  'Orphaned Refund Records' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM refund_financial_records rfr
LEFT JOIN returns r ON rfr.return_id = r.id
WHERE r.id IS NULL;

-- Check for orphaned risk assessments
SELECT 
  'Orphaned Risk Assessments' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM risk_assessments ra
LEFT JOIN returns r ON ra.return_id = r.id
WHERE r.id IS NULL;

-- Check for orphaned provider transactions
SELECT 
  'Orphaned Provider Transactions' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM refund_provider_transactions rpt
LEFT JOIN refund_financial_records rfr ON rpt.refund_record_id = rfr.id
WHERE rfr.id IS NULL;

-- ============================================================================
-- DATA QUALITY VALIDATION
-- ============================================================================

\echo ''
\echo '=== Data Quality Validation ==='
\echo ''

-- Check risk score ranges
SELECT 
  'Risk Scores in Valid Range' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN risk_score >= 0 AND risk_score <= 100 THEN 1 END) as valid_records,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN risk_score >= 0 AND risk_score <= 100 THEN 1 END) 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM risk_assessments;

-- Check refund amounts are positive
SELECT 
  'Positive Refund Amounts' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN refund_amount > 0 THEN 1 END) as valid_records,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN refund_amount > 0 THEN 1 END) 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM refund_financial_records;

-- Check return status values
SELECT 
  'Valid Return Statuses' as check_name,
  COUNT(*) as total_records,
  COUNT(CASE 
    WHEN status IN ('requested', 'approved', 'rejected', 'in_transit', 'received', 'inspected', 'completed', 'cancelled') 
    THEN 1 
  END) as valid_records,
  CASE 
    WHEN COUNT(*) = COUNT(CASE 
      WHEN status IN ('requested', 'approved', 'rejected', 'in_transit', 'received', 'inspected', 'completed', 'cancelled') 
      THEN 1 
    END) 
    THEN '✅ PASS' 
    ELSE '❌ FAIL' 
  END as status
FROM returns;

-- ============================================================================
-- SAMPLE DATA DISPLAY
-- ============================================================================

\echo ''
\echo '=== Sample High-Risk Returns ==='
\echo ''

SELECT 
  r.id,
  r.status,
  r.requested_amount,
  ra.risk_score,
  ra.risk_level,
  ra.recommendation
FROM returns r
JOIN risk_assessments ra ON r.id = ra.return_id
WHERE ra.risk_level IN ('high', 'critical')
ORDER BY ra.risk_score DESC
LIMIT 5;

\echo ''
\echo '=== Sample Active Alerts ==='
\echo ''

SELECT 
  alert_type,
  severity,
  title,
  status,
  created_at
FROM return_admin_alerts
WHERE status = 'active'
ORDER BY severity DESC, created_at DESC
LIMIT 5;

\echo ''
\echo '=== Sample Fraud Patterns ==='
\echo ''

SELECT 
  pattern_type,
  severity,
  confidence,
  frequency,
  status
FROM fraud_patterns
WHERE status IN ('active', 'investigating')
ORDER BY severity DESC, confidence DESC
LIMIT 5;

\echo ''
\echo '=== Recent Analytics Summary ==='
\echo ''

SELECT 
  day_date,
  total_returns,
  approved_returns,
  rejected_returns,
  return_rate_percentage,
  total_refund_amount
FROM return_analytics_daily
ORDER BY day_date DESC
LIMIT 7;

-- ============================================================================
-- SUMMARY
-- ============================================================================

\echo ''
\echo '=== Validation Summary ==='
\echo ''
\echo 'If all checks show ✅ PASS, the seeding was successful!'
\echo 'Any ❌ FAIL indicates data issues that need investigation.'
\echo ''
