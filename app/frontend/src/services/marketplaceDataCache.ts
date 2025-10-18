/**
 * Marketplace Data Cache Service
 * Implements intelligent caching for frequently accessed marketplace data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'high' | 'medium' | 'low';
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxMemoryUsage: number; // in MB
  enableCompression: boolean;
  enablePersistence: boolean;
}

interface CacheStats {
  size: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

class MarketplaceDataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  private config: CacheConfig = {
    maxSize: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxMemoryUsage: 50, // 50MB
    enableCompression: true,
    enablePersistence: true
  };

  private compressionWorker?: Worker;
  private persistenceKey = 'marketplace-cache';

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };
    this.initializeCompression();
    this.loadFromPersistence();
    this.startCleanupInterval();
  }

  /**
   * Initialize compression worker for large data
   */
  private initializeCompression(): void {
    if (!this.config.enableCompression || typeof Worker === 'undefined') return;

    try {
      // Create compression worker inline
      const workerScript = `
        self.onmessage = function(e) {
          const { action, data, id } = e.data;
          
          if (action === 'compress') {
            try {
              const compressed = JSON.stringify(data);
              self.postMessage({ id, result: compressed, success: true });
            } catch (error) {
              self.postMessage({ id, error: error.message, success: false });
            }
          } else if (action === 'decompress') {
            try {
              const decompressed = JSON.parse(data);
              self.postMessage({ id, result: decompressed, success: true });
            } catch (error) {
              self.postMessage({ id, error: error.message, success: false });
            }
          }
        };
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
    } catch (error) {
      console.warn('Failed to initialize compression worker:', error);
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromPersistence(): void {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.persistenceKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();

        // Restore non-expired entries
        Object.entries(parsed).forEach(([key, entry]: [string, any]) => {
          if (entry.expiry > now) {
            this.cache.set(key, entry);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from persistence:', error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToPersistence(): void {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') return;

    try {
      const cacheObject = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.persistenceKey, JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to save cache to persistence:', error);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (entry.expiry < now) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    // Decompress if needed
    if (this.config.enableCompression && this.compressionWorker) {
      try {
        const decompressed = await this.decompress(entry.data);
        return decompressed;
      } catch (error) {
        console.warn('Decompression failed, returning raw data:', error);
        return entry.data;
      }
    }

    return entry.data;
  }

  /**
   * Set data in cache
   */
  async set<T>(
    key: string, 
    data: T, 
    options?: {
      ttl?: number;
      priority?: 'high' | 'medium' | 'low';
    }
  ): Promise<void> {
    const now = Date.now();
    const ttl = options?.ttl || this.config.defaultTTL;
    const priority = options?.priority || 'medium';

    // Check memory usage before adding
    if (this.getMemoryUsage() > this.config.maxMemoryUsage) {
      await this.evictLRU();
    }

    // Compress data if enabled
    let processedData = data;
    if (this.config.enableCompression && this.compressionWorker) {
      try {
        processedData = await this.compress(data);
      } catch (error) {
        console.warn('Compression failed, storing raw data:', error);
      }
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      expiry: now + ttl,
      accessCount: 1,
      lastAccessed: now,
      priority
    };

    this.cache.set(key, entry);

    // Enforce size limit
    if (this.cache.size > this.config.maxSize) {
      await this.evictLRU();
    }

    // Save to persistence periodically
    if (Math.random() < 0.1) { // 10% chance
      this.saveToPersistence();
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    
    if (this.config.enablePersistence && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.persistenceKey);
    }
  }

  /**
   * Compress data using worker
   */
  private async compress(data: any): Promise<any> {
    if (!this.compressionWorker) return data;

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({ action: 'compress', data, id });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handleMessage);
        reject(new Error('Compression timeout'));
      }, 5000);
    });
  }

  /**
   * Decompress data using worker
   */
  private async decompress(data: any): Promise<any> {
    if (!this.compressionWorker) return data;

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36);
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({ action: 'decompress', data, id });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handleMessage);
        reject(new Error('Decompression timeout'));
      }, 5000);
    });
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by priority and last accessed time
    entries.sort(([, a], [, b]) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority];
      const bPriority = priorityWeight[b.priority];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority; // Lower priority first
      }
      
      return a.lastAccessed - b.lastAccessed; // Older first
    });

    // Remove 10% of entries or until under memory limit
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < toRemove && this.cache.size > 0; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (entry.expiry < now) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => this.cache.delete(key));

    // Save to persistence after cleanup
    if (toDelete.length > 0) {
      this.saveToPersistence();
    }
  }

  /**
   * Get estimated memory usage in MB
   */
  private getMemoryUsage(): number {
    let totalSize = 0;
    
    this.cache.forEach((entry) => {
      // Rough estimation of memory usage
      const entrySize = JSON.stringify(entry).length * 2; // 2 bytes per character
      totalSize += entrySize;
    });

    return totalSize / (1024 * 1024); // Convert to MB
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      size: this.cache.size,
      memoryUsage: this.getMemoryUsage(),
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictionCount: this.stats.evictions
    };
  }

  /**
   * Prefetch data with low priority
   */
  async prefetch<T>(key: string, dataFetcher: () => Promise<T>): Promise<void> {
    if (this.has(key)) return;

    try {
      const data = await dataFetcher();
      await this.set(key, data, { priority: 'low' });
    } catch (error) {
      console.debug('Prefetch failed for key:', key, error);
    }
  }

  /**
   * Batch get multiple keys
   */
  async getMultiple<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        results.set(key, value);
      })
    );

    return results;
  }

  /**
   * Batch set multiple entries
   */
  async setMultiple<T>(
    entries: Array<{ key: string; data: T; options?: { ttl?: number; priority?: 'high' | 'medium' | 'low' } }>
  ): Promise<void> {
    await Promise.all(
      entries.map(({ key, data, options }) => this.set(key, data, options))
    );
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Export cache data for debugging
   */
  exportData(): Record<string, any> {
    const exported: Record<string, any> = {};
    
    this.cache.forEach((entry, key) => {
      exported[key] = {
        data: entry.data,
        timestamp: entry.timestamp,
        expiry: entry.expiry,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        priority: entry.priority
      };
    });

    return exported;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear();
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
  }
}

// Create cache instances for different data types
export const productCache = new MarketplaceDataCache({
  maxSize: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minutes for products
  maxMemoryUsage: 20
});

export const sellerCache = new MarketplaceDataCache({
  maxSize: 200,
  defaultTTL: 15 * 60 * 1000, // 15 minutes for sellers
  maxMemoryUsage: 10
});

export const categoryCache = new MarketplaceDataCache({
  maxSize: 100,
  defaultTTL: 60 * 60 * 1000, // 1 hour for categories
  maxMemoryUsage: 5
});

export const searchCache = new MarketplaceDataCache({
  maxSize: 300,
  defaultTTL: 5 * 60 * 1000, // 5 minutes for search results
  maxMemoryUsage: 15
});

// Export the main cache class
export default MarketplaceDataCache;