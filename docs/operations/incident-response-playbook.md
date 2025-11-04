# Web3 Marketplace Incident Response Playbook

## Overview

This playbook provides structured procedures for responding to incidents in the Web3 Marketplace production environment. It covers incident classification, response procedures, communication protocols, and post-incident activities.

## Incident Classification

### Severity Levels

#### Severity 1 (Critical)
- **Definition**: Complete service outage or security breach
- **Examples**: 
  - Website completely down
  - Database corruption
  - Security breach with data exposure
  - Payment processing failure
- **Response Time**: Immediate (< 5 minutes)
- **Escalation**: Automatic to on-call engineer and management

#### Severity 2 (High)
- **Definition**: Major functionality impacted, significant user impact
- **Examples**:
  - High error rates (>10%)
  - Slow response times (>5s)
  - Authentication failures
  - Blockchain connectivity issues
- **Response Time**: 15 minutes
- **Escalation**: On-call engineer, notify team lead

#### Severity 3 (Medium)
- **Definition**: Partial functionality impacted, moderate user impact
- **Examples**:
  - Moderate error rates (5-10%)
  - Performance degradation
  - Non-critical feature failures
  - Monitoring alerts
- **Response Time**: 1 hour
- **Escalation**: On-call engineer

#### Severity 4 (Low)
- **Definition**: Minor issues, minimal user impact
- **Examples**:
  - Cosmetic issues
  - Non-critical warnings
  - Documentation updates needed
- **Response Time**: Next business day
- **Escalation**: Standard ticket queue

## Incident Response Process

### Phase 1: Detection and Initial Response (0-15 minutes)

#### 1.1 Incident Detection
```bash
# Automated detection sources
- Monitoring alerts (Prometheus/Grafana)
- Application health checks
- User reports
- External monitoring services

# Manual detection
- Customer support tickets
- Social media monitoring
- Partner notifications
```

#### 1.2 Initial Assessment
```bash
# Quick assessment checklist
□ Confirm incident is real (not false positive)
□ Determine initial severity level
□ Check if incident is ongoing or resolved
□ Identify affected systems/users
□ Check for related incidents
```

#### 1.3 Immediate Actions
```bash
# For Severity 1 incidents
1. Acknowledge alert within 5 minutes
2. Start incident bridge/war room
3. Notify incident commander
4. Begin initial investigation
5. Implement immediate mitigation if available

# For Severity 2-3 incidents
1. Acknowledge alert within 15 minutes
2. Begin investigation
3. Notify team lead if needed
4. Document findings
```

### Phase 2: Investigation and Diagnosis (15-60 minutes)

#### 2.1 System Health Check
```bash
# Run comprehensive health check
./scripts/monitoring/health-check.sh

# Check specific components
kubectl get pods -n web3-marketplace-prod
kubectl get events -n web3-marketplace-prod --sort-by='.lastTimestamp'
kubectl top nodes
kubectl top pods -n web3-marketplace-prod
```

#### 2.2 Log Analysis
```bash
# Check application logs
kubectl logs -n web3-marketplace-prod deployment/backend-deployment --tail=100
kubectl logs -n web3-marketplace-prod deployment/frontend-deployment --tail=100

# Check system logs in Kibana
# Navigate to: https://logs.linkdao.io
# Search for: level:error OR level:fatal
# Time range: Last 1 hour
```

#### 2.3 Monitoring Dashboard Review
```bash
# Check Grafana dashboards
- System Overview: https://grafana.linkdao.io/d/overview
- Application Metrics: https://grafana.linkdao.io/d/app-metrics
- Infrastructure: https://grafana.linkdao.io/d/infrastructure
- Business Metrics: https://grafana.linkdao.io/d/business
```

#### 2.4 Database Investigation
```bash
# Check database health
kubectl exec -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT state, count(*) 
    FROM pg_stat_activity 
    WHERE datname = 'web3marketplace' 
    GROUP BY state;"

# Check for locks
kubectl exec -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT blocked_locks.pid AS blocked_pid,
           blocking_locks.pid AS blocking_pid,
           blocked_activity.query AS blocked_statement
    FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    WHERE NOT blocked_locks.granted;"
```

### Phase 3: Mitigation and Resolution (Ongoing)

#### 3.1 Immediate Mitigation Strategies

##### Service Outage
```bash
# Check and restart failed services
kubectl get pods -n web3-marketplace-prod | grep -v Running
kubectl delete pod <failed-pod-name> -n web3-marketplace-prod

# Scale up if load-related
kubectl scale deployment/backend-deployment --replicas=6 -n web3-marketplace-prod

# Rollback if recent deployment caused issue
kubectl rollout undo deployment/backend-deployment -n web3-marketplace-prod
```

