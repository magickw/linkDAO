/**
 * Enhanced Service Worker with Workbox Integration
 * Provides modern caching strategies and offline capabilities
 */

// Wrap the entire service worker in a try-catch to prevent evaluation failures
try {
  // Import Workbox modules with error handling
  try {
    importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js');
  } catch (error) {
    console.error('Failed to load Workbox from CDN, using fallback service worker:', error);
    // Register a simple service worker without Workbox
    self.addEventListener('install', () => {
      console.log('Fallback service worker installed');
      self.skipWaiting();
    });

    self.addEventListener('activate', () => {
      console.log('Fallback service worker activated');
      return self.clients.claim();
    });

    self.addEventListener('fetch', (event) => {
      // Let the browser handle all requests normally
      event.respondWith(fetch(event.request));
    });

    throw new Error('Using fallback service worker');
  }

  if (workbox) {
    console.log('Workbox loaded successfully');
  
  // Configure Workbox
  workbox.setConfig({
    debug: false,
    modulePathPrefix: 'https://storage.googleapis.com/workbox-cdn/releases/7.3.0/'
  });

  // Enable navigation preload
  workbox.navigationPreload.enable();

  // Precache app shell
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || [
    { url: '/', revision: '1' },
    { url: '/dashboard', revision: '1' },
    { url: '/communities', revision: '1' },
    { url: '/marketplace', revision: '1' },
    { url: '/offline.html', revision: '1' },
    { url: '/manifest.json', revision: '1' }
  ]);

  // Enhanced cache strategies for different content types
  
  // Feed content - NetworkFirst with background refresh and predictive preloading
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/feed'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'feed-cache-v1',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 300, // 5 minutes
          purgeOnQuotaError: true
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.broadcastUpdate.BroadcastUpdatePlugin({
          channelName: 'feed-updates',
          options: {
            headersToCheck: ['etag', 'last-modified']
          }
        }),
        // Custom plugin for predictive preloading
        {
          cacheDidUpdate: async ({ cacheName, request, oldResponse, newResponse }) => {
            if (newResponse && newResponse.ok) {
              try {
                const feedData = await newResponse.clone().json();
                if (feedData.items) {
                  // Trigger predictive preloading for media thumbnails
                  self.postMessage({
                    type: 'FEED_PRELOAD_TRIGGER',
                    data: { items: feedData.items }
                  });
                }
              } catch (error) {
                console.warn('Failed to trigger feed preload:', error);
              }
            }
          }
        }
      ]
    })
  );

  // Community content - StaleWhileRevalidate with bundled preloading
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/communities'),
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'communities-cache-v1',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 600, // 10 minutes
          purgeOnQuotaError: true
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        // Custom plugin for community asset preloading
        {
          cacheDidUpdate: async ({ cacheName, request, oldResponse, newResponse }) => {
            if (newResponse && newResponse.ok) {
              try {
                const communityData = await newResponse.clone().json();
                if (communityData.relatedCommunities) {
                  // Trigger bundled preloading for related communities
                  self.postMessage({
                    type: 'COMMUNITY_PRELOAD_TRIGGER',
                    data: { 
                      communityId: communityData.id,
                      relatedCommunities: communityData.relatedCommunities 
                    }
                  });
                }
              } catch (error) {
                console.warn('Failed to trigger community preload:', error);
              }
            }
          }
        }
      ]
    })
  );

  // Marketplace listings - NetworkFirst for inventory/pricing sensitivity
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/marketplace') && 
                 (url.pathname.includes('/products') || url.pathname.includes('/listings')),
    new workbox.strategies.NetworkFirst({
      cacheName: 'marketplace-listings-v1',
      networkTimeoutSeconds: 2,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 500,
          maxAgeSeconds: 120, // 2 minutes for listings
          purgeOnQuotaError: true
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        // Custom plugin for critical image preloading
        {
          cacheDidUpdate: async ({ cacheName, request, oldResponse, newResponse }) => {
            if (newResponse && newResponse.ok) {
              try {
                const listingsData = await newResponse.clone().json();
                if (listingsData.products) {
                  // Trigger critical image preloading
                  self.postMessage({
                    type: 'MARKETPLACE_PRELOAD_TRIGGER',
                    data: { products: listingsData.products }
                  });
                }
              } catch (error) {
                console.warn('Failed to trigger marketplace preload:', error);
              }
            }
          }
        }
      ]
    })
  );

  // Marketplace pricing - NetworkFirst with ETag validation
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('/pricing'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'marketplace-pricing-v1',
      networkTimeoutSeconds: 1,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 1000,
          maxAgeSeconds: 300, // 5 minutes
          purgeOnQuotaError: true
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200, 304] // Include 304 for ETag validation
        }),
        // Custom plugin for ETag handling
        {
          requestWillFetch: async ({ request }) => {
            // Add ETag header if available in cache
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              const etag = cachedResponse.headers.get('etag');
              if (etag) {
                const headers = new Headers(request.headers);
                headers.set('If-None-Match', etag);
                return new Request(request, { headers });
              }
            }
            return request;
          }
        }
      ]
    })
  );

  // Marketplace inventory - NetworkFirst with very short timeout
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('/inventory'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'marketplace-inventory-v1',
      networkTimeoutSeconds: 1,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 1000,
          maxAgeSeconds: 60, // 1 minute
          purgeOnQuotaError: true
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Messaging - NetworkFirst with conversation caching
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/messages'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'messaging-cache-v1',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 1000,
          maxAgeSeconds: 300, // 5 minutes
          purgeOnQuotaError: true
        }),
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Static assets - CacheFirst
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'script' ||
                     request.destination === 'style' ||
                     request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'static-assets-v1',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 86400, // 24 hours
          purgeOnQuotaError: true
        })
      ]
    })
  );

  // Images - CacheFirst with longer expiration
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache-v1',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 86400, // 24 hours
          purgeOnQuotaError: true
        })
      ]
    })
  );

  // Navigation requests - NetworkFirst with offline fallback
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'navigation-cache-v1',
      networkTimeoutSeconds: 3,
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        })
      ]
    })
  );

  // Enhanced Background sync for offline actions with multiple queues
  const postsBgSync = new workbox.backgroundSync.BackgroundSync('posts-sync', {
    maxRetentionTime: 24 * 60 // 24 hours
  });
  
  const commentsBgSync = new workbox.backgroundSync.BackgroundSync('comments-sync', {
    maxRetentionTime: 24 * 60 // 24 hours
  });
  
  const reactionsBgSync = new workbox.backgroundSync.BackgroundSync('reactions-sync', {
    maxRetentionTime: 12 * 60 // 12 hours
  });
  
  const messagesBgSync = new workbox.backgroundSync.BackgroundSync('messages-sync', {
    maxRetentionTime: 48 * 60 // 48 hours for messages
  });
  
  const communityBgSync = new workbox.backgroundSync.BackgroundSync('community-sync', {
    maxRetentionTime: 24 * 60 // 24 hours
  });

  // Register background sync routes for different action types
  workbox.routing.registerRoute(
    ({ url, request }) => 
      request.method === 'POST' && url.pathname.startsWith('/api/posts') && 
      !url.pathname.includes('/comments') && !url.pathname.includes('/reactions'),
    new workbox.strategies.NetworkOnly({
      plugins: [postsBgSync]
    }),
    'POST'
  );
  
  workbox.routing.registerRoute(
    ({ url, request }) => 
      request.method === 'POST' && url.pathname.includes('/comments'),
    new workbox.strategies.NetworkOnly({
      plugins: [commentsBgSync]
    }),
    'POST'
  );
  
  workbox.routing.registerRoute(
    ({ url, request }) => 
      request.method === 'POST' && url.pathname.includes('/reactions'),
    new workbox.strategies.NetworkOnly({
      plugins: [reactionsBgSync]
    }),
    'POST'
  );
  
  workbox.routing.registerRoute(
    ({ url, request }) => 
      request.method === 'POST' && url.pathname.startsWith('/api/messages'),
    new workbox.strategies.NetworkOnly({
      plugins: [messagesBgSync]
    }),
    'POST'
  );
  
  workbox.routing.registerRoute(
    ({ url, request }) => 
      request.method === 'POST' && url.pathname.startsWith('/api/communities'),
    new workbox.strategies.NetworkOnly({
      plugins: [communityBgSync]
    }),
    'POST'
  );

} else {
  console.error('Workbox failed to load');
  
  // Fallback to basic service worker functionality
  const CACHE_NAME = 'fallback-cache-v1';
  
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll([
          '/',
          '/dashboard',
          '/offline.html'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  });
}

