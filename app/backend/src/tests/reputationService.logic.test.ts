import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { ReputationService, ReputationFactors } from '../services/reputationService';

describe('ReputationService - Core Logic Tests', () => {
  let reputationService: ReputationService;

  beforeEach(() => {
    reputationService = new ReputationService();
  });

  describe('calculateReputationScore', () => {
    const baseFactors: ReputationFactors = {
      daoProposalSuccessRate: 75,
      votingParticipation: 80,
      investmentAdviceAccuracy: 70,
      communityContribution: 65,
      onchainActivity: 85
    };

    it('should calculate base score correctly', () => {
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

      const scoreWithReviews = reputationService.calculateReputationScore(baseFactors, reviewStats);
      const baseScore = reputationService.calculateReputationScore(baseFactors);
      
      expect(scoreWithReviews).toBeGreaterThan(baseScore);
    });

    it('should apply negative review penalty for low ratings', () => {
      const reviewStats = {
        averageRating: 2.0,
        totalReviews: 20,
        verifiedReviewsRatio: 0.7
      };

      const scoreWithReviews = reputationService.calculateReputationScore(baseFactors, reviewStats);
      const baseScore = reputationService.calculateReputationScore(baseFactors);
      
      expect(scoreWithReviews).toBeLessThan(baseScore);
    });

    it('should cap score at maximum 1000', () => {
      const highFactors: ReputationFactors = {
        daoProposalSuccessRate: 100,
        votingParticipation: 100,
        investmentAdviceAccuracy: 100,
        communityContribution: 100,
        onchainActivity: 100
      };

      const extremeReviewStats = {
        averageRating: 5.0,
        totalReviews: 1000,
        verifiedReviewsRatio: 1.0
      };

      const score = reputationService.calculateReputationScore(highFactors, extremeReviewStats);
      expect(score).toBeLessThanOrEqual(1000);
    });

    it('should cap score at minimum 0', () => {
      const lowFactors: ReputationFactors = {
        daoProposalSuccessRate: 0,
        votingParticipation: 0,
        investmentAdviceAccuracy: 0,
        communityContribution: 0,
        onchainActivity: 0
      };

      const badReviewStats = {
        averageRating: 1.0,
        totalReviews: 1000,
        verifiedReviewsRatio: 0.0
      };

      const score = reputationService.calculateReputationScore(lowFactors, badReviewStats);
      expect(score).toBeGreaterThanOrEqual(0);
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

  describe('Review Bonus Calculation Logic', () => {
    it('should calculate review bonus correctly for high ratings', () => {
      // Test the private method logic by testing the public method
      const baseFactors: ReputationFactors = {
        daoProposalSuccessRate: 50,
        votingParticipation: 50,
        investmentAdviceAccuracy: 50,
        communityContribution: 50,
        onchainActivity: 50
      };

      const highRatingStats = {
        averageRating: 4.5, // 1.5 above baseline of 3.0
        totalReviews: 100,
        verifiedReviewsRatio: 0.9
      };

      const lowRatingStats = {
        averageRating: 1.5, // 1.5 below baseline of 3.0
        totalReviews: 100,
        verifiedReviewsRatio: 0.9
      };

      const baseScore = reputationService.calculateReputationScore(baseFactors);
      const highRatingScore = reputationService.calculateReputationScore(baseFactors, highRatingStats);
      const lowRatingScore = reputationService.calculateReputationScore(baseFactors, lowRatingStats);

      // High rating should increase score
      expect(highRatingScore).toBeGreaterThan(baseScore);
      
      // Low rating should decrease score
      expect(lowRatingScore).toBeLessThan(baseScore);
      
      // The difference should be symmetric (approximately)
      const highDiff = highRatingScore - baseScore;
      const lowDiff = baseScore - lowRatingScore;
      expect(Math.abs(highDiff - lowDiff)).toBeLessThan(10); // Allow for volume multiplier differences
    });

    it('should apply volume multiplier correctly', () => {
      const baseFactors: ReputationFactors = {
        daoProposalSuccessRate: 50,
        votingParticipation: 50,
        investmentAdviceAccuracy: 50,
        communityContribution: 50,
        onchainActivity: 50
      };

      const lowVolumeStats = {
        averageRating: 4.0,
        totalReviews: 10,
        verifiedReviewsRatio: 0.8
      };

      const highVolumeStats = {
        averageRating: 4.0,
        totalReviews: 200,
        verifiedReviewsRatio: 0.8
      };

      const lowVolumeScore = reputationService.calculateReputationScore(baseFactors, lowVolumeStats);
      const highVolumeScore = reputationService.calculateReputationScore(baseFactors, highVolumeStats);

      // Higher volume should result in higher score (due to volume multiplier)
      expect(highVolumeScore).toBeGreaterThan(lowVolumeScore);
    });

    it('should apply verification bonus correctly', () => {
      const baseFactors: ReputationFactors = {
        daoProposalSuccessRate: 50,
        votingParticipation: 50,
        investmentAdviceAccuracy: 50,
        communityContribution: 50,
        onchainActivity: 50
      };

      const lowVerifiedStats = {
        averageRating: 4.0,
        totalReviews: 50,
        verifiedReviewsRatio: 0.3 // Below 0.5 baseline
      };

      const highVerifiedStats = {
        averageRating: 4.0,
        totalReviews: 50,
        verifiedReviewsRatio: 0.9 // Above 0.5 baseline
      };

      const lowVerifiedScore = reputationService.calculateReputationScore(baseFactors, lowVerifiedStats);
      const highVerifiedScore = reputationService.calculateReputationScore(baseFactors, highVerifiedStats);

      // Higher verification ratio should result in higher score
      expect(highVerifiedScore).toBeGreaterThan(lowVerifiedScore);
    });
  });
});
