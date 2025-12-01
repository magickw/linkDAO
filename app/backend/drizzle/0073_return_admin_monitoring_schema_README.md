# Return and Refund Admin Monitoring Schema

## Overview

This migration creates comprehensive analytics and monitoring infrastructure for the return and refund admin dashboard. It builds on top of the existing returns/refunds system (migration 0055) to provide real-time monitoring, advanced analytics, and complete audit trails.

## Schema Components

### 1. Return Events Table (`return_events`)

**Purpose**: Comprehensive event log for all return-related activities

**Key Features**:
- Tracks all lifecycle events (created, approved, rejected, shipped, etc.)
- Records actor information (who performed the action)
- Stores before/after state for audit purposes
- Supports automated vs manual action tracking
- Flexible JSONB event data for extensibility

**Use Cases**:
- Real-time activity monitoring
- Audit trail reconstruction
- Performance analysis
- Debugging and troubleshooting

### 2. Return Analytics Aggregations

#### Hourly Aggregations (`return_analytics_hourly`)
- Pre-computed metrics for each hour
- Volume, financial, and timing metrics
- Return reason breakdowns
- Risk level distributions
- Customer satisfaction tracking

#### Daily Aggregations (`return_analytics_daily`)
- Daily rollup of all metrics
- Includes additional percentile calculations (p95, p99)
- Return rate calculations
- NPS score tracking
- Trend analysis support

**Benefits**:
- Fast dashboard loading (no real-time calculations)
- Historical trend analysis
- Reduced database load
- Consistent metric definitions

### 3. Real-Time Metrics (`return_metrics_realtime`)

**Purpose**: Live monitoring data for admin dashboard

**Key Features**:
- 5-minute interval snapshots
- Current queue depths
- Rate metrics (returns/minute, approvals/minute)
- Alert trigger flags
- System health indicators

**Use Cases**:
- Live dashboard updates
- Spike detection
- Capacity planning
- Performance monitoring

### 4. Seller Return Performance (`seller_return_performance`)

**Purpose**: Seller-specific return analytics and compliance tracking

**Key Features**:
- Configurable time periods (daily, weekly, monthly, quarterly)
- Approval rates and processing times
- Financial impact metrics
- Compliance scoring
- Performance rankings

**Use Cases**:
- Seller performance reviews
- Compliance monitoring
- Seller comparison and benchmarking
- Policy violation tracking

### 5. Category Return Analytics (`category_return_analytics`)

**Purpose**: Category-level return patterns and insights

**Key Features**:
- Return rates by category
- Top return reasons analysis
- Quality indicators (defect rate, damage rate)
- Trend detection
- Industry benchmark comparisons

**Use Cases**:
- Product quality monitoring
- Category performance analysis
- Inventory planning
- Supplier evaluation

### 6. Refund Provider Performance (`refund_provider_performance`)

**Purpose**: Payment provider reliability and performance tracking

**Key Features**:
- Multi-provider support (Stripe, PayPal, blockchain)
- Success/failure rates
- Processing time metrics
- Error analysis and breakdown
- Operational status monitoring

**Use Cases**:
- Provider reliability monitoring
- Failover decision making
- Cost optimization
- SLA compliance tracking

### 7. Admin Alerts (`return_admin_alerts`)

**Purpose**: Alert management system for admin notifications

**Key Features**:
- Multiple alert types (volume spikes, delays, fraud, etc.)
- Severity levels (low, medium, high, critical)
- Status tracking (active, acknowledged, resolved)
- Recommended actions
- Notification tracking

**Use Cases**:
- Proactive issue detection
- Alert management workflow
- Escalation handling
- Performance degradation detection

### 8. Admin Audit Log (`return_admin_audit_log`)

**Purpose**: Complete audit trail of all admin actions

**Key Features**:
- Comprehensive action tracking
- Before/after state capture
- IP address and user agent logging
- Justification requirements
- Secondary approval support

**Use Cases**:
- Compliance auditing
- Security monitoring
- Change tracking
- Dispute resolution

## Indexes

All tables include optimized indexes for:
- Primary key lookups
- Time-based queries
- Foreign key relationships
- Common filter combinations
- Composite queries

## Triggers and Functions

