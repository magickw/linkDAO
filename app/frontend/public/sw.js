
// CSP bypass for development
if (typeof self !== 'undefined' && self.location && self.location.hostname === 'localhost') {
  // Allow all connections in development
  self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('localhost:10000')) {
      event.respondWith(
        fetch(event.request, {
          mode: 'cors',
          credentials: 'include'
        }).catch(() => {
          return new Response('Backend unavailable', { status: 503 });
        })
      );
    }
  });
}

// Service Worker Version - increment to force update
const SW_VERSION = '2.0.2';

const CACHE_NAME = 'linkdao-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const IMAGE_CACHE = 'images-v1';
const API_CACHE = 'api-v1';
const OFFLINE_QUEUE_CACHE = 'offline-queue-v1';

// Request tracking and circuit breaker
const pendingRequests = new Map();
const failedRequests = new Map();
const requestCounts = new Map();
const circuitBreakerStates = new Map();
const backgroundUpdateTimestamps = new Map();

// Background update throttle configuration (in ms)
const BACKGROUND_UPDATE_THROTTLE = {
  comments: 30000,      // 30 seconds for comments
  feed: 60000,          // 1 minute for feed
  default: 15000        // 15 seconds for other APIs
};

// Health check configuration
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_ENDPOINTS = [
  '/health',
  '/api/health',
  '/api/status'
];


// Service endpoints and their fallbacks
const SERVICE_ENDPOINTS = {
  api: [
    'https://api.linkdao.io',
    'https://api-backup.linkdao.io',
    'https://api-fallback.linkdao.io'
  ],
  websocket: [
    'wss://api.linkdao.io/socket.io/',
    'wss://ws.linkdao.io/socket.io/',
    'wss://realtime.linkdao.io/socket.io/'
  ],
  geolocation: [
    // Removed ip-api.com due to rate limiting (403 errors)
    // Using more reliable alternatives
    'https://ipapi.co/json/',
    'https://api.ipify.org/?format=json',
    'https://ipinfo.io/json'
  ],
  marketplace: [
    'https://api.linkdao.io',
    'https://api-backup.linkdao.io',
    'https://api-fallback.linkdao.io'
  ]
};
// Development mode detection
const isDevelopment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = isDevelopment ? 1000 : 400; // Increased to 400 for production to better handle marketplace APIs
const BACKOFF_MULTIPLIER = isDevelopment ? 1.2 : 1.5; // Lower backoff in development and production
const MAX_BACKOFF_TIME = isDevelopment ? 5000 : 30000; // Reduced max backoff to 30s in production

// Circuit breaker configuration for service worker
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 60 seconds as specified
  halfOpenMaxCalls: 3
};

// Service-specific circuit breaker configurations
const SERVICE_CIRCUIT_BREAKER_CONFIGS = {
  default: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    halfOpenMaxCalls: 3
  },
  marketplace: {
    failureThreshold: 10, // Increase threshold to reduce false positives
    recoveryTimeout: 5000, // Faster recovery for marketplace
    halfOpenMaxCalls: 1
  }
};

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/icon-192x192.png',  // Icons are in public root, not /icons/ subdirectory
  '/icon-512x512.png',
  // Add other critical static assets
];

// Performance optimization assets
const PERFORMANCE_ASSETS = [
  '/api/performance/metrics',
  '/api/performance/optimize',
  '/api/analytics/track/event',
  '/api/content-performance'
];

// API endpoints to cache with TTL values - aligned with requirements
const CACHEABLE_APIS = {
  '/api/feed': { ttl: 30000, priority: 'high', staleTTL: 300000 }, // 30s fresh, 5min stale
  '/api/communities': { ttl: 60000, priority: 'high', staleTTL: 600000 }, // 60s fresh, 10min stale
  '/api/profiles': { ttl: 120000, priority: 'medium', staleTTL: 900000 }, // 2min fresh, 15min stale
  '/api/posts': { ttl: 45000, priority: 'high', staleTTL: 300000 }, // 45s fresh, 5min stale
  '/api/users': { ttl: 300000, priority: 'low', staleTTL: 1800000 }, // 5min fresh, 30min stale
  '/api/reputation': { ttl: 180000, priority: 'medium', staleTTL: 900000 }, // 3min fresh, 15min stale
  '/api/tips': { ttl: 60000, priority: 'medium', staleTTL: 300000 }, // 1min fresh, 5min stale
  '/api/follow': { ttl: 120000, priority: 'medium', staleTTL: 600000 }, // 2min fresh, 10min stale
  '/api/search': { ttl: 300000, priority: 'low', staleTTL: 1800000 }, // 5min fresh, 30min stale
  '/api/marketplace/listings': { ttl: 30000, priority: 'high', staleTTL: 60000, skipCacheOnError: true }, // 30s fresh, 1min stale for listings
  '/api/marketplace/listings/categories': { ttl: 300000, priority: 'medium', staleTTL: 600000, skipCacheOnError: true }, // 5min fresh, 10min stale for categories
  '/api/marketplace/seller': { ttl: 30000, priority: 'high', staleTTL: 60000, skipCacheOnError: true }, // 30s fresh, 1min stale for seller data
  '/api/governance': { ttl: 180000, priority: 'medium', staleTTL: 900000 }, // 3min fresh, 15min stale
  '/api/messaging': { ttl: 30000, priority: 'high', staleTTL: 120000 }, // 30s fresh, 2min stale
  '/api/chat/conversations': { ttl: 30000, priority: 'high', staleTTL: 120000, skipCacheOnError: true }, // 30s fresh, 2min stale
  '/api/conversations': { ttl: 30000, priority: 'high', staleTTL: 120000, skipCacheOnError: true }, // 30s fresh, 2min stale
  '/api/messages/conversations': { ttl: 30000, priority: 'high', staleTTL: 120000, skipCacheOnError: true }, // 30s fresh, 2min stale
  '/api/messaging/conversations': { ttl: 30000, priority: 'high', staleTTL: 120000, skipCacheOnError: true }, // 30s fresh, 2min stale
  '/api/cart': { ttl: 30000, priority: 'medium', staleTTL: 120000 } // 30s fresh, 2min stale
};

// Critical API responses that should be cached aggressively
const CRITICAL_APIS = ['/api/feed', '/api/communities', '/api/posts'];

// Action queue for offline operations
const offlineActionQueue = [];
const maxQueueSize = 100;

