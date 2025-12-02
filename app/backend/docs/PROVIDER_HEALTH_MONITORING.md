# Provider Health Monitoring System

## Overview

The Provider Health Monitoring system provides comprehensive real-time monitoring and analysis of payment provider health for refund operations. It tracks performance metrics, detects issues, and provides actionable recommendations for maintaining optimal refund processing.

## Features

### 1. Real-Time Health Monitoring

Monitor the health status of all payment providers (Stripe, PayPal, Blockchain) in real-time:

- **Overall Health Status**: healthy, warning, or critical
- **Uptime Percentage**: Provider availability over time
- **Response Time**: Average API response time in milliseconds
- **Error Rate**: Percentage of failed transactions
- **Throughput**: Transactions processed per minute

### 2. Multi-Window Metrics

Track provider performance across different time windows:

- **Last 5 Minutes**: Immediate performance indicators
- **Last 15 Minutes**: Short-term trend analysis
- **Last Hour**: Medium-term performance overview

### 3. Automated Alerts

Receive automatic alerts for:

- Low uptime (< 99%)
- High error rates (> 1%)
- Slow response times (> 2000ms)
- Low transaction volume
- Critical provider failures

### 4. Health History Tracking

Analyze provider health over time:

- Historical snapshots at configurable intervals
- Trend analysis (improving, stable, declining)
- Statistical summaries
- Uptime percentage calculations

### 5. Provider Comparison

Compare health metrics across all providers:

- Composite health scores (0-100)
- Ranking by performance
- Side-by-side metric comparison
- Actionable recommendations

## API Endpoints

### Get Provider Health Status

```http
GET /api/admin/provider-health/health
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-12-01T12:00:00Z",
    "providers": [
      {
        "provider": "stripe",
        "health": {
          "overall": "healthy",
          "uptime": 99.8,
          "responseTime": 1250,
          "errorRate": 0.2,
          "throughput": 5.5
        },
        "metrics": {
          "last5Minutes": {
            "successCount": 25,
            "failureCount": 0,
            "averageResponseTime": 1200
          },
          "last15Minutes": {
            "successCount": 80,
            "failureCount": 1,
            "averageResponseTime": 1250
          },
          "lastHour": {
            "successCount": 330,
            "failureCount": 1,
            "averageResponseTime": 1250
          }
        },
        "alerts": [],
        "recommendations": []
      }
    ],
    "summary": {
      "totalProviders": 3,
      "healthy": 2,
      "warning": 1,
      "critical": 0,
      "averageUptime": 98.5,
      "averageResponseTime": 1800
    }
  }
}
```

### Get Provider Health History

```http
GET /api/admin/provider-health/health/:provider/history?hours=24
Authorization: Bearer <admin_token>
```

**Parameters:**
- `provider`: stripe | paypal | blockchain
- `hours`: Number of hours to retrieve (default: 24)

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "stripe",
    "period": {
      "start": "2024-11-30T12:00:00Z",
      "end": "2024-12-01T12:00:00Z",
      "hours": 24
    },
    "currentStatus": {
      "provider": "stripe",
      "status": "operational",
      "successRate": 99.8,
      "errorRate": 0.2,
      "averageProcessingTime": 1250,
      "lastSuccessfulRefund": "2024-12-01T11:58:00Z",
      "recentErrors": []
    },
    "history": {
      "snapshots": [
        {
          "timestamp": "2024-12-01T12:00:00Z",
          "status": "operational",
          "successRate": 99.8,
          "errorRate": 0.2,
          "averageProcessingTime": 1250
        }
      ]
    }
  }
}
```

### Get Health Alerts

```http
GET /api/admin/provider-health/health/alerts
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-12-01T12:00:00Z",
    "totalAlerts": 2,
    "criticalAlerts": 1,
    "warningAlerts": 1,
    "infoAlerts": 0,
    "alerts": [
      {
        "severity": "critical",
        "message": "High error rate: 5.2%",
        "timestamp": "2024-12-01T11:55:00Z",
        "provider": "paypal",
        "healthStatus": "critical"
      },
      {
        "severity": "warning",
        "message": "Slow response time: 2500ms",
        "timestamp": "2024-12-01T11:50:00Z",
        "provider": "blockchain",
        "healthStatus": "warning"
      }
    ]
  }
}
```

### Test Provider Connectivity

```http
POST /api/admin/provider-health/health/:provider/test
Authorization: Bearer <admin_token>
```

**Parameters:**
- `provider`: stripe | paypal | blockchain

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "stripe",
    "timestamp": "2024-12-01T12:00:00Z",
    "responseTime": 450,
    "message": "Stripe connection successful",
    "details": {
      "available": 50000.00,
      "pending": 1500.00,
      "currency": "USD"
    }
  }
}
```

