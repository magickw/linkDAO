# Service Worker Cache Enhancement - Monitoring and Troubleshooting

## Production Monitoring

### Real-Time Monitoring Dashboard

#### Key Metrics to Monitor

```javascript
const CRITICAL_METRICS = {
  // Cache Performance
  cacheHitRate: {
    feed: { target: '>85%', warning: '<80%', critical: '<70%' },
    communities: { target: '>80%', warning: '<75%', critical: '<65%' },
    marketplace: { target: '>75%', warning: '<70%', critical: '<60%' },
    images: { target: '>90%', warning: '<85%', critical: '<75%' }
  },
  
  // Response Times
  responseTime: {
    cacheHit: { target: '<50ms', warning: '>100ms', critical: '>200ms' },
    cacheMiss: { target: '<2s', warning: '>3s', critical: '>5s' },
    networkFallback: { target: '<3s', warning: '>5s', critical: '>10s' }
  },
  
  // Storage Management
  storage: {
    utilization: { target: '<70%', warning: '>80%', critical: '>90%' },
    evictionRate: { target: '<5%/hour', warning: '>10%/hour', critical: '>20%/hour' },
    quotaExceeded: { target: '0', warning: '>0', critical: '>5/hour' }
  },
  
  // Background Sync
  sync: {
    queueSize: { target: '<50', warning: '>100', critical: '>500' },
    successRate: { target: '>95%', warning: '<90%', critical: '<80%' },
    processingTime: { target: '<30s', warning: '>60s', critical: '>300s' }
  }
};
```

#### Monitoring Implementation

```typescript
class ProductionMonitor {
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Check alerts every minute
    setInterval(() => {
      this.checkAlerts();
    }, 60000);
  }

  private async collectMetrics(): Promise<void> {
    const metrics = await this.gatherAllMetrics();
    
    // Send to monitoring service
    await this.sendToMonitoringService(metrics);
    
    // Store locally for trending
    await this.storeMetricsLocally(metrics);
  }

  private async gatherAllMetrics(): Promise<SystemMetrics> {
    const [cacheStats, storageStats, syncStats, performanceStats] = await Promise.all([
      this.getCacheMetrics(),
      this.getStorageMetrics(),
      this.getSyncMetrics(),
      this.getPerformanceMetrics()
    ]);

    return {
      timestamp: Date.now(),
      cache: cacheStats,
      storage: storageStats,
      sync: syncStats,
      performance: performanceStats
    };
  }

  private async getCacheMetrics(): Promise<CacheMetrics> {
    const cacheService = new ServiceWorkerCacheService();
    const stats = await cacheService.getCacheStats();
    
    return {
      hitRates: stats.hitRates,
      totalRequests: Object.values(stats.hitRates).reduce(
        (sum, cache) => sum + cache.hits + cache.misses, 0
      ),
      averageResponseTime: await this.calculateAverageResponseTime(),
      errorRate: await this.calculateErrorRate()
    };
  }

  private async checkAlerts(): Promise<void> {
    const currentMetrics = await this.gatherAllMetrics();
    
    // Check each metric against thresholds
    for (const [category, metrics] of Object.entries(currentMetrics)) {
      if (category === 'timestamp') continue;
      
      await this.evaluateMetricThresholds(category, metrics);
    }
  }

  private async evaluateMetricThresholds(category: string, metrics: any): Promise<void> {
    const thresholds = CRITICAL_METRICS[category as keyof typeof CRITICAL_METRICS];
    
    for (const [metricName, value] of Object.entries(metrics)) {
      const threshold = thresholds?.[metricName];
      if (!threshold) continue;
      
      const alertLevel = this.determineAlertLevel(value, threshold);
      
      if (alertLevel !== 'normal') {
        await this.alertManager.sendAlert({
          level: alertLevel,
          category,
          metric: metricName,
          value,
          threshold,
          timestamp: Date.now()
        });
      }
    }
  }
}
```

### Logging and Observability

