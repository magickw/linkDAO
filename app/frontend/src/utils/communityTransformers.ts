import { Community } from '@/models/Community';
import { EnhancedCommunityData } from '@/types/communityEnhancements';

/**
 * Transform Community model to EnhancedCommunityData for ranking service
 * Adds default values for missing fields required by ranking algorithms
 */
export function transformCommunityToEnhanced(
  community: Community,
  options?: {
    isJoined?: boolean;
    userRole?: 'member' | 'moderator' | 'admin';
    userReputation?: number;
    userTokenBalance?: number;
  }
): EnhancedCommunityData {
  // Calculate activity level based on member count (basic heuristic)
  const getActivityLevel = (memberCount: number): 'low' | 'medium' | 'high' | 'very-high' => {
    if (memberCount > 10000) return 'very-high';
    if (memberCount > 1000) return 'high';
    if (memberCount > 100) return 'medium';
    return 'low';
  };

  // Estimate posts today based on member count and activity
  const estimatePostsToday = (memberCount: number): number => {
    const activityLevel = getActivityLevel(memberCount);
    const multipliers = {
      'very-high': 0.05,
      'high': 0.03,
      'medium': 0.01,
      'low': 0.005
    };
    return Math.floor(memberCount * multipliers[activityLevel]);
  };

  // Estimate active members (typically 10-30% of total)
  const estimateActiveMembers = (memberCount: number): number => {
    const activityLevel = getActivityLevel(memberCount);
    const ratios = {
      'very-high': 0.25,
      'high': 0.20,
      'medium': 0.15,
      'low': 0.10
    };
    return Math.floor(memberCount * ratios[activityLevel]);
  };

  // Calculate engagement rate (higher for smaller, more engaged communities)
  const calculateEngagementRate = (memberCount: number): number => {
    const baseRate = Math.max(0.2, Math.min(0.9, 1 - Math.log10(memberCount) / 5));
    return Math.round(baseRate * 100) / 100;
  };

  const activityLevel = getActivityLevel(community.memberCount);
  const postsToday = estimatePostsToday(community.memberCount);
  const activeMembers = estimateActiveMembers(community.memberCount);
  const engagementRate = calculateEngagementRate(community.memberCount);

  return {
    id: community.id,
    name: community.displayName || community.name,
    description: community.description,
    memberCount: community.memberCount,

    // Visual enhancements
    icon: community.avatar || '🏛️',
    bannerImage: community.banner,
    brandColors: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#f093fb'
    },

    // User-specific data
    userMembership: {
      isJoined: options?.isJoined || false,
      joinDate: new Date(),
      reputation: options?.userReputation || 0,
      tokenBalance: options?.userTokenBalance || 0,
      role: options?.userRole
    },

    // Activity metrics (estimated from member count)
    activityMetrics: {
      postsToday,
      activeMembers,
      trendingScore: 0, // Will be calculated by ranking service
      engagementRate,
      activityLevel
    },

    // Governance data
    governance: {
      activeProposals: 0, // Would need to fetch from backend
      userVotingPower: 0,
      participationRate: engagementRate * 0.5, // Estimate: half of engagement
      nextDeadline: undefined
    }
  };
}

/**
 * Transform array of communities with user context
 */
export function transformCommunitiesWithUserContext(
  communities: Community[],
  userContext: {
    joinedCommunityIds: string[];
    userRoles: Record<string, string>;
    tokenBalances?: Record<string, number>;
    reputationScores?: Record<string, number>;
  }
): EnhancedCommunityData[] {
  return communities.map(community =>
    transformCommunityToEnhanced(community, {
      isJoined: userContext.joinedCommunityIds.includes(community.id),
      userRole: userContext.userRoles[community.id] as any,
      userTokenBalance: userContext.tokenBalances?.[community.id] || 0,
      userReputation: userContext.reputationScores?.[community.id] || 0
    })
  );
}
