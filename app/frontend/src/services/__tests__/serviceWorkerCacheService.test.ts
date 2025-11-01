/**
 * Enhanced Service Worker Cache Service Tests
 * Tests for Workbox integration and enhanced caching functionality
 */

import { ServiceWorkerCacheService } from '../serviceWorkerCacheService';
import { CacheMetadataManager } from '../cacheMetadataManager';

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: jest.fn(),
  close: jest.fn()
};

const mockIDBTransaction = {
  objectStore: jest.fn()
};

const mockIDBObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn()
};

const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null
};

// Mock global objects
Object.defineProperty(global, 'indexedDB', {
  value: {
    open: jest.fn(() => ({
      ...mockIDBRequest,
      onupgradeneeded: null
    }))
  }
});

Object.defineProperty(global, 'caches', {
  value: {
    open: jest.fn(() => Promise.resolve({
      match: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      keys: jest.fn(() => Promise.resolve([]))
    })),
    keys: jest.fn(() => Promise.resolve([])),
    delete: jest.fn(() => Promise.resolve(true))
  }
});

Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: jest.fn(() => Promise.resolve({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: jest.fn(),
        navigationPreload: {
          enable: jest.fn(),
          disable: jest.fn(),
          setHeaderValue: jest.fn()
        }
      })),
      ready: Promise.resolve({
        navigationPreload: {
          enable: jest.fn(),
          disable: jest.fn(),
          setHeaderValue: jest.fn()
        },
        sync: {
          register: jest.fn()
        }
      }),
      controller: {
        postMessage: jest.fn()
      }
    },
    storage: {
      estimate: jest.fn(() => Promise.resolve({
        usage: 1024 * 1024, // 1MB
        quota: 100 * 1024 * 1024 // 100MB
      }))
    }
  }
});

Object.defineProperty(global, 'fetch', {
  value: jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    clone: jest.fn(() => ({
      text: jest.fn(() => Promise.resolve('{"test": "data"}'))
    })),
    text: jest.fn(() => Promise.resolve('{"test": "data"}'))
  }))
});