#### Structured Logging

```typescript
class CacheLogger {
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel;
  }

  logCacheOperation(operation: CacheOperation): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'cache-operation',
      operation: operation.type,
      url: operation.url,
      strategy: operation.strategy,
      cacheName: operation.cacheName,
      duration: operation.duration,
      hit: operation.hit,
      size: operation.responseSize,
      tags: operation.tags,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    this.sendLog(logEntry);
  }

  logCacheError(error: CacheError): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      category: 'cache-error',
      error: error.message,
      stack: error.stack,
      url: error.url,
      operation: error.operation,
      cacheName: error.cacheName,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId()
    };

    this.sendLog(logEntry);
  }

  logPerformanceMetric(metric: PerformanceMetric): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'performance-metric',
      metricName: metric.name,
      value: metric.value,
      unit: metric.unit,
      tags: metric.tags,
      sessionId: this.getSessionId()
    };

    this.sendLog(logEntry);
  }

  private sendLog(logEntry: LogEntry): void {
    // Send to logging service
    if (this.shouldLog(logEntry.level)) {
      console.log(JSON.stringify(logEntry));
      
      // Send to external logging service
      this.sendToLoggingService(logEntry);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }
}
```

#### Performance Tracking

```typescript
class PerformanceTracker {
  private measurements: Map<string, PerformanceMeasurement> = new Map();

  startMeasurement(id: string, operation: string): void {
    this.measurements.set(id, {
      operation,
      startTime: performance.now(),
      markers: []
    });
  }

  addMarker(id: string, marker: string): void {
    const measurement = this.measurements.get(id);
    if (measurement) {
      measurement.markers.push({
        name: marker,
        time: performance.now() - measurement.startTime
      });
    }
  }

  endMeasurement(id: string): PerformanceResult | null {
    const measurement = this.measurements.get(id);
    if (!measurement) return null;

    const endTime = performance.now();
    const totalTime = endTime - measurement.startTime;

    const result: PerformanceResult = {
      operation: measurement.operation,
      totalTime,
      markers: measurement.markers,
      timestamp: Date.now()
    };

    this.measurements.delete(id);
    
    // Log performance result
    this.logPerformanceResult(result);
    
    return result;
  }

  private logPerformanceResult(result: PerformanceResult): void {
    const logger = new CacheLogger();
    logger.logPerformanceMetric({
      name: result.operation,
      value: result.totalTime,
      unit: 'ms',
      tags: result.markers.map(m => `${m.name}:${m.time}ms`)
    });
  }
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Cache Not Updating

**Symptoms:**
- Users see stale content
- New posts don't appear
- Changes not reflected immediately

**Diagnostic Steps:**

```typescript
async function diagnoseCacheUpdates() {
  const cacheService = new ServiceWorkerCacheService();
  
  // 1. Check cache metadata
  const metadata = await cacheService.getCacheMetadata('/api/feed');
  console.log('Cache metadata:', {
    age: Date.now() - metadata.timestamp,
    ttl: metadata.ttl,
    tags: metadata.tags,
    lastAccessed: metadata.lastAccessed
  });
  
  // 2. Check network strategy
  const strategy = await cacheService.getStrategyForUrl('/api/feed');
  console.log('Current strategy:', strategy);
  
  // 3. Test network connectivity
  try {
    const networkResponse = await fetch('/api/feed', { cache: 'no-cache' });
    console.log('Network response:', networkResponse.status);
  } catch (error) {
    console.log('Network error:', error);
  }
  
  // 4. Check service worker status
  const registration = await navigator.serviceWorker.getRegistration();
  console.log('Service worker state:', registration?.active?.state);
}
```

**Solutions:**

1. **Force Cache Invalidation:**
```typescript
await cacheService.invalidateByTag('feed');
await cacheService.invalidateByTag('user-content');
```

2. **Adjust TTL Settings:**
```typescript
// Reduce TTL for frequently changing content
await cacheService.updateCacheConfig('feed-cache-v1', {
  maxAgeSeconds: 60 // 1 minute instead of 5
});
```

3. **Switch to More Aggressive Strategy:**
```typescript
// Use NetworkFirst with shorter timeout
await cacheService.updateStrategy('/api/feed', 'NetworkFirst', {
  networkTimeoutSeconds: 1
});
```

#### Issue 2: Storage Quota Exceeded

**Symptoms:**
- Cache operations failing
- "QuotaExceededError" in console
- Degraded performance

**Diagnostic Steps:**

```typescript
async function diagnoseStorageIssues() {
  // 1. Check storage usage
  const estimate = await navigator.storage.estimate();
  console.log('Storage usage:', {
    used: estimate.usage,
    quota: estimate.quota,
    percentage: (estimate.usage! / estimate.quota!) * 100
  });
  
  // 2. Analyze cache sizes
  const cacheNames = await caches.keys();
  const cacheSizes = await Promise.all(
    cacheNames.map(async (name) => {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      return { name, entries: requests.length };
    })
  );
  console.log('Cache sizes:', cacheSizes);
  
  // 3. Check for large entries
  const largeEntries = await findLargeCacheEntries();
  console.log('Large entries:', largeEntries);
}

