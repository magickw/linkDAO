/**
 * Custom Jest Matchers for Cache Enhancement Tests
 * Provides specialized matchers for testing cache functionality
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeCached(): R;
      toBeInCache(cacheName: string): R;
      toHaveValidCacheMetadata(): R;
      toBeExpired(): R;
      toHaveTag(tag: string): R;
      toBeQueuedForSync(): R;
      toHavePerformanceWithin(threshold: number): R;
      toBeEncrypted(): R;
      toHaveValidETag(): R;
      toBeCacheHit(): R;
      toBeCacheMiss(): R;
    }
  }
}

// Helper function to check if response is cached
async function isResponseCached(url: string, cacheName?: string): Promise<boolean> {
  try {
    if (cacheName) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(url);
      return !!response;
    } else {
      const response = await caches.match(url);
      return !!response;
    }
  } catch (error) {
    return false;
  }
}

// Helper function to get cache metadata
async function getCacheMetadata(url: string): Promise<any> {
  try {
    return new Promise((resolve) => {
      const request = indexedDB.open('CacheMetadataDB', 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const getRequest = store.get(url);
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result);
        };
        getRequest.onerror = () => {
          resolve(null);
        };
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (error) {
    return null;
  }
}

// Helper function to check if item is in sync queue
function isQueuedForSync(item: any): boolean {
  try {
    const queue = JSON.parse(localStorage.getItem('offlineActionQueue') || '[]');
    return queue.some((queueItem: any) => 
      JSON.stringify(queueItem.data) === JSON.stringify(item)
    );
  } catch (error) {
    return false;
  }
}

// Custom matchers
const customMatchers = {
  // Check if a URL is cached
  toBeCached(received: string) {
    const pass = isResponseCached(received);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be cached`
          : `Expected ${received} to be cached`,
      pass: !!pass
    };
  },

  // Check if a URL is in a specific cache
  async toBeInCache(received: string, cacheName: string) {
    const pass = await isResponseCached(received, cacheName);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be in cache ${cacheName}`
          : `Expected ${received} to be in cache ${cacheName}`,
      pass
    };
  },

  // Check if cache entry has valid metadata
  async toHaveValidCacheMetadata(received: string) {
    const metadata = await getCacheMetadata(received);
    const pass = metadata && 
                 typeof metadata.timestamp === 'number' &&
                 typeof metadata.ttl === 'number' &&
                 Array.isArray(metadata.tags);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to have valid cache metadata`
          : `Expected ${received} to have valid cache metadata. Got: ${JSON.stringify(metadata)}`,
      pass
    };
  },

  // Check if cache entry is expired
  async toBeExpired(received: string) {
    const metadata = await getCacheMetadata(received);
    const pass = metadata && 
                 (Date.now() - metadata.timestamp) > metadata.ttl;
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to be expired`
          : `Expected ${received} to be expired`,
      pass
    };
  },

  // Check if cache entry has a specific tag
  async toHaveTag(received: string, tag: string) {
    const metadata = await getCacheMetadata(received);
    const pass = metadata && 
                 Array.isArray(metadata.tags) && 
                 metadata.tags.includes(tag);
    
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to have tag ${tag}`
          : `Expected ${received} to have tag ${tag}. Tags: ${metadata?.tags || 'none'}`,
      pass
    };
  },

  // Check if item is queued for background sync
  toBeQueuedForSync(received: any) {
    const pass = isQueuedForSync(received);
    
    return {
      message: () => 
        pass 
          ? `Expected item not to be queued for sync`
          : `Expected item to be queued for sync`,
      pass
    };
  },

  // Check if performance metric is within threshold
  toHavePerformanceWithin(received: number, threshold: number) {
    const pass = received <= threshold;
    
    return {
      message: () => 
        pass 
          ? `Expected performance ${received}ms to exceed threshold ${threshold}ms`
          : `Expected performance ${received}ms to be within threshold ${threshold}ms`,
      pass
    };
  },

  // Check if data is encrypted
  toBeEncrypted(received: any) {
    const pass = received && 
                 typeof received.encryptedData !== 'undefined' &&
                 typeof received.iv !== 'undefined' &&
                 received.encryptedData instanceof ArrayBuffer;
    
    return {
      message: () => 
        pass 
          ? `Expected data not to be encrypted`
          : `Expected data to be encrypted with encryptedData and iv properties`,
      pass
    };
  },

  // Check if response has valid ETag
  toHaveValidETag(received: Response) {
    const etag = received.headers.get('etag');
    const pass = !!etag && etag.length > 0;
    
    return {
      message: () => 
        pass 
          ? `Expected response not to have valid ETag`
          : `Expected response to have valid ETag header`,
      pass
    };
  },

  // Check if request was a cache hit
  toBeCacheHit(received: any) {
    // Check if request has cache hit indicators
    const pass = received && (
      received.fromCache === true ||
      received.headers?.['x-cache'] === 'HIT' ||
      received.timing?.responseStart === 0
    );
    
    return {
      message: () => 
        pass 
          ? `Expected request not to be a cache hit`
          : `Expected request to be a cache hit`,
      pass
    };
  },

  // Check if request was a cache miss
  toBeCacheMiss(received: any) {
    // Check if request has cache miss indicators
    const pass = received && (
      received.fromCache === false ||
      received.headers?.['x-cache'] === 'MISS' ||
      received.timing?.responseStart > 0
    );
    
    return {
      message: () => 
        pass 
          ? `Expected request not to be a cache miss`
          : `Expected request to be a cache miss`,
      pass
    };
  }
};

// Extend Jest matchers
expect.extend(customMatchers);

// Export for direct use
export default customMatchers;