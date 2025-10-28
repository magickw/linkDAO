import { useState, useEffect, useCallback, useRef } from 'react';
import { FeedFilter, EnhancedPost } from '../types/feed';
import useSWR from 'swr';

// Enhanced cache with better management
class FeedCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; expiresAt: number }>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds
  private readonly MAX_ENTRIES = 100;

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    // Clean up expired entries
    this.cleanup();
    
    // Remove oldest entries if we're at max capacity
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { data, timestamp: Date.now(), expiresAt });
  }

  get(key: string) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const cacheManager = new FeedCacheManager();

interface UseFeedCacheOptions {
  cacheTime?: number; // Cache time in milliseconds (default: 30 seconds)
  revalidateOnFocus?: boolean;
  dedupingInterval?: number;
  enableBackgroundRefresh?: boolean; // Enable background refresh of cached data
}

export const useFeedCache = (
  filter: FeedFilter,
  page: number,
  options: UseFeedCacheOptions = {}
) => {
  const {
    cacheTime = 30000, // 30 seconds
    revalidateOnFocus = false,
    dedupingInterval = 30000,
    enableBackgroundRefresh = false
  } = options;

  const cacheKey = `${JSON.stringify(filter)}-${page}`;
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we have valid cached data
  const getCachedData = useCallback(() => {
    return cacheManager.get(cacheKey);
  }, [cacheKey]);

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
    cacheManager.set(cacheKey, response, cacheTime);
    
    return response;
  };

  // Use SWR for data fetching with caching
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    cacheKey,
    fetcher,
    {
      revalidateOnFocus,
      dedupingInterval,
      refreshInterval: enableBackgroundRefresh ? cacheTime : 0, // Auto-refresh based on cache time if enabled
      revalidateIfStale: true,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  );

  // Background refresh mechanism
  useEffect(() => {
    if (!enableBackgroundRefresh || !data) return;

    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
    }

    backgroundRefreshRef.current = setInterval(async () => {
      try {
        const { FeedService } = await import('../services/feedService');
        const freshData = await FeedService.getEnhancedFeed(filter, page);
        cacheManager.set(cacheKey, freshData, cacheTime);
        // Update SWR cache
        mutate(freshData, false); // Don't revalidate since we just fetched
      } catch (err) {
        console.warn('Background refresh failed:', err);
      }
    }, cacheTime);

    return () => {
      if (backgroundRefreshRef.current) {
        clearInterval(backgroundRefreshRef.current);
        backgroundRefreshRef.current = null;
      }
    };
  }, [enableBackgroundRefresh, cacheKey, filter, page, cacheTime, data, mutate]);

  // Clear cache for this key
  const clearCache = useCallback(() => {
    cacheManager.clear();
  }, []);

  // Clear all cache
  const clearAllCache = useCallback(() => {
    cacheManager.clear();
  }, []);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    clearCache,
    clearAllCache,
    getCacheStats,
    // Expose cache status for debugging
    isCached: !!getCachedData(),
    cacheSize: cacheManager.getSize()
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

  const [enableBackgroundRefresh, setEnableBackgroundRefresh] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('feedCacheBackgroundRefresh');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('feedCacheEnabled', JSON.stringify(isEnabled));
  }, [isEnabled]);

  useEffect(() => {
    localStorage.setItem('feedCacheTime', cacheTime.toString());
  }, [cacheTime]);

  useEffect(() => {
    localStorage.setItem('feedCacheBackgroundRefresh', JSON.stringify(enableBackgroundRefresh));
  }, [enableBackgroundRefresh]);

  return {
    isEnabled,
    cacheTime,
    enableBackgroundRefresh,
    setIsEnabled,
    setCacheTime,
    setEnableBackgroundRefresh
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
  cacheManager.set(cacheKey, data, cacheTime);
};

// Utility function to get cached feed data
export const getCachedFeedData = (
  filter: FeedFilter,
  page: number,
  cacheTime: number = 30000
) => {
  const cacheKey = `${JSON.stringify(filter)}-${page}`;
  return cacheManager.get(cacheKey);
};

// Utility function to clear cache for specific filter
export const clearFeedCache = (filter: FeedFilter, page?: number) => {
  if (page !== undefined) {
    const cacheKey = `${JSON.stringify(filter)}-${page}`;
    cacheManager.clear();
  } else {
    // Clear all cache entries for this filter
    const filterKey = JSON.stringify(filter);
    cacheManager.clear();
  }
};