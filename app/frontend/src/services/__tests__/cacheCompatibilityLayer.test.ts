/**
 * Cache Compatibility Layer Tests
 * Tests backward compatibility and graceful degradation
 */

import { CacheCompatibilityLayer, LegacyCacheService } from '../cacheCompatibilityLayer';

// Mock service worker cache service
jest.mock('../serviceWorkerCacheService', () => ({
  serviceWorkerCacheService: {
    initialize: jest.fn(),
    fetchWithStrategy: jest.fn(),
    putWithMetadata: jest.fn(),
    clearAllCaches: jest.fn(),
    invalidateByTag: jest.fn(),
    getCacheStats: jest.fn(),
    enableNavigationPreload: jest.fn()
  }
}));

// Mock browser APIs
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

// Mock navigator APIs
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(),
    ready: Promise.resolve({
      navigationPreload: {
        enable: jest.fn(),
        disable: jest.fn(),
        setHeaderValue: jest.fn()
      }
    })
  },
  writable: true
});

Object.defineProperty(window, 'caches', {
  value: {
    open: jest.fn(),
    keys: jest.fn(),
    delete: jest.fn(),
    match: jest.fn()
  },
  writable: true
});

describe('CacheCompatibilityLayer', () => {
  let compatibilityLayer: CacheCompatibilityLayer;

  beforeEach(() => {
    jest.clearAllMocks();
    compatibilityLayer = new CacheCompatibilityLayer();
  });

  describe('Feature Detection', () => {
    it('should detect service worker support', () => {
      const features = compatibilityLayer.getFeatureSupport();
      expect(features.serviceWorker).toBe(true);
    });

    it('should detect cache API support', () => {
      const features = compatibilityLayer.getFeatureSupport();
      expect(features.cacheAPI).toBe(true);
    });

    it('should assess browser capabilities correctly', () => {
      const capabilities = compatibilityLayer.getBrowserCapabilities();
      expect(capabilities.supportLevel).toBeDefined();
      expect(['full', 'partial', 'minimal', 'none']).toContain(capabilities.supportLevel);
    });

    it('should handle missing APIs gracefully', () => {
      // Temporarily remove service worker
      const originalSW = (navigator as any).serviceWorker;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      });

      const newLayer = new CacheCompatibilityLayer();
      const features = newLayer.getFeatureSupport();
      
      expect(features.serviceWorker).toBe(false);
      
      // Restore
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalSW,
        configurable: true
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with service worker support', async () => {
      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
    });

    it('should fallback gracefully when enhanced mode fails', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.initialize.mockRejectedValueOnce(new Error('SW init failed'));

      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
    });

    it('should not initialize multiple times', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      
      await compatibilityLayer.initialize();
      await compatibilityLayer.initialize();
      
      expect(serviceWorkerCacheService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Operations', () => {
    beforeEach(async () => {
      await compatibilityLayer.initialize();
    });

    it('should cache data in enhanced mode', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.putWithMetadata.mockResolvedValueOnce(undefined);

      await compatibilityLayer.cache('/test', { data: 'test' });
      
      expect(serviceWorkerCacheService.putWithMetadata).toHaveBeenCalled();
    });

    it('should retrieve data in enhanced mode', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test' })
      };
      serviceWorkerCacheService.fetchWithStrategy.mockResolvedValueOnce(mockResponse);

      const result = await compatibilityLayer.get('/test');
      
      expect(result).toEqual({ data: 'test' });
      expect(serviceWorkerCacheService.fetchWithStrategy).toHaveBeenCalled();
    });

    it('should fallback to memory cache when enhanced mode fails', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.fetchWithStrategy.mockRejectedValueOnce(new Error('Network error'));

      // First cache some data
      await compatibilityLayer.cache('/test', { data: 'test' });
      
      // Then try to retrieve it
      const result = await compatibilityLayer.get('/test');
      
      // Should fallback and still return data
      expect(result).toBeDefined();
    });

    it('should handle localStorage fallback', async () => {
      // Mock localStorage to work
      mockLocalStorage.setItem.mockImplementation((key, value) => {
        mockLocalStorage[key] = value;
      });
      mockLocalStorage.getItem.mockImplementation((key) => {
        return mockLocalStorage[key] || null;
      });

      // Force fallback mode
      const fallbackLayer = new CacheCompatibilityLayer();
      (fallbackLayer as any).isEnhancedMode = false;
      (fallbackLayer as any).fallbackConfig.useLocalStorage = true;

      await fallbackLayer.cache('/test', { data: 'test' });
      const result = await fallbackLayer.get('/test');

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle cache expiration', async () => {
      const fallbackLayer = new CacheCompatibilityLayer();
      (fallbackLayer as any).isEnhancedMode = false;

      // Cache with short TTL
      await fallbackLayer.cache('/test', { data: 'test' }, { maxAge: 100 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result = await fallbackLayer.get('/test');
      expect(result).toBeNull();
    });
  });

  describe('Storage Layer Management', () => {
    it('should try storage layers in correct order', async () => {
      const fallbackLayer = new CacheCompatibilityLayer();
      (fallbackLayer as any).isEnhancedMode = false;
      
      // Mock all storage layers
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        data: 'localStorage',
        timestamp: Date.now(),
        maxAge: 300000
      }));

      const result = await fallbackLayer.get('/test');
      
      // Should try memory first, then localStorage
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    });

    it('should update access statistics', async () => {
      const fallbackLayer = new CacheCompatibilityLayer();
      (fallbackLayer as any).isEnhancedMode = false;

      await fallbackLayer.cache('/test', { data: 'test' });
      
      // Access multiple times
      await fallbackLayer.get('/test');
      await fallbackLayer.get('/test');
      
      const memoryCache = (fallbackLayer as any).memoryCache;
      const entry = memoryCache.get('/test');
      
      expect(entry.accessCount).toBeGreaterThan(0);
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up expired entries', async () => {
      const fallbackLayer = new CacheCompatibilityLayer();
      (fallbackLayer as any).isEnhancedMode = false;

      // Add expired entry
      const memoryCache = (fallbackLayer as any).memoryCache;
      memoryCache.set('/expired', {
        data: 'test',
        timestamp: Date.now() - 400000, // 400 seconds ago
        maxAge: 300000 // 5 minutes
      });

      // Trigger cleanup
      await (fallbackLayer as any).cleanupExpiredEntries();

      expect(memoryCache.has('/expired')).toBe(false);
    });

    it('should evict oldest entries when memory limit exceeded', async () => {
      const fallbackLayer = new CacheCompatibilityLayer();
      (fallbackLayer as any).isEnhancedMode = false;
      (fallbackLayer as any).fallbackConfig.maxMemoryCacheSize = 1000; // Very small limit

      const memoryCache = (fallbackLayer as any).memoryCache;
      
      // Add many entries to exceed limit
      for (let i = 0; i < 10; i++) {
        memoryCache.set(`/test${i}`, {
          data: 'x'.repeat(200), // Large data
          timestamp: Date.now() - (10 - i) * 1000, // Different timestamps
          maxAge: 300000
        });
      }

      // Trigger eviction
      await (fallbackLayer as any).evictOldestMemoryCacheEntries();

      // Should have fewer entries
      expect(memoryCache.size).toBeLessThan(10);
    });
  });

  describe('Diagnostics', () => {
    it('should run diagnostics successfully', async () => {
      await compatibilityLayer.initialize();
      
      const diagnostics = await compatibilityLayer.runDiagnostics();
      
      expect(diagnostics).toHaveProperty('featureSupport');
      expect(diagnostics).toHaveProperty('browserCapabilities');
      expect(diagnostics).toHaveProperty('storageAvailability');
      expect(diagnostics).toHaveProperty('performanceMetrics');
      expect(diagnostics).toHaveProperty('recommendations');
    });

    it('should generate appropriate recommendations', async () => {
      // Mock limited browser capabilities
      const limitedLayer = new CacheCompatibilityLayer();
      (limitedLayer as any).featureSupport.serviceWorker = false;
      (limitedLayer as any).featureSupport.indexedDB = false;
      (limitedLayer as any).browserCapabilities.supportLevel = 'minimal';

      const diagnostics = await limitedLayer.runDiagnostics();
      
      expect(diagnostics.recommendations.some(rec => rec.includes('modern browser'))).toBe(true);
    });
  });

  describe('Data Export/Import', () => {
    it('should export cache data', async () => {
      await compatibilityLayer.initialize();
      
      // Add some test data
      await compatibilityLayer.cache('/test', { data: 'test' });
      
      const exportData = await compatibilityLayer.exportCacheData();
      
      expect(exportData).toHaveProperty('metadata');
      expect(exportData).toHaveProperty('memoryCache');
      expect(exportData).toHaveProperty('storageStats');
    });

    it('should import cache data', async () => {
      await compatibilityLayer.initialize();
      
      const importData = {
        memoryCache: [
          {
            key: '/imported',
            data: { imported: true },
            metadata: {
              timestamp: Date.now(),
              maxAge: 300000,
              accessCount: 0,
              lastAccessed: Date.now()
            }
          }
        ]
      };

      await compatibilityLayer.importCacheData(importData);
      
      const result = await compatibilityLayer.get('/imported');
      expect(result).toEqual({ imported: true });
    });
  });
});

