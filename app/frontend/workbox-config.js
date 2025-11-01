/**
 * Workbox Configuration for Enhanced Service Worker
 * Configures precaching manifest and build-time optimizations
 */

module.exports = {
  globDirectory: 'public/',
  globPatterns: [
    '**/*.{js,css,html,png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot,json}'
  ],
  swDest: 'public/sw-precache.js',
  swSrc: 'public/sw-enhanced.js',
  
  // Enhanced runtime caching configuration
  runtimeCaching: [
    // External fonts
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    },
    
    // Feed API - NetworkFirst with predictive preloading
    {
      urlPattern: /\/api\/feed/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'feed-cache-v1',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 5 * 60 // 5 minutes
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request, mode }) => {
              // Add user context to cache key if available
              const url = new URL(request.url);
              const userId = url.searchParams.get('userId');
              return userId ? `${request.url}-user-${userId}` : request.url;
            }
          }
        ]
      }
    },
    
    // Community API - StaleWhileRevalidate with bundled preloading
    {
      urlPattern: /\/api\/communities/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'communities-cache-v1',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 10 * 60 // 10 minutes
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request, mode }) => {
              const url = new URL(request.url);
              const userId = url.searchParams.get('userId');
              return userId ? `${request.url}-user-${userId}` : request.url;
            }
          }
        ]
      }
    },
    
    // Marketplace listings - NetworkFirst for inventory sensitivity
    {
      urlPattern: /\/api\/marketplace.*\/(products|listings)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'marketplace-listings-v1',
        networkTimeoutSeconds: 2,
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 2 * 60 // 2 minutes
        }
      }
    },
    
    // Marketplace pricing - NetworkFirst with ETag validation
    {
      urlPattern: /\/api\/marketplace.*\/pricing/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'marketplace-pricing-v1',
        networkTimeoutSeconds: 1,
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 5 * 60 // 5 minutes
        },
        plugins: [
          {
            requestWillFetch: async ({ request }) => {
              // Add ETag header for conditional requests
              const headers = new Headers(request.headers);
              headers.set('Cache-Control', 'no-cache');
              return new Request(request, { headers });
            }
          }
        ]
      }
    },
    
    // Marketplace inventory - NetworkFirst with very short timeout
    {
      urlPattern: /\/api\/marketplace.*\/inventory/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'marketplace-inventory-v1',
        networkTimeoutSeconds: 1,
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 1 * 60 // 1 minute
        }
      }
    },
    
    // Marketplace images - CacheFirst with responsive optimization
    {
      urlPattern: /\/api\/marketplace.*\.(png|jpg|jpeg|gif|svg|webp|avif)/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'marketplace-images-v1',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 // 24 hours
        },
        plugins: [
          {
            requestWillFetch: async ({ request }) => {
              // Add responsive image parameters
              const url = new URL(request.url);
              if (!url.searchParams.has('w')) {
                url.searchParams.set('w', '600'); // Default width
                url.searchParams.set('q', '85');  // Quality
              }
              return new Request(url.toString(), request);
            }
          }
        ]
      }
    },
    
    // General images - CacheFirst with longer expiration
    {
      urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp|avif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache-v1',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
        }
      }
    },
    
    // Messaging API - NetworkFirst with conversation caching
    {
      urlPattern: /\/api\/messages/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'messaging-cache-v1',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 5 * 60 // 5 minutes
        },
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request, mode }) => {
              // Add user context for message privacy
              const url = new URL(request.url);
              const userId = url.searchParams.get('userId');
              return userId ? `${request.url}-user-${userId}` : request.url;
            }
          }
        ]
      }
    }
  ],
  
  // Skip waiting and claim clients immediately
  skipWaiting: true,
  clientsClaim: true,
  
  // Clean up outdated precaches
  cleanupOutdatedCaches: true,
  
  // Navigation preload
  navigationPreload: true,
  
  // Exclude patterns
  dontCacheBustURLsMatching: /\.\w{8}\./,
  
  // Manifest transformations
  manifestTransforms: [
    (manifestEntries) => {
      const manifest = manifestEntries.map((entry) => {
        // Add custom properties or modify entries
        return {
          ...entry,
          // Add cache tags for better invalidation
          tags: entry.url.includes('/api/') ? ['api'] : ['static']
        };
      });
      
      return { manifest };
    }
  ],
  
  // Mode configuration
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
};