// Install event - cache static assets with graceful failure handling
self.addEventListener('install', (event) => {
  console.log(`Service Worker v${SW_VERSION} installing...`);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(async (cache) => {
        console.log('Caching static assets');

        // Verify resource availability before caching
        const verifiedAssets = await verifyResourceAvailability(STATIC_ASSETS);

        if (verifiedAssets.length === 0) {
          console.warn('No static assets available for caching');
          return;
        }

        // Use graceful cache.addAll with individual fallbacks
        return gracefulCacheAddAll(cache, verifiedAssets);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error);
        // Continue installation even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${SW_VERSION} activating...`);

  // CRITICAL: Reset all circuit breaker states on activation to clear stuck states
  circuitBreakerStates.clear();
  failedRequests.clear();
  requestCounts.clear();
  pendingRequests.clear();
  console.log('SW: Reset all circuit breaker and request tracking states');

  event.waitUntil(
    Promise.all([
      // Clean up old cache versions
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== IMAGE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // EXTRA: Clear any cached responses for navigation routes that might be causing 404 issues
      caches.open(DYNAMIC_CACHE).then(cache => {
        return Promise.all([
          cache.delete('/').catch(() => {
            // Ignore errors if '/' is not in cache
          }),
          cache.delete('/profile').catch(() => {
            // Ignore errors if '/profile' is not in cache
          }),
          cache.delete('/communities').catch(() => {
            // Ignore errors if '/communities' is not in cache
          }),
          cache.delete('/marketplace').catch(() => {
            // Ignore errors if '/marketplace' is not in cache
          }),
          cache.delete('/governance').catch(() => {
            // Ignore errors if '/governance' is not in cache
          }),
          cache.delete('/dashboard').catch(() => {
            // Ignore errors if '/dashboard' is not in cache
          }),
          cache.delete('/settings').catch(() => {
            // Ignore errors if '/settings' is not in cache
          }),
          cache.delete('/notifications').catch(() => {
            // Ignore errors if '/notifications' is not in cache
          })
        ]).catch(() => {
          // Ignore errors if cache operations fail
        });
      }).catch(() => {
        // Ignore errors if cache doesn't exist yet
      }),
      // Clear marketplace API cache to prevent serving stale 503 responses
      caches.open(DYNAMIC_CACHE).then(cache => {
        return Promise.all([
          cache.delete(request => request.url.includes('/api/marketplace/listings')).catch(() => {}),
          cache.delete(request => request.url.includes('/api/marketplace/listings/categories')).catch(() => {}),
          cache.delete(request => request.url.includes('/api/marketplace/seller')).catch(() => {})
        ]).catch(() => {});
      }).catch(() => {}),
      // Clear ALL API cache entries to start fresh
      caches.open(API_CACHE).then(cache => {
        return cache.keys().then(keys => {
          console.log('SW: Clearing', keys.length, 'cached API responses');
          return Promise.all(keys.map(key => cache.delete(key)));
        });
      }).catch(() => {})
    ]).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL FIX: Bypass ALL navigation requests immediately to prevent blocking
  // This prevents wallet-connected users from being unable to navigate
  if (isEnhancedNavigation(request)) {
    console.log('SW: Bypassing navigation request:', request.url);
    // CRITICAL: Always respond with fetch for navigation requests to prevent frameId errors
    event.respondWith(fetch(request).catch(error => {
      console.error('Navigation request failed:', error);
      // Even on failure, we must respond to prevent service worker errors
      return new Response('Navigation failed', { status: 500 });
    }));
    return; // Early return to bypass service worker completely
  }

  // Skip Socket.IO requests - let them go directly to the server
  // Socket.IO needs to handle its own transport mechanism (websocket/polling)
  if (url.pathname.startsWith('/socket.io/')) {
    event.respondWith(fetch(request)); // MUST call event.respondWith
    return; // Don't intercept - let Socket.IO handle it
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request)); // MUST call event.respondWith
    return;
  }

  // Skip requests that look like wallet addresses (0x followed by hex chars)
  // These are invalid URLs that should not be fetched
  if (/^\/0x[a-fA-F0-9]{40}$/.test(url.pathname)) {
    console.warn('Skipping invalid wallet address URL:', url.pathname);
    event.respondWith(new Response('Not Found', { status: 404 }));
    return;
  }

  // Handle placehold.co requests with local placeholders
  if (url.hostname === 'placehold.co') {
    event.respondWith(handlePlaceholderRequest(url));
    return;
  }

  // Bypass Google Fonts (opaque responses) to avoid noisy errors in dev
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 204 })));
    return;
  }

  // Handle different types of requests with different strategies
  if (isStaticAsset(request)) {
    console.log('SW: Handling static asset request:', request.url);
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(request)) {
    console.log('SW: Handling image request:', request.url);
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isAPI(request)) {
    // Check for bypass header - if present, fetch directly without caching
    if (request.headers.get('X-Service-Worker-Bypass') === 'true') {
      console.log('SW: Bypassing API request due to bypass header:', request.url);
      event.respondWith(
        (async () => {
          // Try fetch with retry logic
          const maxRetries = 2;
          let lastError = null;

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              if (attempt > 0) {
                console.log(`SW: Retry attempt ${attempt} for:`, request.url);
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              }

              const response = await fetch(request.url, {
                method: request.method,
                headers: request.headers,
                mode: 'cors',
                credentials: 'include'
              });

              if (response.ok || response.status < 500) {
                return response;
              }

              lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            } catch (error) {
              console.error(`SW: Fetch attempt ${attempt} failed:`, error.message, error.name);
              lastError = error;
            }
          }

          // All retries failed
          console.error('SW: All fetch attempts failed:', lastError?.message, lastError?.name, lastError?.stack);
          return new Response(JSON.stringify({
            success: false,
            error: 'Network error',
            details: lastError?.message || 'Unknown error',
            errorType: lastError?.name || 'Error',
            timestamp: new Date().toISOString(),
            url: request.url,
            retriesAttempted: maxRetries
          }), {
            status: 500,
            statusText: 'Network Error',
            headers: { 'Content-Type': 'application/json' }
          });
        })()
      );
      return;
    } else {
      console.log('SW: Handling API request:', request.url);
      event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    }
  } else {
    console.log('SW: Handling dynamic request:', request.url);
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Clean up old background update timestamps every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 300000; // 5 minutes

  for (const [key, timestamp] of backgroundUpdateTimestamps.entries()) {
    if (now - timestamp > maxAge) {
      backgroundUpdateTimestamps.delete(key);
    }
  }
}, 300000);



// Cache first strategy - for static assets with enhanced error handling
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Update cache in background (non-blocking)
      updateCache(request, cacheName).catch(error => {
        console.warn('Background cache update failed:', error);
      });
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      try {
        // Check if the request URL scheme is supported for caching
        if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
          const responseToCache = networkResponse.clone();
          await cache.put(request, responseToCache);
        }
      } catch (cacheError) {
        console.warn('Failed to cache static asset:', cacheError);
        // Continue serving the response even if caching fails
      }
    } else {
      // Check if this endpoint has skipCacheOnError enabled and if the response is an error
      const cacheConfig = getAPICacheConfig(request);
      if (cacheConfig.skipCacheOnError) {
        console.log('Not caching error response for endpoint with skipCacheOnError:', request.url, networkResponse.status);
      } else {
        // For static assets that return error status (like 404), don't cache the error response
        // This prevents caching error responses that cause persistent 404s
        console.warn('Request failed, not caching error response:', request.url, networkResponse.status);
      }
      return networkResponse;
    }

    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);

    // Try fallback mechanisms
    try {
      return await handleCacheFailure(request, error);
    } catch (fallbackError) {
      console.error('All fallback mechanisms failed:', fallbackError);
      return new Response('Service temporarily unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
}

// Network first strategy with enhanced circuit breaker and graceful degradation
async function networkFirst(request, cacheName) {
  const requestKey = `${request.method}:${request.url}`;
  const now = Date.now();
  const cacheConfig = getAPICacheConfig(request);
  const serviceKey = getServiceKey(request);

  // Check circuit breaker state for this service
  const circuitState = getCircuitBreakerState(serviceKey);
  if (circuitState === 'OPEN') {
    console.log('Circuit breaker is OPEN for service:', serviceKey);
    return await getCachedResponseWithFallback(request, cacheName, cacheConfig);
  }

  // Check if we have fresh cached data first for critical APIs
  if (isCriticalAPI(request)) {
    const cachedResponse = await getCachedResponseWithTTL(request, cacheName, cacheConfig.ttl);
    if (cachedResponse) {
      // Update cache in background for critical APIs
      updateCacheInBackground(request, cacheName, requestKey);
      return cachedResponse;
    }
  }

  // Rate limiting check
  if (!checkRateLimit(requestKey, now)) {
    // Only log rate limit exceeded once per endpoint per minute
    const rateLimitLogKey = `rate_limit_log:${requestKey}`;
    if (!requestCounts.has(rateLimitLogKey)) {
      console.log('Rate limit exceeded for:', requestKey);
      requestCounts.set(rateLimitLogKey, { count: 1, windowStart: now });
    }
    return await getCachedResponseWithFallback(request, cacheName, cacheConfig);
  }

  // Check if request recently failed with exponential backoff
  const failureInfo = failedRequests.get(requestKey);
  if (failureInfo) {
    // Special handling for community requests - shorter backoff times
    const url = new URL(request.url);
    const isCommunityRequest = url.pathname.includes('/api/communities');
    // Apply reduced base backoff time for cart API requests
    const isCartRequest = url.pathname.includes('/api/cart');
    // Apply reduced base backoff time for seller dashboard requests
    const isSellerRequest = url.pathname.includes('/api/marketplace/seller') || url.pathname.includes('/dashboard/');
    // Apply moderate backoff time for general marketplace requests
    const isMarketplaceRequest = url.pathname.includes('/api/marketplace') && !isSellerRequest;
    let baseBackoffTime;

    if (isCommunityRequest) {
      baseBackoffTime = 3000; // 3s for communities
    } else if (isCartRequest) {
      baseBackoffTime = 2000; // 2s for cart API to enable faster recovery
    } else if (isSellerRequest) {
      baseBackoffTime = 3000; // 3s for seller dashboard to enable faster recovery
    } else if (isMarketplaceRequest) {
      baseBackoffTime = 5000; // 5s for marketplace requests to enable moderate recovery
    } else {
      baseBackoffTime = 10000; // 10s for others
    }

    const backoffTime = Math.min(
      baseBackoffTime * Math.pow(BACKOFF_MULTIPLIER, failureInfo.attempts - 1),
      MAX_BACKOFF_TIME
    );

    if (now - failureInfo.lastFailure < backoffTime) {
      // Only log backing off once per unique backoff period
      const backoffLogKey = `backoff_log:${requestKey}:${failureInfo.lastFailure}`;
      if (!requestCounts.has(backoffLogKey)) {
        console.log(`Backing off request for ${backoffTime}ms:`, requestKey);
        requestCounts.set(backoffLogKey, { count: 1, windowStart: now });
      }
      return await getCachedResponseWithFallback(request, cacheName, cacheConfig);
    }
  }

  // Check if request is already pending (request coalescing)
  // EXCLUDE community API requests from coalescing to prevent response blocking
  const url = new URL(request.url);
  const isCommunityAPI = url.pathname.includes('/communities/');
  // EXCLUDE marketplace API requests from coalescing to prevent stale data issues
  const isMarketplaceAPI = url.pathname.includes('/marketplace/');
  // EXCLUDE blockchain API requests from coalescing as they may have different parameters
  const isBlockchainAPI = url.hostname.includes('etherscan.io') || url.hostname.includes('basescan.org') || url.hostname.includes('bscscan.com');
  if (pendingRequests.has(requestKey) && !isCriticalRequest(request) && !isCommunityAPI && !isMarketplaceAPI && !isBlockchainAPI) {
    console.log('Request already pending, coalescing:', requestKey);
    try {
      const sharedPromise = pendingRequests.get(requestKey);
      if (!sharedPromise) {
        console.warn('Shared promise not found, proceeding with new request');
        // Continue to normal request handling below
      } else {
        // Wait for the existing promise to resolve
        const sharedResponse = await sharedPromise;

        // Check if response body has been consumed
        if (sharedResponse.bodyUsed) {
          console.warn('Shared response body already consumed, falling back to cache');
          return await getCachedResponseWithFallback(request, cacheName, cacheConfig);
        }

        // Clone the response to avoid bodyUsed issues
        const responseClone = sharedResponse.clone();
        return responseClone;
      }
    } catch (error) {
      console.warn('Failed to use shared response, falling back to cache:', error);
      // Remove the failed promise from pending requests so a new one can be created
      pendingRequests.delete(requestKey);
      // Continue to normal request handling below
    }
  }

  // Special handling for geolocation requests - try fallback services
  // url is already declared at the top of the function
  // Skip ip-api.com due to rate limiting - use alternatives directly
  if (url.hostname.includes('ip-api.com')) {
    console.warn('Skipping ip-api.com (rate limited), using alternatives');
    return await tryAlternativeGeolocationServices(request);
  }

  if (url.hostname.includes('ipify.org') ||
    url.hostname.includes('ipapi.co') ||
    url.hostname.includes('ipinfo.io')) {

    // Create promise for this request with fallback
    const requestPromise = (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          return networkResponse;
        } else {
          // Try alternative geolocation services
          console.warn('Geolocation service failed, trying alternatives:', networkResponse.status, requestKey);
          return await tryAlternativeGeolocationServices(request);
        }
      } catch (error) {
        // Try alternative geolocation services
        console.warn('Geolocation service network error, trying alternatives:', error.message, requestKey);
        return await tryAlternativeGeolocationServices(request);
      }
    })();

    pendingRequests.set(requestKey, requestPromise);

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        pendingRequests.delete(requestKey);
        reject(new Error('Geolocation request timeout'));
      }, 30000); // 30 second timeout
    });

    try {
      const result = await Promise.race([requestPromise, timeoutPromise]);
      pendingRequests.delete(requestKey);
      return result;
    } catch (error) {
      pendingRequests.delete(requestKey);
      throw error;
    }
  }

  // Create promise for this request (normal handling)
  const requestPromise = performNetworkRequestWithCircuitBreaker(request, cacheName, requestKey, cacheConfig, serviceKey);
  pendingRequests.set(requestKey, requestPromise);

  // Add timeout to prevent hanging requests
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      pendingRequests.delete(requestKey);
      reject(new Error('Request timeout'));
    }, 30000); // 30 second timeout
  });

  try {
    const result = await Promise.race([requestPromise, timeoutPromise]);
    pendingRequests.delete(requestKey);
    return result;
  } catch (error) {
    pendingRequests.delete(requestKey);
    throw error;
  }
}

