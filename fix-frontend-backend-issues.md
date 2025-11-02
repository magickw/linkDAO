# Frontend/Backend Issues Fix Guide

## Issues Identified

1. **Rate Limiting**: Frontend making too many requests (503 errors, rate limit exceeded)
2. **Backend Resource Constraints**: Render free tier limitations causing service unavailability
3. **Request Deduplication**: Multiple components making duplicate requests
4. **WebSocket Connection Failures**: Real-time features failing
5. **External API Rate Limits**: CoinGecko, Base RPC, etc. hitting limits

## Immediate Fixes

### 1. Fix Request Manager Rate Limiting

The request manager needs better rate limiting and caching:

```typescript
// Update app/frontend/src/services/requestManager.ts
class RequestManager {
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 15; // Reduced from 30
  private readonly DEFAULT_TIMEOUT = 20000; // Increased to 20s
  private readonly DEFAULT_RETRIES = 2; // Increased retries
  private readonly DEFAULT_RETRY_DELAY = 3000; // Longer delay

  // Add request caching
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  async request<T>(url: string, options: RequestInit = {}, config: RequestConfig = {}): Promise<T> {
    // Check cache first
    const cacheKey = this.getRequestKey(url, options);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log('Returning cached response:', cacheKey);
      return cached.data;
    }
    
    // ... rest of request logic
    
    // Cache successful responses
    if (result && !error) {
      const ttl = this.getTTL(url);
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl
      });
    }
    
    return result;
  }
  
  private getTTL(url: string): number {
    if (url.includes('/api/feed')) return 30000; // 30 seconds
    if (url.includes('/api/communities')) return 60000; // 1 minute
    if (url.includes('/api/profiles')) return 120000; // 2 minutes
    if (url.includes('/api/governance')) return 180000; // 3 minutes
    return 60000; // Default 1 minute
  }
}
```

### 2. Fix Service Worker Rate Limiting

Update the service worker to be less aggressive:

```javascript
// Update app/frontend/public/sw.js
const MAX_REQUESTS_PER_MINUTE = 10; // Reduced from 20
const RATE_LIMIT_WINDOW = 60000;
const BACKOFF_MULTIPLIER = 3; // Increased backoff
const MAX_BACKOFF_TIME = 600000; // 10 minutes max backoff

// Add intelligent request batching
const requestBatcher = {
  batches: new Map(),
  batchTimeout: 1000, // 1 second batch window
  
  addRequest(url, resolve, reject) {
    const endpoint = new URL(url).pathname.split('/').slice(0, 3).join('/');
    
    if (!this.batches.has(endpoint)) {
      this.batches.set(endpoint, {
        requests: [],
        timeout: setTimeout(() => this.processBatch(endpoint), this.batchTimeout)
      });
    }
    
    this.batches.get(endpoint).requests.push({ url, resolve, reject });
  },
  
  processBatch(endpoint) {
    const batch = this.batches.get(endpoint);
    if (!batch) return;
    
    // Process only the first request, share result with others
    const firstRequest = batch.requests[0];
    
    fetch(firstRequest.url)
      .then(response => response.clone())
      .then(response => {
        // Share response with all requests in batch
        batch.requests.forEach(req => req.resolve(response.clone()));
      })
      .catch(error => {
        batch.requests.forEach(req => req.reject(error));
      });
    
    this.batches.delete(endpoint);
  }
};
```

### 3. Backend Memory Optimization

Update the backend to handle resource constraints better:

