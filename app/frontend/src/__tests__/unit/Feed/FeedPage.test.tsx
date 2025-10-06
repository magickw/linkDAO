import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from '@/components/Feed/FeedPage';
import { FeedService } from '@/services/feedService';
import { serviceWorkerCacheService } from '@/services/serviceWorkerCacheService';
import { useIntelligentCache } from '@/hooks/useIntelligentCache';
import { useFeedPreferences } from '@/hooks/useFeedPreferences';
import { FeedSortType } from '@/types/feed';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('@/services/serviceWorkerCacheService');
jest.mock('@/hooks/useIntelligentCache');
jest.mock('@/hooks/useFeedPreferences');
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount }: any) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) =>
        children({ index, style: {}, data: itemData })
      )}
    </div>
  ),
}));

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;
const mockServiceWorkerCache = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;
const mockUseIntelligentCache = useIntelligentCache as jest.MockedFunction<typeof useIntelligentCache>;
const mockUseFeedPreferences = useFeedPreferences as jest.MockedFunction<typeof useFeedPreferences>;

const mockPosts = [
  testUtils.createMockPost({
    id: 'post-1',
    author: '0x1234567890123456789012345678901234567890',
    contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z4',
    engagementScore: 750,
    reactions: [
      {
        type: '🔥',
        users: [
          {
            address: '0xuser1',
            username: 'alice',
            avatar: '/avatars/alice.png',
            amount: 5,
            timestamp: new Date()
          }
        ],
        totalAmount: 5,
        tokenType: 'LDAO'
      }
    ],
    comments: 12,
    shares: 3,
    views: 156,
    trendingStatus: 'hot'
  }),
  testUtils.createMockPost({
    id: 'post-2',
    author: '0x0987654321098765432109876543210987654321',
    contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z5',
    engagementScore: 320,
    comments: 8,
    shares: 1,
    views: 89,
    trendingStatus: 'rising'
  })
];

const mockFeedPreferences = {
  currentSort: FeedSortType.HOT,
  currentTimeRange: 'day',
  updateSort: jest.fn(),
  updateTimeRange: jest.fn(),
  savePreferences: jest.fn()
};

const mockIntelligentCache = {
  cacheWithStrategy: jest.fn(),
  invalidateByTags: jest.fn(),
  predictivePreload: jest.fn()
};

