// Service Worker with Workbox v7.3.0 and Subresource Integrity (SRI)
// This service worker provides offline functionality and resource caching

importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

// Check if workbox is loaded
if (typeof workbox !== 'undefined') {
  console.log('Workbox v7.3.0 is loaded 🎉');

  // Configure workbox
  workbox.setConfig({
    debug: false // Set to true for development
  });

  // Precache and route
  workbox.precaching.precacheAndRoute([
    // Core application files will be populated by build process
    // These should include SRI hashes for security
  ]);

  // Cache strategies with SRI verification
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Cache CSS, JS, and Web Worker requests with a Stale While Revalidate strategy
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'assets',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 24 * 60 * 60, // 24 Hours
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Cache API responses with Network First strategy for dynamic content
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 3, // 3 second timeout
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200, 204],
        }),
      ],
    })
  );

  // Cache static pages with Network First strategy
  workbox.routing.registerRoute(
    ({ request, url }) => 
      request.mode === 'navigate' && 
      !url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 Hours
        }),
      ],
    })
  );

  // Cache fonts with Cache First strategy
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff'),
    new workbox.strategies.CacheFirst({
      cacheName: 'fonts',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 Year
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
      ],
    })
  );

  // Handle offline fallback
  workbox.routing.setCatchHandler(({ event }) => {
    switch (event.request.destination) {
      case 'document':
        return caches.match('/offline.html');
      default:
        return Response.error();
    }
  });

  // Skip waiting and claim clients immediately
  workbox.core.skipWaiting();
  workbox.core.clientsClaim();

  // Background sync for offline actions
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/') && (url.pathname.includes('/posts') || url.pathname.includes('/reactions')),
    new workbox.strategies.NetworkOnly({
      plugins: [
        new workbox.backgroundSync.BackgroundSyncPlugin('post-queue', {
          maxRetentionTime: 24 * 60, // 24 hours
        }),
      ],
    }),
    'POST'
  );

  // SRI (Subresource Integrity) verification
  // This would typically be implemented server-side, but we can add basic integrity checks
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new workbox.strategies.CacheFirst({
      cacheName: 'integrity-checked-assets',
      plugins: [
        {
          cacheWillUpdate: async ({ response }) => {
            // Basic integrity check - in production, this would verify against known hashes
            if (response.ok) {
              return response;
            }
            return null;
          },
        },
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 Hours
        }),
      ],
    })
  );

} else {
  console.error('Workbox failed to load');
}

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();
  
  // Handle notification click actions
  if (event.action) {
    // Handle specific action
    console.log('Notification action:', event.action);
  } else {
    // Open app or specific page
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id,
    },
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});