async function performNetworkRequest(request, cacheName, requestKey, cacheConfig) {
  // Special handling for blockchain API requests to prevent coalescing issues
  const url = new URL(request.url);
  if (url.hostname.includes('etherscan.io') || url.hostname.includes('basescan.org') || url.hostname.includes('bscscan.com')) {
    // Don't coalesce blockchain API requests as they may have different parameters
    // but still apply timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const networkResponse = await fetch(request, {
        signal: controller.signal,
        mode: 'cors', // Explicitly set mode to cors
        credentials: 'include', // Include credentials if available
        cache: 'no-store' // Don't cache responses at the fetch level, we handle caching separately
      });

      clearTimeout(timeoutId);
      return networkResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      // For blockchain APIs, try to return cached response if available
      console.warn('Blockchain API request failed, trying cache:', error.message, requestKey);
      return await getCachedResponse(request, cacheName);
    }
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    // Adjust timeout based on request type - shorter for marketplace listings to avoid hanging requests
    const url = new URL(request.url);
    const isMarketplaceRequest = url.pathname.includes('/api/marketplace');
    const timeoutMs = isMarketplaceRequest ? 8000 : 15000; // 8 seconds for marketplace, 15 for others
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Check if this is an authenticated request and add auth headers if needed
    let fetchRequest = request;
    let isAuthRequest = false;

    // For API requests that require authentication, check if this is already an authenticated request
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth') && authHeader) {
      // This is an authenticated request, use the original request as-is
      isAuthRequest = true;
    }

    const networkResponse = await fetch(fetchRequest, {
      signal: controller.signal,
      mode: 'cors', // Explicitly set mode to cors
      credentials: 'include', // Include credentials if available
      cache: 'no-store' // Don't cache responses at the fetch level, we handle caching separately
    });

    clearTimeout(timeoutId);

    // Treat opaque responses (status 0) as non-fatal and return as-is
    if (networkResponse.type === 'opaque') {
      return networkResponse;
    }

    if (networkResponse.ok) {
      // Clone response before consuming it for caching
      let responseToCache;
      let responseToReturn;
      try {
        responseToCache = networkResponse.clone();
        responseToReturn = networkResponse.clone();

        // Don't cache authenticated responses to avoid security issues
        if (!isAuthRequest) {
          // Check if the request URL scheme is supported for caching
          if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
            const cache = await caches.open(cacheName);
            const responseWithTTL = new Response(responseToCache.body, {
              status: responseToCache.status,
              statusText: responseToCache.statusText,
              headers: {
                ...Object.fromEntries(responseToCache.headers.entries()),
                'sw-cached-at': Date.now().toString(),
                'sw-ttl': cacheConfig.ttl.toString()
              }
            });

            await cache.put(request, responseWithTTL);
          }
        }

        // Clear failed request record on success
        failedRequests.delete(requestKey);
        // Reset rate limit counter on success
        requestCounts.delete(requestKey);

        return responseToReturn;
      } catch (cacheError) {
        console.warn('Failed to cache response:', cacheError);
        // Return original response if cloning fails
        return networkResponse;
      }
    } else {
      // Special handling for specific error cases
      const url = new URL(request.url);

      // Handle WebSocket connection failures
      if (url.pathname.includes('socket.io')) {
        console.warn('WebSocket endpoint failed:', networkResponse.status, requestKey);
        // Don't aggressively backoff WebSocket failures, try polling fallback immediately
        failedRequests.delete(requestKey);
      }
      // Handle geolocation API failures (ip-api.com)
      else if (url.hostname.includes('ip-api.com')) {
        console.warn('Geolocation API failed, trying alternative:', networkResponse.status, requestKey);
        // Try alternative geolocation services immediately
        failedRequests.delete(requestKey);
      }
      // Handle image loading failures
      else if (url.pathname.includes('/_next/image')) {
        console.warn('Image loading failed:', networkResponse.status, requestKey);
        // Don't backoff image failures, let them fail fast
        failedRequests.delete(requestKey);
      }
      // Handle authentication failures (401) - don't cache these and don't backoff aggressively
      else if (networkResponse.status === 401) {
        console.warn('Authentication failed (401):', networkResponse.status, requestKey);
        // Don't backoff authentication failures, they may be resolved by user login
        failedRequests.delete(requestKey);

        // Clear cached response for this endpoint if skipCacheOnError is enabled
        if (cacheConfig.skipCacheOnError) {
          try {
            const cache = await caches.open(cacheName);
            await cache.delete(request);
            console.log('Cleared cached response for auth error endpoint:', requestKey);
          } catch (clearError) {
            console.warn('Failed to clear cached response:', clearError);
          }
        }

        // Don't cache 401 responses
        // Return a more descriptive error for messaging endpoints
        if (url.pathname.includes('/api/messaging') || url.pathname.includes('/api/chat/conversations')) {
          console.warn('Messaging API authentication failed, returning specific error');
          return new Response(JSON.stringify({
            error: 'Authentication required',
            message: 'Please login to access messaging features'
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return networkResponse;
      }
      // Handle service unavailable errors (503) with specific backoff
      else if (networkResponse.status === 503) {
        console.warn('Service unavailable (503):', networkResponse.status, requestKey);

        // For seller dashboard requests, reduce backoff time
        const url = new URL(request.url);
        const isSellerRequest = url.pathname.includes('/api/marketplace/seller') || url.pathname.includes('/dashboard/');
        const isMarketplaceRequest = url.pathname.includes('/api/marketplace');

        // Track failure with exponential backoff for service unavailable errors
        const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
        failureInfo.attempts += 1;
        failureInfo.lastFailure = Date.now();
        failedRequests.set(requestKey, failureInfo);

        // For seller requests, don't aggressively backoff on 503 errors
        if (isSellerRequest) {
          console.log('Seller request 503 error, reducing backoff time');
          // Reduce backoff time for seller requests by clearing failure info after short period
          setTimeout(() => {
            if (failedRequests.get(requestKey)?.attempts <= 3) {
              failedRequests.delete(requestKey);
              console.log('Cleared seller request failure info for faster retry');
            }
          }, 5000); // Clear after 5 seconds for seller requests
        }
        // For general marketplace requests, use moderate backoff
        else if (isMarketplaceRequest) {
          console.log('Marketplace request 503 error, using moderate backoff');
          // Clear failure info after moderate period for marketplace requests
          // Reduce timeout to allow faster recovery for marketplace listings
          setTimeout(() => {
            if (failedRequests.get(requestKey)?.attempts <= 2) {
              failedRequests.delete(requestKey);
              console.log('Cleared marketplace request failure info for faster retry');
            }
          }, 8000); // Clear after 8 seconds for marketplace requests
        }
      }
      // Handle community API errors with specific backoff
      else if (url.pathname.includes('/api/communities') || url.pathname.includes('/communities/')) {
        console.warn('Community API failed:', networkResponse.status, networkResponse.statusText, requestKey);
        // For 404 errors on specific community endpoints, don't aggressively backoff as the resource may not exist
        if (networkResponse.status === 404 || networkResponse.statusText.toLowerCase().includes('not found')) {
          console.log('Community not found (404), not applying backoff');
          failedRequests.delete(requestKey);
        } else {
          // Track failure with exponential backoff for other community requests
          const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
          failureInfo.attempts += 1;
          failureInfo.lastFailure = Date.now();
          failedRequests.set(requestKey, failureInfo);
        }
      }
      // Handle messaging API errors with specific backoff
      else if (url.pathname.includes('/api/messaging') || url.pathname.includes('/api/chat/conversations') || url.pathname.includes('/api/conversations') || url.pathname.includes('/api/messages/conversations')) {
        console.warn('Messaging API error:', networkResponse.status, requestKey);
        // Track failure with exponential backoff for messaging requests
        const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
        failureInfo.attempts += 1;
        failureInfo.lastFailure = Date.now();
        failedRequests.set(requestKey, failureInfo);
      }
      // Handle cart API errors with specific handling
      else if (url.pathname.includes('/api/cart')) {
        console.warn('Cart API error:', networkResponse.status, requestKey);
        // For 404 errors on cart endpoints, don't aggressively backoff
        if (networkResponse.status === 404) {
          console.log('Cart endpoint not found (404), not applying backoff');
          failedRequests.delete(requestKey);
        } else {
          // Track failure with exponential backoff for other cart requests
          const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
          failureInfo.attempts += 1;
          failureInfo.lastFailure = Date.now();
          failedRequests.set(requestKey, failureInfo);
        }
      }
      else {
        // Track failure with exponential backoff for other requests
        const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
        failureInfo.attempts += 1;
        failureInfo.lastFailure = Date.now();
        failedRequests.set(requestKey, failureInfo);
      }

      console.warn(`Request failed with status ${networkResponse.status}:`, requestKey);

      // In development, don't aggressively cache 503 errors
      if (isDevelopment && networkResponse.status === 503) {
        return networkResponse;
      }
    }

    // Return a clone to ensure the original can be used by other callers
    try {
      return networkResponse.clone();
    } catch (cloneError) {
      console.warn('Failed to clone network response:', cloneError);
      return networkResponse;
    }
  } catch (error) {
    console.log('Network failed, trying cache:', error.message);

    // Clear the pending request on network failure to allow retry
    pendingRequests.delete(requestKey);

    // Special handling for different error types
    const url = new URL(request.url);
    // requestKey is already available from arguments

    // Check if this is a network-level error (e.g., "Failed to fetch", DNS issues, connection refused)
    const isNetworkError = error.name === 'TypeError' && 
                          (error.message.includes('Failed to fetch') || 
                           error.message.includes('NetworkError') || 
                           error.message.includes('network') || 
                           error.message.includes('fetch') ||
                           error.message.includes('connection') ||
                           error.message.includes('aborted'));

    // Handle WebSocket connection failures
    if (url.pathname.includes('socket.io')) {
      console.warn('WebSocket connection failed, falling back to polling:', error.message);
      // Don't backoff WebSocket failures, they're expected to fallback to polling
    }
    // Handle geolocation API failures
    else if (url.hostname.includes('ip-api.com')) {
      console.warn('Geolocation service failed, trying next:', error.message);
      // Try alternative geolocation services immediately
    }
    // Handle community API failures with more specific backoff
    else if (url.pathname.includes('/api/communities')) {
      console.warn('Community API failed:', error.message, requestKey);
      // Track failure with exponential backoff for community requests
      const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
      failureInfo.attempts += 1;
      failureInfo.lastFailure = Date.now();
      failedRequests.set(requestKey, failureInfo);
    }
    // Handle messaging API failures with more specific backoff
    else if (url.pathname.includes('/api/messaging') || url.pathname.includes('/api/chat/conversations') || url.pathname.includes('/api/conversations') || url.pathname.includes('/api/messages/conversations')) {
      console.warn('Messaging API failed:', error.message, requestKey);
      // Track failure with exponential backoff for messaging requests
      const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
      failureInfo.attempts += 1;
      failureInfo.lastFailure = Date.now();
      failedRequests.set(requestKey, failureInfo);
    }
    // Handle cart API failures with more specific backoff
    else if (url.pathname.includes('/api/cart')) {
      console.warn('Cart API failed:', error.message, requestKey);
      // Track failure with exponential backoff for cart requests
      const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
      failureInfo.attempts += 1;
      failureInfo.lastFailure = Date.now();
      failedRequests.set(requestKey, failureInfo);
    }
    // Handle marketplace API failures with more specific backoff
    else if (url.pathname.includes('/api/marketplace')) {
      console.warn('Marketplace API failed:', error.message, requestKey);
      // Track failure with exponential backoff for marketplace requests
      const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
      failureInfo.attempts += 1;
      failureInfo.lastFailure = Date.now();
      failedRequests.set(requestKey, failureInfo);

      // For marketplace requests, use improved backoff handling
      if (isNetworkError) {
        // For network-level errors, clear failure info faster to enable quicker retries
        setTimeout(() => {
          if (failedRequests.get(requestKey)?.attempts <= 2) {
            failedRequests.delete(requestKey);
            console.log('Cleared marketplace network error failure info for faster retry');
          }
        }, 5000); // Clear after 5 seconds for marketplace network errors
      } else {
        // For other types of errors (like 400 validation errors), clear faster since they might be temporary
        setTimeout(() => {
          if (failedRequests.get(requestKey)?.attempts <= 2) {
            failedRequests.delete(requestKey);
            console.log('Cleared marketplace request failure info for faster retry');
          }
        }, 5000); // Clear after 5 seconds for marketplace requests - reduced from 8s for better recovery
      }
    }
    // Handle seller dashboard failures with more specific backoff
    else if (url.pathname.includes('/api/marketplace/seller') || url.pathname.includes('/dashboard/')) {
      console.warn('Seller dashboard failed:', error.message, requestKey);
      // Track failure with exponential backoff for seller requests
      const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
      failureInfo.attempts += 1;
      failureInfo.lastFailure = Date.now();
      failedRequests.set(requestKey, failureInfo);

      // For seller requests, don't aggressively backoff on network errors
      console.log('Seller request network error, reducing backoff time');
      // Reduce backoff time for seller requests by clearing failure info after short period
      setTimeout(() => {
        if (failedRequests.get(requestKey)?.attempts <= 2) {
          failedRequests.delete(requestKey);
          console.log('Cleared seller request failure info for faster retry');
        }
      }, 2000); // Clear after 2 seconds for seller requests
    }
    else {
      // Track failure with exponential backoff for other requests
      const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
      failureInfo.attempts += 1;
      failureInfo.lastFailure = Date.now();
      failedRequests.set(requestKey, failureInfo);
    }

    // For network-level errors, try to get a cached response first, then fallback to offline page
    return await getCachedResponse(request, cacheName);
  }
}

// Cache response with TTL metadata
async function cacheResponseWithTTL(request, response, cacheName, ttl) {
  try {
    // Check if this endpoint has skipCacheOnError enabled and if the response is an error
    const cacheConfig = getAPICacheConfig(request);
    if (cacheConfig.skipCacheOnError && (!response.ok || response.status >= 400)) {
      console.log('Skipping cache for error response on endpoint with skipCacheOnError:', request.url);
      return; // Don't cache error responses for endpoints with skipCacheOnError
    }
    
    const cache = await caches.open(cacheName);
    const now = Date.now();

    // Add TTL metadata to response headers
    const responseWithTTL = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'sw-cached-at': now.toString(),
        'sw-ttl': ttl.toString()
      }
    });

    // Check if the request URL scheme is supported for caching
    if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
      await cache.put(request, responseWithTTL);
    }
  } catch (error) {
    console.warn('Failed to cache response with TTL:', error);
  }
}

