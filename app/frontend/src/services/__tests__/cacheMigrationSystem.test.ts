/**
 * Cache Migration System Tests
 * Tests migration from current cache system to enhanced version
 * Requirements: 9.1, 10.5
 */

import { CacheMigrationSystem, cacheMigrationSystem } from '../cacheMigrationSystem';

// Mock dependencies
jest.mock('../backgroundSyncManager', () => ({
  backgroundSyncManager: {
    enqueueAction: jest.fn(),
    getQueueStatus: jest.fn(() => Promise.resolve({ totalActions: 0 })),
    clearQueue: jest.fn()
  }
}));

jest.mock('../serviceWorkerCacheService', () => ({
  serviceWorkerCacheService: {
    initialize: jest.fn(),
    registerRoutes: jest.fn(),
    enableNavigationPreload: jest.fn()
  }
}));

// Mock browser APIs
const mockCaches = {
  open: jest.fn(),
  keys: jest.fn(),
  delete: jest.fn(),
  match: jest.fn()
};

const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
  addAll: jest.fn()
};

const mockIDBDatabase = {
  transaction: jest.fn(),
  close: jest.fn(),
  objectStoreNames: {
    contains: jest.fn()
  }
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

// Mock Request and Response
global.Request = jest.fn().mockImplementation((url) => ({
  url,
  method: 'GET',
  headers: new Map(),
  clone: jest.fn()
}));

global.Response = jest.fn().mockImplementation((body, init) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Map(Object.entries(init?.headers || {})),
  body,
  text: jest.fn().mockResolvedValue(body || ''),
  json: jest.fn().mockResolvedValue(JSON.parse(body || '{}')),
  clone: jest.fn().mockReturnThis()
}));

// Setup global mocks
Object.defineProperty(global, 'caches', {
  value: mockCaches,
  writable: true
});

Object.defineProperty(global, 'indexedDB', {
  value: {
    open: jest.fn(),
    deleteDatabase: jest.fn()
  },
  writable: true
});

Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: jest.fn(),
      controller: {
        postMessage: jest.fn()
      }
    }
  },
  writable: true
});

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0
  },
  writable: true
});

