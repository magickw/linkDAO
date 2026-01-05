/**
 * Seller Notification Types
 * 
 * Type definitions for the Seller Notification Service as specified in the
 * Order Lifecycle Infrastructure design document.
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 * @requirement Requirement 4: Seller New Order Notifications
 */

/**
 * Types of notifications that can be sent to sellers
 */
export type SellerNotificationType = 
  | 'new_order'
  | 'cancellation_request'
  | 'dispute_opened'
  | 'review_received'
  | 'order_update'
  | 'payment_received'
  | 'return_requested';

/**
 * Priority levels for seller notifications
 * - normal: Standard notifications
 * - high: High-value orders or expedited shipping
 * - urgent: Critical issues requiring immediate attention
 */
export type NotificationPriority = 'normal' | 'high' | 'urgent';

/**
 * Delivery channels for notifications
 */
export type NotificationChannel = 'push' | 'email' | 'in_app';

/**
 * Status of a notification in the queue
 */
export type NotificationStatus = 'pending' | 'batched' | 'sent' | 'failed';

/**
 * Status of delivery for a specific channel
 */
export type ChannelDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

/**
 * Seller notification entity representing a notification in the queue
 * 
 * @requirement 4.1 - Push notification within 30 seconds
 * @requirement 4.2 - Email with order summary, buyer info, action links
 * @requirement 4.3 - In-app notification badge and pending queue
 * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
 * @requirement 4.6 - High-value/expedited orders marked as high priority
 * @requirement 4.7 - One-click access to order details
 */
export interface SellerNotification {
  /** Unique identifier for the notification */
  id: string;
  
  /** ID of the seller receiving the notification */
  sellerId: string;
  
  /** Type of notification */
  type: SellerNotificationType;
  
  /** Priority level - high-value/expedited orders get higher priority */
  priority: NotificationPriority;
  
  /** Associated order ID (optional for some notification types) */
  orderId?: string;
  
  /** Notification title */
  title: string;
  
  /** Notification body/message */
  body: string;
  
  /** Additional data payload for the notification */
  data: Record<string, unknown>;
  
  /** Channels to deliver this notification through */
  channels: NotificationChannel[];
  
  /** Timestamp when notification was created */
  createdAt: Date;
  
  /** Timestamp when notification was sent (if sent) */
  sentAt?: Date;
  
  /** Batch ID if this notification is part of a batch */
  batchId?: string;
  
  /** Current status of the notification */
  status: NotificationStatus;
  
  /** Error message if notification failed */
  error?: string;
  
  /** Per-channel delivery status */
  channelStatus: {
    push?: {
      status: ChannelDeliveryStatus;
      sentAt?: Date;
      error?: string;
    };
    email?: {
      status: ChannelDeliveryStatus;
      sentAt?: Date;
      error?: string;
    };
    in_app?: {
      status: ChannelDeliveryStatus;
      sentAt?: Date;
      error?: string;
    };
  };
}

/**
 * Input for creating a new seller notification
 */
export interface SellerNotificationInput {
  sellerId: string;
  type: SellerNotificationType;
  priority?: NotificationPriority;
  orderId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
}

/**
 * Seller notification preferences
 * 
 * @requirement 4.5 - Respect quiet hours and channel preferences
 */
export interface NotificationPreferences {
  /** Seller ID these preferences belong to */
  sellerId: string;
  
  /** Whether push notifications are enabled */
  pushEnabled: boolean;
  
  /** Whether email notifications are enabled */
  emailEnabled: boolean;
  
  /** Whether in-app notifications are enabled */
  inAppEnabled: boolean;
  
  /** Whether quiet hours are enabled */
  quietHoursEnabled: boolean;
  
  /** Start time for quiet hours (HH:mm format, e.g., "22:00") */
  quietHoursStart?: string;
  
  /** End time for quiet hours (HH:mm format, e.g., "08:00") */
  quietHoursEnd?: string;
  
