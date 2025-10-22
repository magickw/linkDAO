/**
 * Service Worker Cache Service
 * Provides offline caching capabilities for payment method prioritization data
 */

import { 
  GasEstimate, 
  ExchangeRate, 
  UserPreferences,
  PrioritizedPaymentMethod 
} from '../types/paymentPrioritization';

interface CacheStrategy {
  name: string;
  maxAge: number;
  maxEntries: number;
  networkFirst?: boolean;
  cacheFirst?: boolean;
  staleWhileRevalidate?: boolean;
}

interface OfflineCacheData {
  gasEstimates: Record<string, GasEstimate>;
  exchangeRates: Record<string, ExchangeRate>;
  userPreferences: Record<string, UserPreferences>;
  prioritizationResults: Record<string, PrioritizedPaymentMethod[]>;
  lastUpdated: number;
}

export class ServiceWorkerCacheService {
  private readonly CACHE_NAME = 'payment-prioritization-v1';
  private readonly OFFLINE_CACHE_NAME = 'payment-prioritization-offline-v1';
  
  private readonly CACHE_STRATEGIES: Record<string, CacheStrategy> = {
    gasEstimates: {
      name: 'gas-estimates',
      maxAge: 30 * 1000, // 30 seconds
      maxEntries: 100,
      staleWhileRevalidate: true
    },
    exchangeRates: {
      name: 'exchange-rates',
      maxAge: 60 * 1000, // 1 minute
      maxEntries: 200,
      staleWhileRevalidate: true
    },
    userPreferences: {
      name: 'user-preferences',
      maxAge: 300 * 1000, // 5 minutes
      maxEntries: 1000,
      cacheFirst: true
    },
    prioritizationResults: {
      name: 'prioritization-results',
      maxAge: 45 * 1000, // 45 seconds
      maxEntries: 500,
      networkFirst: true
    }
  };

