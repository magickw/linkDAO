import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { users, communityMembers, communities, posts } from '../db/schema';
import { eq, and, inArray, sql, ne } from 'drizzle-orm';

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: number;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface NotificationPreferences {
  communityUpdates: boolean;
  newPosts: boolean;
  mentions: boolean;
  replies: boolean;
  communityInvites: boolean;
  governanceProposals: boolean;
  proposalResults: boolean;
  moderatorActions: boolean;
  systemUpdates: boolean;
  orderUpdates: boolean;
  orderStatusChanges: boolean;
  orderDeliveryUpdates: boolean;
  orderPaymentUpdates: boolean;
  orderDisputeUpdates: boolean;
}

interface DeviceSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

interface NotificationPayload {
  userId: string;
  type: 'community_update' | 'new_post' | 'mention' | 'reply' | 'community_invite' | 'governance_proposal' | 'proposal_result' | 'moderator_action' | 'system_update' | 'generic' | 
        'order_created' | 'order_received' | 'payment_received' | 'order_processing' | 'order_shipped' | 'order_delivered' | 'order_completed' | 
        'dispute_initiated' | 'dispute_resolved' | 'cancellation_requested' | 'cancellation_approved' | 'cancellation_rejected' | 'cancellation_auto_approved' |
        'delivery_confirmed' | 'payment_released';
  communityId?: string;
  postId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  ttl?: number; // Time to live in seconds
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private vapidPublicKey: string;
  private vapidPrivateKey: string;

