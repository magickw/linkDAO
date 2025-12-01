# Performance Indexes Guide
## Return and Refund Admin Monitoring System

### Overview

This document describes the performance indexes implemented for the Return and Refund Admin Monitoring system. These indexes are designed to optimize query performance for common admin dashboard operations, analytics queries, and real-time monitoring.

**Migration File**: `app/backend/drizzle/0075_performance_indexes_return_monitoring.sql`

---

## Index Strategy

### 1. Single-Column Indexes
Used for frequently filtered columns in WHERE clauses:
- `returnId` - Primary entity identifier
- `userId` - User-based filtering
- `timestamp` - Time-based queries and sorting

### 2. Composite Indexes
Optimized for multi-column queries with specific patterns:
- Combined WHERE + ORDER BY operations
- Multi-column filtering
- Covering indexes to avoid table lookups

### 3. Partial Indexes
Conditional indexes for specific query patterns:
- Reduces index size
- Optimizes for filtered subsets
- Improves write performance

---

## Index Categories

### Return Events Indexes

#### `idx_return_events_user_timestamp`
```sql
CREATE INDEX idx_return_events_user_timestamp 
  ON return_events(actor_id, timestamp DESC) 
  WHERE actor_id IS NOT NULL;
```
**Purpose**: User activity timeline queries  
**Use Case**: Admin viewing all actions by a specific user  
**Query Pattern**: `WHERE actor_id = ? ORDER BY timestamp DESC`

#### `idx_return_events_return_type_timestamp`
```sql
CREATE INDEX idx_return_events_return_type_timestamp 
  ON return_events(return_id, event_type, timestamp DESC);
```
**Purpose**: Return lifecycle event tracking  
**Use Case**: Viewing all events for a specific return  
**Query Pattern**: `WHERE return_id = ? AND event_type = ? ORDER BY timestamp DESC`

#### `idx_return_events_category_timestamp`
```sql
CREATE INDEX idx_return_events_category_timestamp 
  ON return_events(event_category, timestamp DESC);
```
**Purpose**: Event category filtering  
**Use Case**: Viewing all financial or risk events  
**Query Pattern**: `WHERE event_category = ? ORDER BY timestamp DESC`

---

### Return Analytics Indexes

#### `idx_return_analytics_hourly_timestamp`
```sql
CREATE INDEX idx_return_analytics_hourly_timestamp 
  ON return_analytics_hourly(hour_timestamp DESC);
```
**Purpose**: Time-series data retrieval  
**Use Case**: Dashboard loading recent hourly metrics  
**Query Pattern**: `WHERE hour_timestamp >= ? ORDER BY hour_timestamp DESC`

#### `idx_return_analytics_hourly_time_volume`
```sql
CREATE INDEX idx_return_analytics_hourly_time_volume 
  ON return_analytics_hourly(hour_timestamp DESC, total_returns);
```
**Purpose**: Volume-based filtering with time  
**Use Case**: Finding high-volume periods  
**Query Pattern**: `WHERE total_returns > ? ORDER BY hour_timestamp DESC`

#### `idx_return_analytics_daily_date_metrics`
```sql
CREATE INDEX idx_return_analytics_daily_date_metrics 
  ON return_analytics_daily(day_date DESC, total_returns, total_refund_amount);
```
**Purpose**: Daily trend analysis  
**Use Case**: Dashboard charts and reports  
**Query Pattern**: Multi-metric sorting and filtering

---

### Seller Performance Indexes

#### `idx_seller_return_perf_seller_period`
```sql
CREATE INDEX idx_seller_return_perf_seller_period 
  ON seller_return_performance(seller_id, period_type, period_start DESC);
```
**Purpose**: Seller-specific performance queries  
**Use Case**: Seller dashboard and performance tracking  
**Query Pattern**: `WHERE seller_id = ? AND period_type = ? ORDER BY period_start DESC`

#### `idx_seller_return_perf_compliance`
```sql
CREATE INDEX idx_seller_return_perf_compliance 
  ON seller_return_performance(compliance_score DESC, period_start DESC) 
  WHERE compliance_score < 80;
```
**Purpose**: Low compliance monitoring  
**Use Case**: Identifying sellers needing attention  
**Query Pattern**: `WHERE compliance_score < 80 ORDER BY compliance_score, period_start DESC`

#### `idx_seller_return_perf_risk`
```sql
CREATE INDEX idx_seller_return_perf_risk 
  ON seller_return_performance(seller_id, risk_score DESC) 
  WHERE risk_score > 50;
```
**Purpose**: High-risk seller identification  
**Use Case**: Risk management dashboard  
**Query Pattern**: `WHERE risk_score > 50 ORDER BY risk_score DESC`

---

### Refund Financial Indexes

#### `idx_refund_records_return_status`
```sql
CREATE INDEX idx_refund_records_return_status 
  ON refund_financial_records(return_id, status, created_at DESC);
```
**Purpose**: Return-to-refund tracking  
**Use Case**: Linking returns to refund status  
**Query Pattern**: `WHERE return_id = ? AND status = ? ORDER BY created_at DESC`

