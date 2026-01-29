import { safeLogger } from '../utils/safeLogger';

export interface NotificationPayload {
  sellerId: number;
  sellerEmail: string;
  sellerName: string;
  type: 'application_approved' | 'application_rejected' | 'application_submitted' | 'kyc_verified' | 'kyc_rejected';
  data: {
    rejectionReason?: string;
    approvalMessage?: string;
    adminNotes?: string;
    applicationUrl?: string;
  };
}

export interface InAppNotification {
  id?: string;
  userId: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

export class NotificationService {
  /**
   * Send application decision notification (email + in-app)
   */
  async notifyApplicationDecision(payload: NotificationPayload): Promise<void> {
    try {
      await this.sendEmailNotification(payload);
      await this.createInAppNotification(payload);

      safeLogger.info(`Notification sent for seller ${payload.sellerId}:`, {
        type: payload.type,
        email: payload.sellerEmail
      });
    } catch (error) {
      safeLogger.error('Error sending application decision notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    try {
      const emailSubject = this.getEmailSubject(payload.type);
      safeLogger.info(`Email notification queued for ${payload.sellerEmail}:`, {
        subject: emailSubject,
        type: payload.type
      });
      // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
    } catch (error) {
      safeLogger.error('Error sending email notification:', error);
    }
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(payload: NotificationPayload): Promise<void> {
    try {
      const notification = {
        userId: payload.sellerId,
        title: this.getNotificationTitle(payload.type),
        message: this.getNotificationMessage(payload),
        type: payload.type,
        read: false,
        actionUrl: payload.data.applicationUrl,
        createdAt: new Date()
      };

      safeLogger.info(`In-app notification created for seller ${payload.sellerId}:`, notification);
      // TODO: Save to database and trigger real-time notification
    } catch (error) {
      safeLogger.error('Error creating in-app notification:', error);
      throw error;
    }
  }

  async notifyApproval(sellerId: number, sellerEmail: string, sellerName: string): Promise<void> {
    await this.notifyApplicationDecision({
      sellerId,
      sellerEmail,
      sellerName,
      type: 'application_approved',
      data: {
        approvalMessage: 'Your seller application has been approved! You can now start listing products.'
      }
    });
  }

  async notifyRejection(
    sellerId: number,
    sellerEmail: string,
    sellerName: string,
    rejectionReason: string,
    adminNotes?: string
  ): Promise<void> {
    await this.notifyApplicationDecision({
      sellerId,
      sellerEmail,
      sellerName,
      type: 'application_rejected',
      data: {
        rejectionReason,
        adminNotes
      }
    });
  }

  async notifyKYCVerified(sellerId: number, sellerEmail: string, sellerName: string): Promise<void> {
    await this.notifyApplicationDecision({
      sellerId,
      sellerEmail,
      sellerName,
      type: 'kyc_verified',
      data: {
        approvalMessage: 'Your KYC verification has been completed successfully.'
      }
    });
  }

  async notifyKYCRejected(
    sellerId: number,
    sellerEmail: string,
    sellerName: string,
    rejectionReason: string
  ): Promise<void> {
    await this.notifyApplicationDecision({
      sellerId,
      sellerEmail,
      sellerName,
      type: 'kyc_rejected',
      data: {
        rejectionReason
      }
    });
  }

  async notifyAdminNewApplication(
    sellerName: string,
    sellerEmail: string,
    applicationId: number
  ): Promise<void> {
    try {
      safeLogger.info(`Admin notification: New seller application from ${sellerName}`, {
        email: sellerEmail,
        applicationId
      });
    } catch (error) {
      safeLogger.error('Error notifying admin of new application:', error);
    }
  }

  private getEmailSubject(type: string): string {
    const subjects: Record<string, string> = {
      application_approved: '🎉 Your LinkDAO Seller Application Has Been Approved!',
      application_rejected: '⚠️ Your LinkDAO Seller Application Requires Changes',
      application_submitted: 'Application Received - LinkDAO Seller Review in Progress',
      kyc_verified: '✅ KYC Verification Complete - LinkDAO',
      kyc_rejected: 'KYC Verification - Additional Information Needed'
    };
    return subjects[type] || 'LinkDAO Notification';
  }

  private getNotificationTitle(type: string): string {
    const titles: Record<string, string> = {
      application_approved: 'Application Approved',
      application_rejected: 'Application Needs Review',
      application_submitted: 'Application Received',
      kyc_verified: 'KYC Verified',
      kyc_rejected: 'KYC Verification Required'
    };
    return titles[type] || 'New Notification';
  }

  private getNotificationMessage(payload: NotificationPayload): string {
    switch (payload.type) {
      case 'application_approved':
        return `${payload.data.approvalMessage}`;
      case 'application_rejected':
        return `Your application was reviewed. Reason: ${payload.data.rejectionReason}. Please update and resubmit.`;
      case 'application_submitted':
        return 'Your seller application has been received and is under review.';
      case 'kyc_verified':
        return 'Your identity verification has been completed successfully.';
      case 'kyc_rejected':
        return `Your KYC verification needs adjustment. Reason: ${payload.data.rejectionReason}`;
      default:
        return 'You have a new notification from LinkDAO';
    }
  }

  async notifyOrderStatusChange(orderId: string, status: string, userId: string): Promise<void> {
    try {
      safeLogger.info(`Order status change notification:`, {
        orderId,
        status,
        userId
      });
    } catch (error) {
      safeLogger.error('Error notifying order status change:', error);
    }
  }

  async enqueueNotification(userIdOrData: any, notificationData?: any): Promise<void> {
    try {
      if (notificationData === undefined) {
        safeLogger.info(`Notification enqueued:`, userIdOrData);
      } else {
        safeLogger.info(`Notification enqueued for user ${userIdOrData}:`, notificationData);
      }
    } catch (error) {
      safeLogger.error(`Error enqueuing notification:`, error);
    }
  }

  async sendOrderNotification(recipient: string, type: string, orderId: string, metadataOrMessage?: any): Promise<void> {
    try {
      safeLogger.info(`Order notification:`, {
        recipient,
        type,
        orderId,
        details: metadataOrMessage
      });
    } catch (error) {
      safeLogger.error('Error handling order notification:', error);
    }
  }

  async getNotificationPreferences(userId: string): Promise<any> {
    try {
      safeLogger.info(`Getting notification preferences for user ${userId}`);
      return {
        email: true,
        push: true,
        sms: false
      };
    } catch (error) {
      safeLogger.error(`Error getting notification preferences for ${userId}:`, error);
      return null;
    }
  }

  async updateNotificationPreferences(userId: string, preferences: any): Promise<void> {
    try {
      safeLogger.info(`Updating notification preferences for user ${userId}:`, preferences);
    } catch (error) {
      safeLogger.error(`Error updating notification preferences for ${userId}:`, error);
    }
  }

  async getUserNotifications(userId: string, options: any = {}): Promise<any[]> {
    try {
      safeLogger.info(`Getting notifications for user ${userId}:`, options);
      return [];
    } catch (error) {
      safeLogger.error(`Error getting notifications for ${userId}:`, error);
      return [];
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      safeLogger.info(`Getting unread count for user ${userId}`);
      return 0;
    } catch (error) {
      safeLogger.error(`Error getting unread count for ${userId}:`, error);
      return 0;
    }
  }

  async getTotalCount(userId: string): Promise<number> {
    try {
      safeLogger.info(`Getting total count for user ${userId}`);
      return 0;
    } catch (error) {
      safeLogger.error(`Error getting total count for ${userId}:`, error);
      return 0;
    }
  }

  async markAsRead(userIdOrNotificationId: string, notificationId?: string): Promise<void> {
    try {
      if (notificationId === undefined) {
        safeLogger.info(`Marked notification as read: ${userIdOrNotificationId}`);
      } else {
        safeLogger.info(`Marked notification ${notificationId} as read for user ${userIdOrNotificationId}`);
      }
    } catch (error) {
      safeLogger.error(`Error marking notification as read:`, error);
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      safeLogger.info(`Marked all notifications as read for user ${userId}`);
    } catch (error) {
      safeLogger.error(`Error marking all notifications as read for ${userId}:`, error);
    }
  }

  async sendReceiptEmail(emailOrData: any, orderId?: string, receipt?: any): Promise<void> {
    try {
      if (orderId === undefined) {
        safeLogger.info(`Receipt email queued:`, emailOrData);
      } else {
        safeLogger.info(`Receipt email queued for ${emailOrData}:`, {
          orderId,
          receipt
        });
      }
    } catch (error) {
      safeLogger.error('Error sending receipt email:', error);
    }
  }

  async generateMarketplaceReceipt(data: any): Promise<any> {
    try {
      safeLogger.info(`Generating marketplace receipt for order ${data.orderId}`);
      return {
        orderId: data.orderId,
        receiptId: `RECEIPT-${Date.now()}`,
        generatedAt: new Date()
      };
    } catch (error) {
      safeLogger.error('Error generating marketplace receipt:', error);
      return null;
    }
  }

  async sendSellerNotification(data: any): Promise<void> {
    try {
      safeLogger.info(`Seller notification sent:`, {
        sellerId: data.sellerId,
        type: data.type,
        message: data.message
      });
    } catch (error) {
      safeLogger.error('Error sending seller notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
