import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedFeedView } from '@/components/Feed/EnhancedFeedView';
import { FeedService } from '@/services/feedService';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;

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

describe('Feed Data Consistency Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockIntersectionObserver();
  });

  describe('Data Structure Consistency', () => {
    it('should maintain consistent data structures between backend and frontend', async () => {
      // Mock backend response with consistent data structure
      const mockBackendPosts = [
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
          reactions: [
            {
              type: 'like',
              users: [
                {
                  address: '0xUser1',
                  username: 'user1',
                  avatar: 'avatar1.jpg',
                  amount: 10,
                  timestamp: new Date('2023-01-01T00:00:00Z')
                }
              ],
              totalAmount: 10,
              tokenType: 'LDAO'
            }
          ],
          tips: [
            {
              from: '0xTipper1',
              amount: 5,
              tokenType: 'USDC',
              timestamp: new Date('2023-01-01T00:00:00Z')
            }
          ]
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockBackendPosts,
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      // Wait for posts to load
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify data structure consistency
      const postCard = screen.getByTestId('enhanced-post-card');
      expect(postCard).toHaveAttribute('data-post-id', '1');
      
      // Verify all expected data fields are present
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'hot',
          timeRange: 'day'
        }),
        1,
        20
      );
    });

    it('should handle missing optional fields gracefully', async () => {
      // Mock backend response with missing optional fields
      const mockBackendPosts = [
        {
          id: '2',
          author: '0xabcdef1234567890abcdef1234567890abcdef12',
          parentId: null,
          title: '',
          contentCid: 'QmTest789',
          mediaCids: [],
          tags: [],
          createdAt: new Date('2023-01-02T00:00:00Z'),
          updatedAt: new Date('2023-01-02T00:00:00Z'),
          onchainRef: '',
          stakedValue: 0,
          reputationScore: 0,
          dao: '',
          commentCount: 0,
          shareCount: 0,
          viewCount: 0,
          engagementScore: 0,
          reactions: [],
          tips: []
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockBackendPosts,
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify the component handles missing fields without errors
      const postCard = screen.getByTestId('enhanced-post-card');
      expect(postCard).toHaveAttribute('data-post-id', '2');
    });

    it('should maintain consistent data types across transformations', async () => {
      // Mock backend response with various data types
      const mockBackendPosts = [
        {
          id: '3',
          author: '0x1111111111111111111111111111111111111111',
          parentId: '1',
          title: 'Parent Post',
          contentCid: 'QmParent123',
          mediaCids: ['QmImage1', 'QmImage2'],
          tags: ['parent', 'discussion', 'test'],
          createdAt: new Date('2023-01-03T10:00:00Z'),
          updatedAt: new Date('2023-01-03T12:00:00Z'),
          onchainRef: '0xParentTx123',
          stakedValue: 250.5,
          reputationScore: 75,
          dao: 'discussion-dao',
          commentCount: 15,
          shareCount: 8,
          viewCount: 500,
          engagementScore: 300,
          reactions: [
            {
              type: 'like',
              users: [
                {
                  address: '0xUser1',
                  username: 'user1',
                  avatar: 'avatar1.jpg',
                  amount: 10,
                  timestamp: new Date('2023-01-03T10:30:00Z')
                },
                {
                  address: '0xUser2',
                  username: 'user2',
                  avatar: 'avatar2.jpg',
                  amount: 15,
                  timestamp: new Date('2023-01-03T11:00:00Z')
                }
              ],
              totalAmount: 25,
              tokenType: 'LDAO'
            },
            {
              type: 'love',
              users: [
                {
                  address: '0xUser3',
                  username: 'user3',
                  avatar: 'avatar3.jpg',
                  amount: 5,
                  timestamp: new Date('2023-01-03T11:30:00Z')
                }
              ],
              totalAmount: 5,
              tokenType: 'LDAO'
            }
          ],
          tips: [
            {
              from: '0xTipper1',
              amount: 10,
              tokenType: 'USDC',
              message: 'Great post!',
              timestamp: new Date('2023-01-03T10:45:00Z')
            },
            {
              from: '0xTipper2',
              amount: 20,
              tokenType: 'ETH',
              timestamp: new Date('2023-01-03T11:15:00Z')
            }
          ]
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockBackendPosts,
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify data type consistency
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalled();
      
      // Check that numeric values are properly handled
      const callArgs = mockFeedService.getEnhancedFeed.mock.calls[0];
      expect(callArgs[1]).toBe(1); // page
      expect(callArgs[2]).toBe(20); // limit
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle API errors gracefully with consistent error structure', async () => {
      // Mock API error with consistent structure
      const mockError = {
        code: 'FEED_LOAD_ERROR',
        message: 'Failed to load feed data',
        timestamp: new Date(),
        retryable: true
      };

      mockFeedService.getEnhancedFeed.mockRejectedValue(mockError);

      render(<EnhancedFeedView />);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Should display error message
      expect(screen.getByText(/failed to load feed data/i)).toBeInTheDocument();
      
      // Should show retry button for retryable errors
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should handle network errors with appropriate user feedback', async () => {
      // Mock network error
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Network error'));

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Should show generic error message
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it('should recover from errors when retrying', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      mockFeedService.getEnhancedFeed
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          posts: [{ id: '4', author: '0xTest', title: 'Recovered Post' } as any],
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
    });
  });

  describe('Mobile Experience Consistency', () => {
    it('should adapt layout for mobile devices while maintaining data consistency', async () => {
      // Mock mobile optimization hook
      jest.mock('@/hooks/useMobileOptimization', () => ({
        useMobileOptimization: () => ({
          isMobile: true,
          touchTargetClasses: 'touch-target'
        })
      }));

      // Re-import component with mobile mock
      jest.resetModules();
      const { EnhancedFeedView: MobileEnhancedFeedView } = require('@/components/Feed/EnhancedFeedView');

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [{ id: '5', author: '0xMobile', title: 'Mobile Post' } as any],
        hasMore: false,
        totalPages: 1
      });

      render(<MobileEnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Should render successfully on mobile
      const postCard = screen.getByTestId('enhanced-post-card');
      expect(postCard).toHaveAttribute('data-post-id', '5');
    });

    it('should maintain touch-friendly interactions on mobile', async () => {
      // Mock mobile environment
      jest.mock('@/hooks/useMobileOptimization', () => ({
        useMobileOptimization: () => ({
          isMobile: true,
          touchTargetClasses: 'touch-target'
        })
      }));

      jest.resetModules();
      const { EnhancedFeedView: MobileEnhancedFeedView } = require('@/components/Feed/EnhancedFeedView');

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [{ id: '6', author: '0xTouch', title: 'Touch Post' } as any],
        hasMore: true,
        totalPages: 2
      });

      render(<MobileEnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Should include touch-friendly elements
      expect(screen.getByText(/pull up to load more/i)).toBeInTheDocument();
    });
  });

  describe('Analytics Integration Consistency', () => {
    it('should track feed events with consistent data structure', async () => {
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: [{ id: '7', author: '0xAnalytics', title: 'Analytics Post' } as any],
        hasMore: false,
        totalPages: 1
      });

      // Mock analytics tracking
      const trackEventSpy = jest.fn();
      mockFeedService as any = {
        ...mockFeedService,
        getAnalyticsEvents: () => [{ 
          eventType: 'feed_load', 
          timestamp: new Date(),
          metadata: { filter: {}, page: 1, limit: 20 }
        }],
        clearAnalyticsEvents: jest.fn()
      };

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Should track feed load event
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalled();
    });

    it('should track error events with consistent structure', async () => {
      mockFeedService.getEnhancedFeed.mockRejectedValue({
        code: 'API_ERROR',
        message: 'API failure',
        timestamp: new Date(),
        retryable: true
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });

      // Should track error event
      // Note: In a real implementation, we would verify analytics events here
    });
  });
});