// Enhanced message handling for cache strategies
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'CACHE_INVALIDATED':
      handleCacheInvalidation(data.tag, data.keys);
      break;
      
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'FEED_PRELOAD_TRIGGER':
      handleFeedPreload(data);
      break;
      
    case 'COMMUNITY_PRELOAD_TRIGGER':
      handleCommunityPreload(data);
      break;
      
    case 'MARKETPLACE_PRELOAD_TRIGGER':
      handleMarketplacePreload(data);
      break;
      
    case 'SETUP_INVENTORY_UPDATES':
      setupInventoryUpdates(data.productId, data.interval);
      break;
      
    case 'INVALIDATE_BY_TAG':
      handleTagInvalidation(data.tag);
      break;
  }
});

// Handle cache invalidation
async function handleCacheInvalidation(tag, keys) {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      
      if (keys && keys.length > 0) {
        // Remove specific keys
        for (const key of keys) {
          await cache.delete(key);
        }
      } else {
        // Remove all entries matching the tag pattern
        const requests = await cache.keys();
        for (const request of requests) {
          if (request.url.includes(tag)) {
            await cache.delete(request);
          }
        }
      }
    }
    
    console.log(`Cache invalidated for tag: ${tag}`);
  } catch (error) {
    console.error('Cache invalidation failed:', error);
  }
}

