/**
 * Cache Strategy Integration Service
 * Coordinates all feature-specific cache strategies and provides unified interface
 */

import { feedCacheStrategy } from './feedCacheStrategy';
import { communityCacheStrategy } from './communityCacheStrategy';
import { marketplaceCacheStrategy } from './marketplaceCacheStrategy';
import { serviceWorkerCacheService } from './serviceWorkerCacheService';

interface CacheStrategyConfig {
  enableFeedStrategy: boolean;
  enableCommunityStrategy: boolean;
  enableMarketplaceStrategy: boolean;
  globalSettings: {
    maxStorageUsage: number; // percentage
    cleanupInterval: number; // milliseconds
    preloadingEnabled: boolean;
  };
}

interface CacheInvalidationRequest {
  type: 'feed' | 'community' | 'marketplace' | 'global';
  target: string; // feed item ID, community ID, product ID, or tag
  scope?: 'item' | 'category' | 'all';
}

interface PreloadRequest {
  type: 'feed' | 'community' | 'marketplace';
  context: any;
  priority: 'high' | 'medium' | 'low';
}

export class CacheStrategyIntegration {
  private readonly config: CacheStrategyConfig = {
    enableFeedStrategy: true,
    enableCommunityStrategy: true,
    enableMarketplaceStrategy: true,
    globalSettings: {
      maxStorageUsage: 80, // 80%
      cleanupInterval: 300000, // 5 minutes
      preloadingEnabled: true
    }
  };

  private cleanupInterval: number | null = null;
  private isInitialized = false;

  /**
   * Initialize all cache strategies
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize base service worker cache service
      await serviceWorkerCacheService.initialize();

      // Set up periodic cleanup
      this.setupPeriodicCleanup();

      // Set up storage monitoring
      this.setupStorageMonitoring();

      // Set up cross-strategy event handling
      this.setupEventHandling();

      this.isInitialized = true;
      console.log('Cache strategy integration initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize cache strategy integration:', error);
      throw error;
    }
  }

  /**
   * Unified fetch method that routes to appropriate strategy
   */
  async fetch(
    url: string,
    options: {
      strategy?: 'auto' | 'feed' | 'community' | 'marketplace';
      userId?: string;
      context?: any;
    } = {}
  ): Promise<Response> {
    const strategy = options.strategy || this.determineStrategy(url);
    
    switch (strategy) {
      case 'feed':
        if (this.config.enableFeedStrategy) {
          return await feedCacheStrategy.fetchFeedData(url, {
            userId: options.userId,
            ...options.context
          });
        }
        break;
        
      case 'community':
        if (this.config.enableCommunityStrategy) {
          return await communityCacheStrategy.fetchCommunityData(url, {
            userId: options.userId,
            ...options.context
          });
        }
        break;
        
      case 'marketplace':
        if (this.config.enableMarketplaceStrategy) {
          return await marketplaceCacheStrategy.fetchProductListings(url, {
            userId: options.userId,
            ...options.context
          });
        }
        break;
    }
    
    // Fallback to base service worker cache
    return await serviceWorkerCacheService.fetchWithStrategy(url, 'NetworkFirst', {
      userScope: options.userId
    });
  }

  /**
   * Unified cache invalidation
   */
  async invalidateCache(request: CacheInvalidationRequest): Promise<void> {
    try {
      switch (request.type) {
        case 'feed':
          if (this.config.enableFeedStrategy) {
            if (request.scope === 'item') {
              await feedCacheStrategy.invalidateFeedItems([request.target]);
            } else {
              await feedCacheStrategy.invalidateByTag(request.target);
            }
          }
          break;
          
        case 'community':
          if (this.config.enableCommunityStrategy) {
            if (request.scope === 'item') {
              await communityCacheStrategy.invalidateCommunity(request.target);
            } else {
              await communityCacheStrategy.invalidateCommunities([request.target]);
            }
          }
          break;
          
        case 'marketplace':
          if (this.config.enableMarketplaceStrategy) {
            const type = request.scope === 'category' ? 'category' : 'product';
            await marketplaceCacheStrategy.invalidateMarketplaceCache(type, request.target);
          }
          break;
          
        case 'global':
          await serviceWorkerCacheService.invalidateByTag(request.target);
          break;
      }
      
      console.log(`Cache invalidated: ${request.type}/${request.target}`);
      
    } catch (error) {
      console.error('Cache invalidation failed:', error);
      throw error;
    }
  }

