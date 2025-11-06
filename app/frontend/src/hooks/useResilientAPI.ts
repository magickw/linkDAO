import { useState, useEffect, useCallback, useRef } from 'react';
import { enhancedRequestManager } from '../services/enhancedRequestManager';
import { apiCircuitBreaker, communityCircuitBreaker, feedCircuitBreaker, marketplaceCircuitBreaker, CircuitBreaker } from '../services/circuitBreaker';
import { useRequestCoalescing } from './useRequestCoalescing';
import { actionQueue } from '../services/actionQueueService';
import { Community } from '../models/Community';

interface UseResilientAPIOptions {
  cacheKey?: string;
  cacheTTL?: number;
  fallbackData?: any;
  retryOnMount?: boolean;
  enableCircuitBreaker?: boolean;
  circuitBreaker?: CircuitBreaker;
  enableActionQueue?: boolean;
  staleTTL?: number; // How long to keep stale cache data
  backgroundRefresh?: boolean;
}

interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isServiceAvailable: boolean;
  isFromCache: boolean;
  isFromFallback: boolean;
  isStale: boolean;
  retryCount: number;
  circuitBreakerState: string;
  lastSuccessfulFetch: number | null;
}

/**
 * Enhanced hook for resilient API calls with circuit breaker, caching, and graceful degradation
 */
