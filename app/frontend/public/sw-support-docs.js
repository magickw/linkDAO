/**
 * Service Worker for Support Documentation
 * Provides offline access to critical documents and reliability features
 */

const CACHE_NAME = 'support-docs-v1';
const OFFLINE_CACHE = 'support-docs-offline-v1';
const CRITICAL_DOCS_CACHE = 'support-docs-critical-v1';

// Critical documents that should always be available offline
const CRITICAL_DOCUMENTS = [
  '/docs/support/beginners-guide.md',
  '/docs/support/troubleshooting-guide.md',
  '/docs/support/security-guide.md',
  '/docs/support/quick-faq.md'
];

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/support',
  '/offline.html',
  '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/support/translations/en',
  '/api/support/cultural-adaptations/en'
];

/**
 * Install event - cache critical resources
 */
self.addEventListener('install', (event) => {
  console.log('Support Docs SW: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache critical documents
      caches.open(CRITICAL_DOCS_CACHE).then((cache) => {
        return cache.addAll(CRITICAL_DOCUMENTS);
      }),
      
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache API endpoints
      caches.open(OFFLINE_CACHE).then((cache) => {
        return Promise.all(
          API_ENDPOINTS.map(url => 
            fetch(url)
              .then(response => cache.put(url, response))
              .catch(err => console.log('Failed to cache:', url, err))
          )
        );
      })
    ]).then(() => {
      console.log('Support Docs SW: Installation complete');
      return self.skipWaiting();
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('Support Docs SW: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== OFFLINE_CACHE && 
              cacheName !== CRITICAL_DOCS_CACHE) {
            console.log('Support Docs SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Support Docs SW: Activation complete');
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL FIX: Bypass ALL navigation requests immediately to prevent blocking
  // This prevents wallet-connected users from being unable to navigate
  if (request.mode === 'navigate') {
    console.log('Support Docs SW: Bypassing navigation request:', request.url);
    return; // Early return to bypass service worker completely
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isCriticalDocument(request.url)) {
    event.respondWith(handleCriticalDocument(request));
  } else if (isDocumentRequest(request.url)) {
    event.respondWith(handleDocumentRequest(request));
  } else if (isAPIRequest(request.url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

/**
 * Handle critical documents - Cache First strategy
 */
async function handleCriticalDocument(request) {
  try {
    const cachedResponse = await caches.match(request, { cacheName: CRITICAL_DOCS_CACHE });
    
    if (cachedResponse) {
      // Update cache in background
      updateCacheInBackground(request, CRITICAL_DOCS_CACHE);
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    const cache = await caches.open(CRITICAL_DOCS_CACHE);
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.error('Critical document fetch failed:', error);
    return createOfflineResponse('Critical document unavailable offline');
  }
}

/**
 * Handle regular documents - Network First strategy
 */
async function handleDocumentRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Add offline indicator header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    return createOfflineResponse('Document not available offline');
  }
}

/**
 * Handle API requests - Cache First with network update
 */
async function handleAPIRequest(request) {
  try {
    const cachedResponse = await caches.match(request, { cacheName: OFFLINE_CACHE });
    
    if (cachedResponse) {
      // Update cache in background
      updateCacheInBackground(request, OFFLINE_CACHE);
      return cachedResponse;
    }
    
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(OFFLINE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return cached version or offline response
    const cachedResponse = await caches.match(request, { cacheName: OFFLINE_CACHE });
    return cachedResponse || createOfflineResponse('API unavailable offline');
  }
}

/**
 * Handle static assets - Cache First strategy
 */
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request, { cacheName: CACHE_NAME });
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return createOfflineResponse('Asset not available offline');
  }
}

/**
 * Handle generic requests - Network First strategy
 */
async function handleGenericRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || createOfflineResponse('Content not available offline');
  }
}

/**
 * Update cache in background
 */
function updateCacheInBackground(request, cacheName) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        return caches.open(cacheName).then(cache => {
          cache.put(request, response);
        });
      }
    })
    .catch(error => {
      console.log('Background cache update failed:', error);
    });
}

/**
 * Create offline response
 */
function createOfflineResponse(message) {
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: message,
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'X-Served-From': 'service-worker'
      }
    }
  );
}

/**
 * Helper functions to identify request types
 */
function isCriticalDocument(url) {
  return CRITICAL_DOCUMENTS.some(doc => url.includes(doc));
}

function isDocumentRequest(url) {
  return url.includes('/docs/support/') || url.includes('.md');
}

function isAPIRequest(url) {
  return url.includes('/api/support/');
}

function isStaticAsset(url) {
  return url.includes('.css') || 
         url.includes('.js') || 
         url.includes('.png') || 
         url.includes('.jpg') || 
         url.includes('.svg') ||
         url.includes('/manifest.json');
}

/**
 * Background sync for document updates
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'document-sync') {
    event.waitUntil(syncDocuments());
  }
});

/**
 * Sync documents when online
 */
async function syncDocuments() {
  try {
    console.log('Support Docs SW: Syncing documents...');
    
    // Get all cached documents
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    // Update each document
    for (const request of requests) {
      if (isDocumentRequest(request.url)) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response);
          }
        } catch (error) {
          console.log('Failed to sync document:', request.url);
        }
      }
    }
    
    console.log('Support Docs SW: Document sync complete');
  } catch (error) {
    console.error('Support Docs SW: Document sync failed:', error);
  }
}

/**
 * Handle push notifications for document updates
 */
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    if (data.type === 'document-update') {
      event.waitUntil(handleDocumentUpdate(data));
    }
  }
});

/**
 * Handle document update notifications
 */
async function handleDocumentUpdate(data) {
  try {
    // Invalidate cached document
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(data.documentUrl);
    
    // Show notification
    await self.registration.showNotification('Document Updated', {
      body: `${data.documentTitle} has been updated`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: 'document-update',
      data: {
        url: data.documentUrl
      }
    });
  } catch (error) {
    console.error('Failed to handle document update:', error);
  }
}

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});

/**
 * Message handling for communication with main thread
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_DOCUMENT':
      cacheDocument(payload.url);
      break;
      
    case 'CLEAR_CACHE':
      clearCache();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

/**
 * Cache a specific document
 */
async function cacheDocument(url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, response);
      console.log('Document cached:', url);
    }
  } catch (error) {
    console.error('Failed to cache document:', url, error);
  }
}

/**
 * Clear all caches
 */
async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Get cache status
 */
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const status = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      status[cacheName] = keys.length;
    }
    
    return status;
  } catch (error) {
    console.error('Failed to get cache status:', error);
    return {};
  }
}