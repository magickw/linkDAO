import { useCallback, useEffect, useRef } from 'react';
import { serviceWorkerCacheService } from '../services/serviceWorkerCacheService';

interface CacheOptions {
  strategy?: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' | 'NetworkOnly';
  maxAge?: number;
  tags?: string[];
  priority?: number;
}

interface PredictionContext {
  filter?: any;
  currentPage?: number;
  userBehavior?: string[];
  [key: string]: any;
}

export function useIntelligentCache() {
  const cacheServiceRef = useRef(serviceWorkerCacheService);
  const predictionCacheRef = useRef(new Map<string, number>());

  // Initialize cache service
  useEffect(() => {
    cacheServiceRef.current.initialize().catch(error => {
      console.warn('Failed to initialize intelligent cache:', error);
    });

    return () => {
      cacheServiceRef.current.destroy();
    };
  }, []);

  // Cache resource with intelligent strategy
  const cacheWithStrategy = useCallback(async (
    url: string,
    strategyKey: string,
    tags: string[] = []
  ): Promise<Response | null> => {
    try {
      return await cacheServiceRef.current.cacheWithStrategy(url, strategyKey, tags);
    } catch (error) {
      console.error('Cache with strategy failed:', error);
      return null;
    }
  }, []);

  // Invalidate cache by tags
  const invalidateByTags = useCallback(async (tags: string[]): Promise<void> => {
    try {
      await cacheServiceRef.current.invalidateByTags(tags);
    } catch (error) {
      console.error('Cache invalidation failed:', error);
    }
  }, []);

  // Predictive preloading with user behavior analysis
  const predictivePreload = useCallback(async (
    userId: string,
    currentAction: string,
    context: PredictionContext
  ): Promise<void> => {
    try {
      // Generate predictions based on current action and context
      const predictions = await generatePredictions(currentAction, context);
      
      // Cache predictions with appropriate strategies
      for (const prediction of predictions) {
        if (prediction.priority > 0.5) {
          const strategyKey = determineOptimalStrategy(prediction.url, prediction.type);
          await cacheServiceRef.current.cacheWithStrategy(
            prediction.url,
            strategyKey,
            ['preload', ...prediction.tags]
          );
        }
      }

      // Store prediction success for learning
      const predictionKey = `${userId}-${currentAction}`;
      predictionCacheRef.current.set(predictionKey, Date.now());
    } catch (error) {
      console.error('Predictive preload failed:', error);
    }
  }, []);

  // Preload critical resources for current view
  const preloadCriticalResources = useCallback(async (
    resources: Array<{ url: string; strategy?: string; priority?: number }>
  ): Promise<void> => {
    try {
      // Sort by priority and preload high-priority resources first
      const sortedResources = resources
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 10); // Limit to prevent overwhelming

      for (const resource of sortedResources) {
        const strategy = resource.strategy || 'communities';
        await cacheServiceRef.current.cacheWithStrategy(
          resource.url,
          strategy,
          ['critical', 'preload']
        );
      }
    } catch (error) {
      console.error('Critical resource preload failed:', error);
    }
  }, []);

  // Cache feed data with intelligent pagination
  const cacheFeedData = useCallback(async (
    filter: any,
    page: number,
    data: any
  ): Promise<void> => {
    try {
      const cacheKey = `feed-${JSON.stringify(filter)}-${page}`;
      const url = `/api/feed/enhanced?${new URLSearchParams({
        sortBy: filter.sortBy,
        page: page.toString(),
        limit: '20',
        ...(filter.timeRange && { timeRange: filter.timeRange }),
        ...(filter.communityId && { communityId: filter.communityId })
      }).toString()}`;

      // Cache with feed strategy
      await cacheServiceRef.current.cachePreviewContent(url, 'feed', data);

      // Preload next page if this is page 1
      if (page === 1 && data.hasMore) {
        setTimeout(() => {
          const nextPageUrl = url.replace(`page=${page}`, `page=${page + 1}`);
          cacheServiceRef.current.cacheWithStrategy(nextPageUrl, 'feed', ['preload']);
        }, 2000);
      }
    } catch (error) {
      console.error('Feed data caching failed:', error);
    }
  }, []);

  // Cache community data with related content
  const cacheCommunityData = useCallback(async (
    communityId: string,
    includeRelated: boolean = true
  ): Promise<void> => {
    try {
      const urls = [
        `/api/communities/${communityId}`,
        `/api/communities/${communityId}/posts`,
        `/api/communities/${communityId}/members`
      ];

      if (includeRelated) {
        urls.push(
          `/api/communities/${communityId}/related`,
          `/api/communities/${communityId}/stats`
        );
      }

      await cacheServiceRef.current.cacheResources(urls, 'communities-v1');
    } catch (error) {
      console.error('Community data caching failed:', error);
    }
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return cacheServiceRef.current.getCacheStats();
  }, []);

  // Check storage quota
  const checkStorageQuota = useCallback(async () => {
    return await cacheServiceRef.current.checkStorageQuota();
  }, []);

  // Warm cache with essential resources
  const warmCache = useCallback(async (urls: string[]): Promise<void> => {
    try {
      await cacheServiceRef.current.warmCache(urls);
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }, []);

  // Clear cache selectively
  const clearCache = useCallback(async (
    options: { tags?: string[]; olderThan?: number; strategy?: string } = {}
  ): Promise<void> => {
    try {
      if (options.tags) {
        await cacheServiceRef.current.invalidateByTags(options.tags);
      } else {
        await cacheServiceRef.current.clearAllCaches();
      }
    } catch (error) {
      console.error('Cache clearing failed:', error);
    }
  }, []);

  // Monitor cache performance
  const monitorCachePerformance = useCallback(() => {
    const stats = getCacheStats();
    
    // Log performance metrics
    console.log('Cache Performance:', {
      hitRate: `${stats.hitRate.toFixed(2)}%`,
      totalSize: `${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`,
      entryCount: stats.entryCount,
      lastCleanup: new Date(stats.lastCleanup).toLocaleString()
    });

    return stats;
  }, [getCacheStats]);

  return {
    cacheWithStrategy,
    invalidateByTags,
    predictivePreload,
    preloadCriticalResources,
    cacheFeedData,
    cacheCommunityData,
    getCacheStats,
    checkStorageQuota,
    warmCache,
    clearCache,
    monitorCachePerformance
  };
}

