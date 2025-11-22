import { ethers } from 'ethers';
import { ContentRewardService, ContentQualityMetrics } from '../services/contentRewardService';

describe('ContentRewardService', () => {
  let contentRewardService: ContentRewardService;

  beforeEach(() => {
    contentRewardService = ContentRewardService.getInstance();
  });

  describe('Content Reward Calculations', () => {
    const validMetrics: ContentQualityMetrics = {
      grammarScore: 90,
      uniquenessScore: 85,
      engagementScore: 95,
      communityValueScore: 88
    };

    it('should successfully award rewards for high-quality content', async () => {
      const result = await contentRewardService.awardContentReward(
        'test-content-1',
        '0x123...', // Test wallet address
        validMetrics
      );

      expect(result.success).toBe(true);
      expect(result.rewardAmount).toBeDefined();
      expect(BigNumber(result.rewardAmount!) > 0n).toBe(true);
    });

    it('should reject invalid quality metrics', async () => {
      const invalidMetrics: ContentQualityMetrics = {
        grammarScore: 150, // Invalid score > 100
        uniquenessScore: 85,
        engagementScore: 95,
        communityValueScore: 88
      };

      const result = await contentRewardService.awardContentReward(
        'test-content-2',
        '0x123...',
        invalidMetrics
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid grammar score');
    });

    it('should check content eligibility correctly', async () => {
      const isEligible = await contentRewardService.isContentEligible('test-content-3');
      expect(typeof isEligible).toBe('boolean');
    });

    it('should not reward already rewarded content', async () => {
      // First reward
      await contentRewardService.awardContentReward(
        'test-content-4',
        '0x123...',
        validMetrics
      );

      // Try to reward again
      const result = await contentRewardService.awardContentReward(
        'test-content-4',
        '0x123...',
        validMetrics
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been rewarded');
    });
  });
});