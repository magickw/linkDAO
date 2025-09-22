/**
 * Global Request Manager - Prevents duplicate API calls and implements aggressive caching
 */

interface RequestInfo {
  promise: Promise<any>;
  timestamp: number;
  data?: any;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class GlobalRequestManager {
  private pendingRequests = new Map<string, RequestInfo>();
  private cache = new Map<string, CacheEntry>();
  private requestCounts = new Map<string, { count: number; windowStart: number }>();
  
  // Configuration
  private readonly CACHE_DURATION = 300000; // 5 minutes default cache
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 3; // Very aggressive rate limiting
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  
  // Special cache durations for different endpoints
  private readonly CACHE_DURATIONS = new Map([
    ['/api/posts/feed', 30000], // 30 seconds for feed
    ['/api/profiles/', 600000], // 10 minutes for profiles
    ['/api/auth/nonce/', 300000], // 5 minutes for nonce
    ['coingecko.com', 300000], // 5 minutes for price data
    ['web3modal.org', 3600000], // 1 hour for web3modal config
  ]);

  /**
   * Make a request with deduplication and caching
   */
  async request<T>(
    url: string, 
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<T> {
    const key = cacheKey || this.generateKey(url, options);
    const now = Date.now();

    // Check cache first
    const cached = this.getFromCache<T>(key);
    if (cached) {
      return cached;
    }

    // Check rate limiting
    if (!this.checkRateLimit(url, now)) {
      console.warn('Rate limit exceeded for:', url);
      // Return stale cache if available
      const stale = this.getFromCache<T>(key, true);
      if (stale) {
        return stale;
      }
      throw new Error('Rate limit exceeded and no cached data available');
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log('Request already pending, waiting for result:', key);
      try {
        return await pending.promise;
      } catch (error) {
        // If pending request fails, remove it and try again
        this.pendingRequests.delete(key);
        throw error;
      }
    }

    // Create new request with timeout
    const requestPromise = this.executeRequest<T>(url, options, key);
    
    this.pendingRequests.set(key, {
      promise: requestPromise,
      timestamp: now
    });

    try {
      const result = await requestPromise;
      this.pendingRequests.delete(key);
      
      // Cache successful results
      this.setCache(key, result, this.getCacheDuration(url));
      
      return result;
    } catch (error) {
      this.pendingRequests.delete(key);
      
      // Return stale cache on error if available
      const stale = this.getFromCache<T>(key, true);
      if (stale) {
        console.warn('Request failed, returning stale cache:', error);
        return stale;
      }
      
      throw error;
    }
  }

  /**
   * Execute the actual request with timeout
   */
  private async executeRequest<T>(url: string, options: RequestInit, key: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Generate a unique key for the request
   */
  private generateKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Get data from cache
   */
  private getFromCache<T>(key: string, allowStale = false): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    if (allowStale || now < entry.expiry) {
      return entry.data;
    }

    // Remove expired entry
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any, duration: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + duration
    });
  }

  /**
   * Get cache duration for a URL
   */
  private getCacheDuration(url: string): number {
    for (const [pattern, duration] of this.CACHE_DURATIONS) {
      if (url.includes(pattern)) {
        return duration;
      }
    }
    return this.CACHE_DURATION;
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(url: string, now: number): boolean {
    // Extract base URL for rate limiting
    const baseUrl = new URL(url).origin + new URL(url).pathname.split('/').slice(0, 3).join('/');
    
    let requestInfo = this.requestCounts.get(baseUrl);
    
    if (!requestInfo) {
      requestInfo = { count: 0, windowStart: now };
      this.requestCounts.set(baseUrl, requestInfo);
    }

    // Reset window if expired
    if (now - requestInfo.windowStart > this.RATE_LIMIT_WINDOW) {
      requestInfo.count = 0;
      requestInfo.windowStart = now;
    }

    // Check if under limit
    if (requestInfo.count >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }

    requestInfo.count += 1;
    return true;
  }

  /**
   * Clear cache for a specific pattern
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number; size: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      size: JSON.stringify(entry.data).length
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    
    // Clean up expired cache entries
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }

    // Clean up old pending requests (older than 30 seconds)
    for (const [key, request] of this.pendingRequests) {
      if (now - request.timestamp > 30000) {
        this.pendingRequests.delete(key);
      }
    }

    // Clean up old rate limit counters
    for (const [key, requestInfo] of this.requestCounts) {
      if (now - requestInfo.windowStart > this.RATE_LIMIT_WINDOW * 2) {
        this.requestCounts.delete(key);
      }
    }
  }
}

// Create singleton instance
export const globalRequestManager = new GlobalRequestManager();

// Cleanup every minute
setInterval(() => {
  globalRequestManager.cleanup();
}, 60000);

// Helper function for easy use
export async function cachedFetch<T>(
  url: string, 
  options?: RequestInit,
  cacheKey?: string
): Promise<T> {
  return globalRequestManager.request<T>(url, options, cacheKey);
}

export default globalRequestManager;