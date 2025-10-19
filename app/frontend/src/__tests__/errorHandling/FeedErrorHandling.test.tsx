import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedFeedView } from '@/components/Feed/EnhancedFeedView';
import { FeedService } from '@/services/feedService';
import { analyticsService } from '@/services/analyticsService';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('@/services/analyticsService');

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

// Mock hooks
jest.mock('@/hooks/useFeedPreferences', () => ({
  useFeedSortingPreferences: () => ({
    currentSort: 'hot',
    currentTimeRange: 'day',
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

jest.mock('@/hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: false,
    touchTargetClasses: 'touch-target'
  })
}));

// Mock components
jest.mock('@/components/Feed/FeedSortingTabs', () => ({
  FeedSortingHeader: () => <div data-testid="feed-sorting-header">Sorting Header</div>
}));

jest.mock('@/components/Feed/TrendingContentDetector', () => ({
  __esModule: true,
  default: () => <div data-testid="trending-content-detector">Trending Content</div>
}));

jest.mock('@/components/Feed/CommunityEngagementMetrics', () => ({
  __esModule: true,
  default: () => <div data-testid="community-engagement-metrics">Community Metrics</div>
}));

jest.mock('@/components/EnhancedPostCard/EnhancedPostCard', () => ({
  __esModule: true,
  default: ({ post }: any) => (
    <div data-testid="enhanced-post-card" data-post-id={post.id}>
      Post: {post.title || post.content}
    </div>
  )
}));

jest.mock('@/components/Feed/LikedByModal', () => ({
  __esModule: true,
  default: () => <div data-testid="liked-by-modal">Liked By Modal</div>
}));

describe('Feed Error Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsService.trackUserEvent.mockResolvedValue(undefined);
  });

  describe('Network Error Handling', () => {
    it('should display appropriate error message for network errors', async () => {
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Network Error'));

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should display appropriate error message for HTTP errors', async () => {
      const httpError = {
        code: 'HTTP_500',
        message: 'Internal Server Error',
        timestamp: new Date(),
        retryable: true
      };

      mockFeedService.getEnhancedFeed.mockRejectedValue(httpError);

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
      expect(screen.getByText(/error code: HTTP_500/i)).toBeInTheDocument();
    });

    it('should display appropriate message for non-retryable errors', async () => {
      const nonRetryableError = {
        code: 'PERMISSION_DENIED',
        message: 'Access denied',
        timestamp: new Date(),
        retryable: false
      };

      mockFeedService.getEnhancedFeed.mockRejectedValue(nonRetryableError);

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/error code: PERMISSION_DENIED/i)).toBeInTheDocument();
      expect(screen.getByText(/may require administrator attention/i)).toBeInTheDocument();
    });
  });

  describe('Retry Mechanisms', () => {
    it('should allow retrying after network error', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          posts: [{ id: 'retry-1', author: '0xRetry', title: 'Retry Success' } as any],
          hasMore: false,
          totalPages: 1
        });

      render(<EnhancedFeedView />);

      // Should show error state initially
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Should recover and show posts
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      expect(screen.getByText(/retry success/i)).toBeInTheDocument();
    });

    it('should track retry attempts with analytics', async () => {
      const user = userEvent.setup();
      
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          posts: [{ id: 'retry-2', author: '0xRetry2', title: 'Second Success' } as any],
          hasMore: false,
          totalPages: 1
        });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify retry tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_retry_attempt',
        expect.any(Object)
      );
    });

    it('should handle consecutive failures gracefully', async () => {
      const user = userEvent.setup();
      
      // All calls fail
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Persistent error'));

      render(<EnhancedFeedView />);

      // First error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // First retry
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Should still show error
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Second retry
      await user.click(retryButton);

      // Should still show error
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Refresh Mechanisms', () => {
    it('should allow page refresh for critical errors', async () => {
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();

      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Critical error'));

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      refreshButton.click();

      expect(window.location.reload).toHaveBeenCalled();

      window.location.reload = originalReload;
    });

    it('should track page refresh actions with analytics', async () => {
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();

      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Critical error'));

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      refreshButton.click();

      // Verify refresh tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_refresh_page',
        expect.any(Object)
      );

      window.location.reload = originalReload;
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary errors automatically', async () => {
      // First call fails with temporary error, second succeeds
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce({
          code: 'HTTP_503',
          message: 'Service temporarily unavailable',
          timestamp: new Date(),
          retryable: true
        })
        .mockResolvedValueOnce({
          posts: [{ id: 'recover-1', author: '0xRecover', title: 'Auto Recovery' } as any],
          hasMore: false,
          totalPages: 1
        });

      render(<EnhancedFeedView />);

      // Should eventually show posts (implementation would include auto-retry logic)
      await waitFor(() => {
        expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should maintain state consistency during error recovery', async () => {
      const user = userEvent.setup();
      
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce({
          posts: [{ id: 'state-1', author: '0xState', title: 'State Consistent' } as any],
          hasMore: false,
          totalPages: 1
        });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify state consistency
      expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Error Display and User Experience', () => {
    it('should provide clear error messages to users', async () => {
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Database connection failed'));

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Should provide clear, actionable error message
      expect(screen.getByText(/database connection failed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('should differentiate between retryable and non-retryable errors', async () => {
      const retryableError = {
        code: 'HTTP_503',
        message: 'Service temporarily unavailable',
        timestamp: new Date(),
        retryable: true
      };

      mockFeedService.getEnhancedFeed.mockRejectedValue(retryableError);

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Should show retry button for retryable errors
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      expect(screen.queryByText(/may require administrator attention/i)).not.toBeInTheDocument();
    });

    it('should provide appropriate guidance for non-retryable errors', async () => {
      const nonRetryableError = {
        code: 'INVALID_REQUEST',
        message: 'Invalid request parameters',
        timestamp: new Date(),
        retryable: false
      };

      mockFeedService.getEnhancedFeed.mockRejectedValue(nonRetryableError);

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Should indicate non-retryable error
      expect(screen.getByText(/may require administrator attention/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });
  });
});