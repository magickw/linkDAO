import { BigNumber, ethers } from 'ethers';

export interface RewardRates {
  contentCreation: {
    minReward: BigNumber;
    maxReward: BigNumber;
    qualityThresholds: {
      low: number;    // Minimum score for low quality (10 LDAO)
      medium: number; // Minimum score for medium quality (25 LDAO)
      high: number;   // Minimum score for high quality (50 LDAO)
    };
  };
  communityEngagement: {
    minReward: BigNumber;
    maxReward: BigNumber;
    metrics: {
      likes: number;      // Reward multiplier for likes received
      replies: number;    // Reward multiplier for replies received
      helpfulness: number; // Reward multiplier for helpfulness score
    };
  };
  referralProgram: {
    percentage: number; // 10% of referee's first purchase
  };
  marketplace: {
    transactionRewardRate: number; // 0.1% of transaction value
  };
}

export const rewardConfig: RewardRates = {
  contentCreation: {
    minReward: ethers.utils.parseEther('10'), // 10 LDAO
    maxReward: ethers.utils.parseEther('50'), // 50 LDAO
    qualityThresholds: {
      low: 50,     // 50% quality score
      medium: 75,  // 75% quality score
      high: 90     // 90% quality score
    }
  },
  communityEngagement: {
    minReward: ethers.utils.parseEther('1'),  // 1 LDAO
    maxReward: ethers.utils.parseEther('10'), // 10 LDAO
    metrics: {
      likes: 0.5,      // 0.5 LDAO per like
      replies: 1,      // 1 LDAO per reply
      helpfulness: 2   // 2 LDAO per high helpfulness score
    }
  },
  referralProgram: {
    percentage: 10 // 10%
  },
  marketplace: {
    transactionRewardRate: 0.001 // 0.1%
  }
};

/**
 * Calculate content creation reward based on quality score
 * @param qualityScore - Quality score of the content (0-100)
 * @returns Reward amount in LDAO tokens (as BigNumber)
 */
export function calculateContentReward(qualityScore: number): BigNumber {
  const { qualityThresholds, minReward, maxReward } = rewardConfig.contentCreation;
  
  if (qualityScore >= qualityThresholds.high) {
    return maxReward;
  } else if (qualityScore >= qualityThresholds.medium) {
    return ethers.utils.parseEther('25'); // 25 LDAO
  } else if (qualityScore >= qualityThresholds.low) {
    return minReward;
  }
  return BigNumber.from(0);
}

/**
 * Calculate community engagement reward
 * @param metrics - Engagement metrics for the comment
 * @returns Reward amount in LDAO tokens (as BigNumber)
 */
export function calculateEngagementReward(metrics: {
  likes: number;
  replies: number;
  helpfulnessScore: number;
}): BigNumber {
  const { minReward, maxReward } = rewardConfig.communityEngagement;
  const { likes, replies, helpfulness } = rewardConfig.communityEngagement.metrics;

  const reward = BigNumber.from(0)
    .add(ethers.utils.parseEther((likes * metrics.likes).toString()))
    .add(ethers.utils.parseEther((replies * metrics.replies).toString()))
    .add(ethers.utils.parseEther((helpfulness * metrics.helpfulnessScore).toString()));

  if (reward.lt(minReward)) return minReward;
  if (reward.gt(maxReward)) return maxReward;
  return reward;
}

/**
 * Calculate referral reward
 * @param purchaseAmount - Amount of first purchase in LDAO tokens
 * @returns Reward amount in LDAO tokens (as BigNumber)
 */
export function calculateReferralReward(purchaseAmount: BigNumber): BigNumber {
  return purchaseAmount.mul(rewardConfig.referralProgram.percentage).div(100);
}

/**
 * Calculate marketplace transaction reward
 * @param transactionValue - Value of the transaction in LDAO tokens
 * @returns Reward amount in LDAO tokens (as BigNumber)
 */
export function calculateMarketplaceReward(transactionValue: BigNumber): BigNumber {
  return transactionValue.mul(Math.floor(rewardConfig.marketplace.transactionRewardRate * 10000)).div(10000);
}