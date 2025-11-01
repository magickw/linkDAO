# Service Worker Cache Enhancement - Deployment and Operations Guide

## Overview

This guide provides comprehensive instructions for deploying the enhanced service worker cache system to production, including step-by-step procedures, monitoring requirements, rollback procedures, and operational runbooks.

## Pre-Deployment Checklist

### Environment Preparation

- [ ] **Node.js Version**: Ensure Node.js 18+ is installed
- [ ] **Workbox CLI**: Install Workbox CLI globally (`npm install -g workbox-cli`)
- [ ] **Build Tools**: Verify webpack/Next.js build configuration
- [ ] **SSL Certificate**: Ensure HTTPS is properly configured
- [ ] **CDN Configuration**: Update CDN settings for service worker files

### Code Review Checklist

- [ ] **Service Worker Registration**: Verify registration logic in `utils/serviceWorker.ts`
- [ ] **Cache Strategies**: Review all cache strategy configurations
- [ ] **Security Headers**: Validate security header implementations
- [ ] **Error Handling**: Ensure comprehensive error handling
- [ ] **Browser Compatibility**: Test across target browsers

### Testing Requirements

- [ ] **Unit Tests**: All cache service tests passing
- [ ] **Integration Tests**: Cross-browser compatibility verified
- [ ] **E2E Tests**: Offline/online transition scenarios tested
- [ ] **Performance Tests**: Cache performance benchmarks met
- [ ] **Security Tests**: Security validation completed

## Step-by-Step Deployment Procedures

### Phase 1: Staging Deployment

#### 1.1 Build Preparation

```bash
# Navigate to frontend directory
cd app/frontend

# Install dependencies
npm ci

# Build with enhanced service worker
npm run build:enhanced

# Verify service worker generation
ls -la public/sw-enhanced.js
ls -la public/workbox-*.js
```

#### 1.2 Configuration Validation

```bash
# Validate Workbox configuration
npx workbox validateSW public/sw-enhanced.js

# Check precache manifest
npx workbox generateSW --dry-run workbox-config.js
```

#### 1.3 Staging Deployment

```bash
# Deploy to staging environment
npm run deploy:staging

# Verify service worker registration
curl -I https://staging.yourapp.com/sw-enhanced.js

# Check service worker scope
curl -H "Accept: application/json" https://staging.yourapp.com/api/sw-status
```

#### 1.4 Staging Validation

```bash
# Run automated tests against staging
npm run test:staging

# Performance validation
npm run lighthouse:staging

# Security scan
npm run security:scan:staging
```

### Phase 2: Production Deployment

#### 2.1 Pre-Production Steps

```bash
# Create deployment branch
git checkout -b deploy/cache-enhancement-v1.0.0
git push origin deploy/cache-enhancement-v1.0.0

# Tag release
git tag -a v1.0.0-cache-enhancement -m "Service Worker Cache Enhancement v1.0.0"
git push origin v1.0.0-cache-enhancement
```

#### 2.2 Database Migration (if required)

```sql
-- Create cache metadata tables
CREATE TABLE IF NOT EXISTS cache_metadata (
  id SERIAL PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  cache_name VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  ttl INTEGER NOT NULL,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_metadata_url ON cache_metadata(url);
CREATE INDEX idx_cache_metadata_tags ON cache_metadata USING GIN(tags);
CREATE INDEX idx_cache_metadata_timestamp ON cache_metadata(timestamp);
```

#### 2.3 Production Build

```bash
# Set production environment
export NODE_ENV=production
export NEXT_PUBLIC_SW_ENABLED=true
export NEXT_PUBLIC_CACHE_VERSION=v1.0.0

# Build for production
npm run build:production

# Verify build artifacts
ls -la .next/static/
ls -la public/sw-enhanced.js
```

#### 2.4 Deployment Execution

```bash
# Deploy to production (example with Vercel)
vercel --prod

# Or deploy with custom script
./scripts/deploy-production.sh

# Verify deployment
curl -I https://yourapp.com/sw-enhanced.js
```

#### 2.5 Post-Deployment Verification

```bash
# Health check
curl https://yourapp.com/api/health

# Service worker status
curl https://yourapp.com/api/sw-status

# Cache metrics endpoint
curl https://yourapp.com/api/cache-metrics
```

### Phase 3: Gradual Rollout

#### 3.1 Feature Flag Configuration

