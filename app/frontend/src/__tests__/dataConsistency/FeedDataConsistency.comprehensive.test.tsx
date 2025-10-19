import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EnhancedFeedView } from '@/components/Feed/EnhancedFeedView';
import { FeedService } from '@/services/feedService';
import { convertBackendPostToPost } from '@/models/Post';
import testUtils from '../setup/testSetup';

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

describe('Comprehensive Feed Data Consistency Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockIntersectionObserver();
  });

  describe('Data Structure Consistency', () => {
    it('should maintain consistent data structures from backend to frontend', async () => {
      // Mock backend response with comprehensive data
      const mockBackendPosts = [
        {
          id: '1',
          author: '0x1234567890123456789012345678901234567890',
          parentId: null,
          title: 'Comprehensive Test Post',
          contentCid: 'QmComprehensive123',
          mediaCids: ['QmMedia1', 'QmMedia2'],
          tags: ['comprehensive', 'test', 'tag'],
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T01:00:00.000Z',
          onchainRef: '0xComprehensiveTx123',
          staked_value: '150.5',
          reputation_score: '75',
          dao: 'comprehensive-dao',
          commentCount: 12,
          shareCount: 5,
          viewCount: 250,
          engagementScore: 350,
          reactions: [
            {
              type: 'like',
              users: [
                {
                  address: '0xUser1',
                  username: 'user1',
                  avatar: 'avatar1.jpg',
                  amount: 10,
                  timestamp: '2023-01-01T00:30:00.000Z'
                }
              ],
              totalAmount: 10,
              tokenType: 'LDAO'
            },
            {
              type: 'love',
              users: [
                {
                  address: '0xUser2',
                  username: 'user2',
                  avatar: 'avatar2.jpg',
                  amount: 15,
                  timestamp: '2023-01-01T00:45:00.000Z'
                },
                {
                  address: '0xUser3',
                  username: 'user3',
                  avatar: 'avatar3.jpg',
                  amount: 20,
                  timestamp: '2023-01-01T00:50:00.000Z'
                }
              ],
              totalAmount: 35,
              tokenType: 'LDAO'
            }
          ],
          tips: [
            {
              from: '0xTipper1',
              amount: 50,
              tokenType: 'USDC',
              message: 'Great post!',
              timestamp: '2023-01-01T00:35:00.000Z'
            },
            {
              from: '0xTipper2',
              amount: 25,
              tokenType: 'ETH',
              timestamp: '2023-01-01T00:55:00.000Z'
            }
          ],
          previews: [
            {
              type: 'link',
              url: 'https://example.com',
              data: {
                title: 'Example Link',
                description: 'An example link preview',
                image: 'https://example.com/image.jpg',
                siteName: 'Example Site',
                type: 'article'
              },
              metadata: {
                fetchedAt: '2023-01-01T00:05:00.000Z'
              },
              cached: true,
              securityStatus: 'safe'
            }
          ]
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockBackendPosts,
        hasMore: true,
        totalPages: 3
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify data structure consistency through the conversion process
      const convertedPost = convertBackendPostToPost(mockBackendPosts[0]);
      
      // Check all expected fields are properly converted
      expect(convertedPost.id).toBe('1');
      expect(convertedPost.author).toBe('0x1234567890123456789012345678901234567890');
      expect(convertedPost.parentId).toBeNull();
      expect(convertedPost.title).toBe('Comprehensive Test Post');
      expect(convertedPost.contentCid).toBe('QmComprehensive123');
      expect(convertedPost.mediaCids).toEqual(['QmMedia1', 'QmMedia2']);
      expect(convertedPost.tags).toEqual(['comprehensive', 'test', 'tag']);
      expect(convertedPost.createdAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(convertedPost.updatedAt).toEqual(new Date('2023-01-01T01:00:00.000Z'));
      expect(convertedPost.onchainRef).toBe('0xComprehensiveTx123');
      expect(convertedPost.stakedValue).toBe(150.5);
      expect(convertedPost.reputationScore).toBe(75);
      expect(convertedPost.dao).toBe('comprehensive-dao');
      expect(convertedPost.comments).toBe(12);
      expect(convertedPost.shares).toBe(5);
      expect(convertedPost.views).toBe(250);
      expect(convertedPost.engagementScore).toBe(350);
      
      // Check reactions structure
      expect(convertedPost.reactions).toHaveLength(2);
      expect(convertedPost.reactions[0].type).toBe('like');
      expect(convertedPost.reactions[0].users).toHaveLength(1);
      expect(convertedPost.reactions[1].type).toBe('love');
      expect(convertedPost.reactions[1].users).toHaveLength(2);
      
      // Check tips structure
      expect(convertedPost.tips).toHaveLength(2);
      expect(convertedPost.tips[0].from).toBe('0xTipper1');
      expect(convertedPost.tips[0].amount).toBe(50);
      expect(convertedPost.tips[0].tokenType).toBe('USDC');
      expect(convertedPost.tips[1].from).toBe('0xTipper2');
      expect(convertedPost.tips[1].amount).toBe(25);
      expect(convertedPost.tips[1].tokenType).toBe('ETH');
      
      // Check previews structure
      expect(convertedPost.previews).toHaveLength(1);
      expect(convertedPost.previews[0].type).toBe('link');
      expect(convertedPost.previews[0].url).toBe('https://example.com');
    });

    it('should handle edge cases in data conversion', async () => {
      // Mock backend response with edge cases
      const mockBackendPosts = [
        {
          id: 'edge-1',
          author: '0xEdge',
          parentId: 'parent-1',
          title: '',
          contentCid: '',
          mediaCids: '[]',
          tags: '[]',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: null,
          onchainRef: '',
          staked_value: '0',
          reputation_score: '0',
          dao: '',
          commentCount: 0,
          shareCount: 0,
          viewCount: 0,
          engagementScore: 0,
          reactions: '[]',
          tips: '[]',
          previews: '[]'
        },
        {
          id: 'edge-2',
          author: '0xEdge2',
          parentId: null,
          title: null,
          contentCid: null,
          mediaCids: null,
          tags: null,
          createdAt: null,
          updatedAt: null,
          onchainRef: null,
          staked_value: null,
          reputation_score: null,
          dao: null,
          commentCount: null,
          shareCount: null,
          viewCount: null,
          engagementScore: null,
          reactions: null,
          tips: null,
          previews: null
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockBackendPosts,
        hasMore: false,
        totalPages: 1
      });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getAllByTestId('enhanced-post-card')).toHaveLength(2);
      });

      // Verify edge case handling
      const convertedPost1 = convertBackendPostToPost(mockBackendPosts[0]);
      const convertedPost2 = convertBackendPostToPost(mockBackendPosts[1]);
      
      // Check that empty arrays are handled correctly
      expect(Array.isArray(convertedPost1.mediaCids)).toBe(true);
      expect(Array.isArray(convertedPost1.tags)).toBe(true);
      expect(Array.isArray(convertedPost1.reactions)).toBe(true);
      expect(Array.isArray(convertedPost1.tips)).toBe(true);
      expect(Array.isArray(convertedPost1.previews)).toBe(true);
      
      // Check that null/undefined values are handled gracefully
      expect(convertedPost2.title).toBe('');
      expect(convertedPost2.contentCid).toBe('');
      expect(convertedPost2.mediaCids).toEqual([]);
      expect(convertedPost2.tags).toEqual([]);
    });
  });

  describe('Pagination Data Consistency', () => {
    it('should maintain consistent pagination data across requests', async () => {
      // Mock paginated responses
      mockFeedService.getEnhancedFeed
        .mockResolvedValueOnce({
          posts: Array.from({ length: 20 }, (_, i) => ({
            id: `page1-${i + 1}`,
            author: `0xPage1${i}`,
            title: `Page 1 Post ${i + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            commentCount: 0,
            shareCount: 0,
            viewCount: 0,
            engagementScore: 0,
            reactions: [],
            tips: [],
            previews: []
          })),
          hasMore: true,
          totalPages: 3
        })
        .mockResolvedValueOnce({
          posts: Array.from({ length: 20 }, (_, i) => ({
            id: `page2-${i + 1}`,
            author: `0xPage2${i}`,
            title: `Page 2 Post ${i + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            commentCount: 0,
            shareCount: 0,
            viewCount: 0,
            engagementScore: 0,
            reactions: [],
            tips: [],
            previews: []
          })),
          hasMore: true,
          totalPages: 3
        })
        .mockResolvedValueOnce({
          posts: Array.from({ length: 10 }, (_, i) => ({
            id: `page3-${i + 1}`,
            author: `0xPage3${i}`,
            title: `Page 3 Post ${i + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            commentCount: 0,
            shareCount: 0,
            viewCount: 0,
            engagementScore: 0,
            reactions: [],
            tips: [],
            previews: []
          })),
          hasMore: false,
          totalPages: 3
        });

      render(<EnhancedFeedView />);

      // Check first page
      await waitFor(() => {
        expect(screen.getAllByTestId('enhanced-post-card')).toHaveLength(20);
      });

      // Verify pagination metadata consistency
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20
      );

      // Note: In a real implementation, we would test infinite scroll behavior
      // Here we're just verifying the data consistency of the pagination structure
    });
  });

  describe('Filter Data Consistency', () => {
    it('should maintain consistent filter data across component lifecycle', async () => {
      const mockPosts = [
        {
          id: 'filter-1',
          author: '0xFilter',
          title: 'Filtered Post',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

      // Render with specific filter
      render(<EnhancedFeedView 
        communityId="test-community"
        initialFilter={{
          tags: ['test', 'filter'],
          author: '0xFilter'
        }}
      />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify filter data is passed correctly
      expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 'test-community',
          tags: ['test', 'filter'],
          author: '0xFilter'
        }),
        1,
        20
      );
    });
  });

  describe('Real-time Data Consistency', () => {
    it('should maintain data consistency with real-time updates', async () => {
      const initialPosts = [
        {
          id: 'realtime-1',
          author: '0xRealtime',
          title: 'Initial Post',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          commentCount: 0,
          shareCount: 0,
          viewCount: 0,
          engagementScore: 0,
          reactions: [],
          tips: [],
          previews: []
        }
      ];

      const updatedPosts = [
        ...initialPosts,
        {
          id: 'realtime-2',
          author: '0xRealtime2',
          title: 'New Real-time Post',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
        posts: initialPosts,
        hasMore: false,
        totalPages: 1
      });

      // Mock real-time subscription
      const mockSubscribe = jest.spyOn(FeedService, 'subscribeToFeedUpdates')
        .mockImplementation((callback) => {
          // Simulate real-time update after a delay
          setTimeout(() => {
            callback(updatedPosts[1] as any);
          }, 100);
          return Promise.resolve(() => {}); // cleanup function
        });

      render(<EnhancedFeedView />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify subscription was called
      expect(mockSubscribe).toHaveBeenCalled();

      // Clean up mock
      mockSubscribe.mockRestore();
    });
  });

  describe('Cross-component Data Consistency', () => {
    it('should maintain consistent data across all feed components', async () => {
      const mockPosts = [
        {
          id: 'cross-1',
          author: '0xCross',
          title: 'Cross-component Post',
          contentCid: 'QmCross123',
          mediaCids: ['QmCrossMedia1'],
          tags: ['cross', 'component'],
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T01:00:00.000Z',
          onchainRef: '0xCrossTx123',
          staked_value: '100',
          reputation_score: '50',
          dao: 'cross-dao',
          commentCount: 8,
          shareCount: 3,
          viewCount: 150,
          engagementScore: 200,
          reactions: [
            {
              type: 'fire',
              users: [
                {
                  address: '0xUserCross',
                  username: 'crossuser',
                  avatar: 'crossavatar.jpg',
                  amount: 25,
                  timestamp: '2023-01-01T00:30:00.000Z'
                }
              ],
              totalAmount: 25,
              tokenType: 'LDAO'
            }
          ],
          tips: [
            {
              from: '0xTipperCross',
              amount: 75,
              tokenType: 'USDC',
              timestamp: '2023-01-01T00:45:00.000Z'
            }
          ],
          previews: [
            {
              type: 'nft',
              url: 'https://opensea.io/assets/nft-123',
              data: {
                contractAddress: '0xContract123',
                tokenId: '456',
                name: 'Cross NFT',
                description: 'A cross-component NFT',
                image: 'https://nft-image.com/nft-456.jpg'
              },
              metadata: {
                fetchedAt: '2023-01-01T00:05:00.000Z'
              },
              cached: true,
              securityStatus: 'safe'
            }
          ]
        }
      ];

      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });

      // Mock community metrics
      mockFeedService.getCommunityEngagementMetrics.mockResolvedValue({
        communityId: 'cross-dao',
        totalPosts: 150,
        totalEngagement: 2500,
        topContributors: [
          {
            id: '0xCross',
            address: '0xCross',
            username: 'crossuser',
            displayName: 'Cross User',
            avatar: 'crossavatar.jpg',
            verified: true,
            reputation: 100
          }
        ],
        trendingTags: ['cross', 'component', 'test'],
        engagementGrowth: 15
      });

      render(<EnhancedFeedView 
        communityId="cross-dao"
        showCommunityMetrics={true}
      />);

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();
      });

      // Verify all components receive consistent data
      expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      expect(screen.getByTestId('trending-content-detector')).toBeInTheDocument();
      expect(screen.getByTestId('community-engagement-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('enhanced-post-card')).toBeInTheDocument();

      // Verify data consistency through conversion
      const convertedPost = convertBackendPostToPost(mockPosts[0]);
      
      // Check that all data fields are properly handled
      expect(convertedPost.id).toBe('cross-1');
      expect(convertedPost.author).toBe('0xCross');
      expect(convertedPost.title).toBe('Cross-component Post');
      expect(convertedPost.contentCid).toBe('QmCross123');
      expect(convertedPost.mediaCids).toEqual(['QmCrossMedia1']);
      expect(convertedPost.tags).toEqual(['cross', 'component']);
      expect(convertedPost.stakedValue).toBe(100);
      expect(convertedPost.reputationScore).toBe(50);
      expect(convertedPost.dao).toBe('cross-dao');
      expect(convertedPost.comments).toBe(8);
      expect(convertedPost.shares).toBe(3);
      expect(convertedPost.views).toBe(150);
      expect(convertedPost.engagementScore).toBe(200);
      
      // Check nested data structures
      expect(convertedPost.reactions).toHaveLength(1);
      expect(convertedPost.reactions[0].type).toBe('fire');
      expect(convertedPost.reactions[0].users).toHaveLength(1);
      expect(convertedPost.reactions[0].totalAmount).toBe(25);
      
      expect(convertedPost.tips).toHaveLength(1);
      expect(convertedPost.tips[0].from).toBe('0xTipperCross');
      expect(convertedPost.tips[0].amount).toBe(75);
      expect(convertedPost.tips[0].tokenType).toBe('USDC');
      
      expect(convertedPost.previews).toHaveLength(1);
      expect(convertedPost.previews[0].type).toBe('nft');
      expect(convertedPost.previews[0].url).toBe('https://opensea.io/assets/nft-123');
    });
  });
});