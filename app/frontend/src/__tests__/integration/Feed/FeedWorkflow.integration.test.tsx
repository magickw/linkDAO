import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from '@/components/Feed/FeedPage';
import { PostComposer } from '@/components/Feed/PostComposer';
import { FeedService } from '@/services/feedService';
import { serviceWorkerCacheService } from '@/services/serviceWorkerCacheService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { FeedSortType } from '@/types/feed';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('@/services/serviceWorkerCacheService');
jest.mock('@/context/Web3Context');
jest.mock('@/context/ToastContext');

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;
const mockServiceWorkerCache = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;
const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchNetwork: jest.fn()
};

const mockToastContext = {
  addToast: jest.fn(),
  removeToast: jest.fn(),
  toasts: []
};

// Mock posts for different scenarios
const mockPosts = [
  testUtils.createMockPost({
    id: 'post-1',
    author: '0x1111111111111111111111111111111111111111',
    contentCid: 'bafybeicpost1',
    engagementScore: 1200,
    trendingStatus: 'viral',
    reactions: [
      {
        type: '🔥',
        users: [
          {
            address: '0xuser1',
            username: 'alice',
            avatar: '/avatars/alice.png',
            amount: 25,
            timestamp: new Date()
          }
        ],
        totalAmount: 25,
        tokenType: 'LDAO'
      }
    ],
    comments: 45,
    shares: 12,
    views: 2340
  }),
  testUtils.createMockPost({
    id: 'post-2',
    author: '0x2222222222222222222222222222222222222222',
    contentCid: 'bafybeicpost2',
    engagementScore: 650,
    trendingStatus: 'hot',
    reactions: [
      {
        type: '💎',
        users: [
          {
            address: '0xuser2',
            username: 'bob',
            avatar: '/avatars/bob.png',
            amount: 10,
            timestamp: new Date()
          }
        ],
        totalAmount: 10,
        tokenType: 'LDAO'
      }
    ],
    comments: 23,
    shares: 5,
    views: 890
  })
];

// Integration test component that combines feed and composer
function FeedWithComposer() {
  const [showComposer, setShowComposer] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const handleNewPost = async (postData: any) => {
    // Simulate post creation
    await new Promise(resolve => setTimeout(resolve, 100));
    setShowComposer(false);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
      <button 
        onClick={() => setShowComposer(true)}
        data-testid="show-composer-button"
      >
        Create Post
      </button>
      
      {showComposer && (
        <PostComposer
          onPost={handleNewPost}
          onCancel={() => setShowComposer(false)}
        />
      )}
      
      <FeedPage key={refreshTrigger} />
    </div>
  );
}

