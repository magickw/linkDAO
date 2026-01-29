export interface QuickFilter {
  id: string;
  label: string;
  icon: string;
  count?: number;
  active: boolean;
  query: FilterQuery;
}

export interface FilterQuery {
  type: 'my-posts' | 'tipped-posts' | 'governance-posts' | 'all';
  userId?: string;
  communityId?: string;
  hasReactions?: boolean;
  hasTips?: boolean;
  isGovernance?: boolean;
}

export interface CommunityWithIcons {
  id: string;
  name: string;
  displayName: string;
  memberCount: number;
  avatar: string;
  icon?: string;
  unreadCount: number;
  lastActivity: Date;
  userRole: CommunityRole;
  isJoined: boolean;
  activityLevel: 'high' | 'medium' | 'low';
}

export interface CommunityRole {
  type: 'owner' | 'moderator' | 'member';
  permissions: string[];
}

export interface EnhancedUserProfile {
  id: string;
  walletAddress: string;
  hanndle: string;
  displayName: string;
  avatar: string;
  bio: string;
  reputation: UserReputation;
  badges: Badge[];
  achievements: Achievement[];
  level: ReputationLevel;
  followers: number;
  following: number;
  posts: number;
  communities: CommunityMembership[];
  ensName?: string;
  lastActive: Date;
  joinedAt: Date;
  activityScore: number;
  engagementRate: number;
}

export interface UserReputation {
  totalScore: number;
  level: ReputationLevel;
  breakdown: {
    posting: number;
    governance: number;
    community: number;
    trading: number;
    moderation: number;
  };
  progress: ProgressMilestone[];
  history: ReputationEvent[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
  requirements: BadgeRequirement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  progress: number;
  maxProgress: number;
}

export interface ReputationLevel {
  level: number;
  name: string;
  minScore: number;
  maxScore: number;
  privileges: string[];
}

export interface ProgressMilestone {
  category: 'posting' | 'governance' | 'community' | 'trading';
  current: number;
  target: number;
  reward: string;
  progress: number;
}

export interface ReputationEvent {
  id: string;
  type: 'earned' | 'lost';
  amount: number;
  reason: string;
  timestamp: Date;
  category: string;
}

export interface BadgeRequirement {
  type: string;
  value: number;
  description: string;
}

export interface CommunityMembership {
  communityId: string;
  role: CommunityRole;
  joinedAt: Date;
  isActive: boolean;
}

export interface NavigationBreadcrumb {
  label: string;
  href?: string;
  isActive: boolean;
  icon?: string;
}

export interface ActivityIndicator {
  id: string;
  type: 'notification' | 'transaction' | 'community' | 'governance';
  count: number;
  priority: 'low' | 'medium' | 'high';
  lastUpdate: Date;
  isAnimated: boolean;
  color?: string; // Add optional color property
}
