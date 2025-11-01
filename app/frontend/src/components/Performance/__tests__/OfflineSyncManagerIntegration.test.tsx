/**
 * OfflineSyncManager Integration Tests
 * Tests integration with enhanced service worker cache service
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineSyncManager, useOfflineSync } from '../OfflineSyncManager';
import { serviceWorkerCacheService } from '../../../services/serviceWorkerCacheService';

// Mock dependencies
jest.mock('../../../services/serviceWorkerCacheService');

const mockServiceWorkerCacheService = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;

// Test component that uses offline sync context
const TestComponent: React.FC = () => {
  const { 
    isOnline, 
    syncStats, 
    addAction, 
    syncNow, 
    clearFailedActions,
    pauseSync,
    resumeSync
  } = useOfflineSync();

  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'online' : 'offline'}</div>
      <div data-testid="pending-actions">{syncStats.pendingActions}</div>
      <div data-testid="sync-in-progress">{syncStats.syncInProgress ? 'syncing' : 'idle'}</div>
      <div data-testid="queue-size">{syncStats.totalActions}</div>
      
      <button 
        data-testid="add-action" 
        onClick={() => addAction({
          type: 'post',
          data: { content: 'Test post' },
          priority: 'normal',
          maxRetries: 3,
          estimatedSize: 100
        })}
      >
        Add Action
      </button>
      
      <button data-testid="sync-now" onClick={syncNow}>Sync Now</button>
      <button data-testid="clear-failed" onClick={clearFailedActions}>Clear Failed</button>
      <button data-testid="pause-sync" onClick={pauseSync}>Pause</button>
      <button data-testid="resume-sync" onClick={resumeSync}>Resume</button>
    </div>
  );
};

describe('OfflineSyncManager Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service worker cache service
    mockServiceWorkerCacheService.initialize = jest.fn().mockResolvedValue(undefined);
    mockServiceWorkerCacheService.flushOfflineQueue = jest.fn().mockResolvedValue(undefined);
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock IndexedDB
    const mockIDBDatabase = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({ onsuccess: null, onerror: null })),
          get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
          getAll: jest.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null }))
        }))
      }))
    };

    const mockIDBRequest = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockIDBDatabase
    };

    (global as any).indexedDB = {
      open: jest.fn(() => mockIDBRequest)
    };

    // Mock BroadcastChannel
    const mockBroadcastChannel = {
      addEventListener: jest.fn(),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize enhanced service worker cache service', async () => {
    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    await waitFor(() => {
      expect(mockServiceWorkerCacheService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  it('should set up BroadcastChannel for sync coordination', async () => {
    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    await waitFor(() => {
      expect(BroadcastChannel).toHaveBeenCalledWith('offline-sync');
    });
  });

  it('should use enhanced service worker for sync operations', async () => {
    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    const syncButton = screen.getByTestId('sync-now');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockServiceWorkerCacheService.flushOfflineQueue).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle BroadcastChannel sync messages', async () => {
    let messageHandler: (event: any) => void;
    
    const mockBroadcastChannel = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      }),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    await waitFor(() => {
      expect(mockBroadcastChannel.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    // Simulate sync completion message
    if (messageHandler) {
      messageHandler({
        data: {
          type: 'SYNC_COMPLETED',
          data: { completed: 5, failed: 0, timestamp: Date.now() }
        }
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('sync-in-progress')).toHaveTextContent('idle');
    });
  });

  it('should handle sync failure messages', async () => {
    let messageHandler: (event: any) => void;
    
    const mockBroadcastChannel = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      }),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    // Simulate sync failure message
    if (messageHandler) {
      messageHandler({
        data: {
          type: 'SYNC_FAILED',
          data: { error: 'Network error', timestamp: Date.now() }
        }
      });
    }

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Background sync failed:', expect.any(Object));
    });

    consoleSpy.mockRestore();
  });

  it('should broadcast sync completion messages', async () => {
    const mockBroadcastChannel = {
      addEventListener: jest.fn(),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    // Mock successful sync
    mockServiceWorkerCacheService.flushOfflineQueue.mockResolvedValue(undefined);

    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    const syncButton = screen.getByTestId('sync-now');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'SYNC_COMPLETED',
        data: expect.objectContaining({
          completed: expect.any(Number),
          failed: expect.any(Number),
          timestamp: expect.any(Number)
        })
      });
    });
  });

  it('should broadcast sync failure messages', async () => {
    const mockBroadcastChannel = {
      addEventListener: jest.fn(),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    // Mock sync failure
    mockServiceWorkerCacheService.flushOfflineQueue.mockRejectedValue(new Error('Sync failed'));

    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    const syncButton = screen.getByTestId('sync-now');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'SYNC_FAILED',
        data: expect.objectContaining({
          error: expect.any(String),
          timestamp: expect.any(Number)
        })
      });
    });
  });

  it('should handle queue update messages', async () => {
    let messageHandler: (event: any) => void;
    
    const mockBroadcastChannel = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      }),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    // Simulate queue update message
    if (messageHandler) {
      messageHandler({
        data: {
          type: 'QUEUE_UPDATED',
          data: { queueSize: 3 }
        }
      });
    }

    // Should trigger queue reload
    await waitFor(() => {
      expect(indexedDB.open).toHaveBeenCalled();
    });
  });

  it('should handle network status changes with enhanced sync', async () => {
    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    expect(screen.getByTestId('online-status')).toHaveTextContent('online');

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    fireEvent(window, new Event('offline'));

    await waitFor(() => {
      expect(screen.getByTestId('online-status')).toHaveTextContent('offline');
    });

    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    fireEvent(window, new Event('online'));

    await waitFor(() => {
      expect(screen.getByTestId('online-status')).toHaveTextContent('online');
      expect(mockServiceWorkerCacheService.flushOfflineQueue).toHaveBeenCalled();
    });
  });

  it('should handle enhanced sync service unavailability gracefully', async () => {
    mockServiceWorkerCacheService.initialize.mockRejectedValue(new Error('Service unavailable'));
    mockServiceWorkerCacheService.flushOfflineQueue.mockRejectedValue(new Error('Service unavailable'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    const syncButton = screen.getByTestId('sync-now');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to initialize enhanced sync:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should maintain backward compatibility when BroadcastChannel is unavailable', async () => {
    (global as any).BroadcastChannel = undefined;

    // Should not throw error
    expect(() => {
      render(
        <OfflineSyncManager>
          <TestComponent />
        </OfflineSyncManager>
      );
    }).not.toThrow();
  });

  it('should coordinate with enhanced cache service for queue management', async () => {
    render(
      <OfflineSyncManager>
        <TestComponent />
      </OfflineSyncManager>
    );

    // Add an action
    const addButton = screen.getByTestId('add-action');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('queue-size')).toHaveTextContent('1');
    });

    // Sync the queue
    const syncButton = screen.getByTestId('sync-now');
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockServiceWorkerCacheService.flushOfflineQueue).toHaveBeenCalled();
    });
  });
});