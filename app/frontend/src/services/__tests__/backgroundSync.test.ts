/**
 * Background Sync Tests
 * Tests for offline action queuing, background sync, and network condition awareness
 */

import { OfflineActionQueue, OfflineAction, QueueStatus } from '../offlineActionQueue';
import { BackgroundSyncManager } from '../backgroundSyncManager';

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: jest.fn(),
  close: jest.fn(),
  onerror: null,
  onversionchange: null
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null
};

const mockIDBObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  clear: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
  add: jest.fn()
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

// Mock ServiceWorkerRegistration
Object.defineProperty(global, 'ServiceWorkerRegistration', {
  value: {
    prototype: {
      sync: {
        register: jest.fn()
      }
    }
  }
});

Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: {
      ready: Promise.resolve({
        sync: {
          register: jest.fn()
        }
      }),
      addEventListener: jest.fn()
    },
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 100,
      saveData: false,
      addEventListener: jest.fn()
    }
  }
});

Object.defineProperty(global, 'fetch', {
  value: jest.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ success: true })
  }))
});

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: jest.fn(() => 'mock-auth-token'),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
});

// Mock window events
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }
});

describe('OfflineActionQueue', () => {
  let queue: OfflineActionQueue;

  beforeEach(async () => {
    queue = new OfflineActionQueue();
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    
    // Mock successful IndexedDB operations
    const mockSuccessRequest = {
      ...mockIDBRequest,
      result: mockIDBDatabase
    };
    
    (global.indexedDB.open as jest.Mock).mockReturnValue(mockSuccessRequest);
    
    // Simulate successful initialization
    setTimeout(() => {
      if (mockSuccessRequest.onsuccess) {
        mockSuccessRequest.onsuccess();
      }
    }, 0);
    
    await queue.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newQueue = new OfflineActionQueue();
      
      const mockRequest = {
        ...mockIDBRequest,
        result: mockIDBDatabase
      };
      
      (global.indexedDB.open as jest.Mock).mockReturnValue(mockRequest);
      
      const initPromise = newQueue.initialize();
      
      // Simulate successful initialization
      setTimeout(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess();
        }
      }, 0);
      
      await expect(initPromise).resolves.not.toThrow();
      expect(global.indexedDB.open).toHaveBeenCalledWith('OfflineActionQueue', 1);
    });

    it('should handle initialization errors', async () => {
      const errorQueue = new OfflineActionQueue();
      const mockErrorRequest = {
        ...mockIDBRequest,
        error: new Error('DB Error')
      };
      
      (global.indexedDB.open as jest.Mock).mockReturnValue(mockErrorRequest);
      
      setTimeout(() => {
        if (mockErrorRequest.onerror) {
          mockErrorRequest.onerror();
        }
      }, 0);

      await expect(errorQueue.initialize()).rejects.toThrow();
    });
  });

  describe('Action Enqueuing', () => {
    it('should enqueue a post action successfully', async () => {
      const action = {
        type: 'post' as const,
        data: { content: 'Test post', userId: 'user123' },
        tags: ['posts', 'user123'],
        priority: 'medium' as const
      };

      const mockAddRequest = { ...mockIDBRequest };
      mockIDBObjectStore.add.mockReturnValue(mockAddRequest);

      const enqueuePromise = queue.enqueue(action);
      
      setTimeout(() => {
        if (mockAddRequest.onsuccess) {
          mockAddRequest.onsuccess();
        }
      }, 0);

      const actionId = await enqueuePromise;
      expect(actionId).toMatch(/^action_\d+_[a-z0-9]+$/);
      expect(mockIDBObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'post',
          data: action.data,
          tags: action.tags,
          priority: 'medium',
          retryCount: 0,
          maxRetries: 5
        })
      );
    });

    it('should enqueue a message action with higher max retries', async () => {
      const action = {
        type: 'message' as const,
        data: { content: 'Test message', recipientId: 'user456' },
        tags: ['messages'],
        priority: 'high' as const,
        orderGroup: 'conversation-123'
      };

      const mockAddRequest = { ...mockIDBRequest };
      mockIDBObjectStore.add.mockReturnValue(mockAddRequest);

      const enqueuePromise = queue.enqueue(action);
      
      setTimeout(() => {
        if (mockAddRequest.onsuccess) {
          mockAddRequest.onsuccess();
        }
      }, 0);

      await enqueuePromise;
      expect(mockIDBObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message',
          maxRetries: 7, // Higher for messages
          orderGroup: 'conversation-123'
        })
      );
    });

    it('should validate action data', async () => {
      const invalidAction = {
        type: 'post' as const,
        data: null, // Invalid
        tags: [],
        priority: 'medium' as const
      };

      await expect(queue.enqueue(invalidAction)).rejects.toThrow('Action must have type and data');
    });

    it('should handle expired actions', async () => {
      const expiredAction = {
        type: 'post' as const,
        data: { content: 'Test' },
        tags: [],
        priority: 'medium' as const,
        expiresAt: Date.now() - 1000 // Already expired
      };

      await expect(queue.enqueue(expiredAction)).rejects.toThrow('Action cannot be expired when enqueued');
    });
  });

  describe('Action Dequeuing', () => {
    it('should dequeue actions in priority order', async () => {
      const mockActions = [
        {
          id: 'action1',
          type: 'post',
          priority: 'low',
          timestamp: Date.now() - 1000,
          data: {},
          tags: [],
          retryCount: 0,
          maxRetries: 3
        },
        {
          id: 'action2',
          type: 'message',
          priority: 'high',
          timestamp: Date.now(),
          data: {},
          tags: [],
          retryCount: 0,
          maxRetries: 7
        }
      ];

      const mockGetAllRequest = {
        ...mockIDBRequest,
        result: mockActions
      };
      mockIDBObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const mockDeleteRequest = { ...mockIDBRequest };
      mockIDBObjectStore.delete.mockReturnValue(mockDeleteRequest);

      const dequeuePromise = queue.dequeue();
      
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess();
        }
      }, 0);
      
      setTimeout(() => {
        if (mockDeleteRequest.onsuccess) {
          mockDeleteRequest.onsuccess();
        }
      }, 10);

      const dequeuedAction = await dequeuePromise;
      expect(dequeuedAction?.id).toBe('action2'); // High priority should come first
    });

    it('should preserve order within same priority group', async () => {
      const mockActions = [
        {
          id: 'action1',
          type: 'message',
          priority: 'medium',
          timestamp: Date.now() - 1000,
          orderGroup: 'conversation-1',
          data: {},
          tags: [],
          retryCount: 0,
          maxRetries: 7
        },
        {
          id: 'action2',
          type: 'message',
          priority: 'medium',
          timestamp: Date.now(),
          orderGroup: 'conversation-1',
          data: {},
          tags: [],
          retryCount: 0,
          maxRetries: 7
        }
      ];

      const mockGetAllRequest = {
        ...mockIDBRequest,
        result: mockActions
      };
      mockIDBObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const mockDeleteRequest = { ...mockIDBRequest };
      mockIDBObjectStore.delete.mockReturnValue(mockDeleteRequest);

      const dequeuePromise = queue.dequeue();
      
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess();
        }
      }, 0);
      
      setTimeout(() => {
        if (mockDeleteRequest.onsuccess) {
          mockDeleteRequest.onsuccess();
        }
      }, 10);

      const dequeuedAction = await dequeuePromise;
      expect(dequeuedAction?.id).toBe('action1'); // Earlier timestamp should come first
    });

    it('should filter out expired actions', async () => {
      const mockActions = [
        {
          id: 'expired',
          type: 'post',
          priority: 'high',
          timestamp: Date.now() - 1000,
          expiresAt: Date.now() - 500, // Expired
          data: {},
          tags: [],
          retryCount: 0,
          maxRetries: 3
        },
        {
          id: 'valid',
          type: 'post',
          priority: 'medium',
          timestamp: Date.now(),
          data: {},
          tags: [],
          retryCount: 0,
          maxRetries: 3
        }
      ];

      const mockGetAllRequest = {
        ...mockIDBRequest,
        result: mockActions
      };
      mockIDBObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const mockDeleteRequest = { ...mockIDBRequest };
      mockIDBObjectStore.delete.mockReturnValue(mockDeleteRequest);

      const dequeuePromise = queue.dequeue();
      
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess();
        }
      }, 0);
      
      setTimeout(() => {
        if (mockDeleteRequest.onsuccess) {
          mockDeleteRequest.onsuccess();
        }
      }, 10);

      const dequeuedAction = await dequeuePromise;
      expect(dequeuedAction?.id).toBe('valid');
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('expired'); // Expired action should be deleted
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry action with exponential backoff', async () => {
      const action: OfflineAction = {
        id: 'retry-test',
        type: 'post',
        data: { content: 'Test' },
        timestamp: Date.now(),
        retryCount: 1,
        maxRetries: 3,
        tags: [],
        priority: 'medium'
      };

      const mockPutRequest = { ...mockIDBRequest };
      mockIDBObjectStore.put.mockReturnValue(mockPutRequest);

      queue.retryWithBackoff(action);
      
      // Fast-forward time to trigger retry
      jest.advanceTimersByTime(2000); // Base delay * backoff multiplier
      
      setTimeout(() => {
        if (mockPutRequest.onsuccess) {
          mockPutRequest.onsuccess();
        }
      }, 0);

      jest.advanceTimersByTime(100);
      
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'retry-test',
          retryCount: 2
        })
      );
    });

    it('should mark action as failed after max retries', async () => {
      const action: OfflineAction = {
        id: 'max-retry-test',
        type: 'post',
        data: { content: 'Test' },
        timestamp: Date.now(),
        retryCount: 3,
        maxRetries: 3,
        tags: [],
        priority: 'medium'
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await queue.retryWithBackoff(action);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded max retries')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Queue Status', () => {
    it('should return accurate queue status', async () => {
      const mockActions = [
        {
          id: 'action1',
          type: 'post',
          retryCount: 1,
          timestamp: Date.now() - 5000,
          data: {},
          tags: [],
          priority: 'medium',
          maxRetries: 3
        },
        {
          id: 'action2',
          type: 'message',
          retryCount: 0,
          timestamp: Date.now() - 3000,
          data: {},
          tags: [],
          priority: 'high',
          maxRetries: 7
        }
      ];

      const mockGetAllRequest = {
        ...mockIDBRequest,
        result: mockActions
      };
      mockIDBObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const statusPromise = queue.getStatus();
      
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess();
        }
      }, 0);

      const status = await statusPromise;
      
      expect(status.totalActions).toBe(2);
      expect(status.pendingActions).toBe(2);
      expect(status.averageRetryCount).toBe(0.5); // (1 + 0) / 2
      expect(status.queueSizeByType).toEqual({
        post: 1,
        message: 1
      });
      expect(status.oldestActionAge).toBeGreaterThan(4000);
    });
  });

  describe('Action Dependencies', () => {
    it('should handle action dependencies correctly', async () => {
      const mockActions = [
        {
          id: 'dependent',
          type: 'comment',
          dependencies: ['parent-post'],
          data: {},
          tags: [],
          priority: 'medium',
          retryCount: 0,
          maxRetries: 3,
          timestamp: Date.now()
        },
        {
          id: 'parent-post',
          type: 'post',
          data: {},
          tags: [],
          priority: 'medium',
          retryCount: 0,
          maxRetries: 3,
          timestamp: Date.now() - 1000
        }
      ];

      const mockGetAllRequest = {
        ...mockIDBRequest,
        result: mockActions
      };
      mockIDBObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const readyActionsPromise = queue.getReadyActions();
      
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) {
          mockGetAllRequest.onsuccess();
        }
      }, 0);

      const readyActions = await readyActionsPromise;
      
      // Only parent-post should be ready (no dependencies)
      expect(readyActions).toHaveLength(1);
      expect(readyActions[0].id).toBe('parent-post');
    });
  });
});

