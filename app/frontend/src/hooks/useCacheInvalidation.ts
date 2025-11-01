/**
 * Cache Invalidation Hook
 * Provides methods for invalidating cache entries by tags or patterns
 */

import { useCallback } from 'react';
import { serviceWorkerCacheService } from '../services/serviceWorkerCacheService';

interface CacheInvalidationOptions {
  tags?: string[];
  patterns?: string[];
  userScope?: string;
  immediate?: boolean;
}

export const useCacheInvalidation = () => {
  // Invalidate cache by tags
  const invalidateByTags = useCallback(async (tags: string[], options: CacheInvalidationOptions = {}) => {
    try {
      for (const tag of tags) {
        await serviceWorkerCacheService.invalidateByTag(tag);
      }
      
      // Notify other tabs about cache invalidation
      if ('BroadcastChannel' in window) {
        const cacheChannel = new BroadcastChannel('pwa-updates');
        cacheChannel.postMessage({
          type: 'CACHE_INVALIDATED',
          data: { tags, timestamp: Date.now() }
        });
      }
      
      console.log(`Cache invalidated for tags: ${tags.join(', ')}`);
    } catch (error) {
      console.error('Failed to invalidate cache by tags:', error);
      throw error;
    }
  }, []);

  // Invalidate user-specific cache
  const invalidateUserCache = useCallback(async (userId: string, dataTypes?: string[]) => {
    try {
      const tags = ['user', userId];
      if (dataTypes) {
        tags.push(...dataTypes);
      }
      
      await invalidateByTags(tags);
    } catch (error) {
      console.error('Failed to invalidate user cache:', error);
      throw error;
    }
  }, [invalidateByTags]);

  // Invalidate seller cache
  const invalidateSellerCache = useCallback(async (walletAddress: string, dataTypes?: string[]) => {
    try {
      const tags = ['seller', walletAddress];
      if (dataTypes) {
        tags.push(...dataTypes);
      }
      
      await invalidateByTags(tags);
    } catch (error) {
      console.error('Failed to invalidate seller cache:', error);
      throw error;
    }
  }, [invalidateByTags]);

  // Invalidate community cache
  const invalidateCommunityCache = useCallback(async (communityId: string, dataTypes?: string[]) => {
    try {
      const tags = ['community', communityId];
      if (dataTypes) {
        tags.push(...dataTypes);
      }
      
      await invalidateByTags(tags);
    } catch (error) {
      console.error('Failed to invalidate community cache:', error);
      throw error;
    }
  }, [invalidateByTags]);

  // Invalidate feed cache
  const invalidateFeedCache = useCallback(async (feedType?: string) => {
    try {
      const tags = ['feed'];
      if (feedType) {
        tags.push(feedType);
      }
      
      await invalidateByTags(tags);
    } catch (error) {
      console.error('Failed to invalidate feed cache:', error);
      throw error;
    }
  }, [invalidateByTags]);

  // Invalidate marketplace cache
  const invalidateMarketplaceCache = useCallback(async (productId?: string) => {
    try {
      const tags = ['marketplace'];
      if (productId) {
        tags.push(productId);
      }
      
      await invalidateByTags(tags);
    } catch (error) {
      console.error('Failed to invalidate marketplace cache:', error);
      throw error;
    }
  }, [invalidateByTags]);

  // Invalidate messaging cache
  const invalidateMessagingCache = useCallback(async (conversationId?: string) => {
    try {
      const tags = ['messaging'];
      if (conversationId) {
        tags.push(conversationId);
      }
      
      await invalidateByTags(tags);
    } catch (error) {
      console.error('Failed to invalidate messaging cache:', error);
      throw error;
    }
  }, [invalidateByTags]);

  // Clear all caches
  const clearAllCaches = useCallback(async () => {
    try {
      await serviceWorkerCacheService.clearAllCaches();
      
      // Notify other tabs
      if ('BroadcastChannel' in window) {
        const cacheChannel = new BroadcastChannel('pwa-updates');
        cacheChannel.postMessage({
          type: 'CACHE_CLEARED',
          data: { timestamp: Date.now() }
        });
      }
      
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
      throw error;
    }
  }, []);

  // Flush offline queue
  const flushOfflineQueue = useCallback(async () => {
    try {
      await serviceWorkerCacheService.flushOfflineQueue();
      console.log('Offline queue flushed');
    } catch (error) {
      console.error('Failed to flush offline queue:', error);
      throw error;
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(async () => {
    try {
      return await serviceWorkerCacheService.getCacheStats();
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    try {
      return serviceWorkerCacheService.getPerformanceMetrics();
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return null;
    }
  }, []);

  return {
    // Invalidation methods
    invalidateByTags,
    invalidateUserCache,
    invalidateSellerCache,
    invalidateCommunityCache,
    invalidateFeedCache,
    invalidateMarketplaceCache,
    invalidateMessagingCache,
    
    // Management methods
    clearAllCaches,
    flushOfflineQueue,
    
    // Information methods
    getCacheStats,
    getPerformanceMetrics
  };
};

export default useCacheInvalidation;