// Generate predictions based on user behavior
async function generatePredictions(
  currentAction: string,
  context: PredictionContext
): Promise<Array<{
  url: string;
  type: string;
  priority: number;
  tags: string[];
}>> {
  const predictions: Array<{
    url: string;
    type: string;
    priority: number;
    tags: string[];
  }> = [];

  switch (currentAction) {
    case 'viewing_feed':
      // Predict community page visits
      if (context.filter?.communityId) {
        predictions.push({
          url: `/api/communities/${context.filter.communityId}`,
          type: 'community',
          priority: 0.8,
          tags: ['community', 'prediction']
        });
      }

      // Predict user profile visits from social proof
      if (context.userBehavior?.includes('clicks_profiles')) {
        predictions.push({
          url: '/api/users/trending',
          type: 'profiles',
          priority: 0.6,
          tags: ['profiles', 'prediction']
        });
      }
      break;

    case 'viewing_community':
      // Predict post detail views
      predictions.push({
        url: `/api/communities/${context.filter?.communityId}/posts?sort=hot`,
        type: 'feed',
        priority: 0.9,
        tags: ['posts', 'prediction']
      });

      // Predict related communities
      predictions.push({
        url: `/api/communities/${context.filter?.communityId}/related`,
        type: 'communities',
        priority: 0.7,
        tags: ['communities', 'prediction']
      });
      break;

    case 'viewing_post':
      // Predict comment loading
      if (context.postId) {
        predictions.push({
          url: `/api/posts/${context.postId}/comments`,
          type: 'feed',
          priority: 0.8,
          tags: ['comments', 'prediction']
        });
      }

      // Predict author profile
      if (context.authorId) {
        predictions.push({
          url: `/api/users/${context.authorId}`,
          type: 'profiles',
          priority: 0.6,
          tags: ['profiles', 'prediction']
        });
      }
      break;

    case 'scrolling_feed':
      // Predict next page load
      if (context.currentPage) {
        const nextPage = context.currentPage + 1;
        const filterParams = new URLSearchParams({
          sortBy: context.filter?.sortBy || 'hot',
          page: nextPage.toString(),
          limit: '20',
          ...(context.filter?.timeRange && { timeRange: context.filter.timeRange }),
          ...(context.filter?.communityId && { communityId: context.filter.communityId })
        });

        predictions.push({
          url: `/api/feed/enhanced?${filterParams.toString()}`,
          type: 'feed',
          priority: 0.9,
          tags: ['feed', 'pagination', 'prediction']
        });
      }
      break;
  }

  return predictions;
}

// Determine optimal caching strategy for URL
function determineOptimalStrategy(url: string, type: string): string {
  // Feed content - fresh data preferred
  if (url.includes('/feed') || url.includes('/posts') || type === 'feed') {
    return 'feed';
  }

  // Community data - can be slightly stale
  if (url.includes('/communities') || type === 'community') {
    return 'communities';
  }

  // User profiles - cache first for performance
  if (url.includes('/users') || url.includes('/profiles') || type === 'profiles') {
    return 'profiles';
  }

  // Messages - never cache
  if (url.includes('/messages') || url.includes('/conversations')) {
    return 'messages';
  }

  // Default to communities strategy
  return 'communities';
}

// Hook for cache performance monitoring
export function useCachePerformanceMonitor() {
  const { monitorCachePerformance, getCacheStats } = useIntelligentCache();

  useEffect(() => {
    // Monitor cache performance every 5 minutes
    const interval = setInterval(() => {
      monitorCachePerformance();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [monitorCachePerformance]);

  return {
    getCacheStats,
    monitorCachePerformance
  };
}

// Hook for automatic cache warming
export function useCacheWarming(urls: string[], enabled: boolean = true) {
  const { warmCache } = useIntelligentCache();

  useEffect(() => {
    if (enabled && urls.length > 0) {
      // Warm cache after a short delay to not block initial render
      const timer = setTimeout(() => {
        warmCache(urls);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [urls, enabled, warmCache]);
}