interface CacheConfig {
  version: string;
  staticCacheName: string;
  dynamicCacheName: string;
  imageCacheName: string;
  maxCacheSize: number;
  maxCacheAge: number;
}

interface CacheStrategy {
  name: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' | 'NetworkOnly';
  cacheName: string;
  maxAge?: number;
  maxEntries?: number;
  tags?: string[];
}

interface CacheEntry {
  url: string;
  timestamp: number;
  tags: string[];
  strategy: string;
  ttl: number;
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  lastCleanup: number;
}

export class ServiceWorkerCacheService {
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupIntervalId?: number;
  private cacheStrategies: Record<string, CacheStrategy>;
  private cacheMetadata: Map<string, CacheEntry>;

  constructor() {
    this.config = {
      version: 'v2',
      staticCacheName: `static-v2`,
      dynamicCacheName: `dynamic-v2`,
      imageCacheName: `images-v2`,
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      maxCacheAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    this.stats = {
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      lastCleanup: Date.now()
    };

    // Initialize intelligent caching strategies
    this.cacheStrategies = {
      // Feed content - fresh data preferred, fallback to cache
      feed: {
        name: 'NetworkFirst',
        cacheName: 'feed-v1',
        maxAge: 5 * 60 * 1000, // 5 minutes
        maxEntries: 100,
        tags: ['feed', 'posts']
      },
      
      // Community data - can be slightly stale
      communities: {
        name: 'StaleWhileRevalidate',
        cacheName: 'communities-v1',
        maxAge: 10 * 60 * 1000, // 10 minutes
        maxEntries: 50,
        tags: ['communities']
      },
      
      // User profiles - cache first for performance
      profiles: {
        name: 'CacheFirst',
        cacheName: 'profiles-v1',
        maxAge: 30 * 60 * 1000, // 30 minutes
        maxEntries: 200,
        tags: ['profiles', 'users']
      },
      
      // Messages - never cache (privacy)
      messages: {
        name: 'NetworkOnly',
        cacheName: 'no-cache',
        tags: ['messages', 'private']
      }
    };

    this.cacheMetadata = new Map();
  }

  // Initialize service worker cache service
  async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      }

      // Load cache metadata from storage
      await this.loadMetadataFromStorage();

      // Update cache statistics
      await this.updateCacheStats();

      // Setup periodic cleanup
      this.setupPeriodicCleanup();

