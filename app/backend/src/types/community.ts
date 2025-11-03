export interface Community {
  id: string;
  name: string;
  displayName: string;
  description: string;
  rules: string[];
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
  banner?: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  moderators: string[];
  treasuryAddress?: string;
  governanceToken?: string;
  settings: CommunitySettings;
  
  // Performance tracking fields
  viewCount?: number;
  engagementScore?: number;
  lastActiveAt?: Date;
  trendingScore?: number;
  onlineMemberCount?: number;
  activeMemberCount?: number;
}

export interface CommunitySettings {
  allowedPostTypes: PostType[];
  requireApproval: boolean;
  minimumReputation: number;
  stakingRequirements: StakingRequirement[];
}

export interface PostType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface StakingRequirement {
  action: 'post' | 'comment' | 'vote';
  tokenAddress: string;
  minimumAmount: string;
  lockDuration: number; // in seconds
}