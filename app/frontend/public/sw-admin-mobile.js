// Mobile Admin Service Worker for Performance Optimization
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `admin-static-${CACHE_VERSION}`;
const API_CACHE = `admin-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `admin-images-${CACHE_VERSION}`;

// Cache configurations
const CACHE_CONFIG = {
  static: {
    name: STATIC_CACHE,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 100
  },
  api: {
    name: API_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50
  },
  images: {
    name: IMAGE_CACHE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 200
  }
};

// Resources to cache on install
const STATIC_RESOURCES = [
  '/admin',
  '/admin/moderation',
  '/admin/analytics',
  '/admin/users',
  '/admin/offline.html',
  '/icons/admin-badge.png',
  '/icons/shield.png',
  '/icons/system.png',
  '/icons/security.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/admin/stats',
  '/api/admin/notifications/count'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Mobile admin service worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_RESOURCES)),
      caches.open(API_CACHE).then(cache => {
        // Pre-cache critical API endpoints
        return Promise.all(
          API_ENDPOINTS.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(() => {
              // Ignore fetch errors during install
            })
          )
        );
      })
    ]).then(() => {
      console.log('Mobile admin service worker installed');
      self.skipWaiting();
    })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Mobile admin service worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!Object.values(CACHE_CONFIG).some(config => cacheName === config.name)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Mobile admin service worker activated');
    })
  );
});

// Fetch event with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on request type
  if (isStaticResource(url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  } else if (isImageRequest(url)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request, STATIC_CACHE));
  }
});

// Cache-first strategy (good for static resources)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !isExpired(cachedResponse, CACHE_CONFIG[getCacheType(cacheName)])) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    
    // Return cached version even if expired as fallback
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/admin/offline.html');
    }
    
    throw error;
  }
}

// Network-first strategy (good for API requests)
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      await cache.put(request, addTimestamp(responseToCache));
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add header to indicate this is from cache
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Start network request in background
  const networkResponsePromise = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, addTimestamp(response.clone()));
    }
    return response;
  }).catch(() => {
    // Ignore network errors in background
  });
  
  // Return cached version immediately if available
  if (cachedResponse && !isExpired(cachedResponse, CACHE_CONFIG[getCacheType(cacheName)])) {
    return cachedResponse;
  }
  
  // Wait for network if no cache or expired
  try {
    return await networkResponsePromise;
  } catch (error) {
    // Return stale cache as fallback
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Helper functions
function isStaticResource(url) {
  return url.pathname.startsWith('/admin') && 
         !url.pathname.startsWith('/api/') &&
         (url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.html') ||
          url.pathname === '/admin' ||
          url.pathname.startsWith('/admin/') && !url.pathname.includes('.'));
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/admin/');
}

function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname) ||
         url.pathname.startsWith('/icons/');
}

function getCacheType(cacheName) {
  if (cacheName.includes('static')) return 'static';
  if (cacheName.includes('api')) return 'api';
  if (cacheName.includes('images')) return 'images';
  return 'static';
}

function addTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Cached-At', new Date().toISOString());
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers
  });
}

function isExpired(response, config) {
  const cachedAt = response.headers.get('X-Cached-At');
  if (!cachedAt) return false;
  
  const age = Date.now() - new Date(cachedAt).getTime();
  return age > config.maxAge;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'admin-actions-sync') {
    event.waitUntil(syncAdminActions());
  }
});

async function syncAdminActions() {
  try {
    // Get pending actions from IndexedDB or send to main thread
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_BACKGROUND',
        data: { tag: 'admin-actions-sync' }
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Message handling
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_ADMIN_DATA':
      cacheAdminData(data.key, data.value, data.cacheName);
      break;
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName);
      break;
      
    case 'CLEANUP_CACHES':
      cleanupCaches();
      break;
      
    case 'PRELOAD_RESOURCES':
      preloadResources(data.urls);
      break;
  }
});

async function cacheAdminData(key, value, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const response = new Response(JSON.stringify(value), {
      headers: {
        'Content-Type': 'application/json',
        'X-Cached-At': new Date().toISOString()
      }
    });
    
    await cache.put(key, response);
    
    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        data: { key, cacheName }
      });
    });
  } catch (error) {
    console.error('Failed to cache admin data:', error);
  }
}

async function clearCache(cacheName) {
  try {
    await caches.delete(cacheName);
    console.log('Cache cleared:', cacheName);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

async function cleanupCaches() {
  try {
    for (const [type, config] of Object.entries(CACHE_CONFIG)) {
      const cache = await caches.open(config.name);
      const requests = await cache.keys();
      
      // Remove expired entries
      const now = Date.now();
      for (const request of requests) {
        const response = await cache.match(request);
        if (response && isExpired(response, config)) {
          await cache.delete(request);
        }
      }
      
      // Limit cache size
      const remainingRequests = await cache.keys();
      if (remainingRequests.length > config.maxEntries) {
        const excess = remainingRequests.slice(config.maxEntries);
        for (const request of excess) {
          await cache.delete(request);
        }
      }
    }
    
    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}

async function preloadResources(urls) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, addTimestamp(response));
        }
      } catch (error) {
        console.warn(`Failed to preload ${url}:`, error);
      }
    }
    
    console.log('Resources preloaded:', urls.length);
  } catch (error) {
    console.error('Preload failed:', error);
  }
}

// Performance monitoring
self.addEventListener('fetch', (event) => {
  // Track performance metrics
  const startTime = performance.now();
  
  event.respondWith(
    handleRequest(event.request).then(response => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Send performance data to clients
      if (duration > 1000) { // Only track slow requests
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PERFORMANCE_METRIC',
              data: {
                url: event.request.url,
                duration,
                timestamp: Date.now()
              }
            });
          });
        });
      }
      
      return response;
    })
  );
});

async function handleRequest(request) {
  // Use the existing fetch handler logic
  return fetch(request);
}