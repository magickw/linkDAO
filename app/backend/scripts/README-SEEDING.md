# Database Seeding Scripts for Return and Refund Admin Monitoring

This directory contains comprehensive database seeding scripts for testing the Return and Refund Admin Monitoring system.

## Available Scripts

### 1. TypeScript Seeding Script (Comprehensive)
**File:** `seed-return-refund-test-data.ts`

A comprehensive TypeScript script that generates realistic test data using Faker.js for all return and refund monitoring tables.

#### Features:
- Generates 50 test users (5 admins, 45 regular users)
- Creates 200 return records with various statuses
- Generates 180 refund financial records
- Creates 150 risk assessments with ML model data
- Generates 20 fraud patterns
- Creates 30 admin alerts
- Generates 100 audit log entries
- Seeds analytics aggregations (hourly, daily, real-time)

#### Usage:
```bash
# Install dependencies first
npm install @faker-js/faker

# Run the seeding script
npx ts-node app/backend/scripts/seed-return-refund-test-data.ts
```

### 2. SQL Seeding Script (Minimal)
**File:** `seed-return-monitoring-minimal.sql`

A pure SQL script that can be run directly with psql for quick testing without dependencies.

#### Features:
- Generates 10 test users
- Creates 50 return records
- Generates return events, refunds, risk assessments
- Seeds user risk profiles and fraud patterns
- Creates admin alerts and audit logs
- Seeds 7 days of hourly analytics
- Seeds 90 days of daily analytics
- Seeds 24 hours of real-time metrics

#### Usage:
```bash
# Run with psql
psql -U your_username -d your_database -f app/backend/scripts/seed-return-monitoring-minimal.sql

# Or with environment variables
PGPASSWORD=your_password psql -h localhost -U postgres -d linkdao -f app/backend/scripts/seed-return-monitoring-minimal.sql
```

## Data Generated

### Test Users
- **Admins:** 5 users with `role = 'admin'`
- **Regular Users:** 45 users with `role = 'user'`
- Each user has a unique wallet address and handle

### Return Records
- Various statuses: requested, approved, rejected, in_transit, received, completed
- Return reasons: defective, wrong_item, not_as_described, changed_mind, damaged
- Amounts ranging from $10 to $1000
- Timestamps spread over the past year

### Refund Financial Records
- Multiple payment providers: Stripe, PayPal, Blockchain
- Various statuses: pending, completed, failed
- Processing fees and platform fee impacts
- Provider transaction IDs for tracking

### Risk Assessments
- Risk scores from 0-100
- Risk levels: low, medium, high, critical
- ML model versions and types
- Feature contributions and predictions
- Recommendations: auto_approve, manual_review, reject, escalate

### User Risk Profiles
- Historical return data per user
- Risk scores and trends
- Fraud incident tracking
- Watchlist status
- Account status monitoring

### Fraud Patterns
- Pattern types: high_frequency_returns, high_value_returns, reason_abuse, timing_abuse, wardrobing
- Severity levels and confidence scores
- Evidence and affected returns/users
- Detection methods and status tracking

### Admin Alerts
- Alert types: high_risk_return, volume_spike, processing_delay, fraud_detected, policy_violation
- Severity levels and status tracking
- Related returns and users
- Acknowledgment and resolution tracking

### Audit Logs
- Action types: status_change, refund_processed, risk_assessment, manual_review, policy_update
- Complete before/after state tracking
- IP address and user agent logging
- Admin action attribution

### Analytics Aggregations
- **Hourly:** 7 days of hourly metrics
- **Daily:** 90 days of daily metrics
- **Real-time:** 24 hours of 5-minute interval metrics

## Verification

After running the seeding scripts, you can verify the data with these queries:

```sql
-- Check record counts
SELECT 
  'Users' as table_name, 
  COUNT(*) as count 
FROM users 
WHERE handle LIKE 'testuser%';

-- View high-risk returns
SELECT 
  r.id,
  r.status,
  ra.risk_score,
  ra.risk_level
FROM returns r
JOIN risk_assessments ra ON r.id = ra.return_id
WHERE ra.risk_level IN ('high', 'critical')
ORDER BY ra.risk_score DESC
LIMIT 10;

-- View active alerts
SELECT 
  alert_type,
  severity,
  title,
  status
FROM return_admin_alerts
WHERE status = 'active'
ORDER BY severity DESC
LIMIT 10;

-- View recent analytics
SELECT 
  day_date,
  total_returns,
  approved_returns,
  return_rate_percentage
FROM return_analytics_daily
ORDER BY day_date DESC
LIMIT 7;
```

## Cleanup

To remove all test data:

```sql
-- Delete test users and cascade to related records
DELETE FROM users WHERE handle LIKE 'testuser%';

-- Or delete specific tables
DELETE FROM return_events;
DELETE FROM refund_financial_records;
DELETE FROM risk_assessments;
DELETE FROM user_risk_profiles;
DELETE FROM fraud_patterns;
DELETE FROM return_admin_alerts;
DELETE FROM return_admin_audit_log;
DELETE FROM return_analytics_hourly;
DELETE FROM return_analytics_daily;
DELETE FROM return_metrics_realtime;
```

## Notes

- The TypeScript script requires `@faker-js/faker` package
- The SQL script uses PostgreSQL-specific functions (gen_random_uuid, generate_series)
- Both scripts are idempotent and can be run multiple times
- Test data is clearly marked with 'testuser' prefix for easy identification
- All timestamps are relative to the current time for realistic testing

## Troubleshooting

### Missing Tables
If you get "table does not exist" errors, ensure you've run all migrations:
```bash
npm run db:migrate
```

### Permission Errors
Ensure your database user has INSERT permissions:
```sql
GRANT INSERT ON ALL TABLES IN SCHEMA public TO your_username;
```

### Faker.js Not Found
Install the required dependency:
```bash
npm install --save-dev @faker-js/faker
```

## Related Documentation

- [Return Admin Monitoring Schema](../drizzle/0073_return_admin_monitoring_schema.sql)
- [Refund Financial Records Schema](../drizzle/0055_refund_financial_records.sql)
- [Risk Assessment Schema](../drizzle/0074_risk_assessment_data_models.sql)
- [Performance Indexes](../drizzle/0075_performance_indexes_return_monitoring.sql)
