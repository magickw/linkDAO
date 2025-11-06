# Developer Debug Guide - CORS Connectivity Fixes

## Overview

This guide provides comprehensive debugging tools and techniques for developers working with the CORS connectivity fixes implementation. It covers monitoring tools, debugging techniques, and performance analysis methods.

## Debug Environment Setup

### 1. Development Environment Configuration

```bash
# Clone and setup development environment
git clone https://github.com/linkdao/linkdao-app.git
cd linkdao-app

# Install dependencies
npm install

# Setup environment variables for debugging
cp .env.example .env.development
```

**Debug Environment Variables:**
```bash
# .env.development
NODE_ENV=development
DEBUG=linkdao:*
LOG_LEVEL=debug
ENABLE_DEBUG_TOOLS=true
ENABLE_REQUEST_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true

# CORS Debug Settings
CORS_DEBUG=true
CORS_LOG_REQUESTS=true
CORS_CACHE_DEBUG=true

# Rate Limiting Debug
RATE_LIMIT_DEBUG=true
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# WebSocket Debug
WS_DEBUG=true
WS_LOG_CONNECTIONS=true
WS_LOG_MESSAGES=false

# Circuit Breaker Debug
CIRCUIT_BREAKER_DEBUG=true
CIRCUIT_BREAKER_LOG_STATE_CHANGES=true

# Database Debug
DB_DEBUG=true
DB_LOG_QUERIES=true
DB_LOG_SLOW_QUERIES=true
```

### 2. Debug Tools Installation

```bash
# Install debugging tools
npm install --save-dev \
  debug \
  winston \
  morgan \
  clinic \
  autocannon \
  0x \
  node-inspect

# Install browser debugging extensions
# - React Developer Tools
# - Redux DevTools
# - Network Monitor
```

## Frontend Debugging Tools

### 1. Request Manager Debug Interface

```javascript
// Add to browser console for debugging
window.linkdaoDebug = {
  // Circuit breaker status
  getCircuitBreakerStatus() {
    return window.requestManager?.circuitBreaker?.getMetrics();
  },
  
  // Request queue status
  getRequestQueueStatus() {
    return {
      pending: window.requestManager?.pendingRequests?.size || 0,
      coalesced: window.requestManager?.coalescedRequests?.size || 0,
      cached: window.requestManager?.cache?.size || 0
    };
  },
  
  // Force circuit breaker state
  openCircuitBreaker() {
    window.requestManager?.circuitBreaker?.forceOpen();
  },
  
  closeCircuitBreaker() {
    window.requestManager?.circuitBreaker?.forceClose();
  },
  
  // Clear caches
  clearRequestCache() {
    window.requestManager?.cache?.clear();
  },
  
  // Get performance metrics
  getPerformanceMetrics() {
    return window.performanceMonitor?.getMetrics();
  }
};

// Enable debug logging
localStorage.setItem('debug', 'linkdao:*');
```

### 2. WebSocket Debug Tools

```javascript
// WebSocket connection debugger
class WebSocketDebugger {
  constructor(socket) {
    this.socket = socket;
    this.connectionLog = [];
    this.messageLog = [];
    this.setupLogging();
  }
  
  setupLogging() {
    this.socket.on('connect', () => {
      this.log('connect', { timestamp: Date.now() });
    });
    
    this.socket.on('disconnect', (reason) => {
      this.log('disconnect', { reason, timestamp: Date.now() });
    });
    
    this.socket.on('error', (error) => {
      this.log('error', { error: error.message, timestamp: Date.now() });
    });
    
    // Log all messages
    const originalEmit = this.socket.emit;
    this.socket.emit = (...args) => {
      this.logMessage('outgoing', args);
      return originalEmit.apply(this.socket, args);
    };
    
    const originalOn = this.socket.on;
    this.socket.on = (event, handler) => {
      return originalOn.call(this.socket, event, (...args) => {
        this.logMessage('incoming', [event, ...args]);
        return handler(...args);
      });
    };
  }
  
  log(event, data) {
    this.connectionLog.push({ event, data });
    console.log(`[WebSocket] ${event}:`, data);
  }
  
  logMessage(direction, args) {
    this.messageLog.push({
      direction,
      event: args[0],
      data: args.slice(1),
      timestamp: Date.now()
    });
    
    if (localStorage.getItem('ws-debug') === 'true') {
      console.log(`[WebSocket ${direction}]`, args);
    }
  }
  
  getConnectionHistory() {
    return this.connectionLog;
  }
  
  getMessageHistory() {
    return this.messageLog;
  }
  
  exportLogs() {
    return {
      connections: this.connectionLog,
      messages: this.messageLog,
      exportTime: Date.now()
    };
  }
}

// Usage
const wsDebugger = new WebSocketDebugger(socket);
window.wsDebugger = wsDebugger;
```

