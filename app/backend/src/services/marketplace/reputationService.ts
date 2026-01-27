import { db } from '../../db';
import { userReputation, reputationHistoryMarketplace, reputationCalculationRules } from '../../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { redisService } from './redisService';

export interface ReputationData {
  walletAddress: string;
  score: number;
  totalTransactions: number;
  positiveReviews: number;
  negativeReviews: number;
  neutralReviews: number;
  successfulSales: number;
  successfulPurchases: number;
  disputedTransactions: number;
  resolvedDisputes: number;
  averageResponseTime: number;
  completionRate: number;
  lastUpdated: Date;
}

export interface ReputationTransaction {
  eventType: string;
  transactionId?: string;
  reviewId?: string;
  metadata?: any;
}

export interface ReputationHistoryEntry {
  id: string;
  eventType: string;
  scoreChange: number;
  previousScore: number;
  newScore: number;
  description?: string;
  createdAt: Date;
}

class ReputationService {
  private readonly CACHE_TTL = 10 * 60; // 10 minutes (in seconds for Redis)
  private readonly REPUTATION_CACHE_PREFIX = 'reputation:user:';

  /**
   * Get reputation data for a wallet address with caching
   * Optimized with better error handling and reduced database queries
   */
  async getReputation(walletAddress: string): Promise<ReputationData> {
    try {
      // Check Redis cache first
      const cacheKey = `${this.REPUTATION_CACHE_PREFIX}${walletAddress}`;
      const cached = await redisService.get(cacheKey);
      if (cached) {
        logger.debug(`Returning cached reputation for ${walletAddress} from Redis`);
        return cached;
      }

      // Query database with optimized selection
      const [reputation] = await db
        .select({
          walletAddress: userReputation.walletAddress,
          reputationScore: userReputation.reputationScore,
          totalTransactions: userReputation.totalTransactions,
          positiveReviews: userReputation.positiveReviews,
          negativeReviews: userReputation.negativeReviews,
          neutralReviews: userReputation.neutralReviews,
          successfulSales: userReputation.successfulSales,
          successfulPurchases: userReputation.successfulPurchases,
          disputedTransactions: userReputation.disputedTransactions,
          resolvedDisputes: userReputation.resolvedDisputes,
          averageResponseTime: userReputation.averageResponseTime,
          completionRate: userReputation.completionRate,
          updatedAt: userReputation.updatedAt
        })
        .from(userReputation)
        .where(eq(userReputation.walletAddress, walletAddress))
        .limit(1);

      let reputationData: ReputationData;

      if (reputation) {
        reputationData = {
          walletAddress: reputation.walletAddress,
          score: parseFloat(reputation.reputationScore || '0'),
          totalTransactions: reputation.totalTransactions || 0,
          positiveReviews: reputation.positiveReviews || 0,
          negativeReviews: reputation.negativeReviews || 0,
          neutralReviews: reputation.neutralReviews || 0,
          successfulSales: reputation.successfulSales || 0,
          successfulPurchases: reputation.successfulPurchases || 0,
          disputedTransactions: reputation.disputedTransactions || 0,
          resolvedDisputes: reputation.resolvedDisputes || 0,
          averageResponseTime: parseFloat(reputation.averageResponseTime || '0'),
          completionRate: parseFloat(reputation.completionRate || '100'),
          lastUpdated: reputation.updatedAt || new Date(),
        };
      } else {
        // Return default values for new users
        reputationData = this.getDefaultReputationData(walletAddress);
        
        // Create initial reputation record asynchronously to avoid blocking
        setImmediate(() => {
          this.createInitialReputation(walletAddress).catch(err => {
            logger.warn(`Failed to create initial reputation record for ${walletAddress} in background: ${err.message}`);
          });
        });
      }

      // Cache the result in Redis
      await redisService.set(cacheKey, reputationData, this.CACHE_TTL);

      logger.info(`Retrieved reputation for ${walletAddress}: score ${reputationData.score}`);
      return reputationData;

    } catch (error) {
      logger.error(`Error getting reputation for ${walletAddress}:`, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        },
        walletAddress
      });
      
