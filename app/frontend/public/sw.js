const CACHE_NAME = 'web3-social-v2';
const STATIC_CACHE = 'static-v2';
const DYNAMIC_CACHE = 'dynamic-v2';
const IMAGE_CACHE = 'images-v2';
const PERFORMANCE_CACHE = 'performance-v1';

// Enhanced request deduplication and rate limiting
const pendingRequests = new Map();
const failedRequests = new Map();
const requestCounts = new Map();
// Development mode detection
const isDevelopment = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = isDevelopment ? 50 : 5; // More lenient in development
const BACKOFF_MULTIPLIER = 2;
const MAX_BACKOFF_TIME = 300000; // 5 minutes max backoff

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/offline.html',
  '/test-performance-optimization',
  // Add other critical static assets
];

// Performance optimization assets
const PERFORMANCE_ASSETS = [
  '/api/performance/metrics',
  '/api/performance/optimize'
];

// API endpoints to cache
const CACHEABLE_APIS = [
  '/api/posts',
  '/api/communities',
  '/api/users',
  '/api/feed'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
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

// Cache first strategy - for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      updateCache(request, cacheName);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      try {
        const responseToCache = networkResponse.clone();
        await cache.put(request, responseToCache);
      } catch (cacheError) {
        console.warn('Failed to cache static asset:', cacheError);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline content not available', { status: 503 });
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
    
    // Return offline page for navigation requests
    if (isNavigation(request)) {
      return caches.match('/offline.html') || 
             new Response('You are offline', { status: 503 });
    }
    
    return new Response('Content not available offline', { status: 503 });
  } catch (error) {
    console.error('Failed to get cached response:', error);
    return new Response('Cache error', { status: 503 });
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
  let url = '/dashboard';
  
  if (data.postId) {
    url = `/dashboard/post/${data.postId}`;
  } else if (data.communityId) {
    url = `/dashboard/community/${data.communityId}`;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// Rate limiting helper function
function checkRateLimit(requestKey, now) {
  const endpoint = requestKey.split(':')[1].split('?')[0]; // Extract endpoint without query params
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

console.log('Service Worker loaded with enhanced request management');