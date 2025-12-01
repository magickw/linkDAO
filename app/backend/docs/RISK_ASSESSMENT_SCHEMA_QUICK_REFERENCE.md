# Risk Assessment Data Models - Quick Reference

## Overview

This document provides a quick reference for the risk assessment data models created for the Return and Refund Admin Monitoring system. These tables support comprehensive fraud detection, risk scoring, and pattern analysis.

## Core Tables

### 1. risk_assessments

**Purpose**: Core risk scoring and assessment for each return request

**Key Fields**:
- `risk_score` (0-100): Calculated risk score
- `risk_level`: low | medium | high | critical
- `confidence_score` (0-100): Model confidence in assessment
- `recommendation`: auto_approve | manual_review | reject | escalate | flag_for_investigation
- `feature_contributions`: JSONB array of features with weights and contributions
- `model_version`: Version of the risk model used
- `actual_outcome`: For model training (legitimate | fraudulent | unknown)

**Relationships**:
- References `returns(id)` - The return being assessed
- References `users(id)` - The user being assessed

**Indexes**: 9 indexes including risk_level, risk_score, recommendation, and high_risk composite

---

### 2. risk_features

**Purpose**: Individual risk factors and their contributions to risk scores

**Key Fields**:
- `feature_name`: Name of the risk feature
- `feature_category`: user_history | order_characteristics | behavioral | temporal | financial | device | network | pattern
- `feature_value`: JSONB actual value
- `weight` (0-1): Feature weight in model
- `contribution`: Contribution to final risk score
- `z_score`: Standard deviations from population mean
- `percentile` (0-100): Percentile rank

**Relationships**:
- References `risk_assessments(id)` - The assessment this feature belongs to

**Indexes**: 5 indexes including feature_name, feature_category, and contribution

---

### 3. fraud_patterns

**Purpose**: Detected fraud patterns and suspicious behaviors

**Key Fields**:
- `pattern_type`: high_frequency_returns | high_value_returns | reason_abuse | timing_abuse | wardrobing | bracketing | serial_returner | coordinated_fraud | etc.
- `scope`: user | seller | system | network
- `entity_id`: User ID, Seller ID, or NULL for system-wide
- `severity`: low | medium | high | critical
- `confidence` (0-100): Detection confidence
- `evidence`: JSONB array of evidence items
- `affected_returns`: JSONB array of return IDs
- `status`: active | investigating | confirmed | false_positive | resolved
- `estimated_loss`: Financial impact estimate
- `pattern_cluster_id`: Groups related patterns

**Relationships**:
- Self-referencing for related patterns
- Can reference users or sellers via entity_id

**Indexes**: 9 indexes including pattern_type, scope, severity, status, and active patterns

---

### 4. user_risk_profiles

**Purpose**: Historical risk data and behavioral patterns per user

**Key Fields**:
- `current_risk_score` (0-100): Current risk score
- `current_risk_level`: low | medium | high | critical
- `risk_trend`: increasing | decreasing | stable
- `total_returns`: Total number of returns
- `fraudulent_returns`: Confirmed fraud incidents
- `refund_to_purchase_ratio`: Ratio of refunds to purchases
- `account_status`: active | monitored | restricted | suspended | banned
- `on_watchlist`: Boolean flag for watchlist
- `trust_score` (0-100): Trust indicator
- `fraud_flags`: Number of times flagged

**Relationships**:
- References `users(id)` - One profile per user (UNIQUE)

**Indexes**: 7 indexes including risk_level, risk_score, account_status, watchlist, and high_risk users

---

### 5. risk_rules

**Purpose**: Configurable rules for risk detection and scoring

**Key Fields**:
- `rule_name`: Unique rule name
- `rule_code`: Unique rule code
- `rule_category`: frequency | value | timing | behavior | pattern | threshold
- `condition`: JSONB rule condition structure
- `risk_score_impact`: How much this rule adds to risk score
- `severity`: low | medium | high | critical
- `is_active`: Boolean to enable/disable rule
- `auto_flag`: Automatically flag for review
- `auto_reject`: Automatically reject
- `times_triggered`: Execution counter
- `precision`: Accuracy metric (true_positives / all_positives)