// Get cached response with TTL check
async function getCachedResponseWithTTL(request, cacheName, ttl) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (!cachedResponse) {
      return null;
    }

    // Check if this endpoint has skipCacheOnError enabled and if the cached response is an auth error
    const cacheConfig = getAPICacheConfig(request);
    if (cacheConfig.skipCacheOnError && (cachedResponse.status === 401 || cachedResponse.status === 403)) {
      console.log('Skipping cached auth error response for endpoint with skipCacheOnError:', request.url);
      await cache.delete(request);
      return null;
    }

    const cachedAt = cachedResponse.headers.get('sw-cached-at');
    const responseTTL = cachedResponse.headers.get('sw-ttl');

    if (cachedAt && responseTTL) {
      const age = Date.now() - parseInt(cachedAt);
      const maxAge = parseInt(responseTTL);

      if (age > maxAge) {
        // Cache expired, remove it
        await cache.delete(request);
        return null;
      }
    }

    return cachedResponse;
  } catch (error) {
    console.warn('Failed to get cached response with TTL:', error);
    return null;
  }
}

// Background cache update for critical APIs with throttling
async function updateCacheInBackground(request, cacheName, requestKey) {
  // Check if this endpoint was recently updated
  const lastUpdate = backgroundUpdateTimestamps.get(requestKey);
  const now = Date.now();

  // Determine throttle time based on endpoint type
  const url = new URL(request.url);
  let throttleTime = BACKGROUND_UPDATE_THROTTLE.default;

  if (url.pathname.includes('/comments')) {
    throttleTime = BACKGROUND_UPDATE_THROTTLE.comments;
  } else if (url.pathname.includes('/feed')) {
    throttleTime = BACKGROUND_UPDATE_THROTTLE.feed;
  }

  // Skip if recently updated
  if (lastUpdate && (now - lastUpdate) < throttleTime) {
    return; // Silently skip
  }

  // Update timestamp
  backgroundUpdateTimestamps.set(requestKey, now);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cacheConfig = getAPICacheConfig(request);
      await cacheResponseWithTTL(request, networkResponse, cacheName, cacheConfig.ttl);
      console.log('Background cache update successful for:', requestKey);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Get cached response with fallback mechanisms
async function getCachedResponse(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Return cached response directly without modifying headers
      // to avoid response body locked errors
      return cachedResponse;
    }

    // Try alternative caches
    const alternativeCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE]
      .filter(name => name !== cacheName);

    for (const altCacheName of alternativeCaches) {
      try {
        const altCache = await caches.open(altCacheName);
        const altResponse = await altCache.match(request);

        if (altResponse) {
          console.log(`Found in alternative cache: ${altCacheName}`);
          return altResponse;
        }
      } catch (altError) {
        console.warn(`Alternative cache ${altCacheName} failed:`, altError);
      }
    }

    // Return offline page for navigation requests
    if (isEnhancedNavigation(request)) {
      try {
        const offlineResponse = await caches.match('/offline.html');
        if (offlineResponse) {
          return offlineResponse;
        }
      } catch (offlineError) {
        console.warn('Failed to load offline page:', offlineError);
      }

      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>You are offline</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h1>You are offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </body>
        </html>
      `, {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Provide more specific error messages for different API endpoints
    const url = new URL(request.url);
    let errorMessage = 'Content not available offline';

    if (url.pathname.includes('/api/messaging') || url.pathname.includes('/api/chat/conversations')) {
      errorMessage = 'Messaging service temporarily unavailable. Please check your connection and try again.';
    } else if (url.pathname.includes('/api/communities')) {
      errorMessage = 'Community service temporarily unavailable. Please check your connection and try again.';
    } else if (url.pathname.includes('/api/feed')) {
      errorMessage = 'Feed service temporarily unavailable. Please check your connection and try again.';
    } else if (url.pathname.includes('/api/cart')) {
      errorMessage = 'Shopping cart service temporarily unavailable. Please check your connection and try again.';
    }

    return new Response(errorMessage, {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('Failed to get cached response:', error);
    return await handleCacheFailure(request, error);
  }
}

// Enhanced fallback mechanisms when caching operations fail
async function handleCacheFailure(request, error) {
  console.warn('Cache operation failed:', error);

  // Try to serve from alternative caches
  const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];

  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const response = await cache.match(request);

      if (response) {
        console.log(`Served from alternative cache: ${cacheName}`);
        return response;
      }
    } catch (cacheError) {
      console.warn(`Alternative cache ${cacheName} also failed:`, cacheError);
    }
  }

  // Final fallback - return offline page or error response
  if (isEnhancedNavigation(request)) {
    try {
      const cache = await caches.open(STATIC_CACHE);
      const offlineResponse = await cache.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }

      // Fallback response if offline.html is not available
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>You are offline</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h1>You are offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </body>
        </html>
      `, {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (offlineError) {
      return new Response('Service temporarily unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }

  // Provide more specific error messages for different API endpoints
  const url = new URL(request.url);
  let errorMessage = 'Content not available offline';

  if (url.pathname.includes('/api/messaging') || url.pathname.includes('/api/chat/conversations')) {
    errorMessage = 'Messaging service temporarily unavailable. Please check your connection and try again.';
  } else if (url.pathname.includes('/api/communities')) {
    errorMessage = 'Community service temporarily unavailable. Please check your connection and try again.';
  } else if (url.pathname.includes('/api/feed')) {
    errorMessage = 'Feed service temporarily unavailable. Please check your connection and try again.';
  } else if (url.pathname.includes('/api/cart')) {
    errorMessage = 'Shopping cart service temporarily unavailable. Please check your connection and try again.';
  }

  return new Response(errorMessage, {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Ensure service worker can resolve offline.html even when direct cache lookup fails
// by implementing redundant fallback strategies in navigation and cache failure handlers
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached page or offline page
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page as fallback with multiple fallback strategies
    // First try to get offline.html from cache
    let offlineResponse = await cache.match('/offline.html');

    // If that fails, try to get it from network
    if (!offlineResponse) {
      try {
        const networkOfflineResponse = await fetch('/offline.html');
        if (networkOfflineResponse.ok) {
          // Cache it for future use
          await cache.put('/offline.html', networkOfflineResponse.clone());
          offlineResponse = networkOfflineResponse;
        }
      } catch (networkError) {
        console.warn('Failed to fetch offline.html from network:', networkError);
      }
    }

    // If we have offline.html, return it
    if (offlineResponse) {
      return offlineResponse;
    }

    // Final fallback response if offline.html is not available
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>You are offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h1>You are offline</h1>
          <p>Please check your internet connection and try again.</p>
          <button onclick="window.location.reload()">Retry</button>
        </body>
      </html>
    `, {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background cache update
async function updateCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Check if the request URL scheme is supported for caching
      if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
        cache.put(request, networkResponse);
      }
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Handle placehold.co requests with local placeholders
async function handlePlaceholderRequest(url) {
  try {
    // Parse placehold.co URL
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length < 1) {
      return generatePlaceholderSVG(40, 40, '?');
    }

    const dimensions = pathParts[0];
    let width = 40;
    let height = 40;

    if (dimensions.includes('x')) {
      const [w, h] = dimensions.split('x').map(Number);
      width = w || 40;
      height = h || 40;
    } else {
      width = height = Number(dimensions) || 40;
    }

    // Extract background color if present
    let backgroundColor;
    if (pathParts.length > 1) {
      backgroundColor = `#${pathParts[1]}`;
    }

    // Extract text from query params
    const text = url.searchParams.get('text')?.replace(/\+/g, ' ');

    return generatePlaceholderSVG(width, height, text, backgroundColor);
  } catch (error) {
    console.warn('Failed to generate placeholder:', error);
    return generatePlaceholderSVG(40, 40, '?');
  }
}

// Generate SVG placeholder response
function generatePlaceholderSVG(width, height, text, backgroundColor) {
  // Generate deterministic color if not provided
  if (!backgroundColor) {
    const str = text || `${width}x${height}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    backgroundColor = `hsl(${hue}, 65%, 50%)`;
  }

  const textColor = '#ffffff';
  const displayText = text || `${width}×${height}`;
  const fontSize = Math.min(width, height) * 0.2;

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${backgroundColor}"/>
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" 
          fill="${textColor}" text-anchor="middle" dominant-baseline="middle">
      ${displayText}
    </text>
  </svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Enhanced circuit breaker functions for service worker

function getServiceKey(request) {
  const url = new URL(request.url);
  const hostname = url.hostname;

  // Special handling for different service types
  if (hostname.includes('socket.io') || hostname.includes('websocket')) {
    return 'websocket';
  }

  if (hostname.includes('ip-api.com') || hostname.includes('ipify.org') || hostname.includes('ipinfo.io')) {
    return 'geolocation';
  }

  // Special handling for marketplace services
  if (url.pathname.includes('/api/marketplace')) {
    return 'marketplace';
  }

  const pathParts = url.pathname.split('/');

  if (pathParts[1] === 'api' && pathParts[2]) {
    // Return specific service key for different API types
    if (pathParts[2] === 'messaging') {
      return 'messaging';
    } else if (pathParts[2] === 'communities') {
      return 'communities';
    } else if (pathParts[2] === 'feed') {
      return 'feed';
    } else if (pathParts[2] === 'posts') {
      return 'posts';
    } else if (pathParts[2] === 'cart') {
      return 'cart';
    } else {
      return pathParts[2]; // e.g., 'profiles', 'users', 'search', etc.
    }
  }

  return 'default';
}

function getCircuitBreakerState(serviceKey) {
  const state = circuitBreakerStates.get(serviceKey);
  if (!state) {
    // Initialize circuit breaker state
    circuitBreakerStates.set(serviceKey, {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      halfOpenCalls: 0
    });
    return 'CLOSED';
  }

  // Get service-specific configuration
  const config = SERVICE_CIRCUIT_BREAKER_CONFIGS[serviceKey] || SERVICE_CIRCUIT_BREAKER_CONFIGS.default;
  
  const now = Date.now();

  // Check if circuit should transition from OPEN to HALF_OPEN
  if (state.state === 'OPEN' && now - state.lastFailure > config.recoveryTimeout) {
    state.state = 'HALF_OPEN';
    state.halfOpenCalls = 0;
    console.log(`Circuit breaker for ${serviceKey} transitioning to HALF_OPEN`);
  }

  return state.state;
}

function recordCircuitBreakerSuccess(serviceKey) {
  const state = circuitBreakerStates.get(serviceKey);
  if (!state) return;

  // Get service-specific configuration
  const config = SERVICE_CIRCUIT_BREAKER_CONFIGS[serviceKey] || SERVICE_CIRCUIT_BREAKER_CONFIGS.default;

  if (state.state === 'HALF_OPEN') {
    state.halfOpenCalls++;
    if (state.halfOpenCalls >= config.halfOpenMaxCalls) {
      state.state = 'CLOSED';
      state.failures = 0;
      console.log(`Circuit breaker for ${serviceKey} closed after successful recovery`);
    }
  } else if (state.state === 'CLOSED') {
    // Reset failure count on success
    state.failures = Math.max(0, state.failures - 1);
  }
}

function recordCircuitBreakerFailure(serviceKey, error) {
  const state = circuitBreakerStates.get(serviceKey) || {
    state: 'CLOSED',
    failures: 0,
    lastFailure: 0,
    halfOpenCalls: 0
  };

  // Get service-specific configuration
  const config = SERVICE_CIRCUIT_BREAKER_CONFIGS[serviceKey] || SERVICE_CIRCUIT_BREAKER_CONFIGS.default;

  const isServiceFailure = error?.status >= 500 ||
    error?.status === 503 ||
    error?.message?.includes('fetch') ||
    error?.message?.includes('timeout');

  if (isServiceFailure) {
    state.failures++;
    state.lastFailure = Date.now();

    if (state.state === 'HALF_OPEN' ||
      (state.state === 'CLOSED' && state.failures >= config.failureThreshold)) {
      state.state = 'OPEN';
      state.halfOpenCalls = 0;
      console.warn(`Circuit breaker for ${serviceKey} opened due to ${state.failures} failures`);
    }

    circuitBreakerStates.set(serviceKey, state);
  }
}

async function performNetworkRequestWithCircuitBreaker(request, cacheName, requestKey, cacheConfig, serviceKey) {
  try {
    const result = await performNetworkRequest(request, cacheName, requestKey, cacheConfig);
    recordCircuitBreakerSuccess(serviceKey);
    return result;
  } catch (error) {
    recordCircuitBreakerFailure(serviceKey, error);
    throw error;
  }
}

async function getCachedResponseWithFallback(request, cacheName, cacheConfig) {
  // Try fresh cache first
  const freshCache = await getCachedResponseWithTTL(request, cacheName, cacheConfig.ttl);
  if (freshCache) {
    return freshCache;
  }

  // Try stale cache
  const staleCache = await getCachedResponseWithTTL(request, cacheName, cacheConfig.staleTTL || cacheConfig.ttl * 10);
  if (staleCache) {
    console.log('Using stale cache as fallback');
    // Add header to indicate stale data
    const staleResponse = new Response(staleCache.body, {
      status: staleCache.status,
      statusText: staleCache.statusText,
      headers: {
        ...Object.fromEntries(staleCache.headers.entries()),
        'X-Cache-Status': 'stale'
      }
    });
    return staleResponse;
  }

  // Final fallback
  return await getCachedResponse(request, cacheName);
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isCriticalRequest(request) {
  const url = new URL(request.url);

  // Consider WebSocket, authentication, and profile requests as critical
  // Also consider requests with unique parameters that shouldn't be coalesced
  if (url.pathname.includes('socket.io') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/profiles') ||
    url.pathname.startsWith('/api/users') ||
    url.pathname.includes('/feed') ||
    url.pathname.includes('/communities/') || // Don't coalesce community requests as they may have different responses
    url.pathname.includes('/marketplace/') || // Don't coalesce marketplace requests to ensure fresh data
    url.pathname.includes('/conversations') || // Don't coalesce conversation requests as they may have different responses
    url.searchParams.has('timestamp') ||
    url.searchParams.has('nonce') ||
    url.searchParams.has('_t')) {
    return true;
  }

  return false;
}

function isImage(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/);
}

function isAPI(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
    Object.keys(CACHEABLE_APIS).some(api => url.pathname.startsWith(api));
}

function getAPICacheConfig(request) {
  const url = new URL(request.url);
  for (const [apiPath, config] of Object.entries(CACHEABLE_APIS)) {
    if (url.pathname.startsWith(apiPath)) {
      return config;
    }
  }
  return { ttl: 60000, priority: 'medium' }; // Default config
}

function isCriticalAPI(request) {
  const url = new URL(request.url);
  return CRITICAL_APIS.some(api => url.pathname.startsWith(api));
}

// Enhanced navigation detection to ensure all navigation requests bypass service worker
function isNavigation(request) {
  // Check if it's a navigation request (Next.js pages)
  if (request.mode === 'navigate') {
    return true;
  }
  
  // Check if it's a GET request for HTML content
  if (request.method === 'GET') {
    const acceptHeader = request.headers.get('accept');
    if (acceptHeader && acceptHeader.includes('text/html')) {
      return true;
    }
  }
  
  // Additional check for navigation-like requests
  const url = new URL(request.url);
  
  // CRITICAL FIXES: Always treat specific routes as navigation
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return true;
  }
  
  if (url.pathname === '/profile' || url.pathname.startsWith('/profile/')) {
    return true;
  }
  
  if (url.pathname === '/communities' || url.pathname.startsWith('/communities/')) {
    return true;
  }
  
  if (url.pathname === '/marketplace' || url.pathname.startsWith('/marketplace/')) {
    return true;
  }
  
  if (url.pathname === '/governance' || url.pathname.startsWith('/governance/')) {
    return true;
  }
  
  if (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) {
    return true;
  }
  
  if (url.pathname === '/settings' || url.pathname.startsWith('/settings/')) {
    return true;
  }
  
  if (url.pathname === '/notifications' || url.pathname.startsWith('/notifications/')) {
    return true;
  }
  
  // If it's a GET request to a path that looks like a page (no file extension except for known static assets)
  if (!url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/i)) {
    // And it's not an API request
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_next/')) {
      return true;
    }
  }
  
  return false;
}

// ENHANCED NAVIGATION DETECTION - More comprehensive check to ensure ALL navigation requests bypass service worker
function isEnhancedNavigation(request) {
  // First check with existing logic
  if (isNavigation(request)) {
    return true;
  }
  
  // Additional checks for edge cases that might still block navigation
  const url = new URL(request.url);
  
  // Check for navigation to Next.js dynamic routes
  if (request.destination === 'document' && request.mode === 'same-origin') {
    return true;
  }
  
  return false;
}

// Global error handlers to catch extension-related errors
self.addEventListener('error', (event) => {
  // Suppress extension-related errors that don't affect functionality
  if (event.error && event.error.message && 
      (event.error.message.includes('Invalid frameId for foreground frameId') ||
       event.error.message.includes('No tab with id') ||
       event.error.message.includes('background-redux-new.js'))) {
    console.debug('Service Worker: Ignored extension error:', event.error.message);
    event.preventDefault();
    return;
  }
});

self.addEventListener('unhandledrejection', (event) => {
  // Suppress extension-related promise rejections
  if (event.reason && 
      (event.reason.includes('Invalid frameId for foreground frameId') ||
       event.reason.includes('No tab with id') ||
       event.reason.includes('background-redux-new.js'))) {
    console.debug('Service Worker: Ignored extension promise rejection:', event.reason);
    event.preventDefault();
    return;
  }
});

// Message handler for offline actions
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'QUEUE_OFFLINE_ACTION':
      queueOfflineAction(data);
      event.ports[0].postMessage({ success: true });
      break;
    case 'GET_OFFLINE_STATUS':
      event.ports[0].postMessage({
        isOnline: navigator.onLine,
        queueSize: offlineActionQueue.length
      });
      break;
    case 'SYNC_OFFLINE_ACTIONS':
      syncOfflineActions().then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch(error => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
  }
});

// Queue offline action
function queueOfflineAction(action) {
  if (offlineActionQueue.length >= maxQueueSize) {
    // Remove oldest action to make room
    offlineActionQueue.shift();
  }

  const queuedAction = {
    id: generateActionId(),
    timestamp: Date.now(),
    ...action
  };

  offlineActionQueue.push(queuedAction);

  // Store in IndexedDB for persistence
  storeOfflineAction(queuedAction);

  console.log('Queued offline action:', queuedAction.type);
}

// Generate unique action ID
function generateActionId() {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Store offline action in IndexedDB
async function storeOfflineAction(action) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    await store.add(action);
  } catch (error) {
    console.error('Failed to store offline action:', error);
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'offline-actions-sync') {
    event.waitUntil(syncOfflineActions());
  } else if (event.tag === 'post-sync') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'reaction-sync') {
    event.waitUntil(syncReactions());
  }
});

// Sync all offline actions
async function syncOfflineActions() {
  try {
    const db = await openDB();
    const actions = await getOfflineActions(db);

    for (const action of actions) {
      try {
        const success = await syncSingleAction(action);
        if (success) {
          await removeOfflineAction(db, action.id);
          // Remove from memory queue
          const index = offlineActionQueue.findIndex(a => a.id === action.id);
          if (index > -1) {
            offlineActionQueue.splice(index, 1);
          }
          console.log('Synced offline action:', action.type, action.id);
        }
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
      }
    }

    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_COMPLETE',
        queueSize: offlineActionQueue.length
      });
    });
  } catch (error) {
    console.error('Offline actions sync failed:', error);
  }
}

// Sync individual action based on type
async function syncSingleAction(action) {
  switch (action.type) {
    case 'CREATE_POST':
      return await syncCreatePost(action);
    case 'CREATE_COMMENT':
      return await syncCreateComment(action);
    case 'REACT_TO_POST':
      return await syncReaction(action);
    case 'JOIN_COMMUNITY':
      return await syncJoinCommunity(action);
    case 'FOLLOW_USER':
      return await syncFollowUser(action);
    default:
      console.warn('Unknown action type:', action.type);
      return false;
  }
}

// Sync create post action
async function syncCreatePost(action) {
  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': action.auth || ''
      },
      body: JSON.stringify(action.data)
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to sync create post:', error);
    return false;
  }
}

// Sync create comment action
async function syncCreateComment(action) {
  try {
    const response = await fetch(`/api/posts/${action.postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': action.auth || ''
      },
      body: JSON.stringify(action.data)
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to sync create comment:', error);
    return false;
  }
}

// Sync reaction action
async function syncReaction(action) {
  try {
    const response = await fetch(`/api/posts/${action.postId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': action.auth || ''
      },
      body: JSON.stringify(action.data)
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to sync reaction:', error);
    return false;
  }
}

// Sync join community action
async function syncJoinCommunity(action) {
  try {
    const response = await fetch(`/api/communities/${action.communityId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': action.auth || ''
      },
      body: JSON.stringify(action.data)
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to sync join community:', error);
    return false;
  }
}

// Sync follow user action
async function syncFollowUser(action) {
  try {
    const response = await fetch(`/api/users/${action.userId}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': action.auth || ''
      },
      body: JSON.stringify(action.data)
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to sync follow user:', error);
    return false;
  }
}

// Sync offline posts when back online
async function syncPosts() {
  try {
    const db = await openDB();
    const offlinePosts = await getOfflinePosts(db);

    for (const post of offlinePosts) {
      try {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(post.data)
        });

        if (response.ok) {
          await removeOfflinePost(db, post.id);
          console.log('Synced offline post:', post.id);
        }
      } catch (error) {
        console.error('Failed to sync post:', error);
      }
    }
  } catch (error) {
    console.error('Post sync failed:', error);
  }
}

// Sync offline reactions when back online
async function syncReactions() {
  try {
    const db = await openDB();
    const offlineReactions = await getOfflineReactions(db);

    for (const reaction of offlineReactions) {
      try {
        // Retrieve auth token from storage
        const token = await getAuthToken();
        const authHeader = token ? `Bearer ${token}` : '';
        
        const response = await fetch(`/api/posts/${reaction.postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(reaction.data)
        });

        if (response.ok) {
          await removeOfflineReaction(db, reaction.id);
          console.log('Synced offline reaction:', reaction.id);
        }
      } catch (error) {
        console.error('Failed to sync reaction:', error);
      }
    }
  } catch (error) {
    console.error('Reaction sync failed:', error);
  }
}

// IndexedDB helpers for offline data and action queue
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineData', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('posts')) {
        db.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('reactions')) {
        db.createObjectStore('reactions', { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains('actions')) {
        const actionStore = db.createObjectStore('actions', { keyPath: 'id' });
        actionStore.createIndex('timestamp', 'timestamp', { unique: false });
        actionStore.createIndex('type', 'type', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('authTokens')) {
        db.createObjectStore('authTokens', { keyPath: 'id' });
      }
    };
  });
}