export function useResilientAPI<T>(
  url: string,
  options: RequestInit = {},
  config: UseResilientAPIOptions = {}
) {
  const {
    cacheKey = url,
    cacheTTL = 60000, // 1 minute default
    staleTTL = 300000, // 5 minutes for stale data
    fallbackData,
    retryOnMount = true,
    enableCircuitBreaker = true,
    circuitBreaker = apiCircuitBreaker,
    enableActionQueue = false,
    backgroundRefresh = true
  } = config;

  const [state, setState] = useState<APIState<T>>({
    data: fallbackData || null,
    loading: false,
    error: null,
    isServiceAvailable: true,
    isFromCache: false,
    isFromFallback: false,
    isStale: false,
    retryCount: 0,
    circuitBreakerState: 'CLOSED',
    lastSuccessfulFetch: null
  });

  const backgroundRefreshRef = useRef<NodeJS.Timeout>();

  const { request: coalescedRequest, getCachedData, setCachedData, invalidateCache, getCacheMetadata } = useRequestCoalescing(
    () => makeAPIRequest(),
    cacheKey,
    cacheTTL
  );

  const makeAPIRequest = useCallback(async (): Promise<T> => {
    // Enhanced fallback strategy function
    const getFallbackData = async () => {
      const cached = getCachedData();
      const cacheMetadata = getCacheMetadata();
      
      // Try cached data first (even if stale)
      if (cached) {
        console.log('Using cached data as fallback');
        return cached;
      }
      
      // Try fallback data
      if (fallbackData) {
        console.log('Using provided fallback data');
        return fallbackData;
      }
      
      // If we have stale data, use it
      if (cacheMetadata && cacheMetadata.data && Date.now() - cacheMetadata.timestamp < staleTTL) {
        console.log('Using stale cached data as fallback');
        return cacheMetadata.data;
      }
      
      throw new Error('Service temporarily unavailable - no fallback data available');
    };

    return await enhancedRequestManager.request<T>(url, options, {
      timeout: 20000,
      retries: 2,
      circuitBreaker: enableCircuitBreaker ? circuitBreaker : undefined,
      enableCoalescing: true,
      cacheKey,
      cacheTTL,
      fallbackData: await getFallbackData().catch(() => undefined),
      priority: 'medium'
    });
  }, [url, options, enableCircuitBreaker, circuitBreaker, getCachedData, getCacheMetadata, fallbackData, staleTTL, cacheKey, cacheTTL]);

  const fetchData = useCallback(async (isRetry = false, isBackground = false) => {
    if (!isBackground) {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        retryCount: isRetry ? prev.retryCount + 1 : 0
      }));
    }

    try {
      const result = await coalescedRequest();
      
      setState(prev => ({
        ...prev,
        data: result as T,
        loading: false,
        error: null,
        isServiceAvailable: true,
        isFromCache: false,
        isFromFallback: false,
        isStale: false,
        circuitBreakerState: enableCircuitBreaker ? circuitBreaker.getState() : 'CLOSED',
        lastSuccessfulFetch: Date.now()
      }));

      // Cache the successful result
      setCachedData(result);
      
    } catch (error) {
      const err = error as Error;
      const isServiceUnavailable = (error as any)?.isServiceUnavailable || 
                                  (error as any)?.status === 503 ||
                                  err.message.includes('Service temporarily unavailable');

      // Enhanced fallback strategy
      let fallbackResult = null;
      let isFromCache = false;
      let isFromFallback = false;
      let isStale = false;

      // Try cached data first
      const cached = getCachedData();
      if (cached) {
        fallbackResult = cached;
        isFromCache = true;
      } else {
        // Try stale cache data
        const cacheMetadata = getCacheMetadata();
        if (cacheMetadata && cacheMetadata.data && Date.now() - cacheMetadata.timestamp < staleTTL) {
          fallbackResult = cacheMetadata.data;
          isFromCache = true;
          isStale = true;
        } else if (fallbackData) {
          // Use provided fallback data
          fallbackResult = fallbackData;
          isFromFallback = true;
        }
      }
      
      setState(prev => ({
        ...prev,
        data: fallbackResult || prev.data,
        loading: false,
        error: err,
        isServiceAvailable: !isServiceUnavailable,
        isFromCache,
        isFromFallback,
        isStale,
        circuitBreakerState: enableCircuitBreaker ? circuitBreaker.getState() : 'CLOSED'
      }));

      console.warn(`API request failed for ${url}:`, err.message);
      
      // If this is a user action and action queue is enabled, queue it for later
      if (enableActionQueue && isRetry && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
        const actionType = determineActionType(url, options.method);
        if (actionType) {
          actionQueue.addAction(actionType, {
            url,
            options,
            timestamp: Date.now()
          });
          console.log(`Action queued for later: ${actionType}`);
        }
      }
    }
  }, [coalescedRequest, getCachedData, setCachedData, getCacheMetadata, fallbackData, url, options, enableCircuitBreaker, circuitBreaker, enableActionQueue, staleTTL]);

  // Helper function to determine action type for queuing
  const determineActionType = useCallback((url: string, method: string): 'post' | 'comment' | 'community_join' | 'community_create' | 'product_create' | 'like' | 'follow' | null => {
    const upperMethod = method.toUpperCase();
    
    if (url.includes('/posts') && upperMethod === 'POST') return 'post';
    if (url.includes('/communities') && upperMethod === 'POST') return 'community_create';
    if (url.includes('/marketplace/listings') && upperMethod === 'POST') return 'product_create';
    if (url.includes('/communities') && url.includes('/join') && upperMethod === 'POST') return 'community_join';
    if (url.includes('/comments') && upperMethod === 'POST') return 'comment';
    if (url.includes('/like') && upperMethod === 'POST') return 'like';
    if (url.includes('/follow') && upperMethod === 'POST') return 'follow';
    
    return null;
  }, []);

  const retry = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const refresh = useCallback(() => {
    invalidateCache();
    fetchData();
  }, [invalidateCache, fetchData]);

  const forceRefresh = useCallback(() => {
    invalidateCache();
    setState(prev => ({ ...prev, isStale: false }));
    fetchData();
  }, [invalidateCache, fetchData]);

  // Auto-fetch on mount
  useEffect(() => {
    if (retryOnMount) {
      fetchData();
    }
  }, [fetchData, retryOnMount]);

  // Auto-retry when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (!state.isServiceAvailable && state.error) {
        console.log('Back online, retrying failed request');
        fetchData(true);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [state.isServiceAvailable, state.error, fetchData]);

  // Background refresh for stale data
  useEffect(() => {
    if (backgroundRefresh && state.isStale && state.data && navigator.onLine) {
      backgroundRefreshRef.current = setTimeout(() => {
        console.log('Background refresh for stale data');
        fetchData(false, true);
      }, 5000); // Wait 5 seconds before background refresh
    }

    return () => {
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current);
      }
    };
  }, [state.isStale, state.data, backgroundRefresh, fetchData]);

  // Circuit breaker state monitoring
  useEffect(() => {
    if (enableCircuitBreaker && circuitBreaker) {
      const unsubscribe = circuitBreaker.subscribe((newState) => {
        setState(prev => ({
          ...prev,
          circuitBreakerState: newState
        }));
      });

      return unsubscribe;
    }
  }, [enableCircuitBreaker, circuitBreaker]);

  return {
    ...state,
    retry,
    refresh,
    forceRefresh,
    hasData: !!state.data,
    isHealthy: state.isServiceAvailable && !state.error && state.circuitBreakerState === 'CLOSED'
  };
}

