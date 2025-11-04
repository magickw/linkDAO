# Incident Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to incidents in the Web3 Marketplace platform. It covers incident classification, escalation procedures, and resolution steps for common issues.

## Incident Classification

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **P0 - Critical** | Complete service outage | 15 minutes | Site down, payment processing failed |
| **P1 - High** | Major feature unavailable | 1 hour | Login broken, order creation failing |
| **P2 - Medium** | Minor feature degraded | 4 hours | Slow page loads, search issues |
| **P3 - Low** | Cosmetic or minor issues | 24 hours | UI glitches, typos |

### Impact Assessment

#### User Impact
- **High**: Affects >50% of users or critical user journeys
- **Medium**: Affects 10-50% of users or important features
- **Low**: Affects <10% of users or minor features

#### Business Impact
- **Critical**: Revenue loss >$10k/hour, regulatory compliance issues
- **High**: Revenue loss $1k-10k/hour, major customer complaints
- **Medium**: Revenue loss <$1k/hour, minor customer impact
- **Low**: No significant business impact

## Incident Response Process

### 1. Detection and Alerting

#### Automated Monitoring
```bash
# Check system health dashboard
curl -s https://status.linkdao.io/api/health | jq '.'

# Verify monitoring systems
kubectl get pods -n monitoring
kubectl logs -f deployment/prometheus -n monitoring
```

#### Manual Detection
- User reports via support channels
- Internal team discovery
- Partner/vendor notifications

### 2. Initial Response (0-15 minutes)

#### Immediate Actions
1. **Acknowledge the incident** in monitoring system
2. **Create incident channel** in Slack: `#incident-YYYY-MM-DD-###`
3. **Assign incident commander** (on-call engineer)
4. **Gather initial information**

#### Initial Assessment Checklist
- [ ] Confirm incident is real (not false positive)
- [ ] Determine severity level
- [ ] Identify affected systems/services
- [ ] Estimate user impact
- [ ] Check for related alerts/issues

#### Communication Template
```
🚨 INCIDENT ALERT 🚨
Severity: P1
Status: Investigating
Impact: Users unable to create orders
Started: 2024-01-15 14:30 UTC
Commander: @john.doe
Channel: #incident-2024-01-15-001

Initial symptoms:
- Order creation API returning 500 errors
- Error rate spike to 25%
- Affecting ~1000 users/minute

Next update in 30 minutes.
```

### 3. Investigation and Diagnosis

#### System Health Checks

```bash
# Check overall system status
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running

# Check resource usage
kubectl top nodes
kubectl top pods -n web3-marketplace

# Check recent deployments
kubectl rollout history deployment/backend -n web3-marketplace
kubectl rollout history deployment/frontend -n web3-marketplace
```

#### Application Health Checks

```bash
# API health endpoints
curl -s https://api.linkdao.io/health | jq '.'
curl -s https://api.linkdao.io/health/database | jq '.'
curl -s https://api.linkdao.io/health/redis | jq '.'
curl -s https://api.linkdao.io/health/blockchain | jq '.'

# Check application logs
kubectl logs -f deployment/backend -n web3-marketplace --tail=100
kubectl logs -f deployment/frontend -n web3-marketplace --tail=100
```

#### Database Health Checks

```bash
# Connect to database
kubectl exec -it deployment/postgres -n web3-marketplace -- psql -U web3marketplace

# Check database performance
SELECT * FROM pg_stat_activity WHERE state = 'active';
SELECT * FROM pg_stat_database WHERE datname = 'web3marketplace_production';

# Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

# Check disk space
SELECT pg_size_pretty(pg_database_size('web3marketplace_production'));
```

#### Blockchain Connectivity

```bash
# Check Ethereum connectivity
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://mainnet.infura.io/v3/YOUR-PROJECT-ID

# Check contract status
kubectl exec -it deployment/backend -n web3-marketplace -- npm run contracts:status

# Verify recent transactions
kubectl exec -it deployment/backend -n web3-marketplace -- npm run blockchain:verify
```

### 4. Mitigation and Resolution

#### Common Resolution Procedures

##### Database Issues

