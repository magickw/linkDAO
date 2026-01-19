import cron from 'node-cron';
import { orderAutomationService } from '../services/orderAutomationService';
import { safeLogger } from '../utils/safeLogger';

/**
 * Initialize cron jobs for order automation
 */
export function initializeAutomationJobs(): void {
    // Process all orders every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        try {
            safeLogger.info('[CRON] Starting order automation batch...');
            const result = await orderAutomationService.processAllOrders();
            safeLogger.info(`[CRON] Order automation complete: ${result.processed} processed, ${result.errors} errors`);
        } catch (error) {
            safeLogger.error('[CRON] Error in order automation:', error);
        }
    });

    safeLogger.info('[CRON] Order automation jobs initialized');
}
