/**
 * Cache Compatibility Integration Tests
 * Tests backward compatibility with existing API usage and graceful degradation
 * Requirements: 9.1, 10.5
 */

import { CacheCompatibilityLayer, LegacyCacheService, cacheCompatibilityLayer, legacyCacheService } from '../cacheCompatibilityLayer';
import { cacheMigrationSystem } from '../cacheMigrationSystem';

// Mock all dependencies
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

jest.mock('../cacheMigrationSystem', () => ({
  cacheMigrationSystem: {
    initialize: jest.fn(),
    detectCacheVersion: jest.fn(),
    isMigrationNeeded: jest.fn(),
    performMigration: jest.fn(),
    validateMigration: jest.fn()
  }
}));

// Mock browser environment variations
const createMockEnvironment = (capabilities: Partial<{
  serviceWorker: boolean;
  cacheAPI: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  broadcastChannel: boolean;
  webCrypto: boolean;
  navigationPreload: boolean;
  backgroundSync: boolean;
}>) => {
  const mockWindow = {} as any;
  const mockNavigator = {} as any;

  // Service Worker
  if (capabilities.serviceWorker) {
    mockNavigator.serviceWorker = {
      register: jest.fn(() => Promise.resolve({
        installing: null,
        waiting: null,
        active: null,
        addEventListener: jest.fn(),
        navigationPreload: capabilities.navigationPreload ? {
          enable: jest.fn(),
          disable: jest.fn(),
          setHeaderValue: jest.fn()
        } : undefined
      })),
      ready: Promise.resolve({
        navigationPreload: capabilities.navigationPreload ? {
          enable: jest.fn(),
          disable: jest.fn(),
          setHeaderValue: jest.fn()
        } : undefined,
        sync: capabilities.backgroundSync ? {
          register: jest.fn()
        } : undefined
      }),
      controller: {
        postMessage: jest.fn()
      }
    };
  }

  // Cache API
  if (capabilities.cacheAPI) {
    mockWindow.caches = {
      open: jest.fn(() => Promise.resolve({
        match: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        keys: jest.fn(() => Promise.resolve([]))
      })),
      keys: jest.fn(() => Promise.resolve([])),
      delete: jest.fn(() => Promise.resolve(true))
    };
  }

  // IndexedDB
  if (capabilities.indexedDB) {
    mockWindow.indexedDB = {
      open: jest.fn(() => ({
        result: {
          transaction: jest.fn(() => ({
            objectStore: jest.fn(() => ({
              put: jest.fn(() => ({ onsuccess: null, onerror: null })),
              get: jest.fn(() => ({ result: null, onsuccess: null, onerror: null })),
              delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
              getAll: jest.fn(() => ({ result: [], onsuccess: null, onerror: null }))
            }))
          })),
          close: jest.fn()
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      })),
      deleteDatabase: jest.fn()
    };
  }

  // LocalStorage
  if (capabilities.localStorage) {
    mockWindow.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0
    };
  }

  // SessionStorage
  if (capabilities.sessionStorage) {
    mockWindow.sessionStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0
    };
  }

  // BroadcastChannel
  if (capabilities.broadcastChannel) {
    mockWindow.BroadcastChannel = jest.fn(() => ({
      addEventListener: jest.fn(),
      postMessage: jest.fn(),
      close: jest.fn()
    }));
  }

  // Web Crypto
  if (capabilities.webCrypto) {
    mockWindow.crypto = {
      subtle: {
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        generateKey: jest.fn(),
        importKey: jest.fn(),
        exportKey: jest.fn()
      }
    };
  }

  return { mockWindow, mockNavigator };
};

