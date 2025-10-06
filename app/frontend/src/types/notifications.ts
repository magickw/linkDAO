/**
 * Notification Types
 * Type definitions for the notification system
 */

export interface AppNotification {
  id: string;
  type: 'message' | 'reaction' | 'mention' | 'community' | 'governance' | 'system';
  category: 'direct_message' | 'post_reaction' | 'comment_mention' | 'community_invite' | 'governance_proposal' | 'system_alert';
  title: string;
  message: string;
  data?: Record<string, any>;
  fromAddress?: string;
  fromName?: string;
  avatarUrl?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  enablePush: boolean;
  enableSound: boolean;
  enableDesktop: boolean;
  email?: boolean;
  follows?: boolean;
  communityPosts?: boolean;
  categories: {
    direct_message: { enabled: boolean; push: boolean; sound: boolean };
    post_reaction: { enabled: boolean; push: boolean; sound: boolean };
    comment_mention: { enabled: boolean; push: boolean; sound: boolean };
    community_invite: { enabled: boolean; push: boolean; sound: boolean };
    governance_proposal: { enabled: boolean; push: boolean; sound: boolean };
    system_alert: { enabled: boolean; push: boolean; sound: boolean };
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  communityPreferences?: Record<string, CommunityNotificationPreferences>;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  includeRead?: boolean;
  category?: string;
  type?: string;
}

export interface GetNotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
  totalCount: number;
  hasMore: boolean;
}

export interface CommunityNotificationPreferences {
  communityId?: string;
  communityName?: string;
  enabled?: boolean;
  newPosts?: boolean;
  newComments?: boolean;
  mentions?: boolean;
  governance?: boolean;
  moderation?: boolean;
}