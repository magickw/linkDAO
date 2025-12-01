import { Queue, Worker, Job } from 'bullmq';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from '../services/redisService';
import { returnAnalyticsService } from '../services/returnAnalyticsService';
import { ReturnEvent } from '../services/returnAnalyticsService';

// Define the shape of data expected in the queue
export interface ReturnEventJobData {
    event: Omit<ReturnEvent, 'id' | 'timestamp'>;
    timestamp: string; // ISO string
}

const QUEUE_NAME = 'return-events';

// Create the queue instance
export const returnEventQueue = new Queue<ReturnEventJobData>(QUEUE_NAME, {
    connection: redisService.getClient(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 1000, // Keep last 1000 completed jobs
        removeOnFail: 5000,     // Keep last 5000 failed jobs
    },
});

// Create the worker to process jobs
export const returnEventWorker = new Worker<ReturnEventJobData>(
    QUEUE_NAME,
    async (job: Job<ReturnEventJobData>) => {
        const { event, timestamp } = job.data;
        const jobId = job.id;

        safeLogger.debug(`Processing return event job ${jobId}`, {
            eventType: event.eventType,
            returnId: event.returnId
        });

        try {
            // 1. Process the event (store in DB, update metrics)
            // Note: We might need to adjust processReturnEvent to accept a timestamp if we want to preserve exact event time
            // For now, we'll assume the service handles storage and basic validation
            await returnAnalyticsService.processReturnEvent(event);

            // 2. Trigger real-time updates via WebSocket
            // This is handled within processReturnEvent currently, but we might move it here
            // for better separation of concerns in the future.

            safeLogger.info(`Successfully processed return event job ${jobId}`);
        } catch (error) {
            safeLogger.error(`Failed to process return event job ${jobId}:`, error);
            throw error; // Let BullMQ handle retries
        }
    },
    {
        connection: redisService.getClient(),
        concurrency: 5, // Process up to 5 events concurrently
        limiter: {
            max: 100,      // Max 100 jobs
            duration: 1000 // per 1 second
        }
    }
);

// Event listeners for the worker
returnEventWorker.on('completed', (job) => {
    safeLogger.debug(`Job ${job.id} completed`);
});

returnEventWorker.on('failed', (job, err) => {
    safeLogger.error(`Job ${job?.id} failed:`, err);
});

returnEventWorker.on('error', (err) => {
    safeLogger.error('Return event worker error:', err);
});

/**
 * Add a return event to the processing queue
 */
export const queueReturnEvent = async (event: Omit<ReturnEvent, 'id' | 'timestamp'>) => {
    try {
        await returnEventQueue.add('process_event', {
            event,
            timestamp: new Date().toISOString(),
        });
        safeLogger.debug(`Queued return event: ${event.eventType} for return ${event.returnId}`);
    } catch (error) {
        safeLogger.error('Error queuing return event:', error);
        // Fallback: try to process immediately if queue fails?
        // Or just throw to let the caller handle it (e.g. return 500 to API)
        throw error;
    }
};
