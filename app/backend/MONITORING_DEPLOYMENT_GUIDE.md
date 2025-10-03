# Monitoring and Alerting Deployment Guide

This guide covers the deployment and configuration of the comprehensive monitoring and alerting system for the marketplace API endpoints.

## Overview

The monitoring system provides:
- **Health Monitoring**: Real-time system health metrics and dashboards
- **Log Aggregation**: Centralized logging with rotation and remote shipping
- **Error Tracking**: Automatic error detection, grouping, and alerting
- **Deployment Automation**: Automated deployments with rollback capabilities
- **Integrated Dashboard**: Combined monitoring interface

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │───▶│   Monitoring    │───▶│   External      │
│   Services      │    │   Integration   │    │   Services      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Health Monitor  │    │ Log Aggregation │    │ Sentry/Bugsnag  │
│ Error Tracking  │    │ Deployment Auto │    │ Slack/Email     │
│ Load Balancer   │    │ Redis Cache     │    │ Webhooks        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### System Requirements
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Nginx (optional, for reverse proxy)
- systemd (for service management)

### Environment Variables

Create `/etc/marketplace-api/.env.production` with monitoring configuration:

```bash
# Monitoring Configuration
MONITORING_DASHBOARD_ENABLED=true
MONITORING_API_ENABLED=true
MONITORING_WEBHOOKS_ENABLED=true
METRICS_RETENTION_DAYS=30

# Health Monitoring
HEALTH_CHECK_URL=http://localhost:10000/health
HEALTH_CHECK_TIMEOUT=300000

# Log Aggregation
LOG_DIR=/var/log/marketplace-api
LOG_MAX_FILE_SIZE=104857600
LOG_MAX_FILES=10
LOG_ROTATION_INTERVAL=86400000
LOG_COMPRESSION_ENABLED=true

# Remote Logging (optional)
REMOTE_LOGGING_ENABLED=false
REMOTE_LOGGING_ENDPOINT=https://logs.example.com/api/logs
REMOTE_LOGGING_API_KEY=your_api_key
REMOTE_LOGGING_BATCH_SIZE=100
REMOTE_LOGGING_FLUSH_INTERVAL=30000

# Error Tracking
ERROR_TRACKING_ENABLED=true
ERROR_SAMPLE_RATE=1.0
ERROR_MAX_TRACKED=1000
ERROR_GROUPING_WINDOW=300000

# External Error Services
SENTRY_ENABLED=false
SENTRY_DSN=https://your-sentry-dsn
BUGSNAG_ENABLED=false
BUGSNAG_API_KEY=your_bugsnag_key
ROLLBAR_ENABLED=false
ROLLBAR_ACCESS_TOKEN=your_rollbar_token

# Deployment Automation
DEPLOYMENT_ENVIRONMENT=production
REPOSITORY_URL=https://github.com/your-org/marketplace-api.git
DEPLOYMENT_BRANCH=main
DEPLOYMENT_STRATEGY=rolling
ROLLBACK_ON_FAILURE=true

# Monitoring Thresholds
ERROR_THRESHOLD=5.0
RESPONSE_TIME_THRESHOLD=2000
MONITORING_DURATION=15

# Notifications
SLACK_NOTIFICATIONS_ENABLED=false
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#deployments

EMAIL_NOTIFICATIONS_ENABLED=false
EMAIL_RECIPIENTS=admin@example.com,ops@example.com

# Alert Webhooks
ALERT_WEBHOOK_URL=https://your-alerting-system.com/webhook
```

## Deployment Steps

### 1. Deploy Monitoring Infrastructure

```bash
# Run the production deployment script
sudo ./scripts/deploy-production.sh

# Or deploy manually:
sudo npm run deploy:db deploy
sudo systemctl start marketplace-api
```

### 2. Verify Monitoring Services

```bash
# Check service status
systemctl status marketplace-api

# Test health endpoints
curl http://localhost:10000/health
curl http://localhost:10000/monitoring/health

# Check logs
journalctl -u marketplace-api -f
```

