/**
 * Preference Maintenance Service
 * Handles scheduled maintenance tasks for payment preferences
 */

import cron from 'node-cron';
import { safeLogger } from '../utils/safeLogger';
import { userPreferenceService } from './userPreferenceService';
import { preferenceLearningService } from './preferencelearningService';
import { db } from '../db/connection';
import { paymentMethodPreferences, users } from '../db/schema';
import { eq, lt, and } from 'drizzle-orm';

export class PreferenceMaintenanceService {
  private isRunning = false;
  private scheduledJobs: any[] = [];

  /**
   * Start all scheduled maintenance tasks
   */
  start(): void {
    if (this.isRunning) {
      safeLogger.info('Preference maintenance service is already running');
      return;
    }

    safeLogger.info('Starting preference maintenance service...');

    // Cleanup expired overrides every hour
    const cleanupJob = cron.schedule('0 * * * *', async () => {
      await this.cleanupExpiredOverrides();
    });

    // Update preference decay every 6 hours
    const decayJob = cron.schedule('0 */6 * * *', async () => {
      await this.applyPreferenceDecay();
    });

    // Retrain learning models daily at 2 AM
    const retrainJob = cron.schedule('0 2 * * *', async () => {
      await this.retrainLearningModels();
    });

    // Cleanup old usage history weekly
    const historyCleanupJob = cron.schedule('0 3 * * 0', async () => {
      await this.cleanupOldUsageHistory();
    });

    // Start all jobs
    cleanupJob.start();
    decayJob.start();
    retrainJob.start();
    historyCleanupJob.start();

    this.scheduledJobs = [cleanupJob, decayJob, retrainJob, historyCleanupJob];
    this.isRunning = true;

    safeLogger.info('Preference maintenance service started with 4 scheduled jobs');
  }

