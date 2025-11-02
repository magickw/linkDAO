import { useRef, useCallback, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

/**
 * Hook for request coalescing and caching
 * Prevents duplicate requests and caches results
 */
export function useRequestCoalescing<T>(
  requestFn: () => Promise<T>,
  key: string,
  ttl: number = 30000 // 30 seconds default TTL
) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const pendingRef = useRef<Map<string, Promise<T>>>(new Map());
  
  // Cleanup expired cache entries
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      for (const [cacheKey, entry] of cacheRef.current.entries()) {
        if (now - entry.timestamp > ttl * 2) { // Keep cache 2x TTL for fallback
          cacheRef.current.delete(cacheKey);
        }
      }
    };
    
    const interval = setInterval(cleanup, ttl);
    return () => clearInterval(interval);
  }, [ttl]);
  
  const coalescedRequest = useCallback(async (): Promise<T> => {
    // Check fresh cache
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // Check pending requests
    const pending = pendingRef.current.get(key);
    if (pending) {
      console.log('Coalescing request:', key);
      return pending;
    }
    
    // Create new request
    const promise = requestFn()
      .then(data => {
        cacheRef.current.set(key, { 
          data, 
          timestamp: Date.now() 
        });
        pendingRef.current.delete(key);
        return data;
      })
      .catch(error => {
        pendingRef.current.delete(key);
        
        // Return stale cache if available during errors
        const staleCache = cacheRef.current.get(key);
        if (staleCache) {
          console.log('Request failed, returning stale cache:', key);
          return staleCache.data;
        }
        
        throw error;
      });
    
    pendingRef.current.set(key, promise);
    return promise;
  }, [requestFn, key, ttl]);
  
  // Function to invalidate cache
  const invalidateCache = useCallback(() => {
    cacheRef.current.delete(key);
    pendingRef.current.delete(key);
  }, [key]);
  
  // Function to get cached data without making request
  const getCachedData = useCallback((): T | null => {
    const cached = cacheRef.current.get(key);
    return cached ? cached.data : null;
  }, [key]);
  
  return {
    request: coalescedRequest,
    invalidateCache,
    getCachedData
  };
}

/**
 * Global request coalescing for shared data
 */
class GlobalRequestCoalescer {
  private cache = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, Promise<any>>();
  
  async request<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 30000
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    // Check pending
    const pending = this.pending.get(key);
    if (pending) {
      return pending;
    }
    
    // Create request
    const promise = requestFn()
      .then(data => {
        this.cache.set(key, { data, timestamp: Date.now() });
        this.pending.delete(key);
        return data;
      })
      .catch(error => {
        this.pending.delete(key);
        
        // Return stale cache if available
        const staleCache = this.cache.get(key);
        if (staleCache) {
          return staleCache.data;
        }
        
        throw error;
      });
    
    this.pending.set(key, promise);
    return promise;
  }
  
  invalidate(key: string) {
    this.cache.delete(key);
    this.pending.delete(key);
  }
  
  clear() {
    this.cache.clear();
    this.pending.clear();
  }
}

export const globalRequestCoalescer = new GlobalRequestCoalescer();