  /**
   * Unified preloading
   */
  async preload(request: PreloadRequest): Promise<void> {
    if (!this.config.globalSettings.preloadingEnabled) {
      return;
    }

    try {
      switch (request.type) {
        case 'feed':
          if (this.config.enableFeedStrategy) {
            await feedCacheStrategy.predictivePreload(request.context);
          }
          break;
          
        case 'community':
          if (this.config.enableCommunityStrategy) {
            if (request.context.communityIds) {
              await communityCacheStrategy.bundledPreload(request.context.communityIds);
            }
            if (request.context.relatedCommunityIds) {
              await communityCacheStrategy.batchPreloadRelatedIcons(
                request.context.relatedCommunityIds
              );
            }
          }
          break;
          
        case 'marketplace':
          if (this.config.enableMarketplaceStrategy) {
            if (request.context.productIds) {
              await marketplaceCacheStrategy.preloadCriticalImages(request.context.productIds);
            }
          }
          break;
      }
      
      console.log(`Preload completed: ${request.type}`);
      
    } catch (error) {
      console.error('Preload failed:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStatistics(): Promise<{
    overall: any;
    byStrategy: {
      feed?: any;
      community?: any;
      marketplace?: any;
    };
    storage: {
      used: number;
      available: number;
      percentage: number;
    };
  }> {
    try {
      const overallStats = await serviceWorkerCacheService.getCacheStats();
      
      // Get storage information
      let storageInfo = { used: 0, available: 0, percentage: 0 };
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        storageInfo = {
          used: estimate.usage || 0,
          available: estimate.quota || 0,
          percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
        };
      }

      return {
        overall: overallStats,
        byStrategy: {
          // Strategy-specific stats would be implemented here
          // For now, returning empty objects as placeholders
        },
        storage: storageInfo
      };
      
    } catch (error) {
      console.error('Failed to get cache statistics:', error);
      return {
        overall: {},
        byStrategy: {},
        storage: { used: 0, available: 0, percentage: 0 }
      };
    }
  }

  /**
   * Trigger manual cleanup
   */
  async cleanup(): Promise<void> {
    try {
      // Check storage usage
      const stats = await this.getCacheStatistics();
      
      if (stats.storage.percentage > this.config.globalSettings.maxStorageUsage) {
        console.log('Storage usage high, triggering cleanup');
        
        // Perform cleanup operations
        await this.performCleanup();
      }
      
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheStrategyConfig>): void {
    Object.assign(this.config, newConfig);
    
    // Restart cleanup interval if changed
    if (newConfig.globalSettings?.cleanupInterval && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.setupPeriodicCleanup();
    }
  }

  /**
   * Determine appropriate strategy based on URL
   */
  private determineStrategy(url: string): 'feed' | 'community' | 'marketplace' | 'auto' {
    if (url.includes('/api/feed') || url.includes('/feed')) {
      return 'feed';
    }
    
    if (url.includes('/api/communities') || url.includes('/communities')) {
      return 'community';
    }
    
    if (url.includes('/api/marketplace') || url.includes('/marketplace')) {
      return 'marketplace';
    }
    
    return 'auto';
  }

  /**
   * Set up periodic cleanup
   */
  private setupPeriodicCleanup(): void {
    this.cleanupInterval = window.setInterval(
      () => this.cleanup(),
      this.config.globalSettings.cleanupInterval
    );
  }

  /**
   * Set up storage monitoring
   */
  private setupStorageMonitoring(): void {
    // Monitor storage usage and trigger cleanup when needed
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      setInterval(async () => {
        try {
          const estimate = await navigator.storage.estimate();
          const usagePercentage = ((estimate.usage || 0) / (estimate.quota || 1)) * 100;
          
          if (usagePercentage > this.config.globalSettings.maxStorageUsage) {
            await this.performCleanup();
          }
        } catch (error) {
          console.warn('Storage monitoring failed:', error);
        }
      }, 60000); // Check every minute
    }
  }

  /**
   * Set up cross-strategy event handling
   */
  private setupEventHandling(): void {
    // Listen for cache events from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data || {};
        
        switch (type) {
          case 'CACHE_INVALIDATED':
            this.handleCacheInvalidationEvent(data);
            break;
            
          case 'INVENTORY_UPDATED':
            this.handleInventoryUpdateEvent(data);
            break;
            
          case 'UI_NEW_CONTENT_AVAILABLE':
            this.handleNewContentEvent(data);
            break;
        }
      });
    }

    // Listen for custom events from cache strategies
    window.addEventListener('feedCacheUpdate', (event: any) => {
      this.handleFeedCacheUpdate(event.detail);
    });
  }

  /**
   * Handle cache invalidation events
   */
  private handleCacheInvalidationEvent(data: any): void {
    // Dispatch custom event for UI components
    window.dispatchEvent(new CustomEvent('cacheInvalidated', {
      detail: data
    }));
  }

  /**
   * Handle inventory update events
   */
  private handleInventoryUpdateEvent(data: any): void {
    // Dispatch custom event for marketplace components
    window.dispatchEvent(new CustomEvent('inventoryUpdated', {
      detail: data
    }));
  }

  /**
   * Handle new content events
   */
  private handleNewContentEvent(data: any): void {
    // Dispatch custom event for feed components
    window.dispatchEvent(new CustomEvent('newContentAvailable', {
      detail: data
    }));
  }

  /**
   * Handle feed cache updates
   */
  private handleFeedCacheUpdate(data: any): void {
    // Could trigger related preloading or invalidation
    console.log('Feed cache updated:', data);
  }

  /**
   * Perform cleanup operations
   */
  private async performCleanup(): Promise<void> {
    try {
      // Clean up expired entries
      await serviceWorkerCacheService.cleanupExpiredEntries();
      
      // Additional cleanup operations could be added here
      
      console.log('Cache cleanup completed');
      
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clean up strategy instances
    feedCacheStrategy.destroy();
    communityCacheStrategy.destroy();
    marketplaceCacheStrategy.destroy();
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const cacheStrategyIntegration = new CacheStrategyIntegration();

export default CacheStrategyIntegration;