#### `idx_refund_records_provider_time`
```sql
CREATE INDEX idx_refund_records_provider_time 
  ON refund_financial_records(payment_provider, created_at DESC);
```
**Purpose**: Provider-specific refund queries  
**Use Case**: Provider performance analysis  
**Query Pattern**: `WHERE payment_provider = ? ORDER BY created_at DESC`

#### `idx_refund_records_reconciliation`
```sql
CREATE INDEX idx_refund_records_reconciliation 
  ON refund_financial_records(reconciled, reconciled_at DESC);
```
**Purpose**: Reconciliation status tracking  
**Use Case**: Financial reconciliation dashboard  
**Query Pattern**: `WHERE reconciled = false ORDER BY reconciled_at DESC`

#### `idx_refund_records_failures`
```sql
CREATE INDEX idx_refund_records_failures 
  ON refund_financial_records(status, retry_count, created_at DESC) 
  WHERE status = 'failed';
```
**Purpose**: Failed refund monitoring  
**Use Case**: Identifying refunds needing attention  
**Query Pattern**: `WHERE status = 'failed' ORDER BY retry_count DESC, created_at DESC`

---

### Risk Assessment Indexes

#### `idx_risk_assessments_user_time`
```sql
CREATE INDEX idx_risk_assessments_user_time 
  ON risk_assessments(user_id, created_at DESC);
```
**Purpose**: User risk history  
**Use Case**: User risk profile analysis  
**Query Pattern**: `WHERE user_id = ? ORDER BY created_at DESC`

#### `idx_risk_assessments_return_score`
```sql
CREATE INDEX idx_risk_assessments_return_score 
  ON risk_assessments(return_id, risk_score DESC, created_at DESC);
```
**Purpose**: Return-specific risk analysis  
**Use Case**: Return risk evaluation  
**Query Pattern**: `WHERE return_id = ? ORDER BY risk_score DESC, created_at DESC`

#### `idx_risk_assessments_review_needed`
```sql
CREATE INDEX idx_risk_assessments_review_needed 
  ON risk_assessments(reviewed, risk_level, created_at DESC) 
  WHERE reviewed = false AND risk_level IN ('high', 'critical');
```
**Purpose**: High-risk unreviewed assessments  
**Use Case**: Manual review queue  
**Query Pattern**: `WHERE reviewed = false AND risk_level IN ('high', 'critical') ORDER BY created_at DESC`

---

### Alert Management Indexes

#### `idx_return_admin_alerts_active`
```sql
CREATE INDEX idx_return_admin_alerts_active 
  ON return_admin_alerts(status, severity, created_at DESC) 
  WHERE status IN ('active', 'acknowledged');
```
**Purpose**: Active alert monitoring  
**Use Case**: Alert dashboard  
**Query Pattern**: `WHERE status IN ('active', 'acknowledged') ORDER BY severity, created_at DESC`

#### `idx_return_admin_alerts_type_time`
```sql
CREATE INDEX idx_return_admin_alerts_type_time 
  ON return_admin_alerts(alert_type, created_at DESC);
```
**Purpose**: Alert type analysis  
**Use Case**: Alert pattern identification  
**Query Pattern**: `WHERE alert_type = ? ORDER BY created_at DESC`

---

### Audit Log Indexes

#### `idx_return_admin_audit_admin_time`
```sql
CREATE INDEX idx_return_admin_audit_admin_time 
  ON return_admin_audit_log(admin_id, timestamp DESC);
```
**Purpose**: Admin action history  
**Use Case**: Admin activity tracking  
**Query Pattern**: `WHERE admin_id = ? ORDER BY timestamp DESC`

#### `idx_return_admin_audit_changes`
```sql
CREATE INDEX idx_return_admin_audit_changes 
  ON return_admin_audit_log(action_type, timestamp DESC) 
  WHERE before_state IS NOT NULL AND after_state IS NOT NULL;
```
**Purpose**: Change tracking  
**Use Case**: Audit trail for modifications  
**Query Pattern**: `WHERE action_type = ? AND before_state IS NOT NULL ORDER BY timestamp DESC`

---

## Performance Considerations

### Index Maintenance

#### Regular Maintenance Tasks
```sql
-- Weekly vacuum and analyze
VACUUM ANALYZE return_events;
VACUUM ANALYZE return_analytics_hourly;
VACUUM ANALYZE refund_financial_records;
VACUUM ANALYZE risk_assessments;

-- Monthly reindex for heavily updated tables
REINDEX TABLE return_events;
REINDEX TABLE refund_financial_records;
```

#### Monitoring Index Usage
```sql
-- Check index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname LIKE 'idx_%';
```

### Query Optimization Tips

#### 1. Use Covering Indexes
When possible, include all columns needed in the SELECT clause in the index:
```sql
-- Good: Index covers all needed columns
SELECT return_id, event_type, timestamp 
FROM return_events 
WHERE return_id = ? 
ORDER BY timestamp DESC;
-- Uses: idx_return_events_return_type_timestamp

-- Less optimal: Requires table lookup
SELECT return_id, event_type, timestamp, event_data 
FROM return_events 
WHERE return_id = ? 
ORDER BY timestamp DESC;
-- Uses index but needs table lookup for event_data
```