### 3. Performance Monitoring Dashboard

```javascript
// Performance monitoring component
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      errors: [],
      cacheHits: 0,
      cacheMisses: 0,
      circuitBreakerTrips: 0
    };
    
    this.startMonitoring();
  }
  
  startMonitoring() {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        
        this.recordRequest({
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          success: response.ok,
          timestamp: Date.now()
        });
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        
        this.recordError({
          url,
          method: args[1]?.method || 'GET',
          error: error.message,
          duration,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  }
  
  recordRequest(data) {
    this.metrics.requests.push(data);
    
    // Keep only last 100 requests
    if (this.metrics.requests.length > 100) {
      this.metrics.requests.shift();
    }
  }
  
  recordError(data) {
    this.metrics.errors.push(data);
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }
  }
  
  getMetrics() {
    const requests = this.metrics.requests;
    const errors = this.metrics.errors;
    
    return {
      totalRequests: requests.length,
      totalErrors: errors.length,
      errorRate: requests.length > 0 ? (errors.length / requests.length) * 100 : 0,
      averageResponseTime: requests.length > 0 
        ? requests.reduce((sum, req) => sum + req.duration, 0) / requests.length 
        : 0,
      cacheHitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100
        : 0,
      circuitBreakerTrips: this.metrics.circuitBreakerTrips,
      recentRequests: requests.slice(-10),
      recentErrors: errors.slice(-5)
    };
  }
  
  exportMetrics() {
    return {
      ...this.metrics,
      exportTime: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }
}

// Initialize performance monitor
window.performanceMonitor = new PerformanceMonitor();
```

## Backend Debugging Tools

### 1. Enhanced Logging System

```typescript
// app/backend/src/utils/debugLogger.ts
import winston from 'winston';
import { Request, Response } from 'express';

class DebugLogger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
            })
          )
        }),
        new winston.transports.File({
          filename: 'logs/debug.log',
          level: 'debug'
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        })
      ]
    });
  }
  
  logRequest(req: Request, res: Response, duration: number) {
    this.logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      origin: req.get('Origin'),
      referer: req.get('Referer')
    });
  }
  
  logCorsRequest(req: Request, allowed: boolean, reason?: string) {
    this.logger.debug('CORS request', {
      origin: req.get('Origin'),
      method: req.method,
      url: req.url,
      allowed,
      reason,
      headers: req.headers
    });
  }
  
  logCircuitBreakerEvent(service: string, event: string, metrics: any) {
    this.logger.info('Circuit breaker event', {
      service,
      event,
      metrics
    });
  }
  
  logRateLimitEvent(req: Request, limited: boolean, remaining: number) {
    this.logger.debug('Rate limit check', {
      ip: req.ip,
      url: req.url,
      limited,
      remaining,
      userAgent: req.get('User-Agent')
    });
  }
  
  logWebSocketEvent(event: string, socketId: string, data?: any) {
    this.logger.debug('WebSocket event', {
      event,
      socketId,
      data: data ? JSON.stringify(data) : undefined
    });
  }
  
  logDatabaseQuery(query: string, duration: number, error?: Error) {
    if (error) {
      this.logger.error('Database query failed', {
        query,
        duration,
        error: error.message,
        stack: error.stack
      });
    } else if (duration > 1000) {
      this.logger.warn('Slow database query', {
        query,
        duration
      });
    } else {
      this.logger.debug('Database query', {
        query,
        duration
      });
    }
  }
}

export const debugLogger = new DebugLogger();
```