  private isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  }

  /**
   * Initialize service worker cache
   */
  async initialize(): Promise<void> {
    if (!this.isServiceWorkerSupported()) {
      console.warn('Service Worker not supported, falling back to memory cache');
      return;
    }

    try {
      // Register service worker if not already registered
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.register('/sw-payment-cache.js');
      }

      // Initialize cache storage
      await this.initializeCacheStorage();
      
      // Set up offline data synchronization
      await this.setupOfflineSync();
      
      console.log('Service Worker cache initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Service Worker cache:', error);
    }
  }

  /**
   * Cache with strategy - generic method to cache data with a specific strategy
   */
  async cacheWithStrategy(
    url: string,
    strategyName: string,
    cacheKeys: string[]
  ): Promise<Response | null> {
    if (!this.isServiceWorkerSupported()) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      
      // Create a cache key from the URL and strategy
      const cacheKey = `${strategyName}-${cacheKeys.join('-')}`;
      
      // Try to get from cache first
      const cachedResponse = await cache.match(cacheKey);
      
      if (cachedResponse) {
        // Check if the cached response is still valid
        const cachedData = await cachedResponse.json();
        const strategy = this.CACHE_STRATEGIES[strategyName];
        
        if (strategy) {
          const age = Date.now() - cachedData.timestamp;
          if (age <= strategy.maxAge) {
            // Return cached response
            return new Response(JSON.stringify(cachedData.data), {
              headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'HIT',
                'X-Cache-Age': age.toString()
              }
            });
          } else {
            // Expired, remove from cache
            await cache.delete(cacheKey);
          }
        }
      }
      
      // If not in cache or expired, return null to indicate need to fetch
      return null;
    } catch (error) {
      console.error('Failed to cache with strategy:', error);
      return null;
    }
  }

  /**
   * Cache gas estimate with service worker
   */
  async cacheGasEstimate(key: string, estimate: GasEstimate): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `gas-estimate-${key}`;
      
      const response = new Response(JSON.stringify({
        data: estimate,
        timestamp: Date.now(),
        type: 'gas-estimate'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${this.CACHE_STRATEGIES.gasEstimates.maxAge / 1000}`
        }
      });

      await cache.put(cacheKey, response);
    } catch (error) {
      console.error('Failed to cache gas estimate:', error);
    }
  }

  /**
   * Get cached gas estimate
   */
  async getCachedGasEstimate(key: string): Promise<GasEstimate | null> {
    if (!this.isServiceWorkerSupported()) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `gas-estimate-${key}`;
      const response = await cache.match(cacheKey);

      if (!response) return null;

      const cachedData = await response.json();
      const age = Date.now() - cachedData.timestamp;

      if (age > this.CACHE_STRATEGIES.gasEstimates.maxAge) {
        await cache.delete(cacheKey);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Failed to get cached gas estimate:', error);
      return null;
    }
  }

  /**
   * Cache exchange rate with service worker
   */
  async cacheExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: ExchangeRate
  ): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `exchange-rate-${fromCurrency}-${toCurrency}`;
      
      const response = new Response(JSON.stringify({
        data: rate,
        timestamp: Date.now(),
        type: 'exchange-rate'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${this.CACHE_STRATEGIES.exchangeRates.maxAge / 1000}`
        }
      });

      await cache.put(cacheKey, response);
    } catch (error) {
      console.error('Failed to cache exchange rate:', error);
    }
  }

  /**
   * Get cached exchange rate
   */
  async getCachedExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    if (!this.isServiceWorkerSupported()) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `exchange-rate-${fromCurrency}-${toCurrency}`;
      const response = await cache.match(cacheKey);

      if (!response) return null;

      const cachedData = await response.json();
      const age = Date.now() - cachedData.timestamp;

      if (age > this.CACHE_STRATEGIES.exchangeRates.maxAge) {
        await cache.delete(cacheKey);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Failed to get cached exchange rate:', error);
      return null;
    }
  }

  /**
   * Cache user preferences for offline access
   */
  async cacheUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `user-preferences-${userId}`;
      
      const response = new Response(JSON.stringify({
        data: preferences,
        timestamp: Date.now(),
        type: 'user-preferences'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${this.CACHE_STRATEGIES.userPreferences.maxAge / 1000}`
        }
      });

      await cache.put(cacheKey, response);
      
      // Also store in offline cache for complete offline support
      await this.storeOfflineData('userPreferences', userId, preferences);
    } catch (error) {
      console.error('Failed to cache user preferences:', error);
    }
  }

  /**
   * Get cached user preferences
   */
  async getCachedUserPreferences(userId: string): Promise<UserPreferences | null> {
    if (!this.isServiceWorkerSupported()) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `user-preferences-${userId}`;
      const response = await cache.match(cacheKey);

      if (!response) {
        // Try offline cache as fallback
        return await this.getOfflineData('userPreferences', userId);
      }

      const cachedData = await response.json();
      return cachedData.data;
    } catch (error) {
      console.error('Failed to get cached user preferences:', error);
      return null;
    }
  }

  /**
   * Cache prioritization results
   */
  async cachePrioritizationResults(
    contextKey: string,
    results: PrioritizedPaymentMethod[]
  ): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `prioritization-${contextKey}`;
      
      const response = new Response(JSON.stringify({
        data: results,
        timestamp: Date.now(),
        type: 'prioritization-results'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${this.CACHE_STRATEGIES.prioritizationResults.maxAge / 1000}`
        }
      });

      await cache.put(cacheKey, response);
    } catch (error) {
      console.error('Failed to cache prioritization results:', error);
    }
  }

  /**
   * Get cached prioritization results
   */
  async getCachedPrioritizationResults(
    contextKey: string
  ): Promise<PrioritizedPaymentMethod[] | null> {
    if (!this.isServiceWorkerSupported()) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = `prioritization-${contextKey}`;
      const response = await cache.match(cacheKey);

      if (!response) return null;

      const cachedData = await response.json();
      const age = Date.now() - cachedData.timestamp;

      if (age > this.CACHE_STRATEGIES.prioritizationResults.maxAge) {
        await cache.delete(cacheKey);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Failed to get cached prioritization results:', error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      await caches.delete(this.CACHE_NAME);
      await caches.delete(this.OFFLINE_CACHE_NAME);
      console.log('All caches cleared successfully');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      
      for (const request of keys) {
        // Check if any of the tags match the request URL or cache key
        const shouldInvalidate = tags.some(tag => 
          request.url.includes(tag) || request.url.includes(this.CACHE_NAME)
        );
        
        if (shouldInvalidate) {
          await cache.delete(request);
        }
      }
      
      console.log(`Invalidated cache entries for tags: ${tags.join(', ')}`);
    } catch (error) {
      console.error('Failed to invalidate cache by tags:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    entryCount: number;
    cacheNames: string[];
    lastCleanup: number;
  }> {
    if (!this.isServiceWorkerSupported()) {
      return { totalSize: 0, entryCount: 0, cacheNames: [], lastCleanup: 0 };
    }

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      let entryCount = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        entryCount += keys.length;

        // Estimate size (rough calculation)
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const text = await response.text();
            totalSize += text.length;
          }
        }
      }

      return {
        totalSize,
        entryCount,
        cacheNames,
        lastCleanup: Date.now()
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return { totalSize: 0, entryCount: 0, cacheNames: [], lastCleanup: 0 };
    }
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanupExpiredEntries(): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      const now = Date.now();

      for (const request of keys) {
        const response = await cache.match(request);
        if (!response) continue;

        try {
          const cachedData = await response.json();
          const strategy = this.getStrategyForCacheKey(request.url);
          
          if (strategy && now - cachedData.timestamp > strategy.maxAge) {
            await cache.delete(request);
          }
        } catch (error) {
          // Invalid cache entry, delete it
          await cache.delete(request);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired entries:', error);
    }
  }

  // Private methods

  private async initializeCacheStorage(): Promise<void> {
    // Create cache instances
    await caches.open(this.CACHE_NAME);
    await caches.open(this.OFFLINE_CACHE_NAME);
  }

  private async setupOfflineSync(): Promise<void> {
    // Set up background sync for offline data
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      
      // Register background sync
      // @ts-ignore: Background Sync API types not fully available in all environments
      await registration.sync.register('payment-cache-sync');
    }
  }

  private async storeOfflineData(
    type: keyof OfflineCacheData,
    key: string,
    data: any
  ): Promise<void> {
    try {
      const cache = await caches.open(this.OFFLINE_CACHE_NAME);
      const offlineKey = `offline-${type}-${key}`;
      
      const response = new Response(JSON.stringify({
        data,
        timestamp: Date.now(),
        type: `offline-${type}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

      await cache.put(offlineKey, response);
    } catch (error) {
      console.error('Failed to store offline data:', error);
    }
  }

  private async getOfflineData(
    type: keyof OfflineCacheData,
    key: string
  ): Promise<any | null> {
    try {
      const cache = await caches.open(this.OFFLINE_CACHE_NAME);
      const offlineKey = `offline-${type}-${key}`;
      const response = await cache.match(offlineKey);

      if (!response) return null;

      const cachedData = await response.json();
      return cachedData.data;
    } catch (error) {
      console.error('Failed to get offline data:', error);
      return null;
    }
  }

  private getStrategyForCacheKey(url: string): CacheStrategy | null {
    for (const [key, strategy] of Object.entries(this.CACHE_STRATEGIES)) {
      if (url.includes(key)) {
        return strategy;
      }
    }
    return null;
  }
}

// Export singleton instance
export const serviceWorkerCacheService = new ServiceWorkerCacheService();

export default ServiceWorkerCacheService;