import { Queue, Worker, Job } from 'bullmq';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from '../services/redisService';
import { returnAnalyticsService } from '../services/marketplace/returnAnalyticsService';
import { db } from '../db/index';
import {
  returnEvents,
  returnAnalyticsHourly,
  returnAnalyticsDaily,
  returnAnalyticsWeekly,
  returnAnalyticsMonthly,
  returns,
  refundTransactions
} from '../db/schema';
import { sql, and, gte, lte, eq, count, avg, sum, max, min } from 'drizzle-orm';

const QUEUE_NAME = 'return-aggregation';

// Define job types
type JobType = 'aggregate_hourly' | 'aggregate_daily' | 'aggregate_weekly' | 'aggregate_monthly' | 'warm_cache';

interface AggregationJobData {
    type: JobType;
    sellerId?: string; // For cache warming
    period?: {
        start: string;
        end: string;
    };
    forceRecalculate?: boolean;
}

// Create the queue
export const returnAggregationQueue = new Queue<AggregationJobData>(QUEUE_NAME, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0')
    },
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
        const { type, sellerId, period, forceRecalculate } = job.data;
        const jobId = job.id;

        safeLogger.info(`Processing aggregation job ${jobId}: ${type}`);

        try {
            switch (type) {
                case 'aggregate_hourly':
                    await aggregateHourlyMetrics(forceRecalculate);
                    break;
                case 'aggregate_daily':
                    await aggregateDailyMetrics(forceRecalculate);
                    break;
                case 'aggregate_weekly':
                    await aggregateWeeklyMetrics(forceRecalculate);
                    break;
                case 'aggregate_monthly':
                    await aggregateMonthlyMetrics(forceRecalculate);
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
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        },
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

// ============================================================================
// HOURLY AGGREGATION
// ============================================================================

async function aggregateHourlyMetrics(forceRecalculate = false): Promise<void> {
    safeLogger.info('Running hourly aggregation');

    try {
        const now = new Date();
        const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
        const previousHour = new Date(currentHour.getTime() - 60 * 60 * 1000);

        // Get returns created in the previous hour
        const hourlyReturns = await db
            .select()
            .from(returns)
            .where(
                and(
                    gte(returns.createdAt, previousHour),
                    lte(returns.createdAt, currentHour)
                )
            );

        // Get refund transactions for the previous hour
        const hourlyRefunds = await db
            .select()
            .from(refundTransactions)
            .where(
                and(
                    gte(refundTransactions.createdAt, previousHour),
                    lte(refundTransactions.createdAt, currentHour)
                )
            );

        // Calculate metrics
        const metrics = calculateAggregatedMetrics(hourlyReturns, hourlyRefunds);

        // Upsert hourly analytics
        await db
            .insert(returnAnalyticsHourly)
            .values({
                hourTimestamp: previousHour,
                ...metrics,
                calculatedAt: now,
            })
            .onConflictDoUpdate({
                target: returnAnalyticsHourly.hourTimestamp,
                set: {
                    ...metrics,
                    calculatedAt: now,
                },
            });

        safeLogger.info(`Hourly aggregation completed for ${previousHour.toISOString()}`);
    } catch (error) {
        safeLogger.error('Error in hourly aggregation:', error);
        throw error;
    }
}

// ============================================================================
// DAILY AGGREGATION
// ============================================================================

async function aggregateDailyMetrics(forceRecalculate = false): Promise<void> {
    safeLogger.info('Running daily aggregation');

    try {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        // Get returns for yesterday
        const dailyReturns = await db
            .select()
            .from(returns)
            .where(
                and(
                    gte(returns.createdAt, yesterday),
                    lte(returns.createdAt, endOfYesterday)
                )
            );

        // Get refund transactions for yesterday
        const dailyRefunds = await db
            .select()
            .from(refundTransactions)
            .where(
                and(
                    gte(refundTransactions.createdAt, yesterday),
                    lte(refundTransactions.createdAt, endOfYesterday)
                )
            );

        // Calculate metrics
        const metrics = calculateAggregatedMetrics(dailyReturns, dailyRefunds);

        // Format date as string for the date column
        const dateStr = yesterday.toISOString().split('T')[0];

        // Upsert daily analytics
        await db
            .insert(returnAnalyticsDaily)
            .values({
                date: dateStr,
                ...metrics,
                calculatedAt: now,
            })
            .onConflictDoUpdate({
                target: returnAnalyticsDaily.date,
                set: {
                    ...metrics,
                    calculatedAt: now,
                },
            });

        safeLogger.info(`Daily aggregation completed for ${dateStr}`);
    } catch (error) {
        safeLogger.error('Error in daily aggregation:', error);
        throw error;
    }
}

// ============================================================================
// WEEKLY AGGREGATION
// ============================================================================

async function aggregateWeeklyMetrics(forceRecalculate = false): Promise<void> {
    safeLogger.info('Running weekly aggregation');

    try {
        const now = new Date();

        // Get the previous week's Monday (week starts on Monday)
        const currentDayOfWeek = now.getDay();
        const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - daysSinceMonday);
        thisMonday.setHours(0, 0, 0, 0);

        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(lastMonday.getDate() - 7);

        const lastSunday = new Date(thisMonday);
        lastSunday.setDate(lastSunday.getDate() - 1);
        lastSunday.setHours(23, 59, 59, 999);

        // Get ISO week number
        const weekNumber = getISOWeek(lastMonday);
        const year = lastMonday.getFullYear();

        // Get returns for the previous week
        const weeklyReturns = await db
            .select()
            .from(returns)
            .where(
                and(
                    gte(returns.createdAt, lastMonday),
                    lte(returns.createdAt, lastSunday)
                )
            );

        // Get refund transactions for the previous week
        const weeklyRefunds = await db
            .select()
            .from(refundTransactions)
            .where(
                and(
                    gte(refundTransactions.createdAt, lastMonday),
                    lte(refundTransactions.createdAt, lastSunday)
                )
            );

        // Calculate metrics
        const metrics = calculateAggregatedMetrics(weeklyReturns, weeklyRefunds);

        // Calculate week-over-week changes
        const previousWeekMetrics = await getPreviousWeekMetrics(lastMonday);
        const wowChanges = calculatePeriodChanges(metrics, previousWeekMetrics);

        const weekStartStr = lastMonday.toISOString().split('T')[0];
        const weekEndStr = lastSunday.toISOString().split('T')[0];

        // Upsert weekly analytics
        await db
            .insert(returnAnalyticsWeekly)
            .values({
                weekStart: weekStartStr,
                weekEnd: weekEndStr,
                weekNumber,
                year,
                ...metrics,
                returnRateChange: wowChanges.returnRateChange?.toString(),
                volumeChange: wowChanges.volumeChange?.toString(),
                refundAmountChange: wowChanges.refundAmountChange?.toString(),
                calculatedAt: now,
            })
            .onConflictDoNothing(); // Avoid conflicts if already calculated

        safeLogger.info(`Weekly aggregation completed for week ${weekNumber} of ${year}`);
    } catch (error) {
        safeLogger.error('Error in weekly aggregation:', error);
        throw error;
    }
}