```bash
# Restart database connection pool
kubectl exec deployment/backend -n web3-marketplace -- npm run db:pool:restart

# Kill long-running queries
kubectl exec -it deployment/postgres -n web3-marketplace -- psql -U web3marketplace -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < NOW() - INTERVAL '5 minutes';"

# Reindex if needed
kubectl exec -it deployment/postgres -n web3-marketplace -- psql -U web3marketplace -c "REINDEX DATABASE web3marketplace_production;"
```

##### Application Issues

```bash
# Restart application pods
kubectl rollout restart deployment/backend -n web3-marketplace
kubectl rollout restart deployment/frontend -n web3-marketplace

# Scale up resources temporarily
kubectl scale deployment backend --replicas=10 -n web3-marketplace
kubectl scale deployment frontend --replicas=6 -n web3-marketplace

# Rollback to previous version if needed
kubectl rollout undo deployment/backend -n web3-marketplace
kubectl rollout status deployment/backend -n web3-marketplace
```

##### Network Issues

```bash
# Check ingress controller
kubectl get ingress -n web3-marketplace
kubectl logs -f deployment/nginx-ingress-controller -n ingress-nginx

# Restart ingress if needed
kubectl rollout restart deployment/nginx-ingress-controller -n ingress-nginx

# Check DNS resolution
nslookup linkdao.io
nslookup api.linkdao.io
```

##### Cache Issues

```bash
# Clear Redis cache
kubectl exec -it deployment/redis -n web3-marketplace -- redis-cli FLUSHALL

# Restart Redis cluster
kubectl rollout restart deployment/redis -n web3-marketplace

# Check Redis memory usage
kubectl exec -it deployment/redis -n web3-marketplace -- redis-cli INFO memory
```

### 5. Communication Updates

#### Update Template
```
📊 INCIDENT UPDATE 📊
Severity: P1
Status: Mitigating
Impact: Users unable to create orders
Started: 2024-01-15 14:30 UTC
Duration: 45 minutes
Commander: @john.doe

Progress:
✅ Root cause identified: Database connection pool exhausted
✅ Mitigation applied: Restarted connection pool
🔄 Monitoring recovery: Order success rate improving

Current metrics:
- Error rate: 5% (down from 25%)
- Response time: 800ms (down from 3000ms)
- Affected users: ~200/minute (down from 1000/minute)

Next update in 15 minutes.
```

### 6. Resolution and Recovery

#### Verification Steps

```bash
# Verify system health
curl -s https://api.linkdao.io/health | jq '.status'

# Check error rates
kubectl exec deployment/backend -n web3-marketplace -- curl -s http://localhost:3001/metrics | grep error_rate

# Verify key user journeys
npm run test:smoke:production

# Check business metrics
kubectl exec deployment/backend -n web3-marketplace -- npm run metrics:business
```

#### Recovery Confirmation
- [ ] All systems showing green in monitoring
- [ ] Error rates back to baseline (<1%)
- [ ] Response times within SLA (<500ms)
- [ ] Key user journeys working
- [ ] No new related alerts

### 7. Post-Incident Activities

#### Immediate Actions (within 2 hours)
- [ ] Send resolution notification
- [ ] Scale down temporary resources
- [ ] Document timeline and actions taken
- [ ] Schedule post-mortem meeting

#### Resolution Notification Template
```
✅ INCIDENT RESOLVED ✅
Severity: P1
Status: Resolved
Impact: Users unable to create orders
Started: 2024-01-15 14:30 UTC
Resolved: 2024-01-15 15:45 UTC
Duration: 1 hour 15 minutes
Commander: @john.doe

Resolution:
Database connection pool was exhausted due to a memory leak in the order processing service. The issue was resolved by restarting the connection pool and deploying a hotfix to address the memory leak.

Impact:
- ~45,000 users affected
- ~500 failed order attempts
- Estimated revenue impact: $12,000

Next steps:
- Post-mortem scheduled for 2024-01-16 10:00 UTC
- Monitoring enhancements to detect similar issues earlier
- Code review of order processing service

Thank you for your patience during this incident.
```

## Specific Incident Scenarios

### Scenario 1: Complete Site Outage

#### Symptoms
- Site returns 503/504 errors
- All health checks failing
- Zero successful requests

#### Investigation Steps
```bash
# Check load balancer
kubectl get ingress -n web3-marketplace
kubectl describe ingress web3-marketplace-ingress -n web3-marketplace

# Check all pods
kubectl get pods -n web3-marketplace
kubectl describe pods -n web3-marketplace

# Check cluster resources
kubectl describe nodes
kubectl get events --sort-by=.metadata.creationTimestamp
```

