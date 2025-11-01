/**
 * Storage Quota Management System
 * Implements continuous storage monitoring, proactive cleanup, and LRU-based eviction
 */

export interface StorageQuotaInfo {
  used: number;
  available: number;
  quota: number;
  percentage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

export interface QuotaThresholds {
  warning: number; // Percentage at which to show warning
  cleanup: number; // Percentage at which to trigger cleanup
  emergency: number; // Percentage at which to perform aggressive cleanup
}

export interface CleanupResult {
  entriesRemoved: number;
  bytesFreed: number;
  cachesCleaned: string[];
  duration: number;
}

export interface LRUEvictionPolicy {
  enabled: boolean;
  prioritizeLargeImages: boolean;
  preserveRecentlyAccessed: boolean;
  maxImageSize: number; // in bytes
  minAccessCount: number;
}

export class StorageQuotaManager {
  private readonly DEFAULT_THRESHOLDS: QuotaThresholds = {
    warning: 70, // 70%
    cleanup: 80, // 80%
    emergency: 90 // 90%
  };

  private readonly DEFAULT_LRU_POLICY: LRUEvictionPolicy = {
    enabled: true,
    prioritizeLargeImages: true,
    preserveRecentlyAccessed: true,
    maxImageSize: 5 * 1024 * 1024, // 5MB
    minAccessCount: 2
  };

  private monitoringInterval: number | null = null;
  private isMonitoring = false;
  private lastCleanupTime = 0;
  private cleanupInProgress = false;
  
  private thresholds: QuotaThresholds;
  private lruPolicy: LRUEvictionPolicy;
  private notificationCallbacks: Array<(info: StorageQuotaInfo) => void> = [];

  constructor(
    thresholds: Partial<QuotaThresholds> = {},
    lruPolicy: Partial<LRUEvictionPolicy> = {}
  ) {
    this.thresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };
    this.lruPolicy = { ...this.DEFAULT_LRU_POLICY, ...lruPolicy };
  }

  /**
   * Start continuous storage monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.warn('Storage monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(async () => {
      try {
        const quotaInfo = await this.getStorageQuotaInfo();
        await this.handleQuotaCheck(quotaInfo);
      } catch (error) {
        console.error('Storage monitoring error:', error);
      }
    }, intervalMs);

    console.log(`Storage quota monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop continuous storage monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('Storage quota monitoring stopped');
  }

  /**
   * Get current storage quota information
   */
  async getStorageQuotaInfo(): Promise<StorageQuotaInfo> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      // Fallback for browsers without Storage API
      return {
        used: 0,
        available: 0,
        quota: 0,
        percentage: 0,
        isNearLimit: false,
        isAtLimit: false
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const available = quota - used;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      return {
        used,
        available,
        quota,
        percentage,
        isNearLimit: percentage >= this.thresholds.warning,
        isAtLimit: percentage >= this.thresholds.emergency
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      throw error;
    }
  }

  /**
   * Perform proactive cleanup when storage exceeds thresholds
   */
  async performProactiveCleanup(
    targetPercentage?: number,
    aggressive = false
  ): Promise<CleanupResult> {
    if (this.cleanupInProgress) {
      throw new Error('Cleanup already in progress');
    }

    this.cleanupInProgress = true;
    const startTime = Date.now();
    
    try {
      const quotaInfo = await this.getStorageQuotaInfo();
      const target = targetPercentage || this.thresholds.cleanup;
      
      console.log(`Starting ${aggressive ? 'aggressive' : 'standard'} cleanup (current: ${quotaInfo.percentage.toFixed(1)}%, target: ${target}%)`);

      let totalEntriesRemoved = 0;
      let totalBytesFreed = 0;
      const cachesCleaned: string[] = [];

      // 1. Remove expired entries first
      const expiredResult = await this.cleanupExpiredEntries();
      totalEntriesRemoved += expiredResult.entriesRemoved;
      totalBytesFreed += expiredResult.bytesFreed;
      cachesCleaned.push(...expiredResult.cachesCleaned);

      // Check if we've reached target after expired cleanup
      const afterExpiredInfo = await this.getStorageQuotaInfo();
      if (afterExpiredInfo.percentage <= target) {
        return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);
      }

      // 2. Perform LRU-based cleanup if enabled
      if (this.lruPolicy.enabled) {
        const lruResult = await this.performLRUCleanup(target, aggressive);
        totalEntriesRemoved += lruResult.entriesRemoved;
        totalBytesFreed += lruResult.bytesFreed;
        cachesCleaned.push(...lruResult.cachesCleaned);
      }

      // Check if we've reached target after LRU cleanup
      const afterLRUInfo = await this.getStorageQuotaInfo();
      if (afterLRUInfo.percentage <= target) {
        return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);
      }

      // 3. Aggressive cleanup if still over target
      if (aggressive || afterLRUInfo.percentage >= this.thresholds.emergency) {
        const aggressiveResult = await this.performAggressiveCleanup();
        totalEntriesRemoved += aggressiveResult.entriesRemoved;
        totalBytesFreed += aggressiveResult.bytesFreed;
        cachesCleaned.push(...aggressiveResult.cachesCleaned);
      }