// ============================================================================
// MONTHLY AGGREGATION
// ============================================================================

async function aggregateMonthlyMetrics(forceRecalculate = false): Promise<void> {
    safeLogger.info('Running monthly aggregation');

    try {
        const now = new Date();

        // Get the previous month
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
        const monthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0, 23, 59, 59, 999);

        const month = previousMonth.getMonth() + 1; // 1-12
        const year = previousMonth.getFullYear();

        // Get returns for the previous month
        const monthlyReturns = await db
            .select()
            .from(returns)
            .where(
                and(
                    gte(returns.createdAt, monthStart),
                    lte(returns.createdAt, monthEnd)
                )
            );

        // Get refund transactions for the previous month
        const monthlyRefunds = await db
            .select()
            .from(refundTransactions)
            .where(
                and(
                    gte(refundTransactions.createdAt, monthStart),
                    lte(refundTransactions.createdAt, monthEnd)
                )
            );

        // Calculate metrics
        const metrics = calculateAggregatedMetrics(monthlyReturns, monthlyRefunds);

        // Calculate month-over-month changes
        const previousMonthMetrics = await getPreviousMonthMetrics(monthStart);
        const momChanges = calculatePeriodChanges(metrics, previousMonthMetrics);

        // Calculate year-over-year changes
        const lastYearSameMonthMetrics = await getSameMonthLastYearMetrics(month, year);
        const yoyChanges = calculatePeriodChanges(metrics, lastYearSameMonthMetrics);

        // Determine if this is a seasonal peak (e.g., holiday season)
        const isSeasonalPeak = month === 12 || month === 1 || month === 11; // Nov, Dec, Jan

        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];

        // Upsert monthly analytics
        await db
            .insert(returnAnalyticsMonthly)
            .values({
                month,
                year,
                monthStart: monthStartStr,
                monthEnd: monthEndStr,
                ...metrics,
                returnRateChange: momChanges.returnRateChange?.toString(),
                volumeChange: momChanges.volumeChange?.toString(),
                refundAmountChange: momChanges.refundAmountChange?.toString(),
                yoyReturnRateChange: yoyChanges.returnRateChange?.toString(),
                yoyVolumeChange: yoyChanges.volumeChange?.toString(),
                yoyRefundAmountChange: yoyChanges.refundAmountChange?.toString(),
                isSeasonalPeak,
                calculatedAt: now,
            })
            .onConflictDoNothing(); // Avoid conflicts if already calculated

        safeLogger.info(`Monthly aggregation completed for ${month}/${year}`);
    } catch (error) {
        safeLogger.error('Error in monthly aggregation:', error);
        throw error;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface AggregatedMetrics {
    totalReturns: number;
    newReturns: number;
    approvedReturns: number;
    rejectedReturns: number;
    completedReturns: number;
    cancelledReturns: number;
    statusRequested: number;
    statusApproved: number;
    statusRejected: number;
    statusInTransit: number;
    statusReceived: number;
    statusInspected: number;
    statusRefundProcessing: number;
    statusCompleted: number;
    totalRefundAmount: string;
    avgRefundAmount: string;
    maxRefundAmount: string;
    minRefundAmount: string;
    totalRestockingFees: string;
    totalShippingCosts: string;
    reasonDefective: number;
    reasonWrongItem: number;
    reasonNotAsDescribed: number;
    reasonDamagedShipping: number;
    reasonChangedMind: number;
    reasonBetterPrice: number;
    reasonNoLongerNeeded: number;
    reasonOther: number;
    highRiskReturns: number;
    mediumRiskReturns: number;
    lowRiskReturns: number;
    flaggedForReview: number;
    fraudDetected: number;
}

function calculateAggregatedMetrics(returns: any[], refunds: any[]): AggregatedMetrics {
    const statusCounts: Record<string, number> = {};
    const reasonCounts: Record<string, number> = {};
    const riskCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };

    returns.forEach(ret => {
        // Count by status
        const status = ret.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // Count by reason
        const reason = ret.returnReason || 'other';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;

        // Count by risk level
        const riskLevel = ret.riskLevel || 'low';
        riskCounts[riskLevel] = (riskCounts[riskLevel] || 0) + 1;
    });

    // Calculate refund amounts
    const completedRefunds = refunds.filter(r => r.status === 'completed');
    const amounts = completedRefunds.map(r => Number(r.amount) || 0);
    const totalRefundAmount = amounts.reduce((sum, amt) => sum + amt, 0);
    const avgRefundAmount = amounts.length > 0 ? totalRefundAmount / amounts.length : 0;
    const maxRefundAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
    const minRefundAmount = amounts.length > 0 ? Math.min(...amounts) : 0;

    // Calculate restocking fees and shipping costs
    const totalRestockingFees = returns.reduce((sum, r) => sum + (Number(r.restockingFee) || 0), 0);
    const totalShippingCosts = returns.reduce((sum, r) => sum + (Number(r.returnShippingCost) || 0), 0);

    return {
        totalReturns: returns.length,
        newReturns: statusCounts['requested'] || 0,
        approvedReturns: statusCounts['approved'] || 0,
        rejectedReturns: statusCounts['rejected'] || 0,
        completedReturns: statusCounts['completed'] || 0,
        cancelledReturns: statusCounts['cancelled'] || 0,
        statusRequested: statusCounts['requested'] || 0,
        statusApproved: statusCounts['approved'] || 0,
        statusRejected: statusCounts['rejected'] || 0,
        statusInTransit: statusCounts['in_transit'] || 0,
        statusReceived: statusCounts['received'] || 0,
        statusInspected: statusCounts['inspected'] || 0,
        statusRefundProcessing: statusCounts['refund_processing'] || 0,
        statusCompleted: statusCounts['completed'] || 0,
        totalRefundAmount: totalRefundAmount.toFixed(8),
        avgRefundAmount: avgRefundAmount.toFixed(8),
        maxRefundAmount: maxRefundAmount.toFixed(8),
        minRefundAmount: minRefundAmount.toFixed(8),
        totalRestockingFees: totalRestockingFees.toFixed(8),
        totalShippingCosts: totalShippingCosts.toFixed(8),
        reasonDefective: reasonCounts['defective'] || 0,
        reasonWrongItem: reasonCounts['wrong_item'] || 0,
        reasonNotAsDescribed: reasonCounts['not_as_described'] || 0,
        reasonDamagedShipping: reasonCounts['damaged_shipping'] || 0,
        reasonChangedMind: reasonCounts['changed_mind'] || 0,
        reasonBetterPrice: reasonCounts['better_price'] || 0,
        reasonNoLongerNeeded: reasonCounts['no_longer_needed'] || 0,
        reasonOther: reasonCounts['other'] || 0,
        highRiskReturns: riskCounts['high'] || 0,
        mediumRiskReturns: riskCounts['medium'] || 0,
        lowRiskReturns: riskCounts['low'] || 0,
        flaggedForReview: returns.filter(r => r.requiresManualReview).length,
        fraudDetected: returns.filter(r => r.fraudDetected).length,
    };
}

