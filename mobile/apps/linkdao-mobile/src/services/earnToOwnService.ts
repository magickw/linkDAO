/**
 * Earn To Own Service
 * Handles interactions with the RWA/Earn-to-Own gamification system
 */

import { apiClient } from './apiClient';

export interface EarnToOwnChallenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'milestone';
  rewardAmount: number;
  rewardCurrency: string;
  target: number;
  progress: number;
  expiresAt?: string; // ISO Date string
  status: 'active' | 'completed' | 'expired';
}

export interface EarnToOwnProgress {
  totalEarned: number;
  currentBalance: number;
  completedChallenges: number;
  rank: number;
  nextRankThreshold: number;
  level: number;
}

class EarnToOwnService {
  /**
   * Get active challenges for the current user
   */
  async getActiveChallenges(): Promise<EarnToOwnChallenge[]> {
    try {
      // In a real implementation, this would hit the API
      // const response = await apiClient.get('/api/earn/challenges');
      // return response.data;

      // Mock data for now to match Web implementation
      return [
        {
          id: '1',
          title: 'Daily Voter',
          description: 'Vote on 3 active proposals',
          type: 'daily',
          rewardAmount: 50,
          rewardCurrency: 'LDAO',
          target: 3,
          progress: 1,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          status: 'active'
        },
        {
          id: '2',
          title: 'Community Pillar',
          description: 'Receive 10 likes on your posts',
          type: 'weekly',
          rewardAmount: 250,
          rewardCurrency: 'LDAO',
          target: 10,
          progress: 4,
          expiresAt: new Date(Date.now() + 604800000).toISOString(),
          status: 'active'
        },
        {
          id: '3',
          title: 'Marketplace Trader',
          description: 'Complete a purchase on the marketplace',
          type: 'monthly',
          rewardAmount: 1000,
          rewardCurrency: 'LDAO',
          target: 1,
          progress: 0,
          expiresAt: new Date(Date.now() + 2592000000).toISOString(),
          status: 'active'
        },
        {
          id: '4',
          title: 'Identity Verification',
          description: 'Complete your profile verification',
          type: 'milestone',
          rewardAmount: 500,
          rewardCurrency: 'LDAO',
          target: 1,
          progress: 0,
          status: 'active'
        }
      ];
    } catch (error) {
      console.error('Error fetching challenges:', error);
      return [];
    }
  }

  /**
   * Get user's progress summary
   */
  async getUserProgress(address: string): Promise<EarnToOwnProgress | null> {
    try {
      // const response = await apiClient.get(`/api/earn/progress/${address}`);
      // return response.data;

      return {
        totalEarned: 1250,
        currentBalance: 1250,
        completedChallenges: 5,
        rank: 42,
        nextRankThreshold: 2000,
        level: 3
      };
    } catch (error) {
      console.error('Error fetching progress:', error);
      return null;
    }
  }

  /**
   * Claim a reward for a completed challenge
   */
  async claimReward(challengeId: string): Promise<boolean> {
    try {
      // const response = await apiClient.post(`/api/earn/claim/${challengeId}`);
      // return response.success;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      console.error('Error claiming reward:', error);
      return false;
    }
  }
}

export const earnToOwnService = new EarnToOwnService();
