/**
 * Enhanced Cache Service Unit Tests
 * Tests for core architecture components
 */

import { ServiceWorkerCacheService } from '../serviceWorkerCacheService';
import { CacheMetadataManager } from '../cacheMetadataManager';

// Mock Response constructor for Node.js environment
global.Response = class MockResponse {
  public ok: boolean = true;
  public status: number = 200;
  public headers: Map<string, string>;
  private body: string;

  constructor(body: string = '', init: any = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init.headers || {}));
  }

  clone() {
    return new MockResponse(this.body, { status: this.status, headers: Object.fromEntries(this.headers) });
  }

  async text() {
    return this.body;
  }

  async json() {
    return JSON.parse(this.body);
  }
} as any;

// Mock IndexedDB
const createMockIDBRequest = (result: any = null, error: any = null) => ({
  result,
  error,
  onsuccess: null as any,
  onerror: null as any
});

const mockObjectStore = {
  put: jest.fn(() => createMockIDBRequest()),
  get: jest.fn(() => createMockIDBRequest()),
  delete: jest.fn(() => createMockIDBRequest()),
  getAll: jest.fn(() => createMockIDBRequest([])),
  clear: jest.fn(() => createMockIDBRequest()),
  createIndex: jest.fn(),
  index: jest.fn(() => ({
    getAll: jest.fn(() => createMockIDBRequest([])),
    openCursor: jest.fn(() => createMockIDBRequest())
  }))
};

const mockTransaction = {
  objectStore: jest.fn(() => mockObjectStore)
};

const mockDatabase = {
  transaction: jest.fn(() => mockTransaction),
  close: jest.fn(),
  objectStoreNames: {
    contains: jest.fn(() => false)
  },
  createObjectStore: jest.fn(() => mockObjectStore)
};

global.indexedDB = {
  open: jest.fn(() => {
    const request = createMockIDBRequest(mockDatabase);
    setTimeout(() => {
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  })
} as any;

// Mock Cache API
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(() => Promise.resolve([]))
};

global.caches = {
  open: jest.fn(() => Promise.resolve(mockCache)),
  keys: jest.fn(() => Promise.resolve(['test-cache'])),
  delete: jest.fn(() => Promise.resolve(true))
} as any;

// Mock Service Worker API
const mockRegistration = {
  installing: null,
  waiting: null,
  active: null,
  addEventListener: jest.fn(),
  navigationPreload: {
    enable: jest.fn(() => Promise.resolve()),
    disable: jest.fn(() => Promise.resolve()),
    setHeaderValue: jest.fn(() => Promise.resolve())
  },
  sync: {
    register: jest.fn(() => Promise.resolve())
  }
};

global.navigator = {
  serviceWorker: {
    register: jest.fn(() => Promise.resolve(mockRegistration)),
    ready: Promise.resolve(mockRegistration),
    controller: {
      postMessage: jest.fn()
    }
  },
  storage: {
    estimate: jest.fn(() => Promise.resolve({
      usage: 1024 * 1024,
      quota: 100 * 1024 * 1024
    }))
  }
} as any;

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve(new Response('{"test": "data"}'))) as any;

