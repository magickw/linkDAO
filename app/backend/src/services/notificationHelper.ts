import { NotificationService } from './notificationService';
import { safeLogger } from '../utils/safeLogger';
import { supportNotificationService } from './supportNotificationService';

// Re-export the original notification service for order notifications
export const orderNotificationService = new NotificationService();

// Export support notification service for support-related notifications
export { supportNotificationService };

// Helper function to send notification based on context
export async function createNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
): Promise<void> {
  // Determine if this is a support or order notification
  const supportTypes = ['ticket-update', 'ticket-response', 'chat-message', 'system'];
  
  if (supportTypes.includes(notification.type)) {
    supportNotificationService.sendNotification(userId, notification as any);
  } else {
    // For order notifications, use the existing service
    // This maintains backward compatibility
    safeLogger.info('Order notification:', notification);
  }
}
