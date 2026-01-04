/**
 * Seller Notification Service
 * 
 * Implements ISellerNotificationService interface for managing seller notifications
 * with support for multi-channel delivery, batching, and preference handling.
 * 
 * @requirement 4.1 - Push notification within 30 seconds of new order
 * @requirement 4.2 - Email with order summary, buyer info, action links
 * @requirement 4.3 - In-app notification badge and pending queue
 * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
 * @requirement 4.5 - Respect quiet hours and channel preferences
 * @requirement 4.6 - High-value/expedited orders marked as high priority
 * @requirement 4.7 - One-click access to order details
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 */

import { v4 as uuidv4 } from 'uuid';
import { ISellerNotificationService } from './interfaces/ISellerNotificationService';
import {
  SellerNotification,
  SellerNotificationInput,
  NotificationPreferences,
  NotificationPreferencesInput,
  QueueProcessingResult,
  NotificationChannel,
  NotificationStatus,
  ChannelDeliveryStatus,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_BATCHING,
} from '../types/sellerNotification';
import { DatabaseService } from './databaseService';
import { NotificationService } from './notificationService';
import { WebSocketService } from './webSocketService';
import { safeLogger } from '../utils/safeLogger';

/**
 * SellerNotificationService implementation
 * 
 * Provides multi-channel notification delivery to sellers with:
 * - Immediate delivery for urgent/new_order notifications (within 30 seconds)
 * - Batching support for rapid orders
 * - Quiet hours and channel preference handling
 * - WebSocket integration for real-time in-app notifications
 */
export class SellerNotificationService implements ISellerNotificationService {
  private databaseService: DatabaseService;
  private notificationService: NotificationService;
  private webSocketService: WebSocketService | null = null;

  constructor(
    databaseService?: DatabaseService,
    notificationService?: NotificationService,
    webSocketService?: WebSocketService | null
  ) {
    this.databaseService = databaseService || new DatabaseService();
    this.notificationService = notificationService || new NotificationService();
    this.webSocketService = webSocketService || null;
  }

  /**
   * Set the WebSocket service for real-time notifications
   */
  setWebSocketService(webSocketService: WebSocketService): void {
    this.webSocketService = webSocketService;
  }

  /**
   * Queue a notification for delivery to a seller.
   * 
   * For new_order notifications with urgent priority, this will trigger
   * immediate delivery to meet the 30-second requirement.
   * 
   * @requirement 4.1 - Push notification within 30 seconds
   * @requirement 4.4 - Batching for rapid orders
   * @requirement 4.6 - High-value orders marked as high priority
   */
  async queueNotification(input: SellerNotificationInput): Promise<SellerNotification> {
    const notification = this.createNotificationFromInput(input);

    // Store notification in database
    await this.storeNotification(notification);

    // Check if this should be sent immediately (urgent or new_order with high priority)
    const shouldSendImmediately = this.shouldSendImmediately(notification);

    if (shouldSendImmediately) {
      // Send immediately to meet 30-second requirement
      return await this.sendImmediateNotification(input);
    }

    safeLogger.info(`Notification queued for seller ${notification.sellerId}`, {
      notificationId: notification.id,
      type: notification.type,
      priority: notification.priority,
    });

    return notification;
  }

