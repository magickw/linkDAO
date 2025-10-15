import { EnhancedCommunityData } from '../types/communityEnhancements';

export interface CommunityRankingMetrics {
  memberGrowthScore: number;
  activityScore: number;
  engagementScore: number;
  tokenMetricsScore: number;
  governanceScore: number;
  overallScore: number;
  rank: number;
  rankChange: number;
}

export interface RankingWeights {
  memberGrowth: number;
  activity: number;
  engagement: number;
  tokenMetrics: number;
  governance: number;
}

export interface TrendingCommunityData extends EnhancedCommunityData {
  rankingMetrics: CommunityRankingMetrics;
  growthMetrics: {
    memberGrowth24h: number;
    memberGrowthPercentage: number;
    activityGrowth24h: number;
    trendingScore: number;
    rank: number;
    rankChange: number;
  };
  tokenMetrics?: {
    marketCap?: number;
    volume24h?: number;
    priceChange24h?: number;
    stakingApr?: number;
    liquidityScore?: number;
  };
}

export class CommunityRankingService {
  private static readonly DEFAULT_WEIGHTS: RankingWeights = {
    memberGrowth: 0.25,
    activity: 0.30,
    engagement: 0.20,
    tokenMetrics: 0.15,
    governance: 0.10
  };

  /**
   * Calculate trending score for a community based on multiple metrics
   */
  static calculateTrendingScore(
    community: EnhancedCommunityData,
    historicalData?: any,
    weights: RankingWeights = this.DEFAULT_WEIGHTS
  ): CommunityRankingMetrics {
    const memberGrowthScore = this.calculateMemberGrowthScore(community, historicalData);
    const activityScore = this.calculateActivityScore(community);
    const engagementScore = this.calculateEngagementScore(community);
    const tokenMetricsScore = this.calculateTokenMetricsScore(community);
    const governanceScore = this.calculateGovernanceScore(community);

    const overallScore = 
      (memberGrowthScore * weights.memberGrowth) +
      (activityScore * weights.activity) +
      (engagementScore * weights.engagement) +
      (tokenMetricsScore * weights.tokenMetrics) +
      (governanceScore * weights.governance);

    return {
      memberGrowthScore,
      activityScore,
      engagementScore,
      tokenMetricsScore,
      governanceScore,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      rank: 0, // Will be set after sorting
      rankChange: 0 // Will be calculated based on historical rankings
    };
  }

  /**
   * Calculate member growth score (0-100)
   */
  private static calculateMemberGrowthScore(
    community: EnhancedCommunityData,
    historicalData?: any
  ): number {
    const { memberCount } = community;
    
    // Mock growth calculation - replace with actual historical data
    const baseGrowthRate = Math.random() * 0.05; // 0-5% daily growth
    const sizeBonus = Math.log10(memberCount) * 5; // Bonus for larger communities
    const activityMultiplier = community.activityMetrics.activityLevel === 'very-high' ? 1.2 : 
                              community.activityMetrics.activityLevel === 'high' ? 1.1 : 
                              community.activityMetrics.activityLevel === 'medium' ? 1.0 : 0.8;

    return Math.min(100, (baseGrowthRate * 100 + sizeBonus) * activityMultiplier);
  }

  /**
   * Calculate activity score based on posts, comments, and active members
   */
  private static calculateActivityScore(community: EnhancedCommunityData): number {
    const { activityMetrics } = community;
    
    // Normalize metrics
    const postsScore = Math.min(50, activityMetrics.postsToday * 2); // Max 50 points for posts
    const activeMembersRatio = activityMetrics.activeMembers / community.memberCount;
    const activeMembersScore = Math.min(30, activeMembersRatio * 100 * 3); // Max 30 points
    const engagementBonus = activityMetrics.engagementRate * 20; // Max 20 points

    return Math.min(100, postsScore + activeMembersScore + engagementBonus);
  }