describe('FeedPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseFeedPreferences.mockReturnValue(mockFeedPreferences);
    mockUseIntelligentCache.mockReturnValue(mockIntelligentCache);
    
    mockFeedService.getEnhancedFeed.mockResolvedValue({
      posts: mockPosts,
      hasMore: true,
      totalPages: 3
    });
    
    mockIntelligentCache.cacheWithStrategy.mockResolvedValue(null);
    
    // Mock IntersectionObserver for virtualized scrolling
    testUtils.mockIntersectionObserver();
  });

  describe('Initial Rendering', () => {
    it('should render feed page with posts', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: FeedSortType.HOT,
          timeRange: 'day'
        }),
        1,
        20
      );
    });

    it('should show loading skeletons initially', () => {
      render(<FeedPage />);
      
      expect(screen.getByTestId('loading-skeletons')).toBeInTheDocument();
    });

    it('should render feed header when showHeader is true', () => {
      render(<FeedPage showHeader={true} />);
      
      expect(screen.getByText('Your Feed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should not render feed header when showHeader is false', () => {
      render(<FeedPage showHeader={false} />);
      
      expect(screen.queryByText('Your Feed')).not.toBeInTheDocument();
    });
  });

  describe('Infinite Scroll', () => {
    it('should load more posts when scrolling near bottom', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Simulate scrolling to trigger load more
      const virtualizedList = screen.getByTestId('virtualized-list');
      fireEvent.scroll(virtualizedList, { target: { scrollTop: 1000 } });
      
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.any(Object),
          2, // Second page
          20
        );
      });
    });

    it('should show loading indicator when loading more posts', async () => {
      mockFeedService.getEnhancedFeed.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          posts: mockPosts,
          hasMore: true,
          totalPages: 3
        }), 100))
      );
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Trigger load more
      const virtualizedList = screen.getByTestId('virtualized-list');
      fireEvent.scroll(virtualizedList, { target: { scrollTop: 1000 } });
      
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('should show end of feed indicator when no more posts', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByText("🎉 You've reached the end!")).toBeInTheDocument();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should show pull to refresh indicator on mobile', async () => {
      render(<FeedPage enablePullToRefresh={true} />);
      
      const container = screen.getByTestId('feed-container');
      
      // Simulate touch start at top
      fireEvent.touchStart(container, {
        touches: [{ clientY: 100 }]
      });
      
      // Simulate pull down
      fireEvent.touchMove(container, {
        touches: [{ clientY: 150 }]
      });
      
      expect(screen.getByText(/pull to refresh/i)).toBeInTheDocument();
    });

    it('should refresh feed when pull distance exceeds threshold', async () => {
      render(<FeedPage enablePullToRefresh={true} />);
      
      const container = screen.getByTestId('feed-container');
      
      // Simulate pull to refresh gesture
      fireEvent.touchStart(container, {
        touches: [{ clientY: 100 }]
      });
      
      fireEvent.touchMove(container, {
        touches: [{ clientY: 200 }] // 100px pull
      });
      
      fireEvent.touchEnd(container);
      
      await waitFor(() => {
        expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
      });
    });
  });

  describe('Caching and Performance', () => {
    it('should use intelligent caching for feed requests', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(mockIntelligentCache.cacheWithStrategy).toHaveBeenCalledWith(
          expect.stringContaining('/api/feed/enhanced'),
          'feed',
          ['feed', 'posts']
        );
      });
    });

    it('should implement predictive preloading', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Wait for predictive preloading to trigger
      await waitFor(() => {
        expect(mockIntelligentCache.predictivePreload).toHaveBeenCalledWith(
          'current-user',
          'viewing_feed',
          expect.any(Object)
        );
      }, { timeout: 2000 });
    });

    it('should clear cache when refreshing', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
    });
  });

  describe('Filter Changes', () => {
    it('should reload posts when sort changes', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      });
      
      const newButton = screen.getByRole('button', { name: /new/i });
      await userEvent.click(newButton);
      
      expect(mockFeedPreferences.updateSort).toHaveBeenCalledWith(FeedSortType.NEW, true);
    });

    it('should reload posts when time range changes', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      });
      
      const weekButton = screen.getByRole('button', { name: /week/i });
      await userEvent.click(weekButton);
      
      expect(mockFeedPreferences.updateTimeRange).toHaveBeenCalledWith('week', true);
    });

    it('should reset pagination when filter changes', async () => {
      const { rerender } = render(<FeedPage />);
      
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: FeedSortType.HOT }),
          1,
          20
        );
      });
      
      // Change preferences
      mockFeedPreferences.currentSort = FeedSortType.NEW;
      rerender(<FeedPage />);
      
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.objectContaining({ sortBy: FeedSortType.NEW }),
          1,
          20
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when feed loading fails', async () => {
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Network error'));
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load feed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should retry loading when retry button is clicked', async () => {
      mockFeedService.getEnhancedFeed.mockRejectedValueOnce(new Error('Network error'));
      mockFeedService.getEnhancedFeed.mockResolvedValueOnce({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });

    it('should show empty state when no posts are available', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [],
        hasMore: false,
        totalPages: 0
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/no.*posts found/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh feed/i })).toBeInTheDocument();
      });
    });
  });

  describe('Community-Specific Feed', () => {
    it('should load community-specific posts when communityId is provided', async () => {
      render(<FeedPage communityId="test-community" />);
      
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.objectContaining({
            communityId: 'test-community'
          }),
          1,
          20
        );
      });
      
      expect(screen.getByText('Community Feed')).toBeInTheDocument();
    });
  });

  describe('Virtualization Performance', () => {
    it('should render only visible items in virtualized list', async () => {
      const largeMockPosts = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: largeMockPosts,
        hasMore: false,
        totalPages: 1
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Should only render a subset of items (mocked to 10)
      const renderedItems = screen.getAllByTestId(/post-card/);
      expect(renderedItems.length).toBeLessThanOrEqual(10);
    });

    it('should handle scroll performance efficiently', async () => {
      const startTime = performance.now();
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Simulate rapid scrolling
      const virtualizedList = screen.getByTestId('virtualized-list');
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(virtualizedList, { target: { scrollTop: i * 100 } });
      }
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Feed');
      });
      
      expect(screen.getByRole('button', { name: /refresh/i })).toHaveAttribute(
        'aria-label',
        'Refresh feed'
      );
    });

    it('should announce loading states to screen readers', async () => {
      render(<FeedPage />);
      
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    });

    it('should support keyboard navigation', async () => {
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const firstPost = screen.getAllByRole('article')[0];
      firstPost.focus();
      
      fireEvent.keyDown(firstPost, { key: 'ArrowDown' });
      
      const secondPost = screen.getAllByRole('article')[1];
      expect(secondPost).toHaveFocus();
    });
  });
});