##### High Error Rate
```bash
# Enable circuit breakers
kubectl exec -n web3-marketplace-prod deployment/backend-deployment -- \
  curl -X POST http://localhost:3000/admin/circuit-breaker/enable

# Increase timeouts temporarily
kubectl set env deployment/backend-deployment API_TIMEOUT=30000 -n web3-marketplace-prod

# Switch to backup services
kubectl set env deployment/backend-deployment BLOCKCHAIN_PROVIDER=backup -n web3-marketplace-prod
```

##### Database Issues
```bash
# Kill long-running queries
kubectl exec -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND (now() - query_start) > interval '10 minutes';"

# Restart database connections
kubectl rollout restart deployment/backend-deployment -n web3-marketplace-prod
```

##### Performance Issues
```bash
# Clear Redis cache
kubectl exec -n web3-marketplace-prod statefulset/redis-master -- redis-cli FLUSHDB

# Increase resource limits
kubectl patch deployment backend-deployment -n web3-marketplace-prod -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'
```

#### 3.2 Communication During Incident

##### Internal Communication
```bash
# Slack incident channel
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 INCIDENT: [SEV-1] Service outage detected. War room: #incident-response"}' \
  $SLACK_WEBHOOK_URL

# Email notification
echo "Incident detected: [Description]
Severity: [Level]
Status: Investigating
ETA: TBD
War room: #incident-response" | \
mail -s "INCIDENT: Web3 Marketplace" engineering@linkdao.io
```

##### External Communication
```bash
# Status page update
curl -X POST "https://api.statuspage.io/v1/pages/$PAGE_ID/incidents" \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN" \
  -d "incident[name]=Service Disruption" \
  -d "incident[status]=investigating" \
  -d "incident[impact_override]=major" \
  -d "incident[body]=We are investigating reports of service disruption."

# Customer notification (if needed)
# Send via customer communication platform
```

### Phase 4: Recovery and Validation (Post-mitigation)

#### 4.1 Service Restoration Verification
```bash
# Run health checks
./scripts/monitoring/health-check.sh

# Test critical user journeys
curl -f https://linkdao.io/api/health
curl -f https://api.linkdao.io/products?limit=1
curl -f https://api.linkdao.io/orders/health-check

# Verify monitoring systems
curl -f https://grafana.linkdao.io/api/health
curl -f https://monitoring.linkdao.io/-/healthy
```

#### 4.2 Performance Validation
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.linkdao.io/health

# Monitor error rates
watch -n 30 'curl -s "http://prometheus-service:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])"'

# Check resource usage
kubectl top pods -n web3-marketplace-prod
kubectl get hpa -n web3-marketplace-prod
```

#### 4.3 Data Integrity Verification
```bash
# Verify database consistency
kubectl exec -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT 
      schemaname,
      tablename,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes
    FROM pg_stat_user_tables 
    ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC 
    LIMIT 10;"

# Check recent transactions
kubectl exec -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT COUNT(*) as recent_orders 
    FROM orders 
    WHERE created_at > NOW() - INTERVAL '1 hour';"
