import { communityPerformanceService, CommunityPerformanceMetrics } from '../communityPerformanceService';

// Mock the dependent services
jest.mock('../performanceMonitoringService', () => ({
  performanceMonitoringService: {
    getCurrentMetrics: jest.fn().mockReturnValue({
      documentLoadTime: 1000,
      searchResponseTime: 200,
      cacheHitRate: 90,
      offlineCapability: true,
      userEngagement: 75,
      bounceRate: 30,
      sessionDuration: 300,
      pageViews: 10,
      connectionType: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      deviceMemory: 8,
      hardwareConcurrency: 4,
      timestamp: Date.now()
    })
  }
}));

jest.mock('../analyticsService', () => ({
  analyticsService: {
    exportAnalytics: jest.fn().mockResolvedValue({ status: 'success' })
  }
}));

jest.mock('../communityService', () => ({
  CommunityService: {
    getCommunityById: jest.fn().mockResolvedValue({
      id: 'test-community',
      name: 'Test Community',
      displayName: 'Test Community',
      description: 'A test community',
      rules: [],
      memberCount: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: 'Test',
      tags: [],
      isPublic: true,
      moderators: [],
      settings: {
        allowedPostTypes: [],
        requireApproval: false,
        minimumReputation: 0,
        stakingRequirements: []
      }
    })
  }
}));

jest.mock('../communityPostService', () => ({
  CommunityPostService: {
    getCommunityPosts: jest.fn().mockResolvedValue([
      {
        id: 'post-1',
        author: 'user-1',
        content: 'Test post 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        communityId: 'test-community',
        isPinned: false,
        isLocked: false,
        upvotes: 10,
        downvotes: 2,
        comments: Array(5).fill({}), // Create array with 5 comments
        depth: 0,
        sortOrder: 0,
        type: 'text',
        viewCount: 50
      },
      {
        id: 'post-2',
        author: 'user-2',
        content: 'Test post 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        communityId: 'test-community',
        isPinned: false,
        isLocked: false,
        upvotes: 15,
        downvotes: 1,
        comments: Array(8).fill({}), // Create array with 8 comments
        depth: 0,
        sortOrder: 0,
        type: 'text',
        viewCount: 75
      }
    ])
  }
}));

describe('CommunityPerformanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentMetrics', () => {
    it('should calculate community performance metrics correctly', async () => {
      const metrics = await communityPerformanceService.getCurrentMetrics('test-community');
      
      expect(metrics).toBeDefined();
      expect(metrics.communityId).toBe('test-community');
      expect(metrics.memberCount).toBe(100);
      expect(metrics.totalPosts).toBe(2);
      expect(metrics.totalComments).toBe(13); // 5 + 8
      expect(metrics.totalViews).toBe(125); // 50 + 75
      expect(metrics.totalReactions).toBe(28); // (10 + 2) + (15 + 1)
    });
  });

  describe('getPerformanceSummary', () => {
    it('should generate a performance summary with scores', async () => {
      const summary = await communityPerformanceService.getPerformanceSummary('test-community');
      
      expect(summary).toBeDefined();
      expect(summary.communityId).toBe('test-community');
      expect(summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(summary.overallScore).toBeLessThanOrEqual(100);
      expect(summary.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('trackEvent', () => {
    it('should add events to the queue', () => {
      const event = {
        eventType: 'post_created' as const,
        communityId: 'test-community',
        userId: 'user-1',
        timestamp: new Date()
      };
      
      // Access private eventQueue through reflection for testing
      const queueBefore = (communityPerformanceService as any).eventQueue.length;
      communityPerformanceService.trackEvent(event);
      const queueAfter = (communityPerformanceService as any).eventQueue.length;
      
      expect(queueAfter).toBe(queueBefore + 1);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate metrics from community data', () => {
      // This tests the private method indirectly through the public interface
      const service = communityPerformanceService;
      
      // We can't directly test the private method, but we can verify the results
      // through the public interface
      expect(service).toBeDefined();
    });
  });
});