### Automatic Event Logging
- `log_return_status_change()`: Automatically creates return events when return status changes
- Applied to `returns` table

### Timestamp Management
- `update_return_monitoring_updated_at()`: Maintains updated_at timestamps
- Applied to tables with mutable data

## Materialized Views

### `return_dashboard_summary`
Pre-computed summary for real-time dashboard:
- Pending approval count
- In-progress returns
- Pending inspections
- Pending refunds
- High-risk returns
- 24-hour and 7-day metrics

**Refresh Strategy**: Should be refreshed every 5-15 minutes depending on load

## Performance Considerations

### Query Optimization
- All time-based queries use indexed timestamp columns
- Composite indexes for common filter combinations
- Partial indexes for frequently filtered subsets

### Data Volume Management
- Hourly aggregations: ~8,760 rows per year
- Daily aggregations: ~365 rows per year
- Real-time metrics: ~105,120 rows per year (5-min intervals)
- Events table: Grows with activity, consider partitioning

### Recommended Maintenance

```sql
-- Refresh materialized view (run every 5-15 minutes)
REFRESH MATERIALIZED VIEW CONCURRENTLY return_dashboard_summary;

-- Archive old events (run monthly)
DELETE FROM return_events 
WHERE created_at < NOW() - INTERVAL '1 year';

-- Vacuum and analyze (run weekly)
VACUUM ANALYZE return_events;
VACUUM ANALYZE return_analytics_hourly;
VACUUM ANALYZE return_analytics_daily;
```

## Integration Points

### Existing Tables
- `returns`: Core return data (from migration 0055)
- `users`: Admin and user identification
- `orders`: Order reference data
- `categories`: Product categorization

### External Systems
- Payment providers (Stripe, PayPal)
- Notification services
- Reporting tools
- BI platforms

## Security Considerations

### Data Access
- Admin-only access to all monitoring tables
- Row-level security can be implemented for multi-tenant scenarios
- Sensitive data (IP addresses, user agents) should be handled per privacy policy

### Audit Requirements
- All admin actions are logged
- Before/after states captured for changes
- Justification required for sensitive operations
- Secondary approval support for critical actions

## Migration Notes

### Prerequisites
- Migration 0055 (returns_refunds_system) must be applied first
- Requires PostgreSQL 12+ for JSONB features
- Sufficient storage for time-series data

### Rollback
To rollback this migration:
```sql
DROP TABLE IF EXISTS return_admin_audit_log CASCADE;
DROP TABLE IF EXISTS return_admin_alerts CASCADE;
DROP TABLE IF EXISTS refund_provider_performance CASCADE;
DROP TABLE IF EXISTS category_return_analytics CASCADE;
DROP TABLE IF EXISTS seller_return_performance CASCADE;
DROP TABLE IF EXISTS return_metrics_realtime CASCADE;
DROP TABLE IF EXISTS return_analytics_daily CASCADE;
DROP TABLE IF EXISTS return_analytics_hourly CASCADE;
DROP TABLE IF EXISTS return_events CASCADE;
DROP MATERIALIZED VIEW IF EXISTS return_dashboard_summary;
DROP FUNCTION IF EXISTS log_return_status_change();
DROP FUNCTION IF EXISTS update_return_monitoring_updated_at();
```

## Future Enhancements

### Potential Additions
- Machine learning model predictions table
- A/B testing results tracking
- Customer feedback sentiment analysis
- Automated action recommendations
- Predictive analytics for return volumes

### Scalability Considerations
- Table partitioning for high-volume events
- Read replicas for analytics queries
- Data warehouse integration
- Real-time streaming to analytics platforms

## Support and Documentation

For questions or issues:
1. Review the design document: `.kiro/specs/return-refund-admin-monitoring/design.md`
2. Check requirements: `.kiro/specs/return-refund-admin-monitoring/requirements.md`
3. Consult implementation tasks: `.kiro/specs/return-refund-admin-monitoring/tasks.md`

## Version History

- **v1.0.0** (2024-12-01): Initial schema creation
  - Return events tracking
  - Analytics aggregations (hourly/daily)
  - Real-time metrics
  - Seller and category analytics
  - Provider performance tracking
  - Admin alerts and audit log
