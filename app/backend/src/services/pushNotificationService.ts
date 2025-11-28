import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { users, communityMembers, communities, posts } from '../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

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
  type: 'community_update' | 'new_post' | 'mention' | 'reply' | 'community_invite' | 'governance_proposal' | 'proposal_result' | 'moderator_action' | 'system_update';
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

  // Register a new device subscription
  async registerDeviceSubscription(userId: string, subscription: any, userAgent?: string): Promise<boolean> {
    try {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        throw new Error('Invalid subscription data');
      }

      // Check if subscription already exists
      const existingSubscription = await db
        .select()
        .from(sql`push_notification_subscriptions`)
        .where(
          and(
            eq(sql`user_id`, userId),
            eq(sql`endpoint`, subscription.endpoint)
          )
        )
        .limit(1);

      if (existingSubscription.length > 0) {
        // Update existing subscription
        await db
          .update(sql`push_notification_subscriptions`)
          .set({
            keys: JSON.stringify(subscription.keys),
            user_agent: userAgent || '',
            is_active: true,
            last_used_at: new Date(),
            updated_at: new Date()
          })
          .where(eq(sql`id`, existingSubscription[0].id));
      } else {
        // Create new subscription
        await db
          .insert(sql`push_notification_subscriptions`)
          .values({
            user_id: userId,
            endpoint: subscription.endpoint,
            keys: JSON.stringify(subscription.keys),
            user_agent: userAgent || '',
            is_active: true,
            created_at: new Date(),
            last_used_at: new Date()
          });
      }

      safeLogger.info(`Device subscription registered for user: ${userId}`);
      return true;
    } catch (error) {
      safeLogger.error('Error registering device subscription:', error);
      return false;
    }
  }

  // Unregister a device subscription
  async unregisterDeviceSubscription(userId: string, endpoint: string): Promise<boolean> {
    try {
      await db
        .update(sql`push_notification_subscriptions`)
        .set({
          is_active: false,
          updated_at: new Date()
        })
        .where(
          and(
            eq(sql`user_id`, userId),
            eq(sql`endpoint`, endpoint)
          )
        );

      safeLogger.info(`Device subscription unregistered for user: ${userId}`);
      return true;
    } catch (error) {
      safeLogger.error('Error unregistering device subscription:', error);
      return false;
    }
  }

  // Get user's notification preferences
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await db
        .select()
        .from(sql`notification_preferences`)
        .where(eq(sql`user_id`, userId))
        .limit(1);

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
          systemUpdates: true
        };

        await db
          .insert(sql`notification_preferences`)
          .values({
            user_id: userId,
            preferences: JSON.stringify(defaultPreferences),
            created_at: new Date(),
            updated_at: new Date()
          });

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
        systemUpdates: true
      };
    }
  }

  // Update user's notification preferences
  async updateUserNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserNotificationPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };

      await db
        .update(sql`notification_preferences`)
        .set({
          preferences: JSON.stringify(updatedPreferences),
          updated_at: new Date()
        })
        .where(eq(sql`user_id`, userId));

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

      // Get user's active device subscriptions
      const subscriptions = await db
        .select()
        .from(sql`push_notification_subscriptions`)
        .where(
          and(
            eq(sql`user_id`, payload.userId),
            eq(sql`is_active`, true)
          )
        );

      if (subscriptions.length === 0) {
        safeLogger.info(`No active subscriptions found for user: ${payload.userId}`);
        return { success: 0, failed: 0 };
      }

      let successCount = 0;
      let failedCount = 0;

      // Send notification to each device
      for (const subscription of subscriptions) {
        try {
          const result = await this.sendWebPushNotification(subscription, {
            title: payload.title,
            body: payload.message,
            data: {
              type: payload.type,
              communityId: payload.communityId,
              postId: payload.postId,
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
            // Update last used timestamp
            await db
              .update(sql`push_notification_subscriptions`)
              .set({
                last_used_at: new Date()
              })
              .where(eq(sql`id`, subscription.id));
          } else {
            failedCount++;
            // If subscription is invalid, deactivate it
            if (result.error === 'invalid_subscription') {
              await db
                .update(sql`push_notification_subscriptions`)
                .set({
                  is_active: false,
                  updated_at: new Date()
                })
                .where(eq(sql`id`, subscription.id));
            }
          }
        } catch (error) {
          safeLogger.error(`Failed to send push notification to subscription ${subscription.id}:`, error);
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
      default:
        return true;
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
      await db
        .insert(sql`notification_logs`)
        .values({
          user_id: payload.userId,
          type: payload.type,
          community_id: payload.communityId,
          post_id: payload.postId,
          title: payload.title,
          message: payload.message,
          success_count: successCount,
          failed_count: failedCount,
          created_at: new Date()
        });
    } catch (error) {
      safeLogger.error('Error logging notification:', error);
    }
  }

  // Clean up inactive subscriptions
  async cleanupInactiveSubscriptions(daysInactive: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const result = await db
        .update(sql`push_notification_subscriptions`)
        .set({
          is_active: false,
          updated_at: new Date()
        })
        .where(
          and(
            eq(sql`is_active`, true),
            sql`last_used_at < ${cutoffDate}`
          )
        );

      safeLogger.info(`Cleaned up ${result} inactive subscriptions`);
      return result;
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

      const stats = await db
        .select({
          totalSent: sql<number>`COUNT(*)`,
          successful: sql<number>`SUM(success_count)`,
          failed: sql<number>`SUM(failed_count)`,
          byType: sql<string>`type`
        })
        .from(sql`notification_logs`)
        .where(
          and(
            eq(sql`user_id`, userId),
            sql`created_at >= ${cutoffDate}`
          )
        )
        .groupBy(sql`type`);

      return stats;
    } catch (error) {
      safeLogger.error('Error getting user notification stats:', error);
      return [];
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();