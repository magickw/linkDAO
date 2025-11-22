import { ethers } from 'ethers';
import { webSocketService } from './webSocketService';
import { governanceService } from './governanceService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface GovernanceReward {
  id: string;
  userId: string;
  type: 'vote' | 'propose' | 'delegate' | 'participate' | 'review' | 'execute';
  amount: string;
  currency: 'LDAO' | 'USDC' | 'ETH';
  proposalId?: string;
  communityId?: string;
  transactionHash?: string;
  status: 'pending' | 'claimed' | 'distributed' | 'expired';
  createdAt: Date;
  claimedAt?: Date;
  expiresAt?: Date;
  metadata: {
    votingPower?: string;
    participationRate?: number;
    proposalOutcome?: string;
    delegateAddress?: string;
  };
}

export interface RewardTier {
  id: string;
  name: string;
  minVotingPower: number;
  minParticipationRate: number;
  rewards: {
    vote: string;
    propose: string;
    delegate: string;
    participate: string;
    review: string;
    execute: string;
  };
  bonuses: {
    consecutiveVotes: number;
    proposalQuality: number;
    earlyVoting: number;
    communityBuilding: number;
  };
  badge: string;
  color: string;
  requirements: string[];
}

export interface UserRewardStats {
  userId: string;
  totalEarned: string;
  claimable: string;
  claimed: string;
  currentTier: RewardTier;
  nextTier?: RewardTier;
  progressToNextTier: number;
  participationStreak: number;
  totalVotes: number;
  totalProposals: number;
  totalDelegations: number;
  reputationScore: number;
  monthlyEarnings: Array<{
    month: string;
    earnings: string;
    activities: number;
  }>;
}

export interface RewardEvent {
  id: string;
  type: 'reward_earned' | 'reward_claimed' | 'tier_upgraded' | 'streak_milestone';
  userId: string;
  amount?: string;
  currency?: string;
  message: string;
  metadata: any;
  createdAt: Date;
  isRead: boolean;
}

export interface SeasonalReward {
  id: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  rewardPool: {
    LDAO: string;
    USDC: string;
    ETH: string;
  };
  criteria: {
    minVotes: number;
    minProposals: number;
    minParticipationRate: number;
    communityContributions: number;
  };
  rewards: Array<{
    rank: number;
    reward: string;
    currency: string;
    badge?: string;
  }>;
  isActive: boolean;
  participantCount: number;
}

export class GovernanceRewardsService {
  private static currentAddress: string | null = null;
  private static provider: ethers.BrowserProvider | null = null;
  private static rewardTiers: RewardTier[] | null = null;

  /**
   * Initialize the service with wallet connection
   */
  static async initialize(provider: ethers.BrowserProvider): Promise<void> {
    try {
      GovernanceRewardsService.provider = provider;
      const signer = await provider.getSigner();
      GovernanceRewardsService.currentAddress = (await signer.getAddress()).toLowerCase();

      // Load reward tiers
      await GovernanceRewardsService.loadRewardTiers();
    } catch (error) {
      console.error('Failed to initialize governance rewards service:', error);
      throw error;
    }
  }

