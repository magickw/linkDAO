import { BigNumber } from 'ethers';
import { calculateReferralReward } from '../config/rewardConfig';
import { LDAOTokenService } from './web3/ldaoTokenService';
import { RewardPool } from '../types/contracts';

export interface ReferralInfo {
  referrer: string;    // Address of the referring user
  referee: string;     // Address of the referred user
  purchaseAmount: BigNumber;  // Amount of first purchase in LDAO
  timestamp: number;   // Timestamp of the referral
}

export interface ReferralRewardResult {
  success: boolean;
  transactionHash?: string;
  rewardAmount?: string;
  error?: string;
}

export class ReferralProgramService {
  private static instance: ReferralProgramService;
  private rewardPool: RewardPool | null = null;
  private ldaoTokenService: LDAOTokenService;

  private constructor() {
    this.ldaoTokenService = LDAOTokenService.getInstance();
  }

  static getInstance(): ReferralProgramService {
    if (!ReferralProgramService.instance) {
      ReferralProgramService.instance = new ReferralProgramService();
    }
    return ReferralProgramService.instance;
  }

  /**
   * Record a new referral
   * @param referrer - Address of the referring user
   * @param referee - Address of the referred user
   * @returns success status
   */
  async recordReferral(
    referrer: string,
    referee: string
  ): Promise<boolean> {
    try {
      // Check if referee is already referred
      const isReferred = await this.isUserReferred(referee);
      if (isReferred) {
        throw new Error('User has already been referred');
      }

      // Check if referrer and referee are different
      if (referrer.toLowerCase() === referee.toLowerCase()) {
        throw new Error('Cannot refer yourself');
      }

      // Record the referral in the contract
      const tx = await this.rewardPool?.recordReferral(referrer, referee);
      if (!tx) {
        throw new Error('Failed to record referral');
      }

      await tx.wait();
      return true;

    } catch (error) {
      console.error('Error recording referral:', error);
      return false;
    }
  }

  /**
   * Process referral reward after first purchase
   * @param referralInfo - Information about the referral and purchase
   */
  async processReferralReward(
    referralInfo: ReferralInfo
  ): Promise<ReferralRewardResult> {
    try {
      // Validate referral eligibility
      if (!await this.isValidReferral(referralInfo)) {
        return {
          success: false,
          error: 'Invalid or expired referral'
        };
      }

      // Check if reward was already claimed
      const isRewarded = await this.rewardPool?.referralRewarded(
        referralInfo.referrer,
        referralInfo.referee
      );
      if (isRewarded) {
        return {
          success: false,
          error: 'Referral reward already claimed'
        };
      }

      // Calculate reward amount
      const rewardAmount = calculateReferralReward(referralInfo.purchaseAmount);

      // Process the reward
      const tx = await this.rewardPool?.processReferralReward(
        referralInfo.referrer,
        referralInfo.referee,
        rewardAmount,
        {
          gasLimit: 200000 // Estimated gas limit
        }
      );

      if (!tx) {
        throw new Error('Failed to process referral reward');
      }

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        rewardAmount: rewardAmount.toString()
      };

    } catch (error) {
      console.error('Error processing referral reward:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if a referral is valid
   * @param referralInfo - Referral information to validate
   * @returns Boolean indicating if the referral is valid
   */
  private async isValidReferral(referralInfo: ReferralInfo): Promise<boolean> {
    try {
      // Check if the referral relationship exists
      const storedReferrer = await this.rewardPool?.getReferrer(referralInfo.referee);
      if (!storedReferrer || storedReferrer.toLowerCase() !== referralInfo.referrer.toLowerCase()) {
        return false;
      }

      // Check if the purchase amount is valid
      if (referralInfo.purchaseAmount.lte(0)) {
        return false;
      }

      // Check if within valid timeframe (e.g., 30 days from referral)
      const referralTimestamp = await this.rewardPool?.getReferralTimestamp(
        referralInfo.referee
      );
      
      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
      if (!referralTimestamp || 
          referralInfo.timestamp - referralTimestamp.toNumber() > thirtyDaysInSeconds) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error validating referral:', error);
      return false;
    }
  }

  /**
   * Check if a user has already been referred
   * @param userAddress - Address of the user to check
   * @returns Boolean indicating if the user has been referred
   */
  async isUserReferred(userAddress: string): Promise<boolean> {
    try {
      const referrer = await this.rewardPool?.getReferrer(userAddress);
      return !!referrer && referrer !== '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('Error checking if user is referred:', error);
      return false;
    }
  }

  /**
   * Get user's total earned rewards from referrals
   * @param userAddress - Wallet address of the referrer
   * @returns Total earned rewards in LDAO tokens
   */
  async getTotalReferralRewards(userAddress: string): Promise<string> {
    try {
      const total = await this.rewardPool?.userReferralRewards(userAddress);
      return total?.toString() || '0';
    } catch (error) {
      console.error('Error getting total referral rewards:', error);
      return '0';
    }
  }

  /**
   * Get list of addresses referred by a user
   * @param referrerAddress - Address of the referrer
   * @returns Array of referred addresses
   */
  async getReferredUsers(referrerAddress: string): Promise<string[]> {
    try {
      return await this.rewardPool?.getReferredUsers(referrerAddress) || [];
    } catch (error) {
      console.error('Error getting referred users:', error);
      return [];
    }
  }
}

export default ReferralProgramService;