#### 2. Match Index Column Order
Ensure WHERE clause column order matches index definition:
```sql
-- Good: Matches index column order
WHERE seller_id = ? AND period_type = ? ORDER BY period_start DESC
-- Uses: idx_seller_return_perf_seller_period

-- Less optimal: Different column order
WHERE period_type = ? AND seller_id = ? ORDER BY period_start DESC
-- May not use index efficiently
```

#### 3. Leverage Partial Indexes
Use conditions that match partial index WHERE clauses:
```sql
-- Good: Matches partial index condition
WHERE status = 'failed' AND retry_count > 0
-- Uses: idx_refund_records_failures

-- Less optimal: Doesn't match partial index
WHERE status IN ('failed', 'pending')
-- Cannot use partial index
```

---

## Common Query Patterns

### Dashboard Loading
```sql
-- Real-time metrics (last 24 hours)
SELECT * FROM return_metrics_realtime
WHERE interval_timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY interval_timestamp DESC;
-- Uses: idx_return_metrics_realtime_timestamp

-- Daily trends (last 30 days)
SELECT * FROM return_analytics_daily
WHERE day_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY day_date DESC;
-- Uses: idx_return_analytics_daily_timestamp
```

### Seller Performance
```sql
-- Seller monthly performance
SELECT * FROM seller_return_performance
WHERE seller_id = ?
  AND period_type = 'monthly'
  AND period_start >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
ORDER BY period_start DESC;
-- Uses: idx_seller_return_perf_seller_period

-- Low compliance sellers
SELECT * FROM seller_return_performance
WHERE compliance_score < 80
  AND period_type = 'monthly'
ORDER BY compliance_score ASC, period_start DESC
LIMIT 20;
-- Uses: idx_seller_return_perf_compliance
```

### Risk Management
```sql
-- High-risk unreviewed returns
SELECT * FROM risk_assessments
WHERE reviewed = false
  AND risk_level IN ('high', 'critical')
ORDER BY created_at DESC
LIMIT 50;
-- Uses: idx_risk_assessments_review_needed

-- User risk history
SELECT * FROM risk_assessments
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 100;
-- Uses: idx_risk_assessments_user_time
```

### Financial Reconciliation
```sql
-- Unreconciled refunds
SELECT * FROM refund_financial_records
WHERE reconciled = false
  AND processed_at IS NOT NULL
ORDER BY processed_at DESC;
-- Uses: idx_refund_records_reconciliation

-- Failed refunds needing retry
SELECT * FROM refund_financial_records
WHERE status = 'failed'
  AND retry_count < 3
ORDER BY retry_count ASC, created_at DESC;
-- Uses: idx_refund_records_failures
```

---

## Validation

### Running Validation Script
```bash
# From app/backend directory
npm run validate:indexes

# Or directly with ts-node
npx ts-node scripts/validate-performance-indexes.ts
```

### Expected Output
```
🔍 Validating Performance Indexes for Return and Refund Admin Monitoring

================================================================================

📊 Fetching index information...
✓ Found 54 relevant indexes

🔎 Checking for missing indexes...
✅ All expected indexes are present!

📈 Fetching index usage statistics...
✓ Retrieved statistics for 54 indexes

⚠️  Checking for unused indexes...
✅ All indexes have been used at least once

🏆 Top 10 Most Used Indexes:
   1. idx_return_events_return_type_timestamp
      Table: return_events
      Scans: 15,234
      ...

💾 Table and Index Sizes:
   return_events:
      Total: 45 MB
      Table: 32 MB
      Indexes: 13 MB
   ...

================================================================================
📋 VALIDATION SUMMARY
================================================================================
Total Expected Indexes: 54
Indexes Found: 54
Missing Indexes: 0
Unused Indexes: 0

✅ All performance indexes are properly configured!
✅ Database is optimized for return and refund admin monitoring queries.
```

---

## Troubleshooting

### Slow Queries
1. Check if appropriate index exists
2. Verify query pattern matches index definition
3. Run EXPLAIN ANALYZE to see query plan
4. Consider adding covering index if table lookups are expensive

### Index Not Being Used
1. Ensure statistics are up to date: `ANALYZE table_name;`
2. Check if query pattern matches index columns
3. Verify WHERE clause conditions match partial index
4. Consider index column order

### High Index Maintenance Cost
1. Review index usage statistics
2. Drop unused indexes
3. Consider consolidating similar indexes
4. Adjust autovacuum settings for high-write tables

---

## References

- **Migration File**: `app/backend/drizzle/0075_performance_indexes_return_monitoring.sql`
- **Validation Script**: `app/backend/scripts/validate-performance-indexes.ts`
- **Design Document**: `.kiro/specs/return-refund-admin-monitoring/design.md`
- **Requirements**: `.kiro/specs/return-refund-admin-monitoring/requirements.md`

---

**Last Updated**: December 1, 2024  
**Migration Version**: 0075  
**Status**: ✅ Complete