  /**
   * Load reward tiers from backend
   */
  private static async loadRewardTiers(): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/tiers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const tiers = await response.json();
        GovernanceRewardsService.rewardTiers = tiers;
      } else {
        // Use default reward tiers if API fails
        GovernanceRewardsService.rewardTiers = GovernanceRewardsService.getDefaultRewardTiers();
      }
    } catch (error) {
      console.error('Error loading reward tiers, using defaults:', error);
      GovernanceRewardsService.rewardTiers = GovernanceRewardsService.getDefaultRewardTiers();
    }
  }

  /**
   * Get default reward tiers
   */
  private static getDefaultRewardTiers(): RewardTier[] {
    return [
      {
        id: 'bronze',
        name: 'Bronze Guardian',
        minVotingPower: 100,
        minParticipationRate: 50,
        rewards: {
          vote: '5',
          propose: '50',
          delegate: '10',
          participate: '2',
          review: '3',
          execute: '25'
        },
        bonuses: {
          consecutiveVotes: 0.1,
          proposalQuality: 0.05,
          earlyVoting: 0.1,
          communityBuilding: 0.05
        },
        badge: '🥉',
        color: '#CD7F32',
        requirements: [
          'Minimum 100 voting power',
          '50% participation rate',
          'At least 5 votes cast'
        ]
      },
      {
        id: 'silver',
        name: 'Silver Steward',
        minVotingPower: 500,
        minParticipationRate: 65,
        rewards: {
          vote: '10',
          propose: '100',
          delegate: '25',
          participate: '5',
          review: '8',
          execute: '50'
        },
        bonuses: {
          consecutiveVotes: 0.15,
          proposalQuality: 0.1,
          earlyVoting: 0.15,
          communityBuilding: 0.1
        },
        badge: '🥈',
        color: '#C0C0C0',
        requirements: [
          'Minimum 500 voting power',
          '65% participation rate',
          'At least 15 votes cast',
          '1 proposal created'
        ]
      },
      {
        id: 'gold',
        name: 'Gold Sentinel',
        minVotingPower: 1500,
        minParticipationRate: 75,
        rewards: {
          vote: '20',
          propose: '200',
          delegate: '50',
          participate: '10',
          review: '15',
          execute: '100'
        },
        bonuses: {
          consecutiveVotes: 0.2,
          proposalQuality: 0.15,
          earlyVoting: 0.2,
          communityBuilding: 0.15
        },
        badge: '🥇',
        color: '#FFD700',
        requirements: [
          'Minimum 1500 voting power',
          '75% participation rate',
          'At least 30 votes cast',
          '3 proposals created',
          'Active delegation'
        ]
      },
      {
        id: 'platinum',
        name: 'Platinum Guardian',
        minVotingPower: 5000,
        minParticipationRate: 85,
        rewards: {
          vote: '40',
          propose: '500',
          delegate: '100',
          participate: '20',
          review: '30',
          execute: '250'
        },
        bonuses: {
          consecutiveVotes: 0.25,
          proposalQuality: 0.2,
          earlyVoting: 0.25,
          communityBuilding: 0.2
        },
        badge: '💎',
        color: '#E5E4E2',
        requirements: [
          'Minimum 5000 voting power',
          '85% participation rate',
          'At least 50 votes cast',
          '5 proposals created',
          'Multiple active delegations',
          'Community leadership role'
        ]
      },
      {
        id: 'diamond',
        name: 'Diamond Oracle',
        minVotingPower: 10000,
        minParticipationRate: 95,
        rewards: {
          vote: '75',
          propose: '1000',
          delegate: '200',
          participate: '40',
          review: '50',
          execute: '500'
        },
        bonuses: {
          consecutiveVotes: 0.3,
          proposalQuality: 0.25,
          earlyVoting: 0.3,
          communityBuilding: 0.25
        },
        badge: '💠',
        color: '#B9F2FF',
        requirements: [
          'Minimum 10000 voting power',
          '95% participation rate',
          'At least 100 votes cast',
          '10 successful proposals',
          'Extensive delegation network',
          'Community founder/elder'
        ]
      }
    ];
  }

  /**
   * Award voting reward
   */
  static async awardVotingReward(
    userId: string,
    proposalId: string,
    votingPower: string,
    communityId: string
  ): Promise<GovernanceReward> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Get user's current tier
      const userStats = await GovernanceRewardsService.getUserRewardStats(userId);
      const tier = userStats.currentTier;

      // Calculate base reward
      let baseReward = parseFloat(tier.rewards.vote);

      // Apply bonuses
      const bonuses = await GovernanceRewardsService.calculateBonuses(userId, 'vote', {
        votingPower,
        proposalId,
        communityId
      });

      const totalReward = baseReward * (1 + bonuses.totalBonus);

      // Create reward record
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: 'vote',
          amount: totalReward.toString(),
          currency: 'LDAO',
          proposalId,
          communityId,
          metadata: {
            votingPower,
            baseReward: baseReward.toString(),
            bonuses: bonuses.breakdown
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to award voting reward');
      }

      const reward = await response.json();

      // Send WebSocket notification
      webSocketService.send('governance_reward_earned', {
        userId,
        rewardId: reward.id,
        type: 'vote',
        amount: totalReward.toString(),
        proposalId
      });

      return reward;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Award proposal creation reward
   */
  static async awardProposalReward(
    userId: string,
    proposalId: string,
    communityId: string
  ): Promise<GovernanceReward> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Get user's current tier
      const userStats = await GovernanceRewardsService.getUserRewardStats(userId);
      const tier = userStats.currentTier;

      // Calculate base reward
      let baseReward = parseFloat(tier.rewards.propose);

      // Apply bonuses for proposal quality
      const bonuses = await GovernanceRewardsService.calculateBonuses(userId, 'propose', {
        proposalId,
        communityId
      });

      const totalReward = baseReward * (1 + bonuses.totalBonus);

      // Create reward record
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: 'propose',
          amount: totalReward.toString(),
          currency: 'LDAO',
          proposalId,
          communityId,
          metadata: {
            baseReward: baseReward.toString(),
            bonuses: bonuses.breakdown
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to award proposal reward');
      }

      const reward = await response.json();

      // Send WebSocket notification
      webSocketService.send('governance_reward_earned', {
        userId,
        rewardId: reward.id,
        type: 'propose',
        amount: totalReward.toString(),
        proposalId
      });

      return reward;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Award delegation reward
   */
  static async awardDelegationReward(
    delegatorId: string,
    delegateId: string,
    votingPower: string,
    communityId: string
  ): Promise<GovernanceReward> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // Get user's current tier
      const userStats = await GovernanceRewardsService.getUserRewardStats(delegatorId);
      const tier = userStats.currentTier;

      // Calculate base reward (percentage of voting power)
      const baseReward = Math.min(
        parseFloat(tier.rewards.delegate),
        parseFloat(votingPower) * 0.01 // 1% of voting power max
      );

      // Create reward record
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: delegatorId,
          type: 'delegate',
          amount: baseReward.toString(),
          currency: 'LDAO',
          communityId,
          metadata: {
            delegateAddress: delegateId,
            votingPower,
            baseReward: baseReward.toString()
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to award delegation reward');
      }

      const reward = await response.json();

      // Send WebSocket notification
      webSocketService.send('governance_reward_earned', {
        userId: delegatorId,
        rewardId: reward.id,
        type: 'delegate',
        amount: baseReward.toString(),
        delegateId
      });

      return reward;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Calculate bonuses for a reward
   */
  private static async calculateBonuses(
    userId: string,
    rewardType: string,
    context: any
  ): Promise<{ totalBonus: number; breakdown: Record<string, number> }> {
    const bonuses: Record<string, number> = {};
    let totalBonus = 0;

    try {
      // Get user stats for bonus calculations
      const userStats = await GovernanceRewardsService.getUserRewardStats(userId);
      const tier = userStats.currentTier;

      // Consecutive voting bonus
      if (rewardType === 'vote' && userStats.participationStreak > 0) {
        const streakBonus = Math.min(userStats.participationStreak * tier.bonuses.consecutiveVotes, 0.5);
        bonuses.consecutiveVotes = streakBonus;
        totalBonus += streakBonus;
      }

      // Early voting bonus (first 24 hours of proposal)
      if (rewardType === 'vote' && context.proposalId) {
        const proposal = await governanceService.getProposal(context.proposalId);
        if (proposal && new Date().getTime() - proposal.startTime.getTime() < 24 * 60 * 60 * 1000) {
          bonuses.earlyVoting = tier.bonuses.earlyVoting;
          totalBonus += tier.bonuses.earlyVoting;
        }
      }

      // Proposal quality bonus
      if (rewardType === 'propose' && context.proposalId) {
        const proposal = await governanceService.getProposal(context.proposalId);
        if (proposal && proposal.status === 'succeeded') {
          bonuses.proposalQuality = tier.bonuses.proposalQuality;
          totalBonus += tier.bonuses.proposalQuality;
        }
      }

      // Community building bonus
      if (userStats.reputationScore > 1000) {
        const communityBonus = tier.bonuses.communityBuilding;
        bonuses.communityBuilding = communityBonus;
        totalBonus += communityBonus;
      }

    } catch (error) {
      console.error('Error calculating bonuses:', error);
    }

    return { totalBonus, breakdown: bonuses };
  }

  /**
   * Get user reward statistics
   */
  static async getUserRewardStats(userId: string): Promise<UserRewardStats> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user reward stats');
      }

      const stats = await response.json();

      // Transform monthly earnings
      if (stats.monthlyEarnings) {
        stats.monthlyEarnings = stats.monthlyEarnings.map((earning: any) => ({
          ...earning,
          month: earning.month,
          earnings: earning.earnings,
          activities: earning.activities
        }));
      }

      return stats;
    } catch (error) {
      console.error('Error fetching user reward stats:', error);
      throw error;
    }
  }

  /**
   * Get user's rewards
   */
  static async getUserRewards(
    userId?: string,
    status?: 'pending' | 'claimed' | 'distributed' | 'expired',
    limit: number = 50,
    offset: number = 0
  ): Promise<GovernanceReward[]> {
    const address = userId || GovernanceRewardsService.currentAddress;
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      if (status) {
        params.append('status', status);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/user/${address}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user rewards');
      }

      const rewards = await response.json();
      return rewards.map((reward: any) => ({
        ...reward,
        createdAt: new Date(reward.createdAt),
        claimedAt: reward.claimedAt ? new Date(reward.claimedAt) : undefined,
        expiresAt: reward.expiresAt ? new Date(reward.expiresAt) : undefined
      }));
    } catch (error) {
      console.error('Error fetching user rewards:', error);
      return [];
    }
  }

  /**
   * Claim rewards
   */
  static async claimRewards(rewardIds: string[]): Promise<{ claimed: string[]; failed: string[] }> {
    if (!GovernanceRewardsService.currentAddress) {
      throw new Error('Wallet not connected');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: GovernanceRewardsService.currentAddress,
          rewardIds
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim rewards');
      }

      const result = await response.json();

      // Send WebSocket notification for claimed rewards
      if (result.claimed.length > 0) {
        webSocketService.send('governance_rewards_claimed', {
          userId: GovernanceRewardsService.currentAddress,
          claimedCount: result.claimed.length,
          rewardIds: result.claimed
        });
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get reward tiers
   */
  static async getRewardTiers(): Promise<RewardTier[]> {
    if (!GovernanceRewardsService.rewardTiers) {
      await GovernanceRewardsService.loadRewardTiers();
    }
    return GovernanceRewardsService.rewardTiers!;
  }

  /**
   * Get active seasonal rewards
   */
  static async getSeasonalRewards(): Promise<SeasonalReward[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/seasonal`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch seasonal rewards');
      }

      const rewards = await response.json();
      return rewards.map((reward: any) => ({
        ...reward,
        startTime: new Date(reward.startTime),
        endTime: new Date(reward.endTime)
      }));
    } catch (error) {
      console.error('Error fetching seasonal rewards:', error);
      return [];
    }
  }

  /**
   * Get reward events/notifications
   */
  static async getRewardEvents(
    userId?: string,
    unreadOnly: boolean = false,
    limit: number = 20
  ): Promise<RewardEvent[]> {
    const address = userId || GovernanceRewardsService.currentAddress;
    if (!address) {
      throw new Error('No address provided');
    }

    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      if (unreadOnly) {
        params.append('unreadOnly', 'true');
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/events/${address}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reward events');
      }

      const events = await response.json();
      return events.map((event: any) => ({
        ...event,
        createdAt: new Date(event.createdAt)
      }));
    } catch (error) {
      console.error('Error fetching reward events:', error);
      return [];
    }
  }

  /**
   * Mark reward events as read
   */
  static async markEventsRead(eventIds: string[]): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/events/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventIds }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to mark events as read');
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get leaderboard for governance rewards
   */
  static async getRewardLeaderboard(
    period: 'weekly' | 'monthly' | 'all-time' = 'monthly',
    limit: number = 50
  ): Promise<Array<{
    userId: string;
    totalEarned: string;
    rank: number;
    tier: string;
    activities: {
      votes: number;
      proposals: number;
      delegations: number;
    };
  }>> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/leaderboard?period=${period}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reward leaderboard');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching reward leaderboard:', error);
      return [];
    }
  }

  /**
   * Update reward tiers (admin only)
   */
  static async updateRewardTiers(tiers: RewardTier[]): Promise<RewardTier[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/governance/rewards/tiers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tiers }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update reward tiers');
      }

      const updatedTiers = await response.json();
      GovernanceRewardsService.rewardTiers = updatedTiers;
      return updatedTiers;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }
}