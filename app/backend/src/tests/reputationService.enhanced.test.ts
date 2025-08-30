import { ReputationService, ReputationFactors } from '../services/reputationService';

// Mock the database service
jest.mock('../services/databaseService', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    getAllUsersWithReputation: jest.fn(),
    updateUserVisibilityBoost: jest.fn()
  })),
  databaseService: {
    getAllUsersWithReputation: jest.fn(),
    updateUserVisibilityBoost: jest.fn()
  }
}));

describe('ReputationService - Enhanced Features', () => {
  let reputationService: ReputationService;

  beforeEach(() => {
    reputationService = new ReputationService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateReputationScore with review stats', () => {
    const baseFactors: ReputationFactors = {
      daoProposalSuccessRate: 75,
      votingParticipation: 80,
      investmentAdviceAccuracy: 70,
      communityContribution: 65,
      onchainActivity: 85
    };

    it('should calculate base score without review stats', () => {
      const score = reputationService.calculateReputationScore(baseFactors);
      
      // Expected calculation:
      // 75 * 0.3 + 80 * 0.2 + 70 * 0.25 + 65 * 0.15 + 85 * 0.1
      // = 22.5 + 16 + 17.5 + 9.75 + 8.5 = 74.25
      expect(score).toBe(74.3); // Rounded to 1 decimal place
    });

    it('should apply positive review bonus for high ratings', () => {
      const reviewStats = {
        averageRating: 4.5,
        totalReviews: 50,
        verifiedReviewsRatio: 0.9
      };

      const score = reputationService.calculateReputationScore(baseFactors, reviewStats);
      const baseScore = reputationService.calculateReputationScore(baseFactors);
      
      expect(score).toBeGreaterThan(baseScore);
    });

    it('should apply negative review penalty for low ratings', () => {
      const reviewStats = {
        averageRating: 2.0,
        totalReviews: 20,
        verifiedReviewsRatio: 0.7
      };

      const score = reputationService.calculateReputationScore(baseFactors, reviewStats);
      const baseScore = reputationService.calculateReputationScore(baseFactors);
      
      expect(score).toBeLessThan(baseScore);
    });

    it('should apply volume multiplier for many reviews', () => {
      const highVolumeStats = {
        averageRating: 4.0,
        totalReviews: 200,
        verifiedReviewsRatio: 0.8
      };

      const lowVolumeStats = {
        averageRating: 4.0,
        totalReviews: 10,
        verifiedReviewsRatio: 0.8
      };

      const highVolumeScore = reputationService.calculateReputationScore(baseFactors, highVolumeStats);
      const lowVolumeScore = reputationService.calculateReputationScore(baseFactors, lowVolumeStats);
      
      expect(highVolumeScore).toBeGreaterThan(lowVolumeScore);
    });

    it('should apply verification bonus for high verified ratio', () => {
      const highVerifiedStats = {
        averageRating: 4.0,
        totalReviews: 50,
        verifiedReviewsRatio: 0.95
      };

      const lowVerifiedStats = {
        averageRating: 4.0,
        totalReviews: 50,
        verifiedReviewsRatio: 0.3
      };

      const highVerifiedScore = reputationService.calculateReputationScore(baseFactors, highVerifiedStats);
      const lowVerifiedScore = reputationService.calculateReputationScore(baseFactors, lowVerifiedStats);
      
      expect(highVerifiedScore).toBeGreaterThan(lowVerifiedScore);
    });

    it('should cap bonus at maximum limits', () => {
      const extremeStats = {
        averageRating: 5.0,
        totalReviews: 1000,
        verifiedReviewsRatio: 1.0
      };

      const score = reputationService.calculateReputationScore(baseFactors, extremeStats);
      
      // Score should not exceed 1000
      expect(score).toBeLessThanOrEqual(1000);
    });

    it('should cap penalty at minimum limits', () => {
      const extremeStats = {
        averageRating: 1.0,
        totalReviews: 1000,
        verifiedReviewsRatio: 0.0
      };

      const score = reputationService.calculateReputationScore(baseFactors, extremeStats);
      
      // Score should not go below 0
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getSellerRankings', () => {
    it('should return ranked sellers with reputation scores', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          walletAddress: '0x123',
          handle: 'seller1',
          reputationScore: 800
        },
        {
          id: 'user-2',
          walletAddress: '0x456',
          handle: 'seller2',
          reputationScore: 750
        },
        {
          id: 'user-3',
          walletAddress: '0x789',
          handle: 'seller3',
          reputationScore: 900
        }
      ];

      // Mock the database service method
      const { databaseService } = require('../services/databaseService');
      databaseService.getAllUsersWithReputation = jest.fn().mockResolvedValue(mockUsers);

      const rankings = await reputationService.getSellerRankings(10);

      expect(rankings).toHaveLength(3);
      
      // Should be sorted by reputation score (highest first)
      expect(rankings[0].reputationScore).toBeGreaterThanOrEqual(rankings[1].reputationScore);
      expect(rankings[1].reputationScore).toBeGreaterThanOrEqual(rankings[2].reputationScore);
      
      // Should have correct ranks
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);
      expect(rankings[2].rank).toBe(3);
      
      // Should include all required fields
      expect(rankings[0]).toHaveProperty('userId');
      expect(rankings[0]).toHaveProperty('walletAddress');
      expect(rankings[0]).toHaveProperty('tier');
      expect(rankings[0]).toHaveProperty('reviewStats');
    });

    it('should limit results to specified count', async () => {
      const mockUsers = Array(100).fill(null).map((_, i) => ({
        id: `user-${i}`,
        walletAddress: `0x${i.toString().padStart(40, '0')}`,
        handle: `seller${i}`,
        reputationScore: 1000 - i
      }));

      const { databaseService } = require('../services/databaseService');
      databaseService.getAllUsersWithReputation = jest.fn().mockResolvedValue(mockUsers);

      const rankings = await reputationService.getSellerRankings(25);

      expect(rankings).toHaveLength(25);
    });

    it('should handle empty user list', async () => {
      const { databaseService } = require('../services/databaseService');
      databaseService.getAllUsersWithReputation = jest.fn().mockResolvedValue([]);

      const rankings = await reputationService.getSellerRankings(10);

      expect(rankings).toHaveLength(0);
    });
  });

  describe('updateSellerVisibility', () => {
    it('should update visibility boost based on reputation tier', async () => {
      const userId = 'user-123';
      
      // Mock reputation data for Master tier
      const mockReputation = {
        walletAddress: '0x123',
        totalScore: 850,
        tier: 'Master',
        factors: {
          daoProposalSuccessRate: 90,
          votingParticipation: 85,
          investmentAdviceAccuracy: 80,
          communityContribution: 75,
          onchainActivity: 90
        },
        lastUpdated: new Date()
      };

      reputationService.getUserReputation = jest.fn().mockResolvedValue(mockReputation);
      const { databaseService } = require('../services/databaseService');
      databaseService.updateUserVisibilityBoost = jest.fn().mockResolvedValue(undefined);

      await reputationService.updateSellerVisibility(userId);

      expect(databaseService.updateUserVisibilityBoost).toHaveBeenCalledWith(userId, 2.0);
    });

    it('should set different visibility boosts for different tiers', async () => {
      const testCases = [
        { tier: 'Master', expectedBoost: 2.0 },
        { tier: 'Expert', expectedBoost: 1.5 },
        { tier: 'Apprentice', expectedBoost: 1.2 },
        { tier: 'Novice', expectedBoost: 1.0 }
      ];

      for (const testCase of testCases) {
        const userId = `user-${testCase.tier}`;
        const mockReputation = {
          walletAddress: '0x123',
          totalScore: 500,
          tier: testCase.tier,
          factors: {
            daoProposalSuccessRate: 75,
            votingParticipation: 80,
            investmentAdviceAccuracy: 70,
            communityContribution: 65,
            onchainActivity: 85
          },
          lastUpdated: new Date()
        };

        reputationService.getUserReputation = jest.fn().mockResolvedValue(mockReputation);
        const { databaseService } = require('../services/databaseService');
        databaseService.updateUserVisibilityBoost = jest.fn().mockResolvedValue(undefined);

        await reputationService.updateSellerVisibility(userId);

        expect(databaseService.updateUserVisibilityBoost).toHaveBeenCalledWith(
          userId, 
          testCase.expectedBoost
        );
      }
    });

    it('should handle user with no reputation', async () => {
      const userId = 'user-no-reputation';
      
      reputationService.getUserReputation = jest.fn().mockResolvedValue(null);
      const { databaseService } = require('../services/databaseService');
      databaseService.updateUserVisibilityBoost = jest.fn().mockResolvedValue(undefined);

      await reputationService.updateSellerVisibility(userId);

      expect(databaseService.updateUserVisibilityBoost).not.toHaveBeenCalled();
    });
  });

  describe('calculateVotingWeight', () => {
    it('should calculate voting weight with reputation multiplier', () => {
      const tokenBalance = 1000;
      const reputationScore = 800;

      const votingWeight = reputationService.calculateVotingWeight(tokenBalance, reputationScore);

      // Expected: 1000 * (1.0 + (800/1000) * 0.2) = 1000 * 1.16 = 1160
      expect(Math.round(votingWeight)).toBe(1160);
    });

    it('should handle zero reputation', () => {
      const tokenBalance = 1000;
      const reputationScore = 0;

      const votingWeight = reputationService.calculateVotingWeight(tokenBalance, reputationScore);

      // Expected: 1000 * 1.0 = 1000
      expect(votingWeight).toBe(1000);
    });

    it('should handle maximum reputation', () => {
      const tokenBalance = 1000;
      const reputationScore = 1000;

      const votingWeight = reputationService.calculateVotingWeight(tokenBalance, reputationScore);

      // Expected: 1000 * (1.0 + (1000/1000) * 0.2) = 1000 * 1.2 = 1200
      expect(votingWeight).toBe(1200);
    });

    it('should handle zero token balance', () => {
      const tokenBalance = 0;
      const reputationScore = 800;

      const votingWeight = reputationService.calculateVotingWeight(tokenBalance, reputationScore);

      expect(votingWeight).toBe(0);
    });
  });

  describe('getReputationTier', () => {
    it('should return correct tier for each score range', () => {
      const testCases = [
        { score: 0, expectedTier: 'Novice' },
        { score: 250, expectedTier: 'Novice' },
        { score: 251, expectedTier: 'Apprentice' },
        { score: 500, expectedTier: 'Apprentice' },
        { score: 501, expectedTier: 'Expert' },
        { score: 750, expectedTier: 'Expert' },
        { score: 751, expectedTier: 'Master' },
        { score: 1000, expectedTier: 'Master' }
      ];

      testCases.forEach(testCase => {
        const tier = reputationService.getReputationTier(testCase.score);
        expect(tier).toBe(testCase.expectedTier);
      });
    });
  });
});