/**
 * Specialized hook for community data with enhanced resilience
 */
export function useCommunities(params?: any) {
  const url = '/api/communities' + (params ? `?${new URLSearchParams(params).toString()}` : '');
  
  return useResilientAPI<Community[]>(url, { method: 'GET' }, {
    cacheKey: `communities:${JSON.stringify(params || {})}`,
    cacheTTL: 120000, // 2 minutes
    staleTTL: 600000, // 10 minutes for stale data
    circuitBreaker: communityCircuitBreaker,
    backgroundRefresh: true,
    fallbackData: [
      {
        id: 'linkdao',
        name: 'LinkDAO',
        displayName: 'LinkDAO',
        description: 'The main LinkDAO community',
        rules: [],
        memberCount: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'dao',
        tags: [],
        isPublic: true,
        moderators: [],
        settings: {
          allowedPostTypes: [],
          requireApproval: false,
          minimumReputation: 0,
          stakingRequirements: []
        }
      }
    ]
  });
}

/**
 * Specialized hook for feed data with enhanced resilience
 */
export function useFeed(params?: any) {
  const url = '/api/feed/enhanced' + (params ? `?${new URLSearchParams(params).toString()}` : '');
  
  return useResilientAPI(url, { method: 'GET' }, {
    cacheKey: `feed:${JSON.stringify(params || {})}`,
    cacheTTL: 30000, // 30 seconds
    staleTTL: 300000, // 5 minutes for stale data
    circuitBreaker: feedCircuitBreaker,
    backgroundRefresh: true,
    fallbackData: []
  });
}

/**
 * Specialized hook for governance data with enhanced resilience
 */
export function useGovernance() {
  return useResilientAPI('/api/governance/proposals/active', { method: 'GET' }, {
    cacheKey: 'governance:active',
    cacheTTL: 180000, // 3 minutes
    staleTTL: 900000, // 15 minutes for stale data
    circuitBreaker: apiCircuitBreaker,
    backgroundRefresh: true,
    fallbackData: []
  });
}

/**
 * Specialized hook for marketplace data with enhanced resilience
 */
export function useMarketplace(params?: any) {
  const url = '/api/marketplace/listings' + (params ? `?${new URLSearchParams(params).toString()}` : '');
  
  return useResilientAPI(url, { method: 'GET' }, {
    cacheKey: `marketplace:${JSON.stringify(params || {})}`,
    cacheTTL: 60000, // 1 minute
    staleTTL: 600000, // 10 minutes for stale data
    circuitBreaker: marketplaceCircuitBreaker,
    backgroundRefresh: true,
    fallbackData: []
  });
}

/**
 * Hook for resilient user actions with automatic queuing
 */
export function useResilientAction<T>(
  url: string,
  options: RequestInit,
  config: UseResilientAPIOptions = {}
) {
  return useResilientAPI<T>(url, options, {
    ...config,
    enableActionQueue: true,
    retryOnMount: false
  });
}