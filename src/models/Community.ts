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