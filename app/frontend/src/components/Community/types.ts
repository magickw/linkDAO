/**
 * Community Component Types
 * Type definitions for community components
 */

import { Community } from '../../models/Community';

export interface CommunityStats {
  memberCount: number;
  postCount: number;
  activeMembers: number;
  postsThisWeek: number;
  growthRate: number;
}

export interface MembershipStatus {
  isMember: boolean;
  role?: 'member' | 'moderator' | 'admin';
  joinedAt?: Date;
  canPost: boolean;
  canModerate: boolean;
}

export interface CommunityPageProps {
  communityId: string;
  initialData?: Community;
}

export interface CommunityHeaderProps {
  community: Community;
  stats: CommunityStats | null;
  membershipStatus: MembershipStatus;
  onJoinLeave: () => void;
  canModerate: boolean;
  isConnected: boolean;
}

export interface CommunityPostListProps {
  communityId: string;
  canPost: boolean;
  canModerate: boolean;
  sort: 'hot' | 'new' | 'top';
  filter: string;
  onSortChange: (sort: 'hot' | 'new' | 'top') => void;
  onFilterChange: (filter: string) => void;
}

export interface CommunitySidebarProps {
  community: Community;
  stats: CommunityStats | null;
  membershipStatus: MembershipStatus;
  activeTab: 'posts' | 'rules' | 'members';
  onTabChange: (tab: 'posts' | 'rules' | 'members') => void;
}

export interface CommunityRulesProps {
  rules: string[];
  canEdit: boolean;
  onRulesUpdate: (rules: string[]) => void;
}

export interface CommunityMembersProps {
  communityId: string;
  canModerate: boolean;
  memberCount: number;
}

export interface Member {
  id: string;
  address: string;
  ensName?: string;
  avatar?: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  reputation: number;
  postCount: number;
  lastActive: Date;
  isOnline: boolean;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  enforced: boolean;
  violationCount?: number;
}

export interface PostFilters {
  timeRange: 'day' | 'week' | 'month' | 'all';
  postType: 'all' | 'text' | 'image' | 'video' | 'link' | 'poll';
  flair: string | null;
}