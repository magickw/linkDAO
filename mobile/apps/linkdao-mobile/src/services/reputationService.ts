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
      return this.getMockReputation();
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
      return this.getMockBadges();
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
      return this.getMockAchievements();
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
      return this.getMockHistory();
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
      return this.getMockLeaderboard();
    }
  }

  // Mock data methods
  private getMockReputation(): UserReputation {
    return {
      userId: 'user-123',
      score: 7850,
      level: 'Gold',
      rank: 42,
      totalPoints: 7850,
      nextLevelPoints: 10000,
      progressPercentage: 78.5,
    };
  }

  private getMockBadges(): Badge[] {
    return [
      {
        id: '1',
        name: 'Early Adopter',
        description: 'Joined in the first month',
        icon: '🚀',
        rarity: 'legendary',
        unlockedAt: '2024-01-15',
      },
      {
        id: '2',
        name: 'Content Creator',
        description: 'Created 50+ posts',
        icon: '✍️',
        rarity: 'epic',
        unlockedAt: '2024-03-20',
      },
      {
        id: '3',
        name: 'Community Helper',
        description: 'Helped 100+ users',
        icon: '🤝',
        rarity: 'rare',
        unlockedAt: '2024-05-10',
      },
      {
        id: '4',
        name: 'Tipper',
        description: 'Sent 50+ tips',
        icon: '💰',
        rarity: 'rare',
        unlockedAt: '2024-04-15',
      },
      {
        id: '5',
        name: 'Verified',
        description: 'Verified account',
        icon: '✅',
        rarity: 'common',
        unlockedAt: '2024-02-01',
      },
    ];
  }

  private getMockAchievements(): Achievement[] {
    return [
      {
        id: '1',
        title: 'Post Master',
        description: 'Create 100 posts',
        progress: 47,
        target: 100,
        completed: false,
        icon: '📝',
        reward: 500,
      },
      {
        id: '2',
        title: 'Comment King',
        description: 'Make 500 comments',
        progress: 234,
        target: 500,
        completed: false,
        icon: '💬',
        reward: 300,
      },
      {
        id: '3',
        title: 'Social Butterfly',
        description: 'Get 1000 followers',
        progress: 1234,
        target: 1000,
        completed: true,
        icon: '🦋',
        reward: 1000,
      },
      {
        id: '4',
        title: 'Tip Generous',
        description: 'Send 100 tips',
        progress: 45,
        target: 100,
        completed: false,
        icon: '💎',
        reward: 400,
      },
      {
        id: '5',
        title: 'Community Leader',
        description: 'Create 5 communities',
        progress: 2,
        target: 5,
        completed: false,
        icon: '👑',
        reward: 800,
      },
    ];
  }

  private getMockHistory(): ReputationEvent[] {
    return [
      {
        id: '1',
        type: 'post',
        description: 'Created a post',
        points: 10,
        timestamp: Date.now() - 3600000,
      },
      {
        id: '2',
        type: 'comment',
        description: 'Commented on a post',
        points: 5,
        timestamp: Date.now() - 7200000,
      },
      {
        id: '3',
        type: 'tip',
        description: 'Sent a tip',
        points: 15,
        timestamp: Date.now() - 86400000,
      },
      {
        id: '4',
        type: 'like',
        description: 'Received 10 likes',
        points: 20,
        timestamp: Date.now() - 172800000,
      },
      {
        id: '5',
        type: 'achievement',
        description: 'Unlocked "Social Butterfly" badge',
        points: 1000,
        timestamp: Date.now() - 259200000,
      },
    ];
  }

  private getMockLeaderboard() {
    return [
      { userId: '1', username: 'CryptoKing', score: 15000, rank: 1 },
      { userId: '2', username: 'NFTCollector', score: 14200, rank: 2 },
      { userId: '3', username: 'DeFiMaster', score: 13800, rank: 3 },
      { userId: '4', username: 'BlockchainDev', score: 12500, rank: 4 },
      { userId: '5', username: 'Web3Builder', score: 12000, rank: 5 },
      { userId: '6', username: 'TokenTrader', score: 11500, rank: 6 },
      { userId: '7', username: 'DAOGovernor', score: 11000, rank: 7 },
      { userId: '8', username: 'SmartContractor', score: 10500, rank: 8 },
      { userId: '9', username: 'MetaExplorer', score: 10000, rank: 9 },
      { userId: '10', username: 'DigitalArtist', score: 9500, rank: 10 },
    ];
  }
}

export const reputationService = new ReputationService();