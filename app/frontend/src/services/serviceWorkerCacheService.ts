interface CacheConfig {
  version: string;
  staticCacheName: string;
  dynamicCacheName: string;
  imageCacheName: string;
  maxCacheSize: number;
  maxCacheAge: number;
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

      // Update cache statistics
      await this.updateCacheStats();

      // Setup periodic cleanup
      this.setupPeriodicCleanup();

      console.log('Service Worker Cache Service initialized');
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
      return await cache.match(url);
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