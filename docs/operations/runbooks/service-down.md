# Service Down Runbook

## Alert: ServiceDown

**Severity:** Critical  
**Description:** A critical service in the Web3 Marketplace is not responding

## Immediate Actions (0-5 minutes)

### 1. Assess Impact
```bash
# Check service status
kubectl get pods -n web3-marketplace-prod -l app=<service-name>

# Check recent events
kubectl get events -n web3-marketplace-prod --sort-by='.lastTimestamp' | tail -20

# Check service endpoints
kubectl get endpoints -n web3-marketplace-prod <service-name>-service
```

### 2. Quick Health Check
```bash
# Check if pods are running
kubectl describe pod -n web3-marketplace-prod <pod-name>

# Check logs for errors
kubectl logs -n web3-marketplace-prod <pod-name> --tail=100

# Check resource usage
kubectl top pods -n web3-marketplace-prod
```

### 3. Immediate Recovery Attempts
```bash
# Restart deployment if pods are failing
kubectl rollout restart deployment/<deployment-name> -n web3-marketplace-prod

# Scale up if needed
kubectl scale deployment/<deployment-name> --replicas=<desired-count> -n web3-marketplace-prod

# Check rollout status
kubectl rollout status deployment/<deployment-name> -n web3-marketplace-prod
```

## Investigation (5-15 minutes)

### 4. Deep Dive Analysis
```bash
# Check application logs
kubectl logs -n web3-marketplace-prod deployment/<deployment-name> --previous

# Check system resources
kubectl describe nodes

# Check persistent volumes
kubectl get pv,pvc -n web3-marketplace-prod

# Check network policies
kubectl get networkpolicies -n web3-marketplace-prod
```

### 5. Database Connectivity (if applicable)
```bash
# Test database connection
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  psql -h postgres-primary-service -U postgres -d web3marketplace -c "SELECT 1;"

# Check database status
kubectl logs -n web3-marketplace-prod statefulset/postgres-primary
```

### 6. External Dependencies
```bash
# Check Redis connectivity
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  redis-cli -h redis-master-service ping

# Check external API connectivity
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  curl -I https://api.external-service.com/health
```

## Resolution Steps

### Backend Service Down
```bash
# Check database connections
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  node -e "console.log(process.env.DATABASE_URL)"

# Verify environment variables
kubectl get configmap web3-marketplace-config -o yaml

# Check secrets
kubectl get secret web3-marketplace-secrets -o yaml

# Restart with debug logging
kubectl set env deployment/backend-deployment LOG_LEVEL=debug -n web3-marketplace-prod
```

### Frontend Service Down
```bash
# Check build artifacts
kubectl exec -it -n web3-marketplace-prod deployment/frontend-deployment -- \
  ls -la /app/.next/

# Verify API connectivity
kubectl exec -it -n web3-marketplace-prod deployment/frontend-deployment -- \
  curl -I http://backend-service:3000/health

# Check static file serving
kubectl exec -it -n web3-marketplace-prod deployment/frontend-deployment -- \
  curl -I http://localhost:3001/
```

### Database Service Down
```bash
# Check PostgreSQL status
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  pg_isready -U postgres

# Check disk space
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  df -h /var/lib/postgresql/data

# Check replication status
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Restart PostgreSQL if needed
kubectl delete pod -n web3-marketplace-prod postgres-primary-0
```

### Redis Service Down
```bash
# Check Redis status
kubectl exec -it -n web3-marketplace-prod statefulset/redis-master -- \
  redis-cli ping

# Check memory usage
kubectl exec -it -n web3-marketplace-prod statefulset/redis-master -- \
  redis-cli info memory

# Check Redis configuration
kubectl exec -it -n web3-marketplace-prod statefulset/redis-master -- \
  redis-cli config get "*"

# Restart Redis if needed
kubectl delete pod -n web3-marketplace-prod redis-master-0
```

## Communication

### Internal Team Notification
```bash
# Post to Slack
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 Service Down Alert: <service-name> is experiencing issues. Investigation in progress."}' \
  $SLACK_WEBHOOK_URL

# Update status page
curl -X POST "https://api.statuspage.io/v1/pages/$PAGE_ID/incidents" \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN" \
  -d "incident[name]=Service Disruption" \
  -d "incident[status]=investigating" \
  -d "incident[impact_override]=major"
```

### Customer Communication
- Update status page immediately
- Send notification to affected users
- Provide ETA for resolution if known

## Post-Incident Actions

### 1. Service Restoration Verification
```bash
# Verify all pods are healthy
kubectl get pods -n web3-marketplace-prod

# Run health checks
curl -f https://api.web3marketplace.com/health
curl -f https://web3marketplace.com/api/health

# Check monitoring dashboards
# - Grafana: https://grafana.web3marketplace.com
# - Prometheus: https://monitoring.web3marketplace.com
```

### 2. Performance Validation
```bash
# Run load test
kubectl apply -f infrastructure/production/testing/load-test.yaml

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.web3marketplace.com/health

# Verify database performance
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "SELECT * FROM pg_stat_activity;"
```

### 3. Documentation
- Update incident log with timeline
- Document root cause analysis
- Update runbooks with lessons learned
- Schedule post-mortem meeting

## Prevention

### Monitoring Improvements
- Add additional health checks
- Implement circuit breakers
- Enhance alerting thresholds
- Add synthetic monitoring

### Infrastructure Hardening
- Review resource limits
- Implement pod disruption budgets
- Add node affinity rules
- Enhance backup procedures

## Escalation

### Level 1: On-call Engineer (0-15 minutes)
- Follow this runbook
- Attempt immediate recovery
- Communicate with team

### Level 2: Senior Engineer (15-30 minutes)
- Deep technical investigation
- Coordinate with infrastructure team
- Make architectural decisions

### Level 3: Engineering Manager (30+ minutes)
- Customer communication
- Resource allocation
- External vendor coordination

## Contact Information

- **On-call Engineer:** Check PagerDuty rotation
- **Engineering Manager:** [manager@web3marketplace.com]
- **Infrastructure Team:** [infra@web3marketplace.com]
- **Security Team:** [security@web3marketplace.com]

## Related Runbooks

- [High Error Rate](./high-error-rate.md)
- [Database Issues](./database-issues.md)
- [Network Connectivity](./network-connectivity.md)
- [Security Incident](./security-incident.md)