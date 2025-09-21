import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealTimeNotificationSystem } from '@/components/RealTimeNotifications/RealTimeNotificationSystem';
import { LiveUpdateIndicators } from '@/components/RealTimeNotifications/LiveUpdateIndicators';
import { OfflineNotificationQueue } from '@/components/RealTimeNotifications/OfflineNotificationQueue';
import { RealTimeUpdateProvider } from '@/contexts/RealTimeUpdateContext';
import { OfflineSyncProvider } from '@/contexts/OfflineSyncContext';
import * as realTimeNotificationService from '@/services/realTimeNotificationService';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

// Mock services
jest.mock('@/services/realTimeNotificationService');
const mockRealTimeService = realTimeNotificationService as jest.Mocked<typeof realTimeNotificationService>;

// Mock notification API
Object.defineProperty(window, 'Notification', {
  value: class MockNotification {
    static permission = 'granted';
    static requestPermission = jest.fn().mockResolvedValue('granted');
    
    constructor(public title: string, public options?: NotificationOptions) {}
    
    close() {}
  },
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      active: { postMessage: jest.fn() },
      addEventListener: jest.fn(),
    }),
    ready: Promise.resolve({
      active: { postMessage: jest.fn() },
      addEventListener: jest.fn(),
    }),
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <RealTimeUpdateProvider>
      <OfflineSyncProvider>
        {component}
      </OfflineSyncProvider>
    </RealTimeUpdateProvider>
  );
};

