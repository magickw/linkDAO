# High Error Rate Runbook

## Alert: HighErrorRate / CriticalErrorRate

**Severity:** Warning / Critical  
**Description:** HTTP 5xx error rate is above acceptable thresholds

## Immediate Actions (0-5 minutes)

### 1. Assess Current Error Rate
```bash
# Check current error rate in Prometheus
curl -s "http://prometheus-service:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])"

# Check error distribution by endpoint
kubectl logs -n web3-marketplace-prod deployment/backend-deployment | grep "ERROR\|FATAL" | tail -50

# Check recent error patterns
kubectl logs -n web3-marketplace-prod deployment/backend-deployment --since=10m | grep -E "(500|502|503|504)"
```

### 2. Identify Error Sources
```bash
# Check application logs for stack traces
kubectl logs -n web3-marketplace-prod deployment/backend-deployment --tail=100 | grep -A 10 -B 5 "Error:"

# Check database connection errors
kubectl logs -n web3-marketplace-prod deployment/backend-deployment | grep -i "database\|connection\|timeout"

# Check external API errors
kubectl logs -n web3-marketplace-prod deployment/backend-deployment | grep -i "external\|api\|fetch\|request failed"
```

### 3. Quick Mitigation
```bash
# Check if circuit breakers are active
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  curl -s http://localhost:3000/metrics | grep circuit_breaker

# Scale up if load-related
kubectl scale deployment/backend-deployment --replicas=6 -n web3-marketplace-prod

# Check current resource usage
kubectl top pods -n web3-marketplace-prod
```

## Investigation (5-15 minutes)

### 4. Database Analysis
```bash
# Check database connection pool
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT state, count(*) 
    FROM pg_stat_activity 
    WHERE datname = 'web3marketplace' 
    GROUP BY state;"

# Check for long-running queries
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
    FROM pg_stat_activity 
    WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# Check database locks
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT blocked_locks.pid AS blocked_pid,
           blocked_activity.usename AS blocked_user,
           blocking_locks.pid AS blocking_pid,
           blocking_activity.usename AS blocking_user,
           blocked_activity.query AS blocked_statement,
           blocking_activity.query AS current_statement_in_blocking_process
    FROM pg_catalog.pg_locks blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
    WHERE NOT blocked_locks.granted;"
```

### 5. External Dependencies
```bash
# Check blockchain node connectivity
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://mainnet.infura.io/v3/$INFURA_PROJECT_ID

# Check IPFS connectivity
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  curl -s https://gateway.pinata.cloud/ipfs/QmTest

# Check payment processor APIs
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  curl -s -I https://api.stripe.com/v1/charges

# Check Redis connectivity and performance
kubectl exec -it -n web3-marketplace-prod statefulset/redis-master -- \
  redis-cli --latency-history -i 1
```

### 6. Application Performance
```bash
# Check memory usage and garbage collection
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  node -e "console.log(process.memoryUsage())"

# Check event loop lag
kubectl logs -n web3-marketplace-prod deployment/backend-deployment | grep "event.*loop\|lag"

# Check for memory leaks
kubectl top pods -n web3-marketplace-prod --sort-by=memory
```

## Resolution Steps

### Database-Related Errors
```bash
# Kill long-running queries
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND (now() - query_start) > interval '10 minutes';"

# Restart database connections
kubectl rollout restart deployment/backend-deployment -n web3-marketplace-prod

# Check and optimize slow queries
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

### Memory/Resource Issues
```bash
# Increase memory limits temporarily
kubectl patch deployment backend-deployment -n web3-marketplace-prod -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

# Force garbage collection (Node.js)
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  kill -USR2 $(pgrep node)

# Clear Redis cache if needed
kubectl exec -it -n web3-marketplace-prod statefulset/redis-master -- \
  redis-cli FLUSHDB
```

### External API Issues
```bash
# Enable circuit breaker for failing services
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  curl -X POST http://localhost:3000/admin/circuit-breaker/enable \
  -H "Content-Type: application/json" \
  -d '{"service": "external-api-name"}'

# Switch to backup providers
kubectl set env deployment/backend-deployment BLOCKCHAIN_PROVIDER=backup -n web3-marketplace-prod

