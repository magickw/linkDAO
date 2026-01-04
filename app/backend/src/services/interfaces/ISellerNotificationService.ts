/**
 * ISellerNotificationService Interface
 * 
 * Interface for the Seller Notification Service that manages notifications
 * to sellers about new orders, cancellation requests, disputes, and reviews.
 * 
 * Key features:
 * - Multi-channel delivery (push, email, in-app)
 * - Notification batching to prevent notification fatigue
 * - Quiet hours and channel preference support
 * - Priority-based notification handling
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 * @requirement Requirement 4: Seller New Order Notifications
 */

import {
  SellerNotification,
  SellerNotificationInput,
  NotificationPreferences,
  NotificationPreferencesInput,
  QueueProcessingResult,
} from '../../types/sellerNotification';

/**
 * Interface for the Seller Notification Service
 * 
 * This service is responsible for:
 * 1. Queuing notifications for sellers (with batching support)
 * 2. Processing the notification queue (runs every minute)
 * 3. Managing seller notification preferences
 * 
 * @requirement 4.1 - Push notification within 30 seconds of new order
 * @requirement 4.2 - Email with order summary, buyer info, action links
 * @requirement 4.3 - In-app notification badge and pending queue
 * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
 * @requirement 4.5 - Respect quiet hours and channel preferences
 * @requirement 4.6 - High-value/expedited orders marked as high priority
 * @requirement 4.7 - One-click access to order details
 */
export interface ISellerNotificationService {
  /**
   * Queue a notification for delivery to a seller.
   * 
   * The notification will be added to the queue and processed according to:
   * - Seller's notification preferences (channels, quiet hours)
   * - Batching rules (max 1 per minute for rapid orders)
   * - Priority level (urgent notifications bypass batching)
   * 
   * @param notification - The notification to queue
   * @returns The queued notification with assigned ID and status
   * 
   * @requirement 4.1 - Push notification within 30 seconds
   * @requirement 4.4 - Batching for rapid orders
   * @requirement 4.6 - High-value orders marked as high priority
   * 
   * @example
   * ```typescript
   * const notification = await service.queueNotification({
   *   sellerId: 'seller-123',
   *   type: 'new_order',
   *   orderId: 'order-456',
   *   title: 'New Order Received',
   *   body: 'You have received a new order for $150.00',
   *   data: {
   *     orderTotal: 150.00,
   *     buyerName: 'John Doe',
   *     itemCount: 3
   *   }
   * });
   * ```
   */
  queueNotification(notification: SellerNotificationInput): Promise<SellerNotification>;

  /**
   * Process the notification queue.
   * 
   * This method should be called periodically (every minute) by a cron job.
   * It will:
   * 1. Fetch pending notifications from the queue
   * 2. Group notifications by seller for batching
   * 3. Apply seller preferences (quiet hours, channel filtering)
   * 4. Send notifications through appropriate channels
   * 5. Update notification status in the database
   * 
   * @returns Result of the queue processing including counts and errors
   * 
   * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
   * @requirement 4.5 - Respect quiet hours and channel preferences
   * 
   * @example
   * ```typescript
   * // Called by cron job every minute
   * const result = await service.processNotificationQueue();
   * console.log(`Processed: ${result.processed}, Sent: ${result.sent}, Failed: ${result.failed}`);
   * ```
   */
  processNotificationQueue(): Promise<QueueProcessingResult>;

  /**
   * Get notification preferences for a seller.
   * 
   * Returns the seller's notification preferences including:
   * - Enabled channels (push, email, in-app)
   * - Quiet hours configuration
   * - Batching settings
   * - High-value order threshold
   * 
   * If no preferences exist for the seller, returns default preferences.
   * 
   * @param sellerId - The ID of the seller
   * @returns The seller's notification preferences
   * 
   * @requirement 4.5 - Respect quiet hours and channel preferences
   * 
   * @example
   * ```typescript
   * const prefs = await service.getNotificationPreferences('seller-123');
   * if (prefs.quietHoursEnabled) {
   *   console.log(`Quiet hours: ${prefs.quietHoursStart} - ${prefs.quietHoursEnd}`);
   * }
   * ```
   */
  getNotificationPreferences(sellerId: string): Promise<NotificationPreferences>;