### 2. Request Monitoring Middleware

```typescript
// app/backend/src/middleware/debugMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { debugLogger } from '../utils/debugLogger';

export const requestMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Log request start
  debugLogger.logger.debug('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin')
  });
  
  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - start;
    debugLogger.logRequest(req, res, duration);
    
    // Alert on slow requests
    if (duration > 5000) {
      debugLogger.logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        duration,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

export const corsDebugMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  
  if (origin && process.env.CORS_DEBUG === 'true') {
    debugLogger.logCorsRequest(req, true, 'Debug mode - allowing all origins');
  }
  
  next();
};
```

### 3. Database Query Monitor

```typescript
// app/backend/src/utils/databaseMonitor.ts
import { Pool } from 'pg';
import { debugLogger } from './debugLogger';

export class DatabaseMonitor {
  private pool: Pool;
  private queryCount = 0;
  private slowQueries: Array<{ query: string; duration: number; timestamp: number }> = [];
  
  constructor(pool: Pool) {
    this.pool = pool;
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    const originalQuery = this.pool.query.bind(this.pool);
    
    this.pool.query = async (text: any, params?: any) => {
      const start = Date.now();
      this.queryCount++;
      
      try {
        const result = await originalQuery(text, params);
        const duration = Date.now() - start;
        
        debugLogger.logDatabaseQuery(
          typeof text === 'string' ? text : text.text,
          duration
        );
        
        // Track slow queries
        if (duration > 1000) {
          this.slowQueries.push({
            query: typeof text === 'string' ? text : text.text,
            duration,
            timestamp: Date.now()
          });
          
          // Keep only last 20 slow queries
          if (this.slowQueries.length > 20) {
            this.slowQueries.shift();
          }
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        debugLogger.logDatabaseQuery(
          typeof text === 'string' ? text : text.text,
          duration,
          error as Error
        );
        throw error;
      }
    };
  }
  
  getMetrics() {
    return {
      totalQueries: this.queryCount,
      slowQueries: this.slowQueries,
      poolStats: {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      }
    };
  }
}
```

## Debugging Specific Issues

### 1. CORS Issues Debug

```bash
# Test CORS configuration
curl -v -H "Origin: https://linkdao.io" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3001/api/posts

# Expected response headers:
# Access-Control-Allow-Origin: https://linkdao.io
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
# Access-Control-Allow-Headers: Content-Type, Authorization, ...
# Access-Control-Allow-Credentials: true
```

**Debug Script:**
```javascript
// Frontend CORS debug script
async function debugCorsIssue() {
  const testOrigins = [
    'http://localhost:3000',
    'https://linkdao.io',
    'https://malicious-site.com'
  ];
  
  for (const origin of testOrigins) {
    try {
      const response = await fetch('/api/posts', {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      console.log(`Origin ${origin}:`, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      console.error(`Origin ${origin} failed:`, error.message);
    }
  }
}

debugCorsIssue();
```

### 2. Rate Limiting Debug

