import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { earningActivityService } from './earningActivityService';
import { reputationService } from './reputationService';

export interface PostCreatedEvent {
  postId: number;
  authorId: string;
  title?: string;
  contentCid: string;
  communityId?: string;
  isPremiumUser?: boolean;
}

export interface CommentCreatedEvent {
  commentId: number;
  authorId: string;
  postId: number;
  contentCid: string;
  isPremiumUser?: boolean;
}

export interface MarketplaceTransactionEvent {
  orderId: number;
  buyerId: string;
  sellerId: string;
  transactionAmount: number;
  isPremiumBuyer?: boolean;
  isPremiumSeller?: boolean;
}

export interface ReferralEvent {
  referrerId: string;
  refereeId: string;
  referralCode: string;
  isPremiumReferrer?: boolean;
}

class EarningEventListeners extends EventEmitter {
  constructor() {
    super();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Post creation event
    this.on('post:created', this.handlePostCreated.bind(this));
    
    // Comment creation event
    this.on('comment:created', this.handleCommentCreated.bind(this));
    
    // Marketplace transaction event
    this.on('marketplace:transaction', this.handleMarketplaceTransaction.bind(this));
    
    // Referral event
    this.on('referral:completed', this.handleReferralCompleted.bind(this));
    
    // Profile completion event
    this.on('profile:completed', this.handleProfileCompleted.bind(this));
  }

  /**
   * Handle post creation earning
   */
  private async handlePostCreated(event: PostCreatedEvent) {
    try {
      safeLogger.info('Processing earning for post creation:', event.postId);

      // Calculate quality score based on post content
      const qualityScore = await this.calculatePostQualityScore(event);

      const result = await earningActivityService.processEarningActivity({
        userId: event.authorId,
        activityType: 'post',
        activityId: event.postId.toString(),
        qualityScore,
        isPremiumUser: event.isPremiumUser,
        metadata: {
          postId: event.postId,
          communityId: event.communityId,
          contentLength: event.contentCid.length,
          hasTitle: !!event.title,
          timestamp: new Date().toISOString()
        }
      });

      if (result.success) {
        safeLogger.info(`Post earning processed: ${result.tokensEarned} tokens earned for user ${event.authorId}`);
      } else {
        safeLogger.info(`Post earning failed: ${result.message}`);
      }

    } catch (error) {
      safeLogger.error('Error processing post creation earning:', error);
    }
  }

  /**
   * Handle comment creation earning
   */
  private async handleCommentCreated(event: CommentCreatedEvent) {
    try {
      safeLogger.info('Processing earning for comment creation:', event.commentId);

      // Calculate quality score based on comment engagement
      const qualityScore = await this.calculateCommentQualityScore(event);

      const result = await earningActivityService.processEarningActivity({
        userId: event.authorId,
        activityType: 'comment',
        activityId: event.commentId.toString(),
        qualityScore,
        isPremiumUser: event.isPremiumUser,
        metadata: {
          commentId: event.commentId,
          postId: event.postId,
          contentLength: event.contentCid.length,
          timestamp: new Date().toISOString()
        }
      });

      if (result.success) {
        safeLogger.info(`Comment earning processed: ${result.tokensEarned} tokens earned for user ${event.authorId}`);
      } else {
        safeLogger.info(`Comment earning failed: ${result.message}`);
      }

    } catch (error) {
      safeLogger.error('Error processing comment creation earning:', error);
    }
  }

  /**
   * Handle marketplace transaction earning
   */
  private async handleMarketplaceTransaction(event: MarketplaceTransactionEvent) {
    try {
      safeLogger.info('Processing earning for marketplace transaction:', event.orderId);

      // Process buyer reward
      if (event.buyerId) {
        const buyerResult = await earningActivityService.processEarningActivity({
          userId: event.buyerId,
          activityType: 'marketplace',
          activityId: event.orderId.toString(),
          isPremiumUser: event.isPremiumBuyer,
          metadata: {
            orderId: event.orderId,
            role: 'buyer',
            transactionAmount: event.transactionAmount,
            timestamp: new Date().toISOString()
          }
        });

        if (buyerResult.success) {
          safeLogger.info(`Buyer earning processed: ${buyerResult.tokensEarned} tokens earned for user ${event.buyerId}`);
        }
      }

      // Process seller reward
      if (event.sellerId) {
        const sellerResult = await earningActivityService.processEarningActivity({
          userId: event.sellerId,
          activityType: 'marketplace',
          activityId: event.orderId.toString(),
          isPremiumUser: event.isPremiumSeller,
          metadata: {
            orderId: event.orderId,
            role: 'seller',
            transactionAmount: event.transactionAmount,
            timestamp: new Date().toISOString()
          }
        });

        if (sellerResult.success) {
          safeLogger.info(`Seller earning processed: ${sellerResult.tokensEarned} tokens earned for user ${event.sellerId}`);
        }
      }

    } catch (error) {
      safeLogger.error('Error processing marketplace transaction earning:', error);
    }
  }

