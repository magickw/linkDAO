/**
 * Enhanced Notification Service
 * Integrates real-time, email, and database notifications with user preferences
 */

import { safeLogger } from '../utils/safeLogger';
import { emailService, EmailService } from './emailService';
import { notificationDeliveryService } from './notificationDeliveryService';
import { DatabaseService } from './databaseService';
import { getPrimaryFrontendUrl } from '../utils/urlUtils';

export interface SocialNotificationData {
  userId: string;
  type: 'mention' | 'follow' | 'reaction' | 'comment' | 'repost' | 'tip' | 'governance' | 'community' | 'message';
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Notification content
  title: string;
  message: string;
  actionUrl?: string;

  // Actor information
  actorId?: string;
  actorHandle?: string;
  actorAvatar?: string;

  // Context
  postId?: string;
  commentId?: string;
  communityId?: string;
  amount?: number;
  tokenSymbol?: string;

  // Metadata
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  emailDigest?: boolean;
  emailFrequency?: 'realtime' | 'hourly' | 'daily';
  categories?: {
    mentions?: boolean;
    follows?: boolean;
    reactions?: boolean;
    comments?: boolean;
    reposts?: boolean;
    tips?: boolean;
    governance?: boolean;
    community?: boolean;
    messages?: boolean;
  };
}

export class EnhancedNotificationService {
  private static instance: EnhancedNotificationService;
  private databaseService: DatabaseService;
  private emailService: EmailService;

  private constructor() {
    this.databaseService = new DatabaseService();
    this.emailService = EmailService.getInstance();
  }

  public static getInstance(): EnhancedNotificationService {
    if (!EnhancedNotificationService.instance) {
      EnhancedNotificationService.instance = new EnhancedNotificationService();
    }
    return EnhancedNotificationService.instance;
  }

