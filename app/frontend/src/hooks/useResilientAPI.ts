import { useState, useEffect, useCallback } from 'react';
import { requestManager } from '../services/requestManager';
import { apiCircuitBreaker } from '../services/circuitBreaker';
import { useRequestCoalescing } from './useRequestCoalescing';
import { Community } from '../models/Community';

interface UseResilientAPIOptions {
  cacheKey?: string;
  cacheTTL?: number;
  fallbackData?: any;
  retryOnMount?: boolean;
  enableCircuitBreaker?: boolean;
}

interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isServiceAvailable: boolean;
  isFromCache: boolean;
  retryCount: number;
}

/**
 * Hook for resilient API calls with circuit breaker, caching, and fallback
 */
export function useResilientAPI<T>(
  url: string,
  options: RequestInit = {},
  config: UseResilientAPIOptions = {}
) {
  const {
    cacheKey = url,
    cacheTTL = 60000, // 1 minute default
    fallbackData,
    retryOnMount = true,
    enableCircuitBreaker = true
  } = config;

  const [state, setState] = useState<APIState<T>>({
    data: fallbackData || null,
    loading: false,
    error: null,
    isServiceAvailable: true,
    isFromCache: false,
    retryCount: 0
  });

  const { request: coalescedRequest, getCachedData, invalidateCache } = useRequestCoalescing(
    () => makeAPIRequest(),
    cacheKey,
    cacheTTL
  );

  const makeAPIRequest = useCallback(async (): Promise<T> => {
    const circuitBreaker = enableCircuitBreaker ? apiCircuitBreaker : null;
    
    const executeRequest = async () => {
      return await requestManager.request<T>(url, options, {
        timeout: 20000,
        retries: 2,
        deduplicate: true
      });
    };

    if (circuitBreaker) {
      return circuitBreaker.execute(
        executeRequest,
        () => {
          // Circuit breaker fallback
          const cached = getCachedData();
          if (cached) {
            return cached;
          }
          if (fallbackData) {
            return fallbackData;
          }
          throw new Error('Service temporarily unavailable');
        }
      );
    } else {
      return executeRequest();
    }
  }, [url, options, enableCircuitBreaker, getCachedData, fallbackData]);

  const fetchData = useCallback(async (isRetry = false) => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      retryCount: isRetry ? prev.retryCount + 1 : 0
    }));

    try {
      const result = await coalescedRequest();
      
      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        isServiceAvailable: true,
        isFromCache: false
      }));
    } catch (error) {
      const err = error as Error;
      const isServiceUnavailable = (error as any)?.isServiceUnavailable || 
                                  (error as any)?.status === 503 ||
                                  err.message.includes('Service temporarily unavailable');

      // Try to get cached data on error
      const cached = getCachedData();
      
      setState(prev => ({
        ...prev,
        data: cached || fallbackData || prev.data,
        loading: false,
        error: err,
        isServiceAvailable: !isServiceUnavailable,
        isFromCache: !!cached
      }));

      console.warn(`API request failed for ${url}:`, err.message);
    }
  }, [coalescedRequest, getCachedData, fallbackData, url]);

  const retry = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const refresh = useCallback(() => {
    invalidateCache();
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

  return {
    ...state,
    retry,
    refresh,
    circuitBreakerState: enableCircuitBreaker ? apiCircuitBreaker.getState() : 'CLOSED'
  };
}

/**
 * Specialized hook for community data
 */
export function useCommunities(params?: any) {
  const url = '/api/communities' + (params ? `?${new URLSearchParams(params).toString()}` : '');
  
  return useResilientAPI<Community[]>(url, { method: 'GET' }, {
    cacheKey: `communities:${JSON.stringify(params || {})}`,
    cacheTTL: 120000, // 2 minutes
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
 * Specialized hook for feed data
 */
export function useFeed(params?: any) {
  const url = '/api/feed/enhanced' + (params ? `?${new URLSearchParams(params).toString()}` : '');
  
  return useResilientAPI(url, { method: 'GET' }, {
    cacheKey: `feed:${JSON.stringify(params || {})}`,
    cacheTTL: 30000, // 30 seconds
    fallbackData: []
  });
}

/**
 * Specialized hook for governance data
 */
export function useGovernance() {
  return useResilientAPI('/api/governance/proposals/active', { method: 'GET' }, {
    cacheKey: 'governance:active',
    cacheTTL: 180000, // 3 minutes
    fallbackData: []
  });
}