# Performance Indexes Quick Reference
## Return and Refund Admin Monitoring

### Quick Index Lookup

| Table | Index Name | Columns | Use Case |
|-------|-----------|---------|----------|
| **return_events** | `idx_return_events_user_timestamp` | actor_id, timestamp DESC | User activity timeline |
| | `idx_return_events_return_type_timestamp` | return_id, event_type, timestamp DESC | Return lifecycle tracking |
| | `idx_return_events_category_timestamp` | event_category, timestamp DESC | Event category filtering |
| **return_analytics_hourly** | `idx_return_analytics_hourly_timestamp` | hour_timestamp DESC | Time-series queries |
| | `idx_return_analytics_hourly_time_volume` | hour_timestamp DESC, total_returns | Volume-based filtering |
| **return_analytics_daily** | `idx_return_analytics_daily_timestamp` | day_date DESC | Daily metrics |
| | `idx_return_analytics_daily_date_metrics` | day_date DESC, total_returns, total_refund_amount | Trend analysis |
| **seller_return_performance** | `idx_seller_return_perf_seller_period` | seller_id, period_type, period_start DESC | Seller dashboard |
| | `idx_seller_return_perf_compliance` | compliance_score DESC, period_start DESC (WHERE < 80) | Low compliance |
| | `idx_seller_return_perf_risk` | seller_id, risk_score DESC (WHERE > 50) | High-risk sellers |
| **refund_financial_records** | `idx_refund_records_return_status` | return_id, status, created_at DESC | Return-refund linking |
| | `idx_refund_records_provider_time` | payment_provider, created_at DESC | Provider analysis |
| | `idx_refund_records_reconciliation` | reconciled, reconciled_at DESC | Reconciliation |
| | `idx_refund_records_failures` | status, retry_count, created_at DESC (WHERE failed) | Failed refunds |
| **risk_assessments** | `idx_risk_assessments_user_time` | user_id, created_at DESC | User risk history |
| | `idx_risk_assessments_return_score` | return_id, risk_score DESC, created_at DESC | Return risk |
| | `idx_risk_assessments_review_needed` | reviewed, risk_level, created_at DESC (WHERE unreviewed + high risk) | Review queue |
| **return_admin_alerts** | `idx_return_admin_alerts_active` | status, severity, created_at DESC (WHERE active) | Alert dashboard |
| | `idx_return_admin_alerts_type_time` | alert_type, created_at DESC | Alert analysis |

### Common Query Patterns

#### Dashboard Metrics (Last 24 Hours)
```sql
SELECT * FROM return_metrics_realtime
WHERE interval_timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY interval_timestamp DESC;
```
**Index Used**: `idx_return_metrics_realtime_timestamp`

#### Seller Performance (Last 6 Months)
```sql
SELECT * FROM seller_return_performance
WHERE seller_id = $1
  AND period_type = 'monthly'
  AND period_start >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
ORDER BY period_start DESC;
```
**Index Used**: `idx_seller_return_perf_seller_period`

#### High-Risk Returns Needing Review
```sql
SELECT * FROM risk_assessments
WHERE reviewed = false
  AND risk_level IN ('high', 'critical')
ORDER BY created_at DESC
LIMIT 50;
```
**Index Used**: `idx_risk_assessments_review_needed`

#### Failed Refunds
```sql
SELECT * FROM refund_financial_records
WHERE status = 'failed'
  AND retry_count < 3
ORDER BY retry_count ASC, created_at DESC;
```
**Index Used**: `idx_refund_records_failures`

### Index Maintenance Commands

```sql
-- Update statistics (run weekly)
ANALYZE return_events;
ANALYZE refund_financial_records;
ANALYZE risk_assessments;

-- Check index usage
SELECT tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT tablename, indexname
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname LIKE 'idx_%';
```

### Performance Tips

✅ **DO**:
- Match WHERE clause column order to index definition
- Use partial index conditions when applicable
- Include ORDER BY columns in composite indexes
- Run ANALYZE after bulk data changes

❌ **DON'T**:
- Use functions on indexed columns in WHERE clause
- Mix AND/OR conditions that prevent index usage
- Create duplicate or overlapping indexes
- Forget to monitor index usage

### Validation

```bash
# Run validation script
npm run validate:indexes

# Or with ts-node
npx ts-node scripts/validate-performance-indexes.ts
```

### Files

- **Migration**: `app/backend/drizzle/0075_performance_indexes_return_monitoring.sql`
- **Validation**: `app/backend/scripts/validate-performance-indexes.ts`
- **Full Guide**: `app/backend/docs/PERFORMANCE_INDEXES_GUIDE.md`