      console.log('Service Worker Cache Service initialized with intelligent strategies');
    } catch (error) {
      console.error('Failed to initialize Service Worker Cache Service:', error);
    }
  }

  // Cache resource with verification
  async cacheResource(url: string, cacheName?: string): Promise<boolean> {
    try {
      // Verify resource availability first
      const isAvailable = await this.verifyResourceAvailability(url);
      if (!isAvailable) {
        console.warn(`Resource not available for caching: ${url}`);
        return false;
      }

      const cache = await caches.open(cacheName || this.config.dynamicCacheName);
      const response = await fetch(url);

      if (response.ok) {
        await cache.put(url, response.clone());
        console.log(`Successfully cached: ${url}`);
        return true;
      } else {
        console.warn(`Failed to cache ${url}: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error(`Error caching resource ${url}:`, error);
      return false;
    }
  }

  // Batch cache resources with graceful failure handling
  async cacheResources(urls: string[], cacheName?: string): Promise<{
    successful: number;
    failed: number;
    results: Array<{ url: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ url: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    // Process in batches to avoid overwhelming the browser
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url) => {
        try {
          const success = await this.cacheResource(url, cacheName);
          if (success) {
            successful++;
            return { url, success: true };
          } else {
            failed++;
            return { url, success: false, error: 'Caching failed' };
          }
        } catch (error) {
          failed++;
          return { 
            url, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ 
            url: 'unknown', 
            success: false, 
            error: result.reason?.message || 'Promise rejected' 
          });
        }
      });

      // Small delay between batches to prevent blocking
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { successful, failed, results };
  }

  // Verify resource availability before caching
  async verifyResourceAvailability(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch (error) {
      console.warn(`Resource verification failed for ${url}:`, error);
      return false;
    }
  }

  // Get cached resource
  async getCachedResource(url: string, cacheName?: string): Promise<Response | null> {
    try {
      const cache = await caches.open(cacheName || this.config.dynamicCacheName);
      const response = await cache.match(url);
      return response || null;
    } catch (error) {
      console.error(`Error getting cached resource ${url}:`, error);
      return null;
    }
  }

  // Check if resource is cached
  async isCached(url: string, cacheName?: string): Promise<boolean> {
    try {
      const cachedResponse = await this.getCachedResource(url, cacheName);
      return cachedResponse !== null;
    } catch (error) {
      console.error(`Error checking cache for ${url}:`, error);
      return false;
    }
  }

  // Remove resource from cache
  async removeCachedResource(url: string, cacheName?: string): Promise<boolean> {
    try {
      const cache = await caches.open(cacheName || this.config.dynamicCacheName);
      return await cache.delete(url);
    } catch (error) {
      console.error(`Error removing cached resource ${url}:`, error);
      return false;
    }
  }

  // Clear specific cache
  async clearCache(cacheName: string): Promise<boolean> {
    try {
      return await caches.delete(cacheName);
    } catch (error) {
      console.error(`Error clearing cache ${cacheName}:`, error);
      return false;
    }
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    } catch (error) {
      console.error('Error clearing all caches:', error);
    }
  }

  // Perform cache cleanup
  async performCleanup(): Promise<void> {
    try {
      console.log('Starting cache cleanup...');

      // Clean up old cache versions
      await this.cleanupOldCaches();

      // Clean up oversized caches
      await this.cleanupOversizedCaches();

      // Clean up expired entries
      await this.cleanupExpiredEntries();

      // Update statistics
      await this.updateCacheStats();

      this.stats.lastCleanup = Date.now();
      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  // Clean up old cache versions
  private async cleanupOldCaches(): Promise<void> {
    const cacheNames = await caches.keys();
    const currentCaches = [
      this.config.staticCacheName,
      this.config.dynamicCacheName,
      this.config.imageCacheName
    ];

    const oldCaches = cacheNames.filter(name => !currentCaches.includes(name));
    
    await Promise.all(oldCaches.map(async (cacheName) => {
      console.log(`Deleting old cache: ${cacheName}`);
      return caches.delete(cacheName);
    }));
  }

  // Clean up oversized caches
  private async cleanupOversizedCaches(): Promise<void> {
    const cacheNames = [this.config.dynamicCacheName, this.config.imageCacheName];
    const maxEntries = 1000;

    for (const cacheName of cacheNames) {
      try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        if (keys.length > maxEntries) {
          // Remove oldest entries (FIFO)
          const entriesToRemove = keys.slice(0, keys.length - maxEntries);
          
          await Promise.all(entriesToRemove.map(key => cache.delete(key)));
          console.log(`Cleaned up ${entriesToRemove.length} entries from ${cacheName}`);
        }
      } catch (error) {
        console.error(`Failed to cleanup cache ${cacheName}:`, error);
      }
    }
  }

  // Clean up expired entries (simplified - would need metadata for proper implementation)
  private async cleanupExpiredEntries(): Promise<void> {
    // This is a simplified implementation
    // In a real scenario, you'd need to store metadata about when entries were cached
    const maxAge = this.config.maxCacheAge;
    const cutoffTime = Date.now() - maxAge;

    // For now, just log that this would clean up expired entries
    console.log(`Would clean up entries older than ${new Date(cutoffTime).toISOString()}`);
  }

  // Update cache statistics
  private async updateCacheStats(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      let totalEntries = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        totalEntries += keys.length;
      }

      this.stats.entryCount = totalEntries;

      // Estimate total size (simplified)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        this.stats.totalSize = estimate.usage || 0;
      }

      console.log(`Cache stats updated: ${totalEntries} entries, ${(this.stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      console.error('Failed to update cache stats:', error);
    }
  }

  // Setup periodic cleanup
  private setupPeriodicCleanup(): void {
    // Run cleanup every 30 minutes
    this.cleanupIntervalId = window.setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('Periodic cleanup failed:', error);
      });
    }, 30 * 60 * 1000);
  }

  // Get cache statistics
  getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  // Check storage quota
  async checkStorageQuota(): Promise<{
    used: number;
    quota: number;
    percentage: number;
  } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (used / quota) * 100 : 0;

        return { used, quota, percentage };
      } catch (error) {
        console.error('Failed to check storage quota:', error);
      }
    }

    return null;
  }

  // Warm cache with important resources
  async warmCache(urls: string[]): Promise<void> {
    console.log('Starting cache warming...');
    
    try {
      const result = await this.cacheResources(urls, this.config.staticCacheName);
      console.log(`Cache warming completed: ${result.successful}/${urls.length} resources cached`);
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<{
    serviceWorkerSupported: boolean;
    cacheApiSupported: boolean;
    storageEstimateSupported: boolean;
    cacheCount: number;
    storageUsage?: number;
  }> {
    const health = {
      serviceWorkerSupported: 'serviceWorker' in navigator,
      cacheApiSupported: 'caches' in window,
      storageEstimateSupported: 'storage' in navigator && 'estimate' in navigator.storage,
      cacheCount: 0,
      storageUsage: undefined as number | undefined
    };

    try {
      if (health.cacheApiSupported) {
        const cacheNames = await caches.keys();
        health.cacheCount = cacheNames.length;
      }

      if (health.storageEstimateSupported) {
        const estimate = await navigator.storage.estimate();
        health.storageUsage = estimate.usage;
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }

    return health;
  }

  // Setup network listeners
  setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('Network online - attempting cache maintenance');
      this.performCleanup().catch(() => {});
      try {
        const key = 'sw-offline-actions';
        const queued = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(queued) && queued.length) {
          console.log(`Flushing ${queued.length} offline actions`);
          // TODO: Dispatch queued actions to backend or service worker
          localStorage.removeItem(key);
        }
      } catch {
        // ignore
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network offline - switching to offline-first where possible');
    });
  }

  // Preload critical resources
  async preloadCriticalResources(urls: string[]): Promise<void> {
    await this.warmCache(urls);
  }

  // Cache community data
  async cacheCommunityData(communityId: string, _options: any): Promise<void> {
    const urls = [
      `/api/communities/${communityId}`,
      `/api/communities/${communityId}/posts`,
      `/api/communities/${communityId}/members`
    ];
    await this.cacheResources(urls, this.config.dynamicCacheName);
  }

  // Preload user profile
  async preloadUserProfile(userId: string): Promise<void> {
    const urls = [
      `/api/users/${userId}`,
      `/api/users/${userId}/stats`
    ];
    await this.cacheResources(urls, this.config.dynamicCacheName);
  }

  // Cache preview content data under its URL
  async cachePreviewContent(url: string, _type: string, data: any): Promise<void> {
    try {
      const cache = await caches.open(this.config.dynamicCacheName);
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(url, response);
    } catch (error) {
      console.error('Failed to cache preview content:', error);
    }
  }

  // Queue offline action
  async queueOfflineAction(action: { type: string; data: any }): Promise<void> {
    try {
      const key = 'sw-offline-actions';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({ ...action, ts: Date.now() });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to queue offline action:', error);
    }
  }

  // Intelligent caching with strategy-based approach
  async cacheWithStrategy(url: string, strategyKey: string, tags: string[] = []): Promise<Response | null> {
    const strategy = this.cacheStrategies[strategyKey];
    if (!strategy) {
      console.warn(`Unknown cache strategy: ${strategyKey}`);
      return null;
    }

    switch (strategy.name) {
      case 'NetworkFirst':
        return this.networkFirstStrategy(url, strategy, tags);
      case 'CacheFirst':
        return this.cacheFirstStrategy(url, strategy, tags);
      case 'StaleWhileRevalidate':
        return this.staleWhileRevalidateStrategy(url, strategy, tags);
      case 'NetworkOnly':
        return this.networkOnlyStrategy(url);
      default:
        return null;
    }
  }

  // NetworkFirst strategy - try network first, fallback to cache
  private async networkFirstStrategy(url: string, strategy: CacheStrategy, tags: string[]): Promise<Response | null> {
    try {
      const networkResponse = await fetch(url);
      if (networkResponse.ok) {
        // Cache the response
        await this.cacheResponseWithMetadata(url, networkResponse.clone(), strategy, tags);
        return networkResponse;
      }
    } catch (error) {
      console.warn(`Network request failed for ${url}, trying cache:`, error);
    }

    // Fallback to cache
    return this.getCachedResponseWithValidation(url, strategy);
  }

  // CacheFirst strategy - try cache first, fallback to network
  private async cacheFirstStrategy(url: string, strategy: CacheStrategy, tags: string[]): Promise<Response | null> {
    // Try cache first
    const cachedResponse = await this.getCachedResponseWithValidation(url, strategy);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to network
    try {
      const networkResponse = await fetch(url);
      if (networkResponse.ok) {
        await this.cacheResponseWithMetadata(url, networkResponse.clone(), strategy, tags);
        return networkResponse;
      }
    } catch (error) {
      console.error(`Network request failed for ${url}:`, error);
    }

    return null;
  }

  // StaleWhileRevalidate strategy - return cache immediately, update in background
  private async staleWhileRevalidateStrategy(url: string, strategy: CacheStrategy, tags: string[]): Promise<Response | null> {
    // Get cached response immediately
    const cachedResponse = await this.getCachedResponseWithValidation(url, strategy);
    
    // Update cache in background (don't await)
    this.updateCacheInBackground(url, strategy, tags);

    // Return cached response if available, otherwise try network
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(url);
      if (networkResponse.ok) {
        await this.cacheResponseWithMetadata(url, networkResponse.clone(), strategy, tags);
        return networkResponse;
      }
    } catch (error) {
      console.error(`Network request failed for ${url}:`, error);
    }

    return null;
  }

  // NetworkOnly strategy - never cache
  private async networkOnlyStrategy(url: string): Promise<Response | null> {
    try {
      const response = await fetch(url);
      return response.ok ? response : null;
    } catch (error) {
      console.error(`Network request failed for ${url}:`, error);
      return null;
    }
  }

  // Cache response with metadata
  private async cacheResponseWithMetadata(url: string, response: Response, strategy: CacheStrategy, tags: string[]): Promise<void> {
    try {
      const cache = await caches.open(strategy.cacheName);
      await cache.put(url, response);

      // Store metadata
      const metadata: CacheEntry = {
        url,
        timestamp: Date.now(),
        tags: [...(strategy.tags || []), ...tags],
        strategy: strategy.name,
        ttl: strategy.maxAge || this.config.maxCacheAge
      };
      this.cacheMetadata.set(url, metadata);

      // Persist metadata to IndexedDB for persistence across sessions
      await this.persistMetadata(url, metadata);
    } catch (error) {
      console.error(`Failed to cache response for ${url}:`, error);
    }
  }

  // Get cached response with TTL validation
  private async getCachedResponseWithValidation(url: string, strategy: CacheStrategy): Promise<Response | null> {
    try {
      const cache = await caches.open(strategy.cacheName);
      const cachedResponse = await cache.match(url);
      
      if (!cachedResponse) {
        return null;
      }

      // Check TTL
      const metadata = this.cacheMetadata.get(url);
      if (metadata && strategy.maxAge) {
        const age = Date.now() - metadata.timestamp;
        if (age > strategy.maxAge) {
          // Expired, remove from cache
          await cache.delete(url);
          this.cacheMetadata.delete(url);
          return null;
        }
      }

      return cachedResponse;
    } catch (error) {
      console.error(`Failed to get cached response for ${url}:`, error);
      return null;
    }
  }

  // Update cache in background for StaleWhileRevalidate
  private async updateCacheInBackground(url: string, strategy: CacheStrategy, tags: string[]): Promise<void> {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await this.cacheResponseWithMetadata(url, response, strategy, tags);
      }
    } catch (error) {
      console.warn(`Background cache update failed for ${url}:`, error);
    }
  }

  // Tag-based cache invalidation
  async invalidateByTags(tags: string[]): Promise<void> {
    const urlsToInvalidate: string[] = [];

    // Find URLs with matching tags
    for (const [url, metadata] of this.cacheMetadata.entries()) {
      if (tags.some(tag => metadata.tags.includes(tag))) {
        urlsToInvalidate.push(url);
      }
    }

    // Remove from all caches
    for (const url of urlsToInvalidate) {
      await this.invalidateUrl(url);
    }

    console.log(`Invalidated ${urlsToInvalidate.length} cached entries with tags:`, tags);
  }

  // Invalidate specific URL from all caches
  private async invalidateUrl(url: string): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName);
        await cache.delete(url);
      }));

      this.cacheMetadata.delete(url);
      await this.removeMetadata(url);
    } catch (error) {
      console.error(`Failed to invalidate ${url}:`, error);
    }
  }

  // Predictive preloading based on user behavior
  async predictivePreload(userId: string, currentAction: string, context: any): Promise<void> {
    const predictions = await this.analyzeUserBehavior(userId, currentAction, context);
    
    for (const prediction of predictions) {
      // Preload with appropriate strategy
      const strategyKey = this.determineStrategyForUrl(prediction.url);
      if (strategyKey && prediction.priority > 0.5) {
        await this.cacheWithStrategy(prediction.url, strategyKey, ['preload']);
      }
    }
  }

  // Analyze user behavior for predictions (simplified implementation)
  private async analyzeUserBehavior(userId: string, currentAction: string, context: any): Promise<Array<{url: string, priority: number}>> {
    // This would typically use ML or analytics data
    // For now, implement basic heuristics
    const predictions: Array<{url: string, priority: number}> = [];

    if (currentAction === 'viewing_feed') {
      // Likely to view community pages
      if (context.communities) {
        context.communities.forEach((communityId: string) => {
          predictions.push({
            url: `/api/communities/${communityId}`,
            priority: 0.7
          });
        });
      }
    }

    if (currentAction === 'viewing_community') {
      // Likely to view posts in community
      predictions.push({
        url: `/api/communities/${context.communityId}/posts`,
        priority: 0.8
      });
    }

    return predictions;
  }

  // Determine appropriate strategy for URL
  private determineStrategyForUrl(url: string): string | null {
    if (url.includes('/feed')) return 'feed';
    if (url.includes('/communities')) return 'communities';
    if (url.includes('/users') || url.includes('/profiles')) return 'profiles';
    if (url.includes('/messages')) return 'messages';
    return 'communities'; // default
  }

  // Persist metadata to IndexedDB
  private async persistMetadata(url: string, metadata: CacheEntry): Promise<void> {
    try {
      if (!('indexedDB' in window)) return;

      const request = indexedDB.open('CacheMetadata', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'url' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        store.put(metadata);
      };
    } catch (error) {
      console.warn('Failed to persist cache metadata:', error);
    }
  }

  // Remove metadata from IndexedDB
  private async removeMetadata(url: string): Promise<void> {
    try {
      if (!('indexedDB' in window)) return;

      const request = indexedDB.open('CacheMetadata', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        store.delete(url);
      };
    } catch (error) {
      console.warn('Failed to remove cache metadata:', error);
    }
  }

  // Load metadata from IndexedDB on initialization
  private async loadMetadataFromStorage(): Promise<void> {
    try {
      if (!('indexedDB' in window)) return;

      const request = indexedDB.open('CacheMetadata', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const entries = getAllRequest.result as CacheEntry[];
          entries.forEach(entry => {
            this.cacheMetadata.set(entry.url, entry);
          });
          console.log(`Loaded ${entries.length} cache metadata entries`);
        };
      };
    } catch (error) {
      console.warn('Failed to load cache metadata:', error);
    }
  }

  // Get cache strategy configuration
  getCacheStrategy(strategyKey: string): CacheStrategy | null {
    return this.cacheStrategies[strategyKey] || null;
  }

  // Update cache strategy configuration
  updateCacheStrategy(strategyKey: string, updates: Partial<CacheStrategy>): void {
    if (this.cacheStrategies[strategyKey]) {
      this.cacheStrategies[strategyKey] = {
        ...this.cacheStrategies[strategyKey],
        ...updates
      };
    }
  }

  // Destroy service (cleanup timers)
  destroy(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
  }
}

  // Singleton instance
export const serviceWorkerCacheService = new ServiceWorkerCacheService();