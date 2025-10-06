import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Import components
import { NotificationSystem } from '@/components/Notifications/NotificationSystem';
import { RealTimeNotificationSystem } from '@/components/RealTimeNotifications/RealTimeNotificationSystem';
import { ImmediateNotificationSystem } from '@/components/RealTimeNotifications/ImmediateNotificationSystem';
import { OfflineNotificationQueue } from '@/components/RealTimeNotifications/OfflineNotificationQueue';

// Import services
import * as realTimeNotificationService from '@/services/realTimeNotificationService';
import * as webSocketClientService from '@/services/webSocketClientService';
import * as offlineSyncService from '@/services/offlineSyncService';

// Test providers
import { TestProviders } from '@/__tests__/setup/testSetup';

// Mock services
jest.mock('@/services/realTimeNotificationService');
jest.mock('@/services/webSocketClientService');
jest.mock('@/services/offlineSyncService');

const mockRealTimeNotificationService = realTimeNotificationService as jest.Mocked<typeof realTimeNotificationService>;
const mockWebSocketClientService = webSocketClientService as jest.Mocked<typeof webSocketClientService>;
const mockOfflineSyncService = offlineSyncService as jest.Mocked<typeof offlineSyncService>;

describe('Notification Delivery Integration Tests', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    walletAddress: '0x123456789abcdef',
    preferences: {
      notifications: {
        mentions: true,
        reactions: true,
        tips: true,
        communityAnnouncements: true,
        directMessages: true
      }
    }
  };

  let mockWebSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock WebSocket
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN
    };
    
    mockWebSocketClientService.connect.mockResolvedValue({
      success: true,
      connection: mockWebSocket
    });
    
    mockRealTimeNotificationService.subscribeToNotifications.mockResolvedValue({
      success: true
    });
    
    mockOfflineSyncService.queueNotification.mockResolvedValue({ success: true });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <TestProviders initialUser={mockUser}>
        {component}
      </TestProviders>
    );
  };

  describe('Real-Time Notification Delivery', () => {
    it('should establish WebSocket connection and receive notifications', async () => {
      renderWithProviders(<RealTimeNotificationSystem />);
      
      // Wait for WebSocket connection
      await waitFor(() => {
        expect(mockWebSocketClientService.connect).toHaveBeenCalledWith({
          userId: mockUser.id,
          channels: ['notifications', 'direct_messages', 'community_updates']
        });
      });
      
      // Verify subscription to notifications
      await waitFor(() => {
        expect(mockRealTimeNotificationService.subscribeToNotifications).toHaveBeenCalledWith({
          userId: mockUser.id,
          preferences: mockUser.preferences.notifications
        });
      });
      
      // Simulate receiving a notification via WebSocket
      const notification = {
        id: 'notif-1',
        type: 'mention',
        title: 'You were mentioned',
        message: '@testuser check this out!',
        data: {
          postId: 'post-123',
          authorId: 'author-456'
        },
        timestamp: new Date().toISOString(),
        priority: 'normal'
      };
      
      // Trigger WebSocket message event
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'notification',
          payload: notification
        })
      });
      
      // Simulate WebSocket message reception
      const onMessageCallback = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (onMessageCallback) {
        onMessageCallback(messageEvent);
      }
      
      // Verify notification appears in UI
      await waitFor(() => {
        expect(screen.getByTestId('notification-toast')).toBeInTheDocument();
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
        expect(screen.getByText('@testuser check this out!')).toBeInTheDocument();
      });
    });

    it('should handle different notification priorities correctly', async () => {
      renderWithProviders(<ImmediateNotificationSystem />);
      
      // High priority notification (immediate display)
      const highPriorityNotification = {
        id: 'notif-high',
        type: 'security_alert',
        title: 'Security Alert',
        message: 'Suspicious activity detected on your account',
        priority: 'high',
        timestamp: new Date().toISOString()
      };
      
      const highPriorityEvent = new CustomEvent('notification', {
        detail: highPriorityNotification
      });
      
      fireEvent(document, highPriorityEvent);
      
      // Should appear immediately with high priority styling
      await waitFor(() => {
        const toast = screen.getByTestId('notification-toast');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveClass('priority-high');
        expect(screen.getByText('Security Alert')).toBeInTheDocument();
      });
      
      // Low priority notification (should be batched)
      const lowPriorityNotification = {
        id: 'notif-low',
        type: 'reaction',
        title: 'New reaction',
        message: 'Someone liked your post',
        priority: 'low',
        timestamp: new Date().toISOString()
      };
      
      const lowPriorityEvent = new CustomEvent('notification', {
        detail: lowPriorityNotification
      });
      
      fireEvent(document, lowPriorityEvent);
      
      // Should be batched, not immediately visible
      expect(screen.queryByText('Someone liked your post')).not.toBeInTheDocument();
      
      // Should appear in notification center
      const notificationCenter = screen.getByTestId('notification-center');
      expect(within(notificationCenter).getByText('1 new notification')).toBeInTheDocument();
    });

    it('should batch similar notifications to prevent spam', async () => {
      renderWithProviders(<NotificationSystem />);
      
      // Send multiple similar notifications rapidly
      const notifications = [
        {
          id: 'notif-1',
          type: 'reaction',
          title: 'New reaction',
          message: 'user1 reacted to your post',
          data: { postId: 'post-123' },
          timestamp: new Date().toISOString()
        },
        {
          id: 'notif-2',
          type: 'reaction',
          title: 'New reaction',
          message: 'user2 reacted to your post',
          data: { postId: 'post-123' },
          timestamp: new Date().toISOString()
        },
        {
          id: 'notif-3',
          type: 'reaction',
          title: 'New reaction',
          message: 'user3 reacted to your post',
          data: { postId: 'post-123' },
          timestamp: new Date().toISOString()
        }
      ];
      
      // Send notifications with small delays
      notifications.forEach((notification, index) => {
        setTimeout(() => {
          const event = new CustomEvent('notification', { detail: notification });
          fireEvent(document, event);
        }, index * 100);
      });
      
      // Wait for batching to occur
      await waitFor(() => {
        expect(screen.getByTestId('batched-notification')).toBeInTheDocument();
        expect(screen.getByText('3 new reactions to your post')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Individual notifications should not be shown separately
      expect(screen.queryByText('user1 reacted to your post')).not.toBeInTheDocument();
    });

    it('should handle notification categorization and filtering', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      // Send notifications of different categories
      const notifications = [
        {
          id: 'notif-mention',
          type: 'mention',
          category: 'social',
          title: 'Mention',
          message: 'You were mentioned',
          timestamp: new Date().toISOString()
        },
        {
          id: 'notif-tip',
          type: 'tip',
          category: 'financial',
          title: 'Tip received',
          message: 'You received 10 USDC',
          timestamp: new Date().toISOString()
        },
        {
          id: 'notif-community',
          type: 'community_announcement',
          category: 'community',
          title: 'Community update',
          message: 'New rules posted',
          timestamp: new Date().toISOString()
        }
      ];
      
      notifications.forEach(notification => {
        const event = new CustomEvent('notification', { detail: notification });
        fireEvent(document, event);
      });
      
      // Wait for notifications to appear
      await waitFor(() => {
        expect(screen.getByTestId('notification-center')).toBeInTheDocument();
      });
      
      // Open notification center
      const notificationButton = screen.getByTestId('notification-center-button');
      await user.click(notificationButton);
      
      // Verify all notifications are present
      await waitFor(() => {
        expect(screen.getByText('You were mentioned')).toBeInTheDocument();
        expect(screen.getByText('You received 10 USDC')).toBeInTheDocument();
        expect(screen.getByText('New rules posted')).toBeInTheDocument();
      });
      
      // Test category filtering
      const socialFilter = screen.getByTestId('filter-social');
      await user.click(socialFilter);
      
      // Only social notifications should be visible
      expect(screen.getByText('You were mentioned')).toBeInTheDocument();
      expect(screen.queryByText('You received 10 USDC')).not.toBeInTheDocument();
      expect(screen.queryByText('New rules posted')).not.toBeInTheDocument();
    });
  });

  describe('Offline Notification Handling', () => {
    it('should queue notifications when offline', async () => {
      renderWithProviders(<OfflineNotificationQueue />);
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      window.dispatchEvent(new Event('offline'));
      
      // Verify offline indicator
      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });
      
      // Simulate receiving notifications while offline
      const offlineNotifications = [
        {
          id: 'offline-notif-1',
          type: 'tip',
          title: 'Tip received',
          message: 'You received 5 USDC',
          timestamp: new Date().toISOString()
        },
        {
          id: 'offline-notif-2',
          type: 'mention',
          title: 'Mention',
          message: 'You were mentioned in a post',
          timestamp: new Date().toISOString()
        }
      ];
      
      offlineNotifications.forEach(notification => {
        const event = new CustomEvent('notification', { detail: notification });
        fireEvent(document, event);
      });
      
      // Verify notifications are queued, not displayed
      expect(screen.queryByText('You received 5 USDC')).not.toBeInTheDocument();
      expect(screen.queryByText('You were mentioned in a post')).not.toBeInTheDocument();
      
      // Verify queuing service is called
      await waitFor(() => {
        expect(mockOfflineSyncService.queueNotification).toHaveBeenCalledTimes(2);
      });
      
      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      window.dispatchEvent(new Event('online'));
      
      // Verify queued notifications are now displayed
      await waitFor(() => {
        expect(screen.getByText('You received 5 USDC')).toBeInTheDocument();
        expect(screen.getByText('You were mentioned in a post')).toBeInTheDocument();
      });
      
      // Verify sync indicator
      expect(screen.getByText('Synced 2 notifications')).toBeInTheDocument();
    });

    it('should handle notification conflicts during sync', async () => {
      renderWithProviders(<OfflineNotificationQueue />);
      
      // Simulate offline period with queued notifications
      const queuedNotifications = [
        {
          id: 'queued-1',
          type: 'reaction',
          message: 'Offline reaction',
          timestamp: new Date(Date.now() - 60000).toISOString() // 1 minute ago
        }
      ];
      
      mockOfflineSyncService.getQueuedNotifications.mockResolvedValue(queuedNotifications);
      
      // Simulate coming online with server notifications
      const serverNotifications = [
        {
          id: 'server-1',
          type: 'reaction',
          message: 'Server reaction',
          timestamp: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
        }
      ];
      
      mockRealTimeNotificationService.getRecentNotifications.mockResolvedValue(serverNotifications);
      
      // Trigger online event
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      window.dispatchEvent(new Event('online'));
      
      // Verify conflict resolution
      await waitFor(() => {
        expect(mockOfflineSyncService.resolveNotificationConflicts).toHaveBeenCalledWith({
          queued: queuedNotifications,
          server: serverNotifications
        });
      });
      
      // Both notifications should be displayed in correct order
      await waitFor(() => {
        expect(screen.getByText('Offline reaction')).toBeInTheDocument();
        expect(screen.getByText('Server reaction')).toBeInTheDocument();
      });
    });

    it('should persist notification preferences offline', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      // Open notification preferences
      const settingsButton = screen.getByTestId('notification-settings');
      await user.click(settingsButton);
      
      // Change preferences while online
      const mentionToggle = screen.getByTestId('toggle-mentions');
      await user.click(mentionToggle);
      
      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      window.dispatchEvent(new Event('offline'));
      
      // Change more preferences while offline
      const tipToggle = screen.getByTestId('toggle-tips');
      await user.click(tipToggle);
      
      // Verify preferences are stored locally
      const storedPreferences = localStorage.getItem('notification-preferences');
      expect(storedPreferences).toBeTruthy();
      
      const preferences = JSON.parse(storedPreferences!);
      expect(preferences.mentions).toBe(false);
      expect(preferences.tips).toBe(false);
      
      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      window.dispatchEvent(new Event('online'));
      
      // Verify preferences are synced to server
      await waitFor(() => {
        expect(mockRealTimeNotificationService.updatePreferences).toHaveBeenCalledWith({
          userId: mockUser.id,
          preferences: {
            mentions: false,
            tips: false,
            reactions: true,
            communityAnnouncements: true,
            directMessages: true
          }
        });
      });
    });
  });

  describe('Notification Interaction and Navigation', () => {
    it('should navigate to correct content when notification is clicked', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      // Simulate different types of notifications
      const notifications = [
        {
          id: 'nav-notif-1',
          type: 'mention',
          title: 'Mention in post',
          message: 'You were mentioned',
          data: { postId: 'post-123', communityId: 'community-456' },
          timestamp: new Date().toISOString()
        },
        {
          id: 'nav-notif-2',
          type: 'direct_message',
          title: 'New message',
          message: 'You have a new message',
          data: { conversationId: 'conv-789', fromAddress: '0xsender123' },
          timestamp: new Date().toISOString()
        },
        {
          id: 'nav-notif-3',
          type: 'community_announcement',
          title: 'Community update',
          message: 'New announcement posted',
          data: { communityId: 'community-456', announcementId: 'ann-101' },
          timestamp: new Date().toISOString()
        }
      ];
      
      notifications.forEach(notification => {
        const event = new CustomEvent('notification', { detail: notification });
        fireEvent(document, event);
      });
      
      // Open notification center
      const notificationButton = screen.getByTestId('notification-center-button');
      await user.click(notificationButton);
      
      // Click on mention notification
      const mentionNotification = screen.getByTestId('notification-nav-notif-1');
      await user.click(mentionNotification);
      
      // Verify navigation to post
      await waitFor(() => {
        expect(screen.getByTestId('post-detail-view')).toBeInTheDocument();
      });
      
      // Go back and click on message notification
      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);
      
      const messageNotification = screen.getByTestId('notification-nav-notif-2');
      await user.click(messageNotification);
      
      // Verify navigation to conversation
      await waitFor(() => {
        expect(screen.getByTestId('conversation-view')).toBeInTheDocument();
      });
      
      // Go back and click on community notification
      await user.click(backButton);
      
      const communityNotification = screen.getByTestId('notification-nav-notif-3');
      await user.click(communityNotification);
      
      // Verify navigation to community with highlighted announcement
      await waitFor(() => {
        expect(screen.getByTestId('community-page')).toBeInTheDocument();
        expect(screen.getByTestId('highlighted-announcement')).toBeInTheDocument();
      });
    });

    it('should mark notifications as read when interacted with', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      const notification = {
        id: 'read-notif-1',
        type: 'tip',
        title: 'Tip received',
        message: 'You received 15 USDC',
        read: false,
        timestamp: new Date().toISOString()
      };
      
      const event = new CustomEvent('notification', { detail: notification });
      fireEvent(document, event);
      
      // Verify notification appears as unread
      await waitFor(() => {
        const notificationElement = screen.getByTestId('notification-read-notif-1');
        expect(notificationElement).toHaveClass('unread');
      });
      
      // Click on notification
      const notificationElement = screen.getByTestId('notification-read-notif-1');
      await user.click(notificationElement);
      
      // Verify notification is marked as read
      await waitFor(() => {
        expect(mockRealTimeNotificationService.markAsRead).toHaveBeenCalledWith('read-notif-1');
      });
      
      // Verify visual state change
      expect(notificationElement).not.toHaveClass('unread');
      expect(notificationElement).toHaveClass('read');
    });

    it('should support bulk notification actions', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<NotificationSystem />);
      
      // Add multiple notifications
      const notifications = Array.from({ length: 5 }, (_, i) => ({
        id: `bulk-notif-${i}`,
        type: 'reaction',
        title: 'New reaction',
        message: `User ${i} reacted to your post`,
        read: false,
        timestamp: new Date().toISOString()
      }));
      
      notifications.forEach(notification => {
        const event = new CustomEvent('notification', { detail: notification });
        fireEvent(document, event);
      });
      
      // Open notification center
      const notificationButton = screen.getByTestId('notification-center-button');
      await user.click(notificationButton);
      
      // Select multiple notifications
      const selectAllCheckbox = screen.getByTestId('select-all-notifications');
      await user.click(selectAllCheckbox);
      
      // Verify all notifications are selected
      notifications.forEach((_, i) => {
        const checkbox = screen.getByTestId(`select-notification-bulk-notif-${i}`);
        expect(checkbox).toBeChecked();
      });
      
      // Mark all as read
      const markAllReadButton = screen.getByTestId('mark-selected-read');
      await user.click(markAllReadButton);
      
      // Verify bulk read operation
      await waitFor(() => {
        expect(mockRealTimeNotificationService.markMultipleAsRead).toHaveBeenCalledWith(
          notifications.map(n => n.id)
        );
      });
      
      // Delete selected notifications
      const deleteSelectedButton = screen.getByTestId('delete-selected');
      await user.click(deleteSelectedButton);
      
      // Confirm deletion
      const confirmDeleteButton = screen.getByTestId('confirm-delete');
      await user.click(confirmDeleteButton);
      
      // Verify bulk delete operation
      await waitFor(() => {
        expect(mockRealTimeNotificationService.deleteMultiple).toHaveBeenCalledWith(
          notifications.map(n => n.id)
        );
      });
    });
  });
});