### 3. Access Monitoring Dashboards

- **Main Dashboard**: `http://your-domain.com/monitoring`
- **Health Dashboard**: `http://your-domain.com/monitoring/dashboard`
- **Error Tracking**: `http://your-domain.com/monitoring/errors`
- **Deployments**: `http://your-domain.com/monitoring/deployments`

## Monitoring Endpoints

### Health Monitoring

```bash
# Current health status
GET /monitoring/health

# Health metrics history
GET /monitoring/metrics?minutes=60

# Interactive dashboard
GET /monitoring/dashboard
```

### Error Tracking

```bash
# Get tracked errors
GET /monitoring/errors?severity=high&status=new&limit=50

# Get specific error
GET /monitoring/errors/{errorId}

# Update error status
PATCH /monitoring/errors/{errorId}
Content-Type: application/json
{"status": "acknowledged"}

# Error statistics
GET /monitoring/errors/stats
```

### Deployment Management

```bash
# Get all deployments
GET /monitoring/deployments

# Get specific deployment
GET /monitoring/deployments/{deploymentId}

# Start new deployment
POST /monitoring/deployments
Content-Type: application/json
{"version": "v1.2.3"}

# Rollback deployment
POST /monitoring/deployments/{deploymentId}/rollback

# Cancel deployment
POST /monitoring/deployments/{deploymentId}/cancel
```

### Log Aggregation

```bash
# Query logs
GET /monitoring/logs?service=api-request&level=error&limit=100

# Get log levels
GET /monitoring/logs/levels
```

## Alert Configuration

### Built-in Alert Rules

The system includes these pre-configured alerts:

1. **High Memory Usage** (>85%)
   - Severity: High
   - Cooldown: 15 minutes

2. **Database Unhealthy**
   - Severity: Critical
   - Cooldown: 5 minutes

3. **Redis Disconnected**
   - Severity: High
   - Cooldown: 10 minutes

4. **High Error Rate** (>10%)
   - Severity: High
   - Cooldown: 10 minutes

5. **Slow Response Time** (>2s)
   - Severity: Medium
   - Cooldown: 15 minutes

6. **No Healthy Load Balancer Servers**
   - Severity: Critical
   - Cooldown: 5 minutes

### Custom Alert Rules

Add custom alert rules by modifying the `HealthMonitoringService`:

```typescript
this.alertRules.push({
  id: 'custom-alert',
  name: 'Custom Alert',
  condition: (metrics) => {
    // Your custom condition
    return metrics.api.totalRequests > 10000;
  },
  severity: 'medium',
  message: 'High traffic detected',
  cooldown: 30
});
```

## External Integrations

### Slack Integration

1. Create a Slack webhook URL
2. Set environment variables:
   ```bash
   SLACK_NOTIFICATIONS_ENABLED=true
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   SLACK_CHANNEL=#alerts
   ```

### Sentry Integration

1. Create a Sentry project
2. Set environment variables:
   ```bash
   SENTRY_ENABLED=true
   SENTRY_DSN=https://your-sentry-dsn
   ```
3. Install Sentry SDK:
   ```bash
   npm install @sentry/node
   ```

### Email Notifications

1. Configure SMTP settings
2. Set environment variables:
   ```bash
   EMAIL_NOTIFICATIONS_ENABLED=true
   EMAIL_RECIPIENTS=admin@example.com,ops@example.com
   ```

## Automated Deployment

### GitHub Webhook Setup

1. Configure webhook endpoint:
   ```bash
   POST /monitoring/webhooks/github
   ```

2. Set webhook URL in GitHub:
   ```
   https://your-domain.com/monitoring/webhooks/github
   ```

3. Configure auto-deployment on push to main branch

### Manual Deployment

```bash
# Deploy latest version
curl -X POST http://localhost:10000/monitoring/deployments \
  -H "Content-Type: application/json" \
  -d '{"version": "latest"}'

# Deploy specific version
curl -X POST http://localhost:10000/monitoring/deployments \
  -H "Content-Type: application/json" \
  -d '{"version": "v1.2.3"}'
```