      this.lastCleanupTime = Date.now();
      return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);

    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Perform LRU-based eviction prioritizing large image entries
   */
  async performLRUCleanup(targetPercentage: number, aggressive = false): Promise<CleanupResult> {
    const startTime = Date.now();
    let totalEntriesRemoved = 0;
    let totalBytesFreed = 0;
    const cachesCleaned: string[] = [];

    try {
      // Get cache metadata for LRU analysis
      const { cacheMetadataManager } = await import('./cacheMetadataManager');
      await cacheMetadataManager.initialize();
      
      const allMetadata = await cacheMetadataManager.getAllMetadata();
      if (allMetadata.length === 0) {
        return this.createCleanupResult(0, 0, [], startTime);
      }

      // Categorize entries for LRU eviction
      const imageEntries = allMetadata.filter(m => 
        m.contentType.startsWith('image/') || 
        m.url.includes('/images/') ||
        m.url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i)
      );

      const largeImageEntries = imageEntries.filter(m => 
        m.size > this.lruPolicy.maxImageSize
      );

      const otherEntries = allMetadata.filter(m => !imageEntries.includes(m));

      // Sort entries by LRU criteria
      const sortedLargeImages = this.sortByLRUCriteria(largeImageEntries);
      const sortedImages = this.sortByLRUCriteria(imageEntries.filter(m => !largeImageEntries.includes(m)));
      const sortedOthers = this.sortByLRUCriteria(otherEntries);

      // Determine eviction order based on policy
      let evictionOrder: typeof allMetadata = [];
      
      if (this.lruPolicy.prioritizeLargeImages) {
        evictionOrder = [...sortedLargeImages, ...sortedImages, ...sortedOthers];
      } else {
        evictionOrder = [...sortedImages, ...sortedLargeImages, ...sortedOthers];
      }

      // Filter out recently accessed entries if policy is enabled
      if (this.lruPolicy.preserveRecentlyAccessed) {
        const recentThreshold = Date.now() - (aggressive ? 5 * 60 * 1000 : 30 * 60 * 1000); // 5 min aggressive, 30 min normal
        evictionOrder = evictionOrder.filter(m => 
          m.lastAccessed < recentThreshold || 
          m.hitCount < this.lruPolicy.minAccessCount
        );
      }

      // Perform eviction until target is reached
      const cacheNames = await caches.keys();
      const quotaInfo = await this.getStorageQuotaInfo();
      
      for (const metadata of evictionOrder) {
        if (quotaInfo.percentage <= targetPercentage) break;

        try {
          // Find and delete from appropriate cache
          let deleted = false;
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const deleted_from_cache = await cache.delete(metadata.url);
            if (deleted_from_cache) {
              deleted = true;
              if (!cachesCleaned.includes(cacheName)) {
                cachesCleaned.push(cacheName);
              }
              break;
            }
          }

          if (deleted) {
            // Remove metadata
            await cacheMetadataManager.removeMetadata(metadata.url);
            
            totalEntriesRemoved++;
            totalBytesFreed += metadata.size;

            // Update quota info periodically
            if (totalEntriesRemoved % 10 === 0) {
              const currentQuota = await this.getStorageQuotaInfo();
              if (currentQuota.percentage <= targetPercentage) break;
            }
          }
        } catch (error) {
          console.warn(`Failed to evict entry ${metadata.url}:`, error);
        }
      }

      console.log(`LRU cleanup completed: ${totalEntriesRemoved} entries removed, ${this.formatBytes(totalBytesFreed)} freed`);
      return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);

    } catch (error) {
      console.error('LRU cleanup failed:', error);
      return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);
    }
  }

  /**
   * Add notification callback for storage quota warnings
   */
  addNotificationCallback(callback: (info: StorageQuotaInfo) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Remove notification callback
   */
  removeNotificationCallback(callback: (info: StorageQuotaInfo) => void): void {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * Update quota thresholds
   */
  updateThresholds(thresholds: Partial<QuotaThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    console.log('Storage quota thresholds updated:', this.thresholds);
  }

  /**
   * Update LRU eviction policy
   */
  updateLRUPolicy(policy: Partial<LRUEvictionPolicy>): void {
    this.lruPolicy = { ...this.lruPolicy, ...policy };
    console.log('LRU eviction policy updated:', this.lruPolicy);
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(): {
    lastCleanupTime: number;
    cleanupInProgress: boolean;
    isMonitoring: boolean;
    thresholds: QuotaThresholds;
    lruPolicy: LRUEvictionPolicy;
  } {
    return {
      lastCleanupTime: this.lastCleanupTime,
      cleanupInProgress: this.cleanupInProgress,
      isMonitoring: this.isMonitoring,
      thresholds: { ...this.thresholds },
      lruPolicy: { ...this.lruPolicy }
    };
  }

  // Private helper methods

  private async handleQuotaCheck(quotaInfo: StorageQuotaInfo): Promise<void> {
    // Notify callbacks
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(quotaInfo);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });

    // Trigger cleanup if needed
    if (quotaInfo.percentage >= this.thresholds.cleanup) {
      const timeSinceLastCleanup = Date.now() - this.lastCleanupTime;
      const minCleanupInterval = 5 * 60 * 1000; // 5 minutes

      if (timeSinceLastCleanup >= minCleanupInterval) {
        console.log(`Storage quota exceeded cleanup threshold (${quotaInfo.percentage.toFixed(1)}%), triggering cleanup`);
        
        try {
          const aggressive = quotaInfo.percentage >= this.thresholds.emergency;
          await this.performProactiveCleanup(this.thresholds.warning, aggressive);
        } catch (error) {
          console.error('Automatic cleanup failed:', error);
        }
      }
    }
  }

  private async cleanupExpiredEntries(): Promise<CleanupResult> {
    const startTime = Date.now();
    let totalEntriesRemoved = 0;
    let totalBytesFreed = 0;
    const cachesCleaned: string[] = [];

    try {
      const { cacheMetadataManager } = await import('./cacheMetadataManager');
      await cacheMetadataManager.initialize();
      
      const expiredRemoved = await cacheMetadataManager.cleanupExpiredEntries();
      totalEntriesRemoved += expiredRemoved;

      // Clean up corresponding cache entries
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            try {
              const cachedData = await response.json();
              if (cachedData.timestamp) {
                const age = Date.now() - cachedData.timestamp;
                const maxAge = this.getMaxAgeForCache(cacheName);
                
                if (age > maxAge) {
                  await cache.delete(request);
                  totalBytesFreed += await this.estimateResponseSize(response);
                  if (!cachesCleaned.includes(cacheName)) {
                    cachesCleaned.push(cacheName);
                  }
                }
              }
            } catch (error) {
              // Invalid cache entry, delete it
              await cache.delete(request);
              totalBytesFreed += await this.estimateResponseSize(response);
              if (!cachesCleaned.includes(cacheName)) {
                cachesCleaned.push(cacheName);
              }
            }
          }
        }
      }

      return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);
    } catch (error) {
      console.error('Expired entries cleanup failed:', error);
      return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);
    }
  }

  private async performAggressiveCleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    let totalEntriesRemoved = 0;
    let totalBytesFreed = 0;
    const cachesCleaned: string[] = [];

    try {
      const cacheNames = await caches.keys();
      
      // Clear non-essential caches completely
      const nonEssentialCaches = cacheNames.filter(name => 
        name.includes('images-') || 
        name.includes('marketplace-') ||
        name.includes('feed-')
      );

      for (const cacheName of nonEssentialCaches) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            totalBytesFreed += await this.estimateResponseSize(response);
          }
        }
        
        totalEntriesRemoved += requests.length;
        await caches.delete(cacheName);
        cachesCleaned.push(cacheName);
      }

      console.log(`Aggressive cleanup completed: ${totalEntriesRemoved} entries removed, ${this.formatBytes(totalBytesFreed)} freed`);
      return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);

    } catch (error) {
      console.error('Aggressive cleanup failed:', error);
      return this.createCleanupResult(totalEntriesRemoved, totalBytesFreed, cachesCleaned, startTime);
    }
  }

  private sortByLRUCriteria(entries: any[]): any[] {
    return entries.sort((a, b) => {
      // Primary: Last accessed time (oldest first)
      const accessDiff = a.lastAccessed - b.lastAccessed;
      if (accessDiff !== 0) return accessDiff;
      
      // Secondary: Hit count (least accessed first)
      const hitDiff = a.hitCount - b.hitCount;
      if (hitDiff !== 0) return hitDiff;
      
      // Tertiary: Size (largest first for images)
      if (a.contentType.startsWith('image/') && b.contentType.startsWith('image/')) {
        return b.size - a.size;
      }
      
      return 0;
    });
  }

  private getMaxAgeForCache(cacheName: string): number {
    // Default max ages for different cache types
    const maxAges: Record<string, number> = {
      'feed-cache-v1': 5 * 60 * 1000, // 5 minutes
      'communities-cache-v1': 10 * 60 * 1000, // 10 minutes
      'marketplace-cache-v1': 2 * 60 * 1000, // 2 minutes
      'messaging-cache-v1': 5 * 60 * 1000, // 5 minutes
      'images-cache-v1': 24 * 60 * 60 * 1000, // 24 hours
      'static-assets-v1': 24 * 60 * 60 * 1000 // 24 hours
    };

    return maxAges[cacheName] || 60 * 60 * 1000; // 1 hour default
  }

  private async estimateResponseSize(response: Response): Promise<number> {
    try {
      const text = await response.clone().text();
      return new Blob([text]).size;
    } catch {
      return 0;
    }
  }

  private createCleanupResult(
    entriesRemoved: number,
    bytesFreed: number,
    cachesCleaned: string[],
    startTime: number
  ): CleanupResult {
    return {
      entriesRemoved,
      bytesFreed,
      cachesCleaned: [...new Set(cachesCleaned)], // Remove duplicates
      duration: Date.now() - startTime
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const storageQuotaManager = new StorageQuotaManager();

export default StorageQuotaManager;