/**
 * Reputation Service
 * Handles user reputation and achievement system
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface UserReputation {
  userId: string;
  score: number;
  level: string;
  rank: number;
  totalPoints: number;
  nextLevelPoints: number;
  progressPercentage: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  icon: string;
  reward: number;
}

export interface ReputationEvent {
  id: string;
  type: string;
  description: string;
  points: number;
  timestamp: number;
}

class ReputationService {
  private baseUrl = `${ENV.BACKEND_URL}/api/reputation`;

  /**
   * Get user reputation
   */
  async getUserReputation(userId: string): Promise<UserReputation | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${userId}`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching user reputation:', error);
      return null;
    }
  }

  /**
   * Get user badges
   */
  async getUserBadges(userId: string): Promise<Badge[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${userId}/badges`);
      const data = response.data.data || response.data;
      return data.badges || data || [];
    } catch (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${userId}/achievements`);
      const data = response.data.data || response.data;
      return data.achievements || data || [];
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }
  }

  /**
   * Get reputation history
   */
  async getReputationHistory(userId: string, limit: number = 20): Promise<ReputationEvent[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${userId}/history`, {
        params: { limit }
      });
      const data = response.data.data || response.data;
      return data.history || data || [];
    } catch (error) {
      console.error('Error fetching reputation history:', error);
      return [];
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 50): Promise<Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
  }>> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/leaderboard`, {
        params: { limit }
      });
      const data = response.data.data || response.data;
      return data.leaderboard || data || [];
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }
}

export const reputationService = new ReputationService();