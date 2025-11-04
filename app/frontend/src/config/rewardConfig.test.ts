import { BigNumber } from 'ethers';
import { rewardConfig, calculateContentReward, calculateEngagementReward, calculateReferralReward, calculateMarketplaceReward } from '../config/rewardConfig';

describe('Reward Calculations', () => {
  describe('Content Creation Rewards', () => {
    it('should return max reward for high quality content', () => {
      const reward = calculateContentReward(95);
      expect(reward).toEqual(rewardConfig.contentCreation.maxReward);
    });

    it('should return medium reward for medium quality content', () => {
      const reward = calculateContentReward(80);
      expect(reward).toEqual(BigNumber.from('25000000000000000000')); // 25 LDAO
    });

    it('should return min reward for low quality content', () => {
      const reward = calculateContentReward(60);
      expect(reward).toEqual(rewardConfig.contentCreation.minReward);
    });

    it('should return 0 for poor quality content', () => {
      const reward = calculateContentReward(40);
      expect(reward).toEqual(BigNumber.from(0));
    });
  });

  describe('Community Engagement Rewards', () => {
    it('should calculate correct engagement reward', () => {
      const metrics = {
        likes: 10,
        replies: 5,
        helpfulnessScore: 2
      };
      const reward = calculateEngagementReward(metrics);
      // Expected: (10 * 0.5) + (5 * 1) + (2 * 2) = 14 LDAO
      expect(reward).toEqual(BigNumber.from('14000000000000000000'));
    });

    it('should cap reward at maximum', () => {
      const metrics = {
        likes: 50,
        replies: 20,
        helpfulnessScore: 5
      };
      const reward = calculateEngagementReward(metrics);
      expect(reward).toEqual(rewardConfig.communityEngagement.maxReward);
    });

    it('should enforce minimum reward', () => {
      const metrics = {
        likes: 1,
        replies: 0,
        helpfulnessScore: 0
      };
      const reward = calculateEngagementReward(metrics);
      expect(reward).toEqual(rewardConfig.communityEngagement.minReward);
    });
  });

  describe('Referral Program Rewards', () => {
    it('should calculate 10% of purchase amount', () => {
      const purchaseAmount = BigNumber.from('1000000000000000000000'); // 1000 LDAO
      const reward = calculateReferralReward(purchaseAmount);
      expect(reward).toEqual(BigNumber.from('100000000000000000000')); // 100 LDAO
    });
  });

  describe('Marketplace Transaction Rewards', () => {
    it('should calculate 0.1% of transaction value', () => {
      const transactionValue = BigNumber.from('1000000000000000000000'); // 1000 LDAO
      const reward = calculateMarketplaceReward(transactionValue);
      expect(reward).toEqual(BigNumber.from('1000000000000000000')); // 1 LDAO
    });
  });
});