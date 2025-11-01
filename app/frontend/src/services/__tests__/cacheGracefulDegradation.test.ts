/**
 * Cache Graceful Degradation Tests
 * Tests graceful degradation scenarios and rollback mechanisms
 * Requirements: 9.1, 10.5
 */

import { CacheCompatibilityLayer, LegacyCacheService } from '../cacheCompatibilityLayer';
import { cacheMigrationSystem } from '../cacheMigrationSystem';

// Mock service worker cache service with failure scenarios
const mockServiceWorkerCacheService = {
  initialize: jest.fn(),
  fetchWithStrategy: jest.fn(),
  putWithMetadata: jest.fn(),
  clearAllCaches: jest.fn(),
  invalidateByTag: jest.fn(),
  getCacheStats: jest.fn(),
  enableNavigationPreload: jest.fn()
};

jest.mock('../serviceWorkerCacheService', () => ({
  serviceWorkerCacheService: mockServiceWorkerCacheService
}));

jest.mock('../cacheMigrationSystem', () => ({
  cacheMigrationSystem: {
    initialize: jest.fn(),
    detectCacheVersion: jest.fn(),
    isMigrationNeeded: jest.fn(),
    performMigration: jest.fn(),
    performRollback: jest.fn(),
    validateMigration: jest.fn()
  }
}));

// Mock browser APIs with failure scenarios
const createFailingMockEnvironment = () => {
  const mockWindow = {
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0
    },
    sessionStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      key: jest.fn(),
      length: 0
    },
    caches: {
      open: jest.fn(),
      keys: jest.fn(),
      delete: jest.fn()
    },
    indexedDB: {
      open: jest.fn(),
      deleteDatabase: jest.fn()
    },
    BroadcastChannel: jest.fn()
  };

  const mockNavigator = {
    serviceWorker: {
      register: jest.fn(),
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
    }
  };

  return { mockWindow, mockNavigator };
};

