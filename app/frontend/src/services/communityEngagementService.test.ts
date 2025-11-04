import { BigNumber } from 'ethers';
import { CommunityEngagementService, EngagementMetrics } from '../services/communityEngagementService';

describe('CommunityEngagementService', () => {
  let engagementService: CommunityEngagementService;

  beforeEach(() => {
    engagementService = CommunityEngagementService.getInstance();
  });

  describe('Engagement Reward Calculations', () => {
    const validMetrics: EngagementMetrics = {
      likes: 15,
      replies: 5,
      helpfulnessScore: 85,
      reportCount: 0,
      markedAsAnswer: true
    };

    it('should successfully award rewards for helpful comments', async () => {
      const result = await engagementService.awardEngagementReward(
        'test-comment-1',
        '0x123...', // Test wallet address
        validMetrics
      );

      expect(result.success).toBe(true);
      expect(result.rewardAmount).toBeDefined();
      expect(BigNumber.from(result.rewardAmount!).gt(0)).toBe(true);
    });

    it('should reject invalid metrics', async () => {
      const invalidMetrics: EngagementMetrics = {
        ...validMetrics,
        helpfulnessScore: 150 // Invalid score > 100
      };

      const result = await engagementService.awardEngagementReward(
        'test-comment-2',
        '0x123...',
        invalidMetrics
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Helpfulness score must be between 0 and 100');
    });

    it('should apply correct penalties for reported content', async () => {
      const reportedMetrics: EngagementMetrics = {
        ...validMetrics,
        reportCount: 2
      };

      const result = await engagementService.awardEngagementReward(
        'test-comment-3',
        '0x123...',
        reportedMetrics
      );

      expect(result.success).toBe(true);
      expect(BigNumber.from(result.rewardAmount!).lt(
        BigNumber.from(
          (await engagementService.awardEngagementReward(
            'test-comment-4',
            '0x123...',
            validMetrics
          )).rewardAmount!
        )
      )).toBe(true);
    });

    it('should give bonus for answers', async () => {
      const notAnswerMetrics: EngagementMetrics = {
        ...validMetrics,
        markedAsAnswer: false
      };

      const answerResult = await engagementService.awardEngagementReward(
        'test-comment-5',
        '0x123...',
        validMetrics
      );

      const notAnswerResult = await engagementService.awardEngagementReward(
        'test-comment-6',
        '0x123...',
        notAnswerMetrics
      );

      expect(BigNumber.from(answerResult.rewardAmount!).gt(
        BigNumber.from(notAnswerResult.rewardAmount!)
      )).toBe(true);
    });

    it('should track total user rewards correctly', async () => {
      const userAddress = '0x123...';

      // Award multiple rewards
      await engagementService.awardEngagementReward(
        'test-comment-7',
        userAddress,
        validMetrics
      );

      await engagementService.awardEngagementReward(
        'test-comment-8',
        userAddress,
        validMetrics
      );

      const totalRewards = await engagementService.getTotalEngagementRewards(userAddress);
      expect(BigNumber.from(totalRewards).gt(0)).toBe(true);
    });
  });
});