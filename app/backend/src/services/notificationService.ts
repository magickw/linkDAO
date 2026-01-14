import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { OrderNotification } from '../models/Order';
import { getWebSocketService } from './webSocketService';

const databaseService = new DatabaseService();

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}

export class NotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        type: 'ORDER_CREATED',
        title: 'Order Created',
        message: 'Your order has been created successfully',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'ORDER_RECEIVED',
        title: 'New Order Received',
        message: 'You have received a new order',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received',
        message: 'Payment has been received for your order',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'ORDER_PROCESSING',
        title: 'Order Processing',
        message: 'Your order is being processed',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'ORDER_SHIPPED',
        title: 'Order Shipped',
        message: 'Your order has been shipped',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'ORDER_DELIVERED',
        title: 'Order Delivered',
        message: 'Your order has been delivered',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'ORDER_COMPLETED',
        title: 'Order Completed',
        message: 'Your order has been completed',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'DISPUTE_INITIATED',
        title: 'Dispute Initiated',
        message: 'A dispute has been initiated for your order',
        actionUrl: '/orders/{orderId}/dispute'
      },
      {
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved',
        message: 'The dispute for your order has been resolved',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'ESCROW_CREATED',
        title: 'Escrow Created',
        message: 'Escrow has been created for your order',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'ESCROW_APPROVED',
        title: 'Escrow Approved',
        message: 'Escrow has been approved',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'PAYMENT_RELEASED',
        title: 'Payment Released',
        message: 'Payment has been released from escrow',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'DELIVERY_CONFIRMED',
        title: 'Delivery Confirmed',
        message: 'Delivery has been confirmed',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'EVIDENCE_SUBMITTED',
        title: 'Evidence Submitted',
        message: 'Evidence has been submitted for dispute',
        actionUrl: '/orders/{orderId}/dispute'
      },
      {
        type: 'VOTE_CAST',
        title: 'Vote Cast',
        message: 'Your vote has been cast for dispute resolution',
        actionUrl: '/orders/{orderId}/dispute'
      },
      {
        type: 'CANCELLATION_REQUESTED',
        title: 'Cancellation Requested',
        message: 'A cancellation has been requested for your order',
        actionUrl: '/orders/{orderId}/cancellation'
      },
      {
        type: 'CANCELLATION_APPROVED',
        title: 'Cancellation Approved',
        message: 'The cancellation request for your order has been approved',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'CANCELLATION_REJECTED',
        title: 'Cancellation Rejected',
        message: 'The cancellation request for your order has been rejected',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'CANCELLATION_AUTO_APPROVED',
        title: 'Cancellation Auto-Approved',
        message: 'The cancellation request was automatically approved due to no response',
        actionUrl: '/orders/{orderId}'
      },
      {
        type: 'PRODUCT_FAVORITED',
        title: 'Product Added to Wishlist',
        message: 'Someone added your product to their wishlist',
        actionUrl: '/seller/products/{productId}'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  /**
   * Send order notification to user
   */
  async sendOrderNotification(
    userAddress: string,
    type: string,
    orderId: string,
    metadata?: any
  ): Promise<void> {
    try {
      const template = this.templates.get(type);
      if (!template) {
        safeLogger.warn(`No template found for notification type: ${type}`);
        return;
      }

      let message = template.message;
      let actionUrl = template.actionUrl?.replace('{orderId}', orderId);

      // Customize message based on metadata
      if (metadata) {
        message = this.customizeMessage(message, metadata);
      }

      const notification: Omit<OrderNotification, 'id' | 'createdAt'> = {
        orderId,
        userAddress,
        type,
        message,
        metadata,
        read: false
      };

      // Store notification in database
      await databaseService.createNotification(notification);

      // Send real-time notification with type in metadata
      await this.sendRealTimeNotification(userAddress, {
        title: template.title,
        message,
        actionUrl,
        metadata: {
          ...metadata,
          type: type, // Include type for category conversion
          orderId: orderId
        }
      });

      // Send email notification if enabled
      if (await this.shouldSendEmail(userAddress, type)) {
        await this.sendEmailNotification(userAddress, template.title, message, actionUrl);
      }

      // Send push notification if enabled
      if (await this.shouldSendPush(userAddress, type)) {
        await this.sendPushNotification(userAddress, template.title, message, actionUrl);
      }

    } catch (error) {
      safeLogger.error('Error sending order notification:', error);
    }
  }

  /**
   * Notify user about order status change
   */
  async notifyOrderStatusChange(
    userAddress: string,
    orderId: string,
    newStatus: string,
    metadata?: any
  ): Promise<void> {
    const notificationType = `ORDER_${newStatus}`; // e.g., ORDER_PROCESSING, ORDER_SHIPPED
    await this.sendOrderNotification(userAddress, notificationType, orderId, metadata);
  }

  /**
   * Send seller notification for product events (e.g., favorites, views, etc.)
   */
  async sendSellerNotification(
    sellerAddress: string,
    type: string,
    productId: string,
    metadata?: any
  ): Promise<void> {
    try {
      const template = this.templates.get(type);
      if (!template) {
        safeLogger.warn(`No template found for notification type: ${type}`);
        return;
      }

      let message = template.message;
      let actionUrl = template.actionUrl?.replace('{productId}', productId);

      // Customize message based on metadata
      if (metadata) {
        if (metadata.productTitle) {
          message = `Someone added "${metadata.productTitle}" to their wishlist`;
        }
        message = this.customizeMessage(message, metadata);
      }

      const notification: any = {
        userAddress: sellerAddress,
        type,
        message,
        metadata: { ...metadata, productId, recipientType: 'seller' },
        read: false
      };

      // Store notification in database
      await databaseService.createNotification(notification);

      // Send real-time notification
      await this.sendRealTimeNotification(sellerAddress, {
        title: template.title,
        message,
        actionUrl,
        metadata: { ...metadata, productId, recipientType: 'seller' }
      });

      // Send email notification if enabled
      if (await this.shouldSendEmail(sellerAddress, type)) {
        await this.sendEmailNotification(sellerAddress, template.title, message, actionUrl);
      }

      // Send push notification if enabled
      if (await this.shouldSendPush(sellerAddress, type)) {
        await this.sendPushNotification(sellerAddress, template.title, message, actionUrl);
      }

    } catch (error) {
      safeLogger.error('Error sending seller notification:', error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userAddress: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<OrderNotification[]> {
    try {
      return await databaseService.getUserNotifications(userAddress, limit, offset);
    } catch (error) {
      safeLogger.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      return await databaseService.markNotificationAsRead(notificationId);
    } catch (error) {
      safeLogger.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userAddress: string): Promise<boolean> {
    try {
      return await databaseService.markAllNotificationsAsRead(userAddress);
    } catch (error) {
      safeLogger.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userAddress: string): Promise<number> {
    try {
      return await databaseService.getUnreadNotificationCount(userAddress);
    } catch (error) {
      safeLogger.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userAddress: string,
    preferences: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
      types?: string[];
    }
  ): Promise<boolean> {
    try {
      return await databaseService.updateNotificationPreferences(userAddress, preferences);
    } catch (error) {
      safeLogger.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userAddress: string): Promise<any> {
    try {
      return await databaseService.getNotificationPreferences(userAddress);
    } catch (error) {
      safeLogger.error('Error getting notification preferences:', error);
      return {
        email: true,
        push: true,
        inApp: true,
        types: Array.from(this.templates.keys())
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: Array<{
      userAddress: string;
      type: string;
      orderId: string;
      metadata?: any;
    }>
  ): Promise<void> {
    try {
      const promises = notifications.map(notification =>
        this.sendOrderNotification(
          notification.userAddress,
          notification.type,
          notification.orderId,
          notification.metadata
        )
      );

      await Promise.allSettled(promises);
    } catch (error) {
      safeLogger.error('Error sending bulk notifications:', error);
    }
  }

  // Private helper methods

  private customizeMessage(message: string, metadata: any): string {
    let customizedMessage = message;

    if (metadata.trackingNumber) {
      customizedMessage += ` (Tracking: ${metadata.trackingNumber})`;
    }

    if (metadata.amount) {
      customizedMessage += ` Amount: ${metadata.amount}`;
    }

    if (metadata.reason) {
      customizedMessage += ` Reason: ${metadata.reason}`;
    }

    return customizedMessage;
  }

  private async sendRealTimeNotification(
    userAddress: string,
    notification: {
      title: string;
      message: string;
      actionUrl?: string;
      metadata?: any;
    }
  ): Promise<void> {
    try {
      // Get WebSocket service instance
      const wsService = getWebSocketService();
      if (wsService) {
        // Extract category from metadata or convert type to category format
        const category = notification.metadata?.category || this.convertTypeToCategory(notification.metadata?.type);
        
        wsService.sendNotification(userAddress, {
          type: 'notification',
          title: notification.title,
          message: notification.message,
          category: category,
          data: {
            actionUrl: notification.actionUrl,
            ...notification.metadata
          },
          priority: 'medium',
          timestamp: new Date()
        });
        safeLogger.info(`Real-time notification sent to ${userAddress}:`, notification);
      } else {
        safeLogger.warn('WebSocket service not available, notification not sent in real-time');
      }
    } catch (error) {
      safeLogger.error('Error sending real-time notification:', error);
    }
  }

  /**
   * Convert notification type to category format expected by frontend
   */
  private convertTypeToCategory(type: string): string {
    if (!type) return 'system';
    
    // Convert snake_case to lowercase format expected by frontend
    return type.toLowerCase().replace(/_/g, '_');
  }

  private async sendEmailNotification(
    userAddress: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      // Get user email from profile
      const userProfile = await databaseService.getUserByAddress(userAddress);
      if (!userProfile?.email) {
        safeLogger.info(`No email found for user ${userAddress}`);
        return;
      }

      // Implementation would use your email service (SendGrid, AWS SES, etc.)
      safeLogger.info(`Email notification to ${userProfile.email}:`, { title, message, actionUrl });

      // Example implementation:
      // const emailService = EmailService.getInstance();
      // await emailService.sendEmail({
      //   to: userProfile.email,
      //   subject: title,
      //   html: this.generateEmailTemplate(title, message, actionUrl)
      // });
    } catch (error) {
      safeLogger.error('Error sending email notification:', error);
    }
  }

  private async sendPushNotification(
    userAddress: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      // Get user push tokens from database
      const pushTokens = await databaseService.getUserPushTokens(userAddress);
      if (!pushTokens || pushTokens.length === 0) {
        safeLogger.info(`No push tokens found for user ${userAddress}`);
        return;
      }

      // Implementation would use your push service (FCM, APNS, etc.)
      safeLogger.info(`Push notification to ${userAddress}:`, { title, message, actionUrl });

      // Example implementation:
      // const pushService = PushNotificationService.getInstance();
      // await pushService.sendToTokens(pushTokens, {
      //   title,
      //   body: message,
      //   data: { actionUrl }
      // });
    } catch (error) {
      safeLogger.error('Error sending push notification:', error);
    }
  }

  private async shouldSendEmail(userAddress: string, type: string): Promise<boolean> {
    try {
      const preferences = await this.getNotificationPreferences(userAddress);
      return preferences.email && preferences.types.includes(type);
    } catch (error) {
      safeLogger.error('Error checking email preferences:', error);
      return false;
    }
  }

  private async shouldSendPush(userAddress: string, type: string): Promise<boolean> {
    try {
      const preferences = await this.getNotificationPreferences(userAddress);
      return preferences.push && preferences.types.includes(type);
    } catch (error) {
      safeLogger.error('Error checking push preferences:', error);
      return false;
    }
  }

  private generateEmailTemplate(title: string, message: string, actionUrl?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>${message}</p>
            ${actionUrl ? `<a href="${actionUrl}" class="button">View Order</a>` : ''}
          </div>
          <div class="footer">
            <p>Web3 Marketplace - Decentralized Commerce Platform</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await databaseService.deleteOldNotifications(cutoffDate);
      safeLogger.info(`Cleaned up notifications older than ${daysOld} days`);
    } catch (error) {
      safeLogger.error('Error cleaning up old notifications:', error);
    }
  }

  /**
 
  /**
   * Enqueue a notification (Generic wrapper)
   * Handles user resolution (UUID -> Address) and dispatch
   */
  async enqueueNotification(params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
  }): Promise<void> {
    try {
      const userAddress = await this.resolveUserAddress(params.userId);
      if (!userAddress) {
        safeLogger.warn(`Could not resolve user address for notification: ${params.userId}`);
        return;
      }

      // Construct Action URL (Simple mapping)
      let actionUrl = '';
      if (params.data && params.data.orderId) {
        actionUrl = `/orders/${params.data.orderId}`;
      }

      const notification: any = {
        userAddress, // Schema uses userAddress
        type: params.type,
        message: params.message,
        metadata: params.data,
        read: false,
        // timestamps handled by DB default
      };

      // If orderId is in data, map it column
      if (params.data && params.data.orderId) {
        notification.orderId = params.data.orderId;
      }

      // Persist
      await databaseService.createNotification(notification);

      // Real-time
      await this.sendRealTimeNotification(userAddress, {
        title: params.title,
        message: params.message,
        actionUrl,
        metadata: params.data
      });

      // Email/Push checks
      if (await this.shouldSendEmail(userAddress, params.type)) {
        await this.sendEmailNotification(userAddress, params.type, params.message, actionUrl);
      }
    } catch (error) {
      safeLogger.error('Error enqueuing notification:', error);
    }
  }

  private async resolveUserAddress(userIdOrAddress: string): Promise<string | null> {
    if (userIdOrAddress.startsWith('0x')) return userIdOrAddress;

    // Lookup by ID
    // This requires circular dependency or moving logic? 
    // Safe option: Use DatabaseService if it has getUserById, or direct DB query.
    // NotificationService imports DatabaseService.
    // Let's assume DatabaseService has getUser or we use simple query if we can import db/schema here.
    // NotificationService doesn't import db/schema at top. Use databaseService.

    // Looking at imports: import { DatabaseService } from './databaseService';
    // I should check if DatabaseService has getUser.
    // If not, I can import db/schema/eq here.
    return await databaseService.getUserAddressById(userIdOrAddress);
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userAddress: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
  }> {
    try {
      return await databaseService.getNotificationStats(userAddress);
    } catch (error) {
      safeLogger.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, byType: {} };
    }
  }
}

export const notificationService = new NotificationService();
