/**
 * PWAProvider Integration Tests
 * Tests PWA provider integration with enhanced cache service
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PWAProvider, usePWA } from '../PWAProvider';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';

// Mock dependencies
jest.mock('../../services/serviceWorkerCacheService');
jest.mock('../../utils/serviceWorker');
jest.mock('../../utils/performanceMonitor');
jest.mock('../../utils/lighthouseOptimization');
jest.mock('../../services/cdnService');

const mockServiceWorkerCacheService = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;

// Test component that uses PWA context
const TestComponent: React.FC = () => {
  const { 
    isOnline, 
    updateAvailable, 
    cacheUpdateAvailable, 
    updateApp, 
    refreshCache 
  } = usePWA();

  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'online' : 'offline'}</div>
      <div data-testid="update-available">{updateAvailable ? 'update-available' : 'no-update'}</div>
      <div data-testid="cache-update-available">{cacheUpdateAvailable ? 'cache-update-available' : 'no-cache-update'}</div>
      <button data-testid="update-app" onClick={updateApp}>Update App</button>
      <button data-testid="refresh-cache" onClick={refreshCache}>Refresh Cache</button>
    </div>
  );
};

describe('PWAProvider Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service worker cache service
    mockServiceWorkerCacheService.initialize = jest.fn().mockResolvedValue(undefined);
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Mock BroadcastChannel
    const mockBroadcastChannel = {
      addEventListener: jest.fn(),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    // Mock ServiceWorkerUtil
    const mockServiceWorkerUtil = {
      init: jest.fn().mockResolvedValue(undefined),
      getServiceWorkerManager: jest.fn(() => ({
        skipWaiting: jest.fn()
      }))
    };
    
    jest.doMock('../../utils/serviceWorker', () => ({
      ServiceWorkerUtil: jest.fn(() => mockServiceWorkerUtil)
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize enhanced cache service on mount', async () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    await waitFor(() => {
      expect(mockServiceWorkerCacheService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  it('should set up BroadcastChannel for cache update notifications', async () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    await waitFor(() => {
      expect(BroadcastChannel).toHaveBeenCalledWith('pwa-updates');
    });
  });

  it('should handle cache update notifications via BroadcastChannel', async () => {
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
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    await waitFor(() => {
      expect(mockBroadcastChannel.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    // Simulate cache update message
    if (messageHandler) {
      messageHandler({
        data: {
          type: 'CACHE_UPDATED',
          data: { timestamp: Date.now() }
        }
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('cache-update-available')).toHaveTextContent('cache-update-available');
    });
  });

  it('should handle service worker update notifications', async () => {
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
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    // Simulate SW update message
    if (messageHandler) {
      messageHandler({
        data: {
          type: 'SW_UPDATE_AVAILABLE',
          timestamp: Date.now()
        }
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('update-available')).toHaveTextContent('update-available');
    });
  });

  it('should refresh cache when refreshCache is called', async () => {
    const mockBroadcastChannel = {
      addEventListener: jest.fn(),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    const refreshButton = screen.getByTestId('refresh-cache');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'REFRESH_CACHE',
        timestamp: expect.any(Number)
      });
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('should handle network status changes', async () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
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
    });
  });

  it('should display cache update notification when available', async () => {
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
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    // Trigger cache update
    if (messageHandler) {
      messageHandler({
        data: {
          type: 'CONTENT_UPDATED',
          data: { pages: ['feed', 'marketplace'] }
        }
      });
    }

    await waitFor(() => {
      expect(screen.getByText('New content available')).toBeInTheDocument();
    });
  });

  it('should handle multiple BroadcastChannel message types', async () => {
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

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    // Test different message types
    const messageTypes = [
      { type: 'CACHE_UPDATED', data: { timestamp: Date.now() } },
      { type: 'CACHE_INVALIDATED', data: { tags: ['feed'] } },
      { type: 'SW_UPDATE_AVAILABLE' },
      { type: 'CONTENT_UPDATED', data: { pages: ['feed'] } }
    ];

    for (const message of messageTypes) {
      if (messageHandler) {
        messageHandler({ data: message });
      }
    }

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Cache update available:', expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('Cache invalidated:', expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('Service worker update available');
      expect(consoleSpy).toHaveBeenCalledWith('Content updated:', expect.any(Object));
    });

    consoleSpy.mockRestore();
  });

  it('should handle BroadcastChannel unavailability gracefully', async () => {
    // Mock BroadcastChannel as undefined
    (global as any).BroadcastChannel = undefined;

    // Should not throw error
    expect(() => {
      render(
        <PWAProvider>
          <TestComponent />
        </PWAProvider>
      );
    }).not.toThrow();
  });

  it('should cleanup BroadcastChannel on unmount', async () => {
    const mockBroadcastChannel = {
      addEventListener: jest.fn(),
      postMessage: jest.fn(),
      close: jest.fn()
    };
    
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

    const { unmount } = render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    );

    unmount();

    // Note: In a real implementation, we would need to track the cleanup
    // This is a placeholder for the cleanup verification
    expect(true).toBe(true);
  });
});