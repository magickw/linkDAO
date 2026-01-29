import {
  UserReputation,
  Badge,
  Achievement,
  ReputationEvent,
  MiniProfileData,
  REPUTATION_LEVELS,
  BADGE_DEFINITIONS
} from '../types/reputation';

class ReputationService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  async getUserReputation(userId: string): Promise<UserReputation> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reputation/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        // Handle 404 by returning a default reputation object
        if (response.status === 404) {
          console.warn(`[reputationService] User reputation not found for ${userId}, returning default`);
          return this.getDefaultUserReputation();
        }
        throw new Error(`Failed to fetch user reputation: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      // Transform backend data structure to frontend data structure
      return this.transformBackendReputation(result.data || result);
    } catch (error) {
      console.error('Error fetching user reputation:', error);
      // Return default data instead of mock data for production
      return this.getDefaultUserReputation();
    }
  }

  async getMiniProfileData(userId: string): Promise<MiniProfileData> {
    try {
      const response = await fetch(`${this.baseUrl}/api/users/${userId}/mini-profile`);
      if (!response.ok) {
        // Handle 404 by returning a default mini profile object
        if (response.status === 404) {
          console.warn(`[reputationService] Mini profile not found for ${userId}, returning default`);
          return this.getDefaultMiniProfileData();
        }
        throw new Error(`Failed to fetch mini profile data: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching mini profile data:', error);
      // Return default data instead of mock data for production
      return this.getDefaultMiniProfileData();
    }
  }

  async getReputationEvents(userId: string, limit = 50): Promise<ReputationEvent[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reputation/${userId}/events?limit=${limit}`);
      if (!response.ok) {
        // Handle 404 by returning empty array
        if (response.status === 404) {
          console.warn(`[reputationService] Reputation events not found for ${userId}, returning empty array`);
          return [];
        }
        throw new Error(`Failed to fetch reputation events: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      // Transform backend data structure to frontend data structure if needed
      return result.data?.history || result.history || [];
    } catch (error) {
      console.error('Error fetching reputation events:', error);
      // Return empty array instead of mock data for production
      return [];
    }
  }

  async awardPoints(userId: string, category: string, points: number, description: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reputation/${userId}/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          points,
          description
        })
      });

      if (!response.ok) {
        throw new Error('Failed to award reputation points');
      }
    } catch (error) {
      console.error('Error awarding reputation points:', error);
      throw error;
    }
  }

  async checkForNewAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reputation/${userId}/achievements/check`);
      if (!response.ok) {
        throw new Error('Failed to check for new achievements');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking for new achievements:', error);
      return [];
    }
  }

  calculateLevel(totalScore: number) {
    return REPUTATION_LEVELS.find(
      level => totalScore >= level.minScore && totalScore <= level.maxScore
    ) || REPUTATION_LEVELS[0];
  }

  getAvailableBadges() {
    return BADGE_DEFINITIONS;
  }

  // Transform backend reputation data to frontend format
  private transformBackendReputation(backendData: any): UserReputation {
    // If data is already in frontend format, return as is
    if (backendData && backendData.level && backendData.badges) {
      return backendData;
    }

    // Transform backend data structure to frontend data structure
    const totalScore = backendData?.score ?? 0;
    const level = this.calculateLevel(totalScore);

    return {
      totalScore,
      level,
      badges: [],
      progress: [],
      breakdown: {
        posting: backendData?.breakdown?.posting ?? 0,
        governance: backendData?.breakdown?.governance ?? 0,
        community: backendData?.breakdown?.community ?? 0,
        trading: backendData?.breakdown?.trading ?? 0,
        moderation: backendData?.breakdown?.moderation ?? 0,
        total: backendData?.breakdown?.total ?? totalScore
      },
      achievements: []
    };
  }

  // Default data methods for production
  private getDefaultUserReputation(): UserReputation {
    const totalScore = 0;
    const level = this.calculateLevel(totalScore);

    return {
      totalScore,
      level,
      badges: [],
      progress: [],
      breakdown: {
        posting: 0,
        governance: 0,
        community: 0,
        trading: 0,
        moderation: 0,
        total: 0
      },
      achievements: []
    };
  }

  private getDefaultMiniProfileData(): MiniProfileData {
    return {
      user: {
        id: '',
        handle: '',
        displayName: '',
        avatar: '',
        walletAddress: '',
        ensName: ''
      },
      reputation: this.getDefaultUserReputation(),
      stats: {
        followers: 0,
        following: 0,
        posts: 0,
        communities: 0
      },
      isFollowing: false,
      mutualConnections: 0
    };
  }

  // Mock data methods for development (kept for backward compatibility)
  private getMockUserReputation(): UserReputation {
    const totalScore = 2750;
    const level = this.calculateLevel(totalScore);

    return {
      totalScore,
      level,
      badges: [
        {
          ...BADGE_DEFINITIONS[0],
          earnedAt: new Date('2024-01-15')
        },
        {
          ...BADGE_DEFINITIONS[1],
          earnedAt: new Date('2024-02-20')
        },
        {
          ...BADGE_DEFINITIONS[2],
          earnedAt: new Date('2024-03-10')
        }
      ],
      progress: [
        {
          category: 'posting',
          current: 850,
          target: 1000,
          reward: 'Expert Badge',
          progress: 85
        },
        {
          category: 'governance',
          current: 420,
          target: 500,
          reward: 'Governance Pro',
          progress: 84
        },
        {
          category: 'community',
          current: 680,
          target: 750,
          reward: 'Community Leader',
          progress: 90.7
        },
        {
          category: 'trading',
          current: 320,
          target: 500,
          reward: 'Trading Expert',
          progress: 64
        },
        {
          category: 'moderation',
          current: 180,
          target: 250,
          reward: 'Moderator Badge',
          progress: 72
        }
      ],
      breakdown: {
        posting: 850,
        governance: 420,
        community: 680,
        trading: 320,
        moderation: 180,
        total: 2450
      },
      achievements: [
        {
          id: 'first_post',
          name: 'First Steps',
          description: 'Created your first post',
          icon: '🎯',
          unlockedAt: new Date('2024-01-10'),
          rarity: 'common',
          category: 'posting',
          points: 10
        },
        {
          id: 'community_builder',
          name: 'Community Builder',
          description: 'Helped grow a community to 50+ members',
          icon: '🏗️',
          unlockedAt: new Date('2024-02-15'),
          rarity: 'rare',
          category: 'community',
          points: 100
        }
      ]
    };
  }

  private getMockMiniProfileData(): MiniProfileData {
    return {
      user: { 
        id: 'user123',
        handle: 'cryptodev',
        displayName: 'Crypto Developer',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        walletAddress: '0x1234567890123456789012345678901234567890',
        ensName: 'cryptodev.eth'
      },
      reputation: this.getMockUserReputation(),
      stats: {
        followers: 1250,
        following: 340,
        posts: 89,
        communities: 12
      },
      isFollowing: false,
      mutualConnections: 5
    };
  }

  private getMockReputationEvents(): ReputationEvent[] {
    return [
      {
        id: 'event1',
        userId: 'user123',
        type: 'post_created',
        category: 'posting',
        points: 25,
        description: 'Created post: "Understanding DeFi Protocols"',
        timestamp: new Date('2024-03-15T10:30:00Z')
      },
      {
        id: 'event2',
        userId: 'user123',
        type: 'vote_cast',
        category: 'governance',
        points: 15,
        description: 'Voted on proposal: "Community Treasury Allocation"',
        timestamp: new Date('2024-03-14T15:45:00Z')
      },
      {
        id: 'event3',
        userId: 'user123',
        type: 'tip_received',
        category: 'trading',
        points: 10,
        description: 'Received 5 USDC tip for helpful comment',
        timestamp: new Date('2024-03-13T09:20:00Z')
      },
      {
        id: 'event4',
        userId: 'user123',
        type: 'community_joined',
        category: 'community',
        points: 5,
        description: 'Joined "DeFi Developers" community',
        timestamp: new Date('2024-03-12T14:15:00Z')
      },
      {
        id: 'event5',
        userId: 'user123',
        type: 'achievement_unlocked',
        category: 'posting',
        points: 50,
        description: 'Unlocked "Content Creator" achievement',
        timestamp: new Date('2024-03-11T11:00:00Z')
      }
    ];
  }
}

export const reputationService = new ReputationService();
export default reputationService;