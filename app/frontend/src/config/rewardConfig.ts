import { ethers } from 'ethers';

export interface RewardRates {
  contentCreation: {
    minReward: bigint;
    maxReward: bigint;
    qualityThresholds: {
      low: number;    // Minimum score for low quality (10 LDAO)
      medium: number; // Minimum score for medium quality (25 LDAO)
      high: number;   // Minimum score for high quality (50 LDAO)
    };
  };
  communityEngagement: {
    minReward: bigint;
    maxReward: bigint;
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
    minReward: ethers.parseEther('10'), // 10 LDAO
    maxReward: ethers.parseEther('50'), // 50 LDAO
    qualityThresholds: {
      low: 50,     // 50% quality score
      medium: 75,  // 75% quality score
      high: 90     // 90% quality score
    }
  },
  communityEngagement: {
    minReward: ethers.parseEther('1'),  // 1 LDAO
    maxReward: ethers.parseEther('10'), // 10 LDAO
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
 * @returns Reward amount in LDAO tokens (as bigint)
 */
export function calculateContentReward(qualityScore: number): bigint {
  const { qualityThresholds, minReward, maxReward } = rewardConfig.contentCreation;
  
  if (qualityScore >= qualityThresholds.high) {
    return maxReward;
  } else if (qualityScore >= qualityThresholds.medium) {
    return ethers.parseEther('25'); // 25 LDAO
  } else if (qualityScore >= qualityThresholds.low) {
    return minReward;
  }
  return 0n;
}

/**
 * Calculate community engagement reward
 * @param metrics - Engagement metrics for the comment
 * @returns Reward amount in LDAO tokens (as bigint)
 */
export function calculateEngagementReward(metrics: {
  likes: number;
  replies: number;
  helpfulnessScore: number;
}): bigint {
  const { minReward, maxReward } = rewardConfig.communityEngagement;
  const { likes, replies, helpfulness } = rewardConfig.communityEngagement.metrics;

  const reward = 0n +
    ethers.parseEther((likes * metrics.likes).toString()) +
    ethers.parseEther((replies * metrics.replies).toString()) +
    ethers.parseEther((helpfulness * metrics.helpfulnessScore).toString());

  if (reward < minReward) return minReward;
  if (reward > maxReward) return maxReward;
  return reward;
}

/**
 * Calculate referral reward
 * @param purchaseAmount - Amount of first purchase in LDAO tokens
 * @returns Reward amount in LDAO tokens (as bigint)
 */
export function calculateReferralReward(purchaseAmount: bigint): bigint {
  return (purchaseAmount * BigInt(rewardConfig.referralProgram.percentage)) / 100n;
}

/**
 * Calculate marketplace transaction reward
 * @param transactionValue - Value of the transaction in LDAO tokens
 * @returns Reward amount in LDAO tokens (as bigint)
 */
export function calculateMarketplaceReward(transactionValue: bigint): bigint {
  return (transactionValue * BigInt(Math.floor(rewardConfig.marketplace.transactionRewardRate * 10000))) / 10000n;
}