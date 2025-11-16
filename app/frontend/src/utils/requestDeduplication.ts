/**
 * Request Deduplication Service
 * Prevents duplicate simultaneous requests to the same endpoint
 * Implements smart caching with TTL
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicationService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();

  // Default TTL values for different endpoint types (in milliseconds)
  private defaultTTLs: Record<string, number> = {
    profile: 60000,        // 1 minute
    follow: 30000,         // 30 seconds
    auth: 300000,          // 5 minutes
    feed: 10000,           // 10 seconds
    conversations: 30000,  // 30 seconds
    default: 30000         // 30 seconds
  };

  /**
   * Generate a cache key from request parameters
   */
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Determine TTL based on endpoint type
   */
  private getTTL(url: string): number {
    if (url.includes('/profile') || url.includes('/api/profiles')) return this.defaultTTLs.profile;
    if (url.includes('/follow')) return this.defaultTTLs.follow;
    if (url.includes('/auth')) return this.defaultTTLs.auth;
    if (url.includes('/feed')) return this.defaultTTLs.feed;
    if (url.includes('/conversation')) return this.defaultTTLs.conversations;
    return this.defaultTTLs.default;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Deduplicated fetch - prevents multiple simultaneous requests to same endpoint
   */
  async fetch<T>(url: string, options?: RequestInit, customTTL?: number): Promise<T> {
    const cacheKey = this.getCacheKey(url, options);

    // Check cache first
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      console.log(`[RequestDedup] Cache hit: ${cacheKey}`);
      return cachedEntry.data as T;
    }

    // Check if request is already pending
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log(`[RequestDedup] Request already pending, coalescing: ${cacheKey}`);
      return pendingRequest.promise as Promise<T>;
    }

    // Make the request
    console.log(`[RequestDedup] Making new request: ${cacheKey}`);
    const requestPromise = fetch(url, options)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        // Cache the successful response
        const ttl = customTTL || this.getTTL(url);
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl
        });

        // Clean up pending request
        this.pendingRequests.delete(cacheKey);

        return data as T;
      })
      .catch((error) => {
        // Clean up pending request on error
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    // Store as pending
    this.pendingRequests.set(cacheKey, {
      promise: requestPromise,
      timestamp: Date.now()
    });

    return requestPromise;
  }

  /**
   * Invalidate cache for a specific URL pattern
   */
  invalidate(urlPattern: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(urlPattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`[RequestDedup] Invalidated cache: ${key}`);
    });
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('[RequestDedup] Cleared all cache');
  }

  /**
   * Clean up expired cache entries and stale pending requests
   */
  cleanup(): void {
    const now = Date.now();

    // Clean expired cache
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.cache.delete(key);
      }
    }

    // Clean stale pending requests (older than 1 minute)
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > 60000) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheEntries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const requestDeduplicationService = new RequestDeduplicationService();

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestDeduplicationService.cleanup();
  }, 5 * 60 * 1000);
}

// Helper function for easy use
export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl?: number
): Promise<T> {
  return requestDeduplicationService.fetch<T>(url, options, ttl);
}
