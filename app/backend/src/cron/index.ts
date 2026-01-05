/**
 * Cron Jobs Index
 * 
 * Central module for initializing and managing all cron jobs in the application.
 */

import { 
  initializeSellerNotificationCron, 
  stopSellerNotificationCron,
  getCronStatus as getNotificationCronStatus,
} from './sellerNotificationCron';
import { safeLogger } from '../utils/safeLogger';

/**
 * Initialize all cron jobs
 * 
 * Call this during application startup to start all scheduled tasks.
 */
export function initializeAllCronJobs(): void {
  safeLogger.info('Initializing all cron jobs...');

  // Initialize seller notification queue processor (runs every minute)
  initializeSellerNotificationCron();

  safeLogger.info('All cron jobs initialized');
}

/**
 * Stop all cron jobs
 * 
 * Call this during application shutdown for graceful cleanup.
 */
export function stopAllCronJobs(): void {
  safeLogger.info('Stopping all cron jobs...');

  stopSellerNotificationCron();

  safeLogger.info('All cron jobs stopped');
}

/**
 * Get status of all cron jobs
 */
export function getAllCronStatus(): Record<string, { isRunning: boolean; isProcessing: boolean }> {
  return {
    sellerNotification: getNotificationCronStatus(),
  };
}

// Re-export individual cron modules
export * from './sellerNotificationCron';

export default {
  initializeAllCronJobs,
  stopAllCronJobs,
  getAllCronStatus,
};