```typescript
// Rate limiting debug utility
class RateLimitDebugger {
  static async testRateLimit(endpoint: string, requestCount: number = 20) {
    const results = [];
    
    for (let i = 0; i < requestCount; i++) {
      const start = Date.now();
      
      try {
        const response = await fetch(endpoint);
        const duration = Date.now() - start;
        
        results.push({
          request: i + 1,
          status: response.status,
          duration,
          rateLimitHeaders: {
            limit: response.headers.get('X-RateLimit-Limit'),
            remaining: response.headers.get('X-RateLimit-Remaining'),
            reset: response.headers.get('X-RateLimit-Reset')
          }
        });
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          request: i + 1,
          error: error.message,
          duration: Date.now() - start
        });
      }
    }
    
    return results;
  }
  
  static analyzeResults(results: any[]) {
    const successful = results.filter(r => r.status === 200);
    const rateLimited = results.filter(r => r.status === 429);
    const errors = results.filter(r => r.error);
    
    console.log('Rate Limit Test Results:', {
      total: results.length,
      successful: successful.length,
      rateLimited: rateLimited.length,
      errors: errors.length,
      averageResponseTime: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    });
    
    return { successful, rateLimited, errors };
  }
}

// Usage
RateLimitDebugger.testRateLimit('/api/posts', 15)
  .then(RateLimitDebugger.analyzeResults);
```

### 3. WebSocket Connection Debug

```javascript
// WebSocket connection tester
class WebSocketTester {
  constructor(url) {
    this.url = url;
    this.connectionAttempts = [];
    this.messages = [];
  }
  
  async testConnection(attempts = 5) {
    for (let i = 0; i < attempts; i++) {
      await this.singleConnectionTest(i + 1);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return this.getResults();
  }
  
  singleConnectionTest(attemptNumber) {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = io(this.url, {
        transports: ['websocket', 'polling'],
        timeout: 5000
      });
      
      const attempt = {
        number: attemptNumber,
        startTime: start,
        events: []
      };
      
      socket.on('connect', () => {
        attempt.events.push({
          event: 'connect',
          timestamp: Date.now(),
          duration: Date.now() - start
        });
      });
      
      socket.on('disconnect', (reason) => {
        attempt.events.push({
          event: 'disconnect',
          reason,
          timestamp: Date.now()
        });
      });
      
      socket.on('connect_error', (error) => {
        attempt.events.push({
          event: 'connect_error',
          error: error.message,
          timestamp: Date.now()
        });
      });
      
      // Test message sending
      socket.on('connect', () => {
        socket.emit('test_message', { test: true });
      });
      
      socket.on('test_response', (data) => {
        attempt.events.push({
          event: 'test_response',
          data,
          timestamp: Date.now()
        });
      });
      
      setTimeout(() => {
        socket.disconnect();
        this.connectionAttempts.push(attempt);
        resolve(attempt);
      }, 3000);
    });
  }
  
  getResults() {
    const successful = this.connectionAttempts.filter(a => 
      a.events.some(e => e.event === 'connect')
    );
    
    const failed = this.connectionAttempts.filter(a => 
      a.events.some(e => e.event === 'connect_error')
    );
    
    return {
      total: this.connectionAttempts.length,
      successful: successful.length,
      failed: failed.length,
      successRate: (successful.length / this.connectionAttempts.length) * 100,
      averageConnectionTime: successful.reduce((sum, a) => {
        const connectEvent = a.events.find(e => e.event === 'connect');
        return sum + (connectEvent ? connectEvent.duration : 0);
      }, 0) / successful.length,
      attempts: this.connectionAttempts
    };
  }
}

// Usage
const wsTester = new WebSocketTester('http://localhost:3001');
wsTester.testConnection(10).then(results => {
  console.log('WebSocket Test Results:', results);
});
```

## Performance Analysis Tools

### 1. Memory Usage Monitor