#### Resolution Steps
1. **Check infrastructure**: Verify cloud provider status
2. **Restart services**: Begin with load balancer, then applications
3. **Scale resources**: Add more nodes/pods if resource constrained
4. **Activate DR**: Switch to disaster recovery environment if needed

### Scenario 2: Payment Processing Failure

#### Symptoms
- Orders stuck in "payment_pending" status
- Payment gateway errors
- Blockchain transaction failures

#### Investigation Steps
```bash
# Check payment service logs
kubectl logs -f deployment/backend -n web3-marketplace | grep payment

# Verify external service connectivity
curl -s https://api.stripe.com/v1/charges -u sk_test_key:
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}' \
  https://mainnet.infura.io/v3/YOUR-PROJECT-ID

# Check smart contract status
kubectl exec deployment/backend -n web3-marketplace -- npm run contracts:verify
```

#### Resolution Steps
1. **Verify external services**: Check Stripe, blockchain RPC status
2. **Check gas prices**: Ensure gas price settings are appropriate
3. **Restart payment workers**: Clear stuck payment jobs
4. **Manual processing**: Process stuck payments manually if needed

### Scenario 3: Database Performance Issues

#### Symptoms
- Slow response times (>2 seconds)
- Database connection timeouts
- High CPU/memory usage on database

#### Investigation Steps
```bash
# Check database performance
kubectl exec -it deployment/postgres -n web3-marketplace -- psql -U web3marketplace -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"

# Check active connections
kubectl exec -it deployment/postgres -n web3-marketplace -- psql -U web3marketplace -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';"

# Check locks
kubectl exec -it deployment/postgres -n web3-marketplace -- psql -U web3marketplace -c "
SELECT * FROM pg_locks WHERE NOT granted;"
```

#### Resolution Steps
1. **Kill long queries**: Terminate queries running >5 minutes
2. **Add read replicas**: Route read queries to replicas
3. **Optimize queries**: Add missing indexes, rewrite slow queries
4. **Scale database**: Increase CPU/memory if needed

### Scenario 4: High Error Rate

#### Symptoms
- Error rate >5% (normal <1%)
- Specific API endpoints failing
- User complaints about functionality

#### Investigation Steps
```bash
# Check error patterns
kubectl logs deployment/backend -n web3-marketplace | grep ERROR | tail -50

# Check specific endpoints
curl -s https://api.linkdao.io/v2/products | jq '.'
curl -s https://api.linkdao.io/v2/orders | jq '.'

# Check dependencies
kubectl exec deployment/backend -n web3-marketplace -- npm run health:dependencies
```

#### Resolution Steps
1. **Identify error pattern**: Group errors by type/endpoint
2. **Check recent changes**: Review recent deployments
3. **Rollback if needed**: Revert to last known good version
4. **Fix and redeploy**: Apply hotfix for specific issues

## Escalation Procedures

### Internal Escalation

#### Level 1: On-call Engineer
- **Response time**: 15 minutes
- **Authority**: Restart services, scale resources, basic troubleshooting
- **Escalate if**: Cannot resolve P0/P1 within 30 minutes

#### Level 2: Senior Engineer/Team Lead
- **Response time**: 30 minutes
- **Authority**: Code changes, infrastructure modifications, vendor contact
- **Escalate if**: Cannot resolve P0 within 1 hour, P1 within 2 hours

#### Level 3: Engineering Manager/CTO
- **Response time**: 1 hour
- **Authority**: Major architectural changes, vendor escalation, customer communication
- **Escalate if**: Incident duration >4 hours or major business impact

### External Escalation

#### Cloud Provider Support
```bash
# AWS Support Case
aws support create-case \
  --service-code "amazon-ec2" \
  --severity-code "high" \
  --category-code "performance" \
  --subject "Production outage - Web3 Marketplace" \
  --communication-body "Experiencing complete service outage..."
```

#### Vendor Support
- **Stripe**: support@stripe.com, +1-888-963-8442
- **Infura**: support@infura.io, Slack: #infura-support
- **DataDog**: support@datadoghq.com, +1-866-329-4466

## Tools and Resources

