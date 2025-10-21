import { QueryClient, QueryKey } from '@tanstack/react-query';
import { SellerProfile, SellerListing, SellerDashboardStats, SellerOrder, SellerNotification } from '../types/seller';

// Cache invalidation strategies
export interface CacheInvalidationStrategy {
  immediate: boolean;
  cascade: boolean;
  dependencies: string[];
  ttl?: number;
}

// Cache dependency tracking
export interface CacheDependency {
  key: string;
  dependsOn: string[];
  invalidatesWith: string[];
}

// Cache entry metadata
export interface CacheEntryMetadata {
  key: string;
  walletAddress: string;
  lastUpdated: number;
  dependencies: string[];
  version: number;
}

// Optimistic update configuration
export interface OptimisticUpdateConfig<T> {
  updateFn: (oldData: T | undefined, newData: Partial<T>) => T;
  rollbackFn?: (data: T, error: any) => T;
  onSuccess?: (data: T) => void;
  onError?: (error: any, rollbackData: T) => void;
}

/**
 * Unified cache manager for seller data with React Query integration
 * Provides cache invalidation strategies, dependency tracking, and optimistic updates
 */
export class SellerCacheManager {
  private queryClient: QueryClient;
  private dependencies: Map<string, CacheDependency> = new Map();
  private metadata: Map<string, CacheEntryMetadata> = new Map();
  private invalidationQueue: Set<string> = new Set();
  private isProcessingQueue = false;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupDependencies();
  }

  /**
   * Setup cache dependencies between different seller data types
   */
  private setupDependencies(): void {
    const dependencies: CacheDependency[] = [
      {
        key: 'seller-profile',
        dependsOn: [],
        invalidatesWith: ['seller-dashboard', 'seller-store', 'seller-listings']
      },
      {
        key: 'seller-dashboard',
        dependsOn: ['seller-profile', 'seller-orders', 'seller-listings'],
        invalidatesWith: []
      },
      {
        key: 'seller-listings',
        dependsOn: ['seller-profile'],
        invalidatesWith: ['seller-dashboard', 'seller-store']
      },
      {
        key: 'seller-orders',
        dependsOn: ['seller-profile'],
        invalidatesWith: ['seller-dashboard']
      },
      {
        key: 'seller-notifications',
        dependsOn: ['seller-profile'],
        invalidatesWith: []
      },
      {
        key: 'seller-store',
        dependsOn: ['seller-profile', 'seller-listings'],
        invalidatesWith: []
      }
    ];

    dependencies.forEach(dep => {
      this.dependencies.set(dep.key, dep);
    });
  }

  /**
   * Generate cache key for seller data
   */
  private generateCacheKey(type: string, walletAddress: string, ...params: string[]): QueryKey {
    return ['seller', type, walletAddress, ...params];
  }

  /**
   * Get cache entry metadata
   */
  private getCacheMetadata(key: string): CacheEntryMetadata | undefined {
    return this.metadata.get(key);
  }

  /**
   * Update cache entry metadata
   */
  private updateCacheMetadata(key: string, walletAddress: string, dependencies: string[]): void {
    const existing = this.metadata.get(key);
    this.metadata.set(key, {
      key,
      walletAddress,
      lastUpdated: Date.now(),
      dependencies,
      version: (existing?.version || 0) + 1
    });
  }

  /**
   * Invalidate seller cache for a specific wallet address
   */
  async invalidateSellerCache(walletAddress: string, strategy: CacheInvalidationStrategy = {
    immediate: true,
    cascade: true,
    dependencies: []
  }): Promise<void> {
    console.log(`[SellerCacheManager] Invalidating cache for wallet: ${walletAddress}`);

    const cacheKeys = [
      this.generateCacheKey('profile', walletAddress),
      this.generateCacheKey('dashboard', walletAddress),
      this.generateCacheKey('listings', walletAddress),
      this.generateCacheKey('orders', walletAddress),
      this.generateCacheKey('notifications', walletAddress),
      this.generateCacheKey('store', walletAddress),
      this.generateCacheKey('analytics', walletAddress)
    ];

    if (strategy.immediate) {
      // Immediate invalidation
      await Promise.all(
        cacheKeys.map(key => this.queryClient.invalidateQueries({ queryKey: key }))
      );
    } else {
      // Queue for batch processing
      cacheKeys.forEach(key => this.invalidationQueue.add(key.join('.')));
      this.processInvalidationQueue();
    }

    if (strategy.cascade) {
      // Cascade invalidation to dependent caches
      await this.cascadeInvalidation(walletAddress, strategy.dependencies);
    }

    // Update metadata
    cacheKeys.forEach(key => {
      this.updateCacheMetadata(key.join('.'), walletAddress, strategy.dependencies);
    });

    console.log(`[SellerCacheManager] Cache invalidation completed for wallet: ${walletAddress}`);
  }

  /**
   * Cascade invalidation to dependent caches
   */
  private async cascadeInvalidation(walletAddress: string, additionalDeps: string[]): Promise<void> {
    const allDependencies = new Set(additionalDeps);
    
    // Add dependencies from dependency map
    this.dependencies.forEach((dep, key) => {
      if (dep.invalidatesWith.length > 0) {
        dep.invalidatesWith.forEach(depKey => allDependencies.add(depKey));
      }
    });

    // Invalidate dependent caches
    for (const depType of allDependencies) {
      const depKey = this.generateCacheKey(depType, walletAddress);
      await this.queryClient.invalidateQueries({ queryKey: depKey });
    }
  }

  /**
   * Process invalidation queue in batches
   */
  private async processInvalidationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.invalidationQueue.size === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const batch = Array.from(this.invalidationQueue).slice(0, 10); // Process 10 at a time
      batch.forEach(key => this.invalidationQueue.delete(key));

      await Promise.all(
        batch.map(keyStr => {
          const key = keyStr.split('.');
          return this.queryClient.invalidateQueries({ queryKey: key });
        })
      );

      // Process remaining items
      if (this.invalidationQueue.size > 0) {
        setTimeout(() => this.processInvalidationQueue(), 100);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Update seller data with optimistic updates
   */
  async updateSellerData<T>(
    walletAddress: string,
    dataType: string,
    updates: Partial<T>,
    config: OptimisticUpdateConfig<T>
  ): Promise<void> {
    const queryKey = this.generateCacheKey(dataType, walletAddress);
    
    console.log(`[SellerCacheManager] Optimistic update for ${dataType}:`, updates);

    // Get current data
    const currentData = this.queryClient.getQueryData<T>(queryKey);
    
    // Apply optimistic update
    const optimisticData = config.updateFn(currentData, updates);
    this.queryClient.setQueryData(queryKey, optimisticData);

    try {
      // Trigger success callback
      config.onSuccess?.(optimisticData);
      
      // Invalidate related caches after successful update
      await this.invalidateSellerCache(walletAddress, {
        immediate: false,
        cascade: true,
        dependencies: [dataType]
      });
      
    } catch (error) {
      console.error(`[SellerCacheManager] Optimistic update failed for ${dataType}:`, error);
      
      // Rollback on error
      if (config.rollbackFn && currentData) {
        const rollbackData = config.rollbackFn(optimisticData, error);
        this.queryClient.setQueryData(queryKey, rollbackData);
        // Type guard to ensure error is an Error instance
        const errorObj = error instanceof Error ? error : new Error(String(error));
        config.onError?.(errorObj, rollbackData);
      } else {
        // Invalidate to refetch fresh data
        await this.queryClient.invalidateQueries({ queryKey });
      }
    }
  }

  /**
   * Warm cache with prefetched data
   */
  async warmCache(walletAddress: string, dataTypes: string[] = ['profile', 'dashboard']): Promise<void> {
    console.log(`[SellerCacheManager] Warming cache for wallet: ${walletAddress}`);

    const prefetchPromises = dataTypes.map(async (dataType) => {
      const queryKey = this.generateCacheKey(dataType, walletAddress);
      
      // Only prefetch if not already cached or stale
      const existingData = this.queryClient.getQueryData(queryKey);
      const metadata = this.getCacheMetadata(queryKey.join('.'));
      
      if (!existingData || (metadata && Date.now() - metadata.lastUpdated > 300000)) { // 5 minutes
        try {
          await this.queryClient.prefetchQuery({
            queryKey,
            queryFn: () => this.fetchSellerData(dataType, walletAddress),
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
          });
        } catch (error) {
          console.warn(`[SellerCacheManager] Failed to warm cache for ${dataType}:`, error);
        }
      }
    });

    await Promise.all(prefetchPromises);
    console.log(`[SellerCacheManager] Cache warming completed for wallet: ${walletAddress}`);
  }

  /**
   * Fetch seller data (placeholder - should be implemented based on actual API)
   */
  private async fetchSellerData(dataType: string, walletAddress: string): Promise<any> {
    // This would be implemented with actual API calls
    // For now, return null to indicate no data
    return null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    queueSize: number;
    dependencies: number;
    metadata: CacheEntryMetadata[];
  } {
    return {
      totalEntries: this.queryClient.getQueryCache().getAll().length,
      queueSize: this.invalidationQueue.size,
      dependencies: this.dependencies.size,
      metadata: Array.from(this.metadata.values())
    };
  }

  /**
   * Clear all seller cache for a wallet address
   */
  async clearSellerCache(walletAddress: string): Promise<void> {
    console.log(`[SellerCacheManager] Clearing all cache for wallet: ${walletAddress}`);

    // Remove all queries for this wallet
    this.queryClient.removeQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && 
               queryKey.length >= 3 && 
               queryKey[0] === 'seller' && 
               queryKey[2] === walletAddress;
      }
    });

    // Clear metadata
    const keysToRemove: string[] = [];
    this.metadata.forEach((metadata, key) => {
      if (metadata.walletAddress === walletAddress) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(key => this.metadata.delete(key));

    console.log(`[SellerCacheManager] Cache cleared for wallet: ${walletAddress}`);
  }

  /**
   * Check if cache is valid for a specific data type
   */
  isCacheValid(walletAddress: string, dataType: string, maxAge: number = 300000): boolean {
    const queryKey = this.generateCacheKey(dataType, walletAddress);
    const query = this.queryClient.getQueryState(queryKey);
    
    if (!query || !query.dataUpdatedAt) {
      return false;
    }

    return Date.now() - query.dataUpdatedAt < maxAge;
  }

  /**
   * Force refresh specific seller data
   */
  async forceRefresh(walletAddress: string, dataType: string): Promise<void> {
    const queryKey = this.generateCacheKey(dataType, walletAddress);
    await this.queryClient.invalidateQueries({ queryKey });
    await this.queryClient.refetchQueries({ queryKey });
  }

  /**
   * Batch invalidate multiple wallet addresses
   */
  async batchInvalidate(walletAddresses: string[], strategy: CacheInvalidationStrategy = {
    immediate: false,
    cascade: true,
    dependencies: []
  }): Promise<void> {
    console.log(`[SellerCacheManager] Batch invalidating cache for ${walletAddresses.length} wallets`);

    const invalidationPromises = walletAddresses.map(walletAddress => 
      this.invalidateSellerCache(walletAddress, strategy)
    );

    await Promise.all(invalidationPromises);
    console.log(`[SellerCacheManager] Batch invalidation completed`);
  }

  /**
   * Setup automatic cache invalidation triggers
   */
  setupInvalidationTriggers(): void {
    // Listen for profile updates
    window.addEventListener('seller-profile-updated', (event: any) => {
      const { walletAddress } = event.detail;
      this.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['profile']
      });
    });

    // Listen for listing updates
    window.addEventListener('seller-listing-updated', (event: any) => {
      const { walletAddress } = event.detail;
      this.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['listings']
      });
    });

    // Listen for order updates
    window.addEventListener('seller-order-updated', (event: any) => {
      const { walletAddress } = event.detail;
      this.invalidateSellerCache(walletAddress, {
        immediate: true,
        cascade: true,
        dependencies: ['orders']
      });
    });

    console.log('[SellerCacheManager] Invalidation triggers setup completed');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.invalidationQueue.clear();
    this.metadata.clear();
    this.dependencies.clear();
  }
}

// Export singleton factory
let sellerCacheManagerInstance: SellerCacheManager | null = null;

export const createSellerCacheManager = (queryClient: QueryClient): SellerCacheManager => {
  if (!sellerCacheManagerInstance) {
    sellerCacheManagerInstance = new SellerCacheManager(queryClient);
    sellerCacheManagerInstance.setupInvalidationTriggers();
  }
  return sellerCacheManagerInstance;
};

export const getSellerCacheManager = (): SellerCacheManager | null => {
  return sellerCacheManagerInstance;
};