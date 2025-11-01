/**
 * Enhanced Service Worker Cache Service with Workbox Integration
 * Provides robust offline caching capabilities with modern service worker features
 */

import { 
  GasEstimate, 
  ExchangeRate, 
  UserPreferences,
  PrioritizedPaymentMethod 
} from '../types/paymentPrioritization';
import { cachePerformanceMetricsService } from './cachePerformanceMetricsService';
import { cacheAccessControl } from './cacheAccessControl';
import { cacheDataProtection } from './cacheDataProtection';

// Enhanced interfaces for Workbox integration
interface CacheStrategy {
  name: string;
  maxAge: number;
  maxEntries: number;
  networkFirst?: boolean;
  cacheFirst?: boolean;
  staleWhileRevalidate?: boolean;
}

interface CacheMetadata {
  url: string;
  timestamp: number;
  ttl: number;
  tags: string[];
  contentType: string;
  size: number;
  hitCount: number;
  lastAccessed: number;
  userScope?: string;
}

interface CacheOptions {
  strategy?: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate';
  maxAge?: number;
  maxEntries?: number;
  tags?: string[];
  userScope?: string;
  networkTimeoutSeconds?: number;
}

interface CacheStats {
  hitRates: Record<string, { hits: number; misses: number; ratio: number }>;
  storage: { used: number; available: number; percentage: number };
  sync: { queueSize: number; successRate: number; averageRetryCount: number; lastSyncTime: number | null; };
  preload: { successRate: number; averageLoadTime: number; bandwidthSaved: number };
}

interface OfflineAction {
  id: string;
  type: 'post' | 'comment' | 'reaction' | 'message';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  tags: string[];
}

interface OfflineCacheData {
  gasEstimates: Record<string, GasEstimate>;
  exchangeRates: Record<string, ExchangeRate>;
  userPreferences: Record<string, UserPreferences>;
  prioritizationResults: Record<string, PrioritizedPaymentMethod[]>;
  lastUpdated: number;
}

export class ServiceWorkerCacheService {
  private readonly CACHE_NAME = 'enhanced-cache-v1';
  private readonly OFFLINE_CACHE_NAME = 'offline-cache-v1';
  private readonly METADATA_STORE = 'cache-metadata-v1';
  private readonly OFFLINE_QUEUE_STORE = 'offline-queue-v1';
  
  private readonly CACHE_STRATEGIES: Record<string, CacheStrategy> = {
    feed: {
      name: 'feed-cache-v1',
      maxAge: 300 * 1000, // 5 minutes
      maxEntries: 200,
      networkFirst: true
    },
    communities: {
      name: 'communities-cache-v1',
      maxAge: 600 * 1000, // 10 minutes
      maxEntries: 100,
      staleWhileRevalidate: true
    },
    marketplace: {
      name: 'marketplace-cache-v1',
      maxAge: 120 * 1000, // 2 minutes
      maxEntries: 500,
      networkFirst: true
    },
    messaging: {
      name: 'messaging-cache-v1',
      maxAge: 300 * 1000, // 5 minutes
      maxEntries: 1000,
      networkFirst: true
    },
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

  private db: IDBDatabase | null = null;
  private offlineQueue: OfflineAction[] = [];
  private cacheStats: CacheStats = {
    hitRates: {},
    storage: { used: 0, available: 0, percentage: 0 },
    sync: { queueSize: 0, successRate: 0, averageRetryCount: 0, lastSyncTime: null },
    preload: { successRate: 0, averageLoadTime: 0, bandwidthSaved: 0 }
  };

  private isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window;
  }

  /**
   * Initialize enhanced service worker cache with Workbox
   */
  async initialize(): Promise<void> {
    if (!this.isServiceWorkerSupported()) {
      console.warn('Service Worker not supported, falling back to memory cache');
      return;
    }

    try {
      // Register enhanced service worker with Workbox
      if (!navigator.serviceWorker.controller) {
        await navigator.serviceWorker.register('/sw-enhanced.js');
      }

      // Initialize security and access control
      await cacheAccessControl.initialize();
      await cacheDataProtection.initialize();

      // Initialize IndexedDB for metadata
      await this.initializeMetadataStore();
      
      // Initialize cache storage
      await this.initializeCacheStorage();
      
      // Set up offline queue and sync
      await this.setupOfflineSync();
      
      // Enable navigation preload if supported
      await this.enableNavigationPreload();
      
      // Initialize performance metrics service
      await cachePerformanceMetricsService.initialize();
      
      console.log('Enhanced Service Worker cache initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Service Worker cache:', error);
    }
  }

