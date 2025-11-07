# Emergency Backend Recovery Plan

**Status:** 🔴 CRITICAL - Backend Running but Failing  
**Date:** November 7, 2025  
**Memory Usage:** 89.6% (Critical)  
**Error Rate:** 39.84% (Critical)

## Immediate Actions (Next 5 Minutes)

### 1. Disable Heavy Features Immediately

Create emergency environment variables in Render:

```bash
# In Render Dashboard → Environment Variables
DISABLE_WEBSOCKETS=true
DISABLE_HEAVY_ANALYTICS=true
DISABLE_MONITORING=true
EMERGENCY_MODE=true
MEMORY_LIMIT=1800
```

### 2. Reduce Database Connection Pool

The logs show `DB Pool Status: Total=0` which is wrong. Update these env vars:

```bash
DB_POOL_MAX=3
DB_POOL_MIN=1
DB_IDLE_TIMEOUT=10000
DB_CONNECTION_TIMEOUT=2000
```

### 3. Disable Cache Middleware Temporarily

The cache middleware is causing errors. Add:

```bash
DISABLE_CACHE_MIDDLEWARE=true
```

### 4. Force Garbage Collection More Aggressively

```bash
NODE_OPTIONS="--max-old-space-size=1800 --gc-interval=100"
```

## Root Causes Identified

### 1. Memory Leak in Cache System
```
Cache middleware error for response:GET:/health
```
The caching system is consuming memory and not releasing it properly.

### 2. Database Connection Pool Misconfiguration
```
DB Pool Status: Total=0, Idle=0, Waiting=0
```
No connections are being established or they're being closed immediately.

### 3. Performance Monitoring Overhead
```
Performance degradation detected: 4 critical alerts in the last 5 minutes
```
The monitoring system itself is consuming too many resources.

### 4. WebSocket Connection Attempts
Even though WebSockets are failing, the system keeps trying to establish connections, consuming memory.

## Code Fixes Needed

### Fix 1: Emergency Mode in index.ts

Add this at the top of `app/backend/src/index.ts` after environment loading:

```typescript
// EMERGENCY MODE - Disable heavy features
if (process.env.EMERGENCY_MODE === 'true' || memoryUsage > 1800) {
  console.log('🚨 EMERGENCY MODE ACTIVATED');
  process.env.DISABLE_WEBSOCKETS = 'true';
  process.env.DISABLE_HEAVY_ANALYTICS = 'true';
  process.env.DISABLE_MONITORING = 'true';
  process.env.DISABLE_CACHE_MIDDLEWARE = 'true';
}
```

### Fix 2: Conditional Cache Middleware

In the middleware section:

```typescript
// Only use cache middleware if not in emergency mode
if (process.env.DISABLE_CACHE_MIDDLEWARE !== 'true') {
  app.use(cachingMiddleware);
} else {
  console.log('⚠️ Cache middleware disabled (emergency mode)');
}
```

### Fix 3: Database Pool Configuration

```typescript
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.EMERGENCY_MODE === 'true' ? 2 : maxConnections,
  min: process.env.EMERGENCY_MODE === 'true' ? 1 : minConnections,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 2000,
  // Add connection validation
  allowExitOnIdle: false, // Changed from true
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
});

// Add connection error recovery
dbPool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  // Don't exit, just log
});
```

### Fix 4: Disable WebSocket in Emergency Mode

```typescript
// Only initialize WebSocket if not in emergency mode
if (process.env.DISABLE_WEBSOCKETS !== 'true' && process.env.EMERGENCY_MODE !== 'true') {
  initializeWebSocket(httpServer);
  initializeAdminWebSocket(httpServer);
  initializeSellerWebSocket(httpServer);
} else {
  console.log('⚠️ WebSocket disabled (emergency mode)');
}
```

### Fix 5: Aggressive Memory Management

```typescript
// Force GC every 30 seconds in emergency mode
if (process.env.EMERGENCY_MODE === 'true' && global.gc) {
  setInterval(() => {
    const before = process.memoryUsage().heapUsed / 1024 / 1024;
    global.gc();
    const after = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`🧹 Emergency GC: freed ${(before - after).toFixed(1)}MB`);
  }, 30000);
}
```