  /**
   * Calculate engagement score based on user interactions
   */
  private static calculateEngagementScore(community: EnhancedCommunityData): number {
    const { activityMetrics } = community;
    
    const engagementRate = activityMetrics.engagementRate;
    const baseScore = engagementRate * 70; // Base score from engagement rate
    
    // Bonus for consistent high engagement
    const consistencyBonus = engagementRate > 0.7 ? 20 : 
                           engagementRate > 0.5 ? 10 : 0;
    
    // Activity level bonus
    const activityBonus = activityMetrics.activityLevel === 'very-high' ? 10 : 
                         activityMetrics.activityLevel === 'high' ? 5 : 0;

    return Math.min(100, baseScore + consistencyBonus + activityBonus);
  }

  /**
   * Calculate token metrics score for Web3 communities
   */
  private static calculateTokenMetricsScore(community: EnhancedCommunityData): number {
    // For communities without token metrics, return neutral score
    if (!('tokenMetrics' in community) || !community.tokenMetrics) {
      return 50; // Neutral score for non-token communities
    }

    const tokenMetrics = community.tokenMetrics as any;
    let score = 0;

    // Market cap score (0-30 points)
    if (tokenMetrics.marketCap) {
      const mcapScore = Math.min(30, Math.log10(tokenMetrics.marketCap) * 3);
      score += mcapScore;
    }

    // Volume score (0-25 points)
    if (tokenMetrics.volume24h) {
      const volumeScore = Math.min(25, Math.log10(tokenMetrics.volume24h) * 2.5);
      score += volumeScore;
    }

    // Price performance score (0-25 points)
    if (tokenMetrics.priceChange24h !== undefined) {
      const priceScore = Math.min(25, Math.max(-25, tokenMetrics.priceChange24h * 2)) + 25;
      score += priceScore * 0.25; // Scale to 0-25 range
    }

    // Staking APR score (0-20 points)
    if (tokenMetrics.stakingApr) {
      const aprScore = Math.min(20, tokenMetrics.stakingApr);
      score += aprScore;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate governance participation score
   */
  private static calculateGovernanceScore(community: EnhancedCommunityData): number {
    const { governance } = community;
    
    // Base score from participation rate
    const participationScore = governance.participationRate * 60; // Max 60 points
    
    // Active proposals bonus
    const proposalsBonus = Math.min(20, governance.activeProposals * 5); // Max 20 points
    
    // User engagement bonus
    const userEngagementBonus = governance.userVotingPower > 0 ? 20 : 0; // Max 20 points

    return Math.min(100, participationScore + proposalsBonus + userEngagementBonus);
  }

  /**
   * Rank communities based on their trending scores
   */
  static rankCommunities(
    communities: EnhancedCommunityData[],
    weights?: RankingWeights,
    previousRankings?: Map<string, number>
  ): TrendingCommunityData[] {
    // Calculate scores for all communities
    const communitiesWithScores = communities.map(community => {
      const rankingMetrics = this.calculateTrendingScore(community, null, weights);
      
      return {
        ...community,
        rankingMetrics,
        growthMetrics: {
          memberGrowth24h: Math.floor(Math.random() * 500), // Mock data
          memberGrowthPercentage: Math.random() * 3,
          activityGrowth24h: Math.floor(Math.random() * 100),
          trendingScore: rankingMetrics.overallScore,
          rank: 0, // Will be set below
          rankChange: 0 // Will be calculated below
        },
        tokenMetrics: this.generateMockTokenMetrics(community)
      } as TrendingCommunityData;
    });

    // Sort by overall score
    communitiesWithScores.sort((a, b) => b.rankingMetrics.overallScore - a.rankingMetrics.overallScore);

    // Assign ranks and calculate rank changes
    return communitiesWithScores.map((community, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankings?.get(community.id) || currentRank;
      const rankChange = previousRank - currentRank;

      return {
        ...community,
        rankingMetrics: {
          ...community.rankingMetrics,
          rank: currentRank,
          rankChange
        },
        growthMetrics: {
          ...community.growthMetrics,
          rank: currentRank,
          rankChange
        }
      };
    });
  }

  /**
   * Generate mock token metrics for demonstration
   */
  private static generateMockTokenMetrics(community: EnhancedCommunityData) {
    // Only generate for some communities to simulate real-world scenario
    if (Math.random() < 0.7) {
      return {
        marketCap: Math.floor(Math.random() * 100000000) + 1000000,
        volume24h: Math.floor(Math.random() * 10000000) + 100000,
        priceChange24h: (Math.random() - 0.5) * 40, // -20% to +20%
        stakingApr: Math.random() * 30 + 5, // 5% to 35%
        liquidityScore: Math.random() * 100
      };
    }
    return undefined;
  }

  /**
   * Get trending communities with filtering and sorting options
   */
  static async getTrendingCommunities(
    options: {
      limit?: number;
      timeframe?: '24h' | '7d' | '30d';
      category?: string;
      minMemberCount?: number;
      weights?: RankingWeights;
    } = {}
  ): Promise<TrendingCommunityData[]> {
    const {
      limit = 10,
      timeframe = '24h',
      category,
      minMemberCount = 0,
      weights
    } = options;

    try {
      // This would typically fetch from an API
      // For now, we'll use mock data
      const mockCommunities = this.generateMockCommunities();
      
      // Filter communities
      let filteredCommunities = mockCommunities.filter(community => 
        community.memberCount >= minMemberCount &&
        (!category || community.name.toLowerCase().includes(category.toLowerCase()))
      );

      // Rank communities
      const rankedCommunities = this.rankCommunities(filteredCommunities, weights);

      // Apply limit
      return rankedCommunities.slice(0, limit);
    } catch (error) {
      console.error('Error fetching trending communities:', error);
      throw new Error('Failed to fetch trending communities');
    }
  }

  /**
   * Generate mock communities for demonstration
   */
  private static generateMockCommunities(): EnhancedCommunityData[] {
    return [
      {
        id: '1',
        name: 'DeFi Innovators',
        description: 'Building the future of decentralized finance',
        memberCount: 15420,
        icon: '🚀',
        brandColors: { primary: '#6366f1', secondary: '#8b5cf6', accent: '#06b6d4' },
        userMembership: { isJoined: false, joinDate: new Date(), reputation: 0, tokenBalance: 0 },
        activityMetrics: {
          postsToday: 45,
          activeMembers: 892,
          trendingScore: 95,
          engagementRate: 0.78,
          activityLevel: 'very-high'
        },
        governance: { activeProposals: 3, userVotingPower: 0, participationRate: 0.65 }
      },
      {
        id: '2',
        name: 'NFT Creators Hub',
        description: 'Where digital artists and collectors meet',
        memberCount: 12890,
        icon: '🎨',
        brandColors: { primary: '#f59e0b', secondary: '#ef4444', accent: '#10b981' },
        userMembership: { isJoined: true, joinDate: new Date('2024-01-15'), reputation: 150, tokenBalance: 250 },
        activityMetrics: {
          postsToday: 38,
          activeMembers: 743,
          trendingScore: 87,
          engagementRate: 0.72,
          activityLevel: 'high'
        },
        governance: { activeProposals: 2, userVotingPower: 250, participationRate: 0.58 }
      },
      {
        id: '3',
        name: 'Web3 Gaming Alliance',
        description: 'The future of gaming is decentralized',
        memberCount: 9876,
        icon: '🎮',
        brandColors: { primary: '#8b5cf6', secondary: '#06b6d4', accent: '#f59e0b' },
        userMembership: { isJoined: false, joinDate: new Date(), reputation: 0, tokenBalance: 0 },
        activityMetrics: {
          postsToday: 29,
          activeMembers: 567,
          trendingScore: 82,
          engagementRate: 0.69,
          activityLevel: 'high'
        },
        governance: { activeProposals: 1, userVotingPower: 0, participationRate: 0.71 }
      }
    ];
  }

  /**
   * Compare multiple communities across different metrics
   */
  static compareCommunities(communityIds: string[]): Promise<{
    communities: TrendingCommunityData[];
    comparison: {
      metric: string;
      values: { communityId: string; value: number; rank: number }[];
    }[];
  }> {
    // This would fetch and compare actual community data
    // For now, return mock comparison data
    return Promise.resolve({
      communities: [],
      comparison: []
    });
  }
}

export default CommunityRankingService;