**Default Rules Included**:
1. High Frequency Returns (>5 in 30 days)
2. High Value Return (>$500)
3. Rapid Return Pattern (<24 hours after delivery)
4. Reason Abuse Pattern (same reason >3 times)
5. New Account High Value (<30 days old, >$200 return)

**Indexes**: 5 indexes including rule_code, rule_category, is_active, and execution_order

---

### 6. risk_rule_executions

**Purpose**: Track rule execution history and results

**Key Fields**:
- `rule_id`: Reference to the rule
- `assessment_id`: Reference to the assessment
- `return_id`: Reference to the return
- `triggered`: Boolean - did rule trigger?
- `threshold_value`: Rule threshold
- `actual_value`: Actual measured value
- `risk_score_added`: Score added by this rule
- `execution_time_ms`: Performance metric

**Relationships**:
- References `risk_rules(id)`
- References `risk_assessments(id)`
- References `returns(id)`

**Indexes**: 5 indexes including rule_id, assessment_id, return_id, and triggered

---

### 7. fraud_investigation_cases

**Purpose**: Formal fraud investigation case management

**Key Fields**:
- `case_number`: Unique case identifier
- `case_type`: return_fraud | refund_fraud | account_fraud | coordinated_fraud | policy_abuse | identity_theft | other
- `primary_user_id`: Main subject of investigation
- `related_user_ids`: JSONB array of related users
- `related_return_ids`: JSONB array of related returns
- `severity`: low | medium | high | critical
- `priority`: low | medium | high | urgent
- `status`: open | investigating | pending_evidence | pending_review | resolved | closed | escalated
- `assigned_to`: Investigator user ID
- `resolution`: confirmed_fraud | false_positive | insufficient_evidence | policy_violation | user_error | system_error
- `estimated_loss`: Financial impact
- `law_enforcement_notified`: Boolean flag

**Relationships**:
- References `users(id)` for primary_user_id, assigned_to, resolved_by

**Indexes**: 7 indexes including case_number, case_type, status, severity, and active cases

---

## Materialized Views

### high_risk_users_summary

Aggregated view of high-risk users with their assessment history and associated patterns.

**Refresh**: Manual or scheduled
**Use Case**: Quick dashboard display of high-risk users

### active_fraud_patterns_summary

Summary of active fraud patterns grouped by type and severity.

**Refresh**: Manual or scheduled
**Use Case**: Pattern monitoring dashboard

---

## Triggers and Automation

### 1. update_user_risk_profile_on_assessment

**Trigger**: After INSERT on risk_assessments
**Action**: Updates or creates user_risk_profile with latest risk score and increments return count

### 2. increment_rule_trigger_count

**Trigger**: After INSERT on risk_rule_executions
**Action**: Increments times_triggered counter on risk_rules when rule triggers

### 3. updated_at Triggers

**Tables**: risk_assessments, fraud_patterns, user_risk_profiles, risk_rules, fraud_investigation_cases
**Action**: Automatically updates updated_at timestamp on row updates

---

## Common Queries

### Get High-Risk Returns Requiring Review

```sql
SELECT 
  ra.return_id,
  ra.risk_score,
  ra.risk_level,
  ra.recommendation,
  r.status,
  u.wallet_address
FROM risk_assessments ra
JOIN returns r ON ra.return_id = r.id
JOIN users u ON ra.user_id = u.id
WHERE ra.risk_level IN ('high', 'critical')
  AND ra.recommendation IN ('manual_review', 'escalate')
  AND r.status NOT IN ('completed', 'cancelled')
ORDER BY ra.risk_score DESC, ra.created_at DESC;
```

### Get User Risk Profile with Recent Assessments

```sql
SELECT 
  urp.*,
  COUNT(ra.id) as total_assessments,
  AVG(ra.risk_score) as avg_risk_score,
  MAX(ra.created_at) as last_assessment
FROM user_risk_profiles urp
LEFT JOIN risk_assessments ra ON urp.user_id = ra.user_id
WHERE urp.user_id = 'USER_UUID_HERE'
GROUP BY urp.id;
```

