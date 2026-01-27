import { ethers } from 'ethers';
import { safeLogger } from '../../utils/safeLogger';

// Reputation tiers and their requirements
export const REPUTATION_TIERS = {
  NEWCOMER: { name: 'Newcomer', minScore: 0, maxScore: 49, color: '#9E9E9E', icon: '🌱' },
  BRONZE: { name: 'Bronze', minScore: 50, maxScore: 199, color: '#CD7F32', icon: '🥉' },
  SILVER: { name: 'Silver', minScore: 200, maxScore: 499, color: '#C0C0C0', icon: '🥈' },
  GOLD: { name: 'Gold', minScore: 500, maxScore: 999, color: '#FFD700', icon: '🥇' },
  PLATINUM: { name: 'Platinum', minScore: 1000, maxScore: 2499, color: '#E5E4E2', icon: '💎' },
  DIAMOND: { name: 'Diamond', minScore: 2500, maxScore: Infinity, color: '#B9F2FF', icon: '🏆' }
};

// Reputation contract address
export const REPUTATION_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_REPUTATION_CONTRACT_ADDRESS || '';

interface ReputationScore {
  totalScore: number;
  reviewCount: number;
  averageRating: number;
  weightedScore: number;
  lastUpdated: number;
  isSuspended: boolean;
}

interface ReputationTierInfo {
  tier: keyof typeof REPUTATION_TIERS;
  name: string;
  minScore: number;
  maxScore: number;
  progress: number;
  nextTier?: keyof typeof REPUTATION_TIERS;
  nextTierName?: string;
  nextTierScore?: number;
}

interface ReviewData {
  reviewer: string;
  target: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  timestamp: number;
}

/**
 * On-Chain Reputation Service
 * Manages on-chain reputation scoring, tier calculation, and reviews
 */
export class ReputationService {
  private static instance: ReputationService;
  private contract: ethers.Contract | null = null;
  private provider: ethers.JsonRpcProvider | null = null;

  private constructor() {
    this.initializeContract();
  }

  public static getInstance(): ReputationService {
    if (!ReputationService.instance) {
      ReputationService.instance = new ReputationService();
    }
    return ReputationService.instance;
  }