// Handle feed preload trigger
async function handleFeedPreload(data) {
  try {
    const { items } = data;
    const mediaUrls = [];
    
    // Extract media URLs from feed items
    for (const item of items.slice(0, 5)) { // Limit to first 5 items
      if (item.thumbnailUrls) {
        mediaUrls.push(...item.thumbnailUrls);
      }
      if (item.mediaUrls) {
        mediaUrls.push(...item.mediaUrls.slice(0, 1)); // First media URL only
      }
    }
    
    // Preload media URLs
    for (const url of mediaUrls.slice(0, 10)) { // Limit total preloads
      try {
        await fetch(url, { mode: 'no-cors' });
        const cache = await caches.open('images-cache-v1');
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`Failed to preload media: ${url}`, error);
      }
    }
    
    console.log(`Preloaded ${mediaUrls.length} feed media items`);
  } catch (error) {
    console.error('Feed preload failed:', error);
  }
}

// Handle community preload trigger
async function handleCommunityPreload(data) {
  try {
    const { communityId, relatedCommunities } = data;
    const assetUrls = [];
    
    // Preload related community data and assets
    for (const relatedId of relatedCommunities.slice(0, 3)) { // Limit to 3 related communities
      try {
        // Fetch community data
        const communityUrl = `/api/communities/${relatedId}`;
        const response = await fetch(communityUrl);
        
        if (response.ok) {
          const cache = await caches.open('communities-cache-v1');
          await cache.put(communityUrl, response.clone());
          
          // Extract asset URLs
          const communityData = await response.json();
          if (communityData.iconUrl) assetUrls.push(communityData.iconUrl);
          if (communityData.bannerUrl) assetUrls.push(communityData.bannerUrl);
        }
      } catch (error) {
        console.warn(`Failed to preload community ${relatedId}:`, error);
      }
    }
    
    // Preload community assets
    const imageCache = await caches.open('images-cache-v1');
    for (const url of assetUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await imageCache.put(url, response);
        }
      } catch (error) {
        console.warn(`Failed to preload asset: ${url}`, error);
      }
    }
    
    console.log(`Preloaded ${relatedCommunities.length} related communities and ${assetUrls.length} assets`);
  } catch (error) {
    console.error('Community preload failed:', error);
  }
}

