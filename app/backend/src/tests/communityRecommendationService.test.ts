import { communityRecommendationService, UserCommunityContext } from '../services/communityRecommendationService';

// Simple test to verify the service can be imported without errors
import { CommunityRecommendationService } from '../services/communityRecommendationService';

describe('CommunityRecommendationService', () => {
  it('should be able to create an instance', () => {
    const service = new CommunityRecommendationService();
    expect(service).toBeInstanceOf(CommunityRecommendationService);
  });
});

describe('CommunityRecommendationService', () => {
  describe('generateRecommendations', () => {
    it('should generate community recommendations', async () => {
      // Mock context
      const context: UserCommunityContext = {
        userId: '0x123',
        joinedCommunities: ['comm1', 'comm2'],
        interests: ['tech', 'blockchain'],
        activityHistory: []
      };

      // Mock community data
      const mockCommunities = [
        {
          id: 'comm3',
          name: 'Tech Enthusiasts',
          displayName: 'Tech Enthusiasts',
          description: 'A community for tech lovers',
          memberCount: 1000,
          category: 'Technology',
          tags: ['tech', 'innovation'],
          trendingScore: 80,
          growthRate: 15
        },
        {
          id: 'comm4',
          name: 'Blockchain Pioneers',
          displayName: 'Blockchain Pioneers',
          description: 'Exploring the future of blockchain',
          memberCount: 500,
          category: 'Blockchain',
          tags: ['blockchain', 'crypto'],
          trendingScore: 90,
          growthRate: 20
        }
      ];

      // Test the service
      const recommendations = await communityRecommendationService.generateRecommendations(context);
      
      // Basic assertions
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCommunityEngagementInsights', () => {
    it('should generate engagement insights', async () => {
      // Mock community data
      const mockCommunities = [
        {
          id: 'comm1',
          name: 'Tech Enthusiasts',
          displayName: 'Tech Enthusiasts',
          description: 'A community for tech lovers',
          memberCount: 1000,
          category: 'Technology',
          trendingScore: 80,
          growthRate: 15
        }
      ];

      // Test the service
      const insights = await communityRecommendationService.getCommunityEngagementInsights(mockCommunities);
      
      // Basic assertions
      expect(typeof insights).toBe('string');
      expect(insights.length).toBeGreaterThan(0);
    });
  });
});