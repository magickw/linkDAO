import cron from 'node-cron';
import { safeLogger } from '../utils/safeLogger';
import { OrderService } from './orderService';

/**
 * Service to handle scheduled cancellation tasks
 */
export class CancellationSchedulerService {
    private orderService: OrderService;
    private autoApprovalJob: any = null;
    private isProcessing: boolean = false;

    constructor() {
        this.orderService = new OrderService();
    }

    /**
     * Start the scheduler
     */
    start(): void {
        safeLogger.info('Starting CancellationSchedulerService...');

        // Run every hour
        // Find pending cancellation requests older than 24 hours and auto-approve them
        this.autoApprovalJob = cron.schedule('0 * * * *', async () => {
            await this.processAutoApprovals();
        });

        safeLogger.info('CancellationSchedulerService started successfully');
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.autoApprovalJob) {
            this.autoApprovalJob.stop();
            this.autoApprovalJob = null;
        }
    }

    /**
     * Process auto-approvals
     */
    private async processAutoApprovals(): Promise<void> {
        if (this.isProcessing) {
            safeLogger.warn('Cancellation auto-approval job already running, skipping...');
            return;
        }

        this.isProcessing = true;
        try {
            safeLogger.info('Running cancellation auto-approval job...');
            const count = await this.orderService.processAutoApprovals();
            safeLogger.info(`Cancellation auto-approval job completed. Processed ${count} requests.`);
        } catch (error) {
            safeLogger.error('Error in cancellation auto-approval job:', error);
        } finally {
            this.isProcessing = false;
        }
    }
}

export const cancellationSchedulerService = new CancellationSchedulerService();