// Handle marketplace preload trigger
async function handleMarketplacePreload(data) {
  try {
    const { products } = data;
    const criticalImages = [];
    
    // Extract critical images (first image of each product)
    for (const product of products.slice(0, 6)) { // Limit to first 6 products
      if (product.images && product.images.length > 0) {
        const firstImage = product.images[0];
        if (firstImage.url) {
          // Generate responsive image URL for current viewport
          const optimizedUrl = generateResponsiveImageUrl(firstImage.url);
          criticalImages.push(optimizedUrl);
        }
      }
    }
    
    // Preload critical images
    const imageCache = await caches.open('marketplace-images-v1');
    for (const url of criticalImages) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await imageCache.put(url, response);
        }
      } catch (error) {
        console.warn(`Failed to preload critical image: ${url}`, error);
      }
    }
    
    console.log(`Preloaded ${criticalImages.length} critical marketplace images`);
  } catch (error) {
    console.error('Marketplace preload failed:', error);
  }
}

// Setup inventory updates
function setupInventoryUpdates(productId, interval) {
  // Set up periodic inventory updates
  const updateInterval = setInterval(async () => {
    try {
      const inventoryUrl = `/api/marketplace/products/${productId}/inventory`;
      const response = await fetch(inventoryUrl);
      
      if (response.ok) {
        const cache = await caches.open('marketplace-inventory-v1');
        await cache.put(inventoryUrl, response.clone());
        
        // Notify clients about inventory update
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'INVENTORY_UPDATED',
            productId,
            timestamp: Date.now()
          });
        });
      }
    } catch (error) {
      console.warn(`Inventory update failed for product ${productId}:`, error);
    }
  }, interval);
  
  // Store interval ID for cleanup
  self.inventoryUpdateIntervals = self.inventoryUpdateIntervals || new Map();
  self.inventoryUpdateIntervals.set(productId, updateInterval);
}

// Handle tag-based invalidation
async function handleTagInvalidation(tag) {
  try {
    await handleCacheInvalidation(tag);
    
    // Notify clients about cache invalidation
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_INVALIDATED',
        tag,
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Tag invalidation failed:', error);
  }
}

// Generate responsive image URL
function generateResponsiveImageUrl(originalUrl) {
  try {
    const url = new URL(originalUrl);
    
    // Determine optimal width based on viewport (if available)
    const viewportWidth = 800; // Default fallback
    let targetWidth = 600;
    
    if (viewportWidth <= 480) targetWidth = 300;
    else if (viewportWidth <= 768) targetWidth = 600;
    else targetWidth = 1200;
    
    url.searchParams.set('w', targetWidth.toString());
    url.searchParams.set('q', '85'); // Quality
    
    return url.toString();
  } catch (error) {
    return originalUrl;
  }
}

// Enhanced offline page handling
self.addEventListener('fetch', (event) => {
  // CRITICAL FIX: Bypass ALL navigation requests immediately to prevent blocking
  // This prevents wallet-connected users from being unable to navigate
  if (event.request.mode === 'navigate') {
    console.log('Enhanced SW: Bypassing navigation request:', event.request.url);
    return; // Early return to bypass service worker completely
  }
  
  // Handle navigation requests that fail (fallback)
  // This code should never execute due to the early return above
  /*
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
  */
});

// Periodic cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const validCacheNames = [
        'feed-cache-v1',
        'communities-cache-v1',
        'marketplace-cache-v1',
        'messaging-cache-v1',
        'static-assets-v1',
        'images-cache-v1',
        'navigation-cache-v1'
      ];
      
      await Promise.all(
        cacheNames.map(cacheName => {
          if (!validCacheNames.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Claim all clients
      await self.clients.claim();
    })()
  );
});

// Storage quota management
self.addEventListener('activate', (event) => {
  event.waitUntil(checkStorageQuota());
});

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
    } catch (error) {
      console.error('Failed to check storage quota:', error);
    }
  }
}

