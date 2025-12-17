import emailService, { CommunityNotificationEmailData } from './emailService';
import { safeLogger } from '../utils/safeLogger';
import { pushNotificationService } from './pushNotificationService';
import { db } from '../db';
import { users, notificationPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface CommunityNotificationPayload {
  userAddress: string;
  communityId: string;
  communityName: string;
  communityAvatar?: string;
  type: CommunityNotificationType;
  title: string;
  message: string;
  actionUrl: string;
  contentPreview?: string;
  userName?: string;
  metadata?: Record<string, any>;
}

export type CommunityNotificationType =
  | 'community_join'
  | 'new_post'
  | 'new_comment'
  | 'post_reply'
  | 'comment_reply'
  | 'post_upvote'
  | 'comment_upvote'
  | 'mention'
  | 'governance_proposal'
  | 'governance_vote'
  | 'governance_passed'
  | 'governance_executed'
  | 'moderation_action'
  | 'moderation_warning'
  | 'moderation_ban'
  | 'role_change'
  | 'role_promotion'
  | 'community_announcement';

export interface NotificationPreference {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: CommunityNotificationType[];
}

export class CommunityNotificationService {
  private static instance: CommunityNotificationService;

  private constructor() {}

  public static getInstance(): CommunityNotificationService {
    if (!CommunityNotificationService.instance) {
      CommunityNotificationService.instance = new CommunityNotificationService();
    }
    return CommunityNotificationService.instance;
  }

  /**
   * Send a community notification through all enabled channels
   */
  async sendNotification(payload: CommunityNotificationPayload): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(payload.userAddress);

      // Check if user wants notifications for this type
      if (!this.shouldSendNotification(preferences, payload.type)) {
        safeLogger.info(`[CommunityNotification] User ${payload.userAddress} has disabled ${payload.type} notifications`);
        return;
      }

      // Send email notification
      if (preferences.email && emailService.isEnabled()) {
        await this.sendEmailNotification(payload);
      }

      // Send push notification
      if (preferences.push) {
        await this.sendPushNotification(payload);
      }

      // In-app notifications are handled separately by the real-time notification service
    } catch (error) {
      safeLogger.error('[CommunityNotification] Error sending notification:', error);
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBulkNotifications(payloads: CommunityNotificationPayload[]): Promise<void> {
    try {
      const promises = payloads.map((payload) => this.sendNotification(payload));
      await Promise.allSettled(promises);
    } catch (error) {
      safeLogger.error('[CommunityNotification] Error sending bulk notifications:', error);
    }
  }

  /**
   * Send email notification based on type
   */
  private async sendEmailNotification(payload: CommunityNotificationPayload): Promise<void> {
    try {
      // Get user email
      const user = await this.getUserEmail(payload.userAddress);
      if (!user?.email) {
        safeLogger.info(`[CommunityNotification] No email found for user ${payload.userAddress}`);
        return;
      }

      const emailData: CommunityNotificationEmailData = {
        communityName: payload.communityName,
        communityAvatar: payload.communityAvatar,
        actionUrl: payload.actionUrl,
        userName: payload.userName,
        contentPreview: payload.contentPreview,
        metadata: payload.metadata,
      };

      switch (payload.type) {
        case 'community_join':
          await emailService.sendCommunityJoinEmail(user.email, emailData);
          break;

        case 'new_post':
          await emailService.sendNewPostEmail(user.email, emailData);
          break;

        case 'new_comment':
        case 'post_reply':
        case 'comment_reply':
          await emailService.sendCommentEmail(user.email, emailData);
          break;

        case 'governance_proposal':
        case 'governance_vote':
        case 'governance_passed':
        case 'governance_executed':
          await emailService.sendGovernanceProposalEmail(user.email, emailData);
          break;

        case 'moderation_action':
        case 'moderation_warning':
        case 'moderation_ban':
          await emailService.sendModerationActionEmail(user.email, emailData);
          break;

        case 'role_change':
        case 'role_promotion':
          await emailService.sendRoleChangeEmail(user.email, emailData);
          break;

        default:
          // Send generic email for other types
          await emailService.sendEmail({
            to: user.email,
            subject: payload.title,
            html: this.getGenericEmailTemplate(payload),
          });
      }
    } catch (error) {
      safeLogger.error('[CommunityNotification] Error sending email:', error);
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(payload: CommunityNotificationPayload): Promise<void> {
    try {
      const pushNotification = {
        title: payload.title,
        body: payload.message,
        actionUrl: payload.actionUrl,
        communityId: payload.communityId,
        communityName: payload.communityName,
        notificationType: this.mapToPushNotificationType(payload.type),
        data: {
          type: payload.type,
          ...payload.metadata,
        },
      };

      // Note: sendCommunityNotification method needs to be implemented in pushNotificationService
      // For now, using generic sendNotification
      await pushNotificationService.sendNotification(
        payload.userAddress,
        {
          type: this.mapToPushNotificationType(payload.type),
          title: pushNotification.title,
          message: pushNotification.body,
          data: pushNotification.data
        }
      );
    } catch (error) {
      safeLogger.error('[CommunityNotification] Error sending push notification:', error);
    }
  }

  /**
   * Get user email from database
   * Note: Currently users table doesn't have email field
   * This method will return null until email field is added
   */
  private async getUserEmail(userAddress: string): Promise<{ email: string } | null> {
    try {
      // TODO: Add email field to users table when user profiles are expanded
      // For now, return null as users table doesn't have email field
      safeLogger.info(`[CommunityNotification] Email field not yet available in users table for ${userAddress}`);
      return null;

      /* Future implementation when email field is added:
      const result = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.walletAddress, userAddress))
        .limit(1);

      return result.length > 0 ? result[0] : null;
      */
    } catch (error) {
      safeLogger.error('[CommunityNotification] Error getting user email:', error);
      return null;
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userAddress: string): Promise<NotificationPreference> {
    try {
      const result = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userAddress, userAddress))
        .limit(1);

      if (result.length > 0) {
        const prefs = JSON.parse(result[0].preferences);
        return {
          email: prefs.email ?? true,
          push: prefs.push ?? true,
          inApp: prefs.inApp ?? true,
          types: prefs.types ?? this.getAllNotificationTypes(),
        };
      }

      // Default preferences if none exist
      return {
        email: true,
        push: true,
        inApp: true,
        types: this.getAllNotificationTypes(),
      };
    } catch (error) {
      safeLogger.error('[CommunityNotification] Error getting user preferences:', error);
      // Return default preferences on error
      return {
        email: true,
        push: true,
        inApp: true,
        types: this.getAllNotificationTypes(),
      };
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(
    preferences: NotificationPreference,
    type: CommunityNotificationType
  ): boolean {
    return preferences.types.includes(type);
  }

  /**
   * Get all notification types
   */
  private getAllNotificationTypes(): CommunityNotificationType[] {
    return [
      'community_join',
      'new_post',
      'new_comment',
      'post_reply',
      'comment_reply',
      'post_upvote',
      'comment_upvote',
      'mention',
      'governance_proposal',
      'governance_vote',
      'governance_passed',
      'governance_executed',
      'moderation_action',
      'moderation_warning',
      'moderation_ban',
      'role_change',
      'role_promotion',
      'community_announcement',
    ];
  }

  /**
   * Map community notification type to push notification type
   */
  private mapToPushNotificationType(
    type: CommunityNotificationType
  ): 'post' | 'comment' | 'governance' | 'moderation' | 'role_change' | 'mention' {
    switch (type) {
      case 'new_post':
        return 'post';
      case 'new_comment':
      case 'post_reply':
      case 'comment_reply':
        return 'comment';
      case 'governance_proposal':
      case 'governance_vote':
      case 'governance_passed':
      case 'governance_executed':
        return 'governance';
      case 'moderation_action':
      case 'moderation_warning':
      case 'moderation_ban':
        return 'moderation';
      case 'role_change':
      case 'role_promotion':
        return 'role_change';
      case 'mention':
        return 'mention';
      default:
        return 'post';
    }
  }

  /**
   * Get generic email template for unsupported notification types
   */
  private getGenericEmailTemplate(payload: CommunityNotificationPayload): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${payload.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            ${payload.communityAvatar ? `<img src="${payload.communityAvatar}" alt="${payload.communityName}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid white; margin-bottom: 16px;" />` : ''}
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${payload.communityName}</h1>
          </div>

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">${payload.title}</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${payload.message}
            </p>

            ${payload.contentPreview ? `
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  ${payload.contentPreview}
                </p>
              </div>
            ` : ''}

            <a href="${payload.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View in Community
            </a>
          </div>

          <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Community Platform</p>
            <p style="color: #6c757d; font-size: 12px; margin: 0;">
              You received this email because you're a member of this community.
              <a href="{{unsubscribeUrl}}" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Helper method: Notify user when they join a community
   */
  async notifyUserJoinedCommunity(
    userAddress: string,
    communityId: string,
    communityName: string,
    communityAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      userAddress,
      communityId,
      communityName,
      communityAvatar,
      type: 'community_join',
      title: `Welcome to ${communityName}!`,
      message: `You've successfully joined ${communityName}. Start exploring and connecting with the community.`,
      actionUrl: `/communities/${communityId}`,
    });
  }

  /**
   * Helper method: Notify users of a new post in the community
   */
  async notifyNewPost(
    userAddresses: string[],
    communityId: string,
    communityName: string,
    postId: string,
    authorName: string,
    postTitle: string,
    communityAvatar?: string
  ): Promise<void> {
    const payloads: CommunityNotificationPayload[] = userAddresses.map((userAddress) => ({
      userAddress,
      communityId,
      communityName,
      communityAvatar,
      type: 'new_post',
      title: `New post in ${communityName}`,
      message: `${authorName} posted in ${communityName}`,
      contentPreview: postTitle,
      userName: authorName,
      actionUrl: `/communities/${communityId}/posts/${postId}`,
    }));

    await this.sendBulkNotifications(payloads);
  }

  /**
   * Helper method: Notify user of a reply to their post/comment
   */
  async notifyReply(
    userAddress: string,
    communityId: string,
    communityName: string,
    postId: string,
    replyAuthor: string,
    replyContent: string,
    isPostReply: boolean,
    communityAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      userAddress,
      communityId,
      communityName,
      communityAvatar,
      type: isPostReply ? 'post_reply' : 'comment_reply',
      title: `New reply in ${communityName}`,
      message: `${replyAuthor} replied to your ${isPostReply ? 'post' : 'comment'}`,
      contentPreview: replyContent.substring(0, 150),
      userName: replyAuthor,
      actionUrl: `/communities/${communityId}/posts/${postId}`,
    });
  }

  /**
   * Helper method: Notify user of a mention
   */
  async notifyMention(
    userAddress: string,
    communityId: string,
    communityName: string,
    postId: string,
    mentionedBy: string,
    content: string,
    communityAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      userAddress,
      communityId,
      communityName,
      communityAvatar,
      type: 'mention',
      title: `You were mentioned in ${communityName}`,
      message: `${mentionedBy} mentioned you in a discussion`,
      contentPreview: content.substring(0, 150),
      userName: mentionedBy,
      actionUrl: `/communities/${communityId}/posts/${postId}`,
    });
  }

  /**
   * Helper method: Notify users of a new governance proposal
   */
  async notifyGovernanceProposal(
    userAddresses: string[],
    communityId: string,
    communityName: string,
    proposalId: string,
    proposalTitle: string,
    proposerName: string,
    communityAvatar?: string
  ): Promise<void> {
    const payloads: CommunityNotificationPayload[] = userAddresses.map((userAddress) => ({
      userAddress,
      communityId,
      communityName,
      communityAvatar,
      type: 'governance_proposal',
      title: `New governance proposal in ${communityName}`,
      message: `${proposerName} submitted a new proposal. Cast your vote!`,
      contentPreview: proposalTitle,
      userName: proposerName,
      actionUrl: `/communities/${communityId}/governance/${proposalId}`,
    }));

    await this.sendBulkNotifications(payloads);
  }

  /**
   * Helper method: Notify user of a role change
   */
  async notifyRoleChange(
    userAddress: string,
    communityId: string,
    communityName: string,
    newRole: string,
    isPromotion: boolean,
    communityAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      userAddress,
      communityId,
      communityName,
      communityAvatar,
      type: isPromotion ? 'role_promotion' : 'role_change',
      title: isPromotion ? 'Congratulations!' : 'Role Update',
      message: `Your role in ${communityName} has been ${isPromotion ? 'upgraded' : 'updated'} to ${newRole}`,
      actionUrl: `/communities/${communityId}`,
      metadata: { role: newRole, isPromotion },
    });
  }

  /**
   * Helper method: Notify user of moderation action
   */
  async notifyModerationAction(
    userAddress: string,
    communityId: string,
    communityName: string,
    action: string,
    reason: string,
    communityAvatar?: string
  ): Promise<void> {
    await this.sendNotification({
      userAddress,
      communityId,
      communityName,
      communityAvatar,
      type: 'moderation_action',
      title: 'Moderation Action',
      message: `A moderation action has been taken on your content in ${communityName}`,
      contentPreview: `Action: ${action}. Reason: ${reason}`,
      actionUrl: `/communities/${communityId}`,
      metadata: { action, reason },
    });
  }
}

export default CommunityNotificationService.getInstance();