describe('Real-Time Features Tests', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRealTimeService.connect.mockImplementation(() => {
      mockWebSocket = new MockWebSocket('ws://localhost:3001');
      return Promise.resolve(mockWebSocket as any);
    });
  });

  afterEach(() => {
    mockWebSocket?.close();
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection on mount', async () => {
      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(mockRealTimeService.connect).toHaveBeenCalledWith('user-1');
      });

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    it('should handle connection failures gracefully', async () => {
      mockRealTimeService.connect.mockRejectedValue(new Error('Connection failed'));

      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });

    it('should attempt reconnection on connection loss', async () => {
      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Simulate connection loss
      act(() => {
        mockWebSocket.close();
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Reconnecting');
      });

      // Should attempt reconnection
      await waitFor(() => {
        expect(mockRealTimeService.connect).toHaveBeenCalledTimes(2);
      });
    });

    it('should implement exponential backoff for reconnection', async () => {
      jest.useFakeTimers();
      
      mockRealTimeService.connect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(new MockWebSocket('ws://localhost:3001') as any);

      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      // First connection attempt fails
      await waitFor(() => {
        expect(mockRealTimeService.connect).toHaveBeenCalledTimes(1);
      });

      // Wait for first retry (1 second)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockRealTimeService.connect).toHaveBeenCalledTimes(2);
      });

      // Wait for second retry (2 seconds)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(mockRealTimeService.connect).toHaveBeenCalledTimes(3);
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      jest.useRealTimers();
    });
  });

  describe('Real-Time Notifications', () => {
    it('should receive and display mention notifications', async () => {
      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Simulate mention notification
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'mention',
          data: {
            id: 'notif-1',
            message: 'You were mentioned in a post',
            postId: 'post-123',
            from: 'user-2',
            timestamp: new Date().toISOString(),
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-mention')).toBeInTheDocument();
        expect(screen.getByText('You were mentioned in a post')).toBeInTheDocument();
      });
    });

    it('should categorize notifications by type', async () => {
      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Send different types of notifications
      const notifications = [
        { type: 'mention', data: { message: 'Mention notification' } },
        { type: 'tip', data: { message: 'Tip notification' } },
        { type: 'governance', data: { message: 'Governance notification' } },
        { type: 'community', data: { message: 'Community notification' } },
      ];

      notifications.forEach((notif, index) => {
        act(() => {
          mockWebSocket.simulateMessage({
            ...notif,
            data: { ...notif.data, id: `notif-${index}` },
          });
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('notification-mention')).toBeInTheDocument();
        expect(screen.getByTestId('notification-tip')).toBeInTheDocument();
        expect(screen.getByTestId('notification-governance')).toBeInTheDocument();
        expect(screen.getByTestId('notification-community')).toBeInTheDocument();
      });

      // Check categorization
      expect(screen.getByTestId('notification-category-mention')).toHaveClass('category-mention');
      expect(screen.getByTestId('notification-category-tip')).toHaveClass('category-tip');
    });

    it('should handle priority notifications differently', async () => {
      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Send priority notification
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'governance',
          priority: 'high',
          data: {
            id: 'priority-notif',
            message: 'Urgent: Voting deadline in 1 hour',
            deadline: new Date(Date.now() + 3600000).toISOString(),
          },
        });
      });

      await waitFor(() => {
        const priorityNotif = screen.getByTestId('notification-priority');
        expect(priorityNotif).toBeInTheDocument();
        expect(priorityNotif).toHaveClass('priority-high');
        expect(screen.getByText(/urgent/i)).toBeInTheDocument();
      });
    });

    it('should show browser notifications for important updates', async () => {
      const mockNotification = jest.fn();
      (window as any).Notification = mockNotification;

      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" enableBrowserNotifications={true} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Send high priority notification
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'mention',
          priority: 'high',
          data: {
            id: 'browser-notif',
            message: 'You were mentioned by a verified user',
            from: 'verified-user',
          },
        });
      });

      await waitFor(() => {
        expect(mockNotification).toHaveBeenCalledWith(
          'You were mentioned by a verified user',
          expect.objectContaining({
            icon: expect.any(String),
            tag: 'mention',
          })
        );
      });
    });
  });

  describe('Live Update Indicators', () => {
    it('should show live update indicators without disrupting view', async () => {
      renderWithProviders(
        <LiveUpdateIndicators />
      );

      // Simulate new content available
      act(() => {
        fireEvent(window, new CustomEvent('newContentAvailable', {
          detail: { count: 3, type: 'posts' },
        }));
      });

      await waitFor(() => {
        const indicator = screen.getByTestId('live-update-indicator');
        expect(indicator).toBeInTheDocument();
        expect(indicator).toHaveTextContent('3 new posts');
      });

      // Should not auto-scroll or disrupt current view
      expect(window.scrollY).toBe(0);
    });

    it('should allow manual refresh of content', async () => {
      const user = userEvent.setup();
      const mockRefresh = jest.fn();

      renderWithProviders(
        <LiveUpdateIndicators onRefresh={mockRefresh} />
      );

      // Show update indicator
      act(() => {
        fireEvent(window, new CustomEvent('newContentAvailable', {
          detail: { count: 5, type: 'posts' },
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('live-update-indicator')).toBeInTheDocument();
      });

      // Click to refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalledWith({ count: 5, type: 'posts' });
    });

    it('should batch multiple updates', async () => {
      jest.useFakeTimers();

      renderWithProviders(
        <LiveUpdateIndicators />
      );

      // Send multiple rapid updates
      act(() => {
        fireEvent(window, new CustomEvent('newContentAvailable', {
          detail: { count: 1, type: 'posts' },
        }));
        fireEvent(window, new CustomEvent('newContentAvailable', {
          detail: { count: 2, type: 'posts' },
        }));
        fireEvent(window, new CustomEvent('newContentAvailable', {
          detail: { count: 3, type: 'posts' },
        }));
      });

      // Should batch updates
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        const indicator = screen.getByTestId('live-update-indicator');
        expect(indicator).toHaveTextContent('3 new posts'); // Latest count
      });

      jest.useRealTimers();
    });
  });

  describe('Live Comment Updates', () => {
    it('should show live comment updates', async () => {
      renderWithProviders(
        <div data-testid="post-container">
          <div data-testid="comment-section" />
        </div>
      );

      // Simulate live comment
      act(() => {
        fireEvent(window, new CustomEvent('liveComment', {
          detail: {
            postId: 'post-123',
            comment: {
              id: 'comment-1',
              content: 'Live comment content',
              author: 'user-2',
              timestamp: new Date().toISOString(),
            },
          },
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('live-comment-indicator')).toBeInTheDocument();
        expect(screen.getByText(/new comment/i)).toBeInTheDocument();
      });
    });

    it('should show typing indicators', async () => {
      renderWithProviders(
        <div data-testid="post-container">
          <div data-testid="comment-section" />
        </div>
      );

      // Simulate user typing
      act(() => {
        fireEvent(window, new CustomEvent('userTyping', {
          detail: {
            postId: 'post-123',
            user: 'user-2',
            isTyping: true,
          },
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
        expect(screen.getByText(/user-2 is typing/i)).toBeInTheDocument();
      });

      // Stop typing
      act(() => {
        fireEvent(window, new CustomEvent('userTyping', {
          detail: {
            postId: 'post-123',
            user: 'user-2',
            isTyping: false,
          },
        }));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
      });
    });
  });

  describe('Live Reaction Updates', () => {
    it('should show live reaction animations', async () => {
      renderWithProviders(
        <div data-testid="post-container">
          <div data-testid="reaction-section" />
        </div>
      );

      // Simulate live reaction
      act(() => {
        fireEvent(window, new CustomEvent('liveReaction', {
          detail: {
            postId: 'post-123',
            reactionType: '🔥',
            user: { username: 'user-2' },
            amount: 5,
          },
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('live-reaction-animation')).toBeInTheDocument();
        expect(screen.getByText(/user-2 reacted/i)).toBeInTheDocument();
      });

      // Animation should disappear after timeout
      await waitFor(() => {
        expect(screen.queryByTestId('live-reaction-animation')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should update reaction counts in real-time', async () => {
      renderWithProviders(
        <div data-testid="post-container">
          <div data-testid="reaction-count-🔥">5</div>
        </div>
      );

      // Simulate reaction count update
      act(() => {
        fireEvent(window, new CustomEvent('reactionUpdate', {
          detail: {
            postId: 'post-123',
            reactionType: '🔥',
            newCount: 6,
          },
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('reaction-count-🔥')).toHaveTextContent('6');
      });
    });
  });

  describe('Offline Functionality', () => {
    it('should detect offline state', async () => {
      renderWithProviders(
        <OfflineNotificationQueue />
      );

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      act(() => {
        fireEvent(window, new Event('offline'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
        expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
      });
    });

    it('should queue notifications when offline', async () => {
      renderWithProviders(
        <OfflineNotificationQueue />
      );

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      act(() => {
        fireEvent(window, new Event('offline'));
      });

      // Try to send notification while offline
      act(() => {
        fireEvent(window, new CustomEvent('queueNotification', {
          detail: {
            type: 'mention',
            message: 'Offline notification',
            timestamp: new Date().toISOString(),
          },
        }));
      });

      await waitFor(() => {
        expect(screen.getByTestId('queued-notifications')).toBeInTheDocument();
        expect(screen.getByText(/1 notification queued/i)).toBeInTheDocument();
      });
    });

    it('should sync queued notifications when back online', async () => {
      const mockSync = jest.fn();
      mockRealTimeService.syncOfflineNotifications = mockSync;

      renderWithProviders(
        <OfflineNotificationQueue />
      );

      // Go offline and queue notifications
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      act(() => {
        fireEvent(window, new Event('offline'));
      });

      act(() => {
        fireEvent(window, new CustomEvent('queueNotification', {
          detail: { type: 'mention', message: 'Queued notification' },
        }));
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      act(() => {
        fireEvent(window, new Event('online'));
      });

      await waitFor(() => {
        expect(mockSync).toHaveBeenCalled();
        expect(screen.getByTestId('sync-indicator')).toBeInTheDocument();
      });
    });

    it('should show sync progress', async () => {
      renderWithProviders(
        <OfflineNotificationQueue />
      );

      // Simulate sync in progress
      act(() => {
        fireEvent(window, new CustomEvent('syncProgress', {
          detail: { synced: 3, total: 5 },
        }));
      });

      await waitFor(() => {
        const syncProgress = screen.getByTestId('sync-progress');
        expect(syncProgress).toBeInTheDocument();
        expect(syncProgress).toHaveTextContent('3 of 5 synced');
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should throttle high-frequency updates', async () => {
      jest.useFakeTimers();
      const updateHandler = jest.fn();

      renderWithProviders(
        <LiveUpdateIndicators onUpdate={updateHandler} />
      );

      // Send many rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          fireEvent(window, new CustomEvent('newContentAvailable', {
            detail: { count: i + 1, type: 'posts' },
          }));
        });
      }

      // Should throttle updates
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(updateHandler).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should limit notification history to prevent memory leaks', async () => {
      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" maxNotifications={5} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Send more notifications than the limit
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockWebSocket.simulateMessage({
            type: 'mention',
            data: {
              id: `notif-${i}`,
              message: `Notification ${i}`,
            },
          });
        });
      }

      await waitFor(() => {
        const notifications = screen.getAllByTestId(/^notification-/);
        expect(notifications.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors gracefully', async () => {
      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Simulate WebSocket error
      act(() => {
        mockWebSocket.onerror?.(new Event('error'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Error');
        expect(screen.getByText(/connection error/i)).toBeInTheDocument();
      });
    });

    it('should handle malformed messages', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // Send malformed message
      act(() => {
        mockWebSocket.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse message'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should recover from temporary failures', async () => {
      jest.useFakeTimers();

      mockRealTimeService.connect
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(new MockWebSocket('ws://localhost:3001') as any);

      renderWithProviders(
        <RealTimeNotificationSystem userId="user-1" />
      );

      // Initial connection fails
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });

      // Should retry and succeed
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      jest.useRealTimers();
    });
  });
});