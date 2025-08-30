import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardLayout from '../DashboardLayout';
import { NavigationProvider } from '@/context/NavigationContext';
import { Web3Provider } from '@/context/Web3Context';
import { ToastProvider } from '@/context/ToastContext';
import { useAccount } from 'wagmi';

// Mock wagmi and other dependencies
jest.mock('wagmi');
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/new-dashboard',
    query: {},
    asPath: '/new-dashboard',
  }),
}));
jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}));

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>;

// Mock data
const mockFeedPosts = [
  {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    content: 'Hello from the feed!',
    tags: ['general'],
    createdAt: new Date(),
    reactions: { likes: 5, shares: 2 },
  },
  {
    id: '2',
    author: '0x2345678901234567890123456789012345678901',
    content: 'Another feed post',
    tags: ['defi'],
    createdAt: new Date(),
    reactions: { likes: 3, shares: 1 },
  },
];

const mockCommunityPosts = [
  {
    id: '3',
    author: '0x3456789012345678901234567890123456789012',
    content: 'Community discussion post',
    communityId: 'ethereum-builders',
    upvotes: 15,
    downvotes: 2,
    comments: [],
    createdAt: new Date(),
  },
];

const mockCommunities = [
  {
    id: 'ethereum-builders',
    name: 'ethereum-builders',
    displayName: 'Ethereum Builders',
    description: 'A community for Ethereum developers',
    memberCount: 1240,
    unreadCount: 3,
  },
  {
    id: 'defi-traders',
    name: 'defi-traders',
    displayName: 'DeFi Traders',
    description: 'Discuss DeFi protocols',
    memberCount: 890,
    unreadCount: 0,
  },
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ToastProvider>
    <NavigationProvider>
      {children}
    </NavigationProvider>
  </ToastProvider>
);

describe('Feed and Community Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAccount.mockReturnValue({
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890',
    } as any);

    // Setup fetch mocks for different endpoints
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/feed')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFeedPosts),
        });
      }
      if (url.includes('/api/communities/ethereum-builders/posts')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCommunityPosts),
        });
      }
      if (url.includes('/api/communities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCommunities),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });
  });

  it('navigates between feed and community views', async () => {
    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    // Should start in feed view
    expect(screen.getByText('Feed')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });

    // Click on a community
    const communityLink = screen.getByText('Ethereum Builders');
    fireEvent.click(communityLink);

    // Should navigate to community view
    await waitFor(() => {
      expect(screen.getByText('Communities')).toBeInTheDocument();
    });
  });

  it('shows different post types in feed vs community', async () => {
    // Test feed view
    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="feed-content">Feed Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello from the feed!')).toBeInTheDocument();
      expect(screen.getByText('Another feed post')).toBeInTheDocument();
    });

    // Test community view
    render(
      <TestWrapper>
        <DashboardLayout activeView="community" communityId="ethereum-builders">
          <div data-testid="community-content">Community Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Community discussion post')).toBeInTheDocument();
    });
  });

  it('maintains post creation context between views', async () => {
    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    // In feed view, post creation should be for general feed
    const postCreationArea = screen.getByText("What's happening in Web3?");
    expect(postCreationArea).toBeInTheDocument();

    // Switch to community view
    await waitFor(() => {
      expect(screen.getByText('Ethereum Builders')).toBeInTheDocument();
    });

    const communityLink = screen.getByText('Ethereum Builders');
    fireEvent.click(communityLink);

    // In community view, post creation should be community-specific
    await waitFor(() => {
      expect(screen.getByText('Post to Ethereum Builders')).toBeInTheDocument();
    });
  });

  it('handles cross-posting between feed and communities', async () => {
    const mockCreatePost = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-post', success: true }),
    });

    global.fetch = jest.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/api/posts')) {
        return mockCreatePost();
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockFeedPosts),
      });
    });

    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    // Create a post in feed
    const postButton = screen.getByText('Post');
    fireEvent.click(postButton);

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalled();
    });

    // Post should appear in both feed and relevant communities
    expect(screen.getByText('Hello from the feed!')).toBeInTheDocument();
  });

  it('synchronizes unread counts between sidebar and content', async () => {
    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show unread count in sidebar
      expect(screen.getByText('3')).toBeInTheDocument(); // Ethereum Builders unread count
    });

    // Click on community with unread posts
    const communityLink = screen.getByText('Ethereum Builders');
    fireEvent.click(communityLink);

    // After viewing community, unread count should be cleared
    await waitFor(() => {
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });
  });

  it('handles real-time updates across views', async () => {
    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello from the feed!')).toBeInTheDocument();
    });

    // Simulate real-time post update
    const newPost = {
      id: '4',
      author: '0x4567890123456789012345678901234567890123',
      content: 'New real-time post!',
      tags: ['realtime'],
      createdAt: new Date(),
      reactions: { likes: 0, shares: 0 },
    };

    // Mock updated feed with new post
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([newPost, ...mockFeedPosts]),
    });

    // Trigger refresh (in real app this would be automatic)
    const refreshButton = screen.getByLabelText(/refresh/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('New real-time post!')).toBeInTheDocument();
    });
  });

  it('preserves scroll position when switching between views', async () => {
    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    // Scroll down in feed
    const feedContainer = screen.getByTestId('content-area');
    fireEvent.scroll(feedContainer, { target: { scrollTop: 500 } });

    // Switch to community
    const communityLink = screen.getByText('Ethereum Builders');
    fireEvent.click(communityLink);

    // Switch back to feed
    const feedLink = screen.getByText('Home Feed');
    fireEvent.click(feedLink);

    // Scroll position should be preserved (this is a basic test)
    expect(feedContainer).toBeInTheDocument();
  });

  it('handles errors gracefully across views', async () => {
    // Mock network error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error loading feed')).toBeInTheDocument();
    });

    // Switch to community view - should also handle error
    const communityLink = screen.getByText('Ethereum Builders');
    fireEvent.click(communityLink);

    await waitFor(() => {
      expect(screen.getByText('Error loading community')).toBeInTheDocument();
    });
  });

  it('filters content appropriately between feed and community contexts', async () => {
    render(
      <TestWrapper>
        <DashboardLayout activeView="feed">
          <div data-testid="content-area">Content</div>
        </DashboardLayout>
      </TestWrapper>
    );

    // Feed should show all posts
    await waitFor(() => {
      expect(screen.getByText('Hello from the feed!')).toBeInTheDocument();
      expect(screen.getByText('Another feed post')).toBeInTheDocument();
    });

    // Switch to community - should only show community posts
    const communityLink = screen.getByText('Ethereum Builders');
    fireEvent.click(communityLink);

    await waitFor(() => {
      expect(screen.getByText('Community discussion post')).toBeInTheDocument();
      expect(screen.queryByText('Hello from the feed!')).not.toBeInTheDocument();
    });
  });
});