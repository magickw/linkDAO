# LinkDAO Platform Troubleshooting Guide

## Overview

This guide addresses common issues encountered in the LinkDAO platform, their root causes, and solutions. Use this guide when experiencing errors in development or production environments.

---

## Table of Contents

1. [CORS Errors (Critical)](#1-cors-errors-critical)
2. [Backend Service Issues (503 Errors)](#2-backend-service-issues-503-errors)
3. [Missing API Endpoints (404 Errors)](#3-missing-api-endpoints-404-errors)
4. [Rate Limiting Issues](#4-rate-limiting-issues)
5. [WebSocket Connection Failures](#5-websocket-connection-failures)
6. [Service Worker and CSP Violations](#6-service-worker-and-csp-violations)
7. [RPC Node Rate Limits](#7-rpc-node-rate-limits)
8. [Authentication Issues](#8-authentication-issues)
9. [Database Connection Problems](#9-database-connection-problems)
10. [Memory Issues on Render](#10-memory-issues-on-render)
11. [External API Failures](#11-external-api-failures)

---

## 1. CORS Errors (Critical)

### Symptoms
```
Error: Not allowed by CORS
Access to fetch at 'https://linkdao-backend.onrender.com/api/*' from origin 'https://www.linkdao.io'
has been blocked by CORS policy
```

### Root Cause
The backend CORS configuration doesn't include the frontend domain in the allowed origins list.

### Solutions

#### Immediate Fix (Environment Variable - No Code Deploy Required)

1. **Add CORS_ORIGIN Environment Variable in Render**:
   - Go to https://dashboard.render.com
   - Select `linkdao-backend` service
   - Navigate to "Environment" tab
   - Add environment variable:
     ```
     Key: CORS_ORIGIN
     Value: https://www.linkdao.io,https://linkdao.io
     ```
   - Save (will auto-restart service)

2. **Verify Fix**:
   ```bash
   curl -H "Origin: https://www.linkdao.io" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://linkdao-backend.onrender.com/health

   # Should return Access-Control-Allow-Origin: https://www.linkdao.io
   ```

#### Permanent Fix (Code Change)

**Status**: ✅ FIXED in `app/backend/src/middleware/corsMiddleware.ts:59-65`

The production CORS configuration now includes:
- `https://www.linkdao.io`
- `https://linkdao.io`
- `https://linkdao-frontend.vercel.app`
- `https://linkdao-frontend-*.vercel.app` (preview deployments)
- `https://*.vercel.app` (all Vercel apps)

#### Common Mistakes

❌ **Don't use**: `origin: '*'` with `credentials: true` (incompatible)
❌ **Don't use**: `www.linkdao.io` (missing `https://`)
❌ **Don't use**: `https://www.linkdao.io/` (trailing slash)

✅ **Do use**: `https://www.linkdao.io` (exact format)

#### Debugging CORS Issues

1. **Check Exact Origin Being Sent**:
   ```javascript
   // In browser console on www.linkdao.io:
   console.log(window.location.origin);
   // Should output: "https://www.linkdao.io"
   ```

2. **Check Backend Logs**:
   ```
   Look for: "CORS origin blocked"
   Will show: origin, allowedOrigins, timestamp
   ```

3. **Test With curl**:
   ```bash
   curl -v -H "Origin: https://www.linkdao.io" \
     https://linkdao-backend.onrender.com/api/feed/enhanced

   # Look for Access-Control-Allow-Origin header in response
   ```

#### See Also
- [CORS Fix Documentation](../technical/CORS_FIX_2025_11_03.md)
- [CORS Middleware Source](../../app/backend/src/middleware/corsMiddleware.ts)

---

## 2. Backend Service Issues (503 Errors)

### Symptoms
```
linkdao-backend.onrender.com/api/profiles/address/:address - 503
linkdao-backend.onrender.com/api/feed/enhanced - 503
linkdao-backend.onrender.com/api/follow/following/:address - 503
```

### Root Causes
1. **Render Free Tier Limitations**: The backend may be spinning down after inactivity
2. **Memory Constraints**: Node process exceeds available memory (512MB on free tier)
3. **Cold Starts**: First request after inactivity takes 30-60 seconds to spin up
4. **Database Connection Pool Exhaustion**: Too many concurrent connections

### Solutions

#### Immediate Fix
Wait 30-60 seconds and retry the request. The service should become available once it finishes starting up.

#### Short-term Solutions
1. **Implement Health Check Pinging**:
   ```javascript
   // Ping the health endpoint every 5 minutes to keep service warm
   setInterval(async () => {
     try {
       await fetch('https://linkdao-backend.onrender.com/health');
     } catch (error) {
       console.log('Health check failed, service may be sleeping');
     }
   }, 5 * 60 * 1000);
   ```

2. **Add Retry Logic in Frontend**:
   ```javascript
   import { fetchWithRetry } from '@/utils/rateLimitHandler';

   const data = await fetchWithRetry(
     'https://linkdao-backend.onrender.com/api/profiles/address/' + address,
     {},
     {
       maxRetries: 3,
       initialDelay: 2000,
       fallbackValue: null
     }
   );
   ```

#### Long-term Solutions
1. **Upgrade Render Plan**: Move from free tier to Starter ($7/month) for:
   - Always-on service (no spin-down)
   - More memory (512MB -> 2GB)
   - Better CPU allocation

2. **Optimize Memory Usage** (already implemented):
   - Database connection pool limited to 3 connections on Render
   - Disabled heavy routes (Firebase, notifications)
   - GC optimization enabled

3. **Implement Caching**:
   - Redis cache for frequently accessed data
   - CDN for static assets
   - API response caching

---

## 2. Missing API Endpoints (404 Errors)

### Symptoms
```
GET /api/follow/following/:address - 404
POST /api/analytics/track/event - 404
GET /api/auth/nonce - 404 (when using GET instead of POST)
```

### Root Causes and Fixes

#### ❌ Issue: `/api/follow` vs `/api/follows`
**Problem**: Frontend calls `/api/follow/following/:address` but backend route is mounted at `/api/follows`

**Status**: ✅ FIXED
- Added route alias in `app/backend/src/index.ts`:
  ```javascript
  app.use('/api/follows', followRoutes);
  app.use('/api/follow', followRoutes); // Backward compatibility
  ```

#### ❌ Issue: Analytics requires authentication for anonymous events
**Problem**: `/api/analytics/track/event` returns 404 because authentication middleware blocks anonymous users

**Status**: ✅ FIXED
- Removed global auth middleware from analytics routes
- Made `/track/event` endpoint public
- Other analytics endpoints remain protected

#### ❌ Issue: Using GET for POST-only endpoints
**Problem**: `/api/auth/nonce` only accepts POST requests

**Solution**: Update frontend code to use POST:
```javascript
const response = await fetch('/api/auth/nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address: walletAddress })
});
```

---

## 3. Rate Limiting Issues

### Symptoms
```
sw.js:184 Rate limit exceeded for: GET:https://linkdao-backend.onrender.com/api/feed/enhanced
sw.js:184 Rate limit exceeded for: GET:https://api.coingecko.com/api/v3/simple/price
sw.js:184 Rate limit exceeded for: GET:https://ip-api.com/json/
```

### Root Causes
1. **Service Worker Aggressive Caching**: SW retries failed requests too frequently
2. **External API Free Tier Limits**: CoinGecko (50 calls/minute), IP-API (45 requests/minute)
3. **Frontend Polling**: Multiple components polling same endpoints

### Solutions

#### 1. Use Rate Limit Handler Utility
**Status**: ✅ IMPLEMENTED

```javascript
import { rateLimitHandler } from '@/utils/rateLimitHandler';

// With automatic retry and fallback
const price = await rateLimitHandler.executeWithRetry(
  async () => {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    return res.json();
  },
  'coingecko-eth-price',
  {
    maxRetries: 3,
    initialDelay: 5000,
    maxDelay: 60000,
    fallbackValue: { ethereum: { usd: 0 } }
  }
);
```

#### 2. Implement Request Deduplication
The rate limit handler automatically deduplicates concurrent requests to the same endpoint.

#### 3. Use Circuit Breaker Pattern
After 5 consecutive failures, the circuit breaker opens and returns fallback values immediately to prevent hammering the API.

#### 4. Configure Service Worker Rate Limits
Update `sw.js` with longer backoff periods:
```javascript
const RATE_LIMIT_WINDOW = 90000; // 90 seconds instead of default
const MAX_REQUESTS_PER_WINDOW = 10; // Reduce from default
```

#### 5. Use Alternative Data Sources
- **CoinGecko Alternative**: Cache prices locally, update every 5 minutes
- **IP Geolocation**: Use CloudFlare's CF-IPCountry header (free, unlimited)
- **Feed Data**: Implement aggressive caching with stale-while-revalidate

---

## 4. WebSocket Connection Failures

### Symptoms
```
WebSocket connection to 'wss://linkdao-backend.onrender.com/socket.io/?EIO=4&transport=websocket' failed:
WebSocket is closed before the connection is established.
```

### Root Causes
1. **Backend Service Sleeping**: WebSocket connections fail when backend is cold starting
2. **Connection Timeout**: Render free tier has strict timeout limits
3. **Multiple Reconnection Attempts**: Frontend tries to reconnect too aggressively

### Solutions

#### 1. Implement Exponential Backoff for Reconnections
```javascript
import { io } from 'socket.io-client';

const socket = io('wss://linkdao-backend.onrender.com', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 5,
  timeout: 20000
});

socket.on('connect_error', (error) => {
  console.log('WebSocket connection error:', error.message);
});
```

#### 2. Graceful Degradation
Don't rely solely on WebSocket for critical features. Implement polling fallback:
```javascript
if (!socket.connected) {
  // Fall back to HTTP polling
  const pollInterval = setInterval(async () => {
    const data = await fetch('/api/messages/new');
    // Update UI
  }, 5000);
}
```

#### 3. Show Connection Status to Users
```javascript
socket.on('connect', () => {
  showNotification('Real-time features connected', 'success');
});

socket.on('disconnect', () => {
  showNotification('Real-time features temporarily unavailable', 'warning');
});
```

---

## 5. Service Worker and CSP Violations

### Symptoms
```
Loading the script 'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js'
violates the following Content Security Policy directive: "script-src 'self' 'unsafe-eval' 'unsafe-inline'
https://vercel.live https://js.stripe.com"
```

### Root Cause
Content Security Policy (CSP) blocks loading Workbox library from Google's CDN.

### Solution
**Status**: ✅ FIXED

Updated `app/frontend/next.config.js` to allow Google Storage:
```javascript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://js.stripe.com https://storage.googleapis.com",
    // ... other directives
  ].join('; ')
}
```

### Alternative Solution: Self-Host Workbox
If you prefer not to use external CDN:

1. Install Workbox locally:
   ```bash
   npm install workbox-sw
   ```

2. Update service worker to use local copy:
   ```javascript
   // sw-enhanced.js
   importScripts('/workbox-sw.js'); // Load from public folder
   ```

3. Copy Workbox to public folder during build:
   ```javascript
   // next.config.js
   webpack: (config, { isServer }) => {
     if (!isServer) {
       // Copy workbox-sw.js to public during build
     }
     return config;
   }
   ```

---

## 6. RPC Node Rate Limits

### Symptoms
```
Failed to fetch balance for LINK: ContractFunctionExecutionError: HTTP request failed.
Status: 429
URL: https://mainnet.base.org
Details: {"code":-32016,"message":"over rate limit"}
```

### Root Causes
1. **Public RPC Overuse**: Using public Base mainnet RPC without API key
2. **Concurrent Requests**: Multiple token balance checks happening simultaneously
3. **No Request Batching**: Each balance check is a separate RPC call

### Solutions

#### 1. Use Dedicated RPC Provider (Recommended)
Sign up for free RPC service with higher limits:

**Alchemy** (300M compute units/month free):
```javascript
const alchemyProvider = new ethers.providers.JsonRpcProvider(
  `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
);
```

**Infura** (100k requests/day free):
```javascript
const infuraProvider = new ethers.providers.JsonRpcProvider(
  `https://base-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`
);
```

**QuickNode** (Free tier available):
```javascript
const quickNodeProvider = new ethers.providers.JsonRpcProvider(
  QUICKNODE_ENDPOINT_URL
);
```

#### 2. Implement RPC Request Batching
```javascript
import { ethers } from 'ethers';

// Batch multiple calls into one RPC request
const multicall = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider);

const calls = tokens.map(token => ({
  target: token.address,
  callData: tokenInterface.encodeFunctionData('balanceOf', [userAddress])
}));

const results = await multicall.aggregate(calls);
```

#### 3. Cache Balance Checks
```javascript
const balanceCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

async function getCachedBalance(tokenAddress, userAddress) {
  const cacheKey = `${tokenAddress}:${userAddress}`;
  const cached = balanceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.balance;
  }

  const balance = await fetchBalance(tokenAddress, userAddress);
  balanceCache.set(cacheKey, { balance, timestamp: Date.now() });
  return balance;
}
```

#### 4. Use Fallback RPC Providers
```javascript
const rpcProviders = [
  'https://mainnet.base.org',
  `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  'https://base.publicnode.com'
];

async function callWithFallback(call) {
  for (const rpcUrl of rpcProviders) {
    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      return await call(provider);
    } catch (error) {
      if (error.code === 429) {
        console.log(`Rate limited on ${rpcUrl}, trying next provider`);
        continue;
      }
      throw error;
    }
  }
  throw new Error('All RPC providers exhausted');
}
```

---

## 7. Authentication Issues

### Symptoms
```
inpage.js:1 MetaMask - RPC Error: User rejected the request.
❌ Auto-login failed: Signature request was rejected by user
Backend unavailable for nonce, using fallback
```

### Root Causes
1. **User Rejection**: User cancels wallet signature request
2. **Nonce Endpoint Down**: Backend unavailable when requesting nonce
3. **Auto-login Spam**: Multiple auto-login attempts

### Solutions

#### 1. Graceful Handling of User Rejection
```javascript
try {
  const signature = await signMessage(message);
  // Proceed with authentication
} catch (error) {
  if (error.code === 4001) {
    // User rejected - don't retry automatically
    showNotification('Please sign the message to continue', 'info');
    return;
  }
  throw error;
}
```

#### 2. Client-Side Nonce Generation for Fallback
**Status**: ✅ IMPLEMENTED

When backend is unavailable, generate nonce client-side:
```javascript
function generateClientNonce() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

async function getNonce(address) {
  try {
    const response = await fetch('/api/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ address })
    });
    return response.json();
  } catch (error) {
    console.log('Backend unavailable, using client-generated nonce');
    return { nonce: generateClientNonce() };
  }
}
```

#### 3. Prevent Auto-Login Spam
**Status**: ✅ IMPLEMENTED

Track auto-login attempts per session:
```javascript
const autoLoginAttempts = new Set();

function shouldAttemptAutoLogin(address) {
  if (autoLoginAttempts.has(address)) {
    console.log('Auto-login already attempted for this address');
    return false;
  }
  autoLoginAttempts.add(address);
  return true;
}
```

---

## 8. Database Connection Problems

### Symptoms
```
Error: remaining connection slots are reserved for non-replication superuser connections
Error: timeout acquiring a connection from the pool
```

### Root Causes
1. **Connection Pool Exhaustion**: Too many concurrent database queries
2. **Long-Running Queries**: Queries holding connections too long
3. **Connection Leaks**: Connections not being released properly

### Solutions

#### 1. Optimize Connection Pool Size
Already implemented in `app/backend/src/index.ts`:
```javascript
const maxConnections = process.env.RENDER ? 3 : 20; // Render free tier limited to 3
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 2. Always Release Connections
```javascript
const client = await pool.connect();
try {
  const result = await client.query('SELECT * FROM users');
  return result.rows;
} finally {
  client.release(); // Always release, even on error
}
```

#### 3. Use Connection Pooling Middleware
Already implemented via Drizzle ORM which manages connections automatically.

#### 4. Monitor Active Connections
```javascript
// Add to health endpoint
app.get('/health/database', async (req, res) => {
  const result = await pool.query(`
    SELECT
      count(*) as total_connections,
      count(*) FILTER (WHERE state = 'active') as active_connections,
      count(*) FILTER (WHERE state = 'idle') as idle_connections
    FROM pg_stat_activity
    WHERE datname = current_database()
  `);

  res.json({
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    },
    database: result.rows[0]
  });
});
```

---

## 9. Memory Issues on Render

### Symptoms
```
JavaScript heap out of memory
FATAL ERROR: Reached heap limit Allocation failed
```

### Root Causes
1. **Memory Leaks**: Objects not being garbage collected
2. **Large Payloads**: Loading too much data into memory at once
3. **Render Free Tier Limit**: Only 512MB available

### Solutions

#### 1. Node Memory Optimization (Implemented)
**Status**: ✅ CONFIGURED

`app/backend/render.yaml`:
```yaml
startCommand: node --max-old-space-size=1536 --expose-gc src/index.production.optimized.js
envVars:
  - key: NODE_OPTIONS
    value: "--max-old-space-size=1536 --optimize-for-size"
```

#### 2. Disable Memory-Heavy Features
Already disabled in production:
- Firebase Admin SDK (saves ~100MB)
- Notification services
- Heavy analytics modules

#### 3. Implement Streaming for Large Data
```javascript
// Instead of loading all data at once
const allUsers = await db.query('SELECT * FROM users'); // ❌ Loads everything

// Stream results
const stream = db.query('SELECT * FROM users').stream(); // ✅ Streams row by row
stream.on('data', (row) => {
  processUser(row);
});
```

#### 4. Use Pagination Everywhere
```javascript
// Add pagination to all list endpoints
router.get('/api/posts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const posts = await db.query(
    'SELECT * FROM posts LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  res.json({
    data: posts.rows,
    pagination: {
      page,
      limit,
      total: posts.rowCount
    }
  });
});
```

#### 5. Monitor Memory Usage
```javascript
app.get('/health/memory', (req, res) => {
  const usage = process.memoryUsage();
  res.json({
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  });
});
```

---

## 10. External API Failures

### Symptoms
```
Failed to load resource: the server responded with a status of 503
SyntaxError: Unexpected token 'C', "Content no"... is not valid JSON
Geolocation service failed, trying next
```

### Root Causes
1. **Service Downtime**: External APIs (IP-API, CoinGecko) temporarily unavailable
2. **Rate Limiting**: Exceeded free tier limits
3. **Network Issues**: Timeout or DNS failures

### Solutions

#### 1. Use Fallback Chain
**Status**: ✅ IMPLEMENTED in rateLimitHandler

```javascript
const geolocationProviders = [
  'https://ip-api.com/json/',
  'https://ipapi.co/json/',
  'https://api.ipify.org/?format=json'
];

async function getGeolocation() {
  for (const provider of geolocationProviders) {
    try {
      const response = await fetchWithTimeout(provider, 5000);
      return await response.json();
    } catch (error) {
      console.log(`${provider} failed, trying next`);
      continue;
    }
  }
  return { country: 'Unknown', ip: 'Unknown' };
}
```

#### 2. Cache External API Responses
```javascript
const priceCache = {
  value: null,
  timestamp: 0,
  ttl: 60000 // 1 minute
};

async function getCryptoPrice() {
  if (priceCache.value && Date.now() - priceCache.timestamp < priceCache.ttl) {
    return priceCache.value;
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    priceCache.value = data;
    priceCache.timestamp = Date.now();
    return data;
  } catch (error) {
    // Return stale cache on error
    return priceCache.value || { ethereum: { usd: 0 } };
  }
}
```

#### 3. Implement Timeout for External Calls
```javascript
function fetchWithTimeout(url, timeout = 5000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}
```

---

## Quick Reference: Common Error Codes

| Status Code | Meaning | Common Cause | Solution |
|-------------|---------|--------------|----------|
| 404 | Not Found | Wrong endpoint URL or route not mounted | Check API route configuration |
| 429 | Too Many Requests | Rate limit exceeded | Implement backoff, use API key |
| 503 | Service Unavailable | Backend sleeping or overloaded | Wait and retry, upgrade hosting plan |
| 500 | Internal Server Error | Uncaught exception in backend | Check server logs |
| 401 | Unauthorized | Missing or invalid auth token | Re-authenticate |
| 403 | Forbidden | Insufficient permissions | Check user roles |

---

## Monitoring and Debugging Tools

### 1. Check Backend Health
```bash
curl https://linkdao-backend.onrender.com/health
```

### 2. View Circuit Breaker Status
```javascript
import { rateLimitHandler } from '@/utils/rateLimitHandler';
console.log(rateLimitHandler.getCircuitBreakerStatus());
```

### 3. Monitor Rate Limits in Browser Console
```
// Service Worker rate limit logs
// Look for: "Rate limit exceeded for: ..."
// Filter console by "Rate limit"
```

### 4. Backend Logs on Render
1. Go to https://dashboard.render.com
2. Select `linkdao-backend` service
3. Click "Logs" tab
4. Look for errors, memory usage, and connection issues

---

## Prevention Best Practices

1. **Always Use Error Handling**: Wrap API calls in try/catch with fallbacks
2. **Implement Caching**: Cache frequently accessed data
3. **Add Loading States**: Show users when data is loading or unavailable
4. **Monitor Metrics**: Track error rates, response times, and resource usage
5. **Use Rate Limit Utilities**: Use provided rateLimitHandler for all external APIs
6. **Test Error Scenarios**: Test with backend down, rate limits, etc.
7. **Graceful Degradation**: App should work (with reduced functionality) when services fail
8. **Log Everything**: Comprehensive logging helps identify issues quickly

---

## Getting Help

If you encounter an issue not covered in this guide:

1. **Check Server Logs**: Always check backend logs on Render first
2. **Review Browser Console**: Look for error messages and network failures
3. **Check Service Status**: Verify external services (CoinGecko, Base RPC) are operational
4. **GitHub Issues**: Search existing issues or create new one with:
   - Error message
   - Steps to reproduce
   - Browser/environment details
   - Relevant logs

---

**Last Updated**: November 2, 2025
**Guide Version**: 1.0.0
**Applies to**: LinkDAO Platform v2.1.0
