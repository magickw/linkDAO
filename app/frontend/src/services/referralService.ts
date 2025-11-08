/**
 * Referral Service - Manages referral links and rewards for token acquisition
 */

import { ethers } from 'ethers';

export interface ReferralInfo {
  referrer: string;
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  totalRewards: number;
  pendingRewards: number;
}

export interface ReferralReward {
  id: string;
  referrer: string;
  referredUser: string;
  amount: number;
  timestamp: number;
  status: 'pending' | 'claimed' | 'expired';
  transactionHash?: string;
}

export class ReferralService {
  private static instance: ReferralService;
  private apiBaseUrl: string;

  private constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
  }

  static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }

  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userAddress: string): Promise<{
    success: boolean;
    referralCode?: string;
    referralLink?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would call the backend API
      // For now, we'll generate a mock referral code
      
      // Generate a unique referral code based on user address
      const referralCode = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(`${userAddress}_${Date.now()}`)
      ).substring(2, 10);
      
      const referralLink = `${window.location.origin}/token?ref=${referralCode}`;
      
      return {
        success: true,
        referralCode,
        referralLink
      };
    } catch (error) {
      console.error('Failed to generate referral code:', error);
      return {
        success: false,
        error: 'Failed to generate referral code'
      };
    }
  }

  /**
   * Get referral information for a user
   */
  async getReferralInfo(userAddress: string): Promise<ReferralInfo | null> {
    try {
      // In a real implementation, this would fetch from backend/database
      // For now, we'll simulate referral data
      
      const referralData = await this.generateReferralCode(userAddress);
      
      if (!referralData.success) {
        return null;
      }
      
      return {
        referrer: userAddress,
        referralCode: referralData.referralCode!,
        referralLink: referralData.referralLink!,
        totalReferrals: Math.floor(Math.random() * 10),
        totalRewards: parseFloat((Math.random() * 1000).toFixed(2)),
        pendingRewards: parseFloat((Math.random() * 100).toFixed(2))
      };
    } catch (error) {
      console.error('Failed to get referral info:', error);
      return null;
    }
  }

  /**
   * Record a referral event
   */
  async recordReferral(
    referralCode: string,
    referredUserAddress: string
  ): Promise<{
    success: boolean;
    rewardAmount?: number;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/ldao/referral/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode,
          referredUserAddress
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record referral');
      }
      
      return {
        success: true,
        rewardAmount: data.rewardAmount
      };
    } catch (error) {
      console.error('Failed to record referral:', error);
      return {
        success: false,
        error: 'Failed to record referral'
      };
    }
  }

  /**
   * Get referral rewards for a user
   */
  async getReferralRewards(userAddress: string): Promise<ReferralReward[]> {
    try {
      const response = await fetch(`/api/ldao/referral/rewards?address=${userAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch referral rewards');
      }
      const data = await response.json();
      return data.rewards;
    } catch (error) {
      console.error('Failed to get referral rewards:', error);
      return [];
    }
  }

  /**
   * Claim referral rewards
   */
  async claimRewards(userAddress: string): Promise<{
    success: boolean;
    totalAmount?: number;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would interact with smart contracts
      // For now, we'll simulate a successful reward claim
      
      console.log(`Claiming rewards for user: ${userAddress}`);
      
      // Simulate claiming rewards
      const totalAmount = parseFloat((Math.random() * 100).toFixed(2));
      
      return {
        success: true,
        totalAmount,
        transactionHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`claim_${userAddress}_${Date.now()}`))
      };
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      return {
        success: false,
        error: 'Failed to claim rewards'
      };
    }
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(limit: number = 10): Promise<Array<{
    user: string;
    referrals: number;
    rewards: number;
  }>> {
    try {
      // In a real implementation, this would fetch from backend/database
      // For now, we'll simulate a leaderboard
      
      const leaderboard = [];
      
      // Simulate 10 leaderboard entries
      for (let i = 0; i < Math.min(limit, 10); i++) {
        leaderboard.push({
          user: `0x${Math.random().toString(16).substr(2, 40)}`,
          referrals: Math.floor(Math.random() * 50),
          rewards: parseFloat((Math.random() * 5000).toFixed(2))
        });
      }
      
      // Sort by referrals (descending)
      return leaderboard.sort((a, b) => b.referrals - a.referrals);
    } catch (error) {
      console.error('Failed to get referral leaderboard:', error);
      return [];
    }
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(referralCode: string): Promise<{
    isValid: boolean;
    referrer?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would check the backend/database
      // For now, we'll simulate validation
      
      console.log(`Validating referral code: ${referralCode}`);
      
      // Simulate validation (50% chance of being valid for demo)
      const isValid = Math.random() > 0.5;
      
      return {
        isValid,
        referrer: isValid ? `0x${Math.random().toString(16).substr(2, 40)}` : undefined
      };
    } catch (error) {
      console.error('Failed to validate referral code:', error);
      return {
        isValid: false,
        error: 'Failed to validate referral code'
      };
    }
  }
}

export const referralService = ReferralService.getInstance();