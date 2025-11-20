# Database Connection Pool Monitoring & Performance Tuning Guide

## Overview

This guide covers how to monitor, alert on, and tune your database connection pool for optimal performance.

## Monitoring

### Metrics Collection

The connection pool monitor automatically collects the following metrics:

- **Active Connections**: Number of connections currently executing queries
- **Idle Connections**: Number of connections available in the pool
- **Waiting Clients**: Number of clients waiting for a connection
- **Total Connections**: Current total connections in the pool
- **Pool Utilization**: Percentage of pool capacity being used
- **Query Count**: Total number of queries executed
- **Average Query Duration**: Average time to execute queries
- **Connection Errors**: Number of connection errors

### API Endpoints

#### Get Current Metrics
```bash
GET /api/metrics/db/pool
```

Response:
```json
{
  "success": true,
  "metrics": {
    "timestamp": 1700000000000,
    "activeConnections": 5,
    "idleConnections": 15,
    "waitingClients": 0,
    "totalConnections": 20,
    "maxConnections": 20,
    "connectionErrors": 0,
    "queryCount": 1523,
    "avgQueryDuration": 45.2,
    "poolUtilization": 100
  }
}
```

#### Get Metrics History
```bash
GET /api/metrics/db/pool/history?limit=100
```

#### Get Metrics Summary
```bash
GET /api/metrics/db/pool/summary?period=300000
```

Response:
```json
{
  "success": true,
  "summary": {
    "period": 300000,
    "avgUtilization": 65.3,
    "maxUtilization": 95.2,
    "avgQueryDuration": 52.1,
    "totalQueries": 523,
    "totalErrors": 0
  },
  "recommendations": [
    "High average pool utilization (85.3%). Consider increasing max_connections."
  ]
}
```

#### Health Check
```bash
GET /api/metrics/db/health
```

Response:
```json
{
  "success": true,
  "healthy": true,
  "status": "healthy",
  "metrics": {
    "poolUtilization": "65.3%",
    "activeConnections": 13,
    "maxConnections": 20,
    "avgQueryDuration": "45ms",
    "errorRate": 0
  }
}
```

## Alerting

### Alert Types

The system automatically triggers alerts for the following conditions:

1. **High Utilization** (Warning)
   - Triggered when pool utilization exceeds 80%
   - Indicates the pool may need to be scaled

2. **Pool Exhaustion** (Critical)
   - Triggered when pool utilization exceeds 95%
   - Immediate action required

3. **High Error Rate** (Critical)
   - Triggered when more than 10 errors occur per minute
   - Indicates connectivity or database issues

4. **Slow Query** (Warning)
   - Triggered when a query takes longer than 1000ms
   - Indicates query optimization needed

### Alert Configuration

Customize alert thresholds in `db/index.ts`:

```typescript
const monitor = initializeMonitor(maxConnections, {
  highUtilization: 80,        // Warning threshold (%)
  criticalUtilization: 95,    // Critical threshold (%)
  maxErrors: 10,              // Max errors per minute
  slowQueryThreshold: 1000,   // Slow query threshold (ms)
});
```

### Alert Handling

Alerts are logged automatically. To add custom alert handling:

```typescript
monitor.onAlert((alert) => {
  // Send to monitoring service (e.g., Datadog, New Relic)
  // Send email/SMS notification
  // Trigger auto-scaling
  
  if (alert.level === 'critical') {
    // Handle critical alerts
    notificationService.sendCriticalAlert(alert);
  }
});
```

## Performance Tuning

### Analyzing Metrics

1. **Check Pool Utilization**
   ```bash
   curl http://localhost:3000/api/metrics/db/pool/summary
   ```

2. **Review Recommendations**
   The system provides automatic recommendations based on metrics:
   - High utilization → Increase `max_connections`
   - High query duration → Optimize queries or add indexes
   - Connection errors → Check database health
   - Waiting clients → Pool is undersized

### Tuning Parameters

#### 1. Maximum Connections

**Current Settings:**
- Free Tier: 2 connections
- Pro Tier: 5 connections
- Standard: 20 connections

**When to Increase:**
- Average utilization > 80%
- Clients frequently waiting for connections
- High request volume

**How to Adjust:**
```bash
# In .env file
DB_MAX_CONNECTIONS=30
```

**Considerations:**
- Database server limits
- Memory constraints
- Concurrent request patterns

#### 2. Idle Timeout

**Current Settings:**
- Free Tier: 20 seconds
- Pro Tier: 30 seconds
- Standard: 60 seconds

**When to Adjust:**
- Frequent connection churn → Increase
- Memory constraints → Decrease
- Bursty traffic → Increase

#### 3. Connection Timeout

**Current Settings:**
- Free Tier: 5 seconds
- Pro Tier: 3 seconds
- Standard: 2 seconds

**When to Adjust:**
- Slow network → Increase
- Fast network → Decrease
- Connection errors → Increase

#### 4. Max Lifetime

**Current:** 30 minutes

**When to Adjust:**
- Connection leaks → Decrease
- Stable connections → Increase
- Database restarts → Decrease

### Optimization Strategies

#### Strategy 1: Vertical Scaling
Increase `max_connections` when:
- Consistent high utilization (>80%)
- No slow queries
- Database can handle more connections