      // Return default values as fallback
      const defaultData = this.getDefaultReputationData(walletAddress);
      logger.info(`Returning default reputation data for ${walletAddress}`);
      return defaultData;
    }
  }

  /**
   * Update reputation based on a transaction/event
   */
  async updateReputation(
    walletAddress: string, 
    transaction: ReputationTransaction
  ): Promise<void> {
    try {
      logger.info(`Updating reputation for ${walletAddress}, event: ${transaction.eventType}`);

      // Call the database function to update reputation
      await db.execute(sql`
        SELECT update_reputation_score(
          ${walletAddress},
          ${transaction.eventType},
          ${transaction.transactionId || null},
          ${transaction.reviewId || null},
          ${transaction.metadata ? JSON.stringify(transaction.metadata) : null}::jsonb
        )
      `);

      // Invalidate cache
      const cacheKey = `${this.REPUTATION_CACHE_PREFIX}${walletAddress}`;
      await redisService.del(cacheKey);

      logger.info(`Successfully updated reputation for ${walletAddress}`);

    } catch (error) {
      logger.error(`Error updating reputation for ${walletAddress}:`, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        },
        walletAddress,
        transaction
      });
      
      // Provide more detailed error message
      const errorMessage = `Failed to update reputation for ${walletAddress}: ${error.message}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Calculate comprehensive reputation score
   */
  async calculateReputation(walletAddress: string): Promise<number> {
    try {
      logger.info(`Calculating comprehensive reputation for ${walletAddress}`);

      // Call the database function to recalculate metrics
      await db.execute(sql`
        SELECT calculate_reputation_metrics(${walletAddress})
      `);

      // Invalidate cache to force fresh data on next request
      const cacheKey = `${this.REPUTATION_CACHE_PREFIX}${walletAddress}`;
      await redisService.del(cacheKey);

      // Get updated reputation
      const updatedReputation = await this.getReputation(walletAddress);
      
      logger.info(`Calculated reputation for ${walletAddress}: ${updatedReputation.score}`);
      return updatedReputation.score;

    } catch (error) {
      logger.error(`Error calculating reputation for ${walletAddress}:`, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        },
        walletAddress
      });
      
      // Provide more detailed error message with fallback option
      const errorMessage = `Failed to calculate reputation for ${walletAddress}: ${error.message}`;
      logger.warn(`Reputation calculation failed, will return current cached value if available`);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get reputation history for a wallet address
   * Optimized with better query structure and reduced processing
   */
  async getReputationHistory(
    walletAddress: string, 
    limit: number = 50
  ): Promise<ReputationHistoryEntry[]> {
    try {
      // Limit the maximum number of history entries to prevent excessive data transfer
      const effectiveLimit = Math.min(limit, 100);
      
      const history = await db
        .select({
          id: reputationHistoryMarketplace.id,
          eventType: reputationHistoryMarketplace.eventType,
          scoreChange: reputationHistoryMarketplace.scoreChange,
          previousScore: reputationHistoryMarketplace.previousScore,
          newScore: reputationHistoryMarketplace.newScore,
          description: reputationHistoryMarketplace.description,
          createdAt: reputationHistoryMarketplace.createdAt,
        })
        .from(reputationHistoryMarketplace)
        .where(eq(reputationHistoryMarketplace.walletAddress, walletAddress))
        .orderBy(desc(reputationHistoryMarketplace.createdAt))
        .limit(effectiveLimit);

      // Process entries with optimized conversion
      return history.map(entry => ({
        id: entry.id,
        eventType: entry.eventType,
        scoreChange: parseFloat(entry.scoreChange || '0'),
        previousScore: parseFloat(entry.previousScore || '0'),
        newScore: parseFloat(entry.newScore || '0'),
        description: entry.description || undefined,
        createdAt: entry.createdAt,
      }));

    } catch (error) {
      logger.error(`Error getting reputation history for ${walletAddress}:`, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        },
        walletAddress,
        limit
      });
      
      // Log warning and return empty array as fallback
      logger.warn(`Returning empty reputation history for ${walletAddress} due to error`);
      return [];
    }
  }

  /**
   * Get reputation statistics for multiple users
   * Optimized with batch processing and reduced redundant operations
   */
  async getBulkReputation(walletAddresses: string[]): Promise<Map<string, ReputationData>> {
    const results = new Map<string, ReputationData>();

    try {
      // Limit the number of addresses to prevent excessive database load
      const limitedAddresses = walletAddresses.slice(0, 100); // Max 100 addresses per request
      
      if (limitedAddresses.length === 0) {
        return results;
      }

      // Batch query for all reputations
      const reputations = await db
        .select()
        .from(userReputation)
        .where(sql`${userReputation.walletAddress} = ANY(${limitedAddresses})`);

      // Create a set of found addresses for efficient lookup
      const foundAddresses = new Set(reputations.map(r => r.walletAddress));

      // Process found reputations
      for (const reputation of reputations) {
        const reputationData: ReputationData = {
          walletAddress: reputation.walletAddress,
          score: parseFloat(reputation.reputationScore || '0'),
          totalTransactions: reputation.totalTransactions || 0,
          positiveReviews: reputation.positiveReviews || 0,
          negativeReviews: reputation.negativeReviews || 0,
          neutralReviews: reputation.neutralReviews || 0,
          successfulSales: reputation.successfulSales || 0,
          successfulPurchases: reputation.successfulPurchases || 0,
          disputedTransactions: reputation.disputedTransactions || 0,
          resolvedDisputes: reputation.resolvedDisputes || 0,
          averageResponseTime: parseFloat(reputation.averageResponseTime || '0'),
          completionRate: parseFloat(reputation.completionRate || '100'),
          lastUpdated: reputation.updatedAt || new Date(),
        };

        results.set(reputation.walletAddress, reputationData);
      }

      // Add default values for missing addresses
      for (const address of limitedAddresses) {
        if (!foundAddresses.has(address)) {
          results.set(address, this.getDefaultReputationData(address));
        }
      }

    } catch (error) {
      logger.error('Error getting bulk reputation:', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        },
        walletAddresses: walletAddresses.slice(0, 100)
      });
      
      // Return default values for all addresses
      logger.warn(`Returning default reputation data for all ${Math.min(walletAddresses.length, 100)} addresses due to bulk query error`);
      const limitedAddresses = walletAddresses.slice(0, 100);
      for (const address of limitedAddresses) {
        results.set(address, this.getDefaultReputationData(address));
      }
    }

    return results;
  }

  /**
   * Clear cache for a specific wallet address
   */
  async clearCache(walletAddress?: string): Promise<void> {
    if (walletAddress) {
      const cacheKey = `${this.REPUTATION_CACHE_PREFIX}${walletAddress}`;
      await redisService.del(cacheKey);
      logger.info(`Cleared reputation cache for ${walletAddress}`);
    } else {
      // Clear all reputation cache entries
      const keys = await redisService.keys(`${this.REPUTATION_CACHE_PREFIX}*`);
      for (const key of keys) {
        await redisService.del(key);
      }
      logger.info('Cleared all reputation cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; hitRate: number }> {
    // For Redis, we can't easily get the exact cache size without scanning all keys
    // So we'll return a placeholder value
    return {
      size: 0, // Redis doesn't provide easy way to get exact cache size
      hitRate: 0 // Could implement hit rate tracking if needed
    };
  }

  /**
   * Create initial reputation record for new user
   */
  private async createInitialReputation(walletAddress: string): Promise<void> {
    try {
      await db
        .insert(userReputation)
        .values({
          walletAddress,
          reputationScore: '50.00', // Start with neutral score
          totalTransactions: 0,
          positiveReviews: 0,
          negativeReviews: 0,
          neutralReviews: 0,
          successfulSales: 0,
          successfulPurchases: 0,
          disputedTransactions: 0,
          resolvedDisputes: 0,
          averageResponseTime: '0.00',
          completionRate: '100.00',
        })
        .onConflictDoNothing();

      logger.info(`Created initial reputation record for ${walletAddress}`);
    } catch (error) {
      logger.error(`Error creating initial reputation for ${walletAddress}:`, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        },
        walletAddress
      });
      
      // Log warning but don't throw - this is a best-effort operation
      logger.warn(`Failed to create initial reputation record for ${walletAddress}, will use default values`);
    }
  }

  /**
   * Get default reputation data for fallback scenarios
   */
  private getDefaultReputationData(walletAddress: string): ReputationData {
    return {
      walletAddress,
      score: 50.0, // Neutral starting score
      totalTransactions: 0,
      positiveReviews: 0,
      negativeReviews: 0,
      neutralReviews: 0,
      successfulSales: 0,
      successfulPurchases: 0,
      disputedTransactions: 0,
      resolvedDisputes: 0,
      averageResponseTime: 0,
      completionRate: 100,
      lastUpdated: new Date(),
    };
  }

  /**
   * Validate wallet address format
   */
  private isValidWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get reputation tier based on score
   */
  getReputationTier(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very_good';
    if (score >= 70) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 50) return 'neutral';
    if (score >= 40) return 'poor';
    return 'very_poor';
  }

  /**
   * Get reputation color for UI display
   */
  getReputationColor(score: number): string {
    if (score >= 80) return '#10B981'; // green
    if (score >= 60) return '#F59E0B'; // yellow
    if (score >= 40) return '#EF4444'; // red
    return '#6B7280'; // gray
  }
}

export const reputationService = new ReputationService();
export default reputationService;