describe('Cache Compatibility Integration Tests', () => {
  let originalWindow: any;
  let originalNavigator: any;

  beforeEach(() => {
    originalWindow = global.window;
    originalNavigator = global.navigator;
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
  });

  describe('Full Browser Support', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: true,
        cacheAPI: true,
        indexedDB: true,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true,
        webCrypto: true,
        navigationPreload: true,
        backgroundSync: true
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should initialize in enhanced mode with full support', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const capabilities = compatibilityLayer.getBrowserCapabilities();
      expect(capabilities.supportLevel).toBe('full');
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(true);
    });

    it('should use enhanced caching strategies', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.putWithMetadata.mockResolvedValue(undefined);
      serviceWorkerCacheService.fetchWithStrategy.mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), { status: 200 })
      );

      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      await compatibilityLayer.cache('/test', { data: 'test' });
      const result = await compatibilityLayer.get('/test');

      expect(serviceWorkerCacheService.putWithMetadata).toHaveBeenCalled();
      expect(serviceWorkerCacheService.fetchWithStrategy).toHaveBeenCalled();
      expect(result).toEqual({ data: 'test' });
    });

    it('should support all enhanced features', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const features = compatibilityLayer.getFeatureSupport();
      
      expect(features.serviceWorker).toBe(true);
      expect(features.cacheAPI).toBe(true);
      expect(features.indexedDB).toBe(true);
      expect(features.broadcastChannel).toBe(true);
      expect(features.webCrypto).toBe(true);
      expect(features.navigationPreload).toBe(true);
      expect(features.backgroundSync).toBe(true);
    });
  });

  describe('Partial Browser Support', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: true,
        cacheAPI: true,
        indexedDB: true,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: false, // Missing
        webCrypto: false, // Missing
        navigationPreload: false, // Missing
        backgroundSync: false // Missing
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should initialize in partial mode', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const capabilities = compatibilityLayer.getBrowserCapabilities();
      expect(capabilities.supportLevel).toBe('partial');
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(true);
    });

    it('should gracefully handle missing features', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const features = compatibilityLayer.getFeatureSupport();
      
      expect(features.serviceWorker).toBe(true);
      expect(features.cacheAPI).toBe(true);
      expect(features.indexedDB).toBe(true);
      expect(features.broadcastChannel).toBe(false);
      expect(features.webCrypto).toBe(false);
      expect(features.navigationPreload).toBe(false);
      expect(features.backgroundSync).toBe(false);
    });

    it('should still provide core caching functionality', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.putWithMetadata.mockResolvedValue(undefined);

      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
    });
  });

  describe('Minimal Browser Support', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: true, // Only service worker
        cacheAPI: false,
        indexedDB: false,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: false,
        webCrypto: false,
        navigationPreload: false,
        backgroundSync: false
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should initialize in minimal mode', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const capabilities = compatibilityLayer.getBrowserCapabilities();
      expect(capabilities.supportLevel).toBe('minimal');
    });

    it('should fallback to localStorage and memory cache', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const fallbackConfig = compatibilityLayer.getFallbackConfig();
      expect(fallbackConfig.useMemoryCache).toBe(true);
      expect(fallbackConfig.useLocalStorage).toBe(true);
    });
  });

  describe('No Browser Support (Legacy)', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: false,
        cacheAPI: false,
        indexedDB: false,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: false,
        webCrypto: false,
        navigationPreload: false,
        backgroundSync: false
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should initialize in fallback mode', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const capabilities = compatibilityLayer.getBrowserCapabilities();
      expect(capabilities.supportLevel).toBe('none');
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
    });

    it('should use only memory and localStorage fallbacks', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      await compatibilityLayer.cache('/test', { data: 'test' });
      const result = await compatibilityLayer.get('/test');

      expect(result).toEqual({ data: 'test' });
      expect(global.window.localStorage.setItem).toHaveBeenCalled();
    });

    it('should handle storage failures gracefully', async () => {
      global.window.localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      // Should not throw, should fallback to memory cache
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
    });
  });

  describe('Legacy API Backward Compatibility', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: true,
        cacheAPI: true,
        indexedDB: true,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true,
        webCrypto: true,
        navigationPreload: true,
        backgroundSync: true
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should maintain compatibility with existing cache service API', async () => {
      const legacyService = new LegacyCacheService();
      await legacyService.initialize();

      // Test all legacy methods exist and work
      await expect(legacyService.cache('/test', { data: 'test' })).resolves.not.toThrow();
      await expect(legacyService.get('/test')).resolves.toBeDefined();
      await expect(legacyService.clear()).resolves.not.toThrow();
      await expect(legacyService.invalidate('test')).resolves.not.toThrow();
      await expect(legacyService.getStats()).resolves.toBeDefined();
    });

    it('should support legacy method aliases', async () => {
      const legacyService = new LegacyCacheService();
      await legacyService.initialize();

      // Test method aliases
      expect(legacyService.put).toBe(legacyService.cache);
      expect(legacyService.retrieve).toBe(legacyService.get);
      expect(legacyService.remove).toBe(legacyService.invalidate);
      expect(legacyService.flush).toBe(legacyService.clear);
      expect(legacyService.status).toBe(legacyService.getStats);

      // Test they actually work
      await expect(legacyService.put('/test', { data: 'test' })).resolves.not.toThrow();
      await expect(legacyService.retrieve('/test')).resolves.toBeDefined();
    });

    it('should support additional legacy methods', async () => {
      const legacyService = new LegacyCacheService();
      await legacyService.initialize();

      await expect(legacyService.cacheWithTTL('/test', { data: 'test' }, 60000))
        .resolves.not.toThrow();
      await expect(legacyService.getCached('/test')).resolves.toBeDefined();
      await expect(legacyService.clearAll()).resolves.not.toThrow();
      await expect(legacyService.invalidatePattern('test')).resolves.not.toThrow();
      await expect(legacyService.getCacheStats()).resolves.toBeDefined();
    });

    it('should handle legacy API errors gracefully', async () => {
      const { serviceWorkerCacheService } = require('../serviceWorkerCacheService');
      serviceWorkerCacheService.putWithMetadata.mockRejectedValue(new Error('Cache failed'));
      serviceWorkerCacheService.fetchWithStrategy.mockRejectedValue(new Error('Fetch failed'));
      serviceWorkerCacheService.getCacheStats.mockRejectedValue(new Error('Stats failed'));

      const legacyService = new LegacyCacheService();
      await legacyService.initialize();

      // Should not throw, should handle gracefully
      await expect(legacyService.cache('/test', { data: 'test' })).resolves.not.toThrow();
      
      const result = await legacyService.get('/test');
      expect(result).toBeNull();

      const stats = await legacyService.getStats();
      expect(stats).toHaveProperty('error');
    });
  });

  describe('Migration Integration', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: true,
        cacheAPI: true,
        indexedDB: true,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true,
        webCrypto: true,
        navigationPreload: true,
        backgroundSync: true
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should integrate with migration system', async () => {
      const { cacheMigrationSystem: mockMigrationSystem } = require('../cacheMigrationSystem');
      mockMigrationSystem.isMigrationNeeded.mockResolvedValue(true);
      mockMigrationSystem.performMigration.mockResolvedValue({
        success: true,
        version: '2.0.0',
        migratedCaches: ['static-v2'],
        errors: [],
        rollbackAvailable: true,
        migrationTime: 1000
      });

      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      // Should work normally after migration
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
    });

    it('should handle migration failures gracefully', async () => {
      const { cacheMigrationSystem: mockMigrationSystem } = require('../cacheMigrationSystem');
      mockMigrationSystem.isMigrationNeeded.mockResolvedValue(true);
      mockMigrationSystem.performMigration.mockResolvedValue({
        success: false,
        version: '2.0.0',
        migratedCaches: [],
        errors: ['Migration failed'],
        rollbackAvailable: true,
        migrationTime: 500
      });

      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Should still initialize and work in fallback mode
      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
    });
  });

  describe('Cross-Browser Compatibility', () => {
    const testBrowserScenarios = [
      {
        name: 'Chrome/Edge (Full Support)',
        capabilities: {
          serviceWorker: true,
          cacheAPI: true,
          indexedDB: true,
          localStorage: true,
          sessionStorage: true,
          broadcastChannel: true,
          webCrypto: true,
          navigationPreload: true,
          backgroundSync: true
        },
        expectedLevel: 'full'
      },
      {
        name: 'Firefox (Partial Support)',
        capabilities: {
          serviceWorker: true,
          cacheAPI: true,
          indexedDB: true,
          localStorage: true,
          sessionStorage: true,
          broadcastChannel: true,
          webCrypto: true,
          navigationPreload: false, // Firefox limitation
          backgroundSync: true
        },
        expectedLevel: 'partial'
      },
      {
        name: 'Safari (Limited Support)',
        capabilities: {
          serviceWorker: true,
          cacheAPI: true,
          indexedDB: true,
          localStorage: true,
          sessionStorage: true,
          broadcastChannel: false, // Safari limitation
          webCrypto: true,
          navigationPreload: false, // Safari limitation
          backgroundSync: false // Safari limitation
        },
        expectedLevel: 'partial'
      },
      {
        name: 'Internet Explorer (No Support)',
        capabilities: {
          serviceWorker: false,
          cacheAPI: false,
          indexedDB: false,
          localStorage: true,
          sessionStorage: true,
          broadcastChannel: false,
          webCrypto: false,
          navigationPreload: false,
          backgroundSync: false
        },
        expectedLevel: 'none'
      }
    ];

    testBrowserScenarios.forEach(scenario => {
      it(`should work correctly in ${scenario.name}`, async () => {
        const { mockWindow, mockNavigator } = createMockEnvironment(scenario.capabilities);
        global.window = mockWindow;
        global.navigator = mockNavigator;

        const compatibilityLayer = new CacheCompatibilityLayer();
        await compatibilityLayer.initialize();

        const capabilities = compatibilityLayer.getBrowserCapabilities();
        expect(capabilities.supportLevel).toBe(scenario.expectedLevel);

        // Should always be able to cache and retrieve data
        await compatibilityLayer.cache('/test', { data: 'test' });
        const result = await compatibilityLayer.get('/test');
        expect(result).toEqual({ data: 'test' });
      });
    });
  });

  describe('Performance and Memory Management', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: false, // Force fallback mode for memory testing
        cacheAPI: false,
        indexedDB: false,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: false,
        webCrypto: false,
        navigationPreload: false,
        backgroundSync: false
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should manage memory cache size limits', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Set very small memory limit for testing
      compatibilityLayer.updateFallbackConfig({ maxMemoryCacheSize: 1000 });
      
      await compatibilityLayer.initialize();

      // Add many large entries
      for (let i = 0; i < 20; i++) {
        await compatibilityLayer.cache(`/test${i}`, { 
          data: 'x'.repeat(200), // Large data
          index: i 
        });
      }

      // Should have evicted some entries
      const exportData = await compatibilityLayer.exportCacheData();
      expect(exportData.memoryCache.length).toBeLessThan(20);
    });

    it('should clean up expired entries automatically', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      // Cache with short TTL
      await compatibilityLayer.cache('/test-expired', { data: 'test' }, { maxAge: 100 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should return null for expired entry
      const result = await compatibilityLayer.get('/test-expired');
      expect(result).toBeNull();
    });

    it('should handle localStorage quota exceeded', async () => {
      global.window.localStorage.setItem.mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      // Should fallback to memory cache without throwing
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
      
      const result = await compatibilityLayer.get('/test');
      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('Diagnostics and Monitoring', () => {
    beforeEach(() => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: true,
        cacheAPI: true,
        indexedDB: true,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: true,
        webCrypto: true,
        navigationPreload: true,
        backgroundSync: true
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;
    });

    it('should provide comprehensive diagnostics', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const diagnostics = await compatibilityLayer.runDiagnostics();

      expect(diagnostics).toHaveProperty('featureSupport');
      expect(diagnostics).toHaveProperty('browserCapabilities');
      expect(diagnostics).toHaveProperty('storageAvailability');
      expect(diagnostics).toHaveProperty('performanceMetrics');
      expect(diagnostics).toHaveProperty('recommendations');

      expect(Array.isArray(diagnostics.recommendations)).toBe(true);
    });

    it('should generate appropriate recommendations for limited browsers', async () => {
      const { mockWindow, mockNavigator } = createMockEnvironment({
        serviceWorker: false,
        cacheAPI: false,
        indexedDB: false,
        localStorage: true,
        sessionStorage: true,
        broadcastChannel: false,
        webCrypto: false,
        navigationPreload: false,
        backgroundSync: false
      });

      global.window = mockWindow;
      global.navigator = mockNavigator;

      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      const diagnostics = await compatibilityLayer.runDiagnostics();

      expect(diagnostics.recommendations).toContain(
        expect.stringContaining('modern browser')
      );
      expect(diagnostics.recommendations).toContain(
        expect.stringContaining('IndexedDB')
      );
    });

    it('should export and import cache data correctly', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();

      // Add test data
      await compatibilityLayer.cache('/test1', { data: 'test1' });
      await compatibilityLayer.cache('/test2', { data: 'test2' });

      // Export data
      const exportData = await compatibilityLayer.exportCacheData();
      expect(exportData.memoryCache.length).toBe(2);

      // Create new instance and import
      const newCompatibilityLayer = new CacheCompatibilityLayer();
      await newCompatibilityLayer.initialize();
      await newCompatibilityLayer.importCacheData(exportData);

      // Verify imported data
      const result1 = await newCompatibilityLayer.get('/test1');
      const result2 = await newCompatibilityLayer.get('/test2');

      expect(result1).toEqual({ data: 'test1' });
      expect(result2).toEqual({ data: 'test2' });
    });
  });

  describe('Singleton Instances', () => {
    it('should provide working singleton instances', async () => {
      expect(cacheCompatibilityLayer).toBeInstanceOf(CacheCompatibilityLayer);
      expect(legacyCacheService).toBeInstanceOf(LegacyCacheService);

      await expect(cacheCompatibilityLayer.initialize()).resolves.not.toThrow();
      await expect(legacyCacheService.initialize()).resolves.not.toThrow();
    });

    it('should maintain state across singleton usage', async () => {
      await cacheCompatibilityLayer.initialize();
      await legacyCacheService.initialize();

      await cacheCompatibilityLayer.cache('/singleton-test', { data: 'singleton' });
      const result = await cacheCompatibilityLayer.get('/singleton-test');

      expect(result).toEqual({ data: 'singleton' });
    });
  });
});