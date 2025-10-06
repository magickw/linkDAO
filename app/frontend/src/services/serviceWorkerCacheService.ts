/**
 * Service Worker Cache Service
 * Enhanced service worker integration for offline functionality
 */

interface ServiceWorkerCacheConfig {
  cacheName: string;
  version: string;
  maxAge: number;
  maxEntries: number;
  networkTimeoutMs: number;
  strategies: {
    [key: string]: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate' | 'networkOnly' | 'cacheOnly';
  };
}

interface CacheEntry {
  url: string;
  response: Response;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface OfflineAction {
  id: string;
  type: 'post' | 'reaction' | 'comment' | 'vote';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface CacheConfig {
  version: string;
  staticCacheName: string;
  dynamicCacheName: string;
  imageCacheName: string;
  maxCacheSize: number;
  maxCacheAge: number;
}

interface CacheStrategy {
  name: string;
  cacheName: string;
  maxAge: number;
  maxEntries: number;
  tags: string[];
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  lastCleanup: number;
}

/**
 * Service Worker Cache Service
 * Enhanced service worker integration for offline functionality and intelligent caching
 */
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
        maxAge: 0,
        maxEntries: 0,
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

  // Cache with strategy
  async cacheWithStrategy(
    url: string,
    strategyName: string,
    tags: string[] = []
  ): Promise<Response | null> {
    try {
      // Get the strategy
      const strategy = this.cacheStrategies[strategyName];
      if (!strategy) {
        console.warn(`Unknown cache strategy: ${strategyName}`);
        return null;
      }

      const cache = await caches.open(strategy.cacheName);
      
      // Check if we have a cached response
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        // Check if it's still fresh
        const age = Date.now() - (cachedResponse.headers.get('date') ? 
          new Date(cachedResponse.headers.get('date')!).getTime() : Date.now());
        
        if (age < strategy.maxAge) {
          console.log(`Cache hit for ${url} with strategy ${strategyName}`);
          return cachedResponse;
        }
      }

      // Fetch fresh data
      const response = await fetch(url);
      if (response.ok) {
        // Cache the response
        const clonedResponse = response.clone();
        await cache.put(url, clonedResponse);
        
        // Update metadata
        const entry: CacheEntry = {
          url,
          response: clonedResponse,
          timestamp: Date.now(),
          accessCount: 1,
          lastAccessed: Date.now(),
          size: await response.clone().blob().then(blob => blob.size)
        };
        this.cacheMetadata.set(url, entry);
        
        console.log(`Cached ${url} with strategy ${strategyName}`);
      }
      
      return response.ok ? response : null;
    } catch (error) {
      console.error(`Cache with strategy failed for ${url}:`, error);
      return null;
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

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      // Find cache entries with matching tags
      const cachesToClear: string[] = [];
      
      for (const [strategyName, strategy] of Object.entries(this.cacheStrategies)) {
        if (strategy.tags.some(tag => tags.includes(tag))) {
          cachesToClear.push(strategy.cacheName);
        }
      }

      // Clear matching caches
      for (const cacheName of cachesToClear) {
        const cache = await caches.open(cacheName);
        await cache.keys().then(keys => Promise.all(keys.map(key => cache.delete(key))));
        console.log(`Invalidated cache: ${cacheName}`);
      }

      // Update stats
      await this.updateCacheStats();
    } catch (error) {
      console.error('Cache invalidation failed:', error);
    }
  }

  // Predictive preloading based on user behavior
  async predictivePreload(userId: string, context: string): Promise<void> {
    try {
      // Simple predictive algorithm based on user context
      const predictedResources: string[] = [];
      
      // In a real implementation, this would use ML or behavioral analysis
      switch (context) {
        case 'community_visit':
          predictedResources.push(
            `/api/communities/${userId}/recent`,
            `/api/communities/${userId}/popular`,
            `/api/users/${userId}/communities`
          );
          break;
        case 'profile_view':
          predictedResources.push(
            `/api/users/${userId}`,
            `/api/users/${userId}/posts`,
            `/api/users/${userId}/stats`
          );
          break;
        case 'feed_browse':
          predictedResources.push(
            `/api/feed/hot`,
            `/api/feed/new`,
            `/api/feed/top`
          );
          break;
      }

      if (predictedResources.length > 0) {
        await this.cacheResources(predictedResources);
        console.log(`Preloaded ${predictedResources.length} resources for context: ${context}`);
      }
    } catch (error) {
      console.error('Predictive preloading failed:', error);
    }
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

  // Load cache metadata from storage
  private async loadMetadataFromStorage(): Promise<void> {
    try {
      const metadata = localStorage.getItem('sw-cache-metadata');
      if (metadata) {
        const parsed = JSON.parse(metadata);
        // Restore metadata map
        Object.entries(parsed).forEach(([key, value]) => {
          this.cacheMetadata.set(key, value as CacheEntry);
        });
      }
    } catch (error) {
      console.warn('Failed to load cache metadata:', error);
    }
  }

  // Save cache metadata to storage
  private async saveMetadataToStorage(): Promise<void> {
    try {
      const metadata: Record<string, CacheEntry> = {};
      for (const [key, value] of this.cacheMetadata.entries()) {
        metadata[key] = value;
      }
      localStorage.setItem('sw-cache-metadata', JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save cache metadata:', error);
    }
  }

  // Perform cache cleanup
  private async performCleanup(): Promise<void> {
    try {
      const now = Date.now();
      let cleanedEntries = 0;
      let cleanedSize = 0;

      // Clean up expired entries
      for (const [key, entry] of this.cacheMetadata.entries()) {
        if (now - entry.timestamp > this.config.maxCacheAge) {
          this.cacheMetadata.delete(key);
          cleanedEntries++;
          cleanedSize += entry.size;
        }
      }

      // Clean up old entries if we're over size limit
      if (this.stats.totalSize > this.config.maxCacheSize) {
        // Sort by last accessed time (oldest first)
        const sortedEntries = Array.from(this.cacheMetadata.entries())
          .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        // Remove oldest entries until we're under the limit
        let sizeToRemove = this.stats.totalSize - this.config.maxCacheSize;
        for (const [key, entry] of sortedEntries) {
          if (sizeToRemove <= 0) break;
          
          this.cacheMetadata.delete(key);
          cleanedEntries++;
          cleanedSize += entry.size;
          sizeToRemove -= entry.size;
        }
      }

      if (cleanedEntries > 0) {
        console.log(`Cache cleanup: removed ${cleanedEntries} entries (${(cleanedSize / 1024 / 1024).toFixed(2)}MB)`);
        await this.saveMetadataToStorage();
        await this.updateCacheStats();
      }

      this.stats.lastCleanup = now;
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  // Update cache statistics
  private async updateCacheStats(): Promise<void> {
    try {
      let totalSize = 0;
      let totalEntries = 0;

      // Count entries in all caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        totalEntries += keys.length;
        
        // Estimate size of each entry
        for (const key of keys) {
          const response = await cache.match(key);
          if (response) {
            const cloned = response.clone();
            const blob = await cloned.blob();
            totalSize += blob.size;
          }
        }
      }

      this.stats.entryCount = totalEntries;
      this.stats.totalSize = totalSize;

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

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      this.cacheMetadata.clear();
      await this.saveMetadataToStorage();
      await this.updateCacheStats();
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
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