function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

async function getPreviousWeekMetrics(currentWeekStart: Date): Promise<AggregatedMetrics | null> {
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const previousWeekEnd = new Date(previousWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() + 6);
    previousWeekEnd.setHours(23, 59, 59, 999);

    const weeklyReturns = await db
        .select()
        .from(returns)
        .where(
            and(
                gte(returns.createdAt, previousWeekStart),
                lte(returns.createdAt, previousWeekEnd)
            )
        );

    const weeklyRefunds = await db
        .select()
        .from(refundTransactions)
        .where(
            and(
                gte(refundTransactions.createdAt, previousWeekStart),
                lte(refundTransactions.createdAt, previousWeekEnd)
            )
        );

    if (weeklyReturns.length === 0) {
        return null;
    }

    return calculateAggregatedMetrics(weeklyReturns, weeklyRefunds);
}

async function getPreviousMonthMetrics(currentMonthStart: Date): Promise<AggregatedMetrics | null> {
    const previousMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - 1, 1);
    const previousMonthEnd = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth(), 0, 23, 59, 59, 999);

    const monthlyReturns = await db
        .select()
        .from(returns)
        .where(
            and(
                gte(returns.createdAt, previousMonthStart),
                lte(returns.createdAt, previousMonthEnd)
            )
        );

    const monthlyRefunds = await db
        .select()
        .from(refundTransactions)
        .where(
            and(
                gte(refundTransactions.createdAt, previousMonthStart),
                lte(refundTransactions.createdAt, previousMonthEnd)
            )
        );

    if (monthlyReturns.length === 0) {
        return null;
    }

    return calculateAggregatedMetrics(monthlyReturns, monthlyRefunds);
}

