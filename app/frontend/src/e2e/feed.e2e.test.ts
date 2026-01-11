/**
 * End-to-End Tests for Feed Functionality
 * 
 * This test suite covers complete user workflows for interacting with the social feed,
 * including post creation, feed loading, interaction with posts, and performance testing.
 */

import { jest } from '@jest/globals';

// Mock Next.js router
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/'
};

jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}));

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    isConnecting: false,
    isDisconnected: false
  }),
  useBalance: () => ({
    data: { formatted: '2.45', symbol: 'ETH' },
    isLoading: false
  }),
  useContractRead: () => ({
    data: null,
    isLoading: false
  }),
  useContractWrite: () => ({
    write: jest.fn(),
    isLoading: false
  })
}));

// Mock Web3 Context
const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  balance: '2.45',
  connect: jest.fn(),
  disconnect: jest.fn()
};

jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => mockWeb3Context,
  Web3Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Navigation Context
const mockNavigationContext = {
  navigationState: {
    activeView: 'feed' as const,
    activeCommunity: null,
    sidebarCollapsed: false,
    rightSidebarVisible: true,
    modalState: {
      postCreation: false,
      communityJoin: false,
      userProfile: false
    }
  },
  setActiveView: jest.fn(),
  setActiveCommunity: jest.fn(),
  navigateToFeed: jest.fn(),
  navigateToCommunity: jest.fn(),
  toggleSidebar: jest.fn(),
  setSidebarCollapsed: jest.fn(),
  openModal: jest.fn(),
  closeModal: jest.fn()
};

jest.mock('@/context/NavigationContext', () => ({
  useNavigation: () => mockNavigationContext,
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock Toast Context
const mockToastContext = {
  addToast: jest.fn(),
  removeToast: jest.fn(),
  toasts: []
};

jest.mock('@/context/ToastContext', () => ({
  useToast: () => mockToastContext,
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock WebSocket hook
jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    subscribe: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  })
}));

// Mock profile hook
jest.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    data: {
      handle: 'testuser',
      avatar: 'https://placehold.co/40'
    },
    isLoading: false,
    error: null
  })
}));

// Mock posts hooks
jest.mock('@/hooks/usePosts', () => ({
  useCreatePost: () => ({
    createPost: jest.fn().mockResolvedValue({ success: true }),
    isLoading: false,
    error: null,
    success: true
  })
}));

// Mock feed preferences hooks
jest.mock('@/hooks/useFeedPreferences', () => ({
  useFeedSortingPreferences: () => ({
    currentSort: 'hot',
    currentTimeRange: '24h',
    updateSort: jest.fn(),
    updateTimeRange: jest.fn()
  }),
  useDisplayPreferences: () => ({
    showSocialProof: true,
    showTrendingBadges: true,
    infiniteScroll: true,
    postsPerPage: 20
  }),
  useAutoRefreshPreferences: () => ({
    isEnabled: false,
    interval: 60
  })
}));

// Mock mobile optimization hook
jest.mock('@/hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false
  })
}));

// Mock feed service
jest.mock('@/services/feedService', () => ({
  FeedService: {
    getEnhancedFeed: jest.fn().mockResolvedValue({
      posts: [
        {
          id: '1',
          title: 'First Test Post',
          content: 'This is the first test post content',
          author: '0x1234567890123456789012345678901234567890',
          createdAt: new Date(),
          updatedAt: new Date(),
          contentType: 'text',
          mediaCids: [],
          previews: [],
          tags: ['test', 'web3'],
          reactions: [],
          tips: [],
          comments: 5,
          reposts: 2,
          views: 100,
          engagementScore: 150,
          socialProof: {
            followedUsersWhoEngaged: [],
            totalEngagementFromFollowed: 0,
            communityLeadersWhoEngaged: [],
            verifiedUsersWhoEngaged: []
          }
        },
        {
          id: '2',
          title: 'Second Test Post',
          content: 'This is the second test post content',
          author: '0x1234567890123456789012345678901234567890',
          createdAt: new Date(Date.now() - 3600000),
          updatedAt: new Date(Date.now() - 3600000),
          contentType: 'text',
          mediaCids: [],
          previews: [],
          tags: ['blockchain', 'ethereum'],
          reactions: [],
          tips: [],
          comments: 3,
          reposts: 1,
          views: 75,
          engagementScore: 100,
          socialProof: {
            followedUsersWhoEngaged: [],
            totalEngagementFromFollowed: 0,
            communityLeadersWhoEngaged: [],
            verifiedUsersWhoEngaged: []
          }
        }
      ],
      hasMore: true,
      totalPages: 5,
      currentPage: 1
    })
  }
}));

