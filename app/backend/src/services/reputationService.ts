import { db } from '../db';
import { userReputation, reputationHistoryMarketplace, reputationCalculationRules } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

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
  private cache = new Map<string, { data: ReputationData; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Get reputation data for a wallet address with caching
   */
  async getReputation(walletAddress: string): Promise<ReputationData> {
    try {
      // Check cache first
      const cached = this.cache.get(walletAddress);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        logger.info(`Returning cached reputation for ${walletAddress}`);
        return cached.data;
      }

      // Query database
      const [reputation] = await db
        .select()
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
        
        // Create initial reputation record
        await this.createInitialReputation(walletAddress);
      }

      // Cache the result
      this.cache.set(walletAddress, {
        data: reputationData,
        timestamp: Date.now()
      });

      logger.info(`Retrieved reputation for ${walletAddress}: score ${reputationData.score}`);
      return reputationData;

    } catch (error) {
      logger.error(`Error getting reputation for ${walletAddress}:`, error);
      
      // Return default values as fallback
      return this.getDefaultReputationData(walletAddress);
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
      this.cache.delete(walletAddress);

      logger.info(`Successfully updated reputation for ${walletAddress}`);

    } catch (error) {
      logger.error(`Error updating reputation for ${walletAddress}:`, error);
      throw new Error(`Failed to update reputation: ${error.message}`);
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

      // Get updated reputation
      const updatedReputation = await this.getReputation(walletAddress);
      
      logger.info(`Calculated reputation for ${walletAddress}: ${updatedReputation.score}`);
      return updatedReputation.score;

    } catch (error) {
      logger.error(`Error calculating reputation for ${walletAddress}:`, error);
      throw new Error(`Failed to calculate reputation: ${error.message}`);
    }
  }

  /**
   * Get reputation history for a wallet address
   */
  async getReputationHistory(
    walletAddress: string, 
    limit: number = 50
  ): Promise<ReputationHistoryEntry[]> {
    try {
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
        .limit(limit);

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
      logger.error(`Error getting reputation history for ${walletAddress}:`, error);
      return [];
    }
  }

  /**
   * Get reputation statistics for multiple users
   */
  async getBulkReputation(walletAddresses: string[]): Promise<Map<string, ReputationData>> {
    const results = new Map<string, ReputationData>();

    try {
      const reputations = await db
        .select()
        .from(userReputation)
        .where(sql`${userReputation.walletAddress} = ANY(${walletAddresses})`);

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
      for (const address of walletAddresses) {
        if (!results.has(address)) {
          results.set(address, this.getDefaultReputationData(address));
        }
      }

    } catch (error) {
      logger.error('Error getting bulk reputation:', error);
      
      // Return default values for all addresses
      for (const address of walletAddresses) {
        results.set(address, this.getDefaultReputationData(address));
      }
    }

    return results;
  }

  /**
   * Clear cache for a specific wallet address
   */
  clearCache(walletAddress?: string): void {
    if (walletAddress) {
      this.cache.delete(walletAddress);
      logger.info(`Cleared reputation cache for ${walletAddress}`);
    } else {
      this.cache.clear();
      logger.info('Cleared all reputation cache');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
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
      logger.error(`Error creating initial reputation for ${walletAddress}:`, error);
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