```

## Communication Protocols

### Internal Communication

#### Incident Commander Responsibilities
- Overall incident coordination
- Decision making authority
- External communication approval
- Resource allocation
- Escalation decisions

#### Communication Channels
- **Primary**: Slack #incident-response
- **Voice**: Incident bridge (Zoom/Teams)
- **Email**: engineering@linkdao.io
- **SMS**: Critical escalations only

#### Status Updates
```bash
# Every 30 minutes during active incident
"UPDATE: [Timestamp]
Status: [Investigating/Mitigating/Monitoring/Resolved]
Impact: [Description of current impact]
Actions: [What we're doing]
ETA: [Expected resolution time]
Next update: [Time]"
```

### External Communication

#### Customer Communication
- **Status Page**: Primary communication channel
- **Email**: For registered users (if significant impact)
- **Social Media**: For widespread issues
- **Support Tickets**: Individual customer issues

#### Stakeholder Communication
- **Executive Team**: Severity 1 incidents immediately
- **Legal Team**: Security incidents or data breaches
- **Compliance Team**: Regulatory implications
- **Partners**: If partner integrations affected

### Communication Templates

#### Initial Incident Notification
```
Subject: [SEV-X] INCIDENT: Brief Description

We are investigating reports of [issue description] affecting [affected services/users].

Impact: [Description of user impact]
Status: Investigating
Started: [Timestamp]
ETA: Under investigation

We will provide updates every 30 minutes until resolved.

Status page: https://status.linkdao.io
```

#### Resolution Notification
```
Subject: [RESOLVED] Brief Description

The incident affecting [services] has been resolved as of [timestamp].

Root Cause: [Brief explanation]
Resolution: [What was done to fix it]
Duration: [Total incident duration]

We apologize for any inconvenience caused. A detailed post-mortem will be published within 48 hours.
```

## Post-Incident Activities

### Immediate Post-Incident (0-2 hours)

#### 1. Incident Closure
```bash
# Verify all systems are stable
./scripts/monitoring/health-check.sh

# Update status page
curl -X PATCH "https://api.statuspage.io/v1/pages/$PAGE_ID/incidents/$INCIDENT_ID" \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN" \
  -d "incident[status]=resolved" \
  -d "incident[body]=The incident has been resolved. All systems are operating normally."

# Send resolution notification
echo "RESOLVED: [Brief description]
Resolution time: [Duration]
Root cause: [Brief explanation]
Post-mortem: Will be published within 48 hours" | \
mail -s "RESOLVED: Web3 Marketplace Incident" engineering@linkdao.io
```

#### 2. Data Collection
```bash
# Collect incident timeline
- Alert timestamps
- Response actions and times
- Communication log
- System metrics during incident
- User impact metrics

# Preserve evidence
kubectl logs -n web3-marketplace-prod deployment/backend-deployment --since=2h > incident-logs-backend.txt
kubectl logs -n web3-marketplace-prod deployment/frontend-deployment --since=2h > incident-logs-frontend.txt
kubectl get events -n web3-marketplace-prod --sort-by='.lastTimestamp' > incident-events.txt
```

### Short-term Follow-up (2-48 hours)

#### 3. Root Cause Analysis
```bash
# Analysis framework (5 Whys)
1. What happened? [Symptom description]
2. Why did it happen? [Immediate cause]
3. Why did that happen? [Underlying cause]
4. Why did that happen? [Root cause]
5. Why did that happen? [System/process failure]

# Contributing factors
- Technical factors
- Process factors
- Human factors
- Environmental factors
```

#### 4. Post-Mortem Report
```markdown
# Incident Post-Mortem: [Title]

## Summary
- **Date**: [Incident date]
- **Duration**: [Total duration]
- **Severity**: [Severity level]
- **Impact**: [User/business impact]

## Timeline
[Detailed timeline of events]

## Root Cause
[Detailed root cause analysis]

## Resolution
[How the incident was resolved]

## Action Items
[Specific actions to prevent recurrence]

## Lessons Learned
[What we learned from this incident]
```

### Long-term Follow-up (1-4 weeks)

#### 5. Action Item Implementation
```bash
# Track action items
- Assign owners and due dates
- Regular progress reviews
- Validation of completed items
- Update monitoring and alerting
- Process improvements
```

#### 6. Process Improvements
```bash
# Review and update
- Incident response procedures
- Monitoring and alerting rules
- Deployment processes
- Testing procedures
- Documentation
```

## Incident Response Tools

### Monitoring and Alerting
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notification
- **PagerDuty**: Incident management and escalation

### Communication Tools
- **Slack**: Team communication
- **Zoom/Teams**: Incident bridge
- **StatusPage**: Customer communication
- **Email**: Stakeholder notification

### Investigation Tools
- **Kubectl**: Kubernetes cluster management
- **Kibana**: Log analysis and search
- **Grafana**: Metrics visualization
- **Database tools**: Direct database access

### Documentation Tools
- **Confluence/Notion**: Post-mortem documentation
- **Jira**: Action item tracking
- **Git**: Runbook and procedure updates

## Training and Preparedness

### Regular Training
- Monthly incident response drills
- Quarterly disaster recovery exercises
- Annual security incident simulations
- New team member onboarding

### Knowledge Management
- Maintain updated runbooks
- Regular procedure reviews
- Incident response training materials
- Knowledge sharing sessions

### Continuous Improvement
- Regular post-mortem reviews
- Process optimization
- Tool evaluation and updates
- Industry best practice adoption

## Compliance and Legal Considerations

### Regulatory Requirements
- Data breach notification laws
- Financial services regulations
- Industry compliance standards
- International data protection laws

### Legal Notifications
- Customer data exposure
- Financial transaction impacts
- Regulatory body notifications
- Law enforcement coordination

### Documentation Requirements
- Incident logs and evidence
- Response actions taken
- Communication records
- Compliance reporting

This incident response playbook should be regularly reviewed and updated based on lessons learned from actual incidents and changes in the system architecture.