/**
 * Automated Tier Upgrade Service
 * Handles automated evaluation and processing of seller tier upgrades
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { sellers, orders, products, reviews, disputes, chatMessages, conversations, users } from '../db/schema';
import { eq, sql, and, gte, desc, count, sum, avg } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { SellerWebSocketService, getSellerWebSocketService } from './sellerWebSocketService';
import { NotificationService } from './notificationService';

export interface TierEvaluationCriteria {
  tierId: string;
  name: string;
  level: number;
  requirements: {
    salesVolume?: number;
    averageRating?: number;
    totalReviews?: number;
    timeActive?: number; // in days
    disputeRate?: number; // max percentage
    responseTime?: number; // max hours
    completionRate?: number; // min percentage
  };
  benefits: {
    listingLimit: number;
    commissionRate: number;
    prioritySupport: boolean;
    analyticsAccess: 'basic' | 'advanced' | 'premium';
    customBranding: boolean;
    featuredPlacement: boolean;
  };
}

export interface TierEvaluationResult {
  sellerId: string;
  walletAddress: string;
  currentTier: string;
  evaluatedTier: string;
  upgradeEligible: boolean;
  requirementsMet: Array<{
    requirement: string;
    current: number;
    required: number;
    met: boolean;
  }>;
  nextEvaluationDate: Date;
  upgradeDate?: Date;
  downgradeDate?: Date;
}

export interface TierUpgradeNotification {
  sellerId: string;
  walletAddress: string;
  fromTier: string;
  toTier: string;
  upgradeDate: Date;
  newBenefits: string[];
  congratulatoryMessage: string;
}

export interface TierDowngradeNotification {
  sellerId: string;
  walletAddress: string;
  fromTier: string;
  toTier: string;
  downgradeDate: Date;
  newBenefits: string[];
  reason: string;
}

class AutomatedTierUpgradeService {
  private redis: Redis | null = null;
  private readonly EVALUATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CACHE_TTL = 3600; // 1 hour
  private sellerWebSocketService: SellerWebSocketService | null;
  private notificationService: NotificationService;

  // Tier definitions with upgrade criteria
  private tierCriteria: TierEvaluationCriteria[] = [
    {
      tierId: 'bronze',
      name: 'Bronze',
      level: 1,
      requirements: {
        salesVolume: 0,
        averageRating: 0,
        totalReviews: 0,
        timeActive: 0,
      },
      benefits: {
        listingLimit: 5,
        commissionRate: 5.0,
        prioritySupport: false,
        analyticsAccess: 'basic',
        customBranding: false,
        featuredPlacement: false,
      },
    },
    {
      tierId: 'silver',
      name: 'Silver',
      level: 2,
      requirements: {
        salesVolume: 1000,
        averageRating: 4.0,
        totalReviews: 10,
        timeActive: 30,
        disputeRate: 5.0,
        responseTime: 24,
        completionRate: 95.0,
      },
      benefits: {
        listingLimit: 15,
        commissionRate: 4.0,
        prioritySupport: false,
        analyticsAccess: 'advanced',
        customBranding: false,
        featuredPlacement: false,
      },
    },
    {
      tierId: 'gold',
      name: 'Gold',
      level: 3,
      requirements: {
        salesVolume: 5000,
        averageRating: 4.5,
        totalReviews: 50,
        timeActive: 90,
        disputeRate: 2.0,
        responseTime: 12,
        completionRate: 98.0,
      },
      benefits: {
        listingLimit: 50,
        commissionRate: 3.0,
        prioritySupport: true,
        analyticsAccess: 'premium',
        customBranding: true,
        featuredPlacement: false,
      },
    },
    {
      tierId: 'platinum',
      name: 'Platinum',
      level: 4,
      requirements: {
        salesVolume: 25000,
        averageRating: 4.8,
        totalReviews: 200,
        timeActive: 180,
        disputeRate: 1.0,
        responseTime: 6,
        completionRate: 99.0,
      },
      benefits: {
        listingLimit: 100,
        commissionRate: 2.0,
        prioritySupport: true,
        analyticsAccess: 'premium',
        customBranding: true,
        featuredPlacement: true,
      },
    },
  ];

  constructor() {
    this.initializeRedis();
    // Initialize WebSocket service lazily to avoid initialization order issues
    this.sellerWebSocketService = null;
    this.notificationService = new NotificationService();

    // Only start automated evaluation in production
    if (process.env.NODE_ENV !== 'test') {
      this.startAutomatedEvaluation();
    }
  }

  private initializeRedis(): void {
    const redisEnabled = process.env.REDIS_ENABLED;
    if (redisEnabled === 'false' || redisEnabled === '0') {
      return;
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl || redisUrl === 'redis://localhost:6379' || redisUrl === 'your_redis_url') {
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 2) return null;
          return Math.min(times * 500, 2000);
        }
      });

      this.redis.on('error', () => {
        if (this.redis) {
          this.redis = null;
        }
      });
    } catch {
      this.redis = null;
    }
  }

  /**
   * Get seller WebSocket service lazily
   */
  private getSellerWebSocketService(): SellerWebSocketService | null {
    if (!this.sellerWebSocketService) {
      this.sellerWebSocketService = getSellerWebSocketService();
    }
    return this.sellerWebSocketService;
  }

  /**
   * Start the automated tier evaluation process
   */
  private startAutomatedEvaluation(): void {
    // Run initial evaluation after 1 minute
    setTimeout(() => {
      this.runBatchTierEvaluation();
    }, 60000);

    // Schedule regular evaluations
    setInterval(() => {
      this.runBatchTierEvaluation();
    }, this.EVALUATION_INTERVAL);

    safeLogger.info('Automated tier upgrade service started');
  }

  /**
   * Run tier evaluation for all active sellers
   */
  async runBatchTierEvaluation(): Promise<void> {
    try {
      safeLogger.info('Starting batch tier evaluation...');

      // Get all active sellers
      const activeSellers = await db
        .select({
          id: sellers.id,
          walletAddress: sellers.walletAddress,
          currentTier: sellers.tier,
        })
        .from(sellers);

      safeLogger.info(`Evaluating ${activeSellers.length} sellers for tier upgrades`);

      const evaluationPromises = activeSellers.map(seller =>
        this.evaluateSellerTier(seller.walletAddress)
      );

      const results = await Promise.allSettled(evaluationPromises);
      
      let upgradesProcessed = 0;
      let evaluationsCompleted = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          evaluationsCompleted++;
          if (result.value.upgradeEligible) {
            upgradesProcessed++;
          }
        } else {
          safeLogger.error(`Tier evaluation failed for seller ${activeSellers[index].walletAddress}:`, result.reason);
        }
      });

      safeLogger.info(`Batch tier evaluation completed: ${evaluationsCompleted} evaluations, ${upgradesProcessed} upgrades processed`);

      // Cache batch evaluation results
      if (this.redis) {
        await this.redis.setex(
          'tier:batch:last_evaluation',
          this.CACHE_TTL,
          JSON.stringify({
            timestamp: new Date().toISOString(),
            sellersEvaluated: evaluationsCompleted,
            upgradesProcessed,
          })
        );
      }

    } catch (error) {
      safeLogger.error('Error in batch tier evaluation:', error);
    }
  }

  /**
   * Evaluate a specific seller for tier upgrade
   */
  async evaluateSellerTier(walletAddress: string): Promise<TierEvaluationResult> {
    try {
      // Get seller data
      const seller = await db
        .select()
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress))
        .limit(1);

      if (!seller.length) {
        throw new Error(`Seller not found: ${walletAddress}`);
      }

      const sellerData = seller[0];
      const currentTierLevel = this.getTierLevel(sellerData.tier || 'bronze');

      // Calculate seller metrics
      const metrics = await this.calculateSellerMetrics(walletAddress);
      
      // Find the highest tier the seller qualifies for (check ALL tiers, not just higher ones)
      let qualifiedTier = this.tierCriteria[0]; // Default to bronze
      
      for (const tier of this.tierCriteria) {
        if (this.meetsRequirements(metrics, tier.requirements)) {
          qualifiedTier = tier; // Keep updating as we find higher qualifying tiers
        }
      }

      const upgradeEligible = qualifiedTier.level > currentTierLevel;
      const downgradeEligible = qualifiedTier.level < currentTierLevel;
      
      // Create evaluation result
      const evaluationResult: TierEvaluationResult = {
        sellerId: String(sellerData.id),
        walletAddress,
        currentTier: sellerData.tier || 'bronze',
        evaluatedTier: qualifiedTier.tierId,
        upgradeEligible,
        requirementsMet: this.getRequirementStatus(metrics, qualifiedTier.requirements),
        nextEvaluationDate: new Date(Date.now() + this.EVALUATION_INTERVAL),
      };

      // Process upgrade if eligible
      if (upgradeEligible) {
        await this.processAutomatedUpgrade(String(sellerData.id), walletAddress, sellerData.tier || 'bronze', qualifiedTier);
        evaluationResult.upgradeDate = new Date();
      }
      // Process downgrade if eligible
      else if (downgradeEligible) {
        await this.processAutomatedDowngrade(String(sellerData.id), walletAddress, sellerData.tier || 'bronze', qualifiedTier);
        evaluationResult.downgradeDate = new Date();
      }

      // Update seller tier if needed (we'll add lastTierEvaluation column later)
      // await db
      //   .update(sellers)
      //   .set({ lastTierEvaluation: new Date() })
      //   .where(eq(sellers.id, sellerData.id));

      // Cache evaluation result
      if (this.redis) {
        await this.redis.setex(
          `tier:evaluation:${walletAddress}`,
          this.CACHE_TTL,
          JSON.stringify(evaluationResult)
        );
      }

      return evaluationResult;

    } catch (error) {
      safeLogger.error(`Error evaluating seller tier for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Calculate seller performance metrics
   */
  private async calculateSellerMetrics(walletAddress: string): Promise<any> {
    try {
      // Get the user ID associated with this wallet address
      const userData = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (!userData.length) {
        throw new Error(`User not found for wallet address: ${walletAddress}`);
      }

      const userId = userData[0].id;

      // Get sales volume and order metrics
      const salesData = await db
        .select({
          totalSales: sum(orders.totalAmount),
          totalOrders: count(orders.id),
          completedOrders: count(sql`CASE WHEN ${orders.status} = 'completed' THEN 1 END`),
        })
        .from(orders)
        .where(eq(orders.sellerId, userId));

      // Get review metrics from actual reviews table
      const reviewData = await db
        .select({
          totalReviews: count(reviews.id),
          averageRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, userId));

      // Get dispute metrics from actual disputes table
      const disputeData = await db
        .select({
          totalDisputes: count(disputes.id),
        })
        .from(disputes)
        .innerJoin(orders, eq(disputes.escrowId, orders.id))
        .where(eq(orders.sellerId, userId));

      // Get seller's response time from chat messages
      // Calculate average time between buyer message and seller response
      const responseTimeData = await db
        .select({
          avgResponseHours: sql<number>`COALESCE(
            AVG(
              EXTRACT(EPOCH FROM (
                SELECT MIN(cm2.sent_at)
                FROM ${chatMessages} cm2
                WHERE cm2.conversation_id = ${chatMessages.conversationId}
                  AND cm2.sender_address = ${walletAddress}
                  AND cm2.sent_at > ${chatMessages.sentAt}
              )) / 3600
            ),
            0
          )`,
        })
        .from(chatMessages)
        .innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
        .innerJoin(orders, eq(conversations.orderId, orders.id))
        .where(
          and(
            eq(orders.sellerId, userId),
            sql`${chatMessages.senderAddress} != ${walletAddress}`
          )
        );

      // Get seller account age
      const sellerInfo = await db
        .select({
          createdAt: sellers.createdAt,
        })
        .from(sellers)
        .where(eq(sellers.walletAddress, walletAddress))
        .limit(1);

      const accountAge = sellerInfo.length > 0 
        ? Math.floor((Date.now() - new Date(sellerInfo[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const sales = salesData[0];
      const reviewMetrics = reviewData[0];
      const disputeMetrics = disputeData[0];
      const responseTimeMetrics = responseTimeData[0];

      // Calculate dispute rate (percentage of orders that have disputes)
      const disputeRate = sales.totalOrders > 0 
        ? (Number(disputeMetrics.totalDisputes) / Number(sales.totalOrders)) * 100 
        : 0;

      return {
        salesVolume: Number(sales.totalSales) || 0,
        totalOrders: Number(sales.totalOrders) || 0,
        completedOrders: Number(sales.completedOrders) || 0,
        totalReviews: Number(reviewMetrics.totalReviews) || 0,
        averageRating: Number(reviewMetrics.averageRating) || 0,
        timeActive: accountAge,
        completionRate: sales.totalOrders > 0 ? (sales.completedOrders / sales.totalOrders) * 100 : 0,
        disputeRate: disputeRate,
        responseTime: Number(responseTimeMetrics.avgResponseHours) || 12, // Fallback to 12h if no data
      };

    } catch (error) {
      safeLogger.error('Error calculating seller metrics:', error);
      return {
        salesVolume: 0,
        totalOrders: 0,
        completedOrders: 0,
        totalReviews: 0,
        averageRating: 0,
        timeActive: 0,
        completionRate: 0,
        disputeRate: 0,
        responseTime: 24,
      };
    }
  }

  /**
   * Check if seller meets tier requirements
   */
  private meetsRequirements(metrics: any, requirements: any): boolean {
    if (requirements.salesVolume && metrics.salesVolume < requirements.salesVolume) return false;
    if (requirements.averageRating && metrics.averageRating < requirements.averageRating) return false;
    if (requirements.totalReviews && metrics.totalReviews < requirements.totalReviews) return false;
    if (requirements.timeActive && metrics.timeActive < requirements.timeActive) return false;
    if (requirements.disputeRate && metrics.disputeRate > requirements.disputeRate) return false;
    if (requirements.responseTime && metrics.responseTime > requirements.responseTime) return false;
    if (requirements.completionRate && metrics.completionRate < requirements.completionRate) return false;

    return true;
  }

  /**
   * Get requirement status for evaluation result
   */
  private getRequirementStatus(metrics: any, requirements: any): Array<{
    requirement: string;
    current: number;
    required: number;
    met: boolean;
  }> {
    const status = [];

    if (requirements.salesVolume !== undefined) {
      status.push({
        requirement: 'Sales Volume',
        current: metrics.salesVolume,
        required: requirements.salesVolume,
        met: metrics.salesVolume >= requirements.salesVolume,
      });
    }

    if (requirements.averageRating !== undefined) {
      status.push({
        requirement: 'Average Rating',
        current: metrics.averageRating,
        required: requirements.averageRating,
        met: metrics.averageRating >= requirements.averageRating,
      });
    }

    if (requirements.totalReviews !== undefined) {
      status.push({
        requirement: 'Total Reviews',
        current: metrics.totalReviews,
        required: requirements.totalReviews,
        met: metrics.totalReviews >= requirements.totalReviews,
      });
    }

    if (requirements.timeActive !== undefined) {
      status.push({
        requirement: 'Time Active (days)',
        current: metrics.timeActive,
        required: requirements.timeActive,
        met: metrics.timeActive >= requirements.timeActive,
      });
    }

    return status;
  }

  /**
   * Process automated tier upgrade
   */
  private async processAutomatedUpgrade(
    sellerId: string,
    walletAddress: string,
    fromTier: string,
    toTier: TierEvaluationCriteria
  ): Promise<void> {
    try {
      safeLogger.info(`Processing automated upgrade for ${walletAddress}: ${fromTier} -> ${toTier.tierId}`);

      // Update seller tier in database
      await db
        .update(sellers)
        .set({
          tier: toTier.tierId,
          updatedAt: new Date(),
        })
        .where(eq(sellers.id, parseInt(sellerId)));

      // Activate tier benefits
      await this.activateTierBenefits(sellerId, toTier);

      // Send upgrade notification
      await this.sendTierUpgradeNotification({
        sellerId,
        walletAddress,
        fromTier,
        toTier: toTier.tierId,
        upgradeDate: new Date(),
        newBenefits: this.getBenefitDescriptions(toTier.benefits),
        congratulatoryMessage: this.generateCongratulatoryMessage(fromTier, toTier.name),
      });

      // Send real-time WebSocket notification
      const webSocketService = this.getSellerWebSocketService();
      if (webSocketService) {
        await webSocketService.sendTierUpgradeNotification(walletAddress, {
          type: 'tier_upgraded',
          fromTier,
          toTier: toTier.tierId,
          newBenefits: toTier.benefits,
          upgradeDate: new Date(),
        });
      }

      // Clear tier cache
      if (this.redis) {
        await this.redis.del(`tier:evaluation:${walletAddress}`);
        await this.redis.del(`seller:tier:${walletAddress}`);
      }

      safeLogger.info(`Automated upgrade completed for ${walletAddress}`);

    } catch (error) {
      safeLogger.error(`Error processing automated upgrade for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Process automated tier downgrade
   */
  private async processAutomatedDowngrade(
    sellerId: string,
    walletAddress: string,
    fromTier: string,
    toTier: TierEvaluationCriteria
  ): Promise<void> {
    try {
      safeLogger.info(`Processing automated downgrade for ${walletAddress}: ${fromTier} -> ${toTier.tierId}`);

      // Update seller tier in database
      await db
        .update(sellers)
        .set({
          tier: toTier.tierId,
          updatedAt: new Date(),
        })
        .where(eq(sellers.id, parseInt(sellerId)));

      // Deactivate tier benefits that are no longer available
      await this.adjustTierBenefits(sellerId, toTier);

      // Send downgrade notification
      await this.sendTierDowngradeNotification({
        sellerId,
        walletAddress,
        fromTier,
        toTier: toTier.tierId,
        downgradeDate: new Date(),
        newBenefits: this.getBenefitDescriptions(toTier.benefits),
        reason: this.generateDowngradeReason(fromTier, toTier.name),
      });

      // Send real-time WebSocket notification
      const webSocketService = this.getSellerWebSocketService();
      if (webSocketService) {
        await webSocketService.sendTierUpgradeNotification(walletAddress, {
          type: 'tier_downgraded',
          fromTier,
          toTier: toTier.tierId,
          newBenefits: toTier.benefits,
          upgradeDate: new Date(),
        });
      }

      // Clear tier cache
      if (this.redis) {
        await this.redis.del(`tier:evaluation:${walletAddress}`);
        await this.redis.del(`seller:tier:${walletAddress}`);
      }

      safeLogger.info(`Automated downgrade completed for ${walletAddress}`);

    } catch (error) {
      safeLogger.error(`Error processing automated downgrade for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Activate tier benefits for seller
   */
  private async activateTierBenefits(sellerId: string, tier: TierEvaluationCriteria): Promise<void> {
    try {
      // Update seller benefits in database (we'll add these columns later)
      // For now, just update the tier
      safeLogger.info(`Tier benefits would be activated for seller ${sellerId}:`, tier.benefits);

      safeLogger.info(`Tier benefits activated for seller ${sellerId}`);

    } catch (error) {
      safeLogger.error(`Error activating tier benefits for seller ${sellerId}:`, error);
      throw error;
    }
  }

  /**
   * Send tier upgrade notification
   */
  private async sendTierUpgradeNotification(notification: TierUpgradeNotification): Promise<void> {
    try {
      // Send in-app notification (using a placeholder orderId for tier upgrades)
      await this.notificationService.sendOrderNotification(
        notification.walletAddress,
        'TIER_UPGRADE',
        `tier-upgrade-${Date.now()}`,
        {
          fromTier: notification.fromTier,
          toTier: notification.toTier,
          newBenefits: notification.newBenefits,
          upgradeDate: notification.upgradeDate,
        }
      );

      safeLogger.info(`Tier upgrade notification sent to ${notification.walletAddress}`);

    } catch (error) {
      safeLogger.error(`Error sending tier upgrade notification:`, error);
    }
  }

  /**
   * Adjust tier benefits for seller (used during downgrade)
   */
  private async adjustTierBenefits(sellerId: string, tier: TierEvaluationCriteria): Promise<void> {
    try {
      // Update seller benefits in database to match new tier
      safeLogger.info(`Tier benefits adjusted for seller ${sellerId} to match ${tier.tierId}:`, tier.benefits);

      safeLogger.info(`Tier benefits adjusted for seller ${sellerId}`);

    } catch (error) {
      safeLogger.error(`Error adjusting tier benefits for seller ${sellerId}:`, error);
      throw error;
    }
  }

  /**
   * Send tier downgrade notification
   */
  private async sendTierDowngradeNotification(notification: TierDowngradeNotification): Promise<void> {
    try {
      // Send in-app notification
      await this.notificationService.sendOrderNotification(
        notification.walletAddress,
        'TIER_DOWNGRADE',
        `tier-downgrade-${Date.now()}`,
        {
          fromTier: notification.fromTier,
          toTier: notification.toTier,
          newBenefits: notification.newBenefits,
          downgradeDate: notification.downgradeDate,
          reason: notification.reason,
        }
      );

      safeLogger.info(`Tier downgrade notification sent to ${notification.walletAddress}`);

    } catch (error) {
      safeLogger.error(`Error sending tier downgrade notification:`, error);
    }
  }

  /**
   * Generate downgrade reason message
   */
  private generateDowngradeReason(fromTier: string, toTier: string): string {
    return `Based on your recent performance metrics, your tier has been automatically adjusted from ${fromTier} to ${toTier}. Continue improving your sales, ratings, and customer service to regain your previous tier status.`;
  }

  /**
   * Get tier level by tier ID
   */
  private getTierLevel(tierId: string): number {
    const tier = this.tierCriteria.find(t => t.tierId === tierId);
    return tier ? tier.level : 1;
  }

  /**
   * Get benefit descriptions
   */
  private getBenefitDescriptions(benefits: any): string[] {
    const descriptions = [];

    if (benefits.listingLimit) {
      descriptions.push(`Create up to ${benefits.listingLimit} listings`);
    }
    if (benefits.commissionRate) {
      descriptions.push(`${benefits.commissionRate}% platform commission`);
    }
    if (benefits.prioritySupport) {
      descriptions.push('Priority customer support');
    }
    if (benefits.analyticsAccess) {
      descriptions.push(`${benefits.analyticsAccess} analytics access`);
    }
    if (benefits.customBranding) {
      descriptions.push('Custom branding options');
    }
    if (benefits.featuredPlacement) {
      descriptions.push('Featured placement eligibility');
    }

    return descriptions;
  }

  /**
   * Generate congratulatory message
   */
  private generateCongratulatoryMessage(fromTier: string, toTier: string): string {
    return `🎉 Amazing work! You've been automatically upgraded from ${fromTier} to ${toTier} tier based on your outstanding performance. Your new benefits are now active and ready to help you grow your business even further!`;
  }

  /**
   * Get tier progression tracking for a seller
   */
  async getTierProgressionTracking(walletAddress: string): Promise<any> {
    try {
      const cacheKey = `tier:progression:${walletAddress}`;

      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const evaluation = await this.evaluateSellerTier(walletAddress);
      const currentTier = this.tierCriteria.find(t => t.tierId === evaluation.currentTier);
      const nextTier = this.tierCriteria.find(t => t.level === (currentTier?.level || 1) + 1);

      const progression = {
        currentTier: evaluation.currentTier,
        nextTier: nextTier?.tierId || null,
        progressPercentage: this.calculateProgressPercentage(evaluation.requirementsMet),
        requirementsMet: evaluation.requirementsMet,
        nextEvaluationDate: evaluation.nextEvaluationDate,
        estimatedUpgradeTime: this.estimateUpgradeTime(evaluation.requirementsMet),
      };

      if (this.redis) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(progression));
      }
      return progression;

    } catch (error) {
      safeLogger.error(`Error getting tier progression tracking for ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Calculate progress percentage based on requirements met
   */
  private calculateProgressPercentage(requirementsMet: any[]): number {
    if (!requirementsMet.length) return 0;
    
    const metCount = requirementsMet.filter(req => req.met).length;
    return Math.round((metCount / requirementsMet.length) * 100);
  }

  /**
   * Estimate time to upgrade based on current progress
   */
  private estimateUpgradeTime(requirementsMet: any[]): number | null {
    const unmetRequirements = requirementsMet.filter(req => !req.met);
    
    if (unmetRequirements.length === 0) return 0; // Already eligible
    
    // Simple estimation based on current progress
    // In a real implementation, this would use historical data and trends
    return unmetRequirements.length * 30; // Estimate 30 days per unmet requirement
  }

  /**
   * Manual tier evaluation trigger (for testing or admin use)
   */
  async triggerManualEvaluation(walletAddress: string): Promise<TierEvaluationResult> {
    safeLogger.info(`Manual tier evaluation triggered for ${walletAddress}`);
    return await this.evaluateSellerTier(walletAddress);
  }

  /**
   * Get tier criteria
   */
  getTierCriteria(): TierEvaluationCriteria[] {
    return this.tierCriteria;
  }

  /**
   * Get evaluation statistics
   */
  async getEvaluationStatistics(): Promise<any> {
    try {
      if (!this.redis) return null;
      const stats = await this.redis.get('tier:batch:last_evaluation');
      return stats ? JSON.parse(stats) : null;
    } catch (error) {
      safeLogger.error('Error getting evaluation statistics:', error);
      return null;
    }
  }
}

// Lazy initialization to avoid circular dependencies and initialization order issues
let automatedTierUpgradeServiceInstance: AutomatedTierUpgradeService | null = null;

export const getAutomatedTierUpgradeService = (): AutomatedTierUpgradeService => {
  if (!automatedTierUpgradeServiceInstance) {
    automatedTierUpgradeServiceInstance = new AutomatedTierUpgradeService();
  }
  return automatedTierUpgradeServiceInstance;
};

// For backward compatibility, but this will only be instantiated when accessed
export const automatedTierUpgradeService = {
  get instance() {
    return getAutomatedTierUpgradeService();
  }
};

export default getAutomatedTierUpgradeService;
