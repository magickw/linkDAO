import { db } from '../db/connectionPool';
import { safeLogger } from '../utils/safeLogger';
import { notifications, users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AppealNotification {
  userId: string;
  appealId: number;
  type: 'appeal_submitted' | 'appeal_status_changed' | 'jury_selected' | 'voting_started' | 'decision_reached' | 'outcome_executed';
  title: string;
  message: string;
  metadata?: any;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export class AppealNotificationService {
  /**
   * Send notification for appeal submission
   */
  async notifyAppealSubmitted(
    appellantId: string,
    appealId: number,
    caseId: number
  ): Promise<void> {
    try {
      const notification: AppealNotification = {
        userId: appellantId,
        appealId,
        type: 'appeal_submitted',
        title: 'Appeal Submitted',
        message: `Your appeal for case #${caseId} has been submitted successfully and is now under review.`,
        metadata: {
          caseId,
          appealId,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendNotification(notification);
    } catch (error) {
      safeLogger.error('Error sending appeal submission notification:', error);
    }
  }

  /**
   * Send notification for appeal status change
   */
  async notifyAppealStatusChanged(
    appellantId: string,
    appealId: number,
    oldStatus: string,
    newStatus: string,
    additionalInfo?: any
  ): Promise<void> {
    try {
      const statusMessages = {
        'jury_selection': 'Your appeal is now in jury selection phase. Qualified jurors are being selected.',
        'voting': 'Jury selection is complete. The voting phase has begun.',
        'decided': 'The jury has reached a decision on your appeal.',
        'executed': 'The appeal decision has been executed and is now final.'
      };

      const message = statusMessages[newStatus as keyof typeof statusMessages] || 
        `Your appeal status has changed from ${oldStatus} to ${newStatus}.`;

      const notification: AppealNotification = {
        userId: appellantId,
        appealId,
        type: 'appeal_status_changed',
        title: 'Appeal Status Update',
        message,
        metadata: {
          appealId,
          oldStatus,
          newStatus,
          additionalInfo,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendNotification(notification);
    } catch (error) {
      safeLogger.error('Error sending appeal status change notification:', error);
    }
  }

  /**
   * Send notification when user is selected as juror
   */
  async notifyJurySelection(
    jurorId: string,
    appealId: number,
    selectionWeight: number
  ): Promise<void> {
    try {
      const notification: AppealNotification = {
        userId: jurorId,
        appealId,
        type: 'jury_selected',
        title: 'Selected as Juror',
        message: `You have been selected as a juror for appeal #${appealId}. Please review the case and cast your vote.`,
        metadata: {
          appealId,
          selectionWeight,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendNotification(notification);
    } catch (error) {
      safeLogger.error('Error sending jury selection notification:', error);
    }
  }

  /**
   * Send notification when voting period starts
   */
  async notifyVotingStarted(
    jurorIds: string[],
    appealId: number,
    votingDeadline: Date
  ): Promise<void> {
    try {
      for (const jurorId of jurorIds) {
        const notification: AppealNotification = {
          userId: jurorId,
          appealId,
          type: 'voting_started',
          title: 'Voting Period Started',
          message: `The voting period for appeal #${appealId} has begun. Please cast your vote before ${votingDeadline.toLocaleDateString()}.`,
          metadata: {
            appealId,
            votingDeadline: votingDeadline.toISOString(),
            timestamp: new Date().toISOString()
          }
        };

        await this.sendNotification(notification);
      }
    } catch (error) {
      safeLogger.error('Error sending voting started notifications:', error);
    }
  }

  /**
   * Send notification when jury decision is reached
   */
  async notifyDecisionReached(
    appellantId: string,
    jurorIds: string[],
    appealId: number,
    decision: 'uphold' | 'overturn' | 'partial',
    reasoning?: string
  ): Promise<void> {
    try {
      // Notify appellant
      const appellantMessage = this.getDecisionMessage(decision, true);
      const appellantNotification: AppealNotification = {
        userId: appellantId,
        appealId,
        type: 'decision_reached',
        title: 'Appeal Decision Reached',
        message: appellantMessage,
        metadata: {
          appealId,
          decision,
          reasoning,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendNotification(appellantNotification);

      // Notify jurors
      const jurorMessage = this.getDecisionMessage(decision, false);
      for (const jurorId of jurorIds) {
        const jurorNotification: AppealNotification = {
          userId: jurorId,
          appealId,
          type: 'decision_reached',
          title: 'Jury Decision Finalized',
          message: jurorMessage,
          metadata: {
            appealId,
            decision,
            timestamp: new Date().toISOString()
          }
        };

        await this.sendNotification(jurorNotification);
      }
    } catch (error) {
      safeLogger.error('Error sending decision reached notifications:', error);
    }
  }

  /**
   * Send notification when appeal outcome is executed
   */
  async notifyOutcomeExecuted(
    appellantId: string,
    appealId: number,
    decision: 'uphold' | 'overturn' | 'partial',
    executionDetails: any
  ): Promise<void> {
    try {
      const outcomeMessages = {
        'uphold': 'The original moderation decision has been upheld. Your staked tokens have been forfeited.',
        'overturn': 'The original moderation decision has been overturned. Your content has been restored and your stake refunded with rewards.',
        'partial': 'The jury reached a partial decision. Some aspects of the original decision have been modified.'
      };

      const message = outcomeMessages[decision] || 'The appeal outcome has been executed.';

      const notification: AppealNotification = {
        userId: appellantId,
        appealId,
        type: 'outcome_executed',
        title: 'Appeal Outcome Executed',
        message,
        metadata: {
          appealId,
          decision,
          executionDetails,
          timestamp: new Date().toISOString()
        }
      };

      await this.sendNotification(notification);
    } catch (error) {
      safeLogger.error('Error sending outcome executed notification:', error);
    }
  }

  /**
   * Send notification with multiple delivery methods
   */
  private async sendNotification(notification: AppealNotification): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserNotificationPreferences(notification.userId);

      // Send in-app notification (always sent)
      await this.sendInAppNotification(notification);

      // Send email notification if enabled
      if (preferences.email) {
        await this.sendEmailNotification(notification);
      }

      // Send push notification if enabled
      if (preferences.push) {
        await this.sendPushNotification(notification);
      }
    } catch (error) {
      safeLogger.error('Error sending notification:', error);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: AppealNotification): Promise<void> {
    try {
      await db.insert(notifications).values({
        userAddress: notification.userId, // Using userAddress field for user ID
        type: notification.type,
        message: notification.message,
        metadata: JSON.stringify(notification.metadata || {}),
        read: false,
        createdAt: new Date()
      });
    } catch (error) {
      safeLogger.error('Error sending in-app notification:', error);
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmailNotification(notification: AppealNotification): Promise<void> {
    try {
      // TODO: Implement email sending
      // This would integrate with an email service like SendGrid, AWS SES, etc.
      safeLogger.info(`Email notification would be sent to user ${notification.userId}:`, {
        subject: notification.title,
        body: notification.message
      });
    } catch (error) {
      safeLogger.error('Error sending email notification:', error);
    }
  }

  /**
   * Send push notification (placeholder)
   */
  private async sendPushNotification(notification: AppealNotification): Promise<void> {
    try {
      // TODO: Implement push notification sending
      // This would integrate with Firebase Cloud Messaging, Apple Push Notifications, etc.
      safeLogger.info(`Push notification would be sent to user ${notification.userId}:`, {
        title: notification.title,
        body: notification.message
      });
    } catch (error) {
      safeLogger.error('Error sending push notification:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // TODO: Implement user preferences retrieval
      // For now, return default preferences
      return {
        email: true,
        push: true,
        inApp: true
      };
    } catch (error) {
      safeLogger.error('Error getting user notification preferences:', error);
      return {
        email: false,
        push: false,
        inApp: true // Always enable in-app notifications as fallback
      };
    }
  }

  /**
   * Generate decision message based on outcome and recipient
   */
  private getDecisionMessage(
    decision: 'uphold' | 'overturn' | 'partial',
    isAppellant: boolean
  ): string {
    if (isAppellant) {
      const messages = {
        'uphold': 'The jury has decided to uphold the original moderation decision. Your appeal was not successful.',
        'overturn': 'Great news! The jury has decided to overturn the original moderation decision. Your appeal was successful.',
        'partial': 'The jury has reached a partial decision on your appeal. Some aspects of the original decision have been modified.'
      };
      return messages[decision];
    } else {
      const messages = {
        'uphold': 'The jury decision has been finalized. The original moderation decision was upheld.',
        'overturn': 'The jury decision has been finalized. The original moderation decision was overturned.',
        'partial': 'The jury decision has been finalized. A partial decision was reached.'
      };
      return messages[decision];
    }
  }

  /**
   * Mark notifications as read
   */
  async markNotificationsAsRead(userId: string, notificationIds: number[]): Promise<void> {
    try {
      // TODO: Implement notification read status update
      safeLogger.info(`Marking notifications as read for user ${userId}:`, notificationIds);
    } catch (error) {
      safeLogger.error('Error marking notifications as read:', error);
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      // TODO: Implement unread count retrieval
      return 0;
    } catch (error) {
      safeLogger.error('Error getting unread notification count:', error);
      return 0;
    }
  }
}

export const appealNotificationService = new AppealNotificationService();