async function findLargeCacheEntries() {
  const cacheNames = await caches.keys();
  const largeEntries = [];
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const size = parseInt(response.headers.get('content-length') || '0');
        if (size > 1024 * 1024) { // > 1MB
          largeEntries.push({ url: request.url, size, cacheName });
        }
      }
    }
  }
  
  return largeEntries.sort((a, b) => b.size - a.size);
}
```

**Solutions:**

1. **Immediate Cleanup:**
```typescript
// Emergency cleanup
await cacheService.performEmergencyCleanup();

// Remove large entries
const largeEntries = await findLargeCacheEntries();
for (const entry of largeEntries.slice(0, 10)) { // Remove top 10
  await cacheService.removeFromCache(entry.url, entry.cacheName);
}
```

2. **Adjust Cache Limits:**
```typescript
// Reduce cache limits
await cacheService.updateCacheConfig('images-cache-v1', {
  maxEntries: 50, // Reduced from 100
  maxAgeSeconds: 43200 // 12 hours instead of 24
});
```

3. **Implement Proactive Monitoring:**
```typescript
// Monitor storage usage
setInterval(async () => {
  const estimate = await navigator.storage.estimate();
  const usage = (estimate.usage! / estimate.quota!) * 100;
  
  if (usage > 80) {
    await cacheService.performCleanup();
  }
}, 300000); // Every 5 minutes
```

#### Issue 3: Background Sync Failures

**Symptoms:**
- Offline actions not syncing
- Growing queue size
- Sync events not firing

**Diagnostic Steps:**

```typescript
async function diagnoseBackgroundSync() {
  // 1. Check browser support
  const syncSupported = 'serviceWorker' in navigator && 
                       'sync' in window.ServiceWorkerRegistration.prototype;
  console.log('Background sync supported:', syncSupported);
  
  // 2. Check queue status
  const queueStatus = await cacheService.getQueueStatus();
  console.log('Queue status:', queueStatus);
  
  // 3. Check service worker registration
  const registration = await navigator.serviceWorker.getRegistration();
  console.log('SW registration:', registration?.active?.state);
  
  // 4. Test sync registration
  try {
    await registration?.sync.register('test-sync');
    console.log('Sync registration successful');
  } catch (error) {
    console.log('Sync registration failed:', error);
  }
}
```

**Solutions:**

1. **Manual Queue Processing:**
```typescript
// Force process queue
await cacheService.flushOfflineQueue();

