/**
 * Comprehensive Offline Support and Action Queue Tests
 * Tests offline functionality, action queuing, and synchronization
 */

import { ActionQueueService, actionQueue } from '../actionQueueService';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Offline Support and Action Queue Tests', () => {
  let testActionQueue: ActionQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockReturnValue(null);
    navigator.onLine = true;

    // Create fresh action queue for each test
    testActionQueue = new ActionQueueService({
      maxQueueSize: 10,
      persistToStorage: true,
      autoSync: false, // Disable auto-sync for controlled testing
      syncInterval: 1000,
    });
  });

  afterEach(() => {
    testActionQueue.destroy();
    jest.clearAllTimers();
  });

  describe('Action Queue Basic Operations', () => {
    it('should add actions to queue with proper metadata', () => {
      const actionId = testActionQueue.addAction('post', {
        content: 'Test post content',
        communityId: 'test-community',
      }, {
        priority: 'high',
        maxRetries: 5,
        userId: 'user-123',
      });

      expect(actionId).toBeTruthy();
      expect(testActionQueue.getQueueSize()).toBe(1);

      const queue = testActionQueue.getQueue();
      const action = queue[0];

      expect(action.type).toBe('post');
      expect(action.data.content).toBe('Test post content');
      expect(action.priority).toBe('high');
      expect(action.maxRetries).toBe(5);
      expect(action.userId).toBe('user-123');
      expect(action.retryCount).toBe(0);
      expect(action.timestamp).toBeInstanceOf(Date);
    });

    it('should prioritize actions correctly in queue', () => {
      // Add actions with different priorities
      testActionQueue.addAction('post', { content: 'Low priority' }, { priority: 'low' });
      testActionQueue.addAction('comment', { content: 'High priority' }, { priority: 'high' });
      testActionQueue.addAction('like', { postId: 'test' }, { priority: 'medium' });

      const queue = testActionQueue.getQueue();
      
      // Should be ordered: high, medium, low
      expect(queue[0].priority).toBe('high');
      expect(queue[0].type).toBe('comment');
      expect(queue[1].priority).toBe('medium');
      expect(queue[1].type).toBe('like');
      expect(queue[2].priority).toBe('low');
      expect(queue[2].type).toBe('post');
    });

    it('should remove actions from queue', () => {
      const actionId = testActionQueue.addAction('post', { content: 'Test' });
      expect(testActionQueue.getQueueSize()).toBe(1);

      const removed = testActionQueue.removeAction(actionId);
      expect(removed).toBe(true);
      expect(testActionQueue.getQueueSize()).toBe(0);

      // Removing non-existent action should return false
      const notRemoved = testActionQueue.removeAction('non-existent');
      expect(notRemoved).toBe(false);
    });

    it('should clear entire queue', () => {
      testActionQueue.addAction('post', { content: 'Test 1' });
      testActionQueue.addAction('comment', { content: 'Test 2' });
      testActionQueue.addAction('like', { postId: 'test' });

      expect(testActionQueue.getQueueSize()).toBe(3);

      testActionQueue.clearQueue();
      expect(testActionQueue.getQueueSize()).toBe(0);
    });

    it('should enforce maximum queue size', () => {
      const smallQueue = new ActionQueueService({ maxQueueSize: 2 });

      // Add actions up to limit
      smallQueue.addAction('post', { content: 'Test 1' }, { priority: 'low' });
      smallQueue.addAction('comment', { content: 'Test 2' }, { priority: 'low' });

      expect(smallQueue.getQueueSize()).toBe(2);

      // Adding another should remove oldest low-priority item
      smallQueue.addAction('like', { postId: 'test' }, { priority: 'medium' });
      expect(smallQueue.getQueueSize()).toBe(2);

      const queue = smallQueue.getQueue();
      expect(queue.some(action => action.type === 'post')).toBe(false); // Should be removed
      expect(queue.some(action => action.type === 'like')).toBe(true); // Should be added

      smallQueue.destroy();
    });

    it('should throw error when queue is full with no low-priority items', () => {
      const smallQueue = new ActionQueueService({ maxQueueSize: 2 });

      smallQueue.addAction('post', { content: 'Test 1' }, { priority: 'high' });
      smallQueue.addAction('comment', { content: 'Test 2' }, { priority: 'high' });

      expect(() => {
        smallQueue.addAction('like', { postId: 'test' }, { priority: 'medium' });
      }).toThrow('Action queue is full');

      smallQueue.destroy();
    });
  });

  describe('Persistence and Storage', () => {
    it('should save queue to localStorage when persistence is enabled', () => {
      testActionQueue.addAction('post', { content: 'Test post' });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'actionQueue',
        expect.stringContaining('"type":"post"')
      );
    });

    it('should load queue from localStorage on initialization', () => {
      const storedQueue = JSON.stringify([
        {
          id: 'test-id',
          type: 'post',
          data: { content: 'Stored post' },
          timestamp: new Date().toISOString(),
          retryCount: 0,
          maxRetries: 3,
          priority: 'medium',
        },
      ]);

      mockLocalStorage.getItem.mockReturnValue(storedQueue);

      const newQueue = new ActionQueueService({ persistToStorage: true });
      expect(newQueue.getQueueSize()).toBe(1);

      const queue = newQueue.getQueue();
      expect(queue[0].type).toBe('post');
      expect(queue[0].data.content).toBe('Stored post');

      newQueue.destroy();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      // Should not throw and should start with empty queue
      const newQueue = new ActionQueueService({ persistToStorage: true });
      expect(newQueue.getQueueSize()).toBe(0);

      newQueue.destroy();
    });

    it('should not use localStorage when persistence is disabled', () => {
      const noPersistQueue = new ActionQueueService({ persistToStorage: false });
      noPersistQueue.addAction('post', { content: 'Test' });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      noPersistQueue.destroy();
    });
  });

  describe('Action Processing and Synchronization', () => {
    it('should process queued actions when online', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      testActionQueue.addAction('post', { content: 'Test post', communityId: 'test' });
      testActionQueue.addAction('comment', { content: 'Test comment', postId: 'post-123' });

      expect(testActionQueue.getQueueSize()).toBe(2);

      await testActionQueue.processQueue();

      expect(testActionQueue.getQueueSize()).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Check that correct endpoints were called
      expect(mockFetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test post', communityId: 'test' }),
      }));

      expect(mockFetch).toHaveBeenCalledWith('/api/comments', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test comment', postId: 'post-123' }),
      }));
    });

    it('should retry failed actions up to maxRetries', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({ ok: true });
      });

      testActionQueue.addAction('post', { content: 'Test' }, { maxRetries: 3 });

      await testActionQueue.processQueue();
      await testActionQueue.processQueue(); // Second attempt
      await testActionQueue.processQueue(); // Third attempt (should succeed)

      expect(testActionQueue.getQueueSize()).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should remove actions that exceed maxRetries', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      testActionQueue.addAction('post', { content: 'Test' }, { maxRetries: 2 });

      // Process 3 times (initial + 2 retries)
      await testActionQueue.processQueue();
      await testActionQueue.processQueue();
      await testActionQueue.processQueue();

      expect(testActionQueue.getQueueSize()).toBe(0); // Should be removed after max retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not process queue when offline', async () => {
      navigator.onLine = false;

      testActionQueue.addAction('post', { content: 'Test' });
      await testActionQueue.processQueue();

      expect(testActionQueue.getQueueSize()).toBe(1); // Should remain in queue
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle different action types correctly', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      // Add various action types
      testActionQueue.addAction('community_join', { communityId: 'test-community' });
      testActionQueue.addAction('community_create', { name: 'New Community', description: 'Test' });
      testActionQueue.addAction('product_create', { title: 'Test Product', price: 100 });
      testActionQueue.addAction('like', { postId: 'post-123' });
      testActionQueue.addAction('follow', { userId: 'user-456' });

      await testActionQueue.processQueue();

      expect(mockFetch).toHaveBeenCalledTimes(5);

      // Verify correct endpoints were called
      const calls = mockFetch.mock.calls;
      expect(calls.some(call => call[0] === '/api/communities/test-community/join')).toBe(true);
      expect(calls.some(call => call[0] === '/api/communities')).toBe(true);
      expect(calls.some(call => call[0] === '/api/products')).toBe(true);
      expect(calls.some(call => call[0] === '/api/posts/post-123/like')).toBe(true);
      expect(calls.some(call => call[0] === '/api/users/user-456/follow')).toBe(true);
    });

    it('should add delay between action processing to avoid overwhelming server', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      testActionQueue.addAction('post', { content: 'Test 1' });
      testActionQueue.addAction('post', { content: 'Test 2' });

      const startTime = Date.now();
      await testActionQueue.processQueue();
      const endTime = Date.now();

      // Should take at least 100ms due to delay between actions
      expect(endTime - startTime).toBeGreaterThan(100);
    });
  });

  describe('Online/Offline Event Handling', () => {
    it('should process queue automatically when coming online', async () => {
      const autoSyncQueue = new ActionQueueService({ autoSync: true, syncInterval: 100 });
      
      mockFetch.mockResolvedValue({ ok: true });

      // Add action while offline
      navigator.onLine = false;
      autoSyncQueue.addAction('post', { content: 'Offline post' });

      expect(autoSyncQueue.getQueueSize()).toBe(1);

      // Simulate coming online
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      // Wait a bit for the event handler
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalled();

      autoSyncQueue.destroy();
    });

    it('should log appropriate messages for online/offline transitions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate going offline
      navigator.onLine = false;
      window.dispatchEvent(new Event('offline'));

      // Simulate coming online
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      expect(consoleSpy).toHaveBeenCalledWith('Connection lost, actions will be queued...');
      expect(consoleSpy).toHaveBeenCalledWith('Connection restored, processing queued actions...');

      consoleSpy.mockRestore();
    });
  });

  describe('Auto-Sync Functionality', () => {
    it('should automatically sync at specified intervals when enabled', async () => {
      const autoSyncQueue = new ActionQueueService({ 
        autoSync: true, 
        syncInterval: 100 // Very short interval for testing
      });

      mockFetch.mockResolvedValue({ ok: true });

      autoSyncQueue.addAction('post', { content: 'Auto sync test' });

      // Wait for auto-sync interval
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockFetch).toHaveBeenCalled();

      autoSyncQueue.destroy();
    });

    it('should not auto-sync when disabled', async () => {
      const noAutoSyncQueue = new ActionQueueService({ autoSync: false });

      mockFetch.mockResolvedValue({ ok: true });

      noAutoSyncQueue.addAction('post', { content: 'No auto sync test' });

      // Wait longer than typical sync interval
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockFetch).not.toHaveBeenCalled();

      noAutoSyncQueue.destroy();
    });

    it('should not auto-sync when already processing', async () => {
      const autoSyncQueue = new ActionQueueService({ 
        autoSync: true, 
        syncInterval: 50
      });

      // Mock slow processing
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true }), 200))
      );

      autoSyncQueue.addAction('post', { content: 'Test 1' });
      autoSyncQueue.addAction('post', { content: 'Test 2' });

      // Start processing manually
      const processPromise = autoSyncQueue.processQueue();

      // Wait for auto-sync interval while processing
      await new Promise(resolve => setTimeout(resolve, 100));

      await processPromise;

      // Should not have made extra calls due to auto-sync during processing
      expect(mockFetch).toHaveBeenCalledTimes(2);

      autoSyncQueue.destroy();
    });
  });

  describe('Event Listeners and Subscriptions', () => {
    it('should notify listeners when queue changes', () => {
      const listener = jest.fn();
      const unsubscribe = testActionQueue.subscribe(listener);

      testActionQueue.addAction('post', { content: 'Test' });
      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ type: 'post' })
      ]));

      testActionQueue.clearQueue();
      expect(listener).toHaveBeenCalledWith([]);

      unsubscribe();
    });

    it('should allow unsubscribing from listeners', () => {
      const listener = jest.fn();
      const unsubscribe = testActionQueue.subscribe(listener);

      testActionQueue.addAction('post', { content: 'Test' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      listener.mockClear();

      testActionQueue.addAction('comment', { content: 'Test 2' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during action processing', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      testActionQueue.addAction('post', { content: 'Test' }, { maxRetries: 1 });

      await testActionQueue.processQueue();
      await testActionQueue.processQueue(); // Retry

      expect(testActionQueue.getQueueSize()).toBe(0); // Should be removed after retries
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle unknown action types gracefully', async () => {
      // Add action with unknown type
      const queue = testActionQueue.getQueue();
      queue.push({
        id: 'test-unknown',
        type: 'unknown_type' as any,
        data: { test: 'data' },
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium',
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await testActionQueue.processQueue();

      expect(consoleSpy).toHaveBeenCalledWith('Unknown action type: unknown_type');

      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should not throw
      expect(() => {
        testActionQueue.addAction('post', { content: 'Test' });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save action queue to storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Global Action Queue Instance', () => {
    it('should provide a global action queue instance', () => {
      expect(actionQueue).toBeDefined();
      expect(actionQueue).toBeInstanceOf(ActionQueueService);
    });

    it('should maintain state across multiple accesses', () => {
      actionQueue.clearQueue(); // Ensure clean state

      actionQueue.addAction('post', { content: 'Global test' });
      expect(actionQueue.getQueueSize()).toBe(1);

      // Access from different reference should show same state
      const sameQueue = actionQueue;
      expect(sameQueue.getQueueSize()).toBe(1);

      actionQueue.clearQueue();
    });
  });
});