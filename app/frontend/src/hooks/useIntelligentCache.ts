import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IntelligentCacheIntegration, createIntelligentCacheIntegration } from '../services/intelligentCacheIntegration';
import { CachePriority } from '../services/intelligentSellerCache';

// Hook options
export interface UseIntelligentCacheOptions<T> {
  walletAddress: string;
  dataType: string;
  fetchFn?: () => Promise<T>;
  priority?: CachePriority;
  ttl?: number;
  dependencies?: string[];
  warmOnMount?: boolean;
  enabled?: boolean;
}

// Cache statistics for the hook
export interface CacheHookStats {
  hitRate: number;
  memoryUsage: number;
  cacheSize: number;
  lastUpdated: number;
}

/**
 * React hook for intelligent seller cache integration
 */
export function useIntelligentCache<T = any>(options: UseIntelligentCacheOptions<T>) {
  const queryClient = useQueryClient();
  const [cacheIntegration] = useState(() => createIntelligentCacheIntegration(queryClient));
  const [isWarming, setIsWarming] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheHookStats | null>(null);

  const {
    walletAddress,
    dataType,
    fetchFn,
    priority = CachePriority.MEDIUM,
    ttl,
    dependencies = [],
    warmOnMount = false,
    enabled = true
  } = options;

  // Generate query key
  const queryKey = useMemo(() => ['seller', dataType, walletAddress], [dataType, walletAddress]);

  // React Query configuration
  const queryOptions: UseQueryOptions<T> = {
    queryKey,
    queryFn: async () => {
      // Try intelligent cache first
      const cachedData = await cacheIntegration.getSellerData<T>(dataType, walletAddress, fetchFn);
      
      if (cachedData) {
        return cachedData;
      }

      // Fallback to fetch function
      if (fetchFn) {
        const freshData = await fetchFn();
        
        // Store in intelligent cache
        if (freshData) {
          await cacheIntegration.setSellerData(dataType, walletAddress, freshData, {
            priority,
            ttl,
            dependencies
          });
        }
        
        return freshData;
      }

      throw new Error(`No data available for ${dataType} and no fetch function provided`);
    },
    enabled: enabled && !!walletAddress,
    staleTime: ttl || 5 * 60 * 1000, // 5 minutes default
    gcTime: (ttl || 5 * 60 * 1000) * 2, // 2x stale time
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  };

  // Use React Query
  const query = useQuery(queryOptions);

  // Warm cache on mount if requested
  useEffect(() => {
    if (warmOnMount && walletAddress && !query.data && !query.isLoading) {
      warmCache();
    }
  }, [warmOnMount, walletAddress, query.data, query.isLoading]);

  // Update cache stats periodically
  useEffect(() => {
    const updateStats = () => {
      const status = cacheIntegration.getSystemStatus();
      setCacheStats({
        hitRate: status.intelligent.hitRate,
        memoryUsage: status.intelligent.memoryUsage,
        cacheSize: status.intelligent.size,
        lastUpdated: Date.now()
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [cacheIntegration]);

  // Warm cache function
  const warmCache = useCallback(async (strategies?: string[]) => {
    if (!walletAddress) return;

    setIsWarming(true);
    try {
      await cacheIntegration.warmCacheForWallet(walletAddress, strategies);
    } catch (error) {
      console.error('[useIntelligentCache] Error warming cache:', error);
    } finally {
      setIsWarming(false);
    }
  }, [walletAddress, cacheIntegration]);

  // Invalidate cache function
  const invalidateCache = useCallback(async (dataTypes?: string[]) => {
    if (!walletAddress) return;

    try {
      await cacheIntegration.invalidateSellerCache(walletAddress, dataTypes);
      await query.refetch();
    } catch (error) {
      console.error('[useIntelligentCache] Error invalidating cache:', error);
    }
  }, [walletAddress, cacheIntegration, query]);

  // Update data function with optimistic updates
  const updateData = useCallback(async (
    updates: Partial<T>,
    options?: {
      optimistic?: boolean;
      invalidateRelated?: boolean;
    }
  ) => {
    if (!walletAddress || !query.data) return;

    const { optimistic = true, invalidateRelated = true } = options || {};

    try {
      if (optimistic) {
        // Optimistic update
        const updatedData = { ...query.data, ...updates };
        queryClient.setQueryData(queryKey, updatedData);
        
        // Update intelligent cache
        await cacheIntegration.setSellerData(dataType, walletAddress, updatedData, {
          priority,
          ttl,
          dependencies
        });
      }

      if (invalidateRelated) {
        // Invalidate related caches
        await cacheIntegration.invalidateSellerCache(walletAddress, dependencies);
      }

    } catch (error) {
      console.error('[useIntelligentCache] Error updating data:', error);
      // Revert optimistic update on error
      await query.refetch();
    }
  }, [walletAddress, query.data, queryClient, queryKey, cacheIntegration, dataType, priority, ttl, dependencies, query]);

  // Prefetch related data
  const prefetchRelated = useCallback(async (relatedDataTypes: string[]) => {
    if (!walletAddress) return;

    try {
      const prefetchPromises = relatedDataTypes.map(async (relatedType) => {
        const relatedQueryKey = ['seller', relatedType, walletAddress];
        
        return queryClient.prefetchQuery({
          queryKey: relatedQueryKey,
          queryFn: () => cacheIntegration.getSellerData(relatedType, walletAddress),
          staleTime: ttl || 5 * 60 * 1000
        });
      });

      await Promise.all(prefetchPromises);
    } catch (error) {
      console.error('[useIntelligentCache] Error prefetching related data:', error);
    }
  }, [walletAddress, queryClient, cacheIntegration, ttl]);

  // Get cache performance for this specific data type
  const getCachePerformance = useCallback(() => {
    const report = cacheIntegration.getCacheReport();
    return {
      hitRate: report.performance.summary.hitRate,
      responseTime: report.performance.summary.averageResponseTime,
      memoryUsage: report.performance.summary.memoryUsage,
      recommendations: report.recommendations.filter(rec => 
        rec.description.toLowerCase().includes(dataType.toLowerCase())
      )
    };
  }, [cacheIntegration, dataType]);

  // Remove query from cache
  const removeFromCache = useCallback(() => {
    queryClient.removeQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    // React Query data
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
    isStale: query.isStale,

    // Cache-specific data
    isWarming,
    cacheStats,

    // Cache operations
    warmCache,
    invalidateCache,
    updateData,
    prefetchRelated,
    getCachePerformance,

    // React Query operations
    refetch: query.refetch,
    remove: removeFromCache,
  };
}

/**
 * Hook for managing intelligent cache system
 */
export function useIntelligentCacheSystem() {
  const queryClient = useQueryClient();
  const [cacheIntegration] = useState(() => createIntelligentCacheIntegration(queryClient));
  const [systemStatus, setSystemStatus] = useState(cacheIntegration.getSystemStatus());

  // Update system status periodically
  useEffect(() => {
    const updateStatus = () => {
      setSystemStatus(cacheIntegration.getSystemStatus());
    };

    const interval = setInterval(updateStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [cacheIntegration]);

  // Start/stop system
  const startSystem = useCallback(async () => {
    try {
      await cacheIntegration.start();
      setSystemStatus(cacheIntegration.getSystemStatus());
    } catch (error) {
      console.error('[useIntelligentCacheSystem] Error starting system:', error);
    }
  }, [cacheIntegration]);

  const stopSystem = useCallback(() => {
    try {
      cacheIntegration.stop();
      setSystemStatus(cacheIntegration.getSystemStatus());
    } catch (error) {
      console.error('[useIntelligentCacheSystem] Error stopping system:', error);
    }
  }, [cacheIntegration]);

  // Run optimization
  const runOptimization = useCallback(async () => {
    try {
      const results = await cacheIntegration.runOptimization();
      setSystemStatus(cacheIntegration.getSystemStatus());
      return results;
    } catch (error) {
      console.error('[useIntelligentCacheSystem] Error running optimization:', error);
      return [];
    }
  }, [cacheIntegration]);

  // Get comprehensive report
  const getReport = useCallback(() => {
    return cacheIntegration.getCacheReport();
  }, [cacheIntegration]);

  // Clear all caches
  const clearAllCaches = useCallback(async () => {
    try {
      await cacheIntegration.clearAllCaches();
      setSystemStatus(cacheIntegration.getSystemStatus());
    } catch (error) {
      console.error('[useIntelligentCacheSystem] Error clearing caches:', error);
    }
  }, [cacheIntegration]);

  return {
    systemStatus,
    startSystem,
    stopSystem,
    runOptimization,
    getReport,
    clearAllCaches,
    cacheIntegration
  };
}

/**
 * Hook for cache performance monitoring
 */
export function useCachePerformance(walletAddress?: string) {
  const { cacheIntegration } = useIntelligentCacheSystem();
  const [performance, setPerformance] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const updatePerformance = () => {
      const report = cacheIntegration.getCacheReport();
      setPerformance(report.performance);
      setAlerts(report.performance.alerts || []);
    };

    updatePerformance();
    const interval = setInterval(updatePerformance, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [cacheIntegration]);

  const getWalletSpecificStats = useCallback(() => {
    if (!walletAddress) return null;

    // This would return wallet-specific cache statistics
    // For now, return general stats
    return performance?.summary || null;
  }, [walletAddress, performance]);

  return {
    performance,
    alerts,
    getWalletSpecificStats
  };
}