async function getSameMonthLastYearMetrics(month: number, year: number): Promise<AggregatedMetrics | null> {
    const lastYearMonthStart = new Date(year - 1, month - 1, 1);
    const lastYearMonthEnd = new Date(year - 1, month, 0, 23, 59, 59, 999);

    const monthlyReturns = await db
        .select()
        .from(returns)
        .where(
            and(
                gte(returns.createdAt, lastYearMonthStart),
                lte(returns.createdAt, lastYearMonthEnd)
            )
        );

    const monthlyRefunds = await db
        .select()
        .from(refundTransactions)
        .where(
            and(
                gte(refundTransactions.createdAt, lastYearMonthStart),
                lte(refundTransactions.createdAt, lastYearMonthEnd)
            )
        );

    if (monthlyReturns.length === 0) {
        return null;
    }

    return calculateAggregatedMetrics(monthlyReturns, monthlyRefunds);
}

function calculatePeriodChanges(
    current: AggregatedMetrics,
    previous: AggregatedMetrics | null
): { returnRateChange: number | null; volumeChange: number | null; refundAmountChange: number | null } {
    if (!previous) {
        return { returnRateChange: null, volumeChange: null, refundAmountChange: null };
    }

    const volumeChange = previous.totalReturns > 0
        ? ((current.totalReturns - previous.totalReturns) / previous.totalReturns) * 100
        : null;

    const currentRefund = Number(current.totalRefundAmount);
    const previousRefund = Number(previous.totalRefundAmount);
    const refundAmountChange = previousRefund > 0
        ? ((currentRefund - previousRefund) / previousRefund) * 100
        : null;

    // Return rate change would need total orders data
    // For now, we'll use volume change as a proxy
    const returnRateChange = volumeChange;

    return { returnRateChange, volumeChange, refundAmountChange };
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

        // Schedule weekly aggregation (every Monday at 02:00 UTC)
        await returnAggregationQueue.add(
            'aggregate_weekly',
            { type: 'aggregate_weekly' },
            {
                repeat: {
                    pattern: '0 2 * * 1', // At 02:00 on Monday
                },
            }
        );

        // Schedule monthly aggregation (1st of every month at 03:00 UTC)
        await returnAggregationQueue.add(
            'aggregate_monthly',
            { type: 'aggregate_monthly' },
            {
                repeat: {
                    pattern: '0 3 1 * *', // At 03:00 on the 1st of every month
                },
            }
        );

        safeLogger.info('Scheduled return aggregation jobs (hourly, daily, weekly, monthly)');
    } catch (error) {
        safeLogger.error('Error scheduling aggregation jobs:', error);
    }
};

/**
 * Manually trigger an aggregation job
 */
export const triggerAggregation = async (type: JobType, options?: { forceRecalculate?: boolean }) => {
    try {
        await returnAggregationQueue.add(
            `manual_${type}`,
            { type, forceRecalculate: options?.forceRecalculate },
            { priority: 1 } // Higher priority for manual triggers
        );
        safeLogger.info(`Manually triggered ${type} aggregation`);
    } catch (error) {
        safeLogger.error(`Error triggering ${type} aggregation:`, error);
        throw error;
    }
};