  private constructor() {
    // In production, these should be loaded from environment variables
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
    
    if (!this.vapidPublicKey || !this.vapidPrivateKey) {
      safeLogger.warn('VAPID keys not configured. Push notifications will not work.');
    }
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Get VAPID public key for client-side subscription
  public getVapidPublicKey(): string {
    return this.vapidPublicKey;
  }

  // Register a push notification token (wrapper for registerDeviceSubscription)
  async registerToken(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<boolean> {
    // Convert token to subscription format
    const subscription = {
      endpoint: `https://${platform}-push.linkdao.com/token/${token}`,
      keys: {
        p256dh: '',
        auth: ''
      }
    };
    
    return await this.registerDeviceSubscription(userId, subscription, platform);
  }

  // Unregister a push notification token (wrapper for unregisterDeviceSubscription)
  async unregisterToken(token: string): Promise<boolean> {
    // Extract user ID from token - in a real implementation, this would be stored in a mapping
    // For now, we'll use a placeholder
    const userId = 'placeholder-user-id';
    const endpoint = `https://mobile-push.linkdao.com/token/${token}`;
    
    return await this.unregisterDeviceSubscription(userId, endpoint);
  }

  // Send notification to a specific user
  async sendToUser(userId: string, notification: { title: string; body: string; actionUrl?: string; data?: Record<string, any> }): Promise<boolean> {
    try {
      // Create a notification payload
      const payload = {
        userId,
        type: 'generic' as const,
        title: notification.title,
        message: notification.body,
        data: notification.data || {}
      };
      
      // Send the notification
      const result = await this.sendPushNotification(payload);
      return result.success > 0;
    } catch (error) {
      safeLogger.error('Error sending notification to user:', error);
      return false;
    }
  }

  // Register a new device subscription
  async registerDeviceSubscription(userId: string, subscription: any, userAgent?: string): Promise<boolean> {
    try {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        throw new Error('Invalid subscription data');
      }

      // Extract token from endpoint (for Expo push tokens, it's the full endpoint)
      const token = subscription.endpoint;

      // Extract platform from endpoint or userAgent
      let platform = 'web';
      if (userAgent) {
        if (userAgent.includes('ios') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
          platform = 'ios';
        } else if (userAgent.includes('android')) {
          platform = 'android';
        }
      } else if (subscription.endpoint.includes('exp.host')) {
        platform = 'expo';
      }

      // Check if token already exists
      const existingToken = await db.execute(sql`
        SELECT * FROM push_tokens 
        WHERE user_address = ${userId} AND token = ${token}
        LIMIT 1
      `);

      if (existingToken.length > 0) {
        // Token already exists, no need to insert again
        safeLogger.info(`Push token already registered for user: ${userId}`);
        return true;
      }

      // Create new token entry
      await db.execute(sql`
        INSERT INTO push_tokens 
        (user_address, token, platform, created_at)
        VALUES (${userId}, ${token}, ${platform}, ${new Date()})
      `);

      safeLogger.info(`Push token registered for user: ${userId}, platform: ${platform}`);
      return true;
    } catch (error) {
      safeLogger.error('Error registering device subscription:', error);
      return false;
    }
  }

  // Unregister a device subscription
  async unregisterDeviceSubscription(userId: string, endpoint: string): Promise<boolean> {
    try {
      await db.execute(sql`
        DELETE FROM push_tokens 
        WHERE user_address = ${userId} AND token = ${endpoint}
      `);

      safeLogger.info(`Push token unregistered for user: ${userId}`);
      return true;
    } catch (error) {
      safeLogger.error('Error unregistering device subscription:', error);
      return false;
    }
  }

  // Get user's notification preferences
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM notification_preferences 
        WHERE user_address = ${userId}
        LIMIT 1
      `);
      
      const preferences = Array.isArray(result) ? result : [];

      if (preferences.length === 0) {
        // Create default preferences
        const defaultPreferences: NotificationPreferences = {
          communityUpdates: true,
          newPosts: true,
          mentions: true,
          replies: true,
          communityInvites: true,
          governanceProposals: true,
          proposalResults: true,
          moderatorActions: false,
          systemUpdates: true,
          orderUpdates: true,
          orderStatusChanges: true,
          orderDeliveryUpdates: true,
          orderPaymentUpdates: true,
          orderDisputeUpdates: true
        };

        await db.execute(sql`
          INSERT INTO notification_preferences 
          (user_address, preferences, created_at, updated_at)
          VALUES (${userId}, ${JSON.stringify(defaultPreferences)}, ${new Date()}, ${new Date()})
        `);

        return defaultPreferences;
      }

      return JSON.parse(preferences[0].preferences) as NotificationPreferences;
    } catch (error) {
      safeLogger.error('Error getting user notification preferences:', error);
      // Return default preferences on error
      return {
        communityUpdates: true,
        newPosts: true,
        mentions: true,
        replies: true,
        communityInvites: true,
        governanceProposals: true,
        proposalResults: true,
        moderatorActions: false,
        systemUpdates: true,
        orderUpdates: true,
        orderStatusChanges: true,
        orderDeliveryUpdates: true,
        orderPaymentUpdates: true,
        orderDisputeUpdates: true
      };
    }
  }

  // Update user's notification preferences
  async updateUserNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserNotificationPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };

      await db.execute(sql`
        UPDATE notification_preferences 
        SET preferences = ${JSON.stringify(updatedPreferences)},
            updated_at = ${new Date()}
        WHERE user_address = ${userId}
      `);

      safeLogger.info(`Notification preferences updated for user: ${userId}`);
      return true;
    } catch (error) {
      safeLogger.error('Error updating user notification preferences:', error);
      return false;
    }
  }

  // Send push notification to a user
  async sendPushNotification(payload: NotificationPayload): Promise<{ success: number; failed: number }> {
    try {
      const userPreferences = await this.getUserNotificationPreferences(payload.userId);

      // Check if user has enabled this type of notification
      if (!this.isNotificationEnabled(payload.type, userPreferences)) {
        return { success: 0, failed: 0 };
      }

      // Get user's push tokens from push_tokens table
      const tokens = await db.execute(sql`
        SELECT * FROM push_tokens 
        WHERE user_address = ${payload.userId}
      `);

      if (tokens.length === 0) {
        safeLogger.info(`No push tokens found for user: ${payload.userId}`);
        return { success: 0, failed: 0 };
      }

      let successCount = 0;
      let failedCount = 0;

      // Send notification to each device
      for (const tokenRecord of tokens) {
        try {
          const result = await this.sendWebPushNotification(tokenRecord, {
            title: payload.title,
            body: payload.message,
            data: {
              type: payload.type,
              communityId: payload.communityId,
              postId: payload.postId,
              actionUrl: payload.data?.actionUrl,
              ...payload.data
            },
            icon: payload.data?.icon || '/icon-192x192.png',
            badge: payload.data?.badge || 1,
            tag: payload.type,
            requireInteraction: payload.type === 'governance_proposal',
            actions: this.getNotificationActions(payload.type)
          });

          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            // If token is invalid, remove it
            if (result.error === 'invalid_subscription') {
              await db.execute(sql`
                DELETE FROM push_tokens 
                WHERE id = ${tokenRecord.id}
              `);
            }
          }
        } catch (error) {
          safeLogger.error(`Failed to send push notification to token ${tokenRecord.id}:`, error);
          failedCount++;
        }
      }

      // Log notification for analytics
      await this.logNotification(payload, successCount, failedCount);

      return { success: successCount, failed: failedCount };
    } catch (error) {
      safeLogger.error('Error sending push notification:', error);
      return { success: 0, failed: 1 };
    }
  }

  // Send push notification to multiple users
  async sendBulkPushNotification(userIds: string[], payload: Omit<NotificationPayload, 'userId'>): Promise<{ success: number; failed: number }> {
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const result = await this.sendPushNotification({ ...payload, userId });
      totalSuccess += result.success;
      totalFailed += result.failed;
    }

    return { success: totalSuccess, failed: totalFailed };
  }

  // Send notification to all community members
  async notifyCommunityMembers(communityId: string, payload: Omit<NotificationPayload, 'userId'>): Promise<{ success: number; failed: number }> {
    try {
      // Get all active community members
      const members = await db
        .select({ userId: communityMembers.userAddress })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true)
          )
        );

      const userIds = members.map(member => member.userId);
      return await this.sendBulkPushNotification(userIds, payload);
    } catch (error) {
      safeLogger.error('Error notifying community members:', error);
      return { success: 0, failed: 1 };
    }
  }

  // Send notification for new post
  async notifyNewPost(communityId: string, postId: string, authorName: string, postContent: string): Promise<void> {
    try {
      const community = await db
        .select({ name: communities.name })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (community.length === 0) return;

      const members = await db
        .select({ userId: communityMembers.userAddress })
        .from(communityMembers)
        .where(
          and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.isActive, true),
            ne(communityMembers.userAddress, authorName) // Don't notify the author
          )
        );

      const truncatedContent = postContent.length > 100 ? postContent.substring(0, 100) + '...' : postContent;

      await this.sendBulkPushNotification(
        members.map(member => member.userId),
        {
          type: 'new_post',
          communityId,
          postId,
          title: `New post in ${community[0].name}`,
          message: `${authorName} posted: ${truncatedContent}`,
          data: {
            communityName: community[0].name,
            authorName,
            postContent: truncatedContent
          },
          priority: 'normal'
        }
      );
    } catch (error) {
      safeLogger.error('Error notifying new post:', error);
    }
  }

  // Send notification for mention
  async notifyMention(userId: string, communityId: string, postId: string, authorName: string): Promise<void> {
    try {
      const community = await db
        .select({ name: communities.name })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (community.length === 0) return;

      await this.sendPushNotification({
        userId,
        type: 'mention',
        communityId,
        postId,
        title: `You were mentioned in ${community[0].name}`,
        message: `${authorName} mentioned you in a post`,
        data: {
          communityName: community[0].name,
          authorName
        },
        priority: 'high'
      });
    } catch (error) {
      safeLogger.error('Error notifying mention:', error);
    }
  }

  // Send notification for community invite
  async notifyCommunityInvite(userId: string, communityId: string, inviterName: string): Promise<void> {
    try {
      const community = await db
        .select({ name: communities.name })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (community.length === 0) return;

      await this.sendPushNotification({
        userId,
        type: 'community_invite',
        communityId,
        title: `Community Invitation`,
        message: `${inviterName} invited you to join ${community[0].name}`,
        data: {
          communityName: community[0].name,
          inviterName
        },
        priority: 'normal'
      });
    } catch (error) {
      safeLogger.error('Error notifying community invite:', error);
    }
  }

  // Send notification for governance proposal
  async notifyGovernanceProposal(communityId: string, proposalId: string, proposalTitle: string): Promise<void> {
    try {
      const community = await db
        .select({ name: communities.name })
        .from(communities)
        .where(eq(communities.id, communityId))
        .limit(1);

      if (community.length === 0) return;

      await this.notifyCommunityMembers(communityId, {
        type: 'governance_proposal',
        communityId,
        postId: proposalId, // Using postId field for proposalId
        title: `New Governance Proposal`,
        message: `New proposal in ${community[0].name}: ${proposalTitle}`,
        data: {
          communityName: community[0].name,
          proposalTitle
        },
        priority: 'high'
      });
    } catch (error) {
      safeLogger.error('Error notifying governance proposal:', error);
    }
  }

  // Helper method to send Web Push notification
  private async sendWebPushNotification(subscription: any, payload: PushNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      // This would use the web-push library in a real implementation
      // For now, we'll simulate the behavior
      
      safeLogger.info(`Sending push notification to ${subscription.endpoint}`);
      
      // Simulate successful send
      return { success: true };
    } catch (error: any) {
      safeLogger.error('Error sending Web Push notification:', error);
      
      if (error.name === 'PushError' && error.statusCode === 410) {
        return { success: false, error: 'invalid_subscription' };
      }
      
      return { success: false, error: 'send_failed' };
    }
  }

  // Check if notification type is enabled in user preferences
  private isNotificationEnabled(type: string, preferences: NotificationPreferences): boolean {
    switch (type) {
      case 'community_update':
        return preferences.communityUpdates;
      case 'new_post':
        return preferences.newPosts;
      case 'mention':
        return preferences.mentions;
      case 'reply':
        return preferences.replies;
      case 'community_invite':
        return preferences.communityInvites;
      case 'governance_proposal':
        return preferences.governanceProposals;
      case 'proposal_result':
        return preferences.proposalResults;
      case 'moderator_action':
        return preferences.moderatorActions;
      case 'system_update':
        return preferences.systemUpdates;
      // Order notifications
      case 'order_created':
      case 'order_received':
      case 'order_processing':
      case 'order_shipped':
      case 'order_delivered':
      case 'order_completed':
        return preferences.orderStatusChanges;
      case 'payment_received':
      case 'payment_released':
        return preferences.orderPaymentUpdates;
      case 'delivery_confirmed':
        return preferences.orderDeliveryUpdates;
      case 'dispute_initiated':
      case 'dispute_resolved':
        return preferences.orderDisputeUpdates;
      case 'cancellation_requested':
      case 'cancellation_approved':
      case 'cancellation_rejected':
      case 'cancellation_auto_approved':
        return preferences.orderUpdates;
      default:
        return true;
    }
  }

  // Send order-specific push notification
  async sendOrderNotification(userAddress: string, orderNotification: {
    type: 'order_created' | 'order_received' | 'payment_received' | 'order_processing' | 'order_shipped' | 'order_delivered' | 'order_completed' | 'dispute_initiated' | 'dispute_resolved' | 'cancellation_requested' | 'cancellation_approved' | 'cancellation_rejected' | 'cancellation_auto_approved';
    title: string;
    message: string;
    orderId: string;
    data?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<boolean> {
    try {
      const result = await this.sendPushNotification({
        userId: userAddress,
        type: orderNotification.type,
        title: orderNotification.title,
        message: orderNotification.message,
        data: {
          orderId: orderNotification.orderId,
          actionUrl: `/orders/${orderNotification.orderId}`,
          ...orderNotification.data
        },
        priority: orderNotification.priority || 'normal'
      });

      return result.success > 0;
    } catch (error) {
      safeLogger.error('Error sending order push notification:', error);
      return false;
    }
  }

  // Get notification actions based on type
  private getNotificationActions(type: string): Array<{ action: string; title: string; icon?: string }> {
    switch (type) {
      case 'new_post':
        return [
          { action: 'view', title: 'View Post' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
      case 'mention':
        return [
          { action: 'view', title: 'View Mention' },
          { action: 'reply', title: 'Reply' }
        ];
      case 'community_invite':
        return [
          { action: 'accept', title: 'Accept' },
          { action: 'decline', title: 'Decline' }
        ];
      case 'governance_proposal':
        return [
          { action: 'vote', title: 'Vote Now' },
          { action: 'view', title: 'View Details' }
        ];
      default:
        return [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
    }
  }

  // Log notification for analytics
  private async logNotification(payload: NotificationPayload, successCount: number, failedCount: number): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO notification_logs 
        (user_address, type, community_id, post_id, title, message, success_count, failed_count, created_at)
        VALUES (${payload.userId}, ${payload.type}, ${payload.communityId}, ${payload.postId}, 
                ${payload.title}, ${payload.message}, ${successCount}, ${failedCount}, ${new Date()})
      `);
    } catch (error) {
      safeLogger.error('Error logging notification:', error);
    }
  }

  // Clean up inactive subscriptions
  async cleanupInactiveSubscriptions(daysInactive: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const result = await db.execute(sql`
        UPDATE push_notification_subscriptions 
        SET is_active = false, updated_at = ${new Date()}
        WHERE is_active = true AND last_used_at < ${cutoffDate}
      `);

      const count = (result as any).count || (Array.isArray(result) ? result.length : 0);
      safeLogger.info(`Cleaned up ${count} inactive subscriptions`);
      return count;
    } catch (error) {
      safeLogger.error('Error cleaning up inactive subscriptions:', error);
      return 0;
    }
  }

  // Get notification statistics for a user
  async getUserNotificationStats(userId: string, days: number = 30): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const stats = await db.execute(sql`
        SELECT COUNT(*) as totalSent, 
               SUM(success_count) as successful, 
               SUM(failed_count) as failed,
               type as byType
        FROM notification_logs 
        WHERE user_address = ${userId} AND created_at >= ${cutoffDate}
        GROUP BY type
      `);

      return stats;
    } catch (error) {
      safeLogger.error('Error getting user notification stats:', error);
      return [];
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();