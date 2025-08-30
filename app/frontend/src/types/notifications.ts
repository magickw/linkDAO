export interface BaseNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export type NotificationType = 
  // Personal notifications
  | 'follow' 
  | 'like' 
  | 'comment' 
  | 'mention'
  | 'tip_received'
  // Community notifications
  | 'community_new_post'
  | 'community_post_reply'
  | 'community_mention'
  | 'community_moderation'
  | 'community_join_request'
  | 'community_member_joined'
  | 'community_rule_update'
  // Governance notifications
  | 'governance_proposal'
  | 'governance_vote_reminder'
  | 'governance_result';

export interface CommunityNotification extends BaseNotification {
  type: 'community_new_post' | 'community_post_reply' | 'community_mention' | 'community_moderation' | 'community_join_request' | 'community_member_joined' | 'community_rule_update';
  communityId: string;
  communityName: string;
  postId?: string;
  authorId?: string;
  authorName?: string;
}

export interface PersonalNotification extends BaseNotification {
  type: 'follow' | 'like' | 'comment' | 'mention' | 'tip_received';
  fromUserId: string;
  fromUserName: string;
  postId?: string;
  amount?: string; // For tip notifications
}

export interface GovernanceNotification extends BaseNotification {
  type: 'governance_proposal' | 'governance_vote_reminder' | 'governance_result';
  proposalId: string;
  proposalTitle: string;
  daoId?: string;
  daoName?: string;
}

export type Notification = CommunityNotification | PersonalNotification | GovernanceNotification;

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  
  // Personal notification preferences
  follows: boolean;
  likes: boolean;
  comments: boolean;
  mentions: boolean;
  tips: boolean;
  
  // Community notification preferences
  communityPosts: boolean;
  communityReplies: boolean;
  communityMentions: boolean;
  communityModeration: boolean;
  communityMembers: boolean;
  
  // Governance notification preferences
  governanceProposals: boolean;
  governanceVotes: boolean;
  governanceResults: boolean;
  
  // Community-specific preferences
  communityPreferences: Record<string, CommunityNotificationPreferences>;
}

export interface CommunityNotificationPreferences {
  communityId: string;
  enabled: boolean;
  newPosts: boolean;
  replies: boolean;
  mentions: boolean;
  moderation: boolean;
  memberActivity: boolean;
}

export interface NotificationSettings {
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  maxPerDay: number;
}