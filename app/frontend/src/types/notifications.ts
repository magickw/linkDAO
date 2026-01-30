/**
 * Notification Types
 * Type definitions for the notification system
 */

export interface AppNotification {
  id: string;
  type: 'message' | 'reaction' | 'mention' | 'community' | 'governance' | 'system' | 'order' | 'tip' | 'bookmark' | 'new_comment' | 'comment_reply' | 'post_reply' | 'post_upvote' | 'post_downvote' | 'comment_upvote' | 'comment_downvote' | 'award' | 'new_order' | 'cancellation_request' | 'dispute_opened' | 'review_received' | 'order_update' | 'payment_received' | 'return_requested' | 'shipped' | 'delivered';
  category: 'direct_message' | 'post_reaction' | 'comment_mention' | 'community_invite' | 'governance_proposal' | 'system_alert' | 'order_update' | 'social_interaction' | 'financial' | 'marketplace';
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
  aggregated?: boolean; // Added for notification aggregation
}

// Order-specific notification interface
export interface OrderNotificationPayload {
  event: OrderNotificationEventType;
  orderId: string;
  orderNumber: string;
  buyerAddress: string;
  sellerAddress: string;
  productTitle: string;
  productImage?: string;
  amount: number;
  currency: string;
  trackingNumber?: string;
  trackingUrl?: string;
  cancellationReason?: string;
  refundAmount?: number;
  estimatedDelivery?: string;
  recipientType: 'buyer' | 'seller';
  recipientAddress: string;
}

// Order notification event types
export type OrderNotificationEventType =
  | 'order_created'
  | 'order_confirmed'
  | 'order_processing'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_refunded'
  | 'order_disputed'
  | 'delivery_confirmed'
  | 'payment_received';

export interface NotificationPreferences {
  // Email preferences
  email?: boolean;
  follows?: boolean;
  communityPosts?: boolean;
  governanceProposals?: boolean;

  // Push preferences
  push?: boolean;
  likes?: boolean;
  comments?: boolean;
  communityReplies?: boolean;
  communityMentions?: boolean;
  governanceVotes?: boolean;
  governanceResults?: boolean;

  // In-app preferences
  inApp?: boolean;

  // General settings
  enablePush: boolean;
  enableSound: boolean;
  enableDesktop: boolean;

  categories: {
    direct_message: { enabled: boolean; push: boolean; sound: boolean };
    post_reaction: { enabled: boolean; push: boolean; sound: boolean };
    comment_mention: { enabled: boolean; push: boolean; sound: boolean };
    community_invite: { enabled: boolean; push: boolean; sound: boolean };
    governance_proposal: { enabled: boolean; push: boolean; sound: boolean };
    system_alert: { enabled: boolean; push: boolean; sound: boolean };
    marketplace: { enabled: boolean; push: boolean; sound: boolean };
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