  private initializeContract(): void {
    try {
      if (!REPUTATION_CONTRACT_ADDRESS) {
        safeLogger.warn('Reputation contract address not configured');
        return;
      }

      // Simplified Reputation ABI
      const reputationAbi = [
        'function getScore(address user) external view returns (uint256 totalScore, uint256 reviewCount, uint256 averageRating, uint256 weightedScore, uint256 lastUpdated, bool isSuspended)',
        'function submitReview(address target, uint256 rating, string memory comment) external',
        'function verifyReview(uint256 reviewId) external',
        'function voteHelpful(uint256 reviewId, bool helpful) external',
        'function calculateTier(address user) external view returns (uint8 tier, uint256 score)',
        'function getUserReviews(address user) external view returns (tuple(address reviewer, address target, uint256 rating, string comment, bool isVerified, uint256 timestamp)[])',
        'function getSuspensionStatus(address user) external view returns (bool isSuspended, uint256 suspensionEnd)',
        'function updateScore(address user, uint256 delta, string memory reason) external'
      ];

      // Initialize provider (using Sepolia testnet for now)
      this.provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.org'
      );

      this.contract = new ethers.Contract(
        REPUTATION_CONTRACT_ADDRESS,
        reputationAbi,
        this.provider
      );

      safeLogger.info('Reputation service initialized');
    } catch (error) {
      safeLogger.error('Error initializing reputation contract:', error);
    }
  }

  /**
   * Get user's reputation score
   */
  public async getReputationScore(userAddress: string): Promise<ReputationScore | null> {
    try {
      if (!this.contract) {
        throw new Error('Reputation contract not initialized');
      }

      const scoreData = await this.contract.getScore(userAddress);

      return {
        totalScore: Number(scoreData.totalScore),
        reviewCount: Number(scoreData.reviewCount),
        averageRating: Number(scoreData.averageRating),
        weightedScore: Number(scoreData.weightedScore),
        lastUpdated: Number(scoreData.lastUpdated),
        isSuspended: scoreData.isSuspended
      };
    } catch (error) {
      safeLogger.error('Error getting reputation score:', error);
      return null;
    }
  }

  /**
   * Calculate user's reputation tier
   */
  public calculateReputationTier(score: number): ReputationTierInfo {
    let currentTier: keyof typeof REPUTATION_TIERS = 'NEWCOMER';
    let nextTier: keyof typeof REPUTATION_TIERS | undefined;

    for (const [key, tier] of Object.entries(REPUTATION_TIERS)) {
      if (score >= tier.minScore) {
        currentTier = key as keyof typeof REPUTATION_TIERS;
      } else {
        nextTier = key as keyof typeof REPUTATION_TIERS;
        break;
      }
    }

    const tierInfo = REPUTATION_TIERS[currentTier];
    const progress = score >= tierInfo.maxScore
      ? 100
      : ((score - tierInfo.minScore) / (tierInfo.maxScore - tierInfo.minScore)) * 100;

    return {
      tier: currentTier,
      name: tierInfo.name,
      minScore: tierInfo.minScore,
      maxScore: tierInfo.maxScore,
      progress,
      nextTier,
      nextTierName: nextTier ? REPUTATION_TIERS[nextTier].name : undefined,
      nextTierScore: nextTier ? REPUTATION_TIERS[nextTier].minScore : undefined
    };
  }

  /**
   * Get complete reputation info for a user
   */
  public async getReputationInfo(userAddress: string): Promise<{
    score: ReputationScore | null;
    tier: ReputationTierInfo;
  }> {
    const score = await this.getReputationScore(userAddress);
    const tier = this.calculateReputationTier(score?.totalScore || 0);

    return { score, tier };
  }

  /**
   * Submit a review for a user
   */
  public async submitReview(
    targetAddress: string,
    rating: number,
    comment: string,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Reputation contract not initialized');
      }

      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      if (comment.length > 500) {
        throw new Error('Comment too long (max 500 characters)');
      }

      const tx = await this.contract.submitReview(
        targetAddress,
        rating,
        comment
      );

      await tx.wait();
      safeLogger.info('Review submitted successfully:', tx.hash);

      return tx.hash;
    } catch (error) {
      safeLogger.error('Error submitting review:', error);
      throw error;
    }
  }

  /**
   * Vote on a review's helpfulness
   */
  public async voteHelpful(
    reviewId: number,
    helpful: boolean,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      if (!this.contract) {
        throw new Error('Reputation contract not initialized');
      }

      const tx = await this.contract.voteHelpful(reviewId, helpful);
      await tx.wait();

      safeLogger.info('Vote submitted successfully:', tx.hash);
      return tx.hash;
    } catch (error) {
      safeLogger.error('Error voting on review:', error);
      throw error;
    }
  }

  /**
   * Get user's reviews
   */
  public async getUserReviews(userAddress: string): Promise<ReviewData[]> {
    try {
      if (!this.contract) {
        throw new Error('Reputation contract not initialized');
      }

      const reviews = await this.contract.getUserReviews(userAddress);

      return reviews.map((review: any) => ({
        reviewer: review.reviewer,
        target: review.target,
        rating: Number(review.rating),
        comment: review.comment,
        isVerified: review.isVerified,
        timestamp: Number(review.timestamp)
      }));
    } catch (error) {
      safeLogger.error('Error getting user reviews:', error);
      return [];
    }
  }

  /**
   * Check if user is suspended
   */
  public async isUserSuspended(userAddress: string): Promise<{
    isSuspended: boolean;
    suspensionEnd?: number;
  }> {
    try {
      if (!this.contract) {
        throw new Error('Reputation contract not initialized');
      }

      const suspensionStatus = await this.contract.getSuspensionStatus(userAddress);

      return {
        isSuspended: suspensionStatus.isSuspended,
        suspensionEnd: suspensionStatus.suspensionEnd > 0
          ? Number(suspensionStatus.suspensionEnd)
          : undefined
      };
    } catch (error) {
      safeLogger.error('Error checking suspension status:', error);
      return { isSuspended: false };
    }
  }

  /**
   * Get reputation-based discount rate
   */
  public getDiscountRate(tier: keyof typeof REPUTATION_TIERS): number {
    const discounts: Record<keyof typeof REPUTATION_TIERS, number> = {
      NEWCOMER: 0,
      BRONZE: 0.05, // 5%
      SILVER: 0.10, // 10%
      GOLD: 0.15, // 15%
      PLATINUM: 0.20, // 20%
      DIAMOND: 0.25 // 25%
    };

    return discounts[tier];
  }

  /**
   * Get governance voting power multiplier
   */
  public getVotingPowerMultiplier(tier: keyof typeof REPUTATION_TIERS): number {
    const multipliers: Record<keyof typeof REPUTATION_TIERS, number> = {
      NEWCOMER: 1,
      BRONZE: 1.5,
      SILVER: 2,
      GOLD: 2.5,
      PLATINUM: 3,
      DIAMOND: 4
    };

    return multipliers[tier];
  }

  /**
   * Format reputation score for display
   */
  public formatScore(score: number): string {
    return score.toFixed(0);
  }

  /**
   * Get all reputation tiers
   */
  public getAllTiers(): typeof REPUTATION_TIERS {
    return REPUTATION_TIERS;
  }

  /**
   * Calculate estimated time to next tier
   */
  public estimateTimeToNextTier(
    currentScore: number,
    weeklyScoreIncrease: number = 10
  ): number | null {
    const tierInfo = this.calculateReputationTier(currentScore);

    if (!tierInfo.nextTier || !tierInfo.nextTierScore) {
      return null; // Already at max tier
    }

    const scoreNeeded = tierInfo.nextTierScore - currentScore;
    const weeksNeeded = Math.ceil(scoreNeeded / weeklyScoreIncrease);

    return weeksNeeded;
  }
}

export const reputationService = ReputationService.getInstance();