describe('Cache Graceful Degradation Tests', () => {
  let originalWindow: any;
  let originalNavigator: any;
  let mockWindow: any;
  let mockNavigator: any;

  beforeEach(() => {
    originalWindow = global.window;
    originalNavigator = global.navigator;
    
    const mocks = createFailingMockEnvironment();
    mockWindow = mocks.mockWindow;
    mockNavigator = mocks.mockNavigator;
    
    global.window = mockWindow;
    global.navigator = mockNavigator;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
  });

  describe('Service Worker Initialization Failures', () => {
    it('should fallback gracefully when service worker registration fails', async () => {
      mockServiceWorkerCacheService.initialize.mockRejectedValue(new Error('SW registration failed'));
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Should not throw, should fallback to memory cache
      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
      
      // Should still be able to cache and retrieve
      await compatibilityLayer.cache('/test', { data: 'test' });
      const result = await compatibilityLayer.get('/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle service worker not supported', async () => {
      delete (global.navigator as any).serviceWorker;
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      const features = compatibilityLayer.getFeatureSupport();
      expect(features.serviceWorker).toBe(false);
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
    });

    it('should handle service worker timeout during initialization', async () => {
      mockServiceWorkerCacheService.initialize.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 6000)
        )
      );
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Should timeout and fallback
      await compatibilityLayer.initialize();
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
    });
  });

  describe('Cache API Failures', () => {
    it('should handle cache.open failures', async () => {
      mockWindow.caches.open.mockRejectedValue(new Error('Cache open failed'));
      mockServiceWorkerCacheService.putWithMetadata.mockRejectedValue(new Error('Cache put failed'));
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should fallback to memory cache
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
      
      const result = await compatibilityLayer.get('/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle cache quota exceeded errors', async () => {
      mockServiceWorkerCacheService.putWithMetadata.mockRejectedValue(
        new DOMException('Quota exceeded', 'QuotaExceededError')
      );
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should handle gracefully and fallback
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
    });

    it('should handle cache corruption', async () => {
      mockServiceWorkerCacheService.fetchWithStrategy.mockRejectedValue(
        new Error('Cache corrupted')
      );
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should fallback to network or memory cache
      const result = await compatibilityLayer.get('/test');
      expect(result).toBeNull(); // No cached data available
    });
  });

  describe('IndexedDB Failures', () => {
    it('should handle IndexedDB unavailable', async () => {
      delete (global.window as any).indexedDB;
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      const features = compatibilityLayer.getFeatureSupport();
      expect(features.indexedDB).toBe(false);
      
      // Should still work with other storage methods
      await compatibilityLayer.cache('/test', { data: 'test' });
      const result = await compatibilityLayer.get('/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle IndexedDB open failures', async () => {
      mockWindow.indexedDB.open.mockImplementation(() => {
        const request = {
          result: null,
          error: new Error('DB open failed'),
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        setTimeout(() => {
          if (request.onerror) request.onerror();
        }, 0);
        return request;
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Should fallback gracefully
      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
    });

    it('should handle IndexedDB transaction failures', async () => {
      const mockDB = {
        transaction: jest.fn().mockImplementation(() => {
          throw new Error('Transaction failed');
        }),
        close: jest.fn()
      };
      
      mockWindow.indexedDB.open.mockImplementation(() => {
        const request = {
          result: mockDB,
          error: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should handle transaction failures gracefully
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
    });
  });

  describe('Storage Failures', () => {
    it('should handle localStorage quota exceeded', async () => {
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should fallback to sessionStorage or memory
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
      
      const result = await compatibilityLayer.get('/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle localStorage disabled', async () => {
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage is disabled');
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      const fallbackConfig = compatibilityLayer.getFallbackConfig();
      expect(fallbackConfig.useLocalStorage).toBe(false);
    });

    it('should handle all storage methods failing', async () => {
      // Mock all storage methods to fail
      mockWindow.localStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage failed');
      });
      mockWindow.sessionStorage.setItem.mockImplementation(() => {
        throw new Error('sessionStorage failed');
      });
      mockServiceWorkerCacheService.putWithMetadata.mockRejectedValue(
        new Error('Cache API failed')
      );
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should still work with memory cache only
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
      
      const result = await compatibilityLayer.get('/test');
      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('Network and Connectivity Issues', () => {
    it('should handle network failures during cache operations', async () => {
      mockServiceWorkerCacheService.fetchWithStrategy.mockRejectedValue(
        new Error('Network error')
      );
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should handle network errors gracefully
      const result = await compatibilityLayer.get('/test');
      expect(result).toBeNull();
    });

    it('should handle intermittent connectivity', async () => {
      let callCount = 0;
      mockServiceWorkerCacheService.fetchWithStrategy.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.resolve(new Response(JSON.stringify({ data: 'test' })));
        } else {
          return Promise.reject(new Error('Network error'));
        }
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // First call should fail
      let result = await compatibilityLayer.get('/test');
      expect(result).toBeNull();
      
      // Second call should succeed
      result = await compatibilityLayer.get('/test');
      expect(result).toEqual({ data: 'test' });
    });

    it('should handle slow network responses', async () => {
      mockServiceWorkerCacheService.fetchWithStrategy.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(new Response(JSON.stringify({ data: 'slow' }))), 10000)
        )
      );
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should timeout and return null or cached data
      const startTime = Date.now();
      const result = await compatibilityLayer.get('/test');
      const endTime = Date.now();
      
      // Should not wait for the full 10 seconds
      expect(endTime - startTime).toBeLessThan(8000);
    });
  });

  describe('Migration Rollback Scenarios', () => {
    it('should rollback on migration failure', async () => {
      const mockMigrationSystem = require('../cacheMigrationSystem').cacheMigrationSystem;
      
      mockMigrationSystem.isMigrationNeeded.mockResolvedValue(true);
      mockMigrationSystem.performMigration.mockResolvedValue({
        success: false,
        version: '2.0.0',
        migratedCaches: [],
        errors: ['Migration step failed'],
        rollbackAvailable: true,
        migrationTime: 1000
      });
      mockMigrationSystem.performRollback.mockResolvedValue(undefined);
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should have attempted rollback
      expect(mockMigrationSystem.performRollback).toHaveBeenCalled();
    });

    it('should handle rollback failures', async () => {
      const mockMigrationSystem = require('../cacheMigrationSystem').cacheMigrationSystem;
      
      mockMigrationSystem.isMigrationNeeded.mockResolvedValue(true);
      mockMigrationSystem.performMigration.mockResolvedValue({
        success: false,
        version: '2.0.0',
        migratedCaches: [],
        errors: ['Migration failed'],
        rollbackAvailable: true,
        migrationTime: 500
      });
      mockMigrationSystem.performRollback.mockRejectedValue(new Error('Rollback failed'));
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Should still initialize despite rollback failure
      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
    });

    it('should validate migration and rollback if invalid', async () => {
      const mockMigrationSystem = require('../cacheMigrationSystem').cacheMigrationSystem;
      
      mockMigrationSystem.isMigrationNeeded.mockResolvedValue(true);
      mockMigrationSystem.performMigration.mockResolvedValue({
        success: true,
        version: '2.0.0',
        migratedCaches: ['static-v2'],
        errors: [],
        rollbackAvailable: true,
        migrationTime: 1000
      });
      mockMigrationSystem.validateMigration.mockResolvedValue({
        isValid: false,
        issues: ['Enhanced cache missing', 'Service worker not registered']
      });
      mockMigrationSystem.performRollback.mockResolvedValue(undefined);
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should have performed rollback due to validation failure
      expect(mockMigrationSystem.performRollback).toHaveBeenCalled();
    });
  });

  describe('Legacy Service Error Handling', () => {
    it('should handle initialization retry failures', async () => {
      mockServiceWorkerCacheService.initialize.mockRejectedValue(new Error('Init failed'));
      
      const legacyService = new LegacyCacheService();
      
      // Should not throw even after all retries fail
      await expect(legacyService.initialize()).resolves.not.toThrow();
    });

    it('should provide safe feature detection on errors', async () => {
      const legacyService = new LegacyCacheService();
      
      // Mock compatibility layer to throw
      (legacyService as any).compatibilityLayer.getFeatureSupport = jest.fn(() => {
        throw new Error('Feature detection failed');
      });
      
      const features = legacyService.getFeatureSupport();
      
      // Should return safe defaults
      expect(features.serviceWorker).toBe(false);
      expect(features.workbox).toBe(false);
      expect(features.backgroundSync).toBe(false);
    });

    it('should handle cache operation failures gracefully', async () => {
      mockServiceWorkerCacheService.putWithMetadata.mockRejectedValue(new Error('Cache failed'));
      mockServiceWorkerCacheService.fetchWithStrategy.mockRejectedValue(new Error('Fetch failed'));
      mockServiceWorkerCacheService.clearAllCaches.mockRejectedValue(new Error('Clear failed'));
      mockServiceWorkerCacheService.invalidateByTag.mockRejectedValue(new Error('Invalidate failed'));
      mockServiceWorkerCacheService.getCacheStats.mockRejectedValue(new Error('Stats failed'));
      
      const legacyService = new LegacyCacheService();
      await legacyService.initialize();
      
      // All operations should handle errors gracefully
      await expect(legacyService.cache('/test', { data: 'test' })).resolves.not.toThrow();
      
      const result = await legacyService.get('/test');
      expect(result).toBeNull();
      
      await expect(legacyService.clear()).resolves.not.toThrow();
      await expect(legacyService.invalidate('test')).resolves.not.toThrow();
      
      const stats = await legacyService.getStats();
      expect(stats).toHaveProperty('error');
      expect(stats.totalSize).toBe(0);
    });

    it('should handle utility method failures', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const legacyService = new LegacyCacheService();
      await legacyService.initialize();
      
      // Should handle failures gracefully
      await expect(legacyService.warmCache(['/test1', '/test2']))
        .resolves.not.toThrow();
      
      await expect(legacyService.preloadCriticalResources([
        { url: '/test', priority: 'high' }
      ])).resolves.not.toThrow();
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory pressure gracefully', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Simulate low memory environment
      Object.defineProperty(performance, 'memory', {
        value: {
          jsHeapSizeLimit: 50 * 1024 * 1024, // 50MB limit
          usedJSHeapSize: 45 * 1024 * 1024,  // 45MB used
          totalJSHeapSize: 50 * 1024 * 1024
        },
        configurable: true
      });
      
      await compatibilityLayer.initialize();
      
      // Should use smaller cache limits
      const fallbackConfig = compatibilityLayer.getFallbackConfig();
      expect(fallbackConfig.maxMemoryCacheSize).toBeLessThan(100 * 1024 * 1024);
    });

    it('should handle cache cleanup failures', async () => {
      mockWindow.localStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove failed');
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should handle cleanup failures gracefully
      await expect((compatibilityLayer as any).cleanupExpiredEntries())
        .resolves.not.toThrow();
    });

    it('should handle storage estimation failures', async () => {
      // Mock navigator.storage to fail
      (global.navigator as any).storage = {
        estimate: jest.fn().mockRejectedValue(new Error('Storage estimation failed'))
      };
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      const diagnostics = await compatibilityLayer.runDiagnostics();
      
      // Should provide fallback metrics
      expect(diagnostics.performanceMetrics).toBeDefined();
      expect(typeof diagnostics.performanceMetrics.memoryUsage).toBe('number');
    });
  });

  describe('Cross-Tab Communication Failures', () => {
    it('should handle BroadcastChannel failures', async () => {
      mockWindow.BroadcastChannel.mockImplementation(() => {
        throw new Error('BroadcastChannel failed');
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Should initialize without BroadcastChannel
      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
      
      const features = compatibilityLayer.getFeatureSupport();
      expect(features.broadcastChannel).toBe(false);
    });

    it('should handle storage event failures', async () => {
      // Mock addEventListener to fail
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = jest.fn().mockImplementation(() => {
        throw new Error('Event listener failed');
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      
      // Should handle gracefully
      await expect(compatibilityLayer.initialize()).resolves.not.toThrow();
      
      // Restore
      window.addEventListener = originalAddEventListener;
    });
  });

  describe('Progressive Enhancement Failures', () => {
    it('should handle feature upgrade failures', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Initially in fallback mode
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
      
      // Try to upgrade but fail
      mockServiceWorkerCacheService.initialize.mockRejectedValue(new Error('Upgrade failed'));
      
      compatibilityLayer.updateFallbackConfig({ enableProgressiveEnhancement: true });
      
      // Should remain in fallback mode
      expect(compatibilityLayer.isEnhancedModeAvailable()).toBe(false);
    });

    it('should handle partial feature availability', async () => {
      // Start with no service worker
      delete (global.navigator as any).serviceWorker;
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      expect(compatibilityLayer.getSupportLevel()).toBe('none');
      
      // Add service worker later (simulating browser update)
      (global.navigator as any).serviceWorker = mockNavigator.serviceWorker;
      
      // Should detect new capabilities
      const newCompatibilityLayer = new CacheCompatibilityLayer();
      await newCompatibilityLayer.initialize();
      
      expect(newCompatibilityLayer.getSupportLevel()).not.toBe('none');
    });
  });

  describe('Data Integrity and Corruption Handling', () => {
    it('should handle corrupted cache metadata', async () => {
      mockWindow.localStorage.getItem.mockReturnValue('invalid json data');
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should handle corrupted data gracefully
      const result = await compatibilityLayer.get('/test');
      expect(result).toBeNull();
    });

    it('should handle corrupted IndexedDB data', async () => {
      const mockObjectStore = {
        get: jest.fn().mockImplementation(() => ({
          result: { corrupted: 'data', missing: 'required fields' },
          onsuccess: null,
          onerror: null
        })),
        put: jest.fn(),
        delete: jest.fn()
      };
      
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockObjectStore)
      };
      
      const mockDB = {
        transaction: jest.fn().mockReturnValue(mockTransaction),
        close: jest.fn()
      };
      
      mockWindow.indexedDB.open.mockImplementation(() => {
        const request = {
          result: mockDB,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });
      
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Should handle corrupted metadata gracefully
      await expect(compatibilityLayer.cache('/test', { data: 'test' }))
        .resolves.not.toThrow();
    });

    it('should handle export/import data corruption', async () => {
      const compatibilityLayer = new CacheCompatibilityLayer();
      await compatibilityLayer.initialize();
      
      // Try to import corrupted data
      const corruptedData = {
        memoryCache: 'not an array',
        metadata: { invalid: 'structure' }
      };
      
      await expect(compatibilityLayer.importCacheData(corruptedData))
        .rejects.toThrow();
    });
  });
});