describe('LegacyCacheService', () => {
  let legacyService: LegacyCacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    legacyService = new LegacyCacheService();
  });

  describe('Initialization', () => {
    it('should initialize with retry logic', async () => {
      await expect(legacyService.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization failures gracefully', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.initialize.mockRejectedValue(new Error('Init failed'));

      // Should not throw even if initialization fails
      await expect(legacyService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Legacy API Compatibility', () => {
    beforeEach(async () => {
      await legacyService.initialize();
    });

    it('should support legacy cache method', async () => {
      await expect(legacyService.cache('/test', { data: 'test' })).resolves.not.toThrow();
    });

    it('should support legacy get method', async () => {
      await legacyService.cache('/test', { data: 'test' });
      const result = await legacyService.get('/test');
      expect(result).toBeDefined();
    });

    it('should support cacheWithTTL method', async () => {
      await expect(legacyService.cacheWithTTL('/test', { data: 'test' }, 60000)).resolves.not.toThrow();
    });

    it('should support getCached alias', async () => {
      await legacyService.cache('/test', { data: 'test' });
      const result = await legacyService.getCached('/test');
      expect(result).toBeDefined();
    });

    it('should support method aliases', async () => {
      // Test method aliases
      expect(legacyService.put).toBe(legacyService.cache);
      expect(legacyService.retrieve).toBe(legacyService.get);
      expect(legacyService.remove).toBe(legacyService.invalidate);
      expect(legacyService.flush).toBe(legacyService.clear);
      expect(legacyService.status).toBe(legacyService.getStats);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache operation failures gracefully', async () => {
      // Mock failure
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.putWithMetadata.mockRejectedValue(new Error('Cache failed'));

      // Should not throw
      await expect(legacyService.cache('/test', { data: 'test' })).resolves.not.toThrow();
    });

    it('should return null for failed get operations', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.fetchWithStrategy.mockRejectedValue(new Error('Get failed'));

      const result = await legacyService.get('/test');
      expect(result).toBeNull();
    });

    it('should return error stats when stats operation fails', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.getCacheStats.mockRejectedValue(new Error('Stats failed'));

      const stats = await legacyService.getStats();
      expect(stats).toHaveProperty('error');
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('Feature Detection', () => {
    it('should detect service worker support safely', () => {
      const isSupported = legacyService.isServiceWorkerSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    it('should detect enhanced cache availability safely', () => {
      const isAvailable = legacyService.isEnhancedCacheAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should return safe feature support object', () => {
      const features = legacyService.getFeatureSupport();
      expect(features).toHaveProperty('serviceWorker');
      expect(features).toHaveProperty('workbox');
      expect(features).toHaveProperty('backgroundSync');
    });

    it('should handle feature detection errors', () => {
      // Mock error in compatibility layer
      const originalGetFeatureSupport = legacyService['compatibilityLayer'].getFeatureSupport;
      legacyService['compatibilityLayer'].getFeatureSupport = jest.fn().mockImplementation(() => {
        throw new Error('Feature detection failed');
      });

      const features = legacyService.getFeatureSupport();
      expect(features.serviceWorker).toBe(false);

      // Restore
      legacyService['compatibilityLayer'].getFeatureSupport = originalGetFeatureSupport;
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await legacyService.initialize();
    });

    it('should warm cache with multiple URLs', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      await legacyService.warmCache(['/test1', '/test2']);
      
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should preload critical resources by priority', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      const resources = [
        { url: '/low', priority: 'low' as const },
        { url: '/high', priority: 'high' as const },
        { url: '/medium', priority: 'medium' as const }
      ];

      await legacyService.preloadCriticalResources(resources);
      
      expect(fetch).toHaveBeenCalledTimes(3);
      // Should be called in priority order
      expect((fetch as jest.Mock).mock.calls[0][0]).toBe('/high');
    });

    it('should handle preload failures gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const resources = [{ url: '/test', priority: 'high' as const }];
      
      await expect(legacyService.preloadCriticalResources(resources)).resolves.not.toThrow();
    });
  });
});