// Function to get auth token from IndexedDB
async function getAuthToken() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['authTokens'], 'readonly');
    const store = transaction.objectStore('authTokens');
    const tokenRecord = await store.get('current');
    
    return tokenRecord ? tokenRecord.value : null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

async function getOfflinePosts(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['posts'], 'readonly');
    const store = transaction.objectStore('posts');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getOfflineReactions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reactions'], 'readonly');
    const store = transaction.objectStore('reactions');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeOfflinePost(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['posts'], 'readwrite');
    const store = transaction.objectStore('posts');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function removeOfflineReaction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reactions'], 'readwrite');
    const store = transaction.objectStore('reactions');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getOfflineActions(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['actions'], 'readonly');
    const store = transaction.objectStore('actions');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function removeOfflineAction(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = '/communities';

  if (data.postId && data.communityId) {
    url = `/dao/${data.communityId}?post=${data.postId}`;
  } else if (data.communityId) {
    url = `/dao/${data.communityId}`;
  } else if (data.postId) {
    // Fallback - try to find a community context or go to communities page
    url = '/communities';
  }

  event.waitUntil(
    clients.openWindow(url)
  );
});

// Rate limiting helper function with service-specific handling
function checkRateLimit(requestKey, now) {
  // Skip rate limiting in development mode
  if (isDevelopment) {
    return true;
  }

  // Robust URL extraction from requestKey (format: METHOD:URL)
  const urlString = requestKey.substring(requestKey.indexOf(':') + 1);
  let url;
  try {
    url = new URL(urlString);
  } catch (e) {
    // Fallback for relative URLs or invalid formats
    try {
      url = new URL(urlString, 'http://localhost');
    } catch (e2) {
      console.warn('Failed to parse URL for rate limiting:', urlString);
      return true; // Fail open if URL is unparseable
    }
  }

  const endpoint = url.pathname;

  // Skip rate limiting for placeholder endpoints
  if (endpoint.includes('/api/placeholder')) {
    return true;
  }

  // Skip rate limiting for IPFS gateways
  if (url.hostname.includes('gateway.pinata.cloud') ||
    url.hostname.includes('ipfs.io') ||
    url.hostname.includes('cloudflare-ipfs.com') ||
    url.hostname.includes('dweb.link')) {
    return true;
  }

  // Skip rate limiting for WebSocket endpoints
  if (url.pathname.includes('socket.io')) {
    return true;
  }

  // Skip rate limiting for critical endpoints (authentication, profiles, etc.)
  if (isCriticalRequest({ url: url })) {
    return true;
  }

  // Apply rate limiting to geolocation services to prevent excessive requests
  // but allow reasonable fallback attempts between different providers
  if (url.hostname.includes('ip-api.com') || url.hostname.includes('ipify.org') || url.hostname.includes('ipinfo.io')) {
    // Apply a more conservative rate limit specific to geolocation
    const geolocationMaxRequests = 30; // 30 requests per minute instead of 100
    const geolocationCountKey = `rate_limit:geolocation`;
    let geolocationInfo = requestCounts.get(geolocationCountKey);

    if (!geolocationInfo) {
      geolocationInfo = { count: 0, windowStart: now };
      requestCounts.set(geolocationCountKey, geolocationInfo);
    }

    // Reset window if expired
    if (now - geolocationInfo.windowStart > RATE_LIMIT_WINDOW) {
      geolocationInfo.count = 0;
      geolocationInfo.windowStart = now;
    }

    // Check if under geolocation-specific limit
    if (geolocationInfo.count >= geolocationMaxRequests) {
      return false;
    }

    geolocationInfo.count += 1;
    return true;
  }

  const countKey = `rate_limit:${endpoint}`;

  let requestInfo = requestCounts.get(countKey);

  if (!requestInfo) {
    requestInfo = { count: 0, windowStart: now };
    requestCounts.set(countKey, requestInfo);
  }

  // Reset window if expired
  if (now - requestInfo.windowStart > RATE_LIMIT_WINDOW) {
    requestInfo.count = 0;
    requestInfo.windowStart = now;
  }

  // Check if under limit
  if (requestInfo.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  requestInfo.count += 1;
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();

  // Clean up old failed requests (older than max backoff time)
  for (const [key, failureInfo] of failedRequests.entries()) {
    if (now - failureInfo.lastFailure > MAX_BACKOFF_TIME) {
      failedRequests.delete(key);
    }
  }

  // Clean up old rate limit counters
  for (const [key, requestInfo] of requestCounts.entries()) {
    if (now - requestInfo.windowStart > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Resource availability verification
async function verifyResourceAvailability(assets) {
  const verifiedAssets = [];

  for (const asset of assets) {
    try {
      const response = await fetch(asset, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (response.ok) {
        verifiedAssets.push(asset);
      } else {
        console.warn(`Asset not available: ${asset} (${response.status})`);
      }
    } catch (error) {
      console.warn(`Failed to verify asset: ${asset}`, error.message);
    }
  }

  return verifiedAssets;
}

// Graceful cache.addAll implementation with individual fallbacks
async function gracefulCacheAddAll(cache, assets) {
  const cachePromises = assets.map(async (asset) => {
    try {
      const response = await fetch(asset);

      if (response.ok) {
        // Check if the asset URL scheme is supported for caching
        if (asset.startsWith('http://') || asset.startsWith('https://')) {
          await cache.put(asset, response);
        }
        console.log(`Successfully cached: ${asset}`);
        return { asset, success: true };
      } else {
        console.warn(`Failed to cache ${asset}: ${response.status}`);
        return { asset, success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.warn(`Failed to cache ${asset}:`, error.message);
      return { asset, success: false, error: error.message };
    }
  });

  const results = await Promise.allSettled(cachePromises);
  const successful = results.filter(result =>
    result.status === 'fulfilled' && result.value.success
  ).length;

  console.log(`Cached ${successful}/${assets.length} static assets`);

  // Don't throw error if some assets fail - continue with partial cache
  return results;
}

// Cache cleanup strategies for storage management
async function performCacheCleanup() {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];

    // Delete old cache versions
    const deletePromises = cacheNames
      .filter(cacheName => !currentCaches.includes(cacheName))
      .map(cacheName => {
        console.log('Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      });

    await Promise.all(deletePromises);

    // Clean up oversized caches
    await cleanupOversizedCaches();

    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}

// Clean up oversized caches to manage storage
async function cleanupOversizedCaches() {
  const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB per cache
  const MAX_CACHE_ENTRIES = 1000;

  const cacheNames = [DYNAMIC_CACHE, IMAGE_CACHE];

  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      if (keys.length > MAX_CACHE_ENTRIES) {
        // Remove oldest entries (simple FIFO approach)
        const entriesToRemove = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);

        for (const key of entriesToRemove) {
          await cache.delete(key);
        }

        console.log(`Cleaned up ${entriesToRemove.length} entries from ${cacheName}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup cache ${cacheName}:`, error);
    }
  }
}



// Storage quota management
async function checkStorageQuota() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / (1024 * 1024);
      const quotaMB = (estimate.quota || 0) / (1024 * 1024);
      const usagePercent = (usedMB / quotaMB) * 100;

      console.log(`Storage usage: ${usedMB.toFixed(2)}MB / ${quotaMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`);

      // Trigger cleanup if usage is high
      if (usagePercent > 80) {
        console.log('High storage usage detected, triggering cleanup');
        await performCacheCleanup();
      }

      return { usedMB, quotaMB, usagePercent };
    } catch (error) {
      console.error('Failed to check storage quota:', error);
      return null;
    }
  }

  return null;
}

// Periodic maintenance
setInterval(async () => {
  try {
    await checkStorageQuota();
    await performCacheCleanup();
  } catch (error) {
    console.error('Periodic maintenance failed:', error);
  }
}, 30 * 60 * 1000); // Run every 30 minutes

// Online/offline detection and notification
self.addEventListener('online', () => {
  console.log('Connection restored, syncing offline actions');
  syncOfflineActions();

  // Notify all clients about online status
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CONNECTION_STATUS_CHANGED',
        isOnline: true,
        queueSize: offlineActionQueue.length
      });
    });
  });
});