  /**
   * Process the notification queue.
   * 
   * This method should be called periodically (every minute) by a cron job.
   * It processes pending notifications, applies batching, and respects preferences.
   * 
   * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
   * @requirement 4.5 - Respect quiet hours and channel preferences
   */
  async processNotificationQueue(): Promise<QueueProcessingResult> {
    const result: QueueProcessingResult = {
      processed: 0,
      sent: 0,
      failed: 0,
      batched: 0,
      errors: [],
    };

    try {
      // Get all pending notifications
      const pendingNotifications = await this.getPendingNotificationsFromDb();

      if (pendingNotifications.length === 0) {
        return result;
      }

      // Group notifications by seller for batching
      const notificationsBySeller = this.groupNotificationsBySeller(pendingNotifications);

      // Process each seller's notifications
      for (const [sellerId, notifications] of notificationsBySeller) {
        try {
          const preferences = await this.getNotificationPreferences(sellerId);
          
          // Check quiet hours
          if (this.isInQuietHours(preferences)) {
            // Skip non-urgent notifications during quiet hours
            const urgentNotifications = notifications.filter(n => n.priority === 'urgent');
            if (urgentNotifications.length === 0) {
              result.batched += notifications.length;
              continue;
            }
            // Only process urgent notifications
            await this.processSellerNotifications(sellerId, urgentNotifications, preferences, result);
          } else {
            await this.processSellerNotifications(sellerId, notifications, preferences, result);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          safeLogger.error(`Error processing notifications for seller ${sellerId}:`, error);
          notifications.forEach(n => {
            result.errors.push({ notificationId: n.id, error: errorMessage });
            result.failed++;
          });
        }
      }

      result.processed = pendingNotifications.length;
      safeLogger.info('Notification queue processed', result);

    } catch (error) {
      safeLogger.error('Error processing notification queue:', error);
    }

    return result;
  }

  /**
   * Get notification preferences for a seller.
   * Returns default preferences if none exist.
   * 
   * @requirement 4.5 - Respect quiet hours and channel preferences
   */
  async getNotificationPreferences(sellerId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await this.databaseService.getSellerNotificationPreferences(sellerId);
      
      if (preferences) {
        return preferences;
      }

      // Return default preferences
      return {
        sellerId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      safeLogger.error(`Error getting notification preferences for seller ${sellerId}:`, error);
      // Return defaults on error
      return {
        sellerId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Update notification preferences for a seller.
   * 
   * @requirement 4.5 - Respect quiet hours and channel preferences
   */
  async updateNotificationPreferences(
    sellerId: string,
    preferences: NotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    try {
      const existingPrefs = await this.getNotificationPreferences(sellerId);
      
      const updatedPrefs: NotificationPreferences = {
        ...existingPrefs,
        ...preferences,
        sellerId,
        updatedAt: new Date(),
      };

      await this.databaseService.upsertSellerNotificationPreferences(updatedPrefs);

      safeLogger.info(`Updated notification preferences for seller ${sellerId}`);
      return updatedPrefs;
    } catch (error) {
      safeLogger.error(`Error updating notification preferences for seller ${sellerId}:`, error);
      throw error;
    }
  }

  /**
   * Get pending notifications for a seller.
   * 
   * @requirement 4.3 - In-app notification badge and pending queue
   */
  async getPendingNotifications(sellerId: string, limit: number = 50): Promise<SellerNotification[]> {
    try {
      return await this.databaseService.getSellerPendingNotifications(sellerId, limit);
    } catch (error) {
      safeLogger.error(`Error getting pending notifications for seller ${sellerId}:`, error);
      return [];
    }
  }

  /**
   * Get notification history for a seller.
   */
  async getNotificationHistory(
    sellerId: string,
    options?: {
      limit?: number;
      offset?: number;
      type?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    notifications: SellerNotification[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;

      const notifications = await this.databaseService.getSellerNotificationHistory(
        sellerId,
        limit + 1, // Fetch one extra to check hasMore
        offset,
        options?.type,
        options?.startDate,
        options?.endDate
      );

      const hasMore = notifications.length > limit;
      const total = await this.databaseService.getSellerNotificationCount(sellerId, options?.type);

      return {
        notifications: notifications.slice(0, limit),
        total,
        hasMore,
      };
    } catch (error) {
      safeLogger.error(`Error getting notification history for seller ${sellerId}:`, error);
      return { notifications: [], total: 0, hasMore: false };
    }
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string, sellerId: string): Promise<boolean> {
    try {
      return await this.databaseService.markSellerNotificationAsRead(notificationId, sellerId);
    } catch (error) {
      safeLogger.error(`Error marking notification ${notificationId} as read:`, error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a seller.
   */
  async markAllAsRead(sellerId: string): Promise<number> {
    try {
      return await this.databaseService.markAllSellerNotificationsAsRead(sellerId);
    } catch (error) {
      safeLogger.error(`Error marking all notifications as read for seller ${sellerId}:`, error);
      return 0;
    }
  }

  /**
   * Get unread notification count for a seller.
   * 
   * @requirement 4.3 - In-app notification badge
   */
  async getUnreadCount(sellerId: string): Promise<number> {
    try {
      return await this.databaseService.getSellerUnreadNotificationCount(sellerId);
    } catch (error) {
      safeLogger.error(`Error getting unread count for seller ${sellerId}:`, error);
      return 0;
    }
  }

  /**
   * Cancel a pending notification.
   */
  async cancelNotification(notificationId: string, sellerId: string): Promise<boolean> {
    try {
      return await this.databaseService.cancelSellerNotification(notificationId, sellerId);
    } catch (error) {
      safeLogger.error(`Error cancelling notification ${notificationId}:`, error);
      return false;
    }
  }

  /**
   * Send an immediate notification bypassing the queue.
   * 
   * Used for urgent notifications that need to be sent immediately
   * without waiting for queue processing. This is the key method for
   * meeting the 30-second delivery requirement for new orders.
   * 
   * @requirement 4.1 - Push notification within 30 seconds
   */
  async sendImmediateNotification(input: SellerNotificationInput): Promise<SellerNotification> {
    const notification = this.createNotificationFromInput(input);
    const startTime = Date.now();

    try {
      // Get seller preferences (but ignore quiet hours for immediate notifications)
      const preferences = await this.getNotificationPreferences(notification.sellerId);

      // Determine which channels to use based on preferences
      const channels = this.getEnabledChannels(notification.channels, preferences);

      // Send through all enabled channels in parallel for speed
      const deliveryPromises: Promise<void>[] = [];

      if (channels.includes('push')) {
        deliveryPromises.push(this.sendPushNotification(notification, preferences));
      }

      if (channels.includes('email')) {
        deliveryPromises.push(this.sendEmailNotification(notification, preferences));
      }

      if (channels.includes('in_app')) {
        deliveryPromises.push(this.sendInAppNotification(notification));
      }

      // Wait for all channels to complete
      await Promise.allSettled(deliveryPromises);

      // Update notification status
      notification.status = 'sent';
      notification.sentAt = new Date();

      // Store the sent notification
      await this.storeNotification(notification);

      const deliveryTime = Date.now() - startTime;
      safeLogger.info(`Immediate notification sent to seller ${notification.sellerId}`, {
        notificationId: notification.id,
        type: notification.type,
        deliveryTimeMs: deliveryTime,
        channels: channels,
      });

      // Log if we exceeded the 30-second target
      if (deliveryTime > 30000) {
        safeLogger.warn(`Notification delivery exceeded 30-second target`, {
          notificationId: notification.id,
          deliveryTimeMs: deliveryTime,
        });
      }

      return notification;
    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : String(error);
      await this.storeNotification(notification);

      safeLogger.error(`Error sending immediate notification to seller ${notification.sellerId}:`, error);
      throw error;
    }
  }

  // ============ Private Helper Methods ============

  /**
   * Create a SellerNotification from input
   */
  private createNotificationFromInput(input: SellerNotificationInput): SellerNotification {
    const now = new Date();
    
    // Determine priority - new_order notifications default to high priority
    let priority = input.priority || 'normal';
    if (input.type === 'new_order' && priority === 'normal') {
      priority = 'high';
    }

    // Default channels if not specified
    const channels = input.channels || ['push', 'email', 'in_app'];

    return {
      id: uuidv4(),
      sellerId: input.sellerId,
      type: input.type,
      priority,
      orderId: input.orderId,
      title: input.title,
      body: input.body,
      data: input.data || {},
      channels,
      createdAt: now,
      status: 'pending',
      channelStatus: {},
    };
  }

  /**
   * Determine if a notification should be sent immediately
   * 
   * @requirement 4.1 - Push notification within 30 seconds for new orders
   */
  private shouldSendImmediately(notification: SellerNotification): boolean {
    // Urgent notifications always bypass batching
    if (notification.priority === 'urgent') {
      return true;
    }

    // New order notifications should be sent immediately to meet 30-second requirement
    if (notification.type === 'new_order') {
      return true;
    }

    // High priority notifications bypass batching if configured
    if (notification.priority === 'high' && NOTIFICATION_BATCHING.urgentBypassBatching) {
      return true;
    }

    return false;
  }

  /**
   * Store notification in database
   */
  private async storeNotification(notification: SellerNotification): Promise<void> {
    try {
      await this.databaseService.upsertSellerNotification(notification);
    } catch (error) {
      safeLogger.error('Error storing notification:', error);
      // Don't throw - we still want to try sending the notification
    }
  }

  /**
   * Get pending notifications from database
   */
  private async getPendingNotificationsFromDb(): Promise<SellerNotification[]> {
    try {
      return await this.databaseService.getAllPendingSellerNotifications();
    } catch (error) {
      safeLogger.error('Error getting pending notifications:', error);
      return [];
    }
  }

  /**
   * Group notifications by seller ID
   */
  private groupNotificationsBySeller(
    notifications: SellerNotification[]
  ): Map<string, SellerNotification[]> {
    const grouped = new Map<string, SellerNotification[]>();

    for (const notification of notifications) {
      const existing = grouped.get(notification.sellerId) || [];
      existing.push(notification);
      grouped.set(notification.sellerId, existing);
    }

    return grouped;
  }

  /**
   * Check if current time is within seller's quiet hours
   * 
   * @requirement 4.5 - Respect quiet hours
   */
  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const timezone = preferences.quietHoursTimezone || 'UTC';
    const now = new Date();
    
    // Get current time in seller's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const currentTime = formatter.format(now);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Get enabled channels based on notification and preferences
   */
  private getEnabledChannels(
    requestedChannels: NotificationChannel[],
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const enabled: NotificationChannel[] = [];

    for (const channel of requestedChannels) {
      switch (channel) {
        case 'push':
          if (preferences.pushEnabled) enabled.push('push');
          break;
        case 'email':
          if (preferences.emailEnabled) enabled.push('email');
          break;
        case 'in_app':
          if (preferences.inAppEnabled) enabled.push('in_app');
          break;
      }
    }

    return enabled;
  }

  /**
   * Process notifications for a single seller
   */
  private async processSellerNotifications(
    sellerId: string,
    notifications: SellerNotification[],
    preferences: NotificationPreferences,
    result: QueueProcessingResult
  ): Promise<void> {
    // Apply batching if enabled
    if (preferences.batchingEnabled && notifications.length > 1) {
      // Batch non-urgent notifications
      const urgent = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
      const normal = notifications.filter(n => n.priority === 'normal');

      // Send urgent notifications immediately
      for (const notification of urgent) {
        await this.deliverNotification(notification, preferences, result);
      }

      // Batch normal notifications
      if (normal.length > 0) {
        await this.deliverBatchedNotifications(normal, preferences, result);
      }
    } else {
      // Send all notifications individually
      for (const notification of notifications) {
        await this.deliverNotification(notification, preferences, result);
      }
    }
  }

  /**
   * Deliver a single notification through all enabled channels
   */
  private async deliverNotification(
    notification: SellerNotification,
    preferences: NotificationPreferences,
    result: QueueProcessingResult
  ): Promise<void> {
    try {
      const channels = this.getEnabledChannels(notification.channels, preferences);

      const deliveryPromises: Promise<void>[] = [];

      if (channels.includes('push')) {
        deliveryPromises.push(this.sendPushNotification(notification, preferences));
      }

      if (channels.includes('email')) {
        deliveryPromises.push(this.sendEmailNotification(notification, preferences));
      }

      if (channels.includes('in_app')) {
        deliveryPromises.push(this.sendInAppNotification(notification));
      }

      await Promise.allSettled(deliveryPromises);

      // Update notification status
      notification.status = 'sent';
      notification.sentAt = new Date();
      await this.storeNotification(notification);

      result.sent++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      notification.status = 'failed';
      notification.error = errorMessage;
      await this.storeNotification(notification);

      result.errors.push({ notificationId: notification.id, error: errorMessage });
      result.failed++;
    }
  }

  /**
   * Deliver batched notifications as a summary
   */
  private async deliverBatchedNotifications(
    notifications: SellerNotification[],
    preferences: NotificationPreferences,
    result: QueueProcessingResult
  ): Promise<void> {
    if (notifications.length === 0) return;

    const batchId = uuidv4();
    const sellerId = notifications[0].sellerId;

    // Create a summary notification
    const summaryTitle = `${notifications.length} new notifications`;
    const summaryBody = this.createBatchSummary(notifications);

    try {
      const channels = this.getEnabledChannels(['push', 'email', 'in_app'], preferences);

      // Send summary through enabled channels
      if (channels.includes('push')) {
        await this.notificationService.sendOrderNotification(
          sellerId,
          'BATCH_NOTIFICATION',
          batchId,
          { title: summaryTitle, body: summaryBody, count: notifications.length }
        );
      }

      if (channels.includes('in_app')) {
        // Send individual in-app notifications for each item
        for (const notification of notifications) {
          await this.sendInAppNotification(notification);
        }
      }

      // Mark all notifications as sent
      for (const notification of notifications) {
        notification.status = 'sent';
        notification.sentAt = new Date();
        notification.batchId = batchId;
        await this.storeNotification(notification);
      }

      result.sent += notifications.length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      for (const notification of notifications) {
        notification.status = 'failed';
        notification.error = errorMessage;
        await this.storeNotification(notification);
        result.errors.push({ notificationId: notification.id, error: errorMessage });
      }

      result.failed += notifications.length;
    }
  }

  /**
   * Create a summary message for batched notifications
   */
  private createBatchSummary(notifications: SellerNotification[]): string {
    const typeCounts: Record<string, number> = {};

    for (const notification of notifications) {
      typeCounts[notification.type] = (typeCounts[notification.type] || 0) + 1;
    }

    const parts: string[] = [];
    if (typeCounts['new_order']) {
      parts.push(`${typeCounts['new_order']} new order(s)`);
    }
    if (typeCounts['cancellation_request']) {
      parts.push(`${typeCounts['cancellation_request']} cancellation request(s)`);
    }
    if (typeCounts['dispute_opened']) {
      parts.push(`${typeCounts['dispute_opened']} dispute(s)`);
    }
    if (typeCounts['review_received']) {
      parts.push(`${typeCounts['review_received']} review(s)`);
    }

    return parts.join(', ');
  }

  /**
   * Send push notification
   * 
   * @requirement 4.1 - Push notification within 30 seconds
   */
  private async sendPushNotification(
    notification: SellerNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      await this.notificationService.sendOrderNotification(
        notification.sellerId,
        notification.type.toUpperCase(),
        notification.orderId || notification.id,
        {
          title: notification.title,
          body: notification.body,
          priority: notification.priority,
          ...notification.data,
        }
      );

      notification.channelStatus.push = {
        status: 'sent',
        sentAt: new Date(),
      };

      safeLogger.debug(`Push notification sent to seller ${notification.sellerId}`);
    } catch (error) {
      notification.channelStatus.push = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      throw error;
    }
  }

  /**
   * Send email notification
   * 
   * @requirement 4.2 - Email with order summary, buyer info, action links
   */
  private async sendEmailNotification(
    notification: SellerNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      // Get seller email from database
      const sellerProfile = await this.databaseService.getUserByAddress(notification.sellerId);
      
      if (!sellerProfile?.email) {
        notification.channelStatus.email = {
          status: 'skipped',
        };
        return;
      }

      // Use the notification service to send email
      await this.notificationService.sendOrderNotification(
        notification.sellerId,
        notification.type.toUpperCase(),
        notification.orderId || notification.id,
        {
          title: notification.title,
          body: notification.body,
          email: sellerProfile.email,
          actionUrl: this.getActionUrl(notification),
          ...notification.data,
        }
      );

      notification.channelStatus.email = {
        status: 'sent',
        sentAt: new Date(),
      };

      safeLogger.debug(`Email notification sent to seller ${notification.sellerId}`);
    } catch (error) {
      notification.channelStatus.email = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      // Don't throw - email failure shouldn't block other channels
      safeLogger.warn(`Email notification failed for seller ${notification.sellerId}:`, error);
    }
  }

  /**
   * Send in-app notification via WebSocket
   * 
   * @requirement 4.3 - In-app notification badge and pending queue
   */
  private async sendInAppNotification(notification: SellerNotification): Promise<void> {
    try {
      if (this.webSocketService) {
        // Send real-time notification via WebSocket
        this.webSocketService.sendNotification(notification.sellerId, {
          type: 'seller_notification',
          title: notification.title,
          message: notification.body,
          data: {
            notificationId: notification.id,
            notificationType: notification.type,
            orderId: notification.orderId,
            priority: notification.priority,
            actionUrl: this.getActionUrl(notification),
            ...notification.data,
          },
          priority: notification.priority === 'urgent' ? 'urgent' : 
                   notification.priority === 'high' ? 'high' : 'medium',
          timestamp: new Date(),
        });
      }

      notification.channelStatus.in_app = {
        status: 'sent',
        sentAt: new Date(),
      };

      safeLogger.debug(`In-app notification sent to seller ${notification.sellerId}`);
    } catch (error) {
      notification.channelStatus.in_app = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      // Don't throw - in-app failure shouldn't block other channels
      safeLogger.warn(`In-app notification failed for seller ${notification.sellerId}:`, error);
    }
  }

  /**
   * Get action URL for one-click access to order details
   * 
   * @requirement 4.7 - One-click access to order details
   */
  private getActionUrl(notification: SellerNotification): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://linkdao.io';

    if (notification.orderId) {
      return `${baseUrl}/seller/orders/${notification.orderId}`;
    }

    switch (notification.type) {
      case 'new_order':
        return `${baseUrl}/seller/orders?status=new`;
      case 'cancellation_request':
        return `${baseUrl}/seller/orders?status=cancellation_requested`;
      case 'dispute_opened':
        return `${baseUrl}/seller/disputes`;
      case 'review_received':
        return `${baseUrl}/seller/reviews`;
      default:
        return `${baseUrl}/seller/dashboard`;
    }
  }
}

// Export singleton instance
export const sellerNotificationService = new SellerNotificationService();

export default SellerNotificationService;
