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
  HIGH_VALUE_ORDER_CONFIG,
  PriorityDetermination,
  SellerNotificationTiming,
} from '../../types/sellerNotification';
import { DatabaseService } from './databaseService';
import { NotificationService } from './notificationService';
import { WebSocketService } from '../websocket/webSocketService';
import { EmailService } from './emailService';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../../db';
import { notifications } from '../../db/schema';

/**
 * Order email data structure for email notifications
 * @requirement 4.2 - Email with order summary, buyer info, action links
 */
export interface OrderEmailData {
  orderId: string;
  orderNumber?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerAddress?: string;
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  subtotal?: number;
  shippingCost?: number;
  taxes?: number;
  totalAmount?: number;
  currency?: string;
  paymentMethod?: string;
  isExpedited?: boolean;
  specialInstructions?: string;
  createdAt?: Date;
}

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
  private emailService: EmailService;

  /**
   * In-memory cache for tracking last notification time per seller
   * Used to enforce the "max 1 per minute" batching rule
   * 
   * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
   */
  private sellerNotificationTimings: Map<string, SellerNotificationTiming> = new Map();

  constructor(
    databaseService?: DatabaseService,
    notificationService?: NotificationService,
    webSocketService?: WebSocketService | null,
    emailService?: EmailService
  ) {
    this.databaseService = databaseService || new DatabaseService();
    this.notificationService = notificationService || new NotificationService();
    this.webSocketService = webSocketService || null;
    this.emailService = emailService || EmailService.getInstance();
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

    // Check if this should be batched based on timing rules
    const shouldBatch = !shouldSendImmediately && this.shouldBatchNotification(notification.sellerId, notification);

    if (shouldBatch) {
      // Mark as batched and update timing
      notification.status = 'batched';
      await this.storeNotification(notification);
      this.updateSellerNotificationTiming(notification.sellerId, true);

      safeLogger.info(`Notification batched for seller ${notification.sellerId}`, {
        notificationId: notification.id,
        type: notification.type,
        priority: notification.priority,
        reason: 'Rate limiting - max 1 per minute',
      });

      return notification;
    }

    if (shouldSendImmediately) {
      // Send immediately to meet 30-second requirement
      const result = await this.sendImmediateNotification(input);
      this.updateSellerNotificationTiming(notification.sellerId, false);
      return result;
    }

    // Update timing tracker
    this.updateSellerNotificationTiming(notification.sellerId, false);

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
      // Clean up old timing entries
      this.cleanupOldTimings();

      // Get all pending and batched notifications
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
              safeLogger.debug(`Skipping ${notifications.length} notifications for seller ${sellerId} during quiet hours`);
              continue;
            }
            // Only process urgent notifications
            await this.processSellerNotifications(sellerId, urgentNotifications, preferences, result);
            result.batched += notifications.length - urgentNotifications.length;
          } else {
            // Check if we should batch based on timing
            const timing = this.sellerNotificationTimings.get(sellerId);
            const timeSinceLastNotification = timing
              ? Date.now() - timing.lastNotificationSentAt.getTime()
              : NOTIFICATION_BATCHING.minIntervalMs + 1;

            if (timeSinceLastNotification < NOTIFICATION_BATCHING.minIntervalMs) {
              // Still within batching window, only send urgent
              const urgentNotifications = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high');
              const normalNotifications = notifications.filter(n => n.priority === 'normal');

              if (urgentNotifications.length > 0) {
                await this.processSellerNotifications(sellerId, urgentNotifications, preferences, result);
              }

              // Keep normal notifications batched
              result.batched += normalNotifications.length;
            } else {
              // Outside batching window, process all
              await this.processSellerNotifications(sellerId, notifications, preferences, result);
              this.updateSellerNotificationTiming(sellerId, false);
            }
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

    // Determine priority using enhanced logic
    const priorityResult = this.determinePriority(input);
    const priority = input.priority || priorityResult.priority;

    // Default channels if not specified
    const channels = input.channels || ['push', 'email', 'in_app'];

    // Enhance data with priority reasons if applicable
    const enhancedData = {
      ...input.data,
      priorityReasons: priorityResult.reasons,
      isHighValue: priorityResult.isHighValue,
      isExpedited: priorityResult.isExpedited,
    };

    return {
      id: uuidv4(),
      sellerId: input.sellerId,
      type: input.type,
      priority,
      orderId: input.orderId,
      title: input.title,
      body: input.body,
      data: enhancedData,
      channels,
      createdAt: now,
      status: 'pending',
      channelStatus: {},
    };
  }

  /**
   * Determine notification priority based on order value and shipping type
   * 
   * @requirement 4.6 - High-value/expedited orders marked as high priority
   */
  private determinePriority(input: SellerNotificationInput): PriorityDetermination {
    const reasons: string[] = [];
    let isHighValue = false;
    let isExpedited = false;
    let priority: 'normal' | 'high' | 'urgent' = 'normal';

    // Check for explicit priority
    if (input.priority === 'urgent') {
      return { priority: 'urgent', reasons: ['Explicitly marked as urgent'], isHighValue: false, isExpedited: false };
    }

    const data = input.data || {};

    // Check for high-value order
    const orderTotal = data.totalAmount as number || data.orderTotal as number || data.amount as number || 0;
    const highValueThreshold = data.highValueThreshold as number || HIGH_VALUE_ORDER_CONFIG.defaultThresholdUSD;

    if (orderTotal >= highValueThreshold) {
      isHighValue = true;
      reasons.push(`High-value order: $${orderTotal.toFixed(2)} (threshold: $${highValueThreshold})`);
      priority = 'high';
    }

    // Check for expedited shipping
    const shippingMethod = (data.shippingMethod as string || '').toLowerCase();
    const shippingType = (data.shippingType as string || '').toLowerCase();
    const isExpeditedFlag = data.isExpedited as boolean || data.expeditedShipping as boolean;

    if (isExpeditedFlag) {
      isExpedited = true;
      reasons.push('Expedited shipping requested');
      priority = 'high';
    } else {
      // Check shipping method/type for expedited keywords
      const combinedShipping = `${shippingMethod} ${shippingType}`;
      for (const keyword of HIGH_VALUE_ORDER_CONFIG.expeditedKeywords) {
        if (combinedShipping.includes(keyword)) {
          isExpedited = true;
          reasons.push(`Expedited shipping detected: ${keyword}`);
          priority = 'high';
          break;
        }
      }
    }

    // New orders default to high priority if not already set
    if (input.type === 'new_order' && priority === 'normal') {
      priority = 'high';
      reasons.push('New order notification');
    }

    // Cancellation requests and disputes are urgent
    if (input.type === 'cancellation_request' || input.type === 'dispute_opened') {
      priority = 'urgent';
      reasons.push(`${input.type === 'cancellation_request' ? 'Cancellation request' : 'Dispute opened'} requires immediate attention`);
    }

    return { priority, reasons, isHighValue, isExpedited };
  }

  /**
   * Check if a notification should be batched based on timing rules
   * 
   * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
   */
  private shouldBatchNotification(sellerId: string, notification: SellerNotification): boolean {
    // Urgent notifications never get batched
    if (notification.priority === 'urgent') {
      return false;
    }

    // High priority notifications bypass batching if configured
    if (notification.priority === 'high' && NOTIFICATION_BATCHING.urgentBypassBatching) {
      return false;
    }

    // Check timing for this seller
    const timing = this.sellerNotificationTimings.get(sellerId);
    if (!timing) {
      return false; // No previous notification, don't batch
    }

    const timeSinceLastNotification = Date.now() - timing.lastNotificationSentAt.getTime();

    // If less than minIntervalMs since last notification, batch this one
    return timeSinceLastNotification < NOTIFICATION_BATCHING.minIntervalMs;
  }

  /**
   * Update the notification timing tracker for a seller
   * 
   * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
   */
  private updateSellerNotificationTiming(sellerId: string, wasBatched: boolean = false): void {
    const existing = this.sellerNotificationTimings.get(sellerId);

    if (wasBatched && existing) {
      // Increment batched count
      existing.batchedCount++;
    } else {
      // Reset timing on actual send
      this.sellerNotificationTimings.set(sellerId, {
        sellerId,
        lastNotificationSentAt: new Date(),
        batchedCount: 0,
      });
    }
  }

  /**
   * Clean up old timing entries (called periodically)
   */
  private cleanupOldTimings(): void {
    const maxAge = NOTIFICATION_BATCHING.maxBatchWindowMs * 5; // Keep for 5 minutes
    const now = Date.now();

    for (const [sellerId, timing] of this.sellerNotificationTimings) {
      if (now - timing.lastNotificationSentAt.getTime() > maxAge) {
        this.sellerNotificationTimings.delete(sellerId);
      }
    }
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
   * Send email notification with order summary, buyer info, and action links
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
        safeLogger.info(`No email found for seller ${notification.sellerId}, skipping email notification`);
        return;
      }

      // Extract order data from notification
      const orderData = this.extractOrderEmailData(notification);

      // Generate email HTML based on notification type
      const emailHtml = this.generateSellerNotificationEmailHtml(notification, orderData);

      // Generate email subject
      const emailSubject = this.generateEmailSubject(notification, orderData);

      // Send email using EmailService
      const emailSent = await this.emailService.sendEmail({
        to: sellerProfile.email,
        subject: emailSubject,
        html: emailHtml,
      });

      if (emailSent) {
        notification.channelStatus.email = {
          status: 'sent',
          sentAt: new Date(),
        };
        safeLogger.info(`Email notification sent to seller ${notification.sellerId}`, {
          notificationId: notification.id,
          type: notification.type,
          email: sellerProfile.email,
        });
      } else {
        notification.channelStatus.email = {
          status: 'failed',
          error: 'Email service returned false',
        };
        safeLogger.warn(`Email notification failed for seller ${notification.sellerId}`);
      }
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
   * Extract order email data from notification
   */
  private extractOrderEmailData(notification: SellerNotification): OrderEmailData {
    const data = notification.data || {};

    return {
      orderId: notification.orderId || data.orderId as string || '',
      orderNumber: data.orderNumber as string,
      buyerName: data.buyerName as string,
      buyerEmail: data.buyerEmail as string,
      buyerAddress: data.buyerAddress as string,
      shippingAddress: data.shippingAddress as OrderEmailData['shippingAddress'],
      items: data.items as OrderEmailData['items'],
      subtotal: data.subtotal as number,
      shippingCost: data.shippingCost as number,
      taxes: data.taxes as number,
      totalAmount: data.totalAmount as number || data.orderTotal as number,
      currency: data.currency as string || 'USD',
      paymentMethod: data.paymentMethod as string,
      isExpedited: data.isExpedited as boolean || data.expeditedShipping as boolean,
      specialInstructions: data.specialInstructions as string,
      createdAt: data.createdAt ? new Date(data.createdAt as string) : new Date(),
    };
  }

  /**
   * Generate email subject based on notification type
   */
  private generateEmailSubject(notification: SellerNotification, orderData: OrderEmailData): string {
    const orderRef = orderData.orderNumber || orderData.orderId || 'Order';

    switch (notification.type) {
      case 'new_order':
        const priorityPrefix = notification.priority === 'urgent' ? '🚨 URGENT: ' :
          notification.priority === 'high' ? '⚡ ' : '';
        return `${priorityPrefix}New Order Received - ${orderRef}`;
      case 'cancellation_request':
        return `⚠️ Cancellation Request - ${orderRef}`;
      case 'dispute_opened':
        return `🔴 Dispute Opened - ${orderRef}`;
      case 'review_received':
        return `⭐ New Review Received`;
      case 'order_update':
        return `Order Update - ${orderRef}`;
      case 'payment_received':
        return `💰 Payment Received - ${orderRef}`;
      case 'return_requested':
        return `📦 Return Requested - ${orderRef}`;
      default:
        return `Notification - ${orderRef}`;
    }
  }

  /**
   * Generate seller notification email HTML
   * 
   * @requirement 4.2 - Email with order summary, buyer info, action links
   */
  private generateSellerNotificationEmailHtml(
    notification: SellerNotification,
    orderData: OrderEmailData
  ): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://linkdao.io';
    const actionUrl = this.getActionUrl(notification);

    // Format currency
    const formatCurrency = (amount: number | undefined, currency: string = 'USD'): string => {
      if (amount === undefined || amount === null) return 'N/A';
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    // Format date
    const formatDate = (date: Date | undefined): string => {
      if (!date) return 'N/A';
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    };

    // Generate items HTML if available
    const itemsHtml = orderData.items && orderData.items.length > 0
      ? this.generateOrderItemsHtml(orderData.items, orderData.currency || 'USD')
      : '';

    // Generate shipping address HTML
    const shippingAddressHtml = orderData.shippingAddress
      ? this.generateShippingAddressHtml(orderData.shippingAddress)
      : '';

    // Priority badge
    const priorityBadge = notification.priority === 'urgent'
      ? '<span style="background: #dc2626; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">URGENT</span>'
      : notification.priority === 'high'
        ? '<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">HIGH PRIORITY</span>'
        : '';

    // Expedited shipping badge
    const expeditedBadge = orderData.isExpedited
      ? '<span style="background: #7c3aed; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-left: 8px;">⚡ EXPEDITED</span>'
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f5f7;">
        <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
              ${this.getNotificationIcon(notification.type)} ${notification.title}
            </h1>
            <div style="margin-top: 8px;">
              ${priorityBadge}
              ${expeditedBadge}
            </div>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px;">
            
            <!-- Notification Message -->
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${notification.body}
            </p>

            <!-- Order Summary Section -->
            ${orderData.orderId ? `
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0; border-bottom: 2px solid #667eea; padding-bottom: 8px;">
                  📦 Order Summary
                </h2>
                
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Order ID</span>
                    <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${orderData.orderNumber || orderData.orderId}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Order Date</span>
                    <span style="color: #1f2937; font-size: 14px;">${formatDate(orderData.createdAt)}</span>
                  </div>
                  ${orderData.paymentMethod ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <span style="color: #6b7280; font-size: 14px;">Payment Method</span>
                      <span style="color: #1f2937; font-size: 14px;">${orderData.paymentMethod}</span>
                    </div>
                  ` : ''}
                  ${orderData.totalAmount !== undefined ? `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                      <span style="color: #1f2937; font-size: 16px; font-weight: 600;">Total Amount</span>
                      <span style="color: #10b981; font-size: 18px; font-weight: 700;">${formatCurrency(orderData.totalAmount, orderData.currency)}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}

            <!-- Order Items Section -->
            ${itemsHtml}

            <!-- Buyer Information Section -->
            ${orderData.buyerName || orderData.buyerEmail || shippingAddressHtml ? `
              <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #0ea5e9;">
                <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0;">
                  👤 Buyer Information
                </h2>
                
                ${orderData.buyerName ? `
                  <div style="margin-bottom: 8px;">
                    <span style="color: #6b7280; font-size: 14px;">Name: </span>
                    <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${orderData.buyerName}</span>
                  </div>
                ` : ''}
                
                ${orderData.buyerEmail ? `
                  <div style="margin-bottom: 8px;">
                    <span style="color: #6b7280; font-size: 14px;">Email: </span>
                    <span style="color: #1f2937; font-size: 14px;">${orderData.buyerEmail}</span>
                  </div>
                ` : ''}
                
                ${shippingAddressHtml}
              </div>
            ` : ''}

            <!-- Special Instructions -->
            ${orderData.specialInstructions ? `
              <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <h3 style="color: #92400e; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
                  📝 Special Instructions
                </h3>
                <p style="color: #78350f; font-size: 14px; margin: 0; line-height: 1.5;">
                  ${orderData.specialInstructions}
                </p>
              </div>
            ` : ''}

            <!-- Action Buttons -->
            <div style="text-align: center; margin-top: 30px;">
              <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 12px;">
                ${this.getActionButtonText(notification.type)}
              </a>
              
              ${notification.type === 'new_order' ? `
                <a href="${baseUrl}/seller/orders" style="display: inline-block; background: #f3f4f6; color: #374151; text-decoration: none; padding: 14px 24px; border-radius: 6px; font-weight: 500; font-size: 14px;">
                  View All Orders
                </a>
              ` : ''}
            </div>

            <!-- Quick Actions for New Orders -->
            ${notification.type === 'new_order' ? `
              <div style="margin-top: 24px; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
                <h3 style="color: #15803d; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">
                  ⚡ Quick Actions
                </h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                  <a href="${baseUrl}/seller/orders/${orderData.orderId}/process" style="color: #15803d; font-size: 13px; text-decoration: none; padding: 8px 16px; background: white; border-radius: 4px; border: 1px solid #86efac;">
                    Start Processing
                  </a>
                  <a href="${baseUrl}/seller/orders/${orderData.orderId}/packing-slip" style="color: #15803d; font-size: 13px; text-decoration: none; padding: 8px 16px; background: white; border-radius: 4px; border: 1px solid #86efac;">
                    Print Packing Slip
                  </a>
                  <a href="${baseUrl}/seller/orders/${orderData.orderId}/label" style="color: #15803d; font-size: 13px; text-decoration: none; padding: 8px 16px; background: white; border-radius: 4px; border: 1px solid #86efac;">
                    Generate Label
                  </a>
                </div>
              </div>
            ` : ''}

            <!-- Cancellation Request Actions -->
            ${notification.type === 'cancellation_request' ? `
              <div style="margin-top: 24px; padding: 20px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <h3 style="color: #dc2626; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">
                  ⏰ Action Required
                </h3>
                <p style="color: #7f1d1d; font-size: 13px; margin: 0 0 12px 0;">
                  Please respond within 24 hours. If no response is received, the cancellation will be automatically approved.
                </p>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                  <a href="${baseUrl}/seller/orders/${orderData.orderId}/cancel/approve" style="color: white; font-size: 13px; text-decoration: none; padding: 8px 16px; background: #dc2626; border-radius: 4px;">
                    Approve Cancellation
                  </a>
                  <a href="${baseUrl}/seller/orders/${orderData.orderId}/cancel/deny" style="color: #dc2626; font-size: 13px; text-decoration: none; padding: 8px 16px; background: white; border-radius: 4px; border: 1px solid #fecaca;">
                    Deny Request
                  </a>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background: #f8f9fa; padding: 24px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              LinkDAO Marketplace - Seller Dashboard
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              You received this email because you're a seller on LinkDAO.
              <a href="${baseUrl}/seller/settings/notifications" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML for order items list
   */
  private generateOrderItemsHtml(items: OrderEmailData['items'], currency: string): string {
    if (!items || items.length === 0) return '';

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    const itemRows = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />` : ''}
            <span style="color: #1f2937; font-size: 14px;">${item.name}</span>
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
          ${formatCurrency(item.price * item.quantity)}
        </td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0;">
          🛒 Order Items
        </h2>
        <table style="width: 100%; border-collapse: collapse; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #e5e7eb;">
              <th style="padding: 12px; text-align: left; color: #374151; font-size: 12px; font-weight: 600; text-transform: uppercase;">Item</th>
              <th style="padding: 12px; text-align: center; color: #374151; font-size: 12px; font-weight: 600; text-transform: uppercase;">Qty</th>
              <th style="padding: 12px; text-align: right; color: #374151; font-size: 12px; font-weight: 600; text-transform: uppercase;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Generate HTML for shipping address
   */
  private generateShippingAddressHtml(address: OrderEmailData['shippingAddress']): string {
    if (!address) return '';

    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    if (parts.length === 0) return '';

    return `
      <div style="margin-top: 12px;">
        <span style="color: #6b7280; font-size: 14px; display: block; margin-bottom: 4px;">Shipping Address:</span>
        <div style="color: #1f2937; font-size: 14px; line-height: 1.5; padding: 12px; background: white; border-radius: 4px;">
          ${address.street ? `${address.street}<br>` : ''}
          ${address.city ? `${address.city}` : ''}${address.state ? `, ${address.state}` : ''} ${address.postalCode || ''}<br>
          ${address.country || ''}
        </div>
      </div>
    `;
  }

  /**
   * Get notification icon based on type
   */
  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'new_order':
        return '🛍️';
      case 'cancellation_request':
        return '⚠️';
      case 'dispute_opened':
        return '🔴';
      case 'review_received':
        return '⭐';
      case 'order_update':
        return '📋';
      case 'payment_received':
        return '💰';
      case 'return_requested':
        return '📦';
      default:
        return '📬';
    }
  }

  /**
   * Get action button text based on notification type
   */
  private getActionButtonText(type: string): string {
    switch (type) {
      case 'new_order':
        return 'View Order Details';
      case 'cancellation_request':
        return 'Review Cancellation';
      case 'dispute_opened':
        return 'View Dispute';
      case 'review_received':
        return 'View Review';
      case 'order_update':
        return 'View Order';
      case 'payment_received':
        return 'View Payment';
      case 'return_requested':
        return 'Review Return';
      default:
        return 'View Details';
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

      // Double-write to notifications table for unified history
      try {
        // Get user wallet address from sellerId
        const user = await this.databaseService.getUserById(notification.sellerId);

        if (user && user.walletAddress) {
          await db.insert(notifications).values({
            userAddress: user.walletAddress,
            type: notification.type,
            orderId: notification.orderId,
            message: notification.body || notification.title, // Use body if available, else title
            metadata: JSON.stringify({
              title: notification.title,
              actionUrl: this.getActionUrl(notification),
              priority: notification.priority,
              ...notification.data
            }),
            read: false,
            createdAt: new Date()
          });
          safeLogger.debug(`Notification double-written to users notifications table for ${user.walletAddress}`);
        } else {
          safeLogger.warn(`Could not find wallet address for seller ${notification.sellerId}, skipping double-write`);
        }
      } catch (dbError) {
        safeLogger.error('Error double-writing to notifications table:', dbError);
        // Don't fail the whole method, as the primary delivery (WS) might have succeeded
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