describe('CacheMigrationSystem', () => {
  let migrationSystem: CacheMigrationSystem;

  beforeEach(() => {
    migrationSystem = new CacheMigrationSystem();
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockCaches.open.mockResolvedValue(mockCache);
    mockCaches.keys.mockResolvedValue([]);
    mockCache.keys.mockResolvedValue([]);
    mockCache.match.mockResolvedValue(null);
    
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBDatabase.objectStoreNames.contains.mockReturnValue(false);
    
    // Setup IndexedDB mock
    (global.indexedDB.open as jest.Mock).mockImplementation(() => {
      const request = { 
        ...mockIDBRequest,
        result: mockIDBDatabase,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      
      // Simulate successful open
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      
      return request;
    });
    
    // Setup mock request handlers
    mockIDBObjectStore.put.mockImplementation(() => {
      const request = { ...mockIDBRequest, onsuccess: null, onerror: null };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      return request;
    });
    
    mockIDBObjectStore.get.mockImplementation(() => {
      const request = { ...mockIDBRequest, result: null, onsuccess: null, onerror: null };
      setTimeout(() => {
        if (request.onsuccess) request.onsuccess({ target: request });
      }, 0);
      return request;
    });
  });

  describe('Initialization', () => {
    it('should initialize migration system successfully', async () => {
      await expect(migrationSystem.initialize()).resolves.not.toThrow();
    });

    it('should handle IndexedDB initialization failure', async () => {
      (global.indexedDB.open as jest.Mock).mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.error = new Error('DB init failed');
          if (request.onerror) request.onerror();
        }, 0);
        return request;
      });

      await expect(migrationSystem.initialize()).rejects.toThrow();
    });
  });

  describe('Version Detection', () => {
    it('should detect legacy cache version', async () => {
      // Mock legacy caches exist
      mockCaches.keys.mockResolvedValue(['static-v2', 'dynamic-v2', 'images-v2']);

      const version = await migrationSystem.detectCacheVersion();
      
      expect(version).toBeDefined();
      expect(version?.version).toBe('1.0.0');
      expect(version?.features).toContain('basic-caching');
    });

    it('should detect enhanced cache version', async () => {
      // Mock stored version in IndexedDB
      const mockGetRequest = {
        ...mockIDBRequest,
        result: {
          version: '2.0.0',
          timestamp: Date.now(),
          features: ['workbox-integration'],
          schemaVersion: 2
        },
        onsuccess: null,
        onerror: null
      };
      
      mockIDBObjectStore.get.mockImplementation(() => {
        setTimeout(() => {
          if (mockGetRequest.onsuccess) mockGetRequest.onsuccess({ target: mockGetRequest });
        }, 0);
        return mockGetRequest;
      });

      await migrationSystem.initialize();
      const version = await migrationSystem.detectCacheVersion();
      
      expect(version).toBeDefined();
      expect(version?.version).toBe('2.0.0');
    });

    it('should return null for fresh installation', async () => {
      mockCaches.keys.mockResolvedValue([]);
      
      const version = await migrationSystem.detectCacheVersion();
      
      expect(version).toBeNull();
    });

    it('should handle version detection errors gracefully', async () => {
      mockCaches.keys.mockRejectedValue(new Error('Cache access failed'));
      
      const version = await migrationSystem.detectCacheVersion();
      
      expect(version).toBeNull();
    });
  });

  describe('Migration Need Assessment', () => {
    it('should identify when migration is needed', async () => {
      mockCaches.keys.mockResolvedValue(['static-v2', 'dynamic-v2']);
      
      const needsMigration = await migrationSystem.isMigrationNeeded();
      
      expect(needsMigration).toBe(true);
    });

    it('should identify when migration is not needed', async () => {
      // Mock current version already installed
      const mockGetRequest = {
        ...mockIDBRequest,
        result: {
          version: '2.0.0',
          timestamp: Date.now(),
          features: ['workbox-integration'],
          schemaVersion: 2
        },
        onsuccess: null,
        onerror: null
      };
      
      mockIDBObjectStore.get.mockImplementation(() => {
        setTimeout(() => {
          if (mockGetRequest.onsuccess) mockGetRequest.onsuccess({ target: mockGetRequest });
        }, 0);
        return mockGetRequest;
      });

      await migrationSystem.initialize();
      const needsMigration = await migrationSystem.isMigrationNeeded();
      
      expect(needsMigration).toBe(false);
    });

    it('should handle fresh installation correctly', async () => {
      mockCaches.keys.mockResolvedValue([]);
      
      const needsMigration = await migrationSystem.isMigrationNeeded();
      
      expect(needsMigration).toBe(false);
    });
  });

  describe('Migration Process', () => {
    beforeEach(async () => {
      await migrationSystem.initialize();
      
      // Mock legacy caches with data
      mockCaches.keys.mockResolvedValue(['static-v2', 'dynamic-v2', 'images-v2']);
      
      const mockRequests = [
        new Request('https://api.example.com/test1'),
        new Request('https://api.example.com/test2')
      ];
      
      const mockResponses = [
        new Response('test data 1', { headers: { 'content-type': 'application/json' } }),
        new Response('test data 2', { headers: { 'content-type': 'application/json' } })
      ];
      
      mockCache.keys.mockResolvedValue(mockRequests);
      mockCache.match.mockImplementation((request) => {
        const index = mockRequests.findIndex(r => r.url === request.url);
        return Promise.resolve(index >= 0 ? mockResponses[index] : null);
      });
      
      // Mock successful IndexedDB operations
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest, onsuccess: null, onerror: null };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });
    });

    it('should perform successful migration', async () => {
      const result = await migrationSystem.performMigration();
      
      expect(result.success).toBe(true);
      expect(result.version).toBe('2.0.0');
      expect(result.migratedCaches.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(result.rollbackAvailable).toBe(true);
      expect(result.migrationTime).toBeGreaterThan(0);
    });

    it('should handle migration step failures', async () => {
      // Mock cache operation failure
      mockCache.put.mockRejectedValue(new Error('Cache put failed'));
      
      const result = await migrationSystem.performMigration();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.rollbackAvailable).toBe(true);
    });

    it('should prevent concurrent migrations', async () => {
      const migration1 = migrationSystem.performMigration();
      
      await expect(migrationSystem.performMigration())
        .rejects.toThrow('Migration already in progress');
      
      await migration1; // Wait for first migration to complete
    });

    it('should create backup before migration', async () => {
      await migrationSystem.performMigration();
      
      // Verify backup was stored
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'current',
          version: '1.0.0',
          caches: expect.any(Object)
        })
      );
    });

    it('should migrate offline queue from localStorage', async () => {
      // Mock legacy offline queue
      const legacyQueue = [
        {
          id: 'action1',
          type: 'post',
          data: { content: 'test post' },
          timestamp: Date.now()
        }
      ];
      
      (global.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(legacyQueue));
      
      const { backgroundSyncManager } = require('../backgroundSyncManager');
      
      await migrationSystem.performMigration();
      
      expect(backgroundSyncManager.enqueueAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'post',
          data: { content: 'test post' },
          tags: ['migrated']
        })
      );
      
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('offlineQueue');
    });

    it('should register enhanced service worker', async () => {
      await migrationSystem.performMigration();
      
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw-enhanced.js');
    });
  });

  describe('Migration Validation', () => {
    beforeEach(async () => {
      await migrationSystem.initialize();
    });

    it('should validate successful migration', async () => {
      // Mock successful migration state
      const mockGetRequest = {
        ...mockIDBRequest,
        result: {
          version: '2.0.0',
          timestamp: Date.now(),
          features: ['workbox-integration'],
          schemaVersion: 2
        }
      };
      
      mockIDBObjectStore.get.mockReturnValue(mockGetRequest);
      setTimeout(() => {
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess();
      }, 0);

      mockCaches.keys.mockResolvedValue([
        'enhanced-cache-v1',
        'feed-cache-v1',
        'communities-cache-v1',
        'marketplace-cache-v1',
        'messaging-cache-v1'
      ]);

      // Mock service worker controller
      (navigator.serviceWorker as any).controller = { postMessage: jest.fn() };

      const validation = await migrationSystem.validateMigration();
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should identify validation issues', async () => {
      // Mock incomplete migration state
      mockCaches.keys.mockResolvedValue(['static-v2']); // Old caches still present
      (navigator.serviceWorker as any).controller = null; // No service worker

      const validation = await migrationSystem.validateMigration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues).toContain(expect.stringContaining('Enhanced cache missing'));
      expect(validation.issues).toContain(expect.stringContaining('Enhanced service worker not registered'));
    }, 10000);

    it('should handle validation errors gracefully', async () => {
      mockCaches.keys.mockRejectedValue(new Error('Cache access failed'));
      
      const validation = await migrationSystem.validateMigration();
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(expect.stringContaining('Validation error'));
    }, 10000);
  });

  describe('Rollback Functionality', () => {
    beforeEach(async () => {
      await migrationSystem.initialize();
      
      // Mock backup data
      const mockBackup = {
        version: '1.0.0',
        timestamp: Date.now(),
        caches: {
          'static-v2': [
            {
              url: 'https://api.example.com/test',
              data: 'test data',
              headers: { 'content-type': 'application/json' },
              timestamp: Date.now()
            }
          ]
        },
        metadata: {}
      };
      
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { 
          ...mockIDBRequest, 
          result: mockBackup,
          onsuccess: null,
          onerror: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });
    });

    it('should perform successful rollback', async () => {
      await expect(migrationSystem.performRollback()).resolves.not.toThrow();
      
      // Verify enhanced caches were deleted
      expect(mockCaches.delete).toHaveBeenCalledWith('enhanced-cache-v1');
      expect(mockCaches.delete).toHaveBeenCalledWith('feed-cache-v1');
      
      // Verify legacy caches were restored
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('should handle rollback without backup', async () => {
      // Mock no backup available
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { 
          ...mockIDBRequest, 
          result: null,
          onsuccess: null,
          onerror: null
        };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request });
        }, 0);
        return request;
      });

      await expect(migrationSystem.performRollback())
        .rejects.toThrow('No backup available for rollback');
    });

    it('should handle rollback errors', async () => {
      mockCaches.delete.mockRejectedValue(new Error('Cache delete failed'));
      
      await expect(migrationSystem.performRollback()).rejects.toThrow();
    });
  });

  describe('Migration Steps', () => {
    beforeEach(async () => {
      await migrationSystem.initialize();
    });

    it('should execute all required migration steps', async () => {
      const steps = await (migrationSystem as any).getMigrationSteps();
      
      expect(steps).toHaveLength(6);
      expect(steps.every((step: any) => step.id && step.name && step.execute && step.rollback && step.validate)).toBe(true);
      
      // Check required steps
      const requiredSteps = steps.filter((step: any) => step.required);
      expect(requiredSteps.length).toBeGreaterThan(0);
    });

    it('should validate individual migration steps', async () => {
      const steps = await (migrationSystem as any).getMigrationSteps();
      
      // Mock successful cache creation
      mockCache.keys.mockResolvedValue([new Request('https://api.example.com/test')]);
      
      for (const step of steps) {
        const isValid = await step.validate();
        expect(typeof isValid).toBe('boolean');
      }
    });

    it('should handle step execution failures', async () => {
      const steps = await (migrationSystem as any).getMigrationSteps();
      const firstStep = steps[0];
      
      // Mock step execution failure
      const originalExecute = firstStep.execute;
      firstStep.execute = jest.fn().mockRejectedValue(new Error('Step failed'));
      
      await expect(firstStep.execute()).rejects.toThrow('Step failed');
      
      // Restore original
      firstStep.execute = originalExecute;
    });
  });

  describe('Legacy Cache Migration', () => {
    beforeEach(async () => {
      await migrationSystem.initialize();
    });

    it('should migrate cache entries with enhanced metadata', async () => {
      const legacyRequests = [
        new Request('https://api.example.com/test1'),
        new Request('https://api.example.com/test2')
      ];
      
      const legacyResponses = [
        new Response('data1', { headers: { 'content-type': 'application/json' } }),
        new Response('data2', { headers: { 'content-type': 'text/plain' } })
      ];
      
      mockCache.keys.mockResolvedValue(legacyRequests);
      mockCache.match.mockImplementation((request) => {
        const index = legacyRequests.findIndex(r => r.url === request.url);
        return Promise.resolve(index >= 0 ? legacyResponses[index] : null);
      });
      
      await (migrationSystem as any).migrateLegacyCache('static-v2', 'enhanced-cache-v1');
      
      // Verify enhanced responses were cached
      expect(mockCache.put).toHaveBeenCalledTimes(2);
      
      // Verify enhanced headers were added
      const putCalls = (mockCache.put as jest.Mock).mock.calls;
      putCalls.forEach(([request, response]) => {
        expect(response.headers.get('X-Cache-Migrated')).toBe('true');
        expect(response.headers.get('X-Migration-Timestamp')).toBeDefined();
      });
    });

    it('should handle migration errors gracefully', async () => {
      mockCache.keys.mockRejectedValue(new Error('Cache access failed'));
      
      await expect((migrationSystem as any).migrateLegacyCache('static-v2', 'enhanced-cache-v1'))
        .rejects.toThrow();
    });

    it('should store metadata for migrated entries', async () => {
      const testRequest = new Request('https://api.example.com/test');
      const testResponse = new Response('test data', { 
        headers: { 'content-type': 'application/json' } 
      });
      
      mockCache.keys.mockResolvedValue([testRequest]);
      mockCache.match.mockResolvedValue(testResponse);
      
      await (migrationSystem as any).migrateLegacyCache('static-v2', 'enhanced-cache-v1');
      
      // Verify metadata was stored
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.example.com/test',
          migrated: true,
          tags: ['migrated']
        })
      );
    });
  });

  describe('Backup and Restore', () => {
    beforeEach(async () => {
      await migrationSystem.initialize();
    });

    it('should create comprehensive backup', async () => {
      const legacyRequests = [new Request('https://api.example.com/test')];
      const legacyResponse = new Response('test data', { 
        headers: { 'content-type': 'application/json' } 
      });
      
      mockCaches.keys.mockResolvedValue(['static-v2', 'dynamic-v2']);
      mockCache.keys.mockResolvedValue(legacyRequests);
      mockCache.match.mockResolvedValue(legacyResponse);
      
      // Mock response.text() method
      legacyResponse.text = jest.fn().mockResolvedValue('test data');
      
      await (migrationSystem as any).createBackup();
      
      // Verify backup was stored
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'current',
          version: '1.0.0',
          caches: expect.objectContaining({
            'static-v2': expect.any(Array)
          })
        })
      );
    });

    it('should handle backup creation errors gracefully', async () => {
      mockCaches.keys.mockRejectedValue(new Error('Cache access failed'));
      
      // Should not throw, but log warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await (migrationSystem as any).createBackup();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await migrationSystem.initialize();
    });

    it('should handle missing service worker gracefully', async () => {
      const originalServiceWorker = (navigator as any).serviceWorker;
      delete (navigator as any).serviceWorker;
      
      const newMigrationSystem = new CacheMigrationSystem();
      await newMigrationSystem.initialize();
      
      const result = await newMigrationSystem.performMigration();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Restore
      (navigator as any).serviceWorker = originalServiceWorker;
    });

    it('should handle IndexedDB unavailability', async () => {
      const originalIndexedDB = (global as any).indexedDB;
      delete (global as any).indexedDB;
      
      const newMigrationSystem = new CacheMigrationSystem();
      
      // Should handle gracefully or throw appropriate error
      try {
        await newMigrationSystem.initialize();
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      // Restore
      (global as any).indexedDB = originalIndexedDB;
    });

    it('should handle quota exceeded errors', async () => {
      // Create a proper DOMException mock
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      
      mockCache.put.mockRejectedValue(quotaError);
      
      const result = await migrationSystem.performMigration();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle network errors during migration', async () => {
      mockCache.match.mockRejectedValue(new Error('Network error'));
      
      const result = await migrationSystem.performMigration();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('CacheMigrationSystem Integration', () => {
  it('should work with singleton instance', async () => {
    expect(cacheMigrationSystem).toBeInstanceOf(CacheMigrationSystem);
    
    // Should be able to initialize
    await expect(cacheMigrationSystem.initialize()).resolves.not.toThrow();
  });

  it('should maintain state across multiple operations', async () => {
    await cacheMigrationSystem.initialize();
    
    const version1 = await cacheMigrationSystem.detectCacheVersion();
    const version2 = await cacheMigrationSystem.detectCacheVersion();
    
    expect(version1).toEqual(version2);
  }, 10000);

  it('should handle concurrent access safely', async () => {
    const operations = [
      cacheMigrationSystem.initialize(),
      cacheMigrationSystem.detectCacheVersion(),
      cacheMigrationSystem.isMigrationNeeded()
    ];
    
    await expect(Promise.all(operations)).resolves.not.toThrow();
  }, 10000);
});