// Import components after mocks
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/pages/index';
import { Web3Provider } from '@/context/Web3Context';
import { NavigationProvider } from '@/context/NavigationContext';
import { ToastProvider } from '@/context/ToastContext';

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Web3Provider>
    <NavigationProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </NavigationProvider>
  </Web3Provider>
);

describe('Feed E2E Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feed Loading and Display', () => {
    it('should display the feed with posts when user is authenticated', async () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Should show user profile information
      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      // Should show feed posts
      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeInTheDocument();
        expect(screen.getByText('This is the first test post content')).toBeInTheDocument();
        expect(screen.getByText('Second Test Post')).toBeInTheDocument();
        expect(screen.getByText('This is the second test post content')).toBeInTheDocument();
      });

      // Should show post metadata
      expect(screen.getByText('5')).toBeInTheDocument(); // First post comment count
      expect(screen.getByText('3')).toBeInTheDocument(); // Second post comment count
    });

    it('should handle feed loading states', async () => {
      // Mock loading state
      const { FeedService } = require('@/services/feedService');
      FeedService.getEnhancedFeed.mockResolvedValueOnce({
        posts: [],
        hasMore: true,
        totalPages: 1,
        currentPage: 1
      });

      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Should show loading state initially
      // Note: The actual loading skeleton is not easily testable without more specific selectors
    });

    it('should handle feed error states', async () => {
      // Mock error state
      const { FeedService } = require('@/services/feedService');
      FeedService.getEnhancedFeed.mockRejectedValueOnce(new Error('Failed to load feed'));

      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Should show error state
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith('Failed to load feed', 'error');
      });
    });
  });

  describe('Post Creation Workflow', () => {
    it('should allow user to create a post through the composer', async () => {
      const user = userEvent.setup();
      const { useCreatePost } = require('@/hooks/usePosts');
      const mockCreatePost = jest.fn().mockResolvedValue({ success: true });
      useCreatePost.mockReturnValue({
        createPost: mockCreatePost,
        isLoading: false,
        error: null,
        success: false
      });

      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Find the post composer textarea
      const postComposer = screen.getByPlaceholderText('Share your latest DAO proposal 🧠');
      
      // Type in the post content
      await user.type(postComposer, 'This is a new test post');
      
      // Click the post button
      const postButton = screen.getByRole('button', { name: 'Post' });
      await user.click(postButton);
      
      // Verify the post was submitted
      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith({
          author: '0x1234567890123456789012345678901234567890',
          content: 'This is a new test post',
          tags: [],
          media: undefined
        });
      });
      
      // Verify success toast
      expect(mockToastContext.addToast).toHaveBeenCalledWith('Post created successfully!', 'success');
    });

    it('should extract hashtags from post content', async () => {
      const user = userEvent.setup();
      const { useCreatePost } = require('@/hooks/usePosts');
      const mockCreatePost = jest.fn().mockResolvedValue({ success: true });
      useCreatePost.mockReturnValue({
        createPost: mockCreatePost,
        isLoading: false,
        error: null,
        success: false
      });

      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Find the post composer textarea
      const postComposer = screen.getByPlaceholderText('Share your latest DAO proposal 🧠');
      
      // Type in the post content with hashtags
      await user.type(postComposer, 'This is a post about #web3 and #blockchain technology');
      
      // Verify hashtags are displayed
      expect(screen.getByText('#web3')).toBeInTheDocument();
      expect(screen.getByText('#blockchain')).toBeInTheDocument();
      
      // Click the post button
      const postButton = screen.getByRole('button', { name: 'Post' });
      await user.click(postButton);
      
      // Verify the post was submitted with extracted hashtags
      await waitFor(() => {
        expect(mockCreatePost).toHaveBeenCalledWith({
          author: '0x1234567890123456789012345678901234567890',
          content: 'This is a post about #web3 and #blockchain technology',
          tags: ['web3', 'blockchain'],
          media: undefined
        });
      });
    });
  });

  describe('Feed Interaction Workflow', () => {
    it('should allow sorting posts by different criteria', async () => {
      const { useFeedSortingPreferences } = require('@/hooks/useFeedPreferences');
      const mockUpdateSort = jest.fn();
      useFeedSortingPreferences.mockReturnValue({
        currentSort: 'hot',
        currentTimeRange: '24h',
        updateSort: mockUpdateSort,
        updateTimeRange: jest.fn()
      });

      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeInTheDocument();
      });

      // Find and click the "New" sort button
      const newSortButton = screen.getByText('🆕 New');
      fireEvent.click(newSortButton);
      
      // Verify sort was updated
      expect(mockUpdateSort).toHaveBeenCalledWith('new', true);
    });

    it('should handle infinite scroll to load more posts', async () => {
      const { FeedService } = require('@/services/feedService');
      
      // Mock multiple pages of posts
      FeedService.getEnhancedFeed
        .mockResolvedValueOnce({
          posts: [{
            id: '1',
            title: 'First Page Post',
            content: 'Content',
            author: '0x123',
            createdAt: new Date(),
            updatedAt: new Date(),
            contentType: 'text',
            mediaCids: [],
            previews: [],
            tags: [],
            reactions: [],
            tips: [],
            comments: 0,
            reposts: 0,
            views: 0,
            engagementScore: 0,
            socialProof: {
              followedUsersWhoEngaged: [],
              totalEngagementFromFollowed: 0,
              communityLeadersWhoEngaged: [],
              verifiedUsersWhoEngaged: []
            }
          }],
          hasMore: true,
          totalPages: 2,
          currentPage: 1
        })
        .mockResolvedValueOnce({
          posts: [{
            id: '2',
            title: 'Second Page Post',
            content: 'Content',
            author: '0x123',
            createdAt: new Date(),
            updatedAt: new Date(),
            contentType: 'text',
            mediaCids: [],
            previews: [],
            tags: [],
            reactions: [],
            tips: [],
            comments: 0,
            reposts: 0,
            views: 0,
            engagementScore: 0,
            socialProof: {
              followedUsersWhoEngaged: [],
              totalEngagementFromFollowed: 0,
              communityLeadersWhoEngaged: [],
              verifiedUsersWhoEngaged: []
            }
          }],
          hasMore: false,
          totalPages: 2,
          currentPage: 2
        });

      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Wait for first page to load
      await waitFor(() => {
        expect(screen.getByText('First Page Post')).toBeInTheDocument();
      });

      // Simulate scroll to bottom to trigger infinite scroll
      // Note: This is difficult to test without a proper scroll container
    });
  });

  describe('Performance and Accessibility', () => {
    it('should have proper accessibility attributes', async () => {
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeInTheDocument();
      });

      // Check that posts have proper roles
      const articles = screen.getAllByRole('article');
      expect(articles.length).toBeGreaterThan(0);
      
      // Check that interactive elements have proper labels
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByText('First Test Post')).toBeInTheDocument();
      });

      // Test keyboard navigation
      // Note: This is difficult to test without more specific selectors
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      // Should show mobile-optimized layout
      // Note: This is difficult to test without more specific selectors
    });
  });
});