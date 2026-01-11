/**
 * Inventory Cleanup Cron Job
 *
 * Periodically releases expired inventory holds to ensure products
 * become available again if orders are not completed within the timeout period.
 */

import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from '../services/databaseService';

const databaseService = new DatabaseService();

let cronInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

// Interval for checking expired inventory holds (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Initialize the inventory cleanup cron job
 */
export function initializeInventoryCleanupCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
  }

  cronInterval = setInterval(async () => {
    await processExpiredInventoryHolds();
  }, CLEANUP_INTERVAL_MS);

  // Also run immediately on startup
  processExpiredInventoryHolds();

  safeLogger.info('Inventory cleanup cron job initialized', {
    intervalMs: CLEANUP_INTERVAL_MS,
    intervalMinutes: CLEANUP_INTERVAL_MS / 60000
  });
}

/**
 * Stop the inventory cleanup cron job
 */
export function stopInventoryCleanupCron(): void {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    safeLogger.info('Inventory cleanup cron job stopped');
  }
}

/**
 * Process and release expired inventory holds
 */
async function processExpiredInventoryHolds(): Promise<void> {
  if (isProcessing) {
    safeLogger.debug('Inventory cleanup already in progress, skipping');
    return;
  }

  isProcessing = true;

  try {
    const releasedCount = await databaseService.releaseExpiredInventory();

    if (releasedCount > 0) {
      safeLogger.info('Released expired inventory holds', { count: releasedCount });
    } else {
      safeLogger.debug('No expired inventory holds to release');
    }
  } catch (error) {
    safeLogger.error('Error processing expired inventory holds:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Get the current status of the inventory cleanup cron job
 */
export function getInventoryCleanupCronStatus(): {
  isRunning: boolean;
  isProcessing: boolean;
} {
  return {
    isRunning: cronInterval !== null,
    isProcessing
  };
}

/**
 * Manually trigger inventory cleanup (for testing/admin purposes)
 */
export async function triggerInventoryCleanup(): Promise<number> {
  try {
    const releasedCount = await databaseService.releaseExpiredInventory();
    safeLogger.info('Manual inventory cleanup completed', { count: releasedCount });
    return releasedCount;
  } catch (error) {
    safeLogger.error('Error in manual inventory cleanup:', error);
    throw error;
  }
}

export {
  initializeInventoryCleanupCron,
  stopInventoryCleanupCron,
  getInventoryCleanupCronStatus,
  triggerInventoryCleanup
};