```typescript
// Update app/backend/src/index.ts
// Reduce database pool size for Render free tier
const maxConnections = process.env.RENDER ? 2 : 20; // Even smaller for Render
const minConnections = process.env.RENDER ? 1 : 5;

// Add connection pool monitoring
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: maxConnections,
  min: minConnections,
  idleTimeoutMillis: 20000, // Reduced from 30s
  connectionTimeoutMillis: 5000, // Increased timeout
  acquireTimeoutMillis: 10000, // Add acquire timeout
});

// Add pool monitoring
dbPool.on('error', (err) => {
  console.error('Database pool error:', err);
});

dbPool.on('connect', () => {
  console.log('Database connection established');
});

// Disable memory-intensive features on Render
if (process.env.RENDER) {
  console.log('🚀 Running on Render - Memory optimizations enabled');
  
  // Disable WebSocket
  // Disable comprehensive monitoring
  // Disable cache warming
  // Disable order event listener
  
  // Add memory monitoring
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    if (memUsedMB > 400) { // Render free tier has 512MB limit
      console.warn(`High memory usage: ${memUsedMB.toFixed(2)}MB`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('Forced garbage collection');
      }
    }
  }, 30000);
}
```

### 4. Add Circuit Breaker Pattern

Create a circuit breaker to handle service unavailability:

```typescript
// Create app/frontend/src/services/circuitBreaker.ts
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000, // 1 minute
    private monitoringPeriod = 10000 // 10 seconds
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn('Circuit breaker opened due to failures');
    }
  }
}

export const apiCircuitBreaker = new CircuitBreaker();
```

### 5. Implement Request Coalescing

Update components to reduce duplicate requests:

```typescript
// Create app/frontend/src/hooks/useRequestCoalescing.ts
import { useRef, useCallback } from 'react';

export function useRequestCoalescing<T>(
  requestFn: () => Promise<T>,
  key: string,
  ttl: number = 30000
) {
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  const pendingRef = useRef<Map<string, Promise<T>>>(new Map());
  
  const coalescedRequest = useCallback(async (): Promise<T> => {
    // Check cache
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // Check pending requests
    const pending = pendingRef.current.get(key);
    if (pending) {
      return pending;
    }
    
    // Create new request
    const promise = requestFn().then(data => {
      cacheRef.current.set(key, { data, timestamp: Date.now() });
      pendingRef.current.delete(key);
      return data;
    }).catch(error => {
      pendingRef.current.delete(key);
      throw error;
    });
    
    pendingRef.current.set(key, promise);
    return promise;
  }, [requestFn, key, ttl]);
  
  return coalescedRequest;
}
```

### 6. Add Graceful Degradation

Update components to handle service unavailability:

```typescript
// Update components to use fallback data
const CommunityList = () => {
  const [communities, setCommunities] = useState([]);
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);
  
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const data = await apiCircuitBreaker.execute(() => 
          requestManager.request('/api/communities')
        );
        setCommunities(data);
        setIsServiceAvailable(true);
      } catch (error) {
        console.warn('Communities service unavailable, using fallback');
        setIsServiceAvailable(false);
        
        // Use cached/fallback data
        const fallbackCommunities = [
          { id: 'linkdao', name: 'LinkDAO', members: 1000 },
          { id: 'defi', name: 'DeFi Community', members: 500 }
        ];
        setCommunities(fallbackCommunities);
      }
    };
    
    fetchCommunities();
  }, []);
  
  return (
    <div>
      {!isServiceAvailable && (
        <div className="bg-yellow-100 p-2 text-sm">
          ⚠️ Some features may be limited due to high server load
        </div>
      )}
      {/* Render communities */}
    </div>
  );
};
```

## Implementation Steps

1. **Update Request Manager** - Add caching and reduce rate limits
2. **Update Service Worker** - Implement request batching
3. **Backend Optimization** - Reduce memory usage on Render
4. **Add Circuit Breaker** - Handle service unavailability gracefully
5. **Update Components** - Add fallback data and error handling
6. **Monitor and Adjust** - Watch logs and adjust limits as needed

## Testing

1. Open browser dev tools and monitor network requests
2. Check for duplicate requests to same endpoints
3. Verify rate limiting is working
4. Test offline/service unavailable scenarios
5. Monitor backend memory usage

## Expected Results

- Reduced 503 errors from rate limiting
- Better handling of service unavailability
- Fewer duplicate requests
- Improved user experience during outages
- More stable backend performance on Render free tier