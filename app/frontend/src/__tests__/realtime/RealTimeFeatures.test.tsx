import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RealTimeNotificationSystem } from '@/components/RealTimeNotifications/RealTimeNotificationSystem';
import { LiveUpdateIndicators } from '@/components/RealTimeNotifications/LiveUpdateIndicators';
import { OfflineNotificationQueue } from '@/components/RealTimeNotifications/OfflineNotificationQueue';
import { EnhancedStateProvider } from '@/contexts/EnhancedStateProvider';

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
    }, 100);
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

global.WebSocket = MockWebSocket as any;

// Mock real-time services
jest.mock('@/services/realTimeNotificationService', () => ({
  realTimeNotificationService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    sendMessage: jest.fn(),
    getConnectionStatus: jest.fn(() => 'connected'),
  },
}));

jest.mock('@/services/onlineOfflineSyncService', () => ({
  onlineOfflineSyncService: {
    isOnline: jest.fn(() => true),
    queueAction: jest.fn(),
    syncQueuedActions: jest.fn(),
    getQueuedActions: jest.fn(() => []),
    clearQueue: jest.fn(),
  },
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EnhancedStateProvider>
    {children}
  </EnhancedStateProvider>
);

describe('Real-Time Features Tests', () => {
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Create fresh WebSocket mock for each test
    mockWebSocket = new MockWebSocket('ws://localhost:3001');
  });

  afterEach(() => {
    mockWebSocket?.close();
  });

  describe('Real-Time Notifications', () => {
    it('should establish WebSocket connection', async () => {
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(require('@/services/realTimeNotificationService').realTimeNotificationService.connect).toHaveBeenCalled();
      });

      // Should show connected status
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
    });

    it('should receive and display real-time notifications', async () => {
      const mockOnMarkAsRead = jest.fn();
      
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={mockOnMarkAsRead}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      });

      // Simulate receiving a notification
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'notification',
          data: {
            id: 'notif-1',
            type: 'mention',
            title: 'New mention',
            message: 'You were mentioned in a post',
            timestamp: new Date().toISOString(),
            read: false,
          },
        });
      });

      // Should display the notification
      await waitFor(() => {
        expect(screen.getByText('New mention')).toBeInTheDocument();
        expect(screen.getByText('You were mentioned in a post')).toBeInTheDocument();
      });
    });

    it('should categorize notifications by type', async () => {
      const notifications = [
        {
          id: '1',
          type: 'mention',
          title: 'Mention notification',
          message: 'You were mentioned',
          timestamp: new Date(),
          read: false,
        },
        {
          id: '2',
          type: 'tip',
          title: 'Tip notification',
          message: 'You received a tip',
          timestamp: new Date(),
          read: false,
        },
        {
          id: '3',
          type: 'governance',
          title: 'Governance notification',
          message: 'New proposal to vote on',
          timestamp: new Date(),
          read: false,
        },
      ];

      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={notifications}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Should show category filters
      expect(screen.getByRole('button', { name: /mentions/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tips/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /governance/i })).toBeInTheDocument();

      // Filter by mentions
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /mentions/i }));

      // Should only show mention notifications
      expect(screen.getByText('Mention notification')).toBeInTheDocument();
      expect(screen.queryByText('Tip notification')).not.toBeInTheDocument();
    });

    it('should handle priority notifications', async () => {
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Simulate high priority notification
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'notification',
          data: {
            id: 'urgent-1',
            type: 'governance',
            title: 'Urgent: Voting deadline',
            message: 'Proposal voting ends in 1 hour',
            priority: 'high',
            timestamp: new Date().toISOString(),
            read: false,
          },
        });
      });

      // Should show priority indicator
      await waitFor(() => {
        expect(screen.getByTestId('priority-notification')).toBeInTheDocument();
        expect(screen.getByTestId('priority-indicator')).toHaveClass('high-priority');
      });
    });

    it('should handle connection failures gracefully', async () => {
      // Mock connection failure
      require('@/services/realTimeNotificationService').realTimeNotificationService.getConnectionStatus.mockReturnValue('disconnected');

      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Should show disconnected status
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      
      // Should show reconnection attempt
      expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
    });

    it('should implement exponential backoff for reconnection', async () => {
      const connectSpy = jest.spyOn(require('@/services/realTimeNotificationService').realTimeNotificationService, 'connect');
      
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Simulate connection failures
      connectSpy.mockRejectedValueOnce(new Error('Connection failed'));
      connectSpy.mockRejectedValueOnce(new Error('Connection failed'));
      connectSpy.mockResolvedValueOnce(undefined);

      // Should retry with increasing delays
      await waitFor(() => {
        expect(connectSpy).toHaveBeenCalledTimes(3);
      }, { timeout: 10000 });
    });
  });

  describe('Live Update Indicators', () => {
    it('should show live update indicators without disrupting view', async () => {
      render(
        <TestWrapper>
          <LiveUpdateIndicators 
            hasUpdates={false}
            updateCount={0}
            onViewUpdates={jest.fn()}
          />
        </TestWrapper>
      );

      // Should not show indicator initially
      expect(screen.queryByTestId('live-update-indicator')).not.toBeInTheDocument();

      // Simulate new updates
      const { rerender } = render(
        <TestWrapper>
          <LiveUpdateIndicators 
            hasUpdates={true}
            updateCount={3}
            onViewUpdates={jest.fn()}
          />
        </TestWrapper>
      );

      // Should show update indicator
      expect(screen.getByTestId('live-update-indicator')).toBeInTheDocument();
      expect(screen.getByText('3 new updates')).toBeInTheDocument();
    });

    it('should handle live comment updates', async () => {
      const mockOnNewComment = jest.fn();
      
      render(
        <TestWrapper>
          <LiveUpdateIndicators 
            hasUpdates={false}
            updateCount={0}
            onViewUpdates={jest.fn()}
            onNewComment={mockOnNewComment}
          />
        </TestWrapper>
      );

      // Simulate new comment via WebSocket
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'comment',
          data: {
            postId: 'post-123',
            comment: {
              id: 'comment-456',
              author: 'User123',
              content: 'New comment content',
              timestamp: new Date().toISOString(),
            },
          },
        });
      });

      await waitFor(() => {
        expect(mockOnNewComment).toHaveBeenCalledWith(
          expect.objectContaining({
            postId: 'post-123',
            comment: expect.objectContaining({
              id: 'comment-456',
              content: 'New comment content',
            }),
          })
        );
      });
    });

    it('should handle live reaction updates', async () => {
      const mockOnReactionUpdate = jest.fn();
      
      render(
        <TestWrapper>
          <LiveUpdateIndicators 
            hasUpdates={false}
            updateCount={0}
            onViewUpdates={jest.fn()}
            onReactionUpdate={mockOnReactionUpdate}
          />
        </TestWrapper>
      );

      // Simulate reaction update
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'reaction',
          data: {
            postId: 'post-123',
            reactionType: '🔥',
            newCount: 15,
            user: 'User456',
          },
        });
      });

      await waitFor(() => {
        expect(mockOnReactionUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            postId: 'post-123',
            reactionType: '🔥',
            newCount: 15,
          })
        );
      });
    });
  });

  describe('Offline Functionality', () => {
    beforeEach(() => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
    });

    it('should detect offline state', () => {
      render(
        <TestWrapper>
          <OfflineNotificationQueue 
            queuedActions={[]}
            onSync={jest.fn()}
            onClearQueue={jest.fn()}
          />
        </TestWrapper>
      );

      // Should show offline indicator
      expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it('should queue actions when offline', async () => {
      const mockQueueAction = require('@/services/onlineOfflineSyncService').onlineOfflineSyncService.queueAction;
      
      render(
        <TestWrapper>
          <OfflineNotificationQueue 
            queuedActions={[]}
            onSync={jest.fn()}
            onClearQueue={jest.fn()}
          />
        </TestWrapper>
      );

      // Simulate user action while offline
      const actionButton = screen.getByRole('button', { name: /queue action/i });
      await userEvent.click(actionButton);

      expect(mockQueueAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_action',
          timestamp: expect.any(Date),
        })
      );
    });

    it('should show queued actions count', () => {
      const queuedActions = [
        { id: '1', type: 'post', data: { content: 'Offline post 1' }, timestamp: new Date() },
        { id: '2', type: 'reaction', data: { postId: 'post-123', type: '🔥' }, timestamp: new Date() },
        { id: '3', type: 'comment', data: { postId: 'post-456', content: 'Offline comment' }, timestamp: new Date() },
      ];

      render(
        <TestWrapper>
          <OfflineNotificationQueue 
            queuedActions={queuedActions}
            onSync={jest.fn()}
            onClearQueue={jest.fn()}
          />
        </TestWrapper>
      );

      // Should show queue count
      expect(screen.getByText('3 actions queued')).toBeInTheDocument();
      
      // Should show action types
      expect(screen.getByText(/post/i)).toBeInTheDocument();
      expect(screen.getByText(/reaction/i)).toBeInTheDocument();
      expect(screen.getByText(/comment/i)).toBeInTheDocument();
    });

    it('should sync queued actions when back online', async () => {
      const mockSyncQueuedActions = require('@/services/onlineOfflineSyncService').onlineOfflineSyncService.syncQueuedActions;
      const mockOnSync = jest.fn();
      
      const queuedActions = [
        { id: '1', type: 'post', data: { content: 'Offline post' }, timestamp: new Date() },
      ];

      render(
        <TestWrapper>
          <OfflineNotificationQueue 
            queuedActions={queuedActions}
            onSync={mockOnSync}
            onClearQueue={jest.fn()}
          />
        </TestWrapper>
      );

      // Simulate going back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Trigger online event
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(mockSyncQueuedActions).toHaveBeenCalled();
        expect(mockOnSync).toHaveBeenCalled();
      });

      // Should show sync success message
      expect(screen.getByText(/synced successfully/i)).toBeInTheDocument();
    });

    it('should handle sync failures gracefully', async () => {
      const mockSyncQueuedActions = require('@/services/onlineOfflineSyncService').onlineOfflineSyncService.syncQueuedActions;
      mockSyncQueuedActions.mockRejectedValue(new Error('Sync failed'));
      
      const queuedActions = [
        { id: '1', type: 'post', data: { content: 'Offline post' }, timestamp: new Date() },
      ];

      render(
        <TestWrapper>
          <OfflineNotificationQueue 
            queuedActions={queuedActions}
            onSync={jest.fn()}
            onClearQueue={jest.fn()}
          />
        </TestWrapper>
      );

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(screen.getByText(/sync failed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should preserve action order during sync', async () => {
      const mockSyncQueuedActions = require('@/services/onlineOfflineSyncService').onlineOfflineSyncService.syncQueuedActions;
      
      const queuedActions = [
        { id: '1', type: 'post', data: { content: 'First post' }, timestamp: new Date(Date.now() - 3000) },
        { id: '2', type: 'reaction', data: { postId: 'post-123' }, timestamp: new Date(Date.now() - 2000) },
        { id: '3', type: 'comment', data: { postId: 'post-123' }, timestamp: new Date(Date.now() - 1000) },
      ];

      render(
        <TestWrapper>
          <OfflineNotificationQueue 
            queuedActions={queuedActions}
            onSync={jest.fn()}
            onClearQueue={jest.fn()}
          />
        </TestWrapper>
      );

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(mockSyncQueuedActions).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: '1', type: 'post' }),
            expect.objectContaining({ id: '2', type: 'reaction' }),
            expect.objectContaining({ id: '3', type: 'comment' }),
          ])
        );
      });
    });
  });

  describe('WebSocket Connection Management', () => {
    it('should handle connection drops and reconnect', async () => {
      const connectSpy = jest.spyOn(require('@/services/realTimeNotificationService').realTimeNotificationService, 'connect');
      
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Simulate connection drop
      act(() => {
        mockWebSocket.close();
      });

      // Should attempt to reconnect
      await waitFor(() => {
        expect(connectSpy).toHaveBeenCalledTimes(2); // Initial + reconnect
      });
    });

    it('should handle message parsing errors', async () => {
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Send malformed message
      act(() => {
        mockWebSocket.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
      });

      // Should handle error gracefully without crashing
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('should implement heartbeat mechanism', async () => {
      const sendSpy = jest.spyOn(mockWebSocket, 'send');
      
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Wait for heartbeat
      await waitFor(() => {
        expect(sendSpy).toHaveBeenCalledWith(
          JSON.stringify({ type: 'ping' })
        );
      }, { timeout: 35000 }); // Heartbeat typically every 30 seconds
    });

    it('should handle multiple concurrent connections', async () => {
      // Render multiple components that use WebSocket
      render(
        <TestWrapper>
          <div>
            <RealTimeNotificationSystem 
              notifications={[]}
              onMarkAsRead={jest.fn()}
              onClearAll={jest.fn()}
            />
            <LiveUpdateIndicators 
              hasUpdates={false}
              updateCount={0}
              onViewUpdates={jest.fn()}
            />
          </div>
        </TestWrapper>
      );

      // Should reuse the same connection
      expect(require('@/services/realTimeNotificationService').realTimeNotificationService.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high frequency updates efficiently', async () => {
      const mockOnMarkAsRead = jest.fn();
      
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={mockOnMarkAsRead}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Send many updates rapidly
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        act(() => {
          mockWebSocket.simulateMessage({
            type: 'notification',
            data: {
              id: `notif-${i}`,
              type: 'mention',
              title: `Notification ${i}`,
              message: `Message ${i}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
          });
        });
      }

      const endTime = performance.now();
      
      // Should handle updates efficiently
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
      
      // Should batch updates to prevent UI thrashing
      await waitFor(() => {
        const notifications = screen.getAllByTestId(/notification-item/);
        expect(notifications.length).toBeLessThanOrEqual(50); // Should limit displayed notifications
      });
    });

    it('should throttle WebSocket message processing', async () => {
      const processingTimes: number[] = [];
      
      render(
        <TestWrapper>
          <RealTimeNotificationSystem 
            notifications={[]}
            onMarkAsRead={jest.fn()}
            onClearAll={jest.fn()}
          />
        </TestWrapper>
      );

      // Send messages rapidly and measure processing time
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        
        act(() => {
          mockWebSocket.simulateMessage({
            type: 'notification',
            data: {
              id: `notif-${i}`,
              type: 'mention',
              title: `Notification ${i}`,
              message: `Message ${i}`,
              timestamp: new Date().toISOString(),
              read: false,
            },
          });
        });
        
        const end = performance.now();
        processingTimes.push(end - start);
      }

      // Processing times should be consistent (throttled)
      const avgProcessingTime = processingTimes.reduce((a, b) => a + b) / processingTimes.length;
      expect(avgProcessingTime).toBeLessThan(50); // Under 50ms average
    });
  });
});