```javascript
// Feature flag for enhanced caching
const ENHANCED_CACHE_ROLLOUT = {
  enabled: true,
  percentage: 10, // Start with 10% of users
  userGroups: ['beta-testers', 'premium-users']
};
```

#### 3.2 Monitoring Setup

```bash
# Start monitoring services
docker-compose up -d monitoring

# Verify monitoring endpoints
curl http://localhost:3001/metrics
curl http://localhost:3002/health
```

#### 3.3 Gradual Increase

```javascript
// Week 1: 10% rollout
// Week 2: 25% rollout  
// Week 3: 50% rollout
// Week 4: 100% rollout

const updateRolloutPercentage = async (percentage) => {
  await featureFlags.update('enhanced-cache', { percentage });
  console.log(`Enhanced cache rollout updated to ${percentage}%`);
};
```

## Monitoring Requirements

### Key Performance Indicators (KPIs)

#### Cache Performance Metrics

```javascript
const cacheKPIs = {
  // Hit Rate Targets
  feedCacheHitRate: { target: '>85%', critical: '<70%' },
  communityCacheHitRate: { target: '>80%', critical: '<65%' },
  marketplaceCacheHitRate: { target: '>75%', critical: '<60%' },
  
  // Response Time Targets
  cacheResponseTime: { target: '<50ms', critical: '>200ms' },
  networkFallbackTime: { target: '<2s', critical: '>5s' },
  
  // Storage Efficiency
  storageUtilization: { target: '<80%', critical: '>95%' },
  cacheEvictionRate: { target: '<5%/hour', critical: '>20%/hour' }
};
```

#### Background Sync Metrics

```javascript
const syncKPIs = {
  queueProcessingTime: { target: '<30s', critical: '>300s' },
  syncSuccessRate: { target: '>95%', critical: '<85%' },
  retryRate: { target: '<10%', critical: '>25%' },
  queueBacklog: { target: '<100 items', critical: '>1000 items' }
};
```

### Monitoring Dashboard Configuration

#### Grafana Dashboard Setup

```yaml
# grafana-dashboard.yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cache-enhancement-dashboard
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Service Worker Cache Enhancement",
        "panels": [
          {
            "title": "Cache Hit Rates",
            "type": "stat",
            "targets": [
              {
                "expr": "cache_hit_rate_total{cache_name=~\"feed-cache.*\"}"
              }
            ]
          },
          {
            "title": "Storage Utilization",
            "type": "gauge",
            "targets": [
              {
                "expr": "cache_storage_used_bytes / cache_storage_total_bytes * 100"
              }
            ]
          },
          {
            "title": "Background Sync Queue",
            "type": "graph",
            "targets": [
              {
                "expr": "background_sync_queue_size"
              }
            ]
          }
        ]
      }
    }
```

#### Prometheus Metrics

```javascript
// metrics.js - Custom metrics collection
const prometheus = require('prom-client');

const cacheHitRate = new prometheus.Histogram({
  name: 'cache_hit_rate_total',
  help: 'Cache hit rate by cache name',
  labelNames: ['cache_name', 'strategy']
});

const storageUtilization = new prometheus.Gauge({
  name: 'cache_storage_utilization_percent',
  help: 'Cache storage utilization percentage'
});

const syncQueueSize = new prometheus.Gauge({
  name: 'background_sync_queue_size',
  help: 'Number of items in background sync queue'
});
```

### Alerting Configuration

#### Critical Alerts

```yaml
# alerts.yml
groups:
  - name: cache-enhancement-critical
    rules:
      - alert: CacheHitRateLow
        expr: cache_hit_rate_total < 0.7
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Cache hit rate below 70%"
          description: "Cache hit rate for {{ $labels.cache_name }} is {{ $value }}%"
      
      - alert: StorageQuotaHigh
        expr: cache_storage_utilization_percent > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Cache storage quota nearly exceeded"
          description: "Storage utilization is {{ $value }}%"
      
      - alert: SyncQueueBacklog
        expr: background_sync_queue_size > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Background sync queue backlog"
          description: "Queue size is {{ $value }} items"
```

#### Warning Alerts

```yaml
  - name: cache-enhancement-warnings
    rules:
      - alert: CacheEvictionRateHigh
        expr: rate(cache_evictions_total[1h]) > 0.2
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High cache eviction rate"
          description: "Eviction rate is {{ $value }} per hour"
      
      - alert: NetworkFallbackHigh
        expr: rate(cache_network_fallback_total[5m]) > 0.3
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High network fallback rate"
          description: "Network fallback rate is {{ $value }}"
```