```javascript
// Memory usage monitoring
class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.isMonitoring = false;
  }
  
  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      this.samples.push({
        timestamp: Date.now(),
        ...memUsage,
        heapUsedMB: memUsage.heapUsed / 1024 / 1024,
        heapTotalMB: memUsage.heapTotal / 1024 / 1024,
        externalMB: memUsage.external / 1024 / 1024
      });
      
      // Keep only last 100 samples
      if (this.samples.length > 100) {
        this.samples.shift();
      }
      
      // Alert on high memory usage
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 400) {
        console.warn(`High memory usage: ${heapUsedMB.toFixed(2)}MB`);
      }
    }, intervalMs);
  }
  
  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.isMonitoring = false;
    }
  }
  
  getStats() {
    if (this.samples.length === 0) return null;
    
    const latest = this.samples[this.samples.length - 1];
    const heapUsages = this.samples.map(s => s.heapUsedMB);
    
    return {
      current: latest,
      average: heapUsages.reduce((sum, val) => sum + val, 0) / heapUsages.length,
      max: Math.max(...heapUsages),
      min: Math.min(...heapUsages),
      trend: this.calculateTrend(),
      samples: this.samples.length
    };
  }
  
  calculateTrend() {
    if (this.samples.length < 10) return 'insufficient_data';
    
    const recent = this.samples.slice(-10);
    const older = this.samples.slice(-20, -10);
    
    const recentAvg = recent.reduce((sum, s) => sum + s.heapUsedMB, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.heapUsedMB, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 10) return 'increasing';
    if (diff < -10) return 'decreasing';
    return 'stable';
  }
  
  exportData() {
    return {
      samples: this.samples,
      stats: this.getStats(),
      exportTime: Date.now()
    };
  }
}

// Usage
const memoryMonitor = new MemoryMonitor();
memoryMonitor.startMonitoring(5000);

// Export data after some time
setTimeout(() => {
  console.log('Memory Stats:', memoryMonitor.getStats());
}, 60000);
```

### 2. Request Performance Profiler

```bash
# Backend performance profiling
# Install clinic.js for advanced profiling
npm install -g clinic

# Profile CPU usage
clinic doctor -- node src/index.js

# Profile memory usage
clinic heapprofiler -- node src/index.js

# Profile event loop delay
clinic bubbleprof -- node src/index.js

# Load testing with autocannon
autocannon -c 10 -d 30 http://localhost:3001/api/posts
```

### 3. Database Performance Monitor

```sql
-- PostgreSQL performance queries

-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;

-- Check connection usage
SELECT count(*) as connections,
       state,
       application_name
FROM pg_stat_activity
GROUP BY state, application_name;

-- Check table sizes
SELECT schemaname,tablename,
       pg_size_pretty(size) as size,
       pg_size_pretty(total_size) as total_size
FROM (
  SELECT schemaname,tablename,
         pg_relation_size(schemaname||'.'||tablename) as size,
         pg_total_relation_size(schemaname||'.'||tablename) as total_size
  FROM pg_tables
  WHERE schemaname = 'public'
) t
ORDER BY total_size DESC;
```

## Automated Debug Scripts

### 1. Health Check Script

```bash
#!/bin/bash
# scripts/debug-health-check.sh

echo "=== LinkDAO Health Check ==="
echo "Timestamp: $(date)"
echo

# Check backend health
echo "1. Backend Health Check"
curl -s http://localhost:3001/health | jq '.' || echo "Backend health check failed"
echo

# Check database connection
echo "2. Database Connection"
psql $DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1 && echo "Database: OK" || echo "Database: FAILED"
echo

# Check memory usage
echo "3. Memory Usage"
node -e "
const mem = process.memoryUsage();
console.log('Heap Used:', Math.round(mem.heapUsed / 1024 / 1024), 'MB');
console.log('Heap Total:', Math.round(mem.heapTotal / 1024 / 1024), 'MB');
console.log('External:', Math.round(mem.external / 1024 / 1024), 'MB');
"
echo

# Check CORS configuration
echo "4. CORS Configuration Test"
curl -s -H "Origin: https://linkdao.io" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3001/api/posts \
     -I | grep -i "access-control" || echo "CORS test failed"
echo

# Check WebSocket
echo "5. WebSocket Test"
timeout 5 wscat -c ws://localhost:3001/socket.io/?transport=websocket > /dev/null 2>&1 && echo "WebSocket: OK" || echo "WebSocket: FAILED"
echo

echo "=== Health Check Complete ==="
```

### 2. Performance Benchmark Script