self.addEventListener('offline', () => {
  console.log('Connection lost, entering offline mode');

  // Notify all clients about offline status
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CONNECTION_STATUS_CHANGED',
        isOnline: false,
        queueSize: offlineActionQueue.length
      });
    });
  });
});

// Load offline actions from IndexedDB on startup
(async function loadOfflineActions() {
  try {
    const db = await openDB();
    const actions = await getOfflineActions(db);
    offlineActionQueue.push(...actions);
    console.log(`Loaded ${actions.length} offline actions from storage`);
  } catch (error) {
    console.error('Failed to load offline actions:', error);
  }
})();

console.log('Service Worker loaded with enhanced caching, offline support, and action queue');

// Function to try alternative geolocation services
async function tryAlternativeGeolocationServices(originalRequest) {
  // Prioritize services without rate limiting issues
  const geolocationServices = [
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      parser: (data) => ({
        country: data.country_name || data.country,
        region: data.region,
        city: data.city,
        lat: data.latitude,
        lon: data.longitude,
        timezone: data.timezone,
        isp: data.org
      })
    },
    {
      name: 'ipify.org',
      url: 'https://api.ipify.org?format=json',
      parser: async (data) => {
        // For ipify, we only get IP, so we need to get location data from ipinfo
        const ipData = data;
        try {
          const ipInfoResponse = await fetch(`https://ipinfo.io/${ipData.ip}`, {
            signal: AbortSignal.timeout(5000)
          });
          if (ipInfoResponse.ok) {
            const ipInfoData = await ipInfoResponse.json();
            if (ipInfoData.loc) {
              const [lat, lon] = ipInfoData.loc.split(',').map(Number);
              return {
                country: ipInfoData.country,
                region: ipInfoData.region,
                city: ipInfoData.city,
                lat,
                lon,
                timezone: ipInfoData.timezone,
                isp: ipInfoData.org
              };
            }
          }
        } catch (error) {
          // Silent fail, return empty object
        }
        return {};
      }
    }
    // Removed ip-api.com due to persistent 403 rate limiting errors
  ];

  // Try each service in order
  for (const service of geolocationServices) {
    try {
      // Skip the original service that failed
      if (originalRequest.url.includes(service.name)) {
        continue;
      }

      const response = await fetch(service.url, {
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        let parsedData;

        if (typeof service.parser === 'function') {
          parsedData = await service.parser(data);
        } else {
          parsedData = data;
        }

        // Create a successful response with the geolocation data
        return new Response(JSON.stringify(parsedData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Geolocation-Source': service.name
          }
        });
      }
    } catch (error) {
      console.warn(`Geolocation service ${service.name} failed:`, error.message);
      // Continue to next service
    }
  }

  // If all services fail, return a 503 error
  return new Response(JSON.stringify({ error: 'All geolocation services unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Add periodic cleanup of pending requests to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const timeout = 60000; // 1 minute timeout

  for (const [key, promise] of pendingRequests.entries()) {
    // We can't directly check when a promise was created, so we'll use a heuristic
    // If we have too many pending requests, start cleaning up older ones
    if (pendingRequests.size > 50) {
      console.log('Cleaning up old pending request:', key);
      pendingRequests.delete(key);
    }
  }
}, 30000); // Check every 30 seconds