### Rollback Procedures

```bash
# Automatic rollback (if enabled)
# Happens automatically on deployment failure

# Manual rollback
curl -X POST http://localhost:10000/monitoring/deployments/{deploymentId}/rollback
```

## Log Management

### Log Rotation

Logs are automatically rotated based on:
- File size (default: 100MB)
- Time interval (default: 24 hours)
- Maximum files (default: 10)

### Log Compression

Rotated logs are automatically compressed with gzip to save disk space.

### Remote Log Shipping

Configure remote logging to send logs to external services:

```bash
REMOTE_LOGGING_ENABLED=true
REMOTE_LOGGING_ENDPOINT=https://logs.example.com/api/logs
REMOTE_LOGGING_API_KEY=your_api_key
```

## Performance Monitoring

### Key Metrics Tracked

- **Memory Usage**: Heap usage percentage
- **CPU Usage**: User and system CPU time
- **Database Performance**: Connection latency and status
- **Redis Performance**: Connection latency and memory usage
- **API Performance**: Request count, error rate, response time
- **Load Balancer**: Server health and connection distribution

### Metric Retention

- Real-time metrics: 1000 data points (≈8 hours at 30s intervals)
- Historical data: Configurable retention period (default: 30 days)

## Troubleshooting

### Common Issues

#### Monitoring Dashboard Not Loading

```bash
# Check service status
systemctl status marketplace-api

# Check logs
journalctl -u marketplace-api -n 100

# Test monitoring endpoint
curl http://localhost:10000/monitoring/health
```

#### High Memory Usage Alerts

```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Restart service if needed
systemctl restart marketplace-api
```

#### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis status
systemctl status redis

# Check Redis logs
journalctl -u redis -n 50
```

### Log Analysis

```bash
# Search for errors in logs
grep -r "ERROR" /var/log/marketplace-api/

# Check recent deployment logs
tail -f /var/log/marketplace-api/deployment-automation-info-*.log

# Monitor real-time logs
journalctl -u marketplace-api -f
```

## Security Considerations

### Access Control

- Monitoring endpoints should be protected with authentication
- Use HTTPS for all monitoring traffic
- Restrict access to monitoring dashboards by IP

### Data Privacy

- Sanitize sensitive data in logs
- Encrypt log files at rest
- Use secure channels for remote log shipping

### Alert Security

- Validate webhook payloads
- Use secure webhook URLs with authentication
- Rate limit webhook endpoints

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Review error trends
   - Check disk usage for logs
   - Verify backup procedures

2. **Monthly**:
   - Update alert thresholds based on trends
   - Review and clean up old deployments
   - Test rollback procedures

3. **Quarterly**:
   - Review monitoring configuration
   - Update external service integrations
   - Performance optimization review

### Backup Procedures

```bash
# Backup monitoring configuration
cp -r /etc/marketplace-api /backup/monitoring-config-$(date +%Y%m%d)

# Backup log files
tar -czf /backup/logs-$(date +%Y%m%d).tar.gz /var/log/marketplace-api/

# Backup deployment history
cp -r /opt/marketplace-api/backups /backup/deployment-backups-$(date +%Y%m%d)
```

## Support and Documentation

### Additional Resources

- [Health Monitoring API Documentation](./monitoring/health-dashboard.ts)
- [Error Tracking Configuration](./monitoring/error-tracking.ts)
- [Deployment Automation Guide](./monitoring/deployment-automation.ts)
- [Log Aggregation Setup](./monitoring/log-aggregation.ts)

### Getting Help

1. Check the monitoring dashboard for system status
2. Review application logs for specific errors
3. Check external service status (Sentry, Slack, etc.)
4. Contact the development team with monitoring data

## Version History

- v1.0.0 - Initial monitoring and alerting system
- Requirements: 10.1, 10.5, 10.6 from marketplace-api-endpoints spec