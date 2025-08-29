export interface CommunityMembership {
  id: string;
  userId: string;
  communityId: string;
  role: CommunityRole;
  joinedAt: Date;
  reputation: number;
  contributions: number;
  isActive: boolean;
  lastActivityAt: Date;
}

export type CommunityRole = 'member' | 'moderator' | 'admin' | 'owner';

export interface CreateCommunityMembershipInput {
  userId: string;
  communityId: string;
  role?: CommunityRole;
}

export interface UpdateCommunityMembershipInput {
  role?: CommunityRole;
  reputation?: number;
  contributions?: number;
  isActive?: boolean;
}

export interface CommunityMembershipStats {
  totalMembers: number;
  activeMembers: number;
  moderators: number;
  admins: number;
  recentJoins: number; // last 30 days
}