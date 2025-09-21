/**
 * Offline Manager Tests
 * Tests for offline support and action queuing system
 */

import { OfflineManager } from '../../services/OfflineManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = jest.fn();

describe('OfflineManager', () => {
  let offlineManager: OfflineManager;

  beforeEach(() => {
    offlineManager = OfflineManager.getInstance();
    offlineManager.clearQueue();
    jest.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('Action Queuing', () => {
    it('should queue actions with correct properties', () => {
      const actionId = offlineManager.queueAction('TEST_ACTION', { data: 'test' });
      
      expect(actionId).toBeDefined();
      expect(typeof actionId).toBe('string');
      
      const state = offlineManager.getState();
      expect(state.queuedActions).toHaveLength(1);
      
      const action = state.queuedActions[0];
      expect(action.id).toBe(actionId);
      expect(action.type).toBe('TEST_ACTION');
      expect(action.payload).toEqual({ data: 'test' });
      expect(action.priority).toBe('medium');
      expect(action.retryCount).toBe(0);
      expect(action.maxRetries).toBe(3);
    });

    it('should queue actions with custom options', () => {
      const actionId = offlineManager.queueAction('HIGH_PRIORITY_ACTION', { data: 'test' }, {
        priority: 'high',
        maxRetries: 5
      });
      
      const state = offlineManager.getState();
      const action = state.queuedActions[0];
      
      expect(action.priority).toBe('high');
      expect(action.maxRetries).toBe(5);
    });

    it('should sort queue by priority', () => {
      offlineManager.queueAction('LOW_ACTION', {}, { priority: 'low' });
      offlineManager.queueAction('HIGH_ACTION', {}, { priority: 'high' });
      offlineManager.queueAction('MEDIUM_ACTION', {}, { priority: 'medium' });
      
      const state = offlineManager.getState();
      const actions = state.queuedActions;
      
      expect(actions[0].type).toBe('HIGH_ACTION');
      expect(actions[1].type).toBe('MEDIUM_ACTION');
      expect(actions[2].type).toBe('LOW_ACTION');
    });
  });

  describe('Execute or Queue', () => {
    it('should execute immediately when online', async () => {
      const executor = jest.fn().mockResolvedValue('success');
      
      const result = await offlineManager.executeOrQueue('TEST_ACTION', executor);
      
      expect(result).toBe('success');
      expect(executor).toHaveBeenCalledTimes(1);
      expect(offlineManager.getState().queuedActions).toHaveLength(0);
    });

    it('should queue when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      const executor = jest.fn().mockResolvedValue('success');
      
      const result = await offlineManager.executeOrQueue('TEST_ACTION', executor, { data: 'test' });
      
      expect(result).toBeNull();
      expect(executor).not.toHaveBeenCalled();
      expect(offlineManager.getState().queuedActions).toHaveLength(1);
    });

    it('should queue on execution failure', async () => {
      const executor = jest.fn().mockRejectedValue(new Error('Execution failed'));
      
      await expect(offlineManager.executeOrQueue('TEST_ACTION', executor, { data: 'test' }))
        .rejects.toThrow('Execution failed');
      
      expect(offlineManager.getState().queuedActions).toHaveLength(1);
    });
  });

  describe('Queue Synchronization', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    it('should sync queued actions when online', async () => {
      offlineManager.queueAction('CREATE_POST', { title: 'Test Post' });
      offlineManager.queueAction('REACT_TO_POST', { postId: '1', reactionType: 'like' });
      
      await offlineManager.syncQueuedActions();
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(offlineManager.getState().queuedActions).toHaveLength(0);
    });

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      offlineManager.queueAction('CREATE_POST', { title: 'Test Post' });
      
      await offlineManager.syncQueuedActions();
      
      expect(fetch).not.toHaveBeenCalled();
      expect(offlineManager.getState().queuedActions).toHaveLength(1);
    });

    it('should handle sync failures with retry logic', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Sync failed'));
      
      offlineManager.queueAction('CREATE_POST', { title: 'Test Post' }, { maxRetries: 2 });
      
      await offlineManager.syncQueuedActions();
      
      const state = offlineManager.getState();
      expect(state.queuedActions).toHaveLength(1);
      expect(state.queuedActions[0].retryCount).toBe(1);
    });

    it('should remove actions after max retries', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Sync failed'));
      
      const action = offlineManager.queueAction('CREATE_POST', { title: 'Test Post' }, { maxRetries: 1 });
      
      // First sync attempt
      await offlineManager.syncQueuedActions();
      expect(offlineManager.getState().queuedActions).toHaveLength(1);
      
      // Second sync attempt (should remove after max retries)
      await offlineManager.syncQueuedActions();
      expect(offlineManager.getState().queuedActions).toHaveLength(0);
    });
  });

  describe('Action Execution', () => {
    beforeEach(() => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    });

    it('should execute CREATE_POST actions', async () => {
      offlineManager.queueAction('CREATE_POST', { title: 'Test Post', content: 'Test content' });
      
      await offlineManager.syncQueuedActions();
      
      expect(fetch).toHaveBeenCalledWith('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Post', content: 'Test content' })
      });
    });

    it('should execute REACT_TO_POST actions', async () => {
      offlineManager.queueAction('REACT_TO_POST', { 
        postId: '123', 
        reactionType: 'fire', 
        amount: 1 
      });
      
      await offlineManager.syncQueuedActions();
      
      expect(fetch).toHaveBeenCalledWith('/api/posts/123/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'fire', amount: 1 })
      });
    });

    it('should execute TIP_USER actions', async () => {
      offlineManager.queueAction('TIP_USER', { 
        recipientId: 'user123', 
        amount: 10, 
        token: 'USDC' 
      });
      
      await offlineManager.syncQueuedActions();
      
      expect(fetch).toHaveBeenCalledWith('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: 'user123', amount: 10, token: 'USDC' })
      });
    });
  });

  describe('Storage Persistence', () => {
    it('should save queue to localStorage', () => {
      offlineManager.queueAction('TEST_ACTION', { data: 'test' });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'offlineQueue',
        expect.stringContaining('TEST_ACTION')
      );
    });

    it('should load queue from localStorage', () => {
      const mockQueue = JSON.stringify([{
        id: 'test-id',
        type: 'TEST_ACTION',
        payload: { data: 'test' },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'medium'
      }]);
      
      localStorageMock.getItem.mockReturnValue(mockQueue);
      
      // Create new instance to trigger loading
      const newManager = new (OfflineManager as any)();
      const state = newManager.getState();
      
      expect(state.queuedActions).toHaveLength(1);
      expect(state.queuedActions[0].type).toBe('TEST_ACTION');
    });
  });

  describe('Queue Statistics', () => {
    it('should provide accurate queue statistics', () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000); // 1 minute ago
      
      offlineManager.queueAction('HIGH_ACTION', {}, { priority: 'high' });
      offlineManager.queueAction('MEDIUM_ACTION', {}, { priority: 'medium' });
      offlineManager.queueAction('LOW_ACTION', {}, { priority: 'low' });
      
      const stats = offlineManager.getQueueStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
      expect(stats.byPriority.low).toBe(1);
      expect(stats.oldestAction).toBeInstanceOf(Date);
    });
  });

  describe('Queue Management', () => {
    it('should remove specific actions', () => {
      const actionId = offlineManager.queueAction('TEST_ACTION', { data: 'test' });
      expect(offlineManager.getState().queuedActions).toHaveLength(1);
      
      offlineManager.removeAction(actionId);
      expect(offlineManager.getState().queuedActions).toHaveLength(0);
    });

    it('should clear entire queue', () => {
      offlineManager.queueAction('ACTION_1', {});
      offlineManager.queueAction('ACTION_2', {});
      expect(offlineManager.getState().queuedActions).toHaveLength(2);
      
      offlineManager.clearQueue();
      expect(offlineManager.getState().queuedActions).toHaveLength(0);
    });
  });

  describe('Event Listeners', () => {
    it('should subscribe to state changes', () => {
      const listener = jest.fn();
      const unsubscribe = offlineManager.subscribe(listener);
      
      offlineManager.queueAction('TEST_ACTION', {});
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          queuedActions: expect.arrayContaining([
            expect.objectContaining({ type: 'TEST_ACTION' })
          ])
        })
      );
      
      unsubscribe();
    });

    it('should unsubscribe from state changes', () => {
      const listener = jest.fn();
      const unsubscribe = offlineManager.subscribe(listener);
      
      unsubscribe();
      offlineManager.queueAction('TEST_ACTION', {});
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});