## Rollback Procedures

### Emergency Rollback

#### Immediate Rollback (< 5 minutes)

```bash
#!/bin/bash
# emergency-rollback.sh

echo "Starting emergency rollback..."

# 1. Disable enhanced service worker via feature flag
curl -X POST https://yourapp.com/api/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enhanced-cache": {"enabled": false}}'

# 2. Clear service worker cache
curl -X POST https://yourapp.com/api/admin/clear-sw-cache \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. Revert to previous service worker version
aws s3 cp s3://backup-bucket/sw-backup.js s3://production-bucket/sw.js
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/sw.js"

# 4. Verify rollback
curl -I https://yourapp.com/sw.js | grep "Last-Modified"

echo "Emergency rollback completed"
```

#### Planned Rollback (< 30 minutes)

```bash
#!/bin/bash
# planned-rollback.sh

echo "Starting planned rollback..."

# 1. Reduce rollout percentage gradually
for percentage in 50 25 10 0; do
  echo "Reducing rollout to ${percentage}%"
  curl -X POST https://yourapp.com/api/admin/feature-flags \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"enhanced-cache\": {\"percentage\": $percentage}}"
  
  sleep 300 # Wait 5 minutes between reductions
done

# 2. Deploy previous version
git checkout $PREVIOUS_VERSION
npm run build:production
npm run deploy:production

# 3. Database rollback (if needed)
psql $DATABASE_URL -f rollback-migrations.sql

# 4. Verify rollback
npm run test:production

echo "Planned rollback completed"
```

### Rollback Validation

```bash
#!/bin/bash
# validate-rollback.sh

echo "Validating rollback..."

# Check service worker version
SW_VERSION=$(curl -s https://yourapp.com/sw.js | grep -o 'version.*' | head -1)
echo "Service Worker Version: $SW_VERSION"

# Check cache hit rates
CACHE_METRICS=$(curl -s https://yourapp.com/api/cache-metrics)
echo "Cache Metrics: $CACHE_METRICS"

# Check error rates
ERROR_RATE=$(curl -s https://yourapp.com/api/error-metrics | jq '.error_rate')
echo "Error Rate: $ERROR_RATE%"

# Validate against thresholds
if (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
  echo "ERROR: High error rate detected"
  exit 1
fi

echo "Rollback validation successful"
```

## Operational Runbooks

### Cache Management Runbook

#### Daily Operations

```bash
#!/bin/bash
# daily-cache-maintenance.sh

echo "Starting daily cache maintenance..."

# 1. Check storage utilization
STORAGE_USAGE=$(curl -s https://yourapp.com/api/cache-metrics | jq '.storage.percentage')
echo "Storage Usage: ${STORAGE_USAGE}%"

if (( $(echo "$STORAGE_USAGE > 80" | bc -l) )); then
  echo "High storage usage detected, triggering cleanup"
  curl -X POST https://yourapp.com/api/admin/cache-cleanup
fi

# 2. Analyze cache performance
CACHE_REPORT=$(curl -s https://yourapp.com/api/cache-report)
echo "Cache Performance Report:"
echo "$CACHE_REPORT" | jq '.hit_rates'

# 3. Check background sync queue
QUEUE_SIZE=$(curl -s https://yourapp.com/api/sync-status | jq '.queue_size')
echo "Sync Queue Size: $QUEUE_SIZE"

if (( QUEUE_SIZE > 500 )); then
  echo "Large queue detected, investigating..."
  curl -s https://yourapp.com/api/sync-status | jq '.failed_items'
fi

echo "Daily maintenance completed"
```

#### Weekly Operations

```bash
#!/bin/bash
# weekly-cache-analysis.sh

echo "Starting weekly cache analysis..."

# 1. Generate performance report
curl -X POST https://yourapp.com/api/admin/generate-report \
  -d '{"type": "weekly", "metrics": ["cache", "sync", "storage"]}'

# 2. Update cache strategies based on usage patterns
USAGE_PATTERNS=$(curl -s https://yourapp.com/api/usage-analytics)
echo "Usage Patterns: $USAGE_PATTERNS"

# 3. Optimize cache configurations
python scripts/optimize-cache-config.py --input usage-patterns.json

# 4. Update monitoring thresholds
./scripts/update-monitoring-thresholds.sh

echo "Weekly analysis completed"
```

