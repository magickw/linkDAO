/**
 * Service Worker Cache Service Tests
 * Tests for caching strategies and cache invalidation
 */

import { ServiceWorkerCacheService } from '../../services/serviceWorkerCacheService';

// Mock global objects
const mockCaches = {
  open: jest.fn(),
  keys: jest.fn(),
  delete: jest.fn()
};

const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  keys: jest.fn(),
  delete: jest.fn()
};

const mockResponse = {
  ok: true,
  status: 200,
  headers: {
    get: jest.fn()
  },
  clone: jest.fn(),
  blob: jest.fn()
};

const mockBlob = {
  size: 1024
};

// Mock global fetch
global.fetch = jest.fn();
global.caches = mockCaches as any;
global.navigator = {
  serviceWorker: {
    register: jest.fn(),
    getRegistration: jest.fn()
  },
  storage: {
    estimate: jest.fn()
  }
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
global.localStorage = localStorageMock as any;

describe('ServiceWorkerCacheService', () => {
  let cacheService: ServiceWorkerCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new ServiceWorkerCacheService();
    
    // Setup default mock returns
    mockCaches.open.mockResolvedValue(mockCache);
    mockCaches.keys.mockResolvedValue(['cache1', 'cache2']);
    mockCache.match.mockResolvedValue(null);
    mockCache.put.mockResolvedValue(undefined);
    mockCache.keys.mockResolvedValue([]);
    mockResponse.clone.mockReturnValue(mockResponse);
    mockResponse.blob.mockResolvedValue(mockBlob);
    mockResponse.headers.get.mockReturnValue(new Date().toISOString());
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    (navigator.serviceWorker.getRegistration as jest.Mock).mockResolvedValue(null);
    (navigator.serviceWorker.register as jest.Mock).mockResolvedValue({});
    (navigator.storage.estimate as jest.Mock).mockResolvedValue({ usage: 1000, quota: 10000 });
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initialization', () => {
    it('should initialize service worker cache service', async () => {
      await cacheService.initialize();
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('should handle service worker not supported', async () => {
      // Mock service worker not supported
      const originalNavigator = global.navigator;
      delete (global as any).navigator.serviceWorker;
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await cacheService.initialize();
      
      expect(consoleSpy).toHaveBeenCalledWith('Service Worker not supported');
      
      // Restore
      global.navigator = originalNavigator;
      consoleSpy.mockRestore();
    });

    it('should load existing metadata from storage', async () => {
      const mockMetadata = {
        'test-url': {
          url: 'test-url',
          timestamp: Date.now(),
          accessCount: 1,
          lastAccessed: Date.now(),
          size: 1024
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockMetadata));
      
      await cacheService.initialize();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('sw-cache-metadata');
    });
  });

  describe('Cache Strategies', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should implement NetworkFirst strategy for feed content', async () => {
      const url = '/api/feed/enhanced';
      
      // Mock fresh response
      const freshResponse = { ...mockResponse, ok: true };
      (global.fetch as jest.Mock).mockResolvedValue(freshResponse);
      
      const result = await cacheService.cacheWithStrategy(url, 'feed');
      
      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(mockCache.put).toHaveBeenCalledWith(url, freshResponse);
      expect(result).toBe(freshResponse);
    });

    it('should implement StaleWhileRevalidate strategy for community data', async () => {
      const url = '/api/communities/test';
      
      // Mock cached response that's still fresh
      const cachedResponse = { ...mockResponse };
      cachedResponse.headers.get.mockReturnValue(new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5 minutes ago
      mockCache.match.mockResolvedValue(cachedResponse);
      
      const result = await cacheService.cacheWithStrategy(url, 'communities');
      
      expect(mockCache.match).toHaveBeenCalledWith(url);
      expect(result).toBe(cachedResponse);
    });

    it('should implement CacheFirst strategy for user profiles', async () => {
      const url = '/api/users/test';
      
      // Mock cached response
      const cachedResponse = { ...mockResponse };
      cachedResponse.headers.get.mockReturnValue(new Date(Date.now() - 10 * 60 * 1000).toISOString()); // 10 minutes ago
      mockCache.match.mockResolvedValue(cachedResponse);
      
      const result = await cacheService.cacheWithStrategy(url, 'profiles');
      
      expect(mockCache.match).toHaveBeenCalledWith(url);
      expect(result).toBe(cachedResponse);
    });

    it('should implement NetworkOnly strategy for messages', async () => {
      const url = '/api/messages/test';
      
      const result = await cacheService.cacheWithStrategy(url, 'messages');
      
      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(mockCache.put).not.toHaveBeenCalled(); // Should not cache messages
    });

    it('should handle unknown cache strategy', async () => {
      const url = '/api/test';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await cacheService.cacheWithStrategy(url, 'unknown');
      
      expect(consoleSpy).toHaveBeenCalledWith('Unknown cache strategy: unknown');
      expect(result).toBeNull();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cache Resource Management', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should cache resource successfully', async () => {
      const url = '/api/test';
      
      // Mock HEAD request for verification
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // HEAD request
        .mockResolvedValueOnce(mockResponse); // Actual request
      
      const result = await cacheService.cacheResource(url);
      
      expect(global.fetch).toHaveBeenCalledWith(url, { method: 'HEAD', cache: 'no-cache' });
      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(mockCache.put).toHaveBeenCalledWith(url, mockResponse);
      expect(result).toBe(true);
    });

    it('should handle resource not available', async () => {
      const url = '/api/test';
      
      // Mock HEAD request failure
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await cacheService.cacheResource(url);
      
      expect(consoleSpy).toHaveBeenCalledWith(`Resource not available for caching: ${url}`);
      expect(result).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should batch cache resources with graceful failure handling', async () => {
      const urls = ['/api/test1', '/api/test2', '/api/test3'];
      
      // Mock mixed success/failure
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // HEAD for test1
        .mockResolvedValueOnce(mockResponse) // GET for test1
        .mockResolvedValueOnce({ ok: false }) // HEAD for test2 (fail)
        .mockResolvedValueOnce({ ok: true }) // HEAD for test3
        .mockResolvedValueOnce(mockResponse); // GET for test3
      
      const result = await cacheService.cacheResources(urls);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(3);
    });

    it('should get cached resource', async () => {
      const url = '/api/test';
      const cachedResponse = { ...mockResponse };
      
      mockCache.match.mockResolvedValue(cachedResponse);
      
      const result = await cacheService.getCachedResource(url);
      
      expect(mockCache.match).toHaveBeenCalledWith(url);
      expect(result).toBe(cachedResponse);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should invalidate cache by tags', async () => {
      const tags = ['feed', 'posts'];
      
      mockCache.keys.mockResolvedValue([
        new Request('/api/feed/1'),
        new Request('/api/feed/2')
      ]);
      
      await cacheService.invalidateByTags(tags);
      
      expect(mockCaches.open).toHaveBeenCalledWith('feed-v1');
      expect(mockCache.delete).toHaveBeenCalledTimes(2);
    });

    it('should clear all caches', async () => {
      mockCaches.keys.mockResolvedValue(['cache1', 'cache2']);
      
      await cacheService.clearAllCaches();
      
      expect(mockCaches.delete).toHaveBeenCalledWith('cache1');
      expect(mockCaches.delete).toHaveBeenCalledWith('cache2');
    });
  });

  describe('Predictive Preloading', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should preload community resources', async () => {
      const userId = 'test-user';
      const context = 'community_visit';
      
      // Mock successful caching
      (global.fetch as jest.Mock)
        .mockResolvedValue({ ok: true })
        .mockResolvedValue(mockResponse);
      
      await cacheService.predictivePreload(userId, context);
      
      expect(global.fetch).toHaveBeenCalledWith(`/api/communities/${userId}/recent`, { method: 'HEAD', cache: 'no-cache' });
    });

    it('should preload profile resources', async () => {
      const userId = 'test-user';
      const context = 'profile_view';
      
      await cacheService.predictivePreload(userId, context);
      
      expect(global.fetch).toHaveBeenCalledWith(`/api/users/${userId}`, { method: 'HEAD', cache: 'no-cache' });
    });

    it('should preload feed resources', async () => {
      const userId = 'test-user';
      const context = 'feed_browse';
      
      await cacheService.predictivePreload(userId, context);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/feed/hot', { method: 'HEAD', cache: 'no-cache' });
    });
  });

  describe('Offline Action Queuing', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should queue offline action', async () => {
      const action = { type: 'post', data: { content: 'test' } };
      
      await cacheService.queueOfflineAction(action);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sw-offline-actions',
        expect.stringContaining('"type":"post"')
      );
    });

    it('should handle queue storage error', async () => {
      const action = { type: 'post', data: { content: 'test' } };
      
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await cacheService.queueOfflineAction(action);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to queue offline action:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should get cache statistics', () => {
      const stats = cacheService.getCacheStats();
      
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('entryCount');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('lastCleanup');
    });

    it('should check storage quota', async () => {
      const quota = await cacheService.checkStorageQuota();
      
      expect(quota).toEqual({
        used: 1000,
        quota: 10000,
        percentage: 10
      });
    });

    it('should handle storage quota check failure', async () => {
      (navigator.storage.estimate as jest.Mock).mockRejectedValue(new Error('Not supported'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const quota = await cacheService.checkStorageQuota();
      
      expect(quota).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to check storage quota:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cache Warming', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should warm cache with important resources', async () => {
      const urls = ['/api/feed/hot', '/api/communities/trending'];
      
      await cacheService.warmCache(urls);
      
      expect(global.fetch).toHaveBeenCalledTimes(urls.length * 2); // HEAD + GET for each
    });

    it('should preload critical resources', async () => {
      const urls = ['/api/critical/resource'];
      
      await cacheService.preloadCriticalResources(urls);
      
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await cacheService.initialize();
    });

    it('should handle cache operation errors gracefully', async () => {
      const url = '/api/test';
      
      mockCaches.open.mockRejectedValue(new Error('Cache error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await cacheService.cacheWithStrategy(url, 'feed');
      
      expect(consoleSpy).toHaveBeenCalledWith(`Cache with strategy failed for ${url}:`, expect.any(Error));
      expect(result).toBeNull();
      
      consoleSpy.mockRestore();
    });

    it('should handle network errors during caching', async () => {
      const url = '/api/test';
      
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await cacheService.cacheResource(url);
      
      expect(consoleSpy).toHaveBeenCalledWith(`Error caching resource ${url}:`, expect.any(Error));
      expect(result).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should destroy service and cleanup timers', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      cacheService.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      
      clearIntervalSpy.mockRestore();
    });
  });
});