```javascript
// scripts/performance-benchmark.js
const autocannon = require('autocannon');
const { performance } = require('perf_hooks');

async function runBenchmarks() {
  const endpoints = [
    { url: 'http://localhost:3001/health', name: 'Health Check' },
    { url: 'http://localhost:3001/api/posts', name: 'Posts API' },
    { url: 'http://localhost:3001/api/communities', name: 'Communities API' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`\nBenchmarking ${endpoint.name}...`);
    
    const result = await autocannon({
      url: endpoint.url,
      connections: 5,
      duration: 10,
      headers: {
        'Origin': 'https://linkdao.io'
      }
    });
    
    results.push({
      name: endpoint.name,
      url: endpoint.url,
      requests: result.requests,
      latency: result.latency,
      throughput: result.throughput,
      errors: result.errors
    });
    
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latency avg: ${result.latency.average}ms`);
    console.log(`Errors: ${result.errors}`);
  }
  
  // Generate report
  console.log('\n=== Benchmark Summary ===');
  results.forEach(result => {
    console.log(`${result.name}:`);
    console.log(`  Requests/sec: ${result.requests.average}`);
    console.log(`  Latency: ${result.latency.average}ms`);
    console.log(`  Errors: ${result.errors}`);
  });
  
  return results;
}

if (require.main === module) {
  runBenchmarks().catch(console.error);
}

module.exports = { runBenchmarks };
```

## Debug Data Export and Analysis

### 1. Debug Data Collector

```javascript
// Debug data collection utility
class DebugDataCollector {
  static async collectAllData() {
    const data = {
      timestamp: Date.now(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV
      },
      frontend: {},
      backend: {},
      network: {}
    };
    
    // Collect frontend data
    if (typeof window !== 'undefined') {
      data.frontend = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        performance: window.performanceMonitor?.getMetrics(),
        circuitBreaker: window.linkdaoDebug?.getCircuitBreakerStatus(),
        requestQueue: window.linkdaoDebug?.getRequestQueueStatus(),
        webSocket: window.wsDebugger?.exportLogs(),
        localStorage: this.getLocalStorageData(),
        sessionStorage: this.getSessionStorageData()
      };
    }
    
    // Collect backend data (if running on server)
    if (typeof process !== 'undefined') {
      data.backend = {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage(),
        version: process.env.npm_package_version,
        environment: process.env.NODE_ENV
      };
    }
    
    return data;
  }
  
  static getLocalStorageData() {
    if (typeof localStorage === 'undefined') return {};
    
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('linkdao_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    return data;
  }
  
  static getSessionStorageData() {
    if (typeof sessionStorage === 'undefined') return {};
    
    const data = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('linkdao_')) {
        data[key] = sessionStorage.getItem(key);
      }
    }
    return data;
  }
  
  static exportToFile(data, filename = 'linkdao-debug-data.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

// Usage
DebugDataCollector.collectAllData().then(data => {
  console.log('Debug data collected:', data);
  DebugDataCollector.exportToFile(data);
});
```

## Integration with Development Workflow

### 1. Pre-commit Debug Checks

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit debug checks..."

# Check for debug statements
if grep -r "console.log\|debugger" app/frontend/src app/backend/src --exclude-dir=node_modules; then
  echo "Warning: Debug statements found in code"
  read -p "Continue with commit? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run health check
npm run health-check || {
  echo "Health check failed"
  exit 1
}

echo "Pre-commit checks passed"
```

### 2. CI/CD Debug Integration

```yaml
# .github/workflows/debug-checks.yml
name: Debug and Performance Checks

on: [push, pull_request]

jobs:
  debug-checks:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run health checks
      run: npm run health-check
      
    - name: Run performance benchmarks
      run: npm run benchmark
      
    - name: Check for debug statements
      run: |
        if grep -r "console.log\|debugger" app/ --exclude-dir=node_modules; then
          echo "Debug statements found - please remove before merging"
          exit 1
        fi
```

This comprehensive developer debug guide provides all the tools and techniques needed to effectively debug and monitor the CORS connectivity fixes implementation. The tools cover both frontend and backend debugging, performance monitoring, and automated testing procedures.