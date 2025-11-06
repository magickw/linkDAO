# CORS Connectivity Fixes - Troubleshooting Guide

## Overview

This guide provides solutions for common connectivity issues encountered in the LinkDAO application, focusing on CORS configuration, rate limiting, WebSocket connections, and backend resource constraints.

## Common Issues and Solutions

### 1. CORS Policy Errors

#### Symptoms
- Browser console shows "blocked by CORS policy" errors
- OPTIONS preflight requests failing with 403/404 status
- Cross-origin requests being rejected

#### Diagnosis
```bash
# Check CORS headers in browser developer tools
# Look for these headers in response:
# - Access-Control-Allow-Origin
# - Access-Control-Allow-Methods
# - Access-Control-Allow-Headers
# - Access-Control-Allow-Credentials

# Test CORS configuration
curl -H "Origin: https://linkdao.io" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://api.linkdao.io/api/marketplace/listings
```

#### Solutions

**Solution 1: Update CORS Configuration**
```typescript
// Check app/backend/src/middleware/enhancedCorsMiddleware.ts
// Ensure your domain is in allowedOrigins array

const environmentOrigins = {
  development: [
    'http://localhost:3000',
    'https://localhost:3000'
  ],
  production: [
    'https://linkdao.io',
    'https://www.linkdao.io',
    /^https:\/\/.*\.vercel\.app$/
  ]
};
```

**Solution 2: Dynamic Origin Validation**
```typescript
// For Vercel preview deployments, ensure wildcard patterns work
origin: (origin, callback) => {
  if (!origin || this.validateOrigin(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
  }
}
```

**Solution 3: Clear Origin Cache**
```javascript
// If origin validation is cached incorrectly
// Restart the backend service or clear Redis cache
redis-cli FLUSHDB
```

### 2. Rate Limiting Issues

#### Symptoms
- 429 "Too Many Requests" errors
- Requests being blocked after short usage
- Users unable to create posts/communities

#### Diagnosis
```bash
# Check rate limit headers
curl -I https://api.linkdao.io/api/posts
# Look for:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 5
# X-RateLimit-Reset: 1640995200

# Monitor rate limiting in logs
tail -f app/backend/logs/rate-limiting.log
```

#### Solutions

**Solution 1: Adjust Rate Limits**
```typescript
// Update app/frontend/src/services/requestManager.ts
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

// Reduce request frequency
const rateLimitConfig = {
  requestsPerMinute: 10, // Reduced from 30
  burstLimit: 5
};
```

**Solution 2: Implement Request Coalescing**
```typescript
// Enable request deduplication
const requestKey = `${method}_${url}_${JSON.stringify(params)}`;
if (this.pendingRequests.has(requestKey)) {
  return this.pendingRequests.get(requestKey);
}
```

**Solution 3: Use Circuit Breaker**
```typescript
// Check circuit breaker status
if (this.circuitBreaker.isOpen()) {
  // Use cached data or show graceful degradation
  return this.getCachedResponse(requestKey);
}
```

### 3. WebSocket Connection Failures

#### Symptoms
- Real-time features not working
- Connection drops frequently
- Authentication failures on WebSocket

#### Diagnosis
```bash
# Test WebSocket connection
wscat -c wss://api.linkdao.io/socket.io/?transport=websocket

# Check WebSocket logs
tail -f app/backend/logs/websocket.log

# Monitor connection status in browser
console.log(socket.connected);
console.log(socket.disconnected);
```

#### Solutions

**Solution 1: Fallback to Polling**
```typescript
// Update WebSocket configuration
const socket = io(wsUrl, {
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: false
});
```

**Solution 2: Implement Reconnection Logic**
```typescript
// Add exponential backoff reconnection
const reconnectDelay = Math.min(
  1000 * Math.pow(2, reconnectAttempts),
  30000
);

setTimeout(() => {
  this.connect();
}, reconnectDelay);
```

**Solution 3: Disable on Resource Constraints**
```typescript
// Check memory usage before enabling WebSocket
if (process.memoryUsage().heapUsed > 400 * 1024 * 1024) {
  console.log('Disabling WebSocket due to memory constraints');
  return;
}
```

### 4. Backend Service Unavailability (503 Errors)

#### Symptoms
- 503 Service Unavailable errors
- Backend crashes or becomes unresponsive
- Memory-related errors on Render

#### Diagnosis
```bash
# Check backend health
curl https://api.linkdao.io/health

# Monitor memory usage
node -e "console.log(process.memoryUsage())"

# Check Render logs
render logs --service=linkdao-backend --tail
```

#### Solutions

**Solution 1: Optimize Memory Usage**
```typescript
// Update app/backend/src/index.ts
const dbConfig = {
  max: 2, // Reduced connection pool for Render
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

// Enable garbage collection
if (global.gc) {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 400 * 1024 * 1024) {
      global.gc();
    }
  }, 60000);
}
```

**Solution 2: Implement Circuit Breaker**
```typescript
// Use circuit breaker to prevent cascading failures
if (this.circuitBreaker.isOpen()) {
  return {
    success: false,
    error: 'Service temporarily unavailable',
    cached: true,
    data: this.getCachedData()
  };
}
```