### Monitoring Dashboards
- **System Overview**: https://monitoring.linkdao.io/d/system-overview
- **Application Metrics**: https://monitoring.linkdao.io/d/app-metrics
- **Business Metrics**: https://monitoring.linkdao.io/d/business-metrics
- **Blockchain Metrics**: https://monitoring.linkdao.io/d/blockchain-metrics

### Useful Commands

#### Quick Health Check
```bash
#!/bin/bash
# scripts/quick-health-check.sh

echo "=== System Health Check ==="
echo "Nodes:"
kubectl get nodes

echo -e "\nPods:"
kubectl get pods -n web3-marketplace

echo -e "\nServices:"
kubectl get services -n web3-marketplace

echo -e "\nIngress:"
kubectl get ingress -n web3-marketplace

echo -e "\nAPI Health:"
curl -s https://api.linkdao.io/health | jq '.'

echo -e "\nFrontend Health:"
curl -s https://linkdao.io/api/health | jq '.'
```

#### Log Analysis
```bash
#!/bin/bash
# scripts/analyze-logs.sh

NAMESPACE="web3-marketplace"
TIME_RANGE="1h"

echo "=== Error Analysis (Last $TIME_RANGE) ==="
kubectl logs --since=$TIME_RANGE -n $NAMESPACE deployment/backend | grep ERROR | sort | uniq -c | sort -nr

echo -e "\n=== Top Error Messages ==="
kubectl logs --since=$TIME_RANGE -n $NAMESPACE deployment/backend | grep ERROR | awk '{print $NF}' | sort | uniq -c | sort -nr | head -10

echo -e "\n=== Response Time Analysis ==="
kubectl logs --since=$TIME_RANGE -n $NAMESPACE deployment/backend | grep "response_time" | awk '{print $NF}' | sort -n | tail -20
```

### Contact Information

#### On-Call Rotation
- **Primary**: +1-555-0123 (PagerDuty)
- **Secondary**: +1-555-0124 (PagerDuty)
- **Escalation**: +1-555-0125 (Engineering Manager)

#### Communication Channels
- **Slack**: #incidents (public), #incident-response (private)
- **Email**: incidents@linkdao.io
- **Status Page**: https://status.linkdao.io

#### Key Personnel
- **CTO**: cto@linkdao.io, +1-555-0100
- **DevOps Lead**: devops-lead@linkdao.io, +1-555-0101
- **Security Lead**: security-lead@linkdao.io, +1-555-0102
- **Customer Success**: support@linkdao.io, +1-555-0103

## Post-Incident Review Process

### Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

## Incident Summary
- **Date**: 2024-01-15
- **Duration**: 1 hour 15 minutes
- **Severity**: P1
- **Impact**: 45,000 users affected, $12,000 revenue impact

## Timeline
- **14:30 UTC**: First alert received
- **14:32 UTC**: Incident commander assigned
- **14:45 UTC**: Root cause identified
- **15:00 UTC**: Mitigation applied
- **15:45 UTC**: Incident resolved

## Root Cause
Memory leak in order processing service caused database connection pool exhaustion.

## Contributing Factors
1. Insufficient monitoring of connection pool usage
2. Missing memory leak detection in CI/CD
3. Inadequate load testing of order processing

## What Went Well
- Quick detection and response
- Effective communication
- Successful mitigation

## What Could Be Improved
- Earlier detection of memory issues
- Faster root cause identification
- Better automated recovery

## Action Items
1. [ ] Add connection pool monitoring (Owner: @devops, Due: 2024-01-20)
2. [ ] Implement memory leak detection (Owner: @backend-team, Due: 2024-01-25)
3. [ ] Enhance load testing (Owner: @qa-team, Due: 2024-01-30)
4. [ ] Update runbooks (Owner: @incident-commander, Due: 2024-01-18)

## Lessons Learned
- Connection pool monitoring is critical for database health
- Memory leaks can cause cascading failures
- Automated recovery procedures need improvement
```

### Follow-up Actions
1. **Schedule review meeting** within 48 hours
2. **Assign action items** with owners and due dates
3. **Update documentation** and runbooks
4. **Implement preventive measures**
5. **Share learnings** with broader team

This incident response runbook provides comprehensive procedures for handling various types of incidents in the Web3 Marketplace platform, ensuring quick resolution and minimal impact on users and business operations.