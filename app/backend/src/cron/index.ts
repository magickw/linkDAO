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
import {
  initializeInventoryCleanupCron,
  stopInventoryCleanupCron,
  getInventoryCleanupCronStatus,
} from './inventoryCleanupCron';
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

  // Initialize inventory cleanup (runs every 5 minutes)
  initializeInventoryCleanupCron();

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
  stopInventoryCleanupCron();

  safeLogger.info('All cron jobs stopped');
}

/**
 * Get status of all cron jobs
 */
export function getAllCronStatus(): Record<string, { isRunning: boolean; isProcessing: boolean }> {
  return {
    sellerNotification: getNotificationCronStatus(),
    inventoryCleanup: getInventoryCleanupCronStatus(),
  };
}

// Re-export individual cron modules
export * from './sellerNotificationCron';
export * from './inventoryCleanupCron';

export default {
  initializeAllCronJobs,
  stopAllCronJobs,
  getAllCronStatus,
};