  /**
   * Stop all scheduled maintenance tasks
   */
  stop(): void {
    if (!this.isRunning) {
      safeLogger.info('Preference maintenance service is not running');
      return;
    }

    safeLogger.info('Stopping preference maintenance service...');

    this.scheduledJobs.forEach(job => {
      job.stop();
      job.destroy();
    });

    this.scheduledJobs = [];
    this.isRunning = false;

    safeLogger.info('Preference maintenance service stopped');
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    activeJobs: number;
    lastMaintenanceRun?: Date;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.scheduledJobs.length,
      lastMaintenanceRun: this.lastMaintenanceRun
    };
  }

  /**
   * Run all maintenance tasks manually
   */
  async runMaintenance(): Promise<{
    cleanupResults: number;
    decayResults: number;
    retrainResults: number;
    historyCleanupResults: number;
  }> {
    safeLogger.info('Running manual preference maintenance...');

    const [cleanupResults, decayResults, retrainResults, historyCleanupResults] = await Promise.all([
      this.cleanupExpiredOverrides(),
      this.applyPreferenceDecay(),
      this.retrainLearningModels(),
      this.cleanupOldUsageHistory()
    ]);

    this.lastMaintenanceRun = new Date();

    return {
      cleanupResults,
      decayResults,
      retrainResults,
      historyCleanupResults
    };
  }

  private lastMaintenanceRun?: Date;

  /**
   * Cleanup expired preference overrides
   */
  private async cleanupExpiredOverrides(): Promise<number> {
    try {
      safeLogger.info('Cleaning up expired preference overrides...');
      const deletedCount = await userPreferenceService.cleanupExpiredOverrides();
      safeLogger.info(`Cleaned up ${deletedCount} expired preference overrides`);
      return deletedCount;
    } catch (error) {
      safeLogger.error('Error cleaning up expired overrides:', error);
      return 0;
    }
  }

  /**
   * Apply preference decay to all users
   */
  private async applyPreferenceDecay(): Promise<number> {
    try {
      safeLogger.info('Applying preference decay...');
      
      // Get all users with preferences that haven't been updated recently
      const staleThreshold = new Date();
      staleThreshold.setHours(staleThreshold.getHours() - 24); // 24 hours ago

      const stalePreferences = await db
        .select({
          userId: paymentMethodPreferences.userId
        })
        .from(paymentMethodPreferences)
        .where(
          and(
            lt(paymentMethodPreferences.updatedAt, staleThreshold),
            eq(paymentMethodPreferences.learningEnabled, true)
          )
        );

      let processedCount = 0;
      const batchSize = 50;

      // Process in batches to avoid overwhelming the system
      for (let i = 0; i < stalePreferences.length; i += batchSize) {
        const batch = stalePreferences.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (pref) => {
            try {
              await preferenceLearningService.analyzeAndUpdatePreferences(pref.userId);
              processedCount++;
            } catch (error) {
              safeLogger.error(`Error applying decay for user ${pref.userId}:`, error);
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < stalePreferences.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      safeLogger.info(`Applied preference decay to ${processedCount} users`);
      return processedCount;
    } catch (error) {
      safeLogger.error('Error applying preference decay:', error);
      return 0;
    }
  }

  /**
   * Retrain learning models for active users
   */
  private async retrainLearningModels(): Promise<number> {
    try {
      safeLogger.info('Retraining learning models...');
      
      // Get users with recent activity (transactions in last 30 days)
      const activeThreshold = new Date();
      activeThreshold.setDate(activeThreshold.getDate() - 30);

      const activeUsers = await db
        .select({
          userId: paymentMethodPreferences.userId
        })
        .from(paymentMethodPreferences)
        .where(
          and(
            eq(paymentMethodPreferences.learningEnabled, true),
            lt(paymentMethodPreferences.lastPreferenceUpdate, activeThreshold)
          )
        )
        .limit(100); // Limit to prevent overload

      let retrainedCount = 0;
      const batchSize = 10;

      // Process in smaller batches for retraining (more intensive operation)
      for (let i = 0; i < activeUsers.length; i += batchSize) {
        const batch = activeUsers.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (user) => {
            try {
              await preferenceLearningService.analyzeAndUpdatePreferences(user.userId);
              retrainedCount++;
            } catch (error) {
              safeLogger.error(`Error retraining model for user ${user.userId}:`, error);
            }
          })
        );

        // Longer delay between batches for retraining
        if (i + batchSize < activeUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      safeLogger.info(`Retrained learning models for ${retrainedCount} users`);
      return retrainedCount;
    } catch (error) {
      safeLogger.error('Error retraining learning models:', error);
      return 0;
    }
  }

  /**
   * Cleanup old usage history (older than 1 year)
   */
  private async cleanupOldUsageHistory(): Promise<number> {
    try {
      safeLogger.info('Cleaning up old usage history...');
      
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); // 1 year ago

      const result = await db
        .delete(paymentMethodPreferences)
        .where(lt(paymentMethodPreferences.createdAt, cutoffDate));

      const deletedCount = result.rowCount || 0;
      safeLogger.info(`Cleaned up ${deletedCount} old usage history records`);
      return deletedCount;
    } catch (error) {
      safeLogger.error('Error cleaning up old usage history:', error);
      return 0;
    }
  }

  /**
   * Get maintenance statistics
   */
  async getMaintenanceStats(): Promise<{
    totalUsers: number;
    usersWithPreferences: number;
    usersWithLearningEnabled: number;
    totalUsageRecords: number;
    activeOverrides: number;
    lastCleanup?: Date;
  }> {
    try {
      const [
        totalUsersResult,
        usersWithPreferencesResult,
        learningEnabledResult,
        // Add more queries as needed
      ] = await Promise.all([
        db.select().from(users),
        db.select().from(paymentMethodPreferences),
        db.select().from(paymentMethodPreferences).where(eq(paymentMethodPreferences.learningEnabled, true)),
      ]);

      return {
        totalUsers: totalUsersResult.length,
        usersWithPreferences: usersWithPreferencesResult.length,
        usersWithLearningEnabled: learningEnabledResult.length,
        totalUsageRecords: 0, // Would need to query usage history table
        activeOverrides: 0, // Would need to query overrides table
        lastCleanup: this.lastMaintenanceRun
      };
    } catch (error) {
      safeLogger.error('Error getting maintenance stats:', error);
      return {
        totalUsers: 0,
        usersWithPreferences: 0,
        usersWithLearningEnabled: 0,
        totalUsageRecords: 0,
        activeOverrides: 0
      };
    }
  }

  /**
   * Force preference recalculation for a specific user
   */
  async forceUserPreferenceUpdate(userId: string): Promise<boolean> {
    try {
      safeLogger.info(`Forcing preference update for user: ${userId}`);
      await preferenceLearningService.analyzeAndUpdatePreferences(userId);
      safeLogger.info(`Successfully updated preferences for user: ${userId}`);
      return true;
    } catch (error) {
      safeLogger.error(`Error forcing preference update for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Disable learning for a specific user
   */
  async disableLearningForUser(userId: string): Promise<boolean> {
    try {
      await db
        .update(paymentMethodPreferences)
        .set({ learningEnabled: false })
        .where(eq(paymentMethodPreferences.userId, userId));
      
      safeLogger.info(`Disabled learning for user: ${userId}`);
      return true;
    } catch (error) {
      safeLogger.error(`Error disabling learning for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Enable learning for a specific user
   */
  async enableLearningForUser(userId: string): Promise<boolean> {
    try {
      await db
        .update(paymentMethodPreferences)
        .set({ learningEnabled: true })
        .where(eq(paymentMethodPreferences.userId, userId));
      
      safeLogger.info(`Enabled learning for user: ${userId}`);
      return true;
    } catch (error) {
      safeLogger.error(`Error enabling learning for user ${userId}:`, error);
      return false;
    }
  }
}

export const preferenceMaintenanceService = new PreferenceMaintenanceService();