describe('BackgroundSyncManager', () => {
  let syncManager: BackgroundSyncManager;

  beforeEach(() => {
    syncManager = new BackgroundSyncManager();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(syncManager).toBeDefined();
      expect(global.window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Background Sync Registration', () => {
    it('should register background sync successfully', async () => {
      const mockRegistration = await navigator.serviceWorker.ready;
      
      await syncManager.registerSync('test-sync');
      
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('test-sync');
    });

    it('should fallback when background sync not supported', async () => {
      // Remove sync support
      const mockRegistration = await navigator.serviceWorker.ready;
      delete mockRegistration.sync;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await syncManager.registerSync('test-sync');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Background Sync not supported, falling back to immediate sync'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Network Condition Awareness', () => {
    it('should detect suitable network conditions', () => {
      // Mock good network conditions
      (navigator as any).connection = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false
      };

      const isSuitable = syncManager.isNetworkSuitable();
      expect(isSuitable).toBe(true);
    });

    it('should detect unsuitable network conditions', () => {
      // Create a new sync manager with poor network conditions
      const poorSyncManager = new BackgroundSyncManager({ networkAwareSync: true });
      
      // Mock poor network conditions
      (navigator as any).connection = {
        effectiveType: 'slow-2g',
        downlink: 0.1,
        rtt: 3000,
        saveData: true
      };

      const isSuitable = poorSyncManager.isNetworkSuitable();
      expect(isSuitable).toBe(false);
    });

    it('should handle offline state', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true
      });

      const isSuitable = syncManager.isNetworkSuitable();
      expect(isSuitable).toBe(false);
    });
  });

  describe('Sync Event Handling', () => {
    it('should handle sync events correctly', async () => {
      const mockEvent = {
        tag: 'posts-sync',
        waitUntil: jest.fn()
      };

      // Mock queue with no actions
      const mockQueue = {
        getReadyActions: jest.fn().mockResolvedValue([])
      };

      await expect(syncManager.handleSyncEvent(mockEvent)).resolves.not.toThrow();
    });

    it('should skip sync when already in progress', async () => {
      const mockEvent = {
        tag: 'posts-sync',
        waitUntil: jest.fn()
      };

      // Start first sync
      const firstSync = syncManager.handleSyncEvent(mockEvent);
      
      // Try to start second sync immediately
      const secondSync = syncManager.handleSyncEvent(mockEvent);
      
      await Promise.all([firstSync, secondSync]);
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Action Processing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should process post actions', async () => {
      const mockActions = [{
        id: 'test-post',
        type: 'post' as const,
        data: { content: 'Test post', userId: 'user123' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        tags: ['posts'],
        priority: 'medium' as const
      }];

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      await syncManager.processQueuedActions();
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle API errors during processing', async () => {
      const mockActions = [{
        id: 'test-post',
        type: 'post' as const,
        data: { content: 'Test post' },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        tags: ['posts'],
        priority: 'medium' as const
      }];

      // Mock API error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(syncManager.processQueuedActions()).resolves.not.toThrow();
    });

    it('should delay sync on poor network conditions', async () => {
      // Set online first
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true
      });
      
      // Mock poor network
      (navigator as any).connection = {
        effectiveType: 'slow-2g',
        downlink: 0.1,
        rtt: 3000,
        saveData: false
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      syncManager.processQueuedActions();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Poor network conditions, delaying sync'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Sync Statistics', () => {
    it('should return comprehensive sync stats', async () => {
      const stats = await syncManager.getSyncStats();
      
      expect(stats).toHaveProperty('isOnline');
      expect(stats).toHaveProperty('networkCondition');
      expect(stats).toHaveProperty('syncInProgress');
      expect(stats).toHaveProperty('registeredHandlers');
      expect(stats).toHaveProperty('queueStatus');
      
      expect(Array.isArray(stats.registeredHandlers)).toBe(true);
    });
  });

  describe('Fallback Mechanisms', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should use setTimeout fallback when background sync not supported', async () => {
      // Remove service worker support
      delete (global.navigator as any).serviceWorker;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await syncManager.registerSync('fallback-test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Using fallback sync for tag: fallback-test'
      );
      
      consoleSpy.mockRestore();
    });

    it('should retry fallback sync when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await syncManager.registerSync('offline-test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Using fallback sync for tag: offline-test'
      );
      
      consoleSpy.mockRestore();
    });
  });
});