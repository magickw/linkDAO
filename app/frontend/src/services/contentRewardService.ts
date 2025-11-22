import { ethers } from 'ethers';
import { calculateContentReward } from '../config/rewardConfig';
import { LDAOTokenService } from './web3/ldaoTokenService';
import { RewardPool } from '../types/contracts/RewardPool';

export interface ContentQualityMetrics {
  grammarScore: number;       // 0-100
  uniquenessScore: number;    // 0-100
  engagementScore: number;    // 0-100
  communityValueScore: number; // 0-100
}

export interface ContentRewardResult {
  success: boolean;
  transactionHash?: string;
  rewardAmount?: string;
  error?: string;
}

export class ContentRewardService {
  private static instance: ContentRewardService;
  private rewardPool: RewardPool | null = null;
  private ldaoTokenService: LDAOTokenService;

  private constructor() {
    this.ldaoTokenService = LDAOTokenService.getInstance();
  }

  static getInstance(): ContentRewardService {
    if (!ContentRewardService.instance) {
      ContentRewardService.instance = new ContentRewardService();
    }
    return ContentRewardService.instance;
  }

  /**
   * Calculate the quality score for content based on multiple metrics
   * @param metrics - Various quality metrics for the content
   * @returns Overall quality score (0-100)
   */
  private calculateQualityScore(metrics: ContentQualityMetrics): number {
    // Weighted average of different quality metrics
    return (
      metrics.grammarScore * 0.2 +        // 20% weight for grammar
      metrics.uniquenessScore * 0.3 +     // 30% weight for uniqueness
      metrics.engagementScore * 0.25 +    // 25% weight for engagement
      metrics.communityValueScore * 0.25   // 25% weight for community value
    );
  }

  /**
   * Validate the content metrics
   * @param metrics - Content quality metrics to validate
   * @throws Error if any metric is invalid
   */
  private validateMetrics(metrics: ContentQualityMetrics): void {
    const validateScore = (score: number, name: string) => {
      if (score < 0 || score > 100 || !Number.isFinite(score)) {
        throw new Error(`Invalid ${name}: must be between 0 and 100`);
      }
    };

    validateScore(metrics.grammarScore, 'grammar score');
    validateScore(metrics.uniquenessScore, 'uniqueness score');
    validateScore(metrics.engagementScore, 'engagement score');
    validateScore(metrics.communityValueScore, 'community value score');
  }

  /**
   * Award LDAO tokens for content creation
   * @param contentId - ID of the content being rewarded (used as commentId in the contract)
   * @param authorAddress - Wallet address of the content author
   * @param metrics - Quality metrics for the content
   */
  async awardContentReward(
    contentId: string,
    authorAddress: string,
    metrics: ContentQualityMetrics
  ): Promise<ContentRewardResult> {
    try {
      // Validate metrics
      this.validateMetrics(metrics);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(metrics);

      // Calculate reward amount
      const rewardAmount = calculateContentReward(qualityScore);

      // If no reward is earned, return early
      if (rewardAmount === 0n) {
        return {
          success: false,
          error: 'Content quality does not meet minimum threshold for rewards'
        };
      }

      // Call smart contract to distribute reward
      // Using rewardEngagement method with contentId as commentId
      const tx = await this.rewardPool?.rewardEngagement(
        authorAddress,
        rewardAmount,
        contentId,
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
        transactionHash: receipt.hash,
        rewardAmount: rewardAmount.toString()
      };

    } catch (error) {
      console.error('Error awarding content reward:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if content is eligible for rewards
   * @param contentId - ID of the content to check (used as commentId in the contract)
   * @returns Boolean indicating if the content is eligible for rewards
   */
  async isContentEligible(contentId: string): Promise<boolean> {
    try {
      // Check if content has already been rewarded
      // Using commentRewarded method with contentId as commentId
      const isRewarded = await this.rewardPool?.commentRewarded(contentId);
      if (isRewarded) {
        return false;
      }

      // Add additional eligibility checks here (e.g., content age, author reputation, etc.)

      return true;
    } catch (error) {
      console.error('Error checking content eligibility:', error);
      return false;
    }
  }
}

export default ContentRewardService;