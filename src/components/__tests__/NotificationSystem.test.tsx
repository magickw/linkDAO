import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import NotificationSystem from '@/components/NotificationSystem';
import { useNotifications } from '@/hooks/useNotifications';
import { useWeb3 } from '@/context/Web3Context';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/hooks/useNotifications');
jest.mock('@/context/Web3Context');

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;

describe('NotificationSystem', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      pathname: '/',
      query: {},
      asPath: '/',
    } as any);

    mockUseWeb3.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
    } as any);

    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      loading: false,
      error: null,
      markCommunityAsRead: jest.fn(),
      getCommunityUnreadCount: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification button when user is connected', () => {
    render(<NotificationSystem />);
    
    const notificationButton = screen.getByRole('button');
    expect(notificationButton).toBeInTheDocument();
  });

  it('does not render when user is not connected', () => {
    mockUseWeb3.mockReturnValue({
      address: null,
    } as any);

    const { container } = render(<NotificationSystem />);
    expect(container.firstChild).toBeNull();
  });

  it('displays unread count badge when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          type: 'follow',
          userId: 'user1',
          message: 'Someone followed you',
          timestamp: new Date(),
          read: false,
          fromUserId: 'user2',
          fromUserName: 'Test User',
        },
      ],
      unreadCount: 1,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      loading: false,
      error: null,
      markCommunityAsRead: jest.fn(),
      getCommunityUnreadCount: jest.fn(),
    });

    render(<NotificationSystem />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('opens notification panel when button is clicked', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          type: 'community_post',
          userId: 'user1',
          message: 'New post in Web3 Developers',
          timestamp: new Date(),
          read: false,
          communityId: 'web3-devs',
          communityName: 'Web3 Developers',
          postId: 'post123',
          fromUserId: 'user2',
          fromUserName: 'Test User',
          actionUrl: '/community/web3-devs/post/post123',
        },
      ],
      unreadCount: 1,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      loading: false,
      error: null,
      markCommunityAsRead: jest.fn(),
      getCommunityUnreadCount: jest.fn(),
    });

    render(<NotificationSystem />);
    
    const notificationButton = screen.getByRole('button');
    fireEvent.click(notificationButton);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('New post in Web3 Developers')).toBeInTheDocument();
    expect(screen.getByText('Web3 Developers')).toBeInTheDocument();
  });

  it('marks notification as read and navigates when clicked', async () => {
    const mockMarkAsRead = jest.fn();
    
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          type: 'community_mention',
          userId: 'user1',
          message: 'You were mentioned in DeFi Discussion',
          timestamp: new Date(),
          read: false,
          communityId: 'defi-discussion',
          communityName: 'DeFi Discussion',
          postId: 'post456',
          fromUserId: 'user2',
          fromUserName: 'Test User',
          actionUrl: '/community/defi-discussion/post/post456',
        },
      ],
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: jest.fn(),
      loading: false,
      error: null,
      markCommunityAsRead: jest.fn(),
      getCommunityUnreadCount: jest.fn(),
    });

    render(<NotificationSystem />);
    
    // Open notification panel
    const notificationButton = screen.getByRole('button');
    fireEvent.click(notificationButton);
    
    // Click on notification
    const notificationItem = screen.getByText('You were mentioned in DeFi Discussion');
    fireEvent.click(notificationItem.closest('li')!);
    
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('1');
      expect(mockPush).toHaveBeenCalledWith('/community/defi-discussion/post/post456');
    });
  });

  it('displays different icons for different notification types', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          type: 'follow',
          userId: 'user1',
          message: 'Someone followed you',
          timestamp: new Date(),
          read: false,
          fromUserId: 'user2',
          fromUserName: 'Test User',
        },
        {
          id: '2',
          type: 'community_post',
          userId: 'user1',
          message: 'New post in community',
          timestamp: new Date(),
          read: false,
          communityId: 'test-community',
          communityName: 'Test Community',
          postId: 'post123',
          fromUserId: 'user2',
          fromUserName: 'Test User',
        },
        {
          id: '3',
          type: 'tip_received',
          userId: 'user1',
          message: 'You received a tip',
          timestamp: new Date(),
          read: false,
          transactionHash: '0x123',
          tokenAmount: '10',
          tokenSymbol: 'USDC',
        },
      ],
      unreadCount: 3,
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      loading: false,
      error: null,
      markCommunityAsRead: jest.fn(),
      getCommunityUnreadCount: jest.fn(),
    });

    render(<NotificationSystem />);
    
    // Open notification panel
    const notificationButton = screen.getByRole('button');
    fireEvent.click(notificationButton);
    
    // Check that different notification types are rendered
    expect(screen.getByText('Someone followed you')).toBeInTheDocument();
    expect(screen.getByText('New post in community')).toBeInTheDocument();
    expect(screen.getByText('You received a tip')).toBeInTheDocument();
  });

  it('shows mark all as read button when there are unread notifications', () => {
    const mockMarkAllAsRead = jest.fn();
    
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          type: 'follow',
          userId: 'user1',
          message: 'Someone followed you',
          timestamp: new Date(),
          read: false,
          fromUserId: 'user2',
          fromUserName: 'Test User',
        },
      ],
      unreadCount: 1,
      markAsRead: jest.fn(),
      markAllAsRead: mockMarkAllAsRead,
      loading: false,
      error: null,
      markCommunityAsRead: jest.fn(),
      getCommunityUnreadCount: jest.fn(),
    });

    render(<NotificationSystem />);
    
    // Open notification panel
    const notificationButton = screen.getByRole('button');
    fireEvent.click(notificationButton);
    
    const markAllButton = screen.getByText('Mark all as read');
    expect(markAllButton).toBeInTheDocument();
    
    fireEvent.click(markAllButton);
    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });

  it('shows empty state when there are no notifications', () => {
    render(<NotificationSystem />);
    
    // Open notification panel
    const notificationButton = screen.getByRole('button');
    fireEvent.click(notificationButton);
    
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });
});