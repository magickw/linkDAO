import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedFeedView } from '@/components/Feed/EnhancedFeedView';
import { FeedService } from '@/services/feedService';
import { analyticsService } from '@/services/analyticsService';
import testUtils from '../../setup/testSetup';

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

describe('Feed Analytics Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockIntersectionObserver();
    mockAnalyticsService.trackUserEvent.mockResolvedValue(undefined);
  });

  describe('Feed Load Analytics', () => {
    it('should track successful feed loads with analytics service', async () => {
      const mockPosts = [
        {
          id: '1',
          author: '0x1234567890123456789012345678901234567890',
          parentId: null,
          title: 'Test Post',
          contentCid: 'QmTest123',
          mediaCids: ['QmMedia456'],
          tags: ['test', 'tag'],
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-01T00:00:00Z'),
          onchainRef: '0xTx123',
          stakedValue: 100,
          reputationScore: 50,
          dao: 'test-dao',
          commentCount: 5,
          shareCount: 2,
          viewCount: 100,
          engagementScore: 150,
          reactions: [],
          tips: [],
          previews: []
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify analytics tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_load',
        expect.objectContaining({
          success: true,
          postCount: 1
        })
      );
    });

    it('should track feed load errors with analytics service', async () => {
      const mockError = new Error('Network error');
      mockFeedService.getEnhancedFeed.mockRejectedValue(mockError);

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Verify error tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_load_error',
        expect.objectContaining({
          error: 'Network error'
        })
      );
    });
  });

  describe('User Interaction Analytics', () => {
    it('should track retry attempts', async () => {
      const user = require('@testing-library/user-event').default.setup();
      
      // First call fails, second succeeds
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          posts: [{ id: '2', author: '0xRetry', title: 'Retry Post' } as any],
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

      // Should track retry attempt
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_retry_attempt',
        expect.any(Object)
      );

      // Should recover and show posts
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });
    });

    it('should track page refresh actions', async () => {
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();

      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Persistent error'));

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh page/i });
      refreshButton.click();

      // Should track refresh action
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_refresh_page',
        expect.any(Object)
      );

      window.location.reload = originalReload;
    });
  });

  describe('Community Metrics Analytics', () => {
    it('should track community metrics load success', async () => {
      const mockPosts = [
        {
          id: '3',
          author: '0xCommunity',
          title: 'Community Post',
          createdAt: new Date(),
          updatedAt: new Date(),
          commentCount: 0,
          shareCount: 0,
          viewCount: 0,
          engagementScore: 0,
          reactions: [],
          tips: [],
          previews: []
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });

      mockFeedService.getCommunityEngagementMetrics.mockResolvedValue({
        communityId: 'test-community',
        totalPosts: 100,
        totalEngagement: 500,
        topContributors: [],
        trendingTags: ['test', 'tag'],
        engagementGrowth: 10
      });

      render(<EnhancedFeedView communityId="test-community" showCommunityMetrics />);

      await waitFor(() => {
        expect(screen.getByTestId('community-engagement-metrics')).toBeInTheDocument();
      });

      // Verify community metrics tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'community_metrics_load',
        expect.objectContaining({
          communityId: 'test-community',
          success: true
        })
      );
    });

    it('should track community metrics load errors', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [],
        hasMore: false,
        totalPages: 1
      });

      mockFeedService.getCommunityEngagementMetrics.mockRejectedValue(
        new Error('Metrics service unavailable')
      );

      render(<EnhancedFeedView communityId="test-community" showCommunityMetrics />);

      // Should still render feed even if metrics fail
      await waitFor(() => {
        expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      });

      // Verify error tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'community_metrics_error',
        expect.objectContaining({
          communityId: 'test-community',
          error: 'Metrics service unavailable'
        })
      );
    });
  });

  describe('Performance and Data Quality Analytics', () => {
    it('should track feed with various post types and content', async () => {
      const mockPosts = [
        {
          id: '4',
          author: '0xMulti',
          title: 'Multi-content Post',
          contentCid: 'QmMulti123',
          mediaCids: ['image1.jpg', 'image2.jpg'],
          tags: ['media', 'test'],
          createdAt: new Date('2023-01-01T00:00:00Z'),
          updatedAt: new Date('2023-01-01T00:00:00Z'),
          onchainRef: '0xMultiTx123',
          stakedValue: 200,
          reputationScore: 75,
          dao: 'multi-dao',
          commentCount: 10,
          shareCount: 5,
          viewCount: 200,
          engagementScore: 300,
          reactions: [
            {
              type: 'like',
              users: [{ address: '0xUser1', username: 'user1', avatar: 'avatar1.jpg', amount: 10, timestamp: new Date() }],
              totalAmount: 10,
              tokenType: 'LDAO'
            }
          ],
          tips: [
            {
              from: '0xTipper1',
              amount: 50,
              tokenType: 'USDC',
              timestamp: new Date()
            }
          ],
          previews: [
            {
              id: 'preview-1',
              type: 'link',
              url: 'https://example.com',
              data: {
                title: 'Example Link',
                description: 'An example link preview',
                image: 'https://example.com/image.jpg'
              },
              metadata: {},
              cached: true,
              securityStatus: 'safe'
            }
          ]
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 2
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify detailed analytics tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_load',
        expect.objectContaining({
          postCount: 1,
          hasMore: true,
          totalPages: 2
        })
      );
    });

    it('should track empty feed scenarios', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [],
        hasMore: false,
        totalPages: 0
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/no trending posts found/i)).toBeInTheDocument();
      });

      // Verify empty feed tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_load',
        expect.objectContaining({
          postCount: 0,
          hasMore: false,
          totalPages: 0
        })
      );
    });
  });
});