  /** Timezone for quiet hours (e.g., "America/New_York") */
  quietHoursTimezone?: string;
  
  /** Whether notification batching is enabled */
  batchingEnabled: boolean;
  
  /** Batching window in minutes (default: 1) */
  batchWindowMinutes: number;
  
  /** Order value threshold above which notifications are marked as urgent */
  highValueThreshold?: number;
  
  /** Timestamp when preferences were created */
  createdAt: Date;
  
  /** Timestamp when preferences were last updated */
  updatedAt: Date;
}

/**
 * Input for updating notification preferences
 */
export interface NotificationPreferencesInput {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  batchingEnabled?: boolean;
  batchWindowMinutes?: number;
  highValueThreshold?: number;
}

/**
 * Default notification preferences for new sellers
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'sellerId' | 'createdAt' | 'updatedAt'> = {
  pushEnabled: true,
  emailEnabled: true,
  inAppEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: undefined,
  quietHoursEnd: undefined,
  quietHoursTimezone: 'UTC',
  batchingEnabled: true,
  batchWindowMinutes: 1,
  highValueThreshold: undefined,
};

/**
 * Batching configuration constants
 * 
 * @requirement 4.4 - Max 1 notification per minute for rapid orders
 */
export const NOTIFICATION_BATCHING = {
  /** Maximum notifications in a single batch */
  maxBatchSize: 10,
  
  /** Maximum time window for batching in milliseconds (1 minute) */
  maxBatchWindowMs: 60000,
  
  /** Whether urgent notifications bypass batching */
  urgentBypassBatching: true,
  
  /** Minimum interval between notifications to same seller (ms) - enforces max 1 per minute */
  minIntervalMs: 60000,
} as const;

/**
 * High-value order threshold configuration
 * 
 * @requirement 4.6 - High-value/expedited orders marked as high priority
 */
export const HIGH_VALUE_ORDER_CONFIG = {
  /** Default threshold in USD for marking orders as high-value */
  defaultThresholdUSD: 500,
  
  /** Expedited shipping keywords to detect */
  expeditedKeywords: ['expedited', 'express', 'overnight', 'rush', 'priority', 'next-day', 'same-day', 'next day', 'same day'],
} as const;

/**
 * Result of processing the notification queue
 */
export interface QueueProcessingResult {
  /** Total notifications processed */
  processed: number;
  
  /** Successfully sent notifications */
  sent: number;
  
  /** Failed notifications */
  failed: number;
  
  /** Notifications that were batched for later */
  batched: number;
  
  /** Details of any errors encountered */
  errors: Array<{
    notificationId: string;
    error: string;
  }>;
}

/**
 * Notification batch for grouping multiple notifications
 */
export interface NotificationBatch {
  /** Unique batch identifier */
  id: string;
  
  /** Seller ID this batch is for */
  sellerId: string;
  
  /** Notifications in this batch */
  notifications: SellerNotification[];
  
  /** When the batch window ends */
  windowEnd: Date;
  
  /** When the batch was created */
  createdAt: Date;
}

/**
 * Seller notification timing tracker for enforcing batching rules
 * 
 * @requirement 4.4 - Max 1 notification per minute for rapid orders
 */
export interface SellerNotificationTiming {
  /** Seller ID */
  sellerId: string;
  
  /** Timestamp of last notification sent to this seller */
  lastNotificationSentAt: Date;
  
  /** Count of notifications batched since last send */
  batchedCount: number;
}

/**
 * Priority determination result
 * 
 * @requirement 4.6 - High-value/expedited orders marked as high priority
 */
export interface PriorityDetermination {
  /** Determined priority level */
  priority: NotificationPriority;
  
  /** Reasons for the priority determination */
  reasons: string[];
  
  /** Whether this is a high-value order */
  isHighValue: boolean;
  
  /** Whether this has expedited shipping */
  isExpedited: boolean;
}
