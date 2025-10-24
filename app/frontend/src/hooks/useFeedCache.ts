import { useState, useEffect, useCallback } from 'react';
import { FeedFilter, EnhancedPost } from '../types/feed';
import useSWR from 'swr';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();

interface UseFeedCacheOptions {
  cacheTime?: number; // Cache time in milliseconds (default: 30 seconds)
  revalidateOnFocus?: boolean;
  dedupingInterval?: number;
}

export const useFeedCache = (
  filter: FeedFilter,
  page: number,
  options: UseFeedCacheOptions = {}
) => {
  const {
    cacheTime = 30000, // 30 seconds
    revalidateOnFocus = false,
    dedupingInterval = 30000
  } = options;

  const cacheKey = `${JSON.stringify(filter)}-${page}`;

  // Check if we have valid cached data
  const getCachedData = useCallback(() => {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data;
    }
    return null;
  }, [cacheKey, cacheTime]);

  // Fetcher function for SWR
  const fetcher = async () => {
    // First check cache
    const cachedData = getCachedData();
    if (cachedData) {
      return cachedData;
    }

    // If not in cache, fetch from service
    const { FeedService } = await import('../services/feedService');
    const response = await FeedService.getEnhancedFeed(filter, page);
    
    // Cache the response
    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    
    return response;
  };

  // Use SWR for data fetching with caching
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus,
      dedupingInterval,
      refreshInterval: cacheTime // Auto-refresh based on cache time
    }
  );

  // Clear cache for this key
  const clearCache = useCallback(() => {
    cache.delete(cacheKey);
  }, [cacheKey]);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    cache.clear();
  }, []);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    clearCache,
    clearAllCache,
    // Expose cache status for debugging
    isCached: !!getCachedData()
  };
};

// Hook for managing feed cache preferences
export const useFeedCachePreferences = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('feedCacheEnabled');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [cacheTime, setCacheTime] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('feedCacheTime');
      return saved ? parseInt(saved, 10) : 30000;
    }
    return 30000;
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('feedCacheEnabled', JSON.stringify(isEnabled));
  }, [isEnabled]);

  useEffect(() => {
    localStorage.setItem('feedCacheTime', cacheTime.toString());
  }, [cacheTime]);

  return {
    isEnabled,
    cacheTime,
    setIsEnabled,
    setCacheTime
  };
};

// Utility function to manually cache feed data
export const cacheFeedData = (
  filter: FeedFilter,
  page: number,
  data: any,
  cacheTime: number = 30000
) => {
  const cacheKey = `${JSON.stringify(filter)}-${page}`;
  cache.set(cacheKey, { data, timestamp: Date.now() });
};

// Utility function to get cached feed data
export const getCachedFeedData = (
  filter: FeedFilter,
  page: number,
  cacheTime: number = 30000
) => {
  const cacheKey = `${JSON.stringify(filter)}-${page}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cacheTime) {
    return cached.data;
  }
  return null;
};

// Utility function to clear cache for specific filter
export const clearFeedCache = (filter: FeedFilter, page?: number) => {
  if (page !== undefined) {
    const cacheKey = `${JSON.stringify(filter)}-${page}`;
    cache.delete(cacheKey);
  } else {
    // Clear all cache entries for this filter
    const filterKey = JSON.stringify(filter);
    for (const key of cache.keys()) {
      if (key.startsWith(filterKey)) {
        cache.delete(key);
      }
    }
  }
};