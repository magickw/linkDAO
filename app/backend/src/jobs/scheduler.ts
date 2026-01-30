/**
 * Job Scheduler
 * Manages scheduled jobs for the application
 */

import { safeLogger } from '../utils/safeLogger';
import { sessionCleanupJob } from './sessionCleanupJob';

class JobScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start a scheduled job
   */
  scheduleJob(name: string, intervalMs: number, job: () => Promise<void>): void {
    if (this.intervals.has(name)) {
      safeLogger.warn(`Job ${name} is already scheduled`);
      return;
    }

    // Run immediately on start
    job().catch(error => {
      safeLogger.error(`Error running job ${name}:`, error);
    });

    // Schedule recurring execution
    const interval = setInterval(() => {
      job().catch(error => {
        safeLogger.error(`Error running job ${name}:`, error);
      });
    }, intervalMs);

    this.intervals.set(name, interval);
    safeLogger.info(`Scheduled job: ${name} (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop a scheduled job
   */
  stopJob(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      safeLogger.info(`Stopped job: ${name}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      safeLogger.info(`Stopped job: ${name}`);
    });
    this.intervals.clear();
  }

  /**
   * Initialize all scheduled jobs
   */
  initialize(): void {
    safeLogger.info('Initializing job scheduler...');

    // Session cleanup - Run every hour (3600000ms)
    this.scheduleJob('sessionCleanup', 60 * 60 * 1000, async () => {
      await sessionCleanupJob.runAll();
    });

    safeLogger.info('Job scheduler initialized');
  }
}

export const jobScheduler = new JobScheduler();