describe('ServiceWorkerCacheService', () => {
  let cacheService: ServiceWorkerCacheService;
  let metadataManager: CacheMetadataManager;

  beforeEach(() => {
    cacheService = new ServiceWorkerCacheService();
    metadataManager = new CacheMetadataManager();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    
    mockIDBObjectStore.put.mockImplementation(() => ({
      ...mockIDBRequest,
      onsuccess: null,
      onerror: null
    }));
    
    mockIDBObjectStore.get.mockImplementation(() => ({
      ...mockIDBRequest,
      result: null,
      onsuccess: null,
      onerror: null
    }));
  });

  describe('Initialization', () => {
    it('should initialize successfully with service worker support', async () => {
      await expect(cacheService.initialize()).resolves.not.toThrow();
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw-enhanced.js');
    });

    it('should handle initialization without service worker support', async () => {
      const originalServiceWorker = (global.navigator as any).serviceWorker;
      delete (global.navigator as any).serviceWorker;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await cacheService.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith('Service Worker not supported, falling back to memory cache');
      
      (global.navigator as any).serviceWorker = originalServiceWorker;
      consoleSpy.mockRestore();
    });
  });

  describe('Enhanced Cache Strategies', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should implement NetworkFirst strategy', async () => {
      const testUrl = 'https://api.example.com/feed';
      const mockResponse = new Response('{"data": "test"}', {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const response = await cacheService.fetchWithStrategy(testUrl, 'NetworkFirst', {
        networkTimeoutSeconds: 3
      });

      expect(response).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(testUrl, expect.any(Object));
    });

    it('should implement CacheFirst strategy', async () => {
      const testUrl = 'https://api.example.com/static';
      
      // Mock cache hit
      const mockCache = {
        match: jest.fn().mockResolvedValue(new Response('cached data')),
        put: jest.fn()
      };
      (global.caches.open as jest.Mock).mockResolvedValue(mockCache);

      const response = await cacheService.fetchWithStrategy(testUrl, 'CacheFirst');

      expect(response).toBeDefined();
      expect(mockCache.match).toHaveBeenCalled();
    });

    it('should implement StaleWhileRevalidate strategy', async () => {
      const testUrl = 'https://api.example.com/communities';
      
      const mockCache = {
        match: jest.fn().mockResolvedValue(new Response('cached data')),
        put: jest.fn()
      };
      (global.caches.open as jest.Mock).mockResolvedValue(mockCache);

      const response = await cacheService.fetchWithStrategy(testUrl, 'StaleWhileRevalidate');

      expect(response).toBeDefined();
      expect(mockCache.match).toHaveBeenCalled();
    });
  });

  describe('Metadata Management', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should store cache entry with metadata', async () => {
      const testUrl = 'https://api.example.com/test';
      const testResponse = new Response('test data');
      const metadata = {
        tags: ['test', 'api'],
        ttl: 300000,
        userScope: 'user123'
      };

      await expect(cacheService.putWithMetadata(testUrl, testResponse, metadata))
        .resolves.not.toThrow();
    });

    it('should invalidate cache entries by tag', async () => {
      const testTag = 'feed';
      
      await expect(cacheService.invalidateByTag(testTag))
        .resolves.not.toThrow();
      
      expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_INVALIDATED',
        tag: testTag,
        keys: expect.any(Array)
      });
    });
  });

  describe('Navigation Preload', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should enable navigation preload', async () => {
      const mockRegistration = await navigator.serviceWorker.ready;
      
      await cacheService.enableNavigationPreload();
      
      expect(mockRegistration.navigationPreload.enable).toHaveBeenCalled();
      expect(mockRegistration.navigationPreload.setHeaderValue)
        .toHaveBeenCalledWith('enhanced-cache');
    });

    it('should disable navigation preload', async () => {
      const mockRegistration = await navigator.serviceWorker.ready;
      
      await cacheService.disableNavigationPreload();
      
      expect(mockRegistration.navigationPreload.disable).toHaveBeenCalled();
    });

    it('should handle navigation preload not supported', async () => {
      // Remove navigationPreload support
      const mockRegistration = await navigator.serviceWorker.ready;
      delete mockRegistration.navigationPreload;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await cacheService.enableNavigationPreload();
      
      expect(consoleSpy).toHaveBeenCalledWith('Navigation preload not supported');
      consoleSpy.mockRestore();
    });
  });

  describe('Offline Queue Management', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should flush offline queue', async () => {
      await expect(cacheService.flushOfflineQueue()).resolves.not.toThrow();
    });

    it('should register background sync', async () => {
      const mockRegistration = await navigator.serviceWorker.ready;
      
      await cacheService.flushOfflineQueue();
      
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('enhanced-cache-sync');
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should return comprehensive cache stats', async () => {
      const stats = await cacheService.getCacheStats();
      
      expect(stats).toHaveProperty('hitRates');
      expect(stats).toHaveProperty('storage');
      expect(stats).toHaveProperty('sync');
      expect(stats).toHaveProperty('preload');
      
      expect(stats.storage.used).toBe(1024 * 1024); // 1MB
      expect(stats.storage.available).toBe(100 * 1024 * 1024); // 100MB
      expect(stats.storage.percentage).toBe(1); // 1%
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(cacheService.fetchWithStrategy('https://api.example.com/error', 'NetworkFirst'))
        .rejects.toThrow();
    });

    it('should handle cache storage errors', async () => {
      const mockCache = {
        match: jest.fn().mockRejectedValue(new Error('Cache error')),
        put: jest.fn().mockRejectedValue(new Error('Cache error'))
      };
      (global.caches.open as jest.Mock).mockResolvedValue(mockCache);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await cacheService.putWithMetadata('https://api.example.com/test', new Response('test'));
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Legacy Support', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should maintain backward compatibility with existing cache methods', async () => {
      const testKey = 'test-gas-estimate';
      const testEstimate = {
        gasPrice: '20000000000',
        gasLimit: '21000',
        estimatedCost: '0.00042'
      };

      await expect(cacheService.cacheGasEstimate(testKey, testEstimate))
        .resolves.not.toThrow();
      
      const cached = await cacheService.getCachedGasEstimate(testKey);
      // Should handle gracefully even if not found
      expect(cached).toBeDefined();
    });

    it('should support existing exchange rate caching', async () => {
      const testRate = {
        rate: 1.5,
        timestamp: Date.now(),
        source: 'test'
      };

      await expect(cacheService.cacheExchangeRate('ETH', 'USD', testRate))
        .resolves.not.toThrow();
    });
  });
});

