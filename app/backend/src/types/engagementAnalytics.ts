// Backend types for engagement analytics - mirrors frontend types

export interface EngagementAnalytics {
  // Core metrics
  totalEngagement: number;
  totalReach: number;
  engagementRate: number;
  totalTipsReceived: number;
  
  // Breakdown by type
  reactions: number;
  comments: number;
  shares: number;
  tips: number;
  
  // Change metrics (percentage)
  engagementChange: number;
  reachChange: number;
  engagementRateChange: number;
  tipsChange: number;
  
  // Social proof metrics
  verifiedUserEngagement: number;
  communityLeaderEngagement: number;
  followerEngagement: number;
  
  // Time period
  timeRange: string;
  startDate: Date;
  endDate: Date;
}

export interface EngagementTrend {
  date: Date;
  posts: number;
  reactions: number;
  comments: number;
  shares: number;
  tips: number;
  reach: number;
  engagementRate: number;
}

export interface PostEngagementMetrics {
  postId: string;
  content: string;
  createdAt: Date;
  
  // Engagement metrics
  reactions: number;
  comments: number;
  shares: number;
  tips: number;
  views: number;
  engagementScore: number;
  
  // Social proof metrics
  verifiedUserInteractions: number;
  communityLeaderInteractions: number;
  followerInteractions: number;
  
  // Performance indicators
  isTopPerforming: boolean;
  trendingStatus?: 'viral' | 'hot' | 'rising';
}

export interface UserEngagementProfile {
  userId: string;
  
  // Overall metrics
  totalPosts: number;
  averageEngagementRate: number;
  bestPerformingTime: string;
  mostEngagedContentType: string;
  
  // Audience breakdown
  audienceBreakdown: {
    verified: number;
    leaders: number;
    regular: number;
  };
  
  // Engagement patterns
  engagementPatterns: {
    peakHours: number[];
    peakDays: string[];
    seasonalTrends: SeasonalTrend[];
  };
  
  // Social proof impact
  socialProofImpact: {
    verifiedUserBoost: number;
    leaderBoost: number;
    followerNetworkBoost: number;
  };
}

export interface SeasonalTrend {
  period: string;
  engagementMultiplier: number;
  topContentTypes: string[];
}

export interface EngagementInteraction {
  id?: string;
  postId: string;
  userId: string;
  type: 'reaction' | 'comment' | 'share' | 'tip' | 'view';
  
  // User context
  userType: 'verified' | 'community_leader' | 'follower' | 'regular';
  userReputation?: number;
  userBadges?: string[];
  
  // Interaction details
  value?: number; // For tips and weighted reactions
  tokenType?: string;
  message?: string;
  
  // Social proof context
  socialProofWeight: number;
  influenceScore: number;
  
  // Metadata
  timestamp: Date;
  source: 'web' | 'mobile' | 'api';
  ipAddress?: string;
  userAgent?: string;
}

export interface EngagementAggregate {
  postId: string;
  timeWindow: string;
  
  // Raw counts
  totalInteractions: number;
  uniqueUsers: number;
  
  // Weighted metrics
  socialProofScore: number;
  influenceScore: number;
  engagementVelocity: number;
  
  // User type breakdown
  verifiedUserInteractions: number;
  communityLeaderInteractions: number;
  followerInteractions: number;
  regularUserInteractions: number;
  
  // Interaction type breakdown
  reactions: number;
  comments: number;
  shares: number;
  tips: number;
  views: number;
  
  // Timestamps
  windowStart: Date;
  windowEnd: Date;
  lastUpdated: Date;
}

export interface SocialProofIndicators {
  postId: string;
  
  // Follower engagement
  followedUsersWhoEngaged: FollowerEngagement[];
  totalFollowerEngagement: number;
  followerEngagementRate: number;
  
  // Verified user engagement
  verifiedUsersWhoEngaged: VerifiedUserEngagement[];
  totalVerifiedEngagement: number;
  verifiedEngagementBoost: number;
  
  // Community leader engagement
  communityLeadersWhoEngaged: CommunityLeaderEngagement[];
  totalLeaderEngagement: number;
  leaderEngagementBoost: number;
  
  // Overall social proof score
  socialProofScore: number;
  socialProofLevel: 'low' | 'medium' | 'high' | 'exceptional';
  
  // Display preferences
  showFollowerNames: boolean;
  showVerifiedBadges: boolean;
  showLeaderBadges: boolean;
  maxDisplayCount: number;
}

export interface FollowerEngagement {
  userId: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  
  // Engagement details
  interactionType: 'reaction' | 'comment' | 'share' | 'tip';
  interactionValue?: number;
  timestamp: Date;
  
  // Relationship context
  followingSince: Date;
  mutualFollowers: number;
  engagementHistory: number;
}

export interface VerifiedUserEngagement {
  userId: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  
  // Verification details
  verificationType: 'platform' | 'community' | 'expert' | 'celebrity';
  verificationBadge: string;
  followerCount?: number;
  
  // Engagement details
  interactionType: 'reaction' | 'comment' | 'share' | 'tip';
  interactionValue?: number;
  timestamp: Date;
  
  // Impact metrics
  influenceScore: number;
  socialProofWeight: number;
}

export interface CommunityLeaderEngagement {
  userId: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  
  // Leadership details
  communityId: string;
  communityName: string;
  leadershipRole: 'moderator' | 'admin' | 'founder' | 'top_contributor';
  leadershipBadge: string;
  
  // Community metrics
  communityReputation: number;
  communityContributions: number;
  
  // Engagement details
  interactionType: 'reaction' | 'comment' | 'share' | 'tip';
  interactionValue?: number;
  timestamp: Date;
  
  // Impact metrics
  communityInfluence: number;
  socialProofWeight: number;
}