  /**
   * Fetch with unified cache strategy access
   */
  async fetchWithStrategy(
    url: string, 
    strategy: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' = 'NetworkFirst',
    options: CacheOptions = {}
  ): Promise<Response> {
    try {
      // Validate cache access permissions
      const accessValidation = await cacheAccessControl.validateCacheAccess(url, 'read');
      if (!accessValidation.isValid) {
        throw new Error(`Cache access denied: ${accessValidation.errors.join(', ')}`);
      }

      // Generate secure cache key with user scope
      const cacheKey = cacheAccessControl.generateSecureCacheKey(url, {
        ...options,
        userScope: accessValidation.userScope
      });
      
      // Update cache stats
      await this.updateCacheStats(cacheKey, 'attempt');
      
      let response: Response;
      
      switch (strategy) {
        case 'NetworkFirst':
          response = await this.networkFirstStrategy(url, options);
          break;
        case 'CacheFirst':
          response = await this.cacheFirstStrategy(url, options);
          break;
        case 'StaleWhileRevalidate':
          response = await this.staleWhileRevalidateStrategy(url, options);
          break;
        default:
          response = await this.networkFirstStrategy(url, options);
      }
      
      // Update metadata if response is successful
      if (response.ok) {
        await this.updateCacheMetadata(cacheKey, response, options);
        await this.updateCacheStats(cacheKey, 'hit');
        // Record cache hit in performance metrics
        const cacheType = this.getCacheNameFromKey(cacheKey);
        cachePerformanceMetricsService.recordCacheHit(cacheType);
      } else {
        await this.updateCacheStats(cacheKey, 'miss');
        // Record cache miss in performance metrics
        const cacheType = this.getCacheNameFromKey(cacheKey);
        cachePerformanceMetricsService.recordCacheMiss(cacheType);
      }
      
      return response;
    } catch (error) {
      // Record cache miss in performance metrics
      const cacheType = this.getCacheNameFromKey(url);
      cachePerformanceMetricsService.recordCacheMiss(cacheType);
      throw error;
    }
  }

  /**
   * Put with metadata storage for cache entries
   */
  async putWithMetadata(
    url: string, 
    response: Response, 
    metadata: Partial<CacheMetadata> = {}
  ): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      // Validate cache access permissions
      const accessValidation = await cacheAccessControl.validateCacheAccess(url, 'write');
      if (!accessValidation.isValid) {
        console.warn(`Cache write access denied for ${url}: ${accessValidation.errors.join(', ')}`);
        return;
      }

      // Validate response content and headers
      const contentValidation = await cacheDataProtection.validateResponseContent(response);
      if (!contentValidation.isValid) {
        console.warn(`Response content validation failed for ${url}: ${contentValidation.warnings.join(', ')}`);
        return;
      }

      // Use filtered response if PII was redacted
      const responseToCache = contentValidation.filteredResponse || response;

      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = cacheAccessControl.generateSecureCacheKey(url, {
        ...metadata,
        userScope: accessValidation.userScope
      });
      
      // Store response in cache
      await cache.put(cacheKey, responseToCache.clone());
      
      // Store metadata in IndexedDB
      const fullMetadata: CacheMetadata = {
        url,
        timestamp: Date.now(),
        ttl: metadata.ttl || 300000, // 5 minutes default
        tags: metadata.tags || [],
        contentType: responseToCache.headers.get('content-type') || 'application/json',
        size: await this.estimateResponseSize(responseToCache),
        hitCount: 0,
        lastAccessed: Date.now(),
        userScope: accessValidation.userScope,
        ...metadata
      };
      