async function performCacheCleanup() {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      // Remove oldest entries if cache is too large
      if (keys.length > 100) {
        const entriesToRemove = keys.slice(0, keys.length - 100);
        for (const key of entriesToRemove) {
          await cache.delete(key);
        }
      }
    }
    
    console.log('Cache cleanup completed');
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}

// Enhanced sync event handling
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  // Handle different sync tags
  switch (event.tag) {
    case 'posts-sync':
    case 'comments-sync':
    case 'reactions-sync':
    case 'messages-sync':
    case 'community-sync':
    case 'offline-actions-sync':
      event.waitUntil(handleBackgroundSync(event.tag));
      break;
    default:
      console.log('Unknown sync tag:', event.tag);
  }
});

// Handle background sync with network condition awareness
async function handleBackgroundSync(tag) {
  try {
    console.log(`Processing background sync for tag: ${tag}`);
    
    // Check network conditions
    const networkInfo = await getNetworkCondition();
    if (!networkInfo.suitable) {
      console.log('Network conditions not suitable for sync, postponing');
      throw new Error('Network conditions not suitable');
    }
    
    // Notify main thread about sync event
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_EVENT',
        data: { tag, timestamp: Date.now() }
      });
    });
    
    // Process the sync based on tag
    await processSync(tag);
    
    console.log(`Background sync completed for tag: ${tag}`);
  } catch (error) {
    console.error(`Background sync failed for tag ${tag}:`, error);
    throw error; // Re-throw to trigger retry
  }
}

// Process sync based on tag
async function processSync(tag) {
  // The actual processing will be handled by the main thread
  // This is just a placeholder for service worker-specific sync logic
  
  switch (tag) {
    case 'posts-sync':
      await processPendingPosts();
      break;
    case 'comments-sync':
      await processPendingComments();
      break;
    case 'reactions-sync':
      await processPendingReactions();
      break;
    case 'messages-sync':
      await processPendingMessages();
      break;
    case 'community-sync':
      await processPendingCommunityActions();
      break;
    default:
      await processAllPendingActions();
  }
}

// Get network condition information
async function getNetworkCondition() {
  // Basic network condition check
  const online = navigator.onLine;
  
  // If Network Information API is available
  if ('connection' in navigator) {
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType || '4g';
    const saveData = connection.saveData || false;
    
    // Determine if network is suitable for sync
    const suitable = online && 
                    effectiveType !== 'slow-2g' && 
                    !saveData;
    
    return {
      online,
      effectiveType,
      saveData,
      suitable
    };
  }
  
  return {
    online,
    effectiveType: '4g',
    saveData: false,
    suitable: online
  };
}

// Placeholder functions for processing different types of actions
async function processPendingPosts() {
  console.log('Processing pending posts');
  // Implementation will be handled by main thread
}

async function processPendingComments() {
  console.log('Processing pending comments');
  // Implementation will be handled by main thread
}

async function processPendingReactions() {
  console.log('Processing pending reactions');
  // Implementation will be handled by main thread
}

async function processPendingMessages() {
  console.log('Processing pending messages');
  // Implementation will be handled by main thread
}

async function processPendingCommunityActions() {
  console.log('Processing pending community actions');
  // Implementation will be handled by main thread
}

async function processAllPendingActions() {
  console.log('Processing all pending actions');
  // Implementation will be handled by main thread
}

} catch (globalError) {
  console.error('Service worker encountered an error:', globalError);
  // Register basic service worker event handlers to prevent complete failure
  if (!self.listeners || self.listeners.length === 0) {
    self.addEventListener('install', () => {
      console.log('Error recovery service worker installed');
      self.skipWaiting();
    });

    self.addEventListener('activate', () => {
      console.log('Error recovery service worker activated');
      return self.clients.claim();
    });

    self.addEventListener('fetch', (event) => {
      event.respondWith(fetch(event.request));
    });
  }
}

console.log('Enhanced Service Worker with Workbox loaded');