**Solution 3: Graceful Degradation**
```typescript
// Show cached content when backend is down
try {
  const response = await api.getPosts();
  return response.data;
} catch (error) {
  console.warn('Backend unavailable, using cached data');
  return this.getCachedPosts();
}
```

### 5. Authentication and Session Issues

#### Symptoms
- Wallet signature verification failures
- Session timeouts during network interruptions
- Authentication loops

#### Diagnosis
```bash
# Test authentication endpoint
curl -X POST https://api.linkdao.io/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...", "signature":"0x..."}'

# Check session storage
localStorage.getItem('linkdao_session');
sessionStorage.getItem('wallet_address');
```

#### Solutions

**Solution 1: Implement Session Persistence**
```typescript
// Store session data in localStorage
const sessionData = {
  walletAddress,
  signature,
  timestamp: Date.now(),
  expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
};
localStorage.setItem('linkdao_session', JSON.stringify(sessionData));
```

**Solution 2: Add Retry Logic for Auth**
```typescript
// Retry authentication on network errors
const authenticateWithRetry = async (maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.authenticate();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.sleep(1000 * Math.pow(2, i));
    }
  }
};
```

**Solution 3: Handle Network Interruptions**
```typescript
// Queue authentication requests during outages
if (!navigator.onLine) {
  this.authQueue.push({ walletAddress, signature });
  return { success: false, queued: true };
}
```

## Debugging Tools and Commands

### Frontend Debugging

```javascript
// Enable debug mode in browser console
localStorage.setItem('debug', 'linkdao:*');

// Check request manager status
window.linkdaoDebug = {
  circuitBreaker: requestManager.circuitBreaker.getMetrics(),
  requestQueue: requestManager.getQueueStatus(),
  cacheStatus: cacheService.getStatus()
};

// Monitor WebSocket connection
socket.on('connect', () => console.log('WebSocket connected'));
socket.on('disconnect', (reason) => console.log('WebSocket disconnected:', reason));
socket.on('error', (error) => console.error('WebSocket error:', error));
```

### Backend Debugging

```bash
# Enable debug logging
export DEBUG=linkdao:*
export LOG_LEVEL=debug

# Monitor API requests
tail -f app/backend/logs/api-requests.log | grep ERROR

# Check database connections
node -e "
const db = require('./src/db');
db.query('SELECT 1').then(() => console.log('DB OK')).catch(console.error);
"

# Memory monitoring
node --expose-gc app/backend/src/index.js
```

### Network Debugging

```bash
# Test connectivity to backend
ping api.linkdao.io
nslookup api.linkdao.io

# Check SSL certificate
openssl s_client -connect api.linkdao.io:443 -servername api.linkdao.io

# Test specific endpoints
curl -v https://api.linkdao.io/health
curl -v https://api.linkdao.io/api/posts
```

## Performance Monitoring

### Key Metrics to Monitor

1. **Response Times**
   - API endpoint response times
   - WebSocket connection latency
   - Database query performance

2. **Error Rates**
   - 5xx server errors
   - 4xx client errors
   - WebSocket connection failures

3. **Resource Usage**
   - Memory consumption
   - CPU utilization
   - Database connection pool usage

4. **User Experience**
   - Time to first meaningful paint
   - Time to interactive
   - Offline functionality usage

### Monitoring Commands

```bash
# Check API performance
curl -w "@curl-format.txt" -o /dev/null -s https://api.linkdao.io/api/posts

# Monitor memory usage
watch -n 5 'node -e "console.log(process.memoryUsage())"'

# Database performance
EXPLAIN ANALYZE SELECT * FROM posts WHERE community_id = $1;
```

## Emergency Procedures

### Backend Service Recovery

1. **Immediate Response**
   ```bash
   # Restart backend service
   render services restart linkdao-backend
   
   # Check service status
   render services list
   ```

2. **Memory Issues**
   ```bash
   # Force garbage collection
   kill -USR2 $(pgrep node)
   
   # Restart with memory monitoring
   node --max-old-space-size=512 src/index.js
   ```

3. **Database Issues**
   ```bash
   # Check database connections
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Kill long-running queries
   psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';"
   ```

### Frontend Recovery

1. **Clear Cache and Storage**
   ```javascript
   // Clear all caches
   localStorage.clear();
   sessionStorage.clear();
   
   // Unregister service worker
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(registration => registration.unregister());
   });
   ```

2. **Force Refresh**
   ```javascript
   // Hard refresh
   window.location.reload(true);
   
   // Clear cache and reload
   if ('caches' in window) {
     caches.keys().then(names => {
       names.forEach(name => caches.delete(name));
     });
   }
   ```

## Contact and Escalation

### Development Team Contacts
- **Backend Issues**: backend-team@linkdao.io
- **Frontend Issues**: frontend-team@linkdao.io
- **Infrastructure**: devops@linkdao.io

### Escalation Matrix
1. **Level 1**: Self-service using this guide
2. **Level 2**: Contact development team
3. **Level 3**: Emergency escalation to senior engineers
4. **Level 4**: Executive escalation for business-critical issues

### Emergency Hotline
- **Phone**: +1-XXX-XXX-XXXX
- **Slack**: #emergency-response
- **Email**: emergency@linkdao.io