// Process specific failed items
const failedItems = await cacheService.getFailedQueueItems();
for (const item of failedItems) {
  await cacheService.retryQueueItem(item.id);
}
```

2. **Implement Fallback Mechanism:**
```typescript
// Fallback for browsers without background sync
if (!syncSupported) {
  window.addEventListener('online', async () => {
    await cacheService.processQueueOnline();
  });
}
```

3. **Adjust Retry Logic:**
```typescript
// More aggressive retry settings
await cacheService.updateSyncConfig({
  maxRetries: 5,
  retryDelay: 1000, // 1 second
  exponentialBackoff: true
});
```

#### Issue 4: Performance Degradation

**Symptoms:**
- Slow page loads
- High memory usage
- Unresponsive UI

**Diagnostic Steps:**

```typescript
async function diagnosePerformance() {
  // 1. Check cache performance
  const stats = await cacheService.getCacheStats();
  console.log('Cache performance:', {
    hitRates: stats.hitRates,
    averageResponseTime: stats.averageResponseTime
  });
  
  // 2. Memory usage analysis
  if ('memory' in performance) {
    console.log('Memory usage:', (performance as any).memory);
  }
  
  // 3. Check for memory leaks
  const cacheCount = (await caches.keys()).length;
  console.log('Active caches:', cacheCount);
  
  // 4. Analyze slow operations
  const slowOperations = await getSlowCacheOperations();
  console.log('Slow operations:', slowOperations);
}
```

**Solutions:**

1. **Optimize Cache Structure:**
```typescript
// Separate caches by content type
const optimizedCacheConfig = {
  'api-cache': { maxEntries: 100, maxAgeSeconds: 300 },
  'image-cache': { maxEntries: 50, maxAgeSeconds: 86400 },
  'static-cache': { maxEntries: 200, maxAgeSeconds: 604800 }
};
```

2. **Implement Cache Warming:**
```typescript
// Preload critical resources
await cacheService.warmCache([
  '/api/user/profile',
  '/api/feed?page=1',
  '/api/communities/joined'
]);
```

3. **Use Streaming for Large Responses:**
```typescript
// Stream large datasets
const stream = await cacheService.getStreamingResponse('/api/large-dataset');
```

### Advanced Troubleshooting

#### Debug Mode

```typescript
class DebugCacheService extends ServiceWorkerCacheService {
  private debugMode = process.env.NODE_ENV === 'development';

  async fetchWithStrategy(url: string, strategy: string, options?: CacheOptions): Promise<Response> {
    if (this.debugMode) {
      console.group(`Cache Operation: ${strategy}`);
      console.log('URL:', url);
      console.log('Options:', options);
      
      const startTime = performance.now();
      const response = await super.fetchWithStrategy(url, strategy, options);
      const endTime = performance.now();
      
      console.log('Duration:', `${endTime - startTime}ms`);
      console.log('Response:', response.status, response.statusText);
      console.groupEnd();
      
      return response;
    }
    
    return super.fetchWithStrategy(url, strategy, options);
  }
}
```

#### Cache Inspector Tool

```typescript
class CacheInspector {
  async inspectCache(cacheName: string): Promise<CacheInspectionResult> {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    const entries = await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request);
        return {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          responseStatus: response?.status,
          responseHeaders: response ? Object.fromEntries(response.headers.entries()) : {},
          size: parseInt(response?.headers.get('content-length') || '0'),
          timestamp: response?.headers.get('date')
        };
      })
    );
    
    return {
      cacheName,
      entryCount: entries.length,
      totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
      entries: entries.sort((a, b) => b.size - a.size)
    };
  }

  async generateCacheReport(): Promise<CacheReport> {
    const cacheNames = await caches.keys();
    const inspections = await Promise.all(
      cacheNames.map(name => this.inspectCache(name))
    );
    
    return {
      timestamp: Date.now(),
      totalCaches: cacheNames.length,
      totalEntries: inspections.reduce((sum, cache) => sum + cache.entryCount, 0),
      totalSize: inspections.reduce((sum, cache) => sum + cache.totalSize, 0),
      caches: inspections
    };
  }
}
```

This comprehensive monitoring and troubleshooting guide provides the tools and procedures needed to maintain the enhanced service worker cache system in production.