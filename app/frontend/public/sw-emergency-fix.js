
/**
 * Emergency Service Worker Fix
 * Addresses caching issues and network failures
 */

const CACHE_NAME = 'linkdao-emergency-v1';
const EMERGENCY_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('🔧 Emergency service worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching emergency resources');
        return cache.addAll(EMERGENCY_CACHE_URLS);
      })
      .catch((error) => {
        console.error('❌ Failed to cache emergency resources:', error);
        // Continue installation even if caching fails
      })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Emergency service worker activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - network first with fallback
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
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // If successful, return the response
        if (response.ok) {
          return response;
        }
        
        // If not successful, try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📦 Serving from cache:', request.url);
              return cachedResponse;
            }
            
            // Return a generic error response
            return new Response(
              JSON.stringify({
                success: false,
                error: {
                  code: 'NETWORK_ERROR',
                  message: 'Network request failed and no cached version available',
                  details: {
                    userFriendlyMessage: 'Unable to load content. Please check your connection.',
                    timestamp: new Date().toISOString()
                  }
                }
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
          });
      })
      .catch((error) => {
        console.error('❌ Fetch failed:', error);
        
        // Try to serve from cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📦 Serving from cache after network error:', request.url);
              return cachedResponse;
            }
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html') || new Response(
                '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            }
            
            // Return error response for other requests
            return new Response(
              JSON.stringify({
                success: false,
                error: {
                  code: 'OFFLINE_ERROR',
                  message: 'You are offline and no cached version is available',
                  details: {
                    userFriendlyMessage: 'Please check your internet connection and try again.',
                    timestamp: new Date().toISOString()
                  }
                }
              }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
          });
      })
  );
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🔧 Emergency service worker loaded');
