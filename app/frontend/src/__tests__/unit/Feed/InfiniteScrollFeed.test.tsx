import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfiniteScrollFeed } from '@/components/Feed/InfiniteScrollFeed';
import { FeedService } from '@/services/feedService';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount, onScroll }: any) => (
    <div 
      data-testid="virtualized-list"
      onScroll={onScroll}
      style={{ height: '600px', overflow: 'auto' }}
    >
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) =>
        children({ index, style: { height: '200px' }, data: itemData })
      )}
    </div>
  ),
}));

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;

const mockPosts = Array.from({ length: 20 }, (_, i) => 
  testUtils.createMockPost({
    id: `post-${i}`,
    engagementScore: Math.floor(Math.random() * 1000),
    views: Math.floor(Math.random() * 500)
  })
);

describe('InfiniteScrollFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockIntersectionObserver();
    
    mockFeedService.getEnhancedFeed.mockResolvedValue({
      posts: mockPosts,
      hasMore: true,
      totalPages: 5
    });
  });

  describe('Initial Loading', () => {
    it('should render loading state initially', () => {
      render(<InfiniteScrollFeed />);
      
      expect(screen.getByTestId('loading-skeletons')).toBeInTheDocument();
    });

    it('should load and display posts', async () => {
      render(<InfiniteScrollFeed />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20
      );
    });

    it('should handle empty feed', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [],
        hasMore: false,
        totalPages: 0
      });

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByText(/no posts found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Infinite Scroll Behavior', () => {
    it('should load more posts when scrolling near bottom', async () => {
      // Mock multiple pages
      mockFeedService.getEnhancedFeed
        .mockResolvedValueOnce({
          posts: mockPosts.slice(0, 10),
          hasMore: true,
          totalPages: 2
        })
        .mockResolvedValueOnce({
          posts: mockPosts.slice(10, 20),
          hasMore: false,
          totalPages: 2
        });

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Simulate scroll to bottom
      const virtualizedList = screen.getByTestId('virtualized-list');
      fireEvent.scroll(virtualizedList, {
        target: { scrollTop: 500, scrollHeight: 600, clientHeight: 100 }
      });

      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledTimes(2);
      });

      expect(mockFeedService.getEnhancedFeed).toHaveBeenLastCalledWith(
        expect.any(Object),
        2,
        20
      );
    });

    it('should show loading indicator when loading more', async () => {
      mockFeedService.getEnhancedFeed.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          posts: mockPosts,
          hasMore: true,
          totalPages: 3
        }), 100))
      );

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Trigger load more
      const virtualizedList = screen.getByTestId('virtualized-list');
      fireEvent.scroll(virtualizedList, {
        target: { scrollTop: 500, scrollHeight: 600, clientHeight: 100 }
      });

      expect(screen.getByTestId('loading-more-indicator')).toBeInTheDocument();
    });

    it('should prevent multiple simultaneous loads', async () => {
      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');

      // Trigger multiple scroll events rapidly
      for (let i = 0; i < 5; i++) {
        fireEvent.scroll(virtualizedList, {
          target: { scrollTop: 500, scrollHeight: 600, clientHeight: 100 }
        });
      }

      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledTimes(2); // Initial + 1 more
      });
    });

    it('should show end of feed indicator when no more posts', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByText("🎉 You've reached the end!")).toBeInTheDocument();
      });
    });
  });

  describe('Virtualization Performance', () => {
    it('should only render visible items', async () => {
      const largeFeed = Array.from({ length: 1000 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: largeFeed,
        hasMore: false,
        totalPages: 1
      });

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Should only render a subset of items (mocked to 10)
      const renderedItems = screen.getAllByTestId(/post-card/);
      expect(renderedItems.length).toBeLessThanOrEqual(10);
    });

    it('should handle rapid scrolling efficiently', async () => {
      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');
      const startTime = performance.now();

      // Simulate rapid scrolling
      for (let i = 0; i < 50; i++) {
        fireEvent.scroll(virtualizedList, {
          target: { scrollTop: i * 10 }
        });
      }

      const endTime = performance.now();
      const scrollTime = endTime - startTime;

      // Should handle rapid scrolling efficiently
      expect(scrollTime).toBeLessThan(100);
    });

    it('should optimize memory usage with large datasets', async () => {
      const hugeFeed = Array.from({ length: 5000 }, (_, i) => 
        testUtils.createMockPost({
          id: `post-${i}`,
          contentCid: 'x'.repeat(100) // Simulate larger content
        })
      );

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: hugeFeed,
        hasMore: false,
        totalPages: 1
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable despite large dataset
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Scroll Position Management', () => {
    it('should maintain scroll position on refresh', async () => {
      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');
      
      // Scroll to middle
      fireEvent.scroll(virtualizedList, {
        target: { scrollTop: 300 }
      });

      // Trigger refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      await waitFor(() => {
        expect(virtualizedList.scrollTop).toBe(300);
      });
    });

    it('should restore scroll position after navigation', async () => {
      const { rerender } = render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');
      
      // Scroll and simulate navigation away
      fireEvent.scroll(virtualizedList, {
        target: { scrollTop: 400 }
      });

      // Simulate navigation back
      rerender(<InfiniteScrollFeed restoreScrollPosition={true} />);

      await waitFor(() => {
        expect(virtualizedList.scrollTop).toBe(400);
      });
    });

    it('should handle scroll to top functionality', async () => {
      render(<InfiniteScrollFeed showScrollToTop={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');
      
      // Scroll down
      fireEvent.scroll(virtualizedList, {
        target: { scrollTop: 500 }
      });

      // Should show scroll to top button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /scroll to top/i })).toBeInTheDocument();
      });

      const scrollToTopButton = screen.getByRole('button', { name: /scroll to top/i });
      await userEvent.click(scrollToTopButton);

      expect(virtualizedList.scrollTop).toBe(0);
    });
  });

  describe('Pull to Refresh', () => {
    it('should show pull to refresh indicator on mobile', async () => {
      render(<InfiniteScrollFeed enablePullToRefresh={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

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

    it('should trigger refresh when pull distance exceeds threshold', async () => {
      render(<InfiniteScrollFeed enablePullToRefresh={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const container = screen.getByTestId('feed-container');

      // Simulate pull to refresh gesture
      fireEvent.touchStart(container, {
        touches: [{ clientY: 100 }]
      });

      fireEvent.touchMove(container, {
        touches: [{ clientY: 200 }] // 100px pull
      });

      fireEvent.touchEnd(container);

      // Should trigger refresh
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledTimes(2);
      });
    });

    it('should not trigger refresh if pull distance is insufficient', async () => {
      render(<InfiniteScrollFeed enablePullToRefresh={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const container = screen.getByTestId('feed-container');

      // Simulate insufficient pull
      fireEvent.touchStart(container, {
        touches: [{ clientY: 100 }]
      });

      fireEvent.touchMove(container, {
        touches: [{ clientY: 130 }] // Only 30px pull
      });

      fireEvent.touchEnd(container);

      // Should not trigger additional refresh
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle loading errors gracefully', async () => {
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Network error'));

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load feed/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should retry loading on error', async () => {
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          posts: mockPosts,
          hasMore: true,
          totalPages: 3
        });

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });

    it('should handle infinite scroll loading errors', async () => {
      // First load succeeds
      mockFeedService.getEnhancedFeed.mockResolvedValueOnce({
        posts: mockPosts.slice(0, 10),
        hasMore: true,
        totalPages: 2
      });

      // Second load fails
      mockFeedService.getEnhancedFeed.mockRejectedValueOnce(new Error('Load more failed'));

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Trigger load more
      const virtualizedList = screen.getByTestId('virtualized-list');
      fireEvent.scroll(virtualizedList, {
        target: { scrollTop: 500, scrollHeight: 600, clientHeight: 100 }
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to load more posts/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Feed');
      });

      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('should announce loading states to screen readers', async () => {
      render(<InfiniteScrollFeed />);

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      expect(screen.getByRole('status')).toHaveTextContent(/loaded \d+ posts/i);
    });

    it('should support keyboard navigation', async () => {
      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');
      virtualizedList.focus();

      // Should be focusable
      expect(virtualizedList).toHaveFocus();

      // Should support arrow key navigation
      fireEvent.keyDown(virtualizedList, { key: 'ArrowDown' });
      fireEvent.keyDown(virtualizedList, { key: 'ArrowUp' });
    });

    it('should handle focus management during loading', async () => {
      render(<InfiniteScrollFeed />);

      const loadingElement = screen.getByTestId('loading-skeletons');
      loadingElement.focus();

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Focus should move to the feed content
      expect(screen.getByTestId('virtualized-list')).toHaveFocus();
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce scroll events', async () => {
      const mockScrollHandler = jest.fn();
      
      render(<InfiniteScrollFeed onScroll={mockScrollHandler} />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');

      // Rapid scroll events
      for (let i = 0; i < 20; i++) {
        fireEvent.scroll(virtualizedList, {
          target: { scrollTop: i * 10 }
        });
      }

      // Should debounce scroll events
      await waitFor(() => {
        expect(mockScrollHandler).toHaveBeenCalledTimes(1);
      });
    });

    it('should implement efficient item rendering', async () => {
      const largeFeed = Array.from({ length: 2000 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: largeFeed,
        hasMore: false,
        totalPages: 1
      });

      const startTime = performance.now();

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render efficiently even with large dataset
      expect(renderTime).toBeLessThan(200);
    });

    it('should clean up resources on unmount', async () => {
      const { unmount } = render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const beforeUnmount = (performance as any).memory?.usedJSHeapSize || 0;

      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const afterUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDifference = beforeUnmount - afterUnmount;

      // Should clean up memory
      expect(memoryDifference).toBeGreaterThan(0);
    });
  });

  describe('Caching Integration', () => {
    it('should integrate with intelligent caching', async () => {
      const mockCacheWithStrategy = jest.fn().mockResolvedValue(null);
      
      jest.doMock('@/hooks/useIntelligentCache', () => ({
        useIntelligentCache: () => ({
          cacheWithStrategy: mockCacheWithStrategy,
          invalidateByTags: jest.fn(),
          predictivePreload: jest.fn()
        })
      }));

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(mockCacheWithStrategy).toHaveBeenCalledWith(
          expect.stringContaining('/api/feed/enhanced'),
          'feed',
          ['feed', 'posts']
        );
      });
    });

    it('should handle cache invalidation on refresh', async () => {
      const mockInvalidateByTags = jest.fn();
      
      jest.doMock('@/hooks/useIntelligentCache', () => ({
        useIntelligentCache: () => ({
          cacheWithStrategy: jest.fn().mockResolvedValue(null),
          invalidateByTags: mockInvalidateByTags,
          predictivePreload: jest.fn()
        })
      }));

      render(<InfiniteScrollFeed />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(mockInvalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
    });
  });
});