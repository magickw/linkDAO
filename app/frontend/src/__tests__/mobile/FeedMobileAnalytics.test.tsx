import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedFeedView } from '@/components/Feed/EnhancedFeedView';
import { FeedService } from '@/services/feedService';
import { analyticsService } from '@/services/analyticsService';
import testUtils from '../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('@/services/analyticsService');

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

// Mock mobile optimization hook
jest.mock('@/hooks/useMobileOptimization', () => ({
  useMobileOptimization: () => ({
    isMobile: true,
    touchTargetClasses: 'touch-target',
    isTouch: true,
    triggerHapticFeedback: jest.fn(),
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    isKeyboardVisible: false,
    createSwipeHandler: jest.fn(),
    mobileOptimizedClasses: 'mobile-optimized'
  })
}));

// Mock other hooks
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

describe('Feed Mobile Analytics Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockIntersectionObserver();
    mockAnalyticsService.trackUserEvent.mockResolvedValue(undefined);
  });

  describe('Mobile Interaction Analytics', () => {
    it('should track mobile-specific interactions', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [{ id: 'mobile-1', author: '0xMobile', title: 'Mobile Post' } as any],
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify mobile interaction tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_load',
        expect.objectContaining({
          // Mobile-specific context would be added by the hook
        })
      );
    });

    it('should track pull-to-refresh gestures', async () => {
      mockFeedService.getEnhancedFeed
        .mockResolvedValueOnce({
          posts: [{ id: 'initial-1', author: '0xInitial', title: 'Initial Post' } as any],
          hasMore: false,
          totalPages: 1
        })
        .mockResolvedValueOnce({
          posts: [{ id: 'refreshed-1', author: '0xRefreshed', title: 'Refreshed Post' } as any],
          hasMore: false,
          totalPages: 1
        });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Simulate pull-to-refresh gesture
      const container = screen.getByTestId('enhanced-post-card').parentElement;
      if (container) {
        // Pull down beyond threshold
        fireEvent.touchStart(container, {
          touches: [{ clientY: 0 }]
        });

        fireEvent.touchMove(container, {
          touches: [{ clientY: 60 }] // Beyond 50px threshold
        });

        fireEvent.touchEnd(container);

        // Should track pull-to-refresh
        expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
          'feed_pull_to_refresh',
          expect.any(Object)
        );
      }
    });
  });

  describe('Mobile Performance Analytics', () => {
    it('should track mobile loading performance', async () => {
      // Mock a delay to simulate network conditions
      mockFeedService.getEnhancedFeed.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              posts: [{ id: 'perf-1', author: '0xPerf', title: 'Performance Post' } as any],
              hasMore: false,
              totalPages: 1
            });
          }, 100);
        });
      });

      const startTime = Date.now();
      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      const loadTime = Date.now() - startTime;

      // Verify performance tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_load_performance',
        expect.objectContaining({
          loadTime: expect.any(Number),
          isMobile: true
        })
      );
    });

    it('should track mobile rendering performance', async () => {
      const manyPosts = Array.from({ length: 20 }, (_, i) => ({
        id: `mobile-${i + 1}`,
        author: `0xMobile${i}`,
        title: `Mobile Post ${i + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentCount: 0,
        shareCount: 0,
        viewCount: 0,
        engagementScore: 0,
        reactions: [],
        tips: [],
        previews: []
      }));

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: manyPosts as any,
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getAllByTestId('enhanced-post-card')).toHaveLength(20);
      });

      // Verify rendering performance tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_render_performance',
        expect.objectContaining({
          postCount: 20,
          isMobile: true
        })
      );
    });
  });

  describe('Mobile Error Handling Analytics', () => {
    it('should track mobile-specific error scenarios', async () => {
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Mobile network error'));

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Verify mobile error tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_load_error',
        expect.objectContaining({
          error: 'Mobile network error',
          isMobile: true
        })
      );
    });

    it('should track mobile retry attempts', async () => {
      const user = require('@testing-library/user-event').default.setup();
      
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce(new Error('Mobile connection failed'))
        .mockResolvedValueOnce({
          posts: [{ id: 'retry-mobile-1', author: '0xMobileRetry', title: 'Mobile Retry Success' } as any],
          hasMore: false,
          totalPages: 1
        });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // Verify mobile retry tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_retry_attempt',
        expect.objectContaining({
          isMobile: true
        })
      );

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile User Experience Analytics', () => {
    it('should track mobile user engagement patterns', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [
          {
            id: 'ux-1',
            author: '0xUX',
            title: 'UX Post 1',
            createdAt: new Date(),
            updatedAt: new Date(),
            commentCount: 5,
            shareCount: 2,
            viewCount: 100,
            engagementScore: 150,
            reactions: [],
            tips: [],
            previews: []
          },
          {
            id: 'ux-2',
            author: '0xUX',
            title: 'UX Post 2',
            createdAt: new Date(),
            updatedAt: new Date(),
            commentCount: 3,
            shareCount: 1,
            viewCount: 75,
            engagementScore: 100,
            reactions: [],
            tips: [],
            previews: []
          }
        ] as any,
        hasMore: true,
        totalPages: 2
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getAllByTestId('enhanced-post-card')).toHaveLength(2);
      });

      // Verify mobile UX tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_mobile_engagement',
        expect.objectContaining({
          postCount: 2,
          hasMore: true,
          isMobile: true
        })
      );
    });

    it('should track mobile scrolling behavior', async () => {
      // Mock many posts to test scrolling
      const manyPosts = Array.from({ length: 50 }, (_, i) => ({
        id: `scroll-${i + 1}`,
        author: `0xScroll${i}`,
        title: `Scroll Post ${i + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        commentCount: 0,
        shareCount: 0,
        viewCount: 0,
        engagementScore: 0,
        reactions: [],
        tips: [],
        previews: []
      }));

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: manyPosts as any,
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getAllByTestId('enhanced-post-card')).toHaveLength(50);
      });

      // Simulate scrolling
      fireEvent.scroll(window, { target: { scrollY: 500 } });

      // Verify scroll tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_mobile_scroll',
        expect.objectContaining({
          scrollPosition: 500,
          isMobile: true
        })
      );
    });

    it('should track mobile orientation changes', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [{ id: 'orientation-1', author: '0xOrientation', title: 'Orientation Post' } as any],
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Simulate orientation change
      const orientationChangeHandler = jest.fn();
      window.addEventListener('orientationchange', orientationChangeHandler);
      
      // Dispatch orientation change event
      window.dispatchEvent(new Event('orientationchange'));

      // Verify orientation tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_mobile_orientation_change',
        expect.objectContaining({
          isMobile: true
        })
      );

      window.removeEventListener('orientationchange', orientationChangeHandler);
    });
  });

  describe('Mobile Feature Usage Analytics', () => {
    it('should track usage of mobile-specific features', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [{ id: 'feature-1', author: '0xFeature', title: 'Feature Post' } as any],
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Simulate using a mobile feature (e.g., double tap)
      const postCard = screen.getByTestId('enhanced-post-card');
      fireEvent.doubleClick(postCard);

      // Verify feature usage tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_mobile_feature_used',
        expect.objectContaining({
          feature: 'double_tap',
          isMobile: true
        })
      );
    });

    it('should track mobile navigation patterns', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [{ id: 'nav-1', author: '0xNav', title: 'Navigation Post' } as any],
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Simulate mobile navigation (e.g., swipe back)
      fireEvent.touchStart(document.body, {
        touches: [{ clientX: 50, clientY: 100 }]
      });

      fireEvent.touchMove(document.body, {
        touches: [{ clientX: 200, clientY: 100 }]
      });

      fireEvent.touchEnd(document.body);

      // Verify navigation tracking
      expect(mockAnalyticsService.trackUserEvent).toHaveBeenCalledWith(
        'feed_mobile_navigation',
        expect.objectContaining({
          gesture: 'swipe_back',
          isMobile: true
        })
      );
    });
  });
});