## Deployment Steps

### Step 1: Update Environment Variables in Render

1. Go to Render Dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add these variables:
   ```
   EMERGENCY_MODE=true
   DISABLE_WEBSOCKETS=true
   DISABLE_HEAVY_ANALYTICS=true
   DISABLE_CACHE_MIDDLEWARE=true
   DB_POOL_MAX=3
   DB_POOL_MIN=1
   NODE_OPTIONS=--max-old-space-size=1800
   ```
5. Click "Save Changes"

### Step 2: Trigger Manual Deploy

1. Go to "Manual Deploy" tab
2. Click "Clear build cache & deploy"
3. Wait for deployment (5-10 minutes)

### Step 3: Monitor Recovery

Watch the logs for:
```bash
✅ Emergency mode activated
✅ Cache middleware disabled
✅ WebSocket disabled
✅ Database pool: 3 max connections
```

### Step 4: Verify Health

```bash
curl https://api.linkdao.io/health
```

Expected response:
```json
{
  "status": "healthy",
  "memory": {
    "heapUsed": "<150MB",
    "heapTotal": "<180MB"
  }
}
```

## Expected Improvements

After implementing emergency mode:

1. **Memory Usage:** Should drop to 60-70%
2. **Error Rate:** Should drop below 5%
3. **Response Time:** Should improve to <500ms
4. **GC Frequency:** Should reduce to every 60 seconds

## Monitoring During Recovery

### Check Every 5 Minutes

```bash
# Health check
curl https://api.linkdao.io/health

# Memory status
curl https://api.linkdao.io/health/detailed

# CORS status
curl https://api.linkdao.io/api/cors/status
```

### Watch Render Logs For

✅ Good signs:
- Memory usage below 80%
- Error rate below 10%
- GC freeing >5MB per cycle
- Database connections established

❌ Bad signs:
- Memory still above 85%
- Error rate above 20%
- GC freeing <1MB per cycle
- Database pool still at 0

## Rollback Plan

If emergency mode doesn't help within 30 minutes:

### Option 1: Upgrade Render Plan

Upgrade to **Standard Plus (4GB RAM)** - $85/month

### Option 2: Split Services

1. Move WebSocket to separate service
2. Move heavy analytics to separate service
3. Keep only core API on current service

### Option 3: Use Render's Auto-Scaling

Enable auto-scaling with:
- Min instances: 1
- Max instances: 3
- Scale up at 80% memory

## Long-Term Fixes (After Recovery)

### 1. Implement Proper Caching Strategy

```typescript
// Use Redis for caching instead of in-memory
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
});
```

### 2. Database Connection Pooling

```typescript
// Use PgBouncer or similar connection pooler
// This reduces connection overhead significantly
```

### 3. Implement Circuit Breaker

```typescript
// Already exists in your codebase
// Ensure it's applied to all external services
```

### 4. Add Memory Leak Detection

```typescript
import memwatch from '@airbnb/node-memwatch';

memwatch.on('leak', (info) => {
  console.error('Memory leak detected:', info);
  // Send alert
});
```

### 5. Optimize Heavy Routes

```typescript
// Add streaming for large responses
// Implement pagination everywhere
// Use database indexes
```

## Success Criteria

Backend is considered recovered when:

- ✅ Memory usage stable at <75%
- ✅ Error rate <5%
- ✅ Response time <1000ms for 95th percentile
- ✅ No OOM kills for 24 hours
- ✅ Database connections stable
- ✅ Health check returns 200 consistently

## Contact Information

- **Render Support:** https://render.com/support
- **Database Provider:** Check your DATABASE_URL provider
- **Redis Provider:** Check your REDIS_URL provider

## Timeline

- **0-5 min:** Add emergency environment variables
- **5-15 min:** Deploy with emergency mode
- **15-30 min:** Monitor recovery
- **30-60 min:** Verify stability
- **1-24 hours:** Monitor for regressions
- **24+ hours:** Plan long-term fixes

---

**Status:** Ready to implement  
**Priority:** CRITICAL  
**Estimated Recovery Time:** 30 minutes
