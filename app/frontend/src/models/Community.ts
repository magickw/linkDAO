export interface Community {
  id: string;
  name: string;
  slug: string;
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
  creatorAddress?: string; // Add creatorAddress field
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

export interface CreateCommunityInput {
  name: string;
  slug: string;
  displayName: string;
  description: string;
  rules?: string[];
  avatar?: string;
  banner?: string;
  category: string;
  tags?: string[];
  isPublic?: boolean;
  treasuryAddress?: string;
  governanceToken?: string;
  settings?: Partial<CommunitySettings>;
}

export interface UpdateCommunityInput {
  displayName?: string;
  slug?: string;
  description?: string;
  rules?: string[];
  avatar?: string;
  banner?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  treasuryAddress?: string;
  governanceToken?: string;
  settings?: Partial<CommunitySettings>;
}