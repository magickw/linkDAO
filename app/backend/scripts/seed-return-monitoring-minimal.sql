-- Minimal SQL Seeding Script for Return and Refund Admin Monitoring
-- Task 1.1: Write database seeding scripts for testing
-- This script can be run directly with psql for quick testing

-- ============================================================================
-- SEED TEST USERS
-- ============================================================================

-- Insert 10 test users (5 admins, 5 regular users)
INSERT INTO users (wallet_address, handle, display_name, role, created_at)
SELECT
  '0x' || md5(random()::text || clock_timestamp()::text)::text,
  'testuser' || generate_series,
  'Test User ' || generate_series,
  CASE WHEN generate_series <= 5 THEN 'admin' ELSE 'user' END,
  NOW() - (random() * interval '365 days')
FROM generate_series(1, 10);

-- ============================================================================
-- SEED RETURN RECORDS
-- ============================================================================

-- Insert 50 test returns with various statuses
WITH user_ids AS (
  SELECT id FROM users ORDER BY created_at DESC LIMIT 10
)
INSERT INTO returns (
  order_id, user_id, seller_id, status, reason,
  requested_amount, approved_amount, currency, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM user_ids ORDER BY random() LIMIT 1),
  (SELECT id FROM user_ids ORDER BY random() LIMIT 1),
  (ARRAY['requested', 'approved', 'rejected', 'in_transit', 'received', 'completed'])[floor(random() * 6 + 1)],
  (ARRAY['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'damaged'])[floor(random() * 5 + 1)],
  (random() * 900 + 100)::numeric(20,2),
  CASE 
    WHEN (ARRAY['approved', 'completed'])[floor(random() * 2 + 1)] = status 
    THEN (random() * 900 + 100)::numeric(20,2)
    ELSE 0
  END,
  'USD',
  NOW() - (random() * interval '180 days'),
  NOW() - (random() * interval '30 days')
FROM generate_series(1, 50);

-- ============================================================================
-- SEED RETURN EVENTS
-- ============================================================================

-- Insert 3-5 events per return
WITH return_ids AS (
  SELECT id, created_at FROM returns ORDER BY created_at DESC LIMIT 50
),
user_ids AS (
  SELECT id FROM users ORDER BY created_at DESC LIMIT 10
)
INSERT INTO return_events (
  return_id, event_type, event_category, actor_id, actor_role,
  event_data, timestamp, metadata
)
SELECT
  r.id,
  (ARRAY['created', 'approved', 'rejected', 'shipped', 'received', 'inspected'])[floor(random() * 6 + 1)],
  (ARRAY['status_change', 'communication', 'inspection', 'refund'])[floor(random() * 4 + 1)],
  (SELECT id FROM user_ids ORDER BY random() LIMIT 1),
  (ARRAY['buyer', 'seller', 'admin', 'system'])[floor(random() * 4 + 1)],
  '{"details": "Event details here"}'::jsonb,
  r.created_at + (random() * interval '30 days'),
  '{"ip": "192.168.1.1", "userAgent": "Mozilla/5.0"}'::jsonb
FROM return_ids r
CROSS JOIN generate_series(1, 3);

-- ============================================================================
-- SEED REFUND FINANCIAL RECORDS
-- ============================================================================

-- Insert refund records for 80% of returns
WITH return_sample AS (
  SELECT id, created_at FROM returns ORDER BY random() LIMIT 40
)
INSERT INTO refund_financial_records (
  return_id, refund_id, original_amount, refund_amount,
  processing_fee, platform_fee_impact, seller_impact,
  payment_provider, provider_transaction_id, status,
  processed_at, reconciled, currency, created_at
)
SELECT
  id,
  'REF-' || upper(substring(md5(random()::text) from 1 for 10)),
  (random() * 900 + 100)::numeric(20,2),
  (random() * 800 + 100)::numeric(20,2),
  (random() * 5 + 0.5)::numeric(20,2),
  (random() * 10)::numeric(20,2),
  (random() * 700 + 100)::numeric(20,2),
  (ARRAY['stripe', 'paypal', 'blockchain'])[floor(random() * 3 + 1)],
  'TXN-' || upper(substring(md5(random()::text) from 1 for 16)),
  (ARRAY['pending', 'completed', 'failed'])[floor(random() * 3 + 1)],
  CASE WHEN random() > 0.3 THEN created_at + interval '2 days' ELSE NULL END,
  random() > 0.3,
  'USD',
  created_at
FROM return_sample;

-- ============================================================================
-- SEED REFUND PROVIDER TRANSACTIONS
-- ============================================================================

-- Insert provider transactions for each refund
WITH refund_ids AS (
  SELECT id, created_at FROM refund_financial_records LIMIT 40
)
INSERT INTO refund_provider_transactions (
  refund_record_id, provider_name, provider_transaction_id,
  provider_status, transaction_type, amount, currency,
  fee_amount, net_amount, completed_at, created_at
)
SELECT
  id,
  (ARRAY['stripe', 'paypal', 'blockchain'])[floor(random() * 3 + 1)],
  'PTX-' || upper(substring(md5(random()::text) from 1 for 20)),
  (ARRAY['completed', 'pending', 'failed'])[floor(random() * 3 + 1)],
  (ARRAY['refund', 'reversal'])[floor(random() * 2 + 1)],
  (random() * 900 + 100)::numeric(20,2),
  'USD',
  (random() * 5 + 0.5)::numeric(20,2),
  (random() * 850 + 95)::numeric(20,2),
  CASE WHEN random() > 0.2 THEN created_at + interval '1 day' ELSE NULL END,
  created_at
FROM refund_ids;

-- ============================================================================
-- SEED RISK ASSESSMENTS
-- ============================================================================

-- Insert risk assessments for 75% of returns
WITH return_sample AS (
  SELECT r.id as return_id, r.user_id, r.created_at 
  FROM returns r 
  ORDER BY random() 
  LIMIT 38
)
INSERT INTO risk_assessments (
  return_id, user_id, risk_score, risk_level, confidence_score,
  model_version, model_type, recommendation, explanation,
  feature_contributions, predicted_fraud_probability,
  predicted_outcome, reviewed, created_at
)
SELECT
  return_id,
  user_id,
  (random() * 100)::numeric(5,2),
  CASE 
    WHEN random() < 0.25 THEN 'low'
    WHEN random() < 0.50 THEN 'medium'
    WHEN random() < 0.75 THEN 'high'
    ELSE 'critical'
  END,
  (random() * 30 + 70)::numeric(5,2),
  'v' || floor(random() * 3 + 1)::text || '.' || floor(random() * 10)::text,
  (ARRAY['rule_based', 'ml_model', 'hybrid'])[floor(random() * 3 + 1)],
  (ARRAY['auto_approve', 'manual_review', 'reject', 'escalate'])[floor(random() * 4 + 1)],
  'Risk assessment based on user history and return patterns',
  '[{"feature": "return_frequency", "weight": 0.3, "contribution": 15}, 
    {"feature": "order_value", "weight": 0.25, "contribution": 12},
    {"feature": "user_history", "weight": 0.45, "contribution": 22}]'::jsonb,
  (random())::numeric(5,4),
  (ARRAY['legitimate', 'suspicious', 'fraudulent'])[floor(random() * 3 + 1)],
  random() > 0.5,
  created_at
FROM return_sample;

-- ============================================================================
-- SEED USER RISK PROFILES
-- ============================================================================

-- Insert risk profiles for all test users
WITH user_stats AS (
  SELECT 
    u.id as user_id,
    COUNT(r.id) as total_returns,
    COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_returns,
    COUNT(CASE WHEN r.status = 'rejected' THEN 1 END) as rejected_returns
  FROM users u
  LEFT JOIN returns r ON u.id = r.user_id
  WHERE u.handle LIKE 'testuser%'
  GROUP BY u.id
)
INSERT INTO user_risk_profiles (
  user_id, current_risk_score, current_risk_level, risk_trend,
  total_returns, approved_returns, rejected_returns, fraudulent_returns,
  approval_rate, total_refund_amount, avg_refund_amount,
  account_status, trust_score, account_age_days,
  on_watchlist, created_at, updated_at
)
SELECT
  user_id,
  (random() * 100)::numeric(5,2),
  CASE 
    WHEN random() < 0.25 THEN 'low'
    WHEN random() < 0.50 THEN 'medium'
    WHEN random() < 0.75 THEN 'high'
    ELSE 'critical'
  END,
  (ARRAY['increasing', 'decreasing', 'stable'])[floor(random() * 3 + 1)],
  total_returns,
  approved_returns,
  rejected_returns,
  floor(random() * 3)::integer,
  CASE WHEN total_returns > 0 THEN (approved_returns::numeric / total_returns * 100)::numeric(5,2) ELSE 0 END,
  (random() * 10000)::numeric(20,2),
  (random() * 500 + 10)::numeric(20,2),
  (ARRAY['active', 'monitored', 'restricted'])[floor(random() * 3 + 1)],
  (random() * 100)::numeric(5,2),
  floor(random() * 730 + 1)::integer,
  random() > 0.8,
  NOW() - interval '1 year',
  NOW() - interval '1 day'
FROM user_stats;

-- ============================================================================
-- SEED FRAUD PATTERNS
-- ============================================================================

-- Insert 15 fraud patterns
WITH user_ids AS (
  SELECT id FROM users WHERE handle LIKE 'testuser%' LIMIT 10
),
return_ids AS (
  SELECT id FROM returns ORDER BY random() LIMIT 20
)
INSERT INTO fraud_patterns (
  pattern_type, pattern_name, scope, entity_id,
  description, detection_method, severity, confidence,
  frequency, evidence, affected_returns, affected_users,
  first_detected_at, last_detected_at, detection_window_days,
  estimated_loss, status, created_at
)
SELECT
  (ARRAY['high_frequency_returns', 'high_value_returns', 'reason_abuse', 'timing_abuse', 'wardrobing'])[floor(random() * 5 + 1)],
  'Pattern ' || generate_series,
  (ARRAY['user', 'seller', 'system'])[floor(random() * 3 + 1)],
  CASE WHEN random() > 0.3 THEN (SELECT id FROM user_ids ORDER BY random() LIMIT 1) ELSE NULL END,
  'Detected suspicious pattern in return behavior',
  (ARRAY['rule_based', 'statistical', 'ml_model'])[floor(random() * 3 + 1)],
  (ARRAY['low', 'medium', 'high', 'critical'])[floor(random() * 4 + 1)],
  (random() * 40 + 60)::numeric(5,2),
  floor(random() * 20 + 1)::integer,
  '[{"type": "behavioral", "description": "Unusual return frequency"}]'::jsonb,
  (SELECT jsonb_agg(id) FROM (SELECT id FROM return_ids ORDER BY random() LIMIT 5) sub),
  (SELECT jsonb_agg(id) FROM (SELECT id FROM user_ids ORDER BY random() LIMIT 3) sub),
  NOW() - (random() * interval '365 days'),
  NOW() - (random() * interval '30 days'),
  floor(random() * 358 + 7)::integer,
  (random() * 10000 + 100)::numeric(20,2),
  (ARRAY['active', 'investigating', 'confirmed', 'resolved'])[floor(random() * 4 + 1)],
  NOW() - (random() * interval '365 days')
FROM generate_series(1, 15);

-- ============================================================================
-- SEED ADMIN ALERTS
-- ============================================================================

-- Insert 20 admin alerts
WITH return_ids AS (
  SELECT id FROM returns ORDER BY random() LIMIT 20
),
user_ids AS (
  SELECT id FROM users WHERE handle LIKE 'testuser%' AND role = 'admin' LIMIT 5
)
INSERT INTO return_admin_alerts (
  alert_type, severity, title, description,
  related_return_id, related_user_id, status,
  threshold_value, actual_value, acknowledged_by,
  acknowledged_at, resolved_at, created_at
)
SELECT
  (ARRAY['high_risk_return', 'volume_spike', 'processing_delay', 'fraud_detected', 'policy_violation'])[floor(random() * 5 + 1)],
  (ARRAY['low', 'medium', 'high', 'critical'])[floor(random() * 4 + 1)],
  'Alert ' || generate_series,
  'This is a test alert for monitoring purposes',
  CASE WHEN random() > 0.3 THEN (SELECT id FROM return_ids ORDER BY random() LIMIT 1) ELSE NULL END,
  CASE WHEN random() > 0.3 THEN (SELECT id FROM user_ids ORDER BY random() LIMIT 1) ELSE NULL END,
  (ARRAY['active', 'acknowledged', 'resolved', 'dismissed'])[floor(random() * 4 + 1)],
  (random() * 100)::numeric(20,2),
  (random() * 150)::numeric(20,2),
  CASE WHEN random() > 0.5 THEN (SELECT id FROM user_ids ORDER BY random() LIMIT 1) ELSE NULL END,
  CASE WHEN random() > 0.5 THEN NOW() - interval '3 days' ELSE NULL END,
  CASE WHEN random() > 0.7 THEN NOW() - interval '1 day' ELSE NULL END,
  NOW() - (random() * interval '90 days')
FROM generate_series(1, 20);

-- ============================================================================
-- SEED AUDIT LOGS
-- ============================================================================

-- Insert 50 audit log entries
WITH return_ids AS (
  SELECT id FROM returns ORDER BY random() LIMIT 50
),
user_ids AS (
  SELECT id FROM users WHERE handle LIKE 'testuser%' LIMIT 10
),
admin_ids AS (
  SELECT id FROM users WHERE handle LIKE 'testuser%' AND role = 'admin' LIMIT 5
)
INSERT INTO return_admin_audit_log (
  return_id, user_id, admin_id, action_type,
  action_description, before_state, after_state,
  ip_address, user_agent, timestamp
)
SELECT
  CASE WHEN random() > 0.2 THEN (SELECT id FROM return_ids ORDER BY random() LIMIT 1) ELSE NULL END,
  CASE WHEN random() > 0.3 THEN (SELECT id FROM user_ids ORDER BY random() LIMIT 1) ELSE NULL END,
  (SELECT id FROM admin_ids ORDER BY random() LIMIT 1),
  (ARRAY['status_change', 'refund_processed', 'risk_assessment', 'manual_review', 'policy_update'])[floor(random() * 5 + 1)],
  'Admin action performed on return',
  '{"status": "pending", "amount": "250.00"}'::jsonb,
  '{"status": "approved", "amount": "250.00"}'::jsonb,
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  NOW() - (random() * interval '180 days')
FROM generate_series(1, 50);

-- ============================================================================
-- SEED ANALYTICS AGGREGATIONS
-- ============================================================================

-- Seed hourly analytics for the past 7 days
INSERT INTO return_analytics_hourly (
  hour_timestamp, total_returns, approved_returns, rejected_returns,
  pending_returns, avg_processing_time_minutes, total_refund_amount,
  avg_refund_amount, return_rate_percentage, created_at
)
SELECT
  date_trunc('hour', NOW() - (generate_series || ' hours')::interval),
  floor(random() * 45 + 5)::integer,
  floor(random() * 30)::integer,
  floor(random() * 10)::integer,
  floor(random() * 15)::integer,
  (random() * 450 + 30)::numeric(20,2),
  (random() * 49000 + 1000)::numeric(20,2),
  (random() * 450 + 50)::numeric(20,2),
  (random() * 20 + 5)::numeric(5,2),
  NOW() - (generate_series || ' hours')::interval
FROM generate_series(0, 167); -- 7 days * 24 hours

-- Seed daily analytics for the past 90 days
INSERT INTO return_analytics_daily (
  day_date, total_returns, approved_returns, rejected_returns,
  pending_returns, avg_processing_time_minutes, total_refund_amount,
  avg_refund_amount, return_rate_percentage, unique_users,
  unique_sellers, created_at
)
SELECT
  (NOW() - (generate_series || ' days')::interval)::date,
  floor(random() * 450 + 50)::integer,
  floor(random() * 300)::integer,
  floor(random() * 100)::integer,
  floor(random() * 150)::integer,
  (random() * 660 + 60)::numeric(20,2),
  (random() * 490000 + 10000)::numeric(20,2),
  (random() * 900 + 100)::numeric(20,2),
  (random() * 20 + 10)::numeric(5,2),
  floor(random() * 180 + 20)::integer,
  floor(random() * 90 + 10)::integer,
  (NOW() - (generate_series || ' days')::interval)::date
FROM generate_series(0, 89); -- 90 days

-- Seed real-time metrics (last 24 hours in 5-minute intervals)
INSERT INTO return_metrics_realtime (
  interval_timestamp, active_returns, pending_approvals,
  processing_returns, avg_response_time_seconds,
  alert_volume_spike, alert_processing_delay, created_at
)
SELECT
  NOW() - (generate_series * interval '5 minutes'),
  floor(random() * 90 + 10)::integer,
  floor(random() * 45 + 5)::integer,
  floor(random() * 25 + 5)::integer,
  (random() * 270 + 30)::numeric(20,2),
  random() > 0.9,
  random() > 0.85,
  NOW() - (generate_series * interval '5 minutes')
FROM generate_series(0, 287); -- 24 hours * 12 (5-min intervals)

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Display summary of seeded data
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users WHERE handle LIKE 'testuser%'
UNION ALL
SELECT 'Returns', COUNT(*) FROM returns
UNION ALL
SELECT 'Return Events', COUNT(*) FROM return_events
UNION ALL
SELECT 'Refund Records', COUNT(*) FROM refund_financial_records
UNION ALL
SELECT 'Provider Transactions', COUNT(*) FROM refund_provider_transactions
UNION ALL
SELECT 'Risk Assessments', COUNT(*) FROM risk_assessments
UNION ALL
SELECT 'User Risk Profiles', COUNT(*) FROM user_risk_profiles
UNION ALL
SELECT 'Fraud Patterns', COUNT(*) FROM fraud_patterns
UNION ALL
SELECT 'Admin Alerts', COUNT(*) FROM return_admin_alerts
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM return_admin_audit_log
UNION ALL
SELECT 'Hourly Analytics', COUNT(*) FROM return_analytics_hourly
UNION ALL
SELECT 'Daily Analytics', COUNT(*) FROM return_analytics_daily
UNION ALL
SELECT 'Realtime Metrics', COUNT(*) FROM return_metrics_realtime;

-- Display sample high-risk returns
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
LIMIT 10;

-- Display active alerts
SELECT 
  alert_type,
  severity,
  title,
  status,
  created_at
FROM return_admin_alerts
WHERE status = 'active'
ORDER BY severity DESC, created_at DESC
LIMIT 10;

-- Success message
SELECT '✅ Database seeding completed successfully!' as status;
