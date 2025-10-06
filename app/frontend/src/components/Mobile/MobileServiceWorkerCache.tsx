import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useDataSaving } from './MobileDataSavingMode';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface CacheStrategy {
  name: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly';
  cacheName: string;
  maxAge?: number;
  maxEntries?: number;
  networkTimeoutSeconds?: number;
  plugins?: string[];
}

interface CacheConfig {
  strategies: Record<string, CacheStrategy>;
  precacheUrls: string[];
  runtimeCaching: Array<{
    urlPattern: string | RegExp;
    handler: string;
    options?: any;
  }>;
}

interface ServiceWorkerCacheContextType {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  cacheSize: number;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  clearCache: (cacheName?: string) => Promise<void>;
  preloadUrls: (urls: string[]) => Promise<void>;
  getCacheStatus: () => Promise<Record<string, number>>;
  updateServiceWorker: () => Promise<void>;
}

const ServiceWorkerCacheContext = createContext<ServiceWorkerCacheContextType | undefined>(undefined);

interface MobileServiceWorkerCacheProviderProps {
  children: React.ReactNode;
  config?: Partial<CacheConfig>;
}

export const MobileServiceWorkerCacheProvider: React.FC<MobileServiceWorkerCacheProviderProps> = ({
  children,
  config = {}
}) => {
  const { settings: dataSavingSettings, isLowBandwidth } = useDataSaving();
  const { isMobile } = useMobileOptimization();
  
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cacheSize, setCacheSize] = useState(0);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Default cache configuration optimized for mobile
  const defaultConfig: CacheConfig = {
    strategies: {
      // API responses - fresh data preferred, fallback to cache
      api: {
        name: 'NetworkFirst',
        cacheName: 'api-cache-v1',
        maxAge: dataSavingSettings.cacheAggressively ? 30 * 60 * 1000 : 5 * 60 * 1000, // 30min or 5min
        maxEntries: dataSavingSettings.cacheAggressively ? 200 : 100,
        networkTimeoutSeconds: isLowBandwidth ? 10 : 5
      },
      
      // Static assets - cache first for performance
      static: {
        name: 'CacheFirst',
        cacheName: 'static-cache-v1',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        maxEntries: 100
      },
      
      // Images - stale while revalidate for balance
      images: {
        name: 'StaleWhileRevalidate',
        cacheName: 'images-cache-v1',
        maxAge: dataSavingSettings.cacheAggressively ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days or 1 day
        maxEntries: dataSavingSettings.cacheAggressively ? 500 : 200
      },
      
      // User content - network first with longer cache
      content: {
        name: 'NetworkFirst',
        cacheName: 'content-cache-v1',
        maxAge: 15 * 60 * 1000, // 15 minutes
        maxEntries: 150,
        networkTimeoutSeconds: isLowBandwidth ? 15 : 8
      }
    },
    
    precacheUrls: [
      '/',
      '/offline',
      '/manifest.json'
    ],
    
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache-v1',
          networkTimeoutSeconds: isLowBandwidth ? 10 : 5,
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'images-cache-v1',
          expiration: {
            maxEntries: dataSavingSettings.cacheAggressively ? 500 : 200,
            maxAgeSeconds: dataSavingSettings.cacheAggressively ? 7 * 24 * 60 * 60 : 24 * 60 * 60
          }
        }
      },
      {
        urlPattern: /\.(?:js|css|woff2|woff)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-cache-v1',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60
          }
        }
      }
    ]
  };

  const mergedConfig = { ...defaultConfig, ...config };

  // Check service worker support
  useEffect(() => {
    setIsSupported('serviceWorker' in navigator);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate cache size
  const updateCacheSize = useCallback(async () => {
    if (!isSupported) return;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      setCacheSize(totalSize);
    } catch (error) {
      console.warn('Failed to calculate cache size:', error);
    }
  }, [isSupported]);

  // Register service worker
  const register = useCallback(async () => {
    if (!isSupported || isRegistered) return;

    try {
      // Generate service worker content dynamically
      const swContent = generateServiceWorkerContent(mergedConfig);
      const swBlob = new Blob([swContent], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(swBlob);

      const reg = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
        updateViaCache: 'none'
      });

      setRegistration(reg);
      setIsRegistered(true);

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              console.log('New service worker available');
            }
          });
        }
      });

      // Update cache size after registration
      setTimeout(updateCacheSize, 1000);
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }, [isSupported, isRegistered, mergedConfig, updateCacheSize]);

  // Unregister service worker
  const unregister = useCallback(async () => {
    if (!registration) return;

    try {
      await registration.unregister();
      setIsRegistered(false);
      setRegistration(null);
    } catch (error) {
      console.error('Service worker unregistration failed:', error);
    }
  }, [registration]);

  // Clear cache
  const clearCache = useCallback(async (cacheName?: string) => {
    if (!isSupported) return;

    try {
      if (cacheName) {
        await caches.delete(cacheName);
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      await updateCacheSize();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [isSupported, updateCacheSize]);

  // Preload URLs
  const preloadUrls = useCallback(async (urls: string[]) => {
    if (!isSupported || !isRegistered) return;

    try {
      const cache = await caches.open('preload-cache-v1');
      await cache.addAll(urls);
      await updateCacheSize();
    } catch (error) {
      console.error('Failed to preload URLs:', error);
    }
  }, [isSupported, isRegistered, updateCacheSize]);

  // Get cache status
  const getCacheStatus = useCallback(async (): Promise<Record<string, number>> => {
    if (!isSupported) return {};

    try {
      const cacheNames = await caches.keys();
      const status: Record<string, number> = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        status[cacheName] = requests.length;
      }

      return status;
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return {};
    }
  }, [isSupported]);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    if (!registration) return;

    try {
      await registration.update();
    } catch (error) {
      console.error('Failed to update service worker:', error);
    }
  }, [registration]);

  // Auto-register on mobile
  useEffect(() => {
    if (isMobile && isSupported && !isRegistered) {
      register();
    }
  }, [isMobile, isSupported, isRegistered, register]);

  // Update cache size periodically
  useEffect(() => {
    if (!isRegistered) return;

    const interval = setInterval(updateCacheSize, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [isRegistered, updateCacheSize]);

  const contextValue: ServiceWorkerCacheContextType = {
    isSupported,
    isRegistered,
    isOnline,
    cacheSize,
    register,
    unregister,
    clearCache,
    preloadUrls,
    getCacheStatus,
    updateServiceWorker
  };

  return (
    <ServiceWorkerCacheContext.Provider value={contextValue}>
      {children}
    </ServiceWorkerCacheContext.Provider>
  );
};

// Generate service worker content
function generateServiceWorkerContent(config: CacheConfig): string {
  return `
    // Mobile-optimized service worker
    const CACHE_VERSION = 'v1';
    const CACHE_STRATEGIES = ${JSON.stringify(config.strategies)};
    const PRECACHE_URLS = ${JSON.stringify(config.precacheUrls)};
    const RUNTIME_CACHING = ${JSON.stringify(config.runtimeCaching)};

    // Install event - precache resources
    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open('precache-' + CACHE_VERSION)
          .then((cache) => cache.addAll(PRECACHE_URLS))
          .then(() => self.skipWaiting())
      );
    });

    // Activate event - clean up old caches
    self.addEventListener('activate', (event) => {
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName.includes('v') && !cacheName.includes(CACHE_VERSION)) {
                return caches.delete(cacheName);
              }
            })
          );
        }).then(() => self.clients.claim())
      );
    });

    // Fetch event - implement caching strategies
    self.addEventListener('fetch', (event) => {
      const { request } = event;
      const url = new URL(request.url);

      // Skip non-GET requests
      if (request.method !== 'GET') return;

      // Find matching runtime caching rule
      const matchingRule = RUNTIME_CACHING.find(rule => {
        if (typeof rule.urlPattern === 'string') {
          return url.href.includes(rule.urlPattern);
        }
        return new RegExp(rule.urlPattern).test(url.href);
      });

      if (matchingRule) {
        event.respondWith(handleRequest(request, matchingRule));
      }
    });

    // Handle request based on strategy
    async function handleRequest(request, rule) {
      const { handler, options = {} } = rule;
      const cacheName = options.cacheName || 'runtime-cache-' + CACHE_VERSION;
      const cache = await caches.open(cacheName);

      switch (handler) {
        case 'NetworkFirst':
          return networkFirst(request, cache, options);
        case 'CacheFirst':
          return cacheFirst(request, cache, options);
        case 'StaleWhileRevalidate':
          return staleWhileRevalidate(request, cache, options);
        case 'NetworkOnly':
          return fetch(request);
        case 'CacheOnly':
          return cache.match(request);
        default:
          return fetch(request);
      }
    }

    // Network First strategy
    async function networkFirst(request, cache, options) {
      const timeoutSeconds = options.networkTimeoutSeconds || 5;
      
      try {
        const networkResponse = await Promise.race([
          fetch(request),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Network timeout')), timeoutSeconds * 1000)
          )
        ]);

        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      }
    }

    // Cache First strategy
    async function cacheFirst(request, cache, options) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        throw error;
      }
    }

    // Stale While Revalidate strategy
    async function staleWhileRevalidate(request, cache, options) {
      const cachedResponse = await cache.match(request);
      
      const networkResponsePromise = fetch(request).then(response => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => {});

      return cachedResponse || networkResponsePromise;
    }

    // Background sync for offline actions
    self.addEventListener('sync', (event) => {
      if (event.tag === 'background-sync') {
        event.waitUntil(handleBackgroundSync());
      }
    });

    async function handleBackgroundSync() {
      // Handle queued offline actions
      const offlineActions = await getOfflineActions();
      for (const action of offlineActions) {
        try {
          await executeOfflineAction(action);
          await removeOfflineAction(action.id);
        } catch (error) {
          console.error('Failed to execute offline action:', error);
        }
      }
    }

    // Utility functions for offline actions
    async function getOfflineActions() {
      // Implementation would depend on your offline storage strategy
      return [];
    }

    async function executeOfflineAction(action) {
      // Implementation would depend on your action types
    }

    async function removeOfflineAction(actionId) {
      // Implementation would depend on your offline storage strategy
    }
  `;
}

export const useServiceWorkerCache = (): ServiceWorkerCacheContextType => {
  const context = useContext(ServiceWorkerCacheContext);
  if (!context) {
    throw new Error('useServiceWorkerCache must be used within a MobileServiceWorkerCacheProvider');
  }
  return context;
};

// Cache status component
interface CacheStatusProps {
  className?: string;
}

export const CacheStatus: React.FC<CacheStatusProps> = ({ className = '' }) => {
  const { isRegistered, isOnline, cacheSize, getCacheStatus, clearCache } = useServiceWorkerCache();
  const [cacheStatus, setCacheStatus] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isRegistered) {
      getCacheStatus().then(setCacheStatus);
    }
  }, [isRegistered, getCacheStatus]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-4 ${className}`}>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Cache Status</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Service Worker:</span>
          <span className={`font-medium ${isRegistered ? 'text-green-600' : 'text-red-600'}`}>
            {isRegistered ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Network:</span>
          <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Cache Size:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatBytes(cacheSize)}
          </span>
        </div>
      </div>

      {Object.keys(cacheStatus).length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Cache Details:</h4>
          <div className="space-y-1 text-sm">
            {Object.entries(cacheStatus).map(([cacheName, count]) => (
              <div key={cacheName} className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 truncate">
                  {cacheName}:
                </span>
                <span className="font-medium text-gray-900 dark:text-white ml-2">
                  {count} items
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => clearCache()}
        className="mt-4 w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
      >
        Clear All Cache
      </button>
    </div>
  );
};

export default MobileServiceWorkerCacheProvider;