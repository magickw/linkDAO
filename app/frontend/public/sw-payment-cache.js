/**
 * Service Worker for Payment Method Prioritization Cache
 * Handles offline caching and background sync for payment data
 */

const CACHE_NAME = 'payment-prioritization-v1';
const OFFLINE_CACHE_NAME = 'payment-prioritization-offline-v1';

// Cache strategies configuration
const CACHE_STRATEGIES = {
  'gas-estimate': { maxAge: 30000, strategy: 'stale-while-revalidate' },
  'exchange-rate': { maxAge: 60000, strategy: 'stale-while-revalidate' },
  'user-preferences': { maxAge: 300000, strategy: 'cache-first' },
  'prioritization': { maxAge: 45000, strategy: 'network-first' }
};

// Install event - set up caches
self.addEventListener('install', (event) => {
  console.log('Payment cache service worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME),
      caches.open(OFFLINE_CACHE_NAME)
    ]).then(() => {
      console.log('Payment cache service worker installed');
      self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Payment cache service worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName.startsWith('payment-prioritization-') && 
              cacheName !== CACHE_NAME && 
              cacheName !== OFFLINE_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Payment cache service worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle cache strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // CRITICAL FIX: Bypass ALL navigation requests immediately to prevent blocking
  // This prevents wallet-connected users from being unable to navigate
  if (event.request.mode === 'navigate') {
    console.log('Payment Cache SW: Bypassing navigation request:', event.request.url);
    return; // Early return to bypass service worker completely
  }
  
  // Only handle requests for our cache data
  if (shouldHandleRequest(url)) {
    event.respondWith(handleCacheRequest(event.request));
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'payment-cache-sync') {
    event.waitUntil(syncOfflineData());
  }
});

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_GAS_ESTIMATE':
      event.waitUntil(cacheGasEstimate(payload.key, payload.data));
      break;
    case 'CACHE_EXCHANGE_RATE':
      event.waitUntil(cacheExchangeRate(payload.key, payload.data));
      break;
    case 'CACHE_USER_PREFERENCES':
      event.waitUntil(cacheUserPreferences(payload.key, payload.data));
      break;
    case 'CACHE_PRIORITIZATION_RESULTS':
      event.waitUntil(cachePrioritizationResults(payload.key, payload.data));
      break;
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheType));
      break;
    case 'CLEANUP_EXPIRED':
      event.waitUntil(cleanupExpiredEntries());
      break;
  }
});

// Helper functions

function shouldHandleRequest(url) {
  // Handle requests for cached payment data
  return url.pathname.includes('gas-estimate') ||
         url.pathname.includes('exchange-rate') ||
         url.pathname.includes('user-preferences') ||
         url.pathname.includes('prioritization');
}

async function handleCacheRequest(request) {
  const url = new URL(request.url);
  const cacheKey = getCacheKeyFromUrl(url);
  const strategy = getCacheStrategy(cacheKey);
  
  switch (strategy.strategy) {
    case 'cache-first':
      return handleCacheFirst(request, cacheKey, strategy);
    case 'network-first':
      return handleNetworkFirst(request, cacheKey, strategy);
    case 'stale-while-revalidate':
      return handleStaleWhileRevalidate(request, cacheKey, strategy);
    default:
      return fetch(request);
  }
}

async function handleCacheFirst(request, cacheKey, strategy) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(cacheKey);
  
  if (cachedResponse) {
    const cachedData = await cachedResponse.json();
    const age = Date.now() - cachedData.timestamp;
    
    if (age < strategy.maxAge) {
      return cachedResponse;
    }
  }
  
  // Cache miss or expired, try network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed, return stale cache if available
    return cachedResponse || new Response(JSON.stringify({ error: 'Data unavailable offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleNetworkFirst(request, cacheKey, strategy) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(JSON.stringify({ error: 'Data unavailable offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleStaleWhileRevalidate(request, cacheKey, strategy) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(cacheKey);
  
  // Start network request in background
  const networkPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      await cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);
  
  // Return cached response immediately if available
  if (cachedResponse) {
    const cachedData = await cachedResponse.json();
    const age = Date.now() - cachedData.timestamp;
    
    if (age < strategy.maxAge) {
      // Fresh cache, but still update in background
      networkPromise;
      return cachedResponse;
    }
  }
  
  // Wait for network response if cache is stale or missing
  const networkResponse = await networkPromise;
  return networkResponse || cachedResponse || new Response(JSON.stringify({ error: 'Data unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

function getCacheKeyFromUrl(url) {
  // Extract cache key from URL pathname
  const pathParts = url.pathname.split('/');
  return pathParts[pathParts.length - 1];
}

function getCacheStrategy(cacheKey) {
  for (const [key, strategy] of Object.entries(CACHE_STRATEGIES)) {
    if (cacheKey.includes(key)) {
      return strategy;
    }
  }
  return { maxAge: 60000, strategy: 'network-first' };
}

async function cacheGasEstimate(key, data) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = `gas-estimate-${key}`;
  
  const response = new Response(JSON.stringify({
    data,
    timestamp: Date.now(),
    type: 'gas-estimate'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put(cacheKey, response);
}

async function cacheExchangeRate(key, data) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = `exchange-rate-${key}`;
  
  const response = new Response(JSON.stringify({
    data,
    timestamp: Date.now(),
    type: 'exchange-rate'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put(cacheKey, response);
}

async function cacheUserPreferences(key, data) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = `user-preferences-${key}`;
  
  const response = new Response(JSON.stringify({
    data,
    timestamp: Date.now(),
    type: 'user-preferences'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put(cacheKey, response);
  
  // Also store in offline cache
  const offlineCache = await caches.open(OFFLINE_CACHE_NAME);
  await offlineCache.put(`offline-${cacheKey}`, response.clone());
}

async function cachePrioritizationResults(key, data) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = `prioritization-${key}`;
  
  const response = new Response(JSON.stringify({
    data,
    timestamp: Date.now(),
    type: 'prioritization-results'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  await cache.put(cacheKey, response);
}

async function clearCache(cacheType) {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  
  const deletePromises = keys
    .filter(request => !cacheType || request.url.includes(cacheType))
    .map(request => cache.delete(request));
  
  await Promise.all(deletePromises);
}

async function cleanupExpiredEntries() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const now = Date.now();
  
  for (const request of keys) {
    try {
      const response = await cache.match(request);
      if (!response) continue;
      
      const cachedData = await response.json();
      const cacheKey = getCacheKeyFromUrl(new URL(request.url));
      const strategy = getCacheStrategy(cacheKey);
      
      if (now - cachedData.timestamp > strategy.maxAge * 2) { // Double the max age for cleanup
        await cache.delete(request);
      }
    } catch (error) {
      // Invalid cache entry, delete it
      await cache.delete(request);
    }
  }
}

async function syncOfflineData() {
  // Sync offline data when connection is restored
  const offlineCache = await caches.open(OFFLINE_CACHE_NAME);
  const keys = await offlineCache.keys();
  
  for (const request of keys) {
    try {
      const response = await offlineCache.match(request);
      if (!response) continue;
      
      const cachedData = await response.json();
      
      // Try to sync with server (this would be implemented based on your API)
      // For now, just move to main cache
      const mainCache = await caches.open(CACHE_NAME);
      const mainKey = request.url.replace('offline-', '');
      await mainCache.put(mainKey, response.clone());
      
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }
}

console.log('Payment cache service worker loaded');