### Incident Response Runbook

#### High Error Rate Response

```bash
#!/bin/bash
# incident-high-error-rate.sh

echo "Responding to high error rate incident..."

# 1. Immediate assessment
ERROR_DETAILS=$(curl -s https://yourapp.com/api/error-details)
echo "Error Details: $ERROR_DETAILS"

# 2. Check service worker status
SW_STATUS=$(curl -s https://yourapp.com/api/sw-status)
echo "Service Worker Status: $SW_STATUS"

# 3. Analyze cache performance
CACHE_ISSUES=$(curl -s https://yourapp.com/api/cache-diagnostics)
echo "Cache Issues: $CACHE_ISSUES"

# 4. Decision matrix
ERROR_RATE=$(echo "$ERROR_DETAILS" | jq '.error_rate')
if (( $(echo "$ERROR_RATE > 10" | bc -l) )); then
  echo "Critical error rate, initiating emergency rollback"
  ./emergency-rollback.sh
elif (( $(echo "$ERROR_RATE > 5" | bc -l) )); then
  echo "High error rate, reducing rollout percentage"
  curl -X POST https://yourapp.com/api/admin/feature-flags \
    -d '{"enhanced-cache": {"percentage": 25}}'
fi

echo "Incident response completed"
```

#### Storage Quota Exceeded Response

```bash
#!/bin/bash
# incident-storage-quota.sh

echo "Responding to storage quota exceeded..."

# 1. Immediate cleanup
curl -X POST https://yourapp.com/api/admin/emergency-cleanup

# 2. Analyze storage usage
STORAGE_BREAKDOWN=$(curl -s https://yourapp.com/api/storage-breakdown)
echo "Storage Breakdown: $STORAGE_BREAKDOWN"

# 3. Identify largest cache entries
LARGE_ENTRIES=$(curl -s https://yourapp.com/api/large-cache-entries)
echo "Large Entries: $LARGE_ENTRIES"

# 4. Adjust cache limits
curl -X POST https://yourapp.com/api/admin/update-cache-limits \
  -d '{"images-cache": {"maxEntries": 50}, "feed-cache": {"maxAgeSeconds": 300}}'

# 5. Monitor recovery
sleep 60
NEW_USAGE=$(curl -s https://yourapp.com/api/cache-metrics | jq '.storage.percentage')
echo "New Storage Usage: ${NEW_USAGE}%"

echo "Storage quota incident resolved"
```

### Performance Optimization Runbook

#### Cache Strategy Optimization

```python
#!/usr/bin/env python3
# optimize-cache-strategies.py

import json
import requests
from datetime import datetime, timedelta

def analyze_cache_performance():
    """Analyze cache performance and suggest optimizations"""
    
    # Get performance metrics
    metrics = requests.get('https://yourapp.com/api/cache-metrics').json()
    
    optimizations = []
    
    # Analyze hit rates
    for cache_name, stats in metrics['hit_rates'].items():
        if stats['ratio'] < 0.7:
            optimizations.append({
                'cache': cache_name,
                'issue': 'Low hit rate',
                'current': stats['ratio'],
                'recommendation': 'Increase TTL or change strategy'
            })
    
    # Analyze storage efficiency
    if metrics['storage']['percentage'] > 80:
        optimizations.append({
            'issue': 'High storage usage',
            'current': metrics['storage']['percentage'],
            'recommendation': 'Implement more aggressive cleanup'
        })
    
    return optimizations

def apply_optimizations(optimizations):
    """Apply recommended optimizations"""
    
    for opt in optimizations:
        if 'cache' in opt and 'Low hit rate' in opt['issue']:
            # Increase TTL for low-performing caches
            new_ttl = 600000  # 10 minutes
            requests.post('https://yourapp.com/api/admin/update-cache-config', 
                         json={opt['cache']: {'ttl': new_ttl}})
            print(f"Updated TTL for {opt['cache']} to {new_ttl}ms")

if __name__ == '__main__':
    optimizations = analyze_cache_performance()
    print(f"Found {len(optimizations)} optimization opportunities")
    
    for opt in optimizations:
        print(f"- {opt}")
    
    if optimizations:
        apply_optimizations(optimizations)
        print("Optimizations applied")
```

This comprehensive deployment and operations guide provides all the necessary procedures, monitoring requirements, and operational runbooks for successfully deploying and maintaining the enhanced service worker cache system in production.