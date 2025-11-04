const CACHE_NAME = 'web3-social-v3';
const STATIC_CACHE = 'static-v3';
const DYNAMIC_CACHE = 'dynamic-v3';
const IMAGE_CACHE = 'images-v3';
const PERFORMANCE_CACHE = 'performance-v2';

// Enhanced request deduplication and rate limiting
const pendingRequests = new Map();
const failedRequests = new Map();
const requestCounts = new Map();
// Development mode detection
const isDevelopment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = isDevelopment ? 200 : 50; // Reduced to prevent rate limiting
const BACKOFF_MULTIPLIER = 2; // Increased backoff
const MAX_BACKOFF_TIME = 300000; // 10 minutes max backoff

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/offline.html',
  '/test-performance-optimization',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other critical static assets
];

// Performance optimization assets
const PERFORMANCE_ASSETS = [
  '/api/performance/metrics',
  '/api/performance/optimize',
  '/api/analytics/track/event',
  '/api/content-performance'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/posts',
  '/api/communities',
  '/api/users',
  '/api/feed',
  '/api/profiles',
  '/api/reputation',
  '/api/tips',
  '/api/follow',
  '/api/search'
];

// Install event - cache static assets with graceful failure handling
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
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
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
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
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
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
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImage(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isAPI(request)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else if (isNavigation(request)) {
    event.respondWith(navigationHandler(request));
  } else {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

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
        const responseToCache = networkResponse.clone();
        await cache.put(request, responseToCache);
      } catch (cacheError) {
        console.warn('Failed to cache static asset:', cacheError);
        // Continue serving the response even if caching fails
      }
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

// Network first strategy - for API calls with enhanced deduplication and rate limiting
async function networkFirst(request, cacheName) {
  const requestKey = `${request.method}:${request.url}`;
  const now = Date.now();
  
  // Rate limiting check
  if (!checkRateLimit(requestKey, now)) {
    console.log('Rate limit exceeded for:', requestKey);
    return await getCachedResponse(request, cacheName);
  }
  
  // Check if request recently failed with exponential backoff
  const failureInfo = failedRequests.get(requestKey);
  if (failureInfo) {
    const backoffTime = Math.min(
      30000 * Math.pow(BACKOFF_MULTIPLIER, failureInfo.attempts - 1),
      MAX_BACKOFF_TIME
    );
    
    if (now - failureInfo.lastFailure < backoffTime) {
      console.log(`Backing off request for ${backoffTime}ms:`, requestKey);
      return await getCachedResponse(request, cacheName);
    }
  }
  
  // Check if request is already pending
  if (pendingRequests.has(requestKey)) {
    console.log('Request already pending, waiting for result:', requestKey);
    try {
      const sharedResponse = await pendingRequests.get(requestKey);
      // Check if response body is already consumed
      if (sharedResponse.bodyUsed) {
        console.warn('Shared response body already consumed, falling back to cache');
        return await getCachedResponse(request, cacheName);
      }
      // Clone the response for this caller to avoid body locked errors
      return sharedResponse.clone();
    } catch (error) {
      console.warn('Failed to clone shared response, falling back to cache:', error);
      return await getCachedResponse(request, cacheName);
    }
  }
  
  // Create promise for this request
  const requestPromise = performNetworkRequest(request, cacheName, requestKey);
  pendingRequests.set(requestKey, requestPromise);
  
  try {
    const result = await requestPromise;
    pendingRequests.delete(requestKey);
    return result;
  } catch (error) {
    pendingRequests.delete(requestKey);
    throw error;
  }
}

async function performNetworkRequest(request, cacheName, requestKey) {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
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
        const cache = await caches.open(cacheName);
        await cache.put(request, responseToCache);
        
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
      // Track failure with exponential backoff
      const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
      failureInfo.attempts += 1;
      failureInfo.lastFailure = Date.now();
      failedRequests.set(requestKey, failureInfo);
      
      console.warn(`Request failed with status ${networkResponse.status}:`, requestKey);
      
      // In development, don't aggressively cache 503 errors
      if (isDevelopment && networkResponse.status === 503) {
        // Don't track 503 errors as aggressively in development
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
    console.log('Network failed, trying cache:', error);
    
    // Track failure with exponential backoff
    const failureInfo = failedRequests.get(requestKey) || { attempts: 0, lastFailure: 0 };
    failureInfo.attempts += 1;
    failureInfo.lastFailure = Date.now();
    failedRequests.set(requestKey, failureInfo);
    
    return await getCachedResponse(request, cacheName);
  }
}

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
    if (isNavigation(request)) {
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
    
    return new Response('Content not available offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (error) {
    console.error('Failed to get cached response:', error);
    return await handleCacheFailure(request, error);
  }
}

// Navigation handler - for page requests
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
    
    // Return dashboard as fallback for SPA
    return cache.match('/dashboard') || 
           cache.match('/') ||
           new Response('Offline', { status: 503 });
  }
}

// Background cache update
async function updateCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Handle placehold.co requests with local SVG placeholders
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

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isImage(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/);
}

function isAPI(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         CACHEABLE_APIS.some(api => url.pathname.startsWith(api));
}

function isNavigation(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'post-sync') {
    event.waitUntil(syncPosts());
  } else if (event.tag === 'reaction-sync') {
    event.waitUntil(syncReactions());
  }
});

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
        const response = await fetch(`/api/posts/${reaction.postId}/reactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

// IndexedDB helpers (simplified)
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineData', 1);
    
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
    };
  });
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

// Rate limiting helper function
function checkRateLimit(requestKey, now) {
  // Skip rate limiting in development mode
  if (isDevelopment) {
    return true;
  }

  const endpoint = requestKey.split(':')[1].split('?')[0]; // Extract endpoint without query params

  // Skip rate limiting for placeholder endpoints
  if (endpoint.includes('/api/placeholder')) {
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
        await cache.put(asset, response);
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
    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, PERFORMANCE_CACHE];
    
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
  if (isNavigation(request)) {
    try {
      return await caches.match('/offline.html') || 
             new Response('You are offline', { 
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
  
  return new Response('Content not available', { 
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
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

console.log('Service Worker loaded with enhanced caching and graceful failure handling');