describe('Feed Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWeb3.mockReturnValue(mockWeb3Context);
    mockUseToast.mockReturnValue(mockToastContext);
    
    mockFeedService.getEnhancedFeed.mockResolvedValue({
      posts: mockPosts,
      hasMore: true,
      totalPages: 3
    });
    
    mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);
    
    // Mock IntersectionObserver
    testUtils.mockIntersectionObserver();
  });

  describe('Post Creation and Feed Update Workflow', () => {
    it('should create a post and refresh the feed', async () => {
      render(<FeedWithComposer />);
      
      // Wait for initial feed load
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Open post composer
      const createPostButton = screen.getByTestId('show-composer-button');
      await userEvent.click(createPostButton);
      
      expect(screen.getByText('Create Post')).toBeInTheDocument();
      
      // Fill out post content
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'This is a new test post #integration');
      
      // Submit post
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      // Wait for post creation and feed refresh
      await waitFor(() => {
        expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
      });
      
      // Verify feed was refreshed (new API call made)
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledTimes(2);
    });

    it('should handle post creation with media upload', async () => {
      render(<FeedWithComposer />);
      
      // Open composer
      const createPostButton = screen.getByTestId('show-composer-button');
      await userEvent.click(createPostButton);
      
      // Upload media
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' });
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: {
          files: [file]
        }
      });
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      // Add content and submit
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Post with media');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
      });
    });
  });

  describe('Feed Interaction Workflows', () => {
    it('should handle complete reaction workflow', async () => {
      const mockOnReaction = jest.fn().mockResolvedValue(undefined);
      
      render(
        <FeedPage 
          onReaction={mockOnReaction}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Find and click reaction button
      const reactionButton = screen.getAllByRole('button', { name: /🔥/ })[0];
      await userEvent.click(reactionButton);
      
      // Should trigger reaction
      expect(mockOnReaction).toHaveBeenCalledWith(
        'post-1',
        '🔥',
        expect.any(Number)
      );
      
      // Should show success toast
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          expect.stringContaining('reaction'),
          'success'
        );
      });
    });

    it('should handle complete tipping workflow', async () => {
      const mockOnTip = jest.fn().mockResolvedValue(undefined);
      
      render(
        <FeedPage 
          onTip={mockOnTip}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Open tip modal
      const tipButton = screen.getAllByRole('button', { name: /tip/i })[0];
      await userEvent.click(tipButton);
      
      expect(screen.getByText('Send Tip')).toBeInTheDocument();
      
      // Fill tip form
      const amountInput = screen.getByLabelText(/amount/i);
      const messageInput = screen.getByLabelText(/message/i);
      
      await userEvent.type(amountInput, '5');
      await userEvent.type(messageInput, 'Great content!');
      
      // Submit tip
      const submitButton = screen.getByRole('button', { name: /tip.*usdc/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnTip).toHaveBeenCalledWith(
          'post-1',
          '5',
          'USDC',
          'Great content!'
        );
      });
      
      // Modal should close
      expect(screen.queryByText('Send Tip')).not.toBeInTheDocument();
    });

    it('should handle complete sharing workflow', async () => {
      const mockOnShare = jest.fn().mockResolvedValue(undefined);
      
      render(
        <FeedPage 
          onShare={mockOnShare}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Open share modal
      const shareButton = screen.getAllByRole('button', { name: /share/i })[0];
      await userEvent.click(shareButton);
      
      expect(screen.getByText('Share Post')).toBeInTheDocument();
      
      // Select share option
      const dmShareButton = screen.getByText('Send as Direct Message');
      await userEvent.click(dmShareButton);
      
      expect(mockOnShare).toHaveBeenCalledWith('post-1', 'dm');
      
      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Share Post')).not.toBeInTheDocument();
      });
    });
  });

  describe('Feed Filtering and Sorting Workflows', () => {
    it('should handle sort change workflow', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      });
      
      // Initial load with HOT sort
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: FeedSortType.HOT }),
        1,
        20
      );
      
      // Change to NEW sort
      const newButton = screen.getByRole('button', { name: /new/i });
      await userEvent.click(newButton);
      
      // Should trigger new API call
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: FeedSortType.NEW }),
          1,
          20
        );
      });
    });

    it('should handle time range filter workflow', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      });
      
      // Change time range
      const weekButton = screen.getByRole('button', { name: /week/i });
      await userEvent.click(weekButton);
      
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.objectContaining({ timeRange: 'week' }),
          1,
          20
        );
      });
    });

    it('should handle community filter workflow', async () => {
      render(<FeedPage communityId="test-community" />);
      
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.objectContaining({ communityId: 'test-community' }),
          1,
          20
        );
      });
      
      expect(screen.getByText('Community Feed')).toBeInTheDocument();
    });
  });

  describe('Infinite Scroll Workflow', () => {
    it('should handle complete infinite scroll workflow', async () => {
      // Mock multiple pages of data
      mockFeedService.getEnhancedFeed
        .mockResolvedValueOnce({
          posts: mockPosts.slice(0, 1),
          hasMore: true,
          totalPages: 2
        })
        .mockResolvedValueOnce({
          posts: mockPosts.slice(1, 2),
          hasMore: false,
          totalPages: 2
        });
      
      render(<FeedPage />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Verify first page loaded
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20
      );
      
      // Simulate scroll to trigger load more
      const virtualizedList = screen.getByTestId('virtualized-list');
      fireEvent.scroll(virtualizedList, { target: { scrollTop: 1000 } });
      
      // Wait for second page to load
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.any(Object),
          2,
          20
        );
      });
      
      // Should show end of feed indicator
      await waitFor(() => {
        expect(screen.getByText("🎉 You've reached the end!")).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should handle feed loading error and recovery', async () => {
      // First call fails
      mockFeedService.getEnhancedFeed.mockRejectedValueOnce(
        new Error('Network error')
      );
      
      render(<FeedPage />);
      
      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/failed to load feed/i)).toBeInTheDocument();
      });
      
      // Mock successful retry
      mockFeedService.getEnhancedFeed.mockResolvedValueOnce({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      });
      
      // Click retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);
      
      // Should recover and show posts
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });

    it('should handle post creation error and retry', async () => {
      const mockOnPost = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);
      
      render(<PostComposer onPost={mockOnPost} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      await userEvent.type(textArea, 'Test post');
      
      const postButton = screen.getByRole('button', { name: /post/i });
      await userEvent.click(postButton);
      
      // Should show error
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          'Failed to create post',
          'error'
        );
      });
      
      // Content should still be there for retry
      expect(textArea).toHaveValue('Test post');
      
      // Retry should work
      await userEvent.click(postButton);
      
      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          'Post created successfully!',
          'success'
        );
      });
    });
  });

  describe('Caching Integration Workflows', () => {
    it('should handle cache hit and miss scenarios', async () => {
      // First load - cache miss
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValueOnce(null);
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledWith(
          expect.stringContaining('/api/feed/enhanced'),
          'feed',
          ['feed', 'posts']
        );
      });
      
      // Second load - cache hit
      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));
      
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValueOnce(cachedResponse);
      
      // Trigger refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      // Should use cached data
      await waitFor(() => {
        expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle cache invalidation on refresh', async () => {
      const mockInvalidateByTags = jest.fn();
      
      // Mock the intelligent cache hook
      jest.doMock('@/hooks/useIntelligentCache', () => ({
        useIntelligentCache: () => ({
          cacheWithStrategy: mockServiceWorkerCache.cacheWithStrategy,
          invalidateByTags: mockInvalidateByTags,
          predictivePreload: jest.fn()
        })
      }));
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      expect(mockInvalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
    });
  });

  describe('Real-time Update Workflows', () => {
    it('should handle real-time post updates', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Simulate real-time update
      const updatedPost = {
        ...mockPosts[0],
        engagementScore: 1500,
        reactions: [
          ...mockPosts[0].reactions,
          {
            type: '🚀',
            users: [
              {
                address: '0xuser3',
                username: 'charlie',
                avatar: '/avatars/charlie.png',
                amount: 15,
                timestamp: new Date()
              }
            ],
            totalAmount: 15,
            tokenType: 'LDAO'
          }
        ]
      };
      
      // Mock updated feed response
      mockFeedService.getEnhancedFeed.mockResolvedValueOnce({
        posts: [updatedPost, ...mockPosts.slice(1)],
        hasMore: true,
        totalPages: 3
      });
      
      // Trigger refresh to simulate real-time update
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      // Should show updated engagement
      await waitFor(() => {
        expect(screen.getByText('Score: 1500')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('should handle large feed efficiently', async () => {
      const largeFeed = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: largeFeed,
        hasMore: false,
        totalPages: 1
      });
      
      const startTime = performance.now();
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render large feed efficiently
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid user interactions efficiently', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const startTime = performance.now();
      
      // Simulate rapid interactions
      const sortButtons = screen.getAllByRole('button');
      for (let i = 0; i < 10; i++) {
        const randomButton = sortButtons[Math.floor(Math.random() * sortButtons.length)];
        if (randomButton && !randomButton.disabled) {
          fireEvent.click(randomButton);
        }
      }
      
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      // Should handle rapid interactions without performance degradation
      expect(interactionTime).toBeLessThan(500);
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility throughout workflow', async () => {
      render(<FeedWithComposer />);
      
      // Check initial accessibility
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Open composer
      const createButton = screen.getByTestId('show-composer-button');
      await userEvent.click(createButton);
      
      // Check composer accessibility
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label');
      
      // Navigate with keyboard
      const textArea = screen.getByRole('textbox');
      textArea.focus();
      
      fireEvent.keyDown(textArea, { key: 'Tab' });
      
      // Should focus next interactive element
      expect(document.activeElement).not.toBe(textArea);
      
      // Check screen reader announcements
      await userEvent.type(textArea, 'Test content');
      
      expect(screen.getByRole('status')).toHaveTextContent(/characters remaining/);
    });
  });
});