  /**
   * Create a social notification with email support
   */
  async createSocialNotification(data: SocialNotificationData): Promise<string> {
    try {
      // 1. Save notification to database
      const notificationId = await this.saveNotificationToDatabase(data);

      // 2. Get user preferences
      const preferences = await this.getUserPreferences(data.userId);

      // 3. Send via appropriate channels based on preferences
      if (preferences.email && this.shouldSendEmail(data.type, preferences)) {
        await this.sendEmailNotification(data, preferences);
      }

      if (preferences.push) {
        // Push notifications are handled by realTimeNotificationService via WebSocket
        // This is already working, so we don't need to duplicate it
      }

      safeLogger.info(`[EnhancedNotification] Created notification for user ${data.userId}:`, {
        type: data.type,
        priority: data.priority,
        emailSent: preferences.email
      });

      return notificationId;
    } catch (error) {
      safeLogger.error('[EnhancedNotification] Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Save notification to database
   */
  private async saveNotificationToDatabase(data: SocialNotificationData): Promise<string> {
    try {
      const notification = {
        userAddress: data.userId,
        type: data.type,
        message: data.message,
        metadata: JSON.stringify({
          title: data.title,
          actionUrl: data.actionUrl,
          actorId: data.actorId,
          actorHandle: data.actorHandle,
          actorAvatar: data.actorAvatar,
          postId: data.postId,
          commentId: data.commentId,
          communityId: data.communityId,
          amount: data.amount,
          tokenSymbol: data.tokenSymbol,
          priority: data.priority,
          ...data.metadata
        }),
        read: false
      };

      await this.databaseService.createNotification(notification);

      // Return a unique ID for tracking
      return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      safeLogger.error('[EnhancedNotification] Error saving to database:', error);
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const prefs = await this.databaseService.getNotificationPreferences(userId);

      if (prefs && prefs.preferences) {
        // Parse preferences JSON
        const parsed = typeof prefs.preferences === 'string'
          ? JSON.parse(prefs.preferences)
          : prefs.preferences;

        return {
          email: parsed.email !== false, // Default to true
          push: parsed.push !== false, // Default to true
          sms: parsed.sms || false, // Default to false
          emailDigest: parsed.emailDigest || false,
          emailFrequency: parsed.emailFrequency || 'realtime',
          categories: parsed.categories || {}
        };
      }

      // Default preferences
      return {
        email: true,
        push: true,
        sms: false,
        emailFrequency: 'realtime',
        categories: {}
      };
    } catch (error) {
      safeLogger.error('[EnhancedNotification] Error getting preferences:', error);
      // Return safe defaults
      return {
        email: true,
        push: true,
        sms: false,
        emailFrequency: 'realtime'
      };
    }
  }

  /**
   * Check if email should be sent based on type and preferences
   */
  private shouldSendEmail(type: string, preferences: NotificationPreferences): boolean {
    // Check if email frequency is realtime
    if (preferences.emailFrequency !== 'realtime') {
      return false; // Digest emails will be handled separately
    }

    // Check category-specific preferences
    if (preferences.categories) {
      const categoryPref = preferences.categories[`${type}s` as keyof typeof preferences.categories];
      if (categoryPref === false) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    data: SocialNotificationData,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      // Get user email address
      const userEmail = await this.getUserEmail(data.userId);
      if (!userEmail) {
        safeLogger.warn(`[EnhancedNotification] No email found for user ${data.userId}`);
        return;
      }

      // Log delivery attempt
      await notificationDeliveryService.logDeliveryAttempt(
        `social_${data.type}`,
        userEmail,
        'email',
        data.title,
        data.message,
        {
          userId: data.userId,
          type: data.type,
          actorHandle: data.actorHandle
        }
      );

      // Send appropriate email based on notification type
      const emailSent = await this.sendTypedEmail(userEmail, data);

      if (emailSent) {
        safeLogger.info(`[EnhancedNotification] Email sent to ${userEmail} for ${data.type}`);
      }
    } catch (error) {
      safeLogger.error('[EnhancedNotification] Error sending email:', error);
    }
  }

  /**
   * Send typed email based on notification type
   */
  private async sendTypedEmail(email: string, data: SocialNotificationData): Promise<boolean> {
    const frontendUrl = getPrimaryFrontendUrl();
    const actionUrl = data.actionUrl || frontendUrl;

    switch (data.type) {
      case 'mention':
        return this.emailService.sendEmail({
          to: email,
          subject: `${data.actorHandle || 'Someone'} mentioned you on LinkDAO`,
          html: this.getMentionEmailTemplate(data, actionUrl)
        });

      case 'follow':
        return this.emailService.sendEmail({
          to: email,
          subject: `${data.actorHandle || 'Someone'} started following you`,
          html: this.getFollowEmailTemplate(data, actionUrl)
        });

      case 'reaction':
        return this.emailService.sendEmail({
          to: email,
          subject: `${data.actorHandle || 'Someone'} reacted to your post`,
          html: this.getReactionEmailTemplate(data, actionUrl)
        });

      case 'comment':
        return this.emailService.sendEmail({
          to: email,
          subject: `${data.actorHandle || 'Someone'} commented on your post`,
          html: this.getCommentEmailTemplate(data, actionUrl)
        });

      case 'repost':
        return this.emailService.sendEmail({
          to: email,
          subject: `${data.actorHandle || 'Someone'} reposted your post`,
          html: this.getRepostEmailTemplate(data, actionUrl)
        });

      case 'tip':
        return this.emailService.sendEmail({
          to: email,
          subject: `You received ${data.amount} ${data.tokenSymbol || 'tokens'}!`,
          html: this.getTipEmailTemplate(data, actionUrl)
        });

      case 'governance':
      case 'community':
      case 'message':
        // Use generic template for these types
        return this.emailService.sendEmail({
          to: email,
          subject: data.title,
          html: this.getGenericEmailTemplate(data, actionUrl)
        });

      default:
        return false;
    }
  }

  /**
   * Get user email address
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await this.databaseService.getUserByAddress(userId);
      return user?.email || null;
    } catch (error) {
      safeLogger.error('[EnhancedNotification] Error getting user email:', error);
      return null;
    }
  }

  // Email Templates

  private getEmailHeader(): string {
    return `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">LinkDAO</h1>
      </div>
    `;
  }

  private getEmailFooter(): string {
    const frontendUrl = getPrimaryFrontendUrl();
    return `
      <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 30px;">
        <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px 0;">LinkDAO - Decentralized Social Platform</p>
        <p style="color: #6c757d; font-size: 12px; margin: 0;">
          <a href="${frontendUrl}/settings/notifications" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
        </p>
      </div>
    `;
  }

  private getMentionEmailTemplate(data: SocialNotificationData, actionUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You were mentioned</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader()}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">You were mentioned! 👋</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              <strong>${data.actorHandle || 'Someone'}</strong> mentioned you in a ${data.commentId ? 'comment' : 'post'}.
            </p>

            ${data.message ? `
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  ${data.message}
                </p>
              </div>
            ` : ''}

            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View ${data.commentId ? 'Comment' : 'Post'}
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getFollowEmailTemplate(data: SocialNotificationData, actionUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Follower</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader()}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">New Follower! 🎉</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              <strong>${data.actorHandle || 'Someone'}</strong> started following you on LinkDAO.
            </p>

            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Profile
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getReactionEmailTemplate(data: SocialNotificationData, actionUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Reaction</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader()}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">Someone reacted to your post! ${data.metadata?.reactionEmoji || '❤️'}</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              <strong>${data.actorHandle || 'Someone'}</strong> reacted to your post.
            </p>

            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Post
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getCommentEmailTemplate(data: SocialNotificationData, actionUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Comment</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader()}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">New Comment 💬</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              <strong>${data.actorHandle || 'Someone'}</strong> commented on your post.
            </p>

            ${data.message ? `
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #667eea; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  ${data.message}
                </p>
              </div>
            ` : ''}

            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Comment
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getRepostEmailTemplate(data: SocialNotificationData, actionUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Repost</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader()}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">Your post was reposted! 🔄</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              <strong>${data.actorHandle || 'Someone'}</strong> reposted your content.
            </p>

            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Repost
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getTipEmailTemplate(data: SocialNotificationData, actionUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You received a tip!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader()}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">You received a tip! 💰</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              <strong>${data.actorHandle || 'Someone'}</strong> tipped you <strong>${data.amount} ${data.tokenSymbol || 'tokens'}</strong>!
            </p>

            ${data.message ? `
              <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #10b981; border-radius: 4px; margin: 24px 0;">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0;">
                  <em>"${data.message}"</em>
                </p>
              </div>
            ` : ''}

            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
              View Post
            </a>
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  private getGenericEmailTemplate(data: SocialNotificationData, actionUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${this.getEmailHeader()}

          <div style="padding: 40px 30px;">
            <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">${data.title}</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${data.message}
            </p>

            ${data.actionUrl ? `
              <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
                View Details
              </a>
            ` : ''}
          </div>

          ${this.getEmailFooter()}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send batch notifications (for digest emails)
   */
  async sendDigestEmail(userId: string, notifications: SocialNotificationData[]): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail(userId);
      if (!userEmail) {
        return false;
      }

      const frontendUrl = getPrimaryFrontendUrl();

      const notificationsList = notifications.map(n => `
        <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin-bottom: 12px;">
          <h3 style="color: #1a1a1a; font-size: 16px; margin: 0 0 8px 0;">${n.title}</h3>
          <p style="color: #4a5568; font-size: 14px; margin: 0 0 8px 0;">${n.message}</p>
          ${n.actionUrl ? `<a href="${n.actionUrl}" style="color: #667eea; font-size: 14px;">View →</a>` : ''}
        </div>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your LinkDAO Digest</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            ${this.getEmailHeader()}

            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0;">Your LinkDAO Digest 📬</h2>

              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                You have <strong>${notifications.length} new notification${notifications.length !== 1 ? 's' : ''}</strong>.
              </p>

              ${notificationsList}

              <a href="${frontendUrl}/notifications" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 20px;">
                View All Notifications
              </a>
            </div>

            ${this.getEmailFooter()}
          </div>
        </body>
        </html>
      `;

      return await this.emailService.sendEmail({
        to: userEmail,
        subject: `Your LinkDAO Digest - ${notifications.length} new notification${notifications.length !== 1 ? 's' : ''}`,
        html
      });
    } catch (error) {
      safeLogger.error('[EnhancedNotification] Error sending digest email:', error);
      return false;
    }
  }
}

// Export singleton instance
export const enhancedNotificationService = EnhancedNotificationService.getInstance();