### Get Active Fraud Patterns for a User

```sql
SELECT 
  fp.*,
  COUNT(DISTINCT jsonb_array_elements_text(fp.affected_returns)) as affected_return_count
FROM fraud_patterns fp
WHERE fp.entity_id = 'USER_UUID_HERE'
  AND fp.scope = 'user'
  AND fp.status IN ('active', 'investigating')
GROUP BY fp.id
ORDER BY fp.severity DESC, fp.last_detected_at DESC;
```

### Get Rule Performance Metrics

```sql
SELECT 
  rr.rule_name,
  rr.rule_code,
  rr.times_triggered,
  rr.true_positives,
  rr.false_positives,
  rr.precision,
  COUNT(rre.id) as total_executions,
  COUNT(rre.id) FILTER (WHERE rre.triggered = true) as trigger_count
FROM risk_rules rr
LEFT JOIN risk_rule_executions rre ON rr.id = rre.rule_id
WHERE rr.is_active = true
GROUP BY rr.id, rr.rule_name, rr.rule_code, rr.times_triggered, 
         rr.true_positives, rr.false_positives, rr.precision
ORDER BY rr.times_triggered DESC;
```

---

## Performance Considerations

### Indexes

All tables have comprehensive indexes for:
- Primary lookups (IDs, foreign keys)
- Filtering (status, severity, risk_level)
- Sorting (created_at, risk_score)
- Composite queries (multi-column indexes)

### Materialized Views

- Refresh materialized views during off-peak hours
- Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` to avoid locks
- Consider automated refresh jobs for real-time dashboards

### Query Optimization

- Use indexes for WHERE clauses
- Leverage JSONB indexes for frequent JSON queries
- Consider partitioning for very large tables (>10M rows)
- Use EXPLAIN ANALYZE to optimize slow queries

---

## Security and Privacy

### Data Access

- All tables support row-level security (RLS) policies
- Admin-only access to sensitive fields
- Audit logging for all data access

### PII Handling

- User IDs are UUIDs (not directly identifiable)
- IP addresses stored for fraud detection (consider anonymization)
- Investigation notes may contain sensitive data (encrypt at rest)

### Compliance

- GDPR: Support for data export and deletion
- Data retention: Configure retention policies per table
- Audit trails: Complete history in risk_rule_executions and fraud_investigation_cases

---

## Maintenance

### Regular Tasks

1. **Refresh Materialized Views**: Daily or hourly
2. **Archive Old Data**: Move completed investigations to archive tables
3. **Update Rule Precision**: Recalculate precision metrics weekly
4. **Vacuum Tables**: Regular VACUUM ANALYZE for performance
5. **Monitor Index Usage**: Check pg_stat_user_indexes

### Monitoring

- Track table sizes and growth rates
- Monitor query performance
- Alert on high-risk pattern spikes
- Track rule execution times

---

## Integration Points

### With Return System

- Automatic risk assessment on return creation
- Risk scores influence approval workflow
- High-risk returns flagged for manual review

### With Refund System

- Risk assessment before refund processing
- Fraud patterns trigger refund holds
- Investigation cases can block refunds

### With Admin Dashboard

- Real-time risk metrics display
- Alert notifications for high-risk patterns
- Investigation case management interface

---

## Future Enhancements

1. **Machine Learning Integration**: Replace rule-based with ML models
2. **Network Analysis**: Graph-based fraud ring detection
3. **Predictive Analytics**: Forecast fraud trends
4. **Automated Actions**: Auto-suspend high-risk accounts
5. **External Data**: Integrate with fraud databases

---

## Support and Documentation

For more information:
- See main design document: `.kiro/specs/return-refund-admin-monitoring/design.md`
- See requirements: `.kiro/specs/return-refund-admin-monitoring/requirements.md`
- Run validation: `npm run validate:risk-assessment-schema`

---

**Last Updated**: December 2024
**Schema Version**: 1.0.0
**Migration File**: `0074_risk_assessment_data_models.sql`