```bash
DB_MAX_CONNECTIONS=40
```

#### Strategy 2: Query Optimization
When average query duration > 500ms:
1. Identify slow queries in logs
2. Add database indexes
3. Optimize query structure
4. Use query caching

#### Strategy 3: Connection Pooling
For microservices architecture:
- Use connection pooling per service
- Share pool across service instances
- Monitor per-service metrics

#### Strategy 4: Read Replicas
For read-heavy workloads:
- Route reads to replicas
- Keep write pool smaller
- Monitor replica lag

## Monitoring in Production

### 1. Set Up Logging

Metrics are automatically logged every 5 minutes:
```
📊 Connection Pool Metrics Summary: {
  avgUtilization: "65.3%",
  maxUtilization: "95.2%",
  avgQueryDuration: "45ms",
  totalQueries: 523,
  totalErrors: 0
}
```

### 2. External Monitoring

Integrate with monitoring services:

**Datadog:**
```typescript
monitor.onAlert((alert) => {
  datadogClient.gauge('db.pool.utilization', alert.metrics.poolUtilization);
  datadogClient.increment('db.pool.alerts', 1, [`level:${alert.level}`]);
});
```

**New Relic:**
```typescript
monitor.onAlert((alert) => {
  newrelic.recordMetric('Custom/DB/PoolUtilization', alert.metrics.poolUtilization);
});
```

**Prometheus:**
```typescript
const poolUtilizationGauge = new promClient.Gauge({
  name: 'db_pool_utilization',
  help: 'Database connection pool utilization percentage'
});

setInterval(() => {
  const metrics = monitor.getCurrentMetrics();
  poolUtilizationGauge.set(metrics.poolUtilization);
}, 10000);
```

### 3. Set Up Alerts

**Email Alerts:**
```typescript
monitor.onAlert((alert) => {
  if (alert.level === 'critical') {
    emailService.send({
      to: 'ops@linkdao.io',
      subject: `[CRITICAL] Database Pool Alert: ${alert.type}`,
      body: alert.message
    });
  }
});
```

**Slack Alerts:**
```typescript
monitor.onAlert((alert) => {
  slackClient.postMessage({
    channel: '#alerts',
    text: `🚨 ${alert.level.toUpperCase()}: ${alert.message}`,
    attachments: [{
      color: alert.level === 'critical' ? 'danger' : 'warning',
      fields: [
        { title: 'Utilization', value: `${alert.metrics.poolUtilization.toFixed(1)}%` },
        { title: 'Active', value: alert.metrics.activeConnections },
        { title: 'Max', value: alert.metrics.maxConnections }
      ]
    }]
  });
});
```

## Troubleshooting

### High Pool Utilization

**Symptoms:**
- Pool utilization > 80%
- Clients waiting for connections

**Solutions:**
1. Increase `DB_MAX_CONNECTIONS`
2. Optimize slow queries
3. Add read replicas
4. Implement caching

### Connection Errors

**Symptoms:**
- High error rate in metrics
- Failed health checks

**Solutions:**
1. Check database connectivity
2. Verify credentials
3. Check firewall rules
4. Increase connection timeout

### Slow Queries

**Symptoms:**
- High average query duration
- Slow query alerts

**Solutions:**
1. Add database indexes
2. Optimize query structure
3. Use query EXPLAIN
4. Implement query caching

### Memory Issues

**Symptoms:**
- Out of memory errors
- High memory usage

**Solutions:**
1. Reduce `max_connections`
2. Decrease `fetch_array_size`
3. Reduce `idle_timeout`
4. Upgrade server memory

## Best Practices

1. **Monitor Regularly**: Check metrics dashboard daily
2. **Set Alerts**: Configure alerts for critical thresholds
3. **Review Recommendations**: Act on system recommendations
4. **Load Test**: Test pool under expected load
5. **Document Changes**: Track pool configuration changes
6. **Gradual Tuning**: Make small incremental changes
7. **Measure Impact**: Monitor metrics after changes

## Example Monitoring Dashboard

Create a simple monitoring dashboard:

```typescript
// dashboard.ts
import { getMonitor } from './db/connectionPoolMonitor';

setInterval(() => {
  const monitor = getMonitor();
  if (!monitor) return;
  
  const metrics = monitor.getCurrentMetrics();
  const summary = monitor.getMetricsSummary();
  
  console.clear();
  console.log('=== Database Connection Pool Dashboard ===');
  console.log(`Utilization: ${metrics.poolUtilization.toFixed(1)}%`);
  console.log(`Active: ${metrics.activeConnections}/${metrics.maxConnections}`);
  console.log(`Idle: ${metrics.idleConnections}`);
  console.log(`Waiting: ${metrics.waitingClients}`);
  console.log(`Avg Query: ${summary.avgQueryDuration.toFixed(0)}ms`);
  console.log(`Queries: ${metrics.queryCount}`);
  console.log(`Errors: ${metrics.connectionErrors}`);
  console.log('=========================================');
}, 5000);
```

## Conclusion

Proper monitoring and tuning of your database connection pool is essential for:
- Application performance
- Resource efficiency
- Cost optimization
- System reliability

Use the provided tools and follow best practices to maintain a healthy, performant database connection pool.