  /**
   * Update notification preferences for a seller.
   * 
   * Allows sellers to customize their notification experience:
   * - Enable/disable specific channels
   * - Set quiet hours
   * - Configure batching behavior
   * - Set high-value order threshold
   * 
   * @param sellerId - The ID of the seller
   * @param preferences - The preferences to update (partial update supported)
   * @returns The updated notification preferences
   * 
   * @requirement 4.5 - Respect quiet hours and channel preferences
   * 
   * @example
   * ```typescript
   * const updated = await service.updateNotificationPreferences('seller-123', {
   *   quietHoursEnabled: true,
   *   quietHoursStart: '22:00',
   *   quietHoursEnd: '08:00',
   *   quietHoursTimezone: 'America/New_York'
   * });
   * ```
   */
  updateNotificationPreferences(
    sellerId: string,
    preferences: NotificationPreferencesInput
  ): Promise<NotificationPreferences>;

  /**
   * Get pending notifications for a seller.
   * 
   * Returns notifications that are queued but not yet sent.
   * Useful for displaying pending notification count in the UI.
   * 
   * @param sellerId - The ID of the seller
   * @param limit - Maximum number of notifications to return (default: 50)
   * @returns Array of pending notifications
   * 
   * @requirement 4.3 - In-app notification badge and pending queue
   */
  getPendingNotifications(sellerId: string, limit?: number): Promise<SellerNotification[]>;

  /**
   * Get notification history for a seller.
   * 
   * Returns sent notifications for the seller, useful for
   * displaying notification history in the UI.
   * 
   * @param sellerId - The ID of the seller
   * @param options - Pagination and filtering options
   * @returns Array of sent notifications with pagination info
   */
  getNotificationHistory(
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
  }>;

  /**
   * Mark a notification as read.
   * 
   * Updates the notification status to indicate the seller has seen it.
   * 
   * @param notificationId - The ID of the notification
   * @param sellerId - The ID of the seller (for authorization)
   * @returns True if successfully marked as read
   */
  markAsRead(notificationId: string, sellerId: string): Promise<boolean>;

  /**
   * Mark all notifications as read for a seller.
   * 
   * Bulk operation to clear all unread notifications.
   * 
   * @param sellerId - The ID of the seller
   * @returns Number of notifications marked as read
   */
  markAllAsRead(sellerId: string): Promise<number>;

  /**
   * Get unread notification count for a seller.
   * 
   * Returns the count of unread in-app notifications.
   * Used for displaying badge count in the UI.
   * 
   * @param sellerId - The ID of the seller
   * @returns Count of unread notifications
   * 
   * @requirement 4.3 - In-app notification badge
   */
  getUnreadCount(sellerId: string): Promise<number>;

  /**
   * Cancel a pending notification.
   * 
   * Removes a notification from the queue before it's sent.
   * Only works for notifications in 'pending' or 'batched' status.
   * 
   * @param notificationId - The ID of the notification to cancel
   * @param sellerId - The ID of the seller (for authorization)
   * @returns True if successfully cancelled
   */
  cancelNotification(notificationId: string, sellerId: string): Promise<boolean>;

  /**
   * Send an immediate notification bypassing the queue.
   * 
   * Used for urgent notifications that need to be sent immediately
   * without waiting for queue processing. Still respects channel
   * preferences but ignores batching and quiet hours.
   * 
   * @param notification - The notification to send immediately
   * @returns The sent notification with delivery status
   * 
   * @requirement 4.1 - Push notification within 30 seconds
   */
  sendImmediateNotification(notification: SellerNotificationInput): Promise<SellerNotification>;
}

/**
 * Factory function type for creating ISellerNotificationService instances
 */
export type SellerNotificationServiceFactory = () => ISellerNotificationService;

export default ISellerNotificationService;
