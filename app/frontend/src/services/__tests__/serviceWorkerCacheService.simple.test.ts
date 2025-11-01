/**
 * Simple Service Worker Cache Service Tests
 * Basic functionality tests for the enhanced cache service
 */

import { ServiceWorkerCacheService } from '../serviceWorkerCacheService';

// Mock global objects for testing
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(() => Promise.resolve([]))
};

const mockCaches = {
  open: jest.fn(() => Promise.resolve(mockCache)),
  keys: jest.fn(() => Promise.resolve(['test-cache'])),
  delete: jest.fn(() => Promise.resolve(true))
};

const mockServiceWorkerRegistration = {
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

const mockNavigator = {
  serviceWorker: {
    register: jest.fn(() => Promise.resolve(mockServiceWorkerRegistration)),
    ready: Promise.resolve(mockServiceWorkerRegistration),
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
};

// Setup global mocks
Object.defineProperty(global, 'caches', { value: mockCaches });
Object.defineProperty(global, 'navigator', { value: mockNavigator });
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

// Mock IndexedDB
const mockIDBRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null
};

const mockIDBDatabase = {
  transaction: jest.fn(() => ({
    objectStore: jest.fn(() => ({
      put: jest.fn(() => mockIDBRequest),
      get: jest.fn(() => mockIDBRequest),
      delete: jest.fn(() => mockIDBRequest),
      getAll: jest.fn(() => mockIDBRequest),
      clear: jest.fn(() => mockIDBRequest)
    }))
  })),
  close: jest.fn()
};

Object.defineProperty(global, 'indexedDB', {
  value: {
    open: jest.fn(() => {
      const request = { ...mockIDBRequest, result: mockIDBDatabase };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);
      return request;
    })
  }
});

describe('ServiceWorkerCacheService - Basic Functionality', () => {
  let cacheService: ServiceWorkerCacheService;

  beforeEach(() => {
    cacheService = new ServiceWorkerCacheService();
    jest.clearAllMocks();
  });

  describe('Service Worker Support Detection', () => {
    it('should detect service worker support', () => {
      const isSupported = 'serviceWorker' in navigator;
      expect(isSupported).toBe(true);
    });

    it('should handle missing service worker support gracefully', async () => {
      const originalServiceWorker = (global.navigator as any).serviceWorker;
      delete (global.navigator as any).serviceWorker;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await cacheService.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith('Service Worker not supported, falling back to memory cache');
      
      (global.navigator as any).serviceWorker = originalServiceWorker;
      consoleSpy.mockRestore();
    });
  });

  describe('Cache Strategy Methods', () => {
    it('should have fetchWithStrategy method', () => {
      expect(typeof cacheService.fetchWithStrategy).toBe('function');
    });

    it('should have putWithMetadata method', () => {
      expect(typeof cacheService.putWithMetadata).toBe('function');
    });

    it('should have invalidateByTag method', () => {
      expect(typeof cacheService.invalidateByTag).toBe('function');
    });

    it('should have navigation preload methods', () => {
      expect(typeof cacheService.enableNavigationPreload).toBe('function');
      expect(typeof cacheService.disableNavigationPreload).toBe('function');
    });

    it('should have offline queue management', () => {
      expect(typeof cacheService.flushOfflineQueue).toBe('function');
    });

    it('should have cache statistics method', () => {
      expect(typeof cacheService.getCacheStats).toBe('function');
    });
  });

  describe('Legacy Method Compatibility', () => {
    it('should maintain existing cache methods', () => {
      expect(typeof cacheService.cacheGasEstimate).toBe('function');
      expect(typeof cacheService.getCachedGasEstimate).toBe('function');
      expect(typeof cacheService.cacheExchangeRate).toBe('function');
      expect(typeof cacheService.getCachedExchangeRate).toBe('function');
      expect(typeof cacheService.cacheUserPreferences).toBe('function');
      expect(typeof cacheService.getCachedUserPreferences).toBe('function');
    });

    it('should maintain cache management methods', () => {
      expect(typeof cacheService.clearAllCaches).toBe('function');
      expect(typeof cacheService.invalidateByTags).toBe('function');
      expect(typeof cacheService.cleanupExpiredEntries).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(cacheService.fetchWithStrategy('https://api.example.com/error', 'NetworkFirst'))
        .rejects.toThrow();
    });

    it('should handle cache operations without throwing', async () => {
      mockCache.put.mockRejectedValueOnce(new Error('Cache error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // This should not throw, but log the error
      await expect(cacheService.putWithMetadata('https://api.example.com/test', new Response('test')))
        .resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    it('should have proper cache strategy configurations', () => {
      const service = new ServiceWorkerCacheService();
      
      // Access private property for testing
      const strategies = (service as any).CACHE_STRATEGIES;
      
      expect(strategies).toHaveProperty('feed');
      expect(strategies).toHaveProperty('communities');
      expect(strategies).toHaveProperty('marketplace');
      expect(strategies).toHaveProperty('messaging');
      
      // Check feed strategy configuration
      expect(strategies.feed.name).toBe('feed-cache-v1');
      expect(strategies.feed.networkFirst).toBe(true);
      expect(strategies.feed.maxEntries).toBe(200);
    });
  });

  describe('Cache Statistics Structure', () => {
    it('should return proper cache stats structure', async () => {
      const stats = await cacheService.getCacheStats();
      
      expect(stats).toHaveProperty('hitRates');
      expect(stats).toHaveProperty('storage');
      expect(stats).toHaveProperty('sync');
      expect(stats).toHaveProperty('preload');
      
      expect(typeof stats.hitRates).toBe('object');
      expect(typeof stats.storage).toBe('object');
      expect(typeof stats.sync).toBe('object');
      expect(typeof stats.preload).toBe('object');
    });
  });
});

describe('CacheMetadataManager - Basic Functionality', () => {
  it('should be importable', () => {
    const { CacheMetadataManager } = require('../cacheMetadataManager');
    expect(CacheMetadataManager).toBeDefined();
    expect(typeof CacheMetadataManager).toBe('function');
  });

  it('should have required methods', () => {
    const { CacheMetadataManager } = require('../cacheMetadataManager');
    const manager = new CacheMetadataManager();
    
    expect(typeof manager.initialize).toBe('function');
    expect(typeof manager.storeMetadata).toBe('function');
    expect(typeof manager.getMetadata).toBe('function');
    expect(typeof manager.removeMetadata).toBe('function');
    expect(typeof manager.cleanupExpiredEntries).toBe('function');
    expect(typeof manager.performLRUCleanup).toBe('function');
    expect(typeof manager.getUsageStats).toBe('function');
  });
});