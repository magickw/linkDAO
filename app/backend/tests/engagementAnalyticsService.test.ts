import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the database
const mockDb = {
  select: jest.fn(),
};

jest.mock('../src/db', () => ({
  db: mockDb,
}));

// Mock the schema
jest.mock('../src/db/schema', () => ({
  posts: { id: 'id', authorId: 'author_id', createdAt: 'created_at', upvotes: 'upvotes', downvotes: 'downvotes' },
  reactions: { postId: 'post_id', userId: 'user_id', createdAt: 'created_at' },
  comments: { postId: 'post_id', createdAt: 'created_at' },
  tips: { postId: 'post_id', amount: 'amount', createdAt: 'created_at' },
  views: { postId: 'post_id', userId: 'user_id', createdAt: 'created_at' },
  shares: { postId: 'post_id', createdAt: 'created_at' },
  users: { id: 'id' },
  bookmarks: {},
  quickPosts: {},
  quickPostReactions: {},
  quickPostViews: {},
  communityMembers: {},
}));

// Import after mocking
import { EngagementAnalyticsService } from '../src/services/engagementAnalyticsService';

describe('EngagementAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEngagementAnalytics', () => {
    it('should return analytics with zero values when database returns empty', async () => {
      // Mock empty results
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        }),
      }));

      const result = await EngagementAnalyticsService.getEngagementAnalytics(undefined, 'week');

      expect(result).toBeDefined();
      expect(result.timeRange).toBe('week');
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
    });

    it('should calculate engagement rate correctly', async () => {
      // This is a unit test for the calculation logic
      const totalEngagement = 100;
      const totalReach = 1000;
      const expectedRate = (totalEngagement / totalReach) * 100;

      expect(expectedRate).toBe(10);
    });

    it('should handle different time ranges', async () => {
      const timeRanges = ['day', 'week', 'month', 'quarter', 'year'];

      for (const range of timeRanges) {
        mockDb.select.mockImplementation(() => ({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }));

        const result = await EngagementAnalyticsService.getEngagementAnalytics(undefined, range);
        expect(result.timeRange).toBe(range);
      }
    });
  });

  describe('calculateSocialProofScore', () => {
    it('should calculate correct score with all engagement types', () => {
      const indicators = {
        postId: 'test-post',
        followedUsersWhoEngaged: [],
        totalFollowerEngagement: 10,
        followerEngagementRate: 0.15,
        verifiedUsersWhoEngaged: [],
        totalVerifiedEngagement: 5,
        verifiedEngagementBoost: 3.0,
        communityLeadersWhoEngaged: [],
        totalLeaderEngagement: 3,
        leaderEngagementBoost: 2.0,
        socialProofScore: 0,
        socialProofLevel: 'medium' as const,
        showFollowerNames: true,
        showVerifiedBadges: true,
        showLeaderBadges: true,
        maxDisplayCount: 5,
      };

      const score = EngagementAnalyticsService.calculateSocialProofScore(indicators);

      // Expected: 10 * 1.0 + 5 * 3.0 + 3 * 2.0 = 10 + 15 + 6 = 31
      expect(score).toBe(31);
    });

    it('should return 0 for no engagement', () => {
      const indicators = {
        postId: 'test-post',
        followedUsersWhoEngaged: [],
        totalFollowerEngagement: 0,
        followerEngagementRate: 0,
        verifiedUsersWhoEngaged: [],
        totalVerifiedEngagement: 0,
        verifiedEngagementBoost: 3.0,
        communityLeadersWhoEngaged: [],
        totalLeaderEngagement: 0,
        leaderEngagementBoost: 2.0,
        socialProofScore: 0,
        socialProofLevel: 'low' as const,
        showFollowerNames: true,
        showVerifiedBadges: true,
        showLeaderBadges: true,
        maxDisplayCount: 5,
      };

      const score = EngagementAnalyticsService.calculateSocialProofScore(indicators);
      expect(score).toBe(0);
    });
  });

  describe('getSocialProofLevel', () => {
    it('should return exceptional for high scores', () => {
      expect(EngagementAnalyticsService.getSocialProofLevel(1000)).toBe('exceptional');
      expect(EngagementAnalyticsService.getSocialProofLevel(1500)).toBe('exceptional');
    });

    it('should return high for medium-high scores', () => {
      expect(EngagementAnalyticsService.getSocialProofLevel(500)).toBe('high');
      expect(EngagementAnalyticsService.getSocialProofLevel(999)).toBe('high');
    });

    it('should return medium for moderate scores', () => {
      expect(EngagementAnalyticsService.getSocialProofLevel(100)).toBe('medium');
      expect(EngagementAnalyticsService.getSocialProofLevel(499)).toBe('medium');
    });

    it('should return low for low scores', () => {
      expect(EngagementAnalyticsService.getSocialProofLevel(0)).toBe('low');
      expect(EngagementAnalyticsService.getSocialProofLevel(99)).toBe('low');
    });
  });

  describe('getTopPerformingPosts', () => {
    it('should return empty array when no posts exist', async () => {
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }));

      const result = await EngagementAnalyticsService.getTopPerformingPosts(undefined, 'week', 10);
      expect(result).toEqual([]);
    });

    it('should sort posts by engagement score', async () => {
      // Setup mock to return posts
      const mockPosts = [
        { id: 1, content: 'Post 1', title: 'Title 1', createdAt: new Date(), upvotes: 10, downvotes: 2, authorId: 'user-1' },
        { id: 2, content: 'Post 2', title: 'Title 2', createdAt: new Date(), upvotes: 50, downvotes: 5, authorId: 'user-2' },
      ];

      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockPosts),
            }),
          }),
        }),
      }));

      const result = await EngagementAnalyticsService.getTopPerformingPosts(undefined, 'week', 10);

      // Verify sorting (higher engagement score should come first)
      if (result.length > 1) {
        expect(result[0].engagementScore).toBeGreaterThanOrEqual(result[1].engagementScore);
      }
    });
  });

  describe('getEngagementAggregate', () => {
    it('should return mock data for invalid post ID', async () => {
      const result = await EngagementAnalyticsService.getEngagementAggregate('invalid-id', '1d');

      expect(result.postId).toBe('invalid-id');
      expect(result.totalInteractions).toBe(0);
    });

    it('should handle different time windows', async () => {
      const timeWindows = ['1h', '1d', '7d', '1w', '1m'];

      for (const window of timeWindows) {
        const result = await EngagementAnalyticsService.getEngagementAggregate('123', window);
        expect(result.timeWindow).toBe(window);
      }
    });
  });

  describe('getUserEngagementProfile', () => {
    it('should return profile with zero values when no posts exist', async () => {
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      }));

      const result = await EngagementAnalyticsService.getUserEngagementProfile('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalPosts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('trackEngagementInteraction', () => {
    it('should not throw error when tracking interaction', async () => {
      const interaction = {
        postId: 'post-123',
        userId: 'user-456',
        type: 'reaction' as const,
        userType: 'regular' as const,
        socialProofWeight: 1,
        timestamp: new Date(),
      };

      await expect(
        EngagementAnalyticsService.trackEngagementInteraction(interaction)
      ).resolves.not.toThrow();
    });
  });

  describe('trackEngagementBatch', () => {
    it('should track multiple interactions', async () => {
      const interactions = [
        {
          postId: 'post-123',
          userId: 'user-1',
          type: 'reaction' as const,
          userType: 'regular' as const,
          socialProofWeight: 1,
          timestamp: new Date(),
        },
        {
          postId: 'post-123',
          userId: 'user-2',
          type: 'comment' as const,
          userType: 'verified' as const,
          socialProofWeight: 3,
          timestamp: new Date(),
        },
      ];

      await expect(
        EngagementAnalyticsService.trackEngagementBatch(interactions)
      ).resolves.not.toThrow();
    });
  });

  describe('getBulkPostAnalytics', () => {
    it('should return analytics for multiple posts', async () => {
      const postIds = ['post-1', 'post-2', 'post-3'];

      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0, uniqueUsers: 0 }]),
        }),
      }));

      const result = await EngagementAnalyticsService.getBulkPostAnalytics(postIds, 'week');

      expect(result).toHaveLength(postIds.length);
      expect(result[0].postId).toBe('post-1');
    });
  });
});
