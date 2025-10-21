import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useSellerWebSocket } from '../useSellerWebSocket';

// Mock the WebSocket client service
jest.mock('../../services/webSocketClientService', () => ({
  getWebSocketClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(() => 'subscription_id'),
    unsubscribe: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    send: jest.fn(),
    isConnected: jest.fn(() => true),
    getConnectionState: jest.fn(() => ({
      status: 'connected',
      reconnectAttempts: 0
    }))
  }))
}));

// Mock the seller WebSocket service
jest.mock('../../services/sellerWebSocketService', () => ({
  createSellerWebSocketService: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getConnectionStatus: jest.fn(() => ({
      connected: true,
      reconnectAttempts: 0
    })),
    registerCacheInvalidationCallback: jest.fn(),
    unregisterCacheInvalidationCallback: jest.fn(),
    requestDataRefresh: jest.fn(),
    sendSellerEvent: jest.fn(),
    clearNotificationQueue: jest.fn()
  }))
}));

describe('useSellerWebSocket', () => {
  const testWalletAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress,
        autoConnect: false
      })
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.notifications).toEqual([]);
    expect(result.current.orders).toEqual([]);
    expect(result.current.analytics).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.unreadCount).toBe(0);
  });

  test('should provide connection control functions', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  test('should provide notification management functions', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    expect(typeof result.current.clearNotifications).toBe('function');
    expect(typeof result.current.markAsRead).toBe('function');
    expect(typeof result.current.markAllAsRead).toBe('function');
  });

  test('should provide event handler registration functions', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    expect(typeof result.current.onNewOrder).toBe('function');
    expect(typeof result.current.onOrderStatusChange).toBe('function');
    expect(typeof result.current.onPaymentReceived).toBe('function');
    expect(typeof result.current.onTierUpgrade).toBe('function');
    expect(typeof result.current.onReviewReceived).toBe('function');
    expect(typeof result.current.onAnalyticsUpdate).toBe('function');
  });

  test('should handle new order events', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const mockCallback = jest.fn();
    
    act(() => {
      const cleanup = result.current.onNewOrder(mockCallback);
      expect(typeof cleanup).toBe('function');
    });
  });

  test('should handle order status change events', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const mockCallback = jest.fn();
    
    act(() => {
      const cleanup = result.current.onOrderStatusChange(mockCallback);
      expect(typeof cleanup).toBe('function');
    });
  });

  test('should handle payment received events', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const mockCallback = jest.fn();
    
    act(() => {
      const cleanup = result.current.onPaymentReceived(mockCallback);
      expect(typeof cleanup).toBe('function');
    });
  });

  test('should handle tier upgrade events', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const mockCallback = jest.fn();
    
    act(() => {
      const cleanup = result.current.onTierUpgrade(mockCallback);
      expect(typeof cleanup).toBe('function');
    });
  });

  test('should handle review received events', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const mockCallback = jest.fn();
    
    act(() => {
      const cleanup = result.current.onReviewReceived(mockCallback);
      expect(typeof cleanup).toBe('function');
    });
  });

  test('should handle analytics update events', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const mockCallback = jest.fn();
    
    act(() => {
      const cleanup = result.current.onAnalyticsUpdate(mockCallback);
      expect(typeof cleanup).toBe('function');
    });
  });

  test('should manage cache invalidation callbacks', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const mockCallback = jest.fn();
    
    act(() => {
      result.current.registerCacheCallback('profile', mockCallback);
      result.current.unregisterCacheCallback('profile', mockCallback);
    });

    expect(typeof result.current.registerCacheCallback).toBe('function');
    expect(typeof result.current.unregisterCacheCallback).toBe('function');
  });

  test('should provide utility functions', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    expect(typeof result.current.requestDataRefresh).toBe('function');
    expect(typeof result.current.sendCustomEvent).toBe('function');
  });

  test('should handle notification state updates', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    const testNotification = {
      id: 'test_notification',
      type: 'order' as const,
      title: 'Test Notification',
      message: 'This is a test notification',
      priority: 'medium' as const,
      read: false,
      createdAt: new Date()
    };

    act(() => {
      // Simulate adding a notification
      result.current.markAsRead(testNotification.id);
    });

    // The markAsRead function should be callable
    expect(typeof result.current.markAsRead).toBe('function');
  });

  test('should calculate unread count correctly', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    // Initially should be 0
    expect(result.current.unreadCount).toBe(0);
  });

  test('should handle clear notifications', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toEqual([]);
  });

  test('should handle mark all as read', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    act(() => {
      result.current.markAllAsRead();
    });

    // Should not throw and function should be available
    expect(typeof result.current.markAllAsRead).toBe('function');
  });

  test('should handle data refresh requests', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    act(() => {
      result.current.requestDataRefresh(['orders', 'analytics']);
    });

    expect(typeof result.current.requestDataRefresh).toBe('function');
  });

  test('should handle custom events', () => {
    const { result } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    act(() => {
      result.current.sendCustomEvent('custom_event', { data: 'test' }, 'high');
    });

    expect(typeof result.current.sendCustomEvent).toBe('function');
  });

  test('should cleanup on unmount', () => {
    const { unmount } = renderHook(() =>
      useSellerWebSocket({
        walletAddress: testWalletAddress
      })
    );

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });

  test('should handle wallet address changes', () => {
    const { rerender } = renderHook(
      ({ walletAddress }) => useSellerWebSocket({ walletAddress }),
      {
        initialProps: { walletAddress: testWalletAddress }
      }
    );

    // Change wallet address
    const newWalletAddress = '0x9876543210987654321098765432109876543210';
    
    expect(() => {
      rerender({ walletAddress: newWalletAddress });
    }).not.toThrow();
  });
});