describe('Enhanced Cache Service - Core Architecture', () => {
  let cacheService: ServiceWorkerCacheService;

  beforeEach(() => {
    cacheService = new ServiceWorkerCacheService();
    jest.clearAllMocks();
  });

  describe('ServiceWorkerCacheService Enhanced Methods', () => {
    it('should have fetchWithStrategy method with proper signature', () => {
      expect(typeof cacheService.fetchWithStrategy).toBe('function');
      expect(cacheService.fetchWithStrategy.length).toBe(3); // url, strategy, options
    });

    it('should have putWithMetadata method with proper signature', () => {
      expect(typeof cacheService.putWithMetadata).toBe('function');
      expect(cacheService.putWithMetadata.length).toBe(3); // url, response, metadata
    });

    it('should have invalidateByTag method', () => {
      expect(typeof cacheService.invalidateByTag).toBe('function');
      expect(cacheService.invalidateByTag.length).toBe(1); // tag
    });

    it('should support all cache strategies', async () => {
      const testUrl = 'https://api.example.com/test';
      
      // Test NetworkFirst
      await expect(cacheService.fetchWithStrategy(testUrl, 'NetworkFirst'))
        .resolves.toBeDefined();
      
      // Test CacheFirst
      await expect(cacheService.fetchWithStrategy(testUrl, 'CacheFirst'))
        .resolves.toBeDefined();
      
      // Test StaleWhileRevalidate
      await expect(cacheService.fetchWithStrategy(testUrl, 'StaleWhileRevalidate'))
        .resolves.toBeDefined();
    });

    it('should handle cache options properly', async () => {
      const testUrl = 'https://api.example.com/test';
      const options = {
        networkTimeoutSeconds: 5,
        tags: ['test'],
        userScope: 'user123'
      };
      
      await expect(cacheService.fetchWithStrategy(testUrl, 'NetworkFirst', options))
        .resolves.toBeDefined();
    });

    it('should store metadata with cache entries', async () => {
      const testUrl = 'https://api.example.com/test';
      const testResponse = new Response('test data');
      const metadata = {
        tags: ['test'],
        ttl: 300000,
        userScope: 'user123'
      };

      await expect(cacheService.putWithMetadata(testUrl, testResponse, metadata))
        .resolves.not.toThrow();
    });

    it('should invalidate cache by tags', async () => {
      const testTag = 'test-tag';
      
      await expect(cacheService.invalidateByTag(testTag))
        .resolves.not.toThrow();
      
      expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_INVALIDATED',
        tag: testTag,
        keys: expect.any(Array)
      });
    });
  });

  describe('Navigation Preload Functionality', () => {
    it('should enable navigation preload', async () => {
      await expect(cacheService.enableNavigationPreload())
        .resolves.not.toThrow();
      
      expect(mockRegistration.navigationPreload.enable).toHaveBeenCalled();
      expect(mockRegistration.navigationPreload.setHeaderValue)
        .toHaveBeenCalledWith('enhanced-cache');
    });

    it('should disable navigation preload', async () => {
      await expect(cacheService.disableNavigationPreload())
        .resolves.not.toThrow();
      
      expect(mockRegistration.navigationPreload.disable).toHaveBeenCalled();
    });

    it('should handle navigation preload not supported', async () => {
      // Remove navigationPreload support
      const originalNavigationPreload = mockRegistration.navigationPreload;
      delete (mockRegistration as any).navigationPreload;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await cacheService.enableNavigationPreload();
      
      expect(consoleSpy).toHaveBeenCalledWith('Navigation preload not supported');
      
      // Restore
      (mockRegistration as any).navigationPreload = originalNavigationPreload;
      consoleSpy.mockRestore();
    });
  });

  describe('Precaching Manifest', () => {
    it('should register service worker with enhanced script', async () => {
      await cacheService.initialize();
      
      expect(navigator.serviceWorker.register)
        .toHaveBeenCalledWith('/sw-enhanced.js');
    });

    it('should initialize cache storage for different strategies', async () => {
      await cacheService.initialize();
      
      // Should open multiple caches for different strategies
      expect(caches.open).toHaveBeenCalledWith('feed-cache-v1');
      expect(caches.open).toHaveBeenCalledWith('communities-cache-v1');
      expect(caches.open).toHaveBeenCalledWith('marketplace-cache-v1');
      expect(caches.open).toHaveBeenCalledWith('messaging-cache-v1');
    });

    it('should set up background sync', async () => {
      await cacheService.initialize();
      
      expect(mockRegistration.sync.register)
        .toHaveBeenCalledWith('enhanced-cache-sync');
    });
  });
});