## Health Status Determination

### Healthy Status
- Uptime ≥ 99%
- Error rate < 1%
- Response time < 2000ms

### Warning Status
- Uptime ≥ 95% and < 99%
- Error rate < 5%
- Response time < 5000ms

### Critical Status
- Uptime < 95%
- Error rate ≥ 5%
- Response time ≥ 5000ms

## Alert Severity Levels

### Info
- Low transaction volume
- Minor performance variations
- Informational notifications

### Warning
- Uptime below optimal (< 99%)
- Elevated error rate (1-5%)
- Slow response time (2000-5000ms)

### Critical
- Low uptime (< 95%)
- High error rate (> 5%)
- Very slow response time (> 5000ms)
- Provider completely down

## Recommendations

The system provides automated recommendations based on health status:

### Critical Issues
- Immediate investigation required
- Enable failover to backup provider
- Check provider status page
- Contact provider support

### Warning Issues
- Monitor provider closely
- Review error logs for patterns
- Prepare failover procedures
- Optimize API request patterns

### Performance Optimization
- Implement request caching
- Check network connectivity
- Review authentication credentials
- Monitor for rate limiting

## Integration Example

```typescript
import { refundMonitoringService } from './services/refundMonitoringService';

// Get current provider health
const healthReports = await refundMonitoringService.monitorProviderHealth();

// Check for critical issues
const criticalProviders = healthReports.filter(
  report => report.health.overall === 'critical'
);

if (criticalProviders.length > 0) {
  // Take action: send alerts, enable failover, etc.
  console.log('Critical providers:', criticalProviders);
}

// Get health trends
import { providerHealthHistoryService } from './services/providerHealthHistoryService';

const endDate = new Date();
const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

const trends = await providerHealthHistoryService.getHealthTrends(
  'stripe',
  startDate,
  endDate
);

console.log('Success rate trend:', trends.trends.successRateTrend);
console.log('Average uptime:', trends.statistics.uptimePercentage);

// Compare providers
const comparison = await providerHealthHistoryService.compareProviderHealth(
  startDate,
  endDate
);

console.log('Best provider:', comparison.providers[0].provider);
console.log('Recommendations:', comparison.recommendations);
```

## Monitoring Best Practices

1. **Regular Monitoring**: Check provider health at least every 15 minutes
2. **Alert Configuration**: Set up automated alerts for critical issues
3. **Trend Analysis**: Review weekly trends to identify patterns
4. **Failover Planning**: Maintain backup providers for critical operations
5. **Performance Baselines**: Establish normal performance baselines for each provider
6. **Incident Response**: Have documented procedures for provider outages
7. **Capacity Planning**: Monitor throughput trends for scaling decisions

## Troubleshooting

### High Error Rates
1. Check provider status page
2. Review recent API changes
3. Verify authentication credentials
4. Check network connectivity
5. Review error logs for patterns

### Slow Response Times
1. Check network latency
2. Review API request patterns
3. Implement caching where possible
4. Check for rate limiting
5. Consider geographic routing

### Low Uptime
1. Investigate recent outages
2. Check for maintenance windows
3. Review error patterns
4. Implement redundancy
5. Consider provider alternatives

## Future Enhancements

- Machine learning-based anomaly detection
- Predictive failure analysis
- Automated failover mechanisms
- Custom alert thresholds per provider
- Integration with incident management systems
- Historical data visualization dashboard
- Provider SLA tracking and reporting
