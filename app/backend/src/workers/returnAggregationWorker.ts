import { Queue, Worker, Job } from 'bullmq';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from '../services/redisService';
import { returnAnalyticsService } from '../services/returnAnalyticsService';
import { db } from '../db/index';
import { returnEvents, returnAnalyticsHourly, returnAnalyticsDaily } from '../db/schema';
import { sql, and, gte, lte } from 'drizzle-orm';

const QUEUE_NAME = 'return-aggregation';

// Define job types
type JobType = 'aggregate_hourly' | 'aggregate_daily' | 'warm_cache';

interface AggregationJobData {
    type: JobType;
    sellerId?: string; // For cache warming
    period?: {
        start: string;
        end: string;
    };
}

// Create the queue
export const returnAggregationQueue = new Queue<AggregationJobData>(QUEUE_NAME, {
    connection: redisService.getClient(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
    },
});

// Create the worker
export const returnAggregationWorker = new Worker<AggregationJobData>(
    QUEUE_NAME,
    async (job: Job<AggregationJobData>) => {
        const { type, sellerId, period } = job.data;
        const jobId = job.id;

        safeLogger.info(`Processing aggregation job ${jobId}: ${type}`);

        try {
            switch (type) {
                case 'aggregate_hourly':
                    await aggregateHourlyMetrics();
                    break;
                case 'aggregate_daily':
                    await aggregateDailyMetrics();
                    break;
                case 'warm_cache':
                    if (sellerId) {
                        await returnAnalyticsService.warmCache(sellerId);
                    }
                    break;
                default:
                    safeLogger.warn(`Unknown aggregation job type: ${type}`);
            }

            safeLogger.info(`Successfully processed aggregation job ${jobId}`);
        } catch (error) {
            safeLogger.error(`Failed to process aggregation job ${jobId}:`, error);
            throw error;
        }
    },
    {
        connection: redisService.getClient(),
        concurrency: 1, // Run aggregations sequentially to avoid race conditions
    }
);

// Worker event listeners
returnAggregationWorker.on('completed', (job) => {
    safeLogger.debug(`Aggregation job ${job.id} completed`);
});

returnAggregationWorker.on('failed', (job, err) => {
    safeLogger.error(`Aggregation job ${job?.id} failed:`, err);
});

// Implementation of aggregation logic

async function aggregateHourlyMetrics() {
    // Logic to aggregate data from returnEvents to returnAnalyticsHourly
    // This is a simplified placeholder. In a real implementation, we would:
    // 1. Find the last aggregated hour
    // 2. Query events since then
    // 3. Group by hour and seller
    // 4. Insert/Update returnAnalyticsHourly

    safeLogger.info('Running hourly aggregation (placeholder)');

    // Example SQL for aggregation (conceptual)
    /*
    await db.execute(sql`
      INSERT INTO return_analytics_hourly (seller_id, hour, metrics)
      SELECT 
        seller_id,
        DATE_TRUNC('hour', timestamp) as hour,
        json_build_object('count', count(*))
      FROM return_events
      WHERE timestamp > (SELECT COALESCE(MAX(hour), '2024-01-01') FROM return_analytics_hourly)
      GROUP BY 1, 2
      ON CONFLICT (seller_id, hour) DO UPDATE SET metrics = EXCLUDED.metrics
    `);
    */
}

async function aggregateDailyMetrics() {
    // Logic to aggregate from returnAnalyticsHourly to returnAnalyticsDaily
    safeLogger.info('Running daily aggregation (placeholder)');
}

/**
 * Schedule recurring aggregation jobs
 */
export const scheduleAggregationJobs = async () => {
    try {
        // Remove existing repeatable jobs to avoid duplicates on restart
        const repeatableJobs = await returnAggregationQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await returnAggregationQueue.removeRepeatableByKey(job.key);
        }

        // Schedule hourly aggregation (every hour at minute 5)
        await returnAggregationQueue.add(
            'aggregate_hourly',
            { type: 'aggregate_hourly' },
            {
                repeat: {
                    pattern: '5 * * * *', // At minute 5 past every hour
                },
            }
        );

        // Schedule daily aggregation (every day at 01:00 UTC)
        await returnAggregationQueue.add(
            'aggregate_daily',
            { type: 'aggregate_daily' },
            {
                repeat: {
                    pattern: '0 1 * * *', // At 01:00
                },
            }
        );

        safeLogger.info('Scheduled return aggregation jobs');
    } catch (error) {
        safeLogger.error('Error scheduling aggregation jobs:', error);
    }
};