describe('CacheMetadataManager - Core Architecture', () => {
  let metadataManager: CacheMetadataManager;

  beforeEach(async () => {
    metadataManager = new CacheMetadataManager();
    jest.clearAllMocks();
  });

  describe('Cache Metadata Storage Operations', () => {
    it('should initialize IndexedDB with proper schema', async () => {
      await expect(metadataManager.initialize()).resolves.not.toThrow();
      
      expect(indexedDB.open).toHaveBeenCalledWith('CacheMetadataDB', 1);
    });

    it('should store metadata with all required fields', async () => {
      await metadataManager.initialize();
      
      const metadata = {
        url: 'https://api.example.com/test',
        timestamp: Date.now(),
        ttl: 300000,
        tags: ['test', 'api'],
        contentType: 'application/json',
        size: 1024,
        hitCount: 0,
        lastAccessed: Date.now()
      };

      // Mock successful put operation
      const putRequest = createMockIDBRequest();
      mockObjectStore.put.mockReturnValue(putRequest);
      
      const storePromise = metadataManager.storeMetadata(metadata);
      
      // Simulate success
      setTimeout(() => {
        if (putRequest.onsuccess) putRequest.onsuccess();
      }, 0);

      await expect(storePromise).resolves.not.toThrow();
      expect(mockObjectStore.put).toHaveBeenCalled();
    });

    it('should retrieve metadata by URL', async () => {
      await metadataManager.initialize();
      
      const testUrl = 'https://api.example.com/test';
      const mockMetadata = {
        url: testUrl,
        timestamp: Date.now(),
        ttl: 300000,
        tags: ['test'],
        contentType: 'application/json',
        size: 1024,
        hitCount: 1,
        lastAccessed: Date.now()
      };

      const getRequest = createMockIDBRequest(mockMetadata);
      mockObjectStore.get.mockReturnValue(getRequest);

      const getPromise = metadataManager.getMetadata(testUrl);
      
      // Simulate success
      setTimeout(() => {
        if (getRequest.onsuccess) getRequest.onsuccess();
      }, 0);

      const result = await getPromise;
      expect(result).toEqual(mockMetadata);
      expect(mockObjectStore.get).toHaveBeenCalledWith(testUrl);
    });

    it('should handle metadata retrieval errors', async () => {
      await metadataManager.initialize();
      
      const getRequest = createMockIDBRequest(null, new Error('DB Error'));
      mockObjectStore.get.mockReturnValue(getRequest);

      const getPromise = metadataManager.getMetadata('test-url');
      
      // Simulate error
      setTimeout(() => {
        if (getRequest.onerror) getRequest.onerror();
      }, 0);

      await expect(getPromise).rejects.toThrow();
    });
  });

  describe('Cache Cleanup Operations', () => {
    it('should have cleanup methods', () => {
      expect(typeof metadataManager.cleanupExpiredEntries).toBe('function');
      expect(typeof metadataManager.performLRUCleanup).toBe('function');
      expect(typeof metadataManager.performSizeBasedCleanup).toBe('function');
      expect(typeof metadataManager.performComprehensiveCleanup).toBe('function');
    });

    it('should return usage statistics', async () => {
      await metadataManager.initialize();
      
      // Mock empty metadata
      const getAllRequest = createMockIDBRequest([]);
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const statsPromise = metadataManager.getUsageStats();
      
      // Simulate success
      setTimeout(() => {
        if (getAllRequest.onsuccess) getAllRequest.onsuccess();
      }, 0);

      const stats = await statsPromise;
      
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
      expect(stats).toHaveProperty('averageHitCount');
      expect(stats).toHaveProperty('tagDistribution');
    });

    it('should perform LRU cleanup based on policy', async () => {
      await metadataManager.initialize();
      
      const mockMetadata = [
        {
          url: 'https://api.example.com/old',
          timestamp: Date.now() - 86400000,
          ttl: 300000,
          tags: ['old'],
          contentType: 'application/json',
          size: 1024,
          hitCount: 0,
          lastAccessed: Date.now() - 86400000
        }
      ];
      
      const getAllRequest = createMockIDBRequest(mockMetadata);
      mockObjectStore.getAll.mockReturnValue(getAllRequest);

      const cleanupPromise = metadataManager.performLRUCleanup({ maxEntries: 0 });
      
      // Simulate success
      setTimeout(() => {
        if (getAllRequest.onsuccess) getAllRequest.onsuccess();
      }, 0);

      const result = await cleanupPromise;
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      const errorRequest = createMockIDBRequest(null, new Error('DB Init Error'));
      (indexedDB.open as jest.Mock).mockReturnValue(errorRequest);

      const initPromise = metadataManager.initialize();
      
      // Simulate error
      setTimeout(() => {
        if (errorRequest.onerror) errorRequest.onerror();
      }, 0);

      await expect(initPromise).rejects.toThrow();
    });

    it('should handle operations when database is not initialized', async () => {
      // Don't initialize the database
      const result = await metadataManager.getMetadata('test-url');
      expect(result).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  let cacheService: ServiceWorkerCacheService;
  let metadataManager: CacheMetadataManager;

  beforeEach(async () => {
    cacheService = new ServiceWorkerCacheService();
    metadataManager = new CacheMetadataManager();
    jest.clearAllMocks();
  });

  it('should integrate cache service with metadata manager', async () => {
    await cacheService.initialize();
    await metadataManager.initialize();
    
    // Both should be initialized without errors
    expect(navigator.serviceWorker.register).toHaveBeenCalled();
    expect(indexedDB.open).toHaveBeenCalled();
  });

  it('should handle service worker registration failure gracefully', async () => {
    (navigator.serviceWorker.register as jest.Mock)
      .mockRejectedValueOnce(new Error('Registration failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await cacheService.initialize();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to initialize Enhanced Service Worker cache:', 
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });

  it('should maintain backward compatibility', () => {
    // Legacy methods should still exist
    expect(typeof cacheService.cacheGasEstimate).toBe('function');
    expect(typeof cacheService.getCachedGasEstimate).toBe('function');
    expect(typeof cacheService.clearAllCaches).toBe('function');
    expect(typeof cacheService.invalidateByTags).toBe('function');
  });
});