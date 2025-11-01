/**
 * Cache Metadata Management System
 * Handles IndexedDB storage for cache metadata, cleanup policies, and LRU eviction
 */

export interface CacheMetadata {
  url: string;
  timestamp: number;
  ttl: number;
  tags: string[];
  contentType: string;
  size: number;
  hitCount: number;
  lastAccessed: number;
  userScope?: string;
  strategy?: string;
  expiresAt?: number;
}

export interface CleanupPolicy {
  maxAge: number;
  maxEntries: number;
  maxSize: number; // in bytes
  lruEnabled: boolean;
}

export interface UsageStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  averageHitCount: number;
  tagDistribution: Record<string, number>;
}

export class CacheMetadataManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'CacheMetadataDB';
  private readonly DB_VERSION = 1;
  private readonly METADATA_STORE = 'metadata';
  
  private readonly DEFAULT_CLEANUP_POLICY: CleanupPolicy = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 1000,
    maxSize: 50 * 1024 * 1024, // 50MB
    lruEnabled: true
  };

  /**
   * Initialize the metadata manager and IndexedDB
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create metadata store with indexes
        if (!db.objectStoreNames.contains(this.METADATA_STORE)) {
          const store = db.createObjectStore(this.METADATA_STORE, { keyPath: 'url' });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('lastAccessed', 'lastAccessed');
          store.createIndex('tags', 'tags', { multiEntry: true });
          store.createIndex('userScope', 'userScope');
          store.createIndex('strategy', 'strategy');
          store.createIndex('expiresAt', 'expiresAt');
          store.createIndex('size', 'size');
          store.createIndex('hitCount', 'hitCount');
        }
      };
    });
  }

  /**
   * Store cache metadata entry
   */
  async storeMetadata(metadata: CacheMetadata): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Calculate expiration time
    const enhancedMetadata: CacheMetadata = {
      ...metadata,
      expiresAt: metadata.timestamp + metadata.ttl,
      lastAccessed: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(this.METADATA_STORE);
      const request = store.put(enhancedMetadata);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieve cache metadata by URL
   */
  async getMetadata(url: string): Promise<CacheMetadata | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
      const store = transaction.objectStore(this.METADATA_STORE);
      const request = store.get(url);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update last accessed time
          this.updateLastAccessed(url);
        }
        resolve(result || null);
      };
    });
  }

  /**
   * Get all metadata entries
   */
  async getAllMetadata(): Promise<CacheMetadata[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
      const store = transaction.objectStore(this.METADATA_STORE);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Get metadata entries by tags
   */
  async getMetadataByTags(tags: string[]): Promise<CacheMetadata[]> {
    if (!this.db) return [];
    
    const results: CacheMetadata[] = [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
      const store = transaction.objectStore(this.METADATA_STORE);
      const index = store.index('tags');
      
      let completed = 0;
      
      for (const tag of tags) {
        const request = index.getAll(tag);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          results.push(...request.result);
          completed++;
          
          if (completed === tags.length) {
            // Remove duplicates
            const uniqueResults = results.filter((item, index, self) => 
              self.findIndex(t => t.url === item.url) === index
            );
            resolve(uniqueResults);
          }
        };
      }
      
      if (tags.length === 0) {
        resolve([]);
      }
    });
  }

  /**
   * Update hit count and last accessed time
   */
  async updateAccessStats(url: string): Promise<void> {
    if (!this.db) return;
    
    const metadata = await this.getMetadata(url);
    if (!metadata) return;
    
    metadata.hitCount++;
    metadata.lastAccessed = Date.now();
    
    await this.storeMetadata(metadata);
  }

  /**
   * Remove metadata entry
   */
  async removeMetadata(url: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(this.METADATA_STORE);
      const request = store.delete(url);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Remove multiple metadata entries by URLs
   */
  async removeMultipleMetadata(urls: string[]): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(this.METADATA_STORE);
      
      let completed = 0;
      let hasError = false;
      
      for (const url of urls) {
        const request = store.delete(url);
        
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
        
        request.onsuccess = () => {
          completed++;
          if (completed === urls.length && !hasError) {
            resolve();
          }
        };
      }
      
      if (urls.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Clean up expired entries based on TTL
   */
  async cleanupExpiredEntries(): Promise<number> {
    if (!this.db) return 0;
    
    const now = Date.now();
    const expiredUrls: string[] = [];
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(this.METADATA_STORE);
      const index = store.index('expiresAt');
      
      // Get all entries that have expired
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          expiredUrls.push(cursor.value.url);
          cursor.delete(); // Delete expired entry
          cursor.continue();
        } else {
          // All expired entries processed
          resolve(expiredUrls.length);
        }
      };
    });
  }

  /**
   * Perform LRU cleanup based on policy
   */
  async performLRUCleanup(policy: Partial<CleanupPolicy> = {}): Promise<number> {
    if (!this.db) return 0;
    
    const cleanupPolicy = { ...this.DEFAULT_CLEANUP_POLICY, ...policy };
    const allMetadata = await this.getAllMetadata();
    
    if (allMetadata.length <= cleanupPolicy.maxEntries) {
      return 0; // No cleanup needed
    }
    
    // Sort by last accessed time (oldest first)
    const sortedByAccess = allMetadata.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    // Calculate how many entries to remove
    const entriesToRemove = allMetadata.length - cleanupPolicy.maxEntries;
    const urlsToRemove = sortedByAccess.slice(0, entriesToRemove).map(m => m.url);
    
    await this.removeMultipleMetadata(urlsToRemove);
    
    return urlsToRemove.length;
  }

  /**
   * Perform size-based cleanup
   */
  async performSizeBasedCleanup(policy: Partial<CleanupPolicy> = {}): Promise<number> {
    if (!this.db) return 0;
    
    const cleanupPolicy = { ...this.DEFAULT_CLEANUP_POLICY, ...policy };
    const allMetadata = await this.getAllMetadata();
    
    const totalSize = allMetadata.reduce((sum, m) => sum + m.size, 0);
    
    if (totalSize <= cleanupPolicy.maxSize) {
      return 0; // No cleanup needed
    }
    
    // Sort by size (largest first) and last accessed (oldest first)
    const sortedForCleanup = allMetadata.sort((a, b) => {
      const sizeDiff = b.size - a.size;
      if (sizeDiff !== 0) return sizeDiff;
      return a.lastAccessed - b.lastAccessed;
    });
    
    let currentSize = totalSize;
    const urlsToRemove: string[] = [];
    
    for (const metadata of sortedForCleanup) {
      if (currentSize <= cleanupPolicy.maxSize) break;
      
      urlsToRemove.push(metadata.url);
      currentSize -= metadata.size;
    }
    
    await this.removeMultipleMetadata(urlsToRemove);
    
    return urlsToRemove.length;
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const allMetadata = await this.getAllMetadata();
    
    if (allMetadata.length === 0) {
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
        averageHitCount: 0,
        tagDistribution: {}
      };
    }
    
    const totalSize = allMetadata.reduce((sum, m) => sum + m.size, 0);
    const totalHits = allMetadata.reduce((sum, m) => sum + m.hitCount, 0);
    const timestamps = allMetadata.map(m => m.timestamp);
    
    // Calculate tag distribution
    const tagDistribution: Record<string, number> = {};
    for (const metadata of allMetadata) {
      for (const tag of metadata.tags) {
        tagDistribution[tag] = (tagDistribution[tag] || 0) + 1;
      }
    }
    
    return {
      totalEntries: allMetadata.length,
      totalSize,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
      averageHitCount: totalHits / allMetadata.length,
      tagDistribution
    };
  }

  /**
   * Perform comprehensive cleanup based on all policies
   */
  async performComprehensiveCleanup(policy: Partial<CleanupPolicy> = {}): Promise<{
    expiredRemoved: number;
    lruRemoved: number;
    sizeRemoved: number;
    totalRemoved: number;
  }> {
    const cleanupPolicy = { ...this.DEFAULT_CLEANUP_POLICY, ...policy };
    
    // 1. Remove expired entries first
    const expiredRemoved = await this.cleanupExpiredEntries();
    
    // 2. Perform LRU cleanup if enabled
    let lruRemoved = 0;
    if (cleanupPolicy.lruEnabled) {
      lruRemoved = await this.performLRUCleanup(cleanupPolicy);
    }
    
    // 3. Perform size-based cleanup
    const sizeRemoved = await this.performSizeBasedCleanup(cleanupPolicy);
    
    const totalRemoved = expiredRemoved + lruRemoved + sizeRemoved;
    
    console.log(`Cache cleanup completed: ${totalRemoved} entries removed (${expiredRemoved} expired, ${lruRemoved} LRU, ${sizeRemoved} size-based)`);
    
    return {
      expiredRemoved,
      lruRemoved,
      sizeRemoved,
      totalRemoved
    };
  }

  /**
   * Clear all metadata
   */
  async clearAllMetadata(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(this.METADATA_STORE);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Update last accessed time for a URL
   */
  private async updateLastAccessed(url: string): Promise<void> {
    if (!this.db) return;
    
    // Use a separate transaction to avoid blocking the read operation
    setTimeout(async () => {
      try {
        const metadata = await this.getMetadataWithoutUpdate(url);
        if (metadata) {
          metadata.lastAccessed = Date.now();
          await this.storeMetadata(metadata);
        }
      } catch (error) {
        console.warn('Failed to update last accessed time:', error);
      }
    }, 0);
  }

  /**
   * Get metadata without updating last accessed time (internal use)
   */
  private async getMetadataWithoutUpdate(url: string): Promise<CacheMetadata | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
      const store = transaction.objectStore(this.METADATA_STORE);
      const request = store.get(url);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const cacheMetadataManager = new CacheMetadataManager();

export default CacheMetadataManager;