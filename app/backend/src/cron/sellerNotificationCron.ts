/**
 * Seller Notification Queue Cron Job
 * 
 * Processes the seller notification queue every minute to:
 * - Send batched notifications
 * - Respect quiet hours and channel preferences
 * - Handle failed notification retries
 * 
 * @requirement 4.4 - Batching for rapid orders (max 1 per minute)
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 */

import { SellerNotificationService } from '../services/sellerNotificationService';
import { safeLogger } from '../utils/safeLogger';

// Singleton instance of the notification service
let notificationService: SellerNotificationService | null = null;

// Interval handle for cleanup
let cronInterval: NodeJS.Timeout | null = null;

// Track if cron is running to prevent overlapping executions
let isProcessing = false;

/**
 * Initialize the seller notification cron job
 * 
 * @param service - Optional SellerNotificationService instance (for testing)
 */
export function initializeSellerNotificationCron(service?: SellerNotificationService): void {
  notificationService = service || new SellerNotificationService();
  
  // Clear any existing interval
  if (cronInterval) {
    clearInterval(cronInterval);
  }

  // Run every minute (60000ms)
  const CRON_INTERVAL_MS = 60000;
  
  cronInterval = setInterval(async () => {
    await processNotificationQueueJob();
  }, CRON_INTERVAL_MS);

  safeLogger.info('Seller notification cron job initialized', {
    intervalMs: CRON_INTERVAL_MS,
  });

  // Run immediately on startup to process any pending notifications
  processNotificationQueueJob().catch(error => {
    safeLogger.error('Error in initial notification queue processing:', error);
  });
}

/**
 * Stop the seller notification cron job
 */
export function stopSellerNotificationCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    safeLogger.info('Seller notification cron job stopped');
  }
}

/**
 * Process the notification queue
 * 
 * This is the main job function that runs every minute.
 * It includes protection against overlapping executions.
 */
async function processNotificationQueueJob(): Promise<void> {
  // Prevent overlapping executions
  if (isProcessing) {
    safeLogger.debug('Notification queue processing already in progress, skipping');
    return;
  }

  isProcessing = true;
  const startTime = Date.now();

  try {
    if (!notificationService) {
      notificationService = new SellerNotificationService();
    }

    const result = await notificationService.processNotificationQueue();

    const duration = Date.now() - startTime;

    // Log results
    if (result.processed > 0 || result.errors.length > 0) {
      safeLogger.info('Seller notification queue processed', {
        processed: result.processed,
        sent: result.sent,
        failed: result.failed,
        batched: result.batched,
        errorCount: result.errors.length,
        durationMs: duration,
      });
    }

    // Log individual errors for debugging
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        safeLogger.warn('Notification delivery error', {
          notificationId: error.notificationId,
          error: error.error,
        });
      }
    }

    // Alert if processing is taking too long
    if (duration > 30000) {
      safeLogger.warn('Notification queue processing took longer than expected', {
        durationMs: duration,
        processed: result.processed,
      });
    }

  } catch (error) {
    safeLogger.error('Error processing seller notification queue:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Manually trigger notification queue processing
 * Useful for testing or immediate processing needs
 */
export async function triggerNotificationQueueProcessing(): Promise<void> {
  await processNotificationQueueJob();
}

/**
 * Get the current status of the cron job
 */
export function getCronStatus(): {
  isRunning: boolean;
  isProcessing: boolean;
} {
  return {
    isRunning: cronInterval !== null,
    isProcessing,
  };
}

export default {
  initializeSellerNotificationCron,
  stopSellerNotificationCron,
  triggerNotificationQueueProcessing,
  getCronStatus,
};