      await this.storeMetadata(cacheKey, fullMetadata);
      
    } catch (error) {
      console.error('Failed to put with metadata:', error);
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const metadataEntries = await this.getAllMetadata();
      const keysToInvalidate: string[] = [];
      
      for (const [key, metadata] of metadataEntries) {
        if (metadata.tags.includes(tag)) {
          keysToInvalidate.push(key);
        }
      }
      
      // Remove from cache
      const cache = await caches.open(this.CACHE_NAME);
      for (const key of keysToInvalidate) {
        await cache.delete(key);
        await this.removeMetadata(key);
      }
      
      console.log(`Invalidated ${keysToInvalidate.length} cache entries for tag: ${tag}`);
      
      // Notify service worker about invalidation
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_INVALIDATED',
          tag,
          keys: keysToInvalidate
        });
      }
      
    } catch (error) {
      console.error('Failed to invalidate by tag:', error);
    }
  }

  /**
   * Enable navigation preload for faster page loads
   */
  async enableNavigationPreload(): Promise<void> {
    if (!('navigationPreload' in ServiceWorkerRegistration.prototype)) {
      console.log('Navigation preload not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.navigationPreload.enable();
      
      // Set custom header for navigation preload
      await registration.navigationPreload.setHeaderValue('enhanced-cache');
      
      console.log('Navigation preload enabled');
    } catch (error) {
      console.error('Failed to enable navigation preload:', error);
    }
  }

  /**
   * Disable navigation preload
   */
  async disableNavigationPreload(): Promise<void> {
    if (!('navigationPreload' in ServiceWorkerRegistration.prototype)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.navigationPreload.disable();
      console.log('Navigation preload disabled');
    } catch (error) {
      console.error('Failed to disable navigation preload:', error);
    }
  }

  /**
   * Flush offline queue using background sync
   */
  async flushOfflineQueue(): Promise<void> {
    if (!this.isServiceWorkerSupported()) return;

    try {
      const startTime = Date.now();
      
      // Import background sync manager dynamically to avoid circular dependencies
      // const { backgroundSyncManager } = await import('./backgroundSyncManager');
      
      // Get current queue size for metrics
      const queueSize = await this.getOfflineQueueSize();
      // cachePerformanceMetricsService.updateSyncQueueSize(queueSize);
      
      // Use the offline action queue directly instead of background sync manager
      const { offlineActionQueue } = await import('./offlineActionQueue');
      await offlineActionQueue.getReadyActions();
      
      // Record sync operation metrics
      const processingTime = Date.now() - startTime;
      // cachePerformanceMetricsService.recordSyncOperation(
      //   true, 
      //   0, 
      //   processingTime
      // );
      
      // Register background sync if supported
      if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        // @ts-ignore: Background Sync API types not fully available
        await registration.sync.register('enhanced-cache-sync');
      }
      
    } catch (error) {
      console.error('Failed to flush offline queue:', error);
      // Record failed sync operation
      // cachePerformanceMetricsService.recordSyncOperation(false, 0, 0);
    }
  }

  /**
   * Get enhanced performance metrics and monitoring data
   */
  getPerformanceMetrics(): ReturnType<typeof cachePerformanceMetricsService.getPerformanceReport> {
    return cachePerformanceMetricsService.getPerformanceReport();
  }

  /**
   * Get performance trends for specified time range
   */
  getPerformanceTrends(timeRange: '1h' | '6h' | '24h' | '7d' = '24h') {
    return cachePerformanceMetricsService.getPerformanceTrends(timeRange);
  }

  /**
   * Get active performance alerts
   */
  getPerformanceAlerts(severity?: 'info' | 'warning' | 'error' | 'critical') {
    return cachePerformanceMetricsService.getActiveAlerts(severity);
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData() {
    return cachePerformanceMetricsService.exportMetricsData();
  }

  /**
   * Record preload operation for metrics
   */
  recordPreloadOperation(
    success: boolean, 
    loadTime: number, 
    wasUsed: boolean, 
    networkCondition: string = 'unknown',
    bytesSaved?: number
  ): void {
    cachePerformanceMetricsService.recordPreloadOperation(
      success, 
      loadTime, 
      wasUsed, 
      networkCondition, 
      bytesSaved
    );
  }

  /**
   * Set user session for cache access control
   */
  async setUserSession(userId: string, walletAddress?: string): Promise<void> {
    try {
      await cacheAccessControl.setUserSession(userId, walletAddress);
      console.log(`Cache session set for user: ${userId}`);
    } catch (error) {
      console.error('Failed to set user session:', error);
      throw error;
    }
  }

  /**
   * Clear user session and associated caches
   */
  async clearUserSession(): Promise<void> {
    try {
      await cacheAccessControl.clearSession();
      await cacheDataProtection.cleanupSensitiveCaches();
      console.log('User session and caches cleared');
    } catch (error) {
      console.error('Failed to clear user session:', error);
    }
  }

  /**
   * Switch user account (logout current, login new)
   */
  async switchUserAccount(newUserId: string, walletAddress?: string): Promise<void> {
    try {
      await cacheAccessControl.switchUserAccount(newUserId, walletAddress);
      await cacheDataProtection.cleanupSensitiveCaches();
      console.log(`Switched to user account: ${newUserId}`);
    } catch (error) {
      console.error('Failed to switch user account:', error);
      throw error;
    }
  }

  /**
   * Get current user session
   */
  getCurrentUserSession() {
    return cacheAccessControl.getCurrentSession();
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      // Get enhanced performance metrics
      const performanceReport = cachePerformanceMetricsService.getPerformanceReport();
      const currentSnapshot = performanceReport.summary;
      
      // Update storage stats
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        this.cacheStats.storage = {
          used: estimate.usage || 0,
          available: estimate.quota || 0,
          percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
        };
      }
      
      // Update queue stats
      const queueSize = await this.getOfflineQueueSize();
      this.cacheStats.sync.queueSize = queueSize;
      this.cacheStats.sync.lastSyncTime = Date.now();
      
      // Merge with performance metrics
      this.cacheStats.hitRates = currentSnapshot.hitRates;
      this.cacheStats.preload = currentSnapshot.preload;
      
      return { ...this.cacheStats };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return this.cacheStats;
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

  // Private methods for enhanced functionality

  private async initializeMetadataStore(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CacheMetadata', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'url' });
          metadataStore.createIndex('tags', 'tags', { multiEntry: true });
          metadataStore.createIndex('timestamp', 'timestamp');
        }
        
        // Create offline queue store
        if (!db.objectStoreNames.contains('offlineQueue')) {
          db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  private async initializeCacheStorage(): Promise<void> {
    // Create cache instances for different strategies
    for (const strategy of Object.values(this.CACHE_STRATEGIES)) {
      await caches.open(strategy.name);
    }
    await caches.open(this.CACHE_NAME);
  }

  private async setupOfflineSync(): Promise<void> {
    // Set up background sync for offline data
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      
      // Register background sync
      // @ts-ignore: Background Sync API types not fully available in all environments
      await registration.sync.register('enhanced-cache-sync');
    }
  }

  private generateCacheKey(url: string, options: any = {}): string {
    try {
      // Use secure cache key generation if access control is available
      return cacheAccessControl.generateSecureCacheKey(url, options);
    } catch (error) {
      // Fallback to basic key generation
      const baseKey = url;
      const userScope = options.userScope || '';
      return userScope ? `${userScope}:${baseKey}` : baseKey;
    }
  }

  private async networkFirstStrategy(url: string, options: CacheOptions): Promise<Response> {
    const cacheKey = this.generateCacheKey(url, options);
    const timeoutMs = (options.networkTimeoutSeconds || 3) * 1000;
    
    try {
      // Try network first with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const networkResponse = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (networkResponse.ok) {
        // Cache the response
        const cache = await caches.open(this.CACHE_NAME);
        await cache.put(cacheKey, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('Network failed, trying cache:', error);
    }
    
    // Fallback to cache
    const cache = await caches.open(this.CACHE_NAME);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw new Error('No cached response available');
  }

  private async cacheFirstStrategy(url: string, options: CacheOptions): Promise<Response> {
    const cacheKey = this.generateCacheKey(url, options);
    const cache = await caches.open(this.CACHE_NAME);
    
    // Try cache first
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      // Update cache in background
      this.updateCacheInBackground(url, cacheKey);
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(url);
    if (networkResponse.ok) {
      await cache.put(cacheKey, networkResponse.clone());
    }
    
    return networkResponse;
  }

  private async staleWhileRevalidateStrategy(url: string, options: CacheOptions): Promise<Response> {
    const cacheKey = this.generateCacheKey(url, options);
    const cache = await caches.open(this.CACHE_NAME);
    
    // Get cached response immediately
    const cachedResponse = await cache.match(cacheKey);
    
    // Update cache in background
    const updatePromise = fetch(url).then(async (networkResponse) => {
      if (networkResponse.ok) {
        await cache.put(cacheKey, networkResponse.clone());
      }
    }).catch(error => {
      console.warn('Background update failed:', error);
    });
    
    if (cachedResponse) {
      // Return cached response immediately, update happens in background
      return cachedResponse;
    }
    
    // If no cache, wait for network
    await updatePromise;
    const freshResponse = await cache.match(cacheKey);
    return freshResponse || fetch(url);
  }

  private async updateCacheInBackground(url: string, cacheKey: string): Promise<void> {
    try {
      const networkResponse = await fetch(url);
      if (networkResponse.ok) {
        const cache = await caches.open(this.CACHE_NAME);
        await cache.put(cacheKey, networkResponse);
      }
    } catch (error) {
      console.warn('Background cache update failed:', error);
    }
  }

  private async storeMetadata(key: string, metadata: CacheMetadata): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ ...metadata, url: key });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async removeMetadata(key: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getAllMetadata(): Promise<Map<string, CacheMetadata>> {
    if (!this.db) return new Map();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const map = new Map<string, CacheMetadata>();
        for (const item of request.result) {
          map.set(item.url, item);
        }
        resolve(map);
      };
    });
  }

  private async estimateResponseSize(response: Response): Promise<number> {
    try {
      const text = await response.clone().text();
      return new Blob([text]).size;
    } catch {
      return 0;
    }
  }

  private async updateCacheMetadata(key: string, response: Response, options: CacheOptions): Promise<void> {
    const metadata = await this.getMetadata(key);
    if (metadata) {
      metadata.hitCount++;
      metadata.lastAccessed = Date.now();
      await this.storeMetadata(key, metadata);
    }
  }

  private async getMetadata(key: string): Promise<CacheMetadata | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async updateCacheStats(key: string, type: 'hit' | 'miss' | 'attempt'): Promise<void> {
    const cacheName = this.getCacheNameFromKey(key);
    if (!this.cacheStats.hitRates[cacheName]) {
      this.cacheStats.hitRates[cacheName] = { hits: 0, misses: 0, ratio: 0 };
    }
    
    const stats = this.cacheStats.hitRates[cacheName];
    if (type === 'hit') {
      stats.hits++;
    } else if (type === 'miss') {
      stats.misses++;
    }
    
    stats.ratio = stats.hits / (stats.hits + stats.misses);
  }

  private getCacheNameFromKey(key: string): string {
    // Extract cache name from key or URL pattern
    if (key.includes('/api/feed')) return 'feed';
    if (key.includes('/api/communities')) return 'communities';
    if (key.includes('/api/marketplace')) return 'marketplace';
    if (key.includes('/api/messages')) return 'messaging';
    return 'default';
  }

  private async getOfflineQueue(): Promise<OfflineAction[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readonly');
      const store = transaction.objectStore('offlineQueue');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async getOfflineQueueSize(): Promise<number> {
    const queue = await this.getOfflineQueue();
    return queue.length;
  }

  private async processOfflineAction(action: OfflineAction): Promise<void> {
    // Process different types of offline actions
    switch (action.type) {
      case 'post':
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      case 'comment':
        await fetch(`/api/posts/${action.data.postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      case 'reaction':
        await fetch(`/api/posts/${action.data.postId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
      case 'message':
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data)
        });
        break;
    }
  }

  private async removeFromOfflineQueue(id: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async updateOfflineAction(action: OfflineAction): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineQueue'], 'readwrite');
      const store = transaction.objectStore('offlineQueue');
      const request = store.put(action);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
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