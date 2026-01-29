import { Community } from '../models/Community';

// Re-export Community type for convenience
export type { Community };

export interface CommunityStats {
  memberCount: number;
  onlineCount: number;
  postsThisWeek: number;
  activeDiscussions: number;
  growthRate: number;
  createdAt: Date;
}

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface Moderator {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'moderator';
  tenure: number; // days since becoming moderator
  lastActive: Date;
  isOnline: boolean;
}

export interface AboutCommunityWidgetProps {
  community: Community;
  stats: CommunityStats;
  rules: CommunityRule[];
  canEdit: boolean;
  onEdit?: () => void;
}

export interface CommunityWidgetState {
  isRulesExpanded: boolean;
  isEditing: boolean;
  loading: boolean;
  error: string | null;
}