  /**
   * Handle referral completion earning
   */
  private async handleReferralCompleted(event: ReferralEvent) {
    try {
      safeLogger.info('Processing earning for referral completion:', event.referralCode);

      const result = await earningActivityService.processEarningActivity({
        userId: event.referrerId,
        activityType: 'referral',
        activityId: event.referralCode,
        isPremiumUser: event.isPremiumReferrer,
        metadata: {
          referralCode: event.referralCode,
          refereeId: event.refereeId,
          timestamp: new Date().toISOString()
        }
      });

      if (result.success) {
        safeLogger.info(`Referral earning processed: ${result.tokensEarned} tokens earned for user ${event.referrerId}`);
      } else {
        safeLogger.info(`Referral earning failed: ${result.message}`);
      }

    } catch (error) {
      safeLogger.error('Error processing referral earning:', error);
    }
  }

  /**
   * Handle profile completion earning
   */
  private async handleProfileCompleted(event: { userId: string; isPremiumUser?: boolean }) {
    try {
      safeLogger.info('Processing earning for profile completion:', event.userId);

      const result = await earningActivityService.processEarningActivity({
        userId: event.userId,
        activityType: 'profile_complete',
        isPremiumUser: event.isPremiumUser,
        metadata: {
          timestamp: new Date().toISOString()
        }
      });

      if (result.success) {
        safeLogger.info(`Profile completion earning processed: ${result.tokensEarned} tokens earned for user ${event.userId}`);
      } else {
        safeLogger.info(`Profile completion earning failed: ${result.message}`);
      }

    } catch (error) {
      safeLogger.error('Error processing profile completion earning:', error);
    }
  }

  /**
   * Calculate quality score for posts
   */
  private async calculatePostQualityScore(event: PostCreatedEvent): Promise<number> {
    let qualityScore = 1.0;

    try {
      // Base quality factors
      const hasTitle = !!event.title;
      const contentLength = event.contentCid.length;
      const isInCommunity = !!event.communityId;

      // Content length factor (longer content generally higher quality)
      if (contentLength > 100) qualityScore += 0.2;
      if (contentLength > 500) qualityScore += 0.2;
      if (contentLength > 1000) qualityScore += 0.1;

      // Title factor
      if (hasTitle) qualityScore += 0.1;

      // Community participation factor
      if (isInCommunity) qualityScore += 0.1;

      // User reputation factor
      if (event.authorId) {
        try {
          const userReputation = await reputationService.getReputation(event.authorId);
          const reputationMultiplier = Math.min(0.3, userReputation.score / 1000);
          qualityScore += reputationMultiplier;
        } catch (error) {
          safeLogger.error('Error getting user reputation for quality score:', error);
        }
      }

      // Ensure quality score is within bounds
      return Math.max(0.5, Math.min(2.0, qualityScore));

    } catch (error) {
      safeLogger.error('Error calculating post quality score:', error);
      return 1.0;
    }
  }

  /**
   * Calculate quality score for comments
   */
  private async calculateCommentQualityScore(event: CommentCreatedEvent): Promise<number> {
    let qualityScore = 1.0;

    try {
      // Content length factor
      const contentLength = event.contentCid.length;
      if (contentLength > 50) qualityScore += 0.1;
      if (contentLength > 200) qualityScore += 0.1;

      // User reputation factor
      if (event.authorId) {
        try {
          const userReputation = await reputationService.getReputation(event.authorId);
          const reputationMultiplier = Math.min(0.2, userReputation.score / 1000);
          qualityScore += reputationMultiplier;
        } catch (error) {
          safeLogger.error('Error getting user reputation for quality score:', error);
        }
      }

      // Ensure quality score is within bounds
      return Math.max(0.5, Math.min(1.5, qualityScore));

    } catch (error) {
      safeLogger.error('Error calculating comment quality score:', error);
      return 1.0;
    }
  }

  /**
   * Emit post created event
   */
  emitPostCreated(event: PostCreatedEvent) {
    this.emit('post:created', event);
  }

  /**
   * Emit comment created event
   */
  emitCommentCreated(event: CommentCreatedEvent) {
    this.emit('comment:created', event);
  }

  /**
   * Emit marketplace transaction event
   */
  emitMarketplaceTransaction(event: MarketplaceTransactionEvent) {
    this.emit('marketplace:transaction', event);
  }

  /**
   * Emit referral completed event
   */
  emitReferralCompleted(event: ReferralEvent) {
    this.emit('referral:completed', event);
  }

  /**
   * Emit profile completed event
   */
  emitProfileCompleted(event: { userId: string; isPremiumUser?: boolean }) {
    this.emit('profile:completed', event);
  }
}

export const earningEventListeners = new EarningEventListeners();
