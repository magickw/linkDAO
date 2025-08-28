import { ReputationService, ReputationFactors } from '../services/reputationService';

describe('ReputationService', () => {
  let reputationService: ReputationService;

  beforeEach(() => {
    reputationService = new ReputationService();
  });

  describe('calculateReputationScore', () => {
    it('should calculate reputation score correctly', () => {
      const factors: ReputationFactors = {
        daoProposalSuccessRate: 80,
        votingParticipation: 90,
        investmentAdviceAccuracy: 70,
        communityContribution: 85,
        onchainActivity: 95
      };

      const score = reputationService.calculateReputationScore(factors);
      // Expected: (80*0.3) + (90*0.2) + (70*0.25) + (85*0.15) + (95*0.1) = 24 + 18 + 17.5 + 12.75 + 9.5 = 81.75
      expect(score).toBe(81.8); // Rounded to one decimal
    });

    it('should cap score at 1000', () => {
      const factors: ReputationFactors = {
        daoProposalSuccessRate: 100,
        votingParticipation: 100,
        investmentAdviceAccuracy: 100,
        communityContribution: 100,
        onchainActivity: 100
      };

      const score = reputationService.calculateReputationScore(factors);
      expect(score).toBe(100);
    });

    it('should handle minimum values correctly', () => {
      const factors: ReputationFactors = {
        daoProposalSuccessRate: 0,
        votingParticipation: 0,
        investmentAdviceAccuracy: 0,
        communityContribution: 0,
        onchainActivity: 0
      };

      const score = reputationService.calculateReputationScore(factors);
      expect(score).toBe(0);
    });
  });

  describe('getReputationTier', () => {
    it('should return correct tier for Master', () => {
      const tier = reputationService.getReputationTier(900);
      expect(tier).toBe('Master');
    });

    it('should return correct tier for Expert', () => {
      const tier = reputationService.getReputationTier(700);
      expect(tier).toBe('Expert');
    });

    it('should return correct tier for Apprentice', () => {
      const tier = reputationService.getReputationTier(400);
      expect(tier).toBe('Apprentice');
    });

    it('should return correct tier for Novice', () => {
      const tier = reputationService.getReputationTier(100);
      expect(tier).toBe('Novice');
    });
  });

  describe('calculateVotingWeight', () => {
    it('should calculate voting weight with reputation multiplier', () => {
      const weight = reputationService.calculateVotingWeight(1000, 500); // 1000 tokens, 500 reputation
      // Expected: 1000 * (1.0 + (500/1000) * 0.2) = 1000 * (1.0 + 0.1) = 1000 * 1.1 = 1100
      expect(weight).toBe(1100); // Should be more than base tokens
    });

    it('should calculate voting weight without reputation', () => {
      const weight = reputationService.calculateVotingWeight(1000, 0); // 1000 tokens, 0 reputation
      // Expected: 1000 * (1.0 + (0/1000) * 0.2) = 1000 * 1.0 = 1000
      expect(weight).toBe(1000); // Should equal base tokens
    });
  });
});