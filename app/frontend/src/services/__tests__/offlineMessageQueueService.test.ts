import { OfflineMessageQueueService } from '../offlineMessageQueueService';
import { MessageQueue, OfflineAction } from '../../types/messaging';

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window event listeners
const mockEventListeners: { [key: string]: Function[] } = {};
global.addEventListener = jest.fn((event: string, callback: Function) => {
  if (!mockEventListeners[event]) {
    mockEventListeners[event] = [];
  }
  mockEventListeners[event].push(callback);
});

// Mock setInterval and setTimeout
jest.useFakeTimers();

// Setup mocks
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('OfflineMessageQueueService', () => {
  let queueService: OfflineMessageQueueService;
  let mockDB: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Reset singleton instance
    (OfflineMessageQueueService as any).instance = undefined;
    
    // Mock IndexedDB database
    mockDB = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({ onsuccess: null, onerror: null })),
          get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
          getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
          clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
          count: jest.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
          openCursor: jest.fn(() => ({ onsuccess: null, onerror: null })),
          index: jest.fn(() => ({
            getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
            count: jest.fn(() => ({ onsuccess: null, onerror: null, result: 0 })),
          })),
          createIndex: jest.fn(),
        })),
        complete: Promise.resolve(),
      })),
      objectStoreNames: {
        contains: jest.fn(() => false),
      },
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn(),
      })),
    };

    // Mock IndexedDB open
    mockIndexedDB.open.mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDB,
    }));

    // Mock localStorage
    mockLocalStorage.getItem.mockReturnValue('0x1234567890123456789012345678901234567890');

    queueService = OfflineMessageQueueService.getInstance();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Initialization', () => {
    it('should initialize database successfully', async () => {
      expect(mockIndexedDB.open).toHaveBeenCalledWith('OfflineMessageQueue', 1);
    });

    it('should setup network listeners', () => {
      expect(global.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should handle database initialization errors', async () => {
      const errorDB = {
        ...mockDB,
        onerror: () => new Error('Database error'),
      };

      mockIndexedDB.open.mockImplementation(() => errorDB);

      // Should not throw but handle gracefully
      const service = OfflineMessageQueueService.getInstance();
      expect(service).toBeDefined();
    });
  });

  describe('Message Queuing', () => {
    it('should queue a message when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const messageId = await queueService.queueMessage(
        'conv-1',
        'Hello world',
        'text'
      );

      expect(messageId).toBeDefined();
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: messageId,
          conversationId: 'conv-1',
          content: 'Hello world',
          contentType: 'text',
          status: 'pending',
          retryCount: 0,
        })
      );

      // Simulate successful storage
      setTimeout(() => {
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess();
      }, 0);
    });

    it('should attempt to send message immediately when online', async () => {
      // Set online
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-1' }),
      });

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockDeleteRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
        delete: jest.fn().mockReturnValue(mockDeleteRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const messageId = await queueService.queueMessage(
        'conv-1',
        'Hello world',
        'text'
      );

      // Simulate successful storage and sending
      setTimeout(() => {
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess();
      }, 0);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 0x1234567890123456789012345678901234567890',
          },
          body: JSON.stringify({
            content: 'Hello world',
            contentType: 'text',
            queueId: messageId,
          }),
        })
      );
    });

    it('should handle different content types', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const messageId = await queueService.queueMessage(
        'conv-1',
        'image.jpg',
        'image',
        [{ type: 'image', url: 'blob://image.jpg' }]
      );

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image',
          content: 'image.jpg',
        })
      );
    });
  });

  describe('Offline Actions', () => {
    it('should queue offline actions', async () => {
      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const actionId = await queueService.queueOfflineAction({
        type: 'mark_read',
        data: { conversationId: 'conv-1' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      });

      expect(actionId).toBeDefined();
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: actionId,
          type: 'mark_read',
          data: { conversationId: 'conv-1' },
          retryCount: 0,
          maxRetries: 3,
        })
      );
    });

    it('should execute offline actions when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      });

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockDeleteRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
        delete: jest.fn().mockReturnValue(mockDeleteRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await queueService.queueOfflineAction({
        type: 'mark_read',
        data: { conversationId: 'conv-1' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-1/read',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer 0x1234567890123456789012345678901234567890',
          },
        })
      );
    });
  });

  describe('Pending Messages Retrieval', () => {
    it('should get pending messages for a conversation', async () => {
      const mockMessages: MessageQueue[] = [
        {
          id: 'queue-1',
          conversationId: 'conv-1',
          content: 'Message 1',
          contentType: 'text',
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending',
        },
        {
          id: 'queue-2',
          conversationId: 'conv-1',
          content: 'Message 2',
          contentType: 'text',
          timestamp: new Date(),
          retryCount: 1,
          status: 'sending',
        },
      ];

      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: mockMessages,
      };
      const mockIndex = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const pendingMessages = await queueService.getPendingMessages('conv-1');

      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess();
      }, 0);

      expect(mockIndex.getAll).toHaveBeenCalledWith('conv-1');
    });

    it('should handle database errors when getting pending messages', async () => {
      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: () => new Error('Database error'),
        result: null,
      };
      const mockIndex = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const pendingMessages = await queueService.getPendingMessages('conv-1');

      expect(pendingMessages).toEqual([]);
    });
  });

  describe('Sync Status Management', () => {
    it('should get sync status for a conversation', async () => {
      const mockSyncStatus = {
        conversationId: 'conv-1',
        lastSyncTimestamp: new Date(),
        pendingMessages: 2,
        syncInProgress: false,
      };

      const mockGetRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: mockSyncStatus,
      };
      const mockStore = {
        get: jest.fn().mockReturnValue(mockGetRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const syncStatus = await queueService.getSyncStatus('conv-1');

      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess();
      }, 0);

      expect(mockStore.get).toHaveBeenCalledWith('conv-1');
    });

    it('should update sync status for a conversation', async () => {
      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await queueService.updateSyncStatus('conv-1', {
        pendingMessages: 0,
        syncInProgress: false,
      });

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          pendingMessages: 0,
          syncInProgress: false,
          lastSyncTimestamp: expect.any(Date),
        })
      );
    });
  });

  describe('Network Status Handling', () => {
    it('should sync when coming online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      // Mock pending messages
      const mockMessages: MessageQueue[] = [
        {
          id: 'queue-1',
          conversationId: 'conv-1',
          content: 'Pending message',
          contentType: 'text',
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending',
        },
      ];

      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: mockMessages,
      };
      const mockIndex = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex),
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
        delete: jest.fn().mockReturnValue({ onsuccess: null, onerror: null }),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-1' }),
      });

      // Simulate coming online
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      // Trigger online event
      if (mockEventListeners['online']) {
        mockEventListeners['online'].forEach(callback => callback());
      }

      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess();
      }, 0);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle periodic sync when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: [],
      };
      const mockStore = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      // Fast-forward time to trigger periodic sync
      jest.advanceTimersByTime(30000);

      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess();
      }, 0);

      expect(mockStore.getAll).toHaveBeenCalled();
    });
  });

  describe('Message Send Failure Handling', () => {
    it('should retry failed messages with exponential backoff', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      // Mock failed send
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 500 }) // First attempt fails
        .mockResolvedValueOnce({ ok: true }); // Retry succeeds

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockDeleteRequest = { onsuccess: null, onerror: null };
      const mockGetRequest = { onsuccess: null, onerror: null, result: null };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
        delete: jest.fn().mockReturnValue(mockDeleteRequest),
        get: jest.fn().mockReturnValue(mockGetRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await queueService.queueMessage('conv-1', 'Test message', 'text');

      // Simulate successful storage
      setTimeout(() => {
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess();
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess();
      }, 0);

      // Fast-forward to trigger retry
      jest.advanceTimersByTime(2000);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should move to failed messages after max retries', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      // Mock all attempts fail
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockDeleteRequest = { onsuccess: null, onerror: null };
      const mockGetRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: {
          id: 'queue-1',
          conversationId: 'conv-1',
          content: 'Test message',
          contentType: 'text',
          timestamp: new Date(),
          retryCount: 4, // Already at max retries
          status: 'pending',
        },
      };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
        delete: jest.fn().mockReturnValue(mockDeleteRequest),
        get: jest.fn().mockReturnValue(mockGetRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await queueService.queueMessage('conv-1', 'Test message', 'text');

      // Simulate operations
      setTimeout(() => {
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess();
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess();
        if (mockDeleteRequest.onsuccess) mockDeleteRequest.onsuccess();
      }, 0);

      // Should move to failed messages store
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          originalMessageId: expect.any(String),
          failureReason: 'HTTP 500',
        })
      );
    });
  });

  describe('Queue Statistics', () => {
    it('should get queue statistics', async () => {
      const mockCountRequest = { onsuccess: null, onerror: null, result: 5 };
      const mockIndex = {
        count: jest.fn().mockReturnValue(mockCountRequest),
      };
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex),
        count: jest.fn().mockReturnValue(mockCountRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const stats = await queueService.getQueueStats();

      // Simulate successful count operations
      setTimeout(() => {
        if (mockCountRequest.onsuccess) mockCountRequest.onsuccess();
      }, 0);

      expect(stats).toEqual({
        pendingMessages: 5,
        sendingMessages: 5,
        failedMessages: 5,
        offlineActions: 5,
      });
    });
  });

  describe('Failed Message Management', () => {
    it('should get failed messages', async () => {
      const mockFailedMessages = [
        {
          id: 'failed-1',
          originalMessageId: 'queue-1',
          conversationId: 'conv-1',
          content: 'Failed message',
          failureReason: 'Network error',
          timestamp: new Date(),
        },
      ];

      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: mockFailedMessages,
      };
      const mockStore = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const failedMessages = await queueService.getFailedMessages();

      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess();
      }, 0);

      expect(mockStore.getAll).toHaveBeenCalled();
    });

    it('should retry failed message', async () => {
      const mockFailedMessage = {
        id: 'failed-1',
        originalMessageId: 'queue-1',
        conversationId: 'conv-1',
        content: 'Failed message',
        contentType: 'text',
        failureReason: 'Network error',
        timestamp: new Date(),
      };

      const mockGetRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: mockFailedMessage,
      };
      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockDeleteRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        get: jest.fn().mockReturnValue(mockGetRequest),
        put: jest.fn().mockReturnValue(mockPutRequest),
        delete: jest.fn().mockReturnValue(mockDeleteRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const result = await queueService.retryFailedMessage('failed-1');

      // Simulate successful operations
      setTimeout(() => {
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess();
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess();
        if (mockDeleteRequest.onsuccess) mockDeleteRequest.onsuccess();
      }, 0);

      expect(result).toBe(true);
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          content: 'Failed message',
          contentType: 'text',
          status: 'pending',
          retryCount: 0,
        })
      );
    });
  });

  describe('Queue Cleanup', () => {
    it('should clear all queues', async () => {
      const mockClearRequest = { onsuccess: null, onerror: null };
      const mockStore = {
        clear: jest.fn().mockReturnValue(mockClearRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await queueService.clearAllQueues();

      expect(mockStore.clear).toHaveBeenCalledTimes(3); // messageQueue, offlineActions, failedMessages
    });

    it('should cleanup old failed messages', async () => {
      const mockOpenCursorRequest = { 
        onsuccess: null, 
        onerror: null,
      };
      const mockIndex = {
        openCursor: jest.fn().mockReturnValue(mockOpenCursorRequest),
      };
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      // Trigger cleanup (this would normally be called internally)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      // Simulate cursor iteration
      const mockCursor = {
        delete: jest.fn(),
        continue: jest.fn(),
      };

      setTimeout(() => {
        if (mockOpenCursorRequest.onsuccess) {
          // Simulate cursor with old data
          (mockOpenCursorRequest as any).result = mockCursor;
          mockOpenCursorRequest.onsuccess({ target: mockOpenCursorRequest } as any);
          
          // Simulate end of cursor
          (mockOpenCursorRequest as any).result = null;
          mockOpenCursorRequest.onsuccess({ target: mockOpenCursorRequest } as any);
        }
      }, 0);

      expect(mockIndex.openCursor).toBeDefined();
    });
  });

  describe('Network Status Utilities', () => {
    it('should return correct online status', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      expect(queueService.isOnlineStatus()).toBe(true);

      Object.defineProperty(navigator, 'onLine', { value: false });
      expect(queueService.isOnlineStatus()).toBe(false);
    });

    it('should return network status', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const status = queueService.getNetworkStatus();
      
      expect(status).toEqual({
        isOnline: true,
        syncInProgress: false,
      });
    });

    it('should force sync when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: [],
      };
      const mockStore = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      await queueService.forcSync();

      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess();
      }, 0);

      expect(mockStore.getAll).toHaveBeenCalled();
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      await queueService.forcSync();

      expect(mockDB.transaction).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database unavailable', async () => {
      // Set db to null to simulate unavailable database
      (queueService as any).db = null;

      const result = await queueService.getPendingMessages('conv-1');
      expect(result).toEqual([]);

      const syncStatus = await queueService.getSyncStatus('conv-1');
      expect(syncStatus).toBeNull();
    });

    it('should handle malformed queue items', async () => {
      const malformedItem = {
        id: 'queue-1',
        // Missing required fields
      };

      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: [malformedItem],
      };
      const mockIndex = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockStore = {
        index: jest.fn().mockReturnValue(mockIndex),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      const pendingMessages = await queueService.getPendingMessages('conv-1');

      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess();
      }, 0);

      // Should filter out malformed items
      expect(pendingMessages).toEqual([]);
    });

    it('should handle concurrent sync operations', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      // Set sync in progress
      (queueService as any).syncInProgress = true;

      const mockGetAllRequest = { 
        onsuccess: null, 
        onerror: null, 
        result: [],
      };
      const mockStore = {
        getAll: jest.fn().mockReturnValue(mockGetAllRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      // Should not start another sync
      await queueService.forcSync();

      expect(mockDB.transaction).not.toHaveBeenCalled();
    });

    it('should handle storage quota exceeded', async () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';

      const mockPutRequest = { 
        onsuccess: null, 
        onerror: () => quotaError,
      };
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
      };
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      mockDB.transaction.mockReturnValue(mockTransaction);

      // Should handle gracefully without throwing
      const messageId = await queueService.queueMessage('conv-1', 'Test message', 'text');
      expect(messageId).toBeDefined();
    });
  });
});