describe('CacheMetadataManager', () => {
  let metadataManager: CacheMetadataManager;

  beforeEach(() => {
    metadataManager = new CacheMetadataManager();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB successfully', async () => {
      const mockRequest = {
        ...mockIDBRequest,
        result: mockIDBDatabase
      };
      
      (global.indexedDB.open as jest.Mock).mockReturnValue(mockRequest);
      
      // Simulate successful initialization
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess();
        }
      }, 0);

      await expect(metadataManager.initialize()).resolves.not.toThrow();
    });

    it('should handle IndexedDB initialization errors', async () => {
      const mockRequest = {
        ...mockIDBRequest,
        error: new Error('DB Error')
      };
      
      (global.indexedDB.open as jest.Mock).mockReturnValue(mockRequest);
      
      // Simulate error
      setTimeout(() => {
        if (mockRequest.onerror) {
          mockRequest.onerror();
        }
      }, 0);

      await expect(metadataManager.initialize()).rejects.toThrow();
    });
  });

  describe('Metadata Operations', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockRequest = {
        ...mockIDBRequest,
        result: mockIDBDatabase
      };
      
      (global.indexedDB.open as jest.Mock).mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess();
        }
      }, 0);

      await metadataManager.initialize();
    });

    it('should store metadata successfully', async () => {
      const metadata = {
        url: 'https://api.example.com/test',
        timestamp: Date.now(),
        ttl: 300000,
        tags: ['test'],
        contentType: 'application/json',
        size: 1024,
        hitCount: 0,
        lastAccessed: Date.now()
      };

      const mockPutRequest = { ...mockIDBRequest };
      mockIDBObjectStore.put.mockReturnValue(mockPutRequest);

      const storePromise = metadataManager.storeMetadata(metadata);
      
      // Simulate success
      setTimeout(() => {
        if (mockPutRequest.onsuccess) {
          mockPutRequest.onsuccess();
        }
      }, 0);

      await expect(storePromise).resolves.not.toThrow();
    });

    it('should retrieve metadata by URL', async () => {
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

      const mockGetRequest = { 
        ...mockIDBRequest,
        result: mockMetadata
      };
      mockIDBObjectStore.get.mockReturnValue(mockGetRequest);

      const getPromise = metadataManager.getMetadata(testUrl);
      
      // Simulate success
      setTimeout(() => {
        if (mockGetRequest.onsuccess) {
          mockGetRequest.onsuccess();
        }
      }, 0);

      const result = await getPromise;
      expect(result).toEqual(mockMetadata);
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockRequest = {
        ...mockIDBRequest,
        result: mockIDBDatabase
      };
      
      (global.indexedDB.open as jest.Mock).mockReturnValue(mockRequest);
      
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess();
        }
      }, 0);

      await metadataManager.initialize();
    });

    it('should perform comprehensive cleanup', async () => {
      const mockGetAllRequest = {
        ...mockIDBRequest,
        result: [
          {
            url: 'https://api.example.com/old',
            timestamp: Date.now() - 86400000, // 24 hours ago
            ttl: 300000, // 5 minutes
            tags: ['old'],
            contentType: 'application/json',
            size: 1024,
            hitCount: 0,
            lastAccessed: Date.now() - 86400000,
            expiresAt: Date.now() - 86000000 // Expired
          }
        ]
      };
      
      mockIDBObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const cleanupPromise = metadataManager.performComprehensiveCleanup();
      
      // Simulate success
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess();
        }
      }, 0);

      const result = await cleanupPromise;
      expect(result).toHaveProperty('totalRemoved');
      expect(result.totalRemoved).toBeGreaterThanOrEqual(0);
    });
  });
});