# Increase timeout values temporarily
kubectl set env deployment/backend-deployment API_TIMEOUT=30000 -n web3-marketplace-prod
```

### Application Code Issues
```bash
# Rollback to previous version if recent deployment
kubectl rollout undo deployment/backend-deployment -n web3-marketplace-prod

# Check rollout history
kubectl rollout history deployment/backend-deployment -n web3-marketplace-prod

# Enable debug logging
kubectl set env deployment/backend-deployment LOG_LEVEL=debug -n web3-marketplace-prod
```

## Monitoring and Validation

### 1. Real-time Error Tracking
```bash
# Monitor error rate in real-time
watch -n 5 'curl -s "http://prometheus-service:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])" | jq .data.result[0].value[1]'

# Monitor response times
watch -n 5 'curl -s "http://prometheus-service:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" | jq .data.result[0].value[1]'
```

### 2. Application Health Checks
```bash
# Test critical endpoints
curl -f https://api.linkdao.io/health
curl -f https://api.linkdao.io/products?limit=1
curl -f https://api.linkdao.io/orders/health-check

# Test database connectivity
kubectl exec -it -n web3-marketplace-prod deployment/backend-deployment -- \
  node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query('SELECT NOW()', (err, res) => {
      console.log(err ? 'DB Error: ' + err : 'DB OK: ' + res.rows[0].now);
      process.exit(err ? 1 : 0);
    });
  "
```

### 3. Performance Validation
```bash
# Run synthetic transactions
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: synthetic-test-$(date +%s)
  namespace: web3-marketplace-prod
spec:
  template:
    spec:
      containers:
      - name: test
        image: curlimages/curl:latest
        command:
        - /bin/sh
        - -c
        - |
          for i in {1..10}; do
            echo "Test $i:"
            curl -w "Response: %{http_code}, Time: %{time_total}s\n" \
                 -s -o /dev/null \
                 https://api.linkdao.io/products?limit=5
            sleep 2
          done
      restartPolicy: Never
EOF
```

## Communication

### Status Updates
```bash
# Update Slack channel
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"📊 Error Rate Alert: Current rate is $(curl -s 'http://prometheus-service:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])/rate(http_requests_total[5m])' | jq -r .data.result[0].value[1] | cut -c1-5)%. Investigation in progress.\"}" \
  $SLACK_WEBHOOK_URL

# Update status page if customer-facing
curl -X PATCH "https://api.statuspage.io/v1/pages/$PAGE_ID/incidents/$INCIDENT_ID" \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN" \
  -d "incident[status]=monitoring" \
  -d "incident[body]=Error rates have been reduced and we are monitoring the situation."
```

## Post-Resolution Actions

### 1. Root Cause Analysis
- Review application logs for error patterns
- Analyze database query performance
- Check external dependency response times
- Review recent code deployments

### 2. Performance Optimization
```bash
# Analyze slow queries
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT query, calls, total_time, mean_time, stddev_time
    FROM pg_stat_statements 
    WHERE calls > 100 
    ORDER BY mean_time DESC 
    LIMIT 20;"

# Check for missing indexes
kubectl exec -it -n web3-marketplace-prod statefulset/postgres-primary -- \
  psql -U postgres -d web3marketplace -c "
    SELECT schemaname, tablename, attname, n_distinct, correlation 
    FROM pg_stats 
    WHERE schemaname = 'public' 
    AND n_distinct > 100;"
```

### 3. Preventive Measures
- Implement additional monitoring
- Add circuit breakers for external APIs
- Optimize database queries
- Increase resource limits if needed
- Add caching layers

## Escalation Path

### Level 1: On-call Engineer (0-15 minutes)
- Follow immediate actions
- Implement quick fixes
- Monitor error rates

### Level 2: Senior Backend Engineer (15-30 minutes)
- Deep code analysis
- Database optimization
- Architecture decisions

### Level 3: Principal Engineer (30+ minutes)
- System-wide analysis
- Infrastructure changes
- Vendor escalation

## Related Documentation

- [Database Performance Tuning](../database/performance-tuning.md)
- [Circuit Breaker Configuration](../backend/circuit-breakers.md)
- [External API Management](../integrations/api-management.md)
- [Monitoring and Alerting](../monitoring/alerting-guide.md)