import { BigNumber } from 'ethers';
import { calculateEngagementReward } from '../config/rewardConfig';
import { LDAOTokenService } from './web3/ldaoTokenService';
import { RewardPool } from '../types/contracts';

export interface EngagementMetrics {
  likes: number;
  replies: number;
  helpfulnessScore: number;
  reportCount: number;
  markedAsAnswer: boolean;
}

export interface EngagementRewardResult {
  success: boolean;
  transactionHash?: string;
  rewardAmount?: string;
  error?: string;
}

export class CommunityEngagementService {
  private static instance: CommunityEngagementService;
  private rewardPool: RewardPool | null = null;
  private ldaoTokenService: LDAOTokenService;

  private constructor() {
    this.ldaoTokenService = LDAOTokenService.getInstance();
  }

  static getInstance(): CommunityEngagementService {
    if (!CommunityEngagementService.instance) {
      CommunityEngagementService.instance = new CommunityEngagementService();
    }
    return CommunityEngagementService.instance;
  }

  /**
   * Validate engagement metrics
   * @param metrics - Engagement metrics to validate
   * @throws Error if any metric is invalid
   */
  private validateMetrics(metrics: EngagementMetrics): void {
    if (metrics.likes < 0) throw new Error('Likes count cannot be negative');
    if (metrics.replies < 0) throw new Error('Replies count cannot be negative');
    if (metrics.helpfulnessScore < 0 || metrics.helpfulnessScore > 100) {
      throw new Error('Helpfulness score must be between 0 and 100');
    }
    if (metrics.reportCount < 0) throw new Error('Report count cannot be negative');
  }

  /**
   * Calculate the final helpfulness score based on all metrics
   * @param metrics - All engagement metrics
   * @returns Normalized helpfulness score (0-5)
   */
  private calculateHelpfulnessScore(metrics: EngagementMetrics): number {
    // Base score from explicit helpfulness rating
    let score = (metrics.helpfulnessScore / 100) * 3; // Max 3 points from direct rating

    // Bonus for being marked as answer
    if (metrics.markedAsAnswer) {
      score += 1; // +1 point for being marked as answer
    }

    // Bonus from likes/replies ratio (max 1 point)
    const engagementRatio = Math.min(1, (metrics.likes + metrics.replies) / 10);
    score += engagementRatio;

    // Penalty for reports
    const reportPenalty = Math.min(score, metrics.reportCount * 0.5);
    score -= reportPenalty;

    // Normalize to 0-5 range
    return Math.max(0, Math.min(5, score));
  }

  /**
   * Award LDAO tokens for community engagement
   * @param commentId - ID of the comment being rewarded
   * @param authorAddress - Wallet address of the comment author
   * @param metrics - Engagement metrics for the comment
   */
  async awardEngagementReward(
    commentId: string,
    authorAddress: string,
    metrics: EngagementMetrics
  ): Promise<EngagementRewardResult> {
    try {
      // Validate metrics
      this.validateMetrics(metrics);

      // Check eligibility
      const isEligible = await this.isCommentEligible(commentId);
      if (!isEligible) {
        return {
          success: false,
          error: 'Comment is not eligible for rewards'
        };
      }

      // Calculate helpfulness score
      const helpfulnessScore = this.calculateHelpfulnessScore(metrics);

      // Calculate reward amount
      const rewardAmount = calculateEngagementReward({
        likes: metrics.likes,
        replies: metrics.replies,
        helpfulnessScore: helpfulnessScore
      });

      // If no reward is earned, return early
      if (rewardAmount.eq(0)) {
        return {
          success: false,
          error: 'Engagement metrics do not meet minimum threshold for rewards'
        };
      }

      // Call smart contract to distribute reward
      const tx = await this.rewardPool?.rewardEngagement(
        authorAddress,
        rewardAmount,
        commentId,
        {
          gasLimit: 200000 // Estimated gas limit
        }
      );

      if (!tx) {
        throw new Error('Failed to submit reward transaction');
      }

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        rewardAmount: rewardAmount.toString()
      };

    } catch (error) {
      console.error('Error awarding engagement reward:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if a comment is eligible for rewards
   * @param commentId - ID of the comment to check
   * @returns Boolean indicating if the comment is eligible for rewards
   */
  async isCommentEligible(commentId: string): Promise<boolean> {
    try {
      // Check if comment has already been rewarded
      const isRewarded = await this.rewardPool?.commentRewarded(commentId);
      if (isRewarded) {
        return false;
      }

      // Add additional eligibility checks here (e.g., comment age, author reputation, etc.)
      
      return true;
    } catch (error) {
      console.error('Error checking comment eligibility:', error);
      return false;
    }
  }

  /**
   * Get user's total earned rewards from engagement
   * @param userAddress - Wallet address of the user
   * @returns Total earned rewards in LDAO tokens
   */
  async getTotalEngagementRewards(userAddress: string): Promise<string> {
    try {
      const total = await this.rewardPool?.userEngagementRewards(userAddress);
      return total?.toString() || '0';
    } catch (error) {
      console.error('Error getting total engagement rewards:', error);
      return '0';
    }
  }
}

export default CommunityEngagementService;