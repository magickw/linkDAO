import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { 
  users, 
  moderationActions, 
  reputationHistory,
  moderationCases,
  posts,
  reactions,
  tips
} from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface UserContext {
  userId: string;
  walletAddress: string;
  accountAge: number; // days
  reputation: number;
  totalPosts: number;
  totalReactions: number;
  totalTipsReceived: number;
  recentViolations: number;
  violationHistory: ViolationRecord[];
  walletRiskFactors: WalletRiskFactors;
  behaviorPatterns: BehaviorPatterns;
}

export interface ViolationRecord {
  date: Date;
  category: string;
  action: string;
  severity: string;
}

export interface WalletRiskFactors {
  isNewWallet: boolean;
  hasSequentialPattern: boolean;
  hasRepeatedPattern: boolean;
  transactionVolume: 'low' | 'medium' | 'high';
  associatedRiskyWallets: number;
  onChainReputation: number;
}

export interface BehaviorPatterns {
  postingFrequency: 'low' | 'medium' | 'high' | 'suspicious';
  engagementRatio: number; // reactions received / posts made
  tipRatio: number; // tips received / posts made
  timePatterns: 'normal' | 'bot-like' | 'suspicious';
  contentDiversity: number; // 0-1 score of content variety
}

export interface ContextualRiskScore {
  overallRisk: number; // 0-1
  userRisk: number;
  walletRisk: number;
  behaviorRisk: number;
  reputationAdjustment: number;
  riskFactors: string[];
  confidenceModifier: number; // Multiplier for AI confidence thresholds
}

export class ContextAwareScoringService {
  private contextCache: Map<string, { context: UserContext; timestamp: number }> = new Map();
  private cacheExpiry: number = 10 * 60 * 1000; // 10 minutes

  /**
   * Get comprehensive user context for moderation decisions
   */
  async getUserContext(userId: string): Promise<UserContext> {
    // Check cache first
    const cached = this.contextCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.context;
    }

    try {
      // Get basic user info
      const userInfo = await db
        .select({
          walletAddress: users.walletAddress,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userInfo.length === 0) {
        throw new Error('User not found');
      }

      const user = userInfo[0];
      const accountAge = user.createdAt 
        ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Get user activity stats
      const [postStats, reactionStats, tipStats] = await Promise.all([
        this.getUserPostStats(userId),
        this.getUserReactionStats(userId),
        this.getUserTipStats(userId)
      ]);

      // Get violation history
      const violationHistory = await this.getViolationHistory(userId);

      // Get current reputation
      const reputation = await this.getCurrentReputation(userId);

      // Analyze wallet risk factors
      const walletRiskFactors = await this.analyzeWalletRisk(user.walletAddress, accountAge);

      // Analyze behavior patterns
      const behaviorPatterns = await this.analyzeBehaviorPatterns(userId, postStats, reactionStats, tipStats);

      const context: UserContext = {
        userId,
        walletAddress: user.walletAddress,
        accountAge,
        reputation,
        totalPosts: postStats.totalPosts,
        totalReactions: reactionStats.totalReactions,
        totalTipsReceived: tipStats.totalTipsReceived,
        recentViolations: violationHistory.filter(v => 
          Date.now() - v.date.getTime() < 30 * 24 * 60 * 60 * 1000 // Last 30 days
        ).length,
        violationHistory,
        walletRiskFactors,
        behaviorPatterns
      };

      // Cache the context
      this.contextCache.set(userId, { context, timestamp: Date.now() });

      return context;
    } catch (error) {
      safeLogger.error('Failed to get user context:', error);
      
      // Return minimal context on error
      return {
        userId,
        walletAddress: '',
        accountAge: 0,
        reputation: 50, // Default neutral reputation
        totalPosts: 0,
        totalReactions: 0,
        totalTipsReceived: 0,
        recentViolations: 0,
        violationHistory: [],
        walletRiskFactors: {
          isNewWallet: true,
          hasSequentialPattern: false,
          hasRepeatedPattern: false,
          transactionVolume: 'low',
          associatedRiskyWallets: 0,
          onChainReputation: 50
        },
        behaviorPatterns: {
          postingFrequency: 'low',
          engagementRatio: 0,
          tipRatio: 0,
          timePatterns: 'normal',
          contentDiversity: 0.5
        }
      };
    }
  }

  /**
   * Calculate contextual risk score for moderation decisions
   */
  async calculateContextualRisk(userId: string, contentType: string): Promise<ContextualRiskScore> {
    const context = await this.getUserContext(userId);
    
    // Calculate individual risk components
    const userRisk = this.calculateUserRisk(context);
    const walletRisk = this.calculateWalletRisk(context.walletRiskFactors);
    const behaviorRisk = this.calculateBehaviorRisk(context.behaviorPatterns);
    
    // Calculate reputation adjustment
    const reputationAdjustment = this.calculateReputationAdjustment(context.reputation);
    
    // Combine risks with weights
    const overallRisk = (
      userRisk * 0.3 +
      walletRisk * 0.3 +
      behaviorRisk * 0.4
    ) * reputationAdjustment;

    // Identify specific risk factors
    const riskFactors = this.identifyRiskFactors(context);
    
    // Calculate confidence modifier for AI thresholds
    const confidenceModifier = this.calculateConfidenceModifier(overallRisk, context, contentType);

    return {
      overallRisk: Math.min(1.0, Math.max(0.0, overallRisk)),
      userRisk,
      walletRisk,
      behaviorRisk,
      reputationAdjustment,
      riskFactors,
      confidenceModifier
    };
  }

  /**
   * Get user post statistics
   */
  private async getUserPostStats(userId: string): Promise<{ totalPosts: number; recentPosts: number }> {
    try {
      const [totalResult, recentResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(posts)
          .where(eq(posts.authorId, userId)),
        db
          .select({ count: count() })
          .from(posts)
          .where(
            and(
              eq(posts.authorId, userId),
              sql`${posts.createdAt} > NOW() - INTERVAL '7 days'`
            )
          )
      ]);

      return {
        totalPosts: totalResult[0]?.count || 0,
        recentPosts: recentResult[0]?.count || 0
      };
    } catch (error) {
      safeLogger.error('Failed to get user post stats:', error);
      return { totalPosts: 0, recentPosts: 0 };
    }
  }

  /**
   * Get user reaction statistics
   */
  private async getUserReactionStats(userId: string): Promise<{ totalReactions: number; totalAmount: number }> {
    try {
      const result = await db
        .select({ 
          count: count(),
          totalAmount: sum(reactions.amount)
        })
        .from(reactions)
        .innerJoin(posts, eq(reactions.postId, posts.id))
        .where(eq(posts.authorId, userId));

      return {
        totalReactions: result[0]?.count || 0,
        totalAmount: parseFloat(result[0]?.totalAmount || '0')
      };
    } catch (error) {
      safeLogger.error('Failed to get user reaction stats:', error);
      return { totalReactions: 0, totalAmount: 0 };
    }
  }

  /**
   * Get user tip statistics
   */
  private async getUserTipStats(userId: string): Promise<{ totalTipsReceived: number; totalTipAmount: number }> {
    try {
      const result = await db
        .select({ 
          count: count(),
          totalAmount: sum(tips.amount)
        })
        .from(tips)
        .where(eq(tips.toUserId, userId));

      return {
        totalTipsReceived: result[0]?.count || 0,
        totalTipAmount: parseFloat(result[0]?.totalAmount || '0')
      };
    } catch (error) {
      safeLogger.error('Failed to get user tip stats:', error);
      return { totalTipsReceived: 0, totalTipAmount: 0 };
    }
  }

  /**
   * Get user violation history
   */
  private async getViolationHistory(userId: string): Promise<ViolationRecord[]> {
    try {
      const violations = await db
        .select({
          createdAt: moderationActions.createdAt,
          action: moderationActions.action,
          reasonCode: moderationCases.reasonCode
        })
        .from(moderationActions)
        .leftJoin(moderationCases, eq(moderationActions.contentId, moderationCases.contentId))
        .where(eq(moderationActions.userId, userId))
        .orderBy(desc(moderationActions.createdAt))
        .limit(50); // Last 50 violations

      return violations.map(v => ({
        date: v.createdAt || new Date(),
        category: v.reasonCode || 'unknown',
        action: v.action,
        severity: this.mapActionToSeverity(v.action)
      }));
    } catch (error) {
      safeLogger.error('Failed to get violation history:', error);
      return [];
    }
  }

  /**
   * Get current user reputation
   */
  private async getCurrentReputation(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ newReputation: reputationImpacts.newReputation })
        .from(reputationImpacts)
        .where(eq(reputationImpacts.userId, userId))
        .orderBy(desc(reputationImpacts.createdAt))
        .limit(1);

      return result.length > 0 ? parseFloat(result[0].newReputation || '50') : 50; // Default neutral reputation
    } catch (error) {
      safeLogger.error('Failed to get current reputation:', error);
      return 50;
    }
  }

  /**
   * Analyze wallet risk factors
   */
  private async analyzeWalletRisk(walletAddress: string, accountAge: number): Promise<WalletRiskFactors> {
    const addressLower = walletAddress.toLowerCase();
    
    // Check for suspicious patterns in wallet address
    const hasSequentialPattern = /0123456789|abcdef|fedcba|987654321/.test(addressLower);
    const hasRepeatedPattern = /(.)\1{4,}/.test(addressLower);
    
    // Determine if it's a new wallet
    const isNewWallet = accountAge < 7;
    
    // Mock on-chain analysis (in production, this would query blockchain data)
    const transactionVolume = this.estimateTransactionVolume(walletAddress);
    const associatedRiskyWallets = 0; // Would be calculated from on-chain analysis
    const onChainReputation = this.calculateOnChainReputation(walletAddress, accountAge);

    return {
      isNewWallet,
      hasSequentialPattern,
      hasRepeatedPattern,
      transactionVolume,
      associatedRiskyWallets,
      onChainReputation
    };
  }

  /**
   * Analyze user behavior patterns
   */
  private async analyzeBehaviorPatterns(
    userId: string,
    postStats: { totalPosts: number; recentPosts: number },
    reactionStats: { totalReactions: number; totalAmount: number },
    tipStats: { totalTipsReceived: number; totalTipAmount: number }
  ): Promise<BehaviorPatterns> {
    
    // Analyze posting frequency
    const postingFrequency = this.categorizePostingFrequency(postStats.recentPosts);
    
    // Calculate engagement ratio
    const engagementRatio = postStats.totalPosts > 0 ? reactionStats.totalReactions / postStats.totalPosts : 0;
    
    // Calculate tip ratio
    const tipRatio = postStats.totalPosts > 0 ? tipStats.totalTipsReceived / postStats.totalPosts : 0;
    
    // Analyze time patterns (simplified - would need more detailed timestamp analysis)
    const timePatterns = await this.analyzeTimePatterns(userId);
    
    // Calculate content diversity (simplified - would need content analysis)
    const contentDiversity = await this.calculateContentDiversity(userId);

    return {
      postingFrequency,
      engagementRatio,
      tipRatio,
      timePatterns,
      contentDiversity
    };
  }

  /**
   * Calculate user-specific risk
   */
  private calculateUserRisk(context: UserContext): number {
    let risk = 0;

    // Account age risk
    if (context.accountAge < 1) risk += 0.4;
    else if (context.accountAge < 7) risk += 0.3;
    else if (context.accountAge < 30) risk += 0.1;

    // Violation history risk
    if (context.recentViolations > 0) {
      risk += Math.min(0.5, context.recentViolations * 0.15);
    }

    // Activity level risk (too low or too high can be suspicious)
    if (context.totalPosts === 0 && context.accountAge > 7) {
      risk += 0.2; // Inactive account
    } else if (context.totalPosts > context.accountAge * 10) {
      risk += 0.1; // Very high activity
    }

    return Math.min(1.0, risk);
  }

  /**
   * Calculate wallet-specific risk
   */
  private calculateWalletRisk(walletFactors: WalletRiskFactors): number {
    let risk = 0;

    if (walletFactors.isNewWallet) risk += 0.3;
    if (walletFactors.hasSequentialPattern) risk += 0.2;
    if (walletFactors.hasRepeatedPattern) risk += 0.2;
    if (walletFactors.transactionVolume === 'low') risk += 0.1;
    if (walletFactors.associatedRiskyWallets > 0) risk += Math.min(0.3, walletFactors.associatedRiskyWallets * 0.1);
    
    // On-chain reputation adjustment
    const reputationAdjustment = (100 - walletFactors.onChainReputation) / 200; // 0-0.5
    risk += reputationAdjustment;

    return Math.min(1.0, risk);
  }

  /**
   * Calculate behavior-specific risk
   */
  private calculateBehaviorRisk(behaviorPatterns: BehaviorPatterns): number {
    let risk = 0;

    // Posting frequency risk
    if (behaviorPatterns.postingFrequency === 'suspicious') risk += 0.4;
    else if (behaviorPatterns.postingFrequency === 'high') risk += 0.1;

    // Engagement ratio risk (very low engagement might indicate spam)
    if (behaviorPatterns.engagementRatio < 0.1) risk += 0.2;

    // Time pattern risk
    if (behaviorPatterns.timePatterns === 'bot-like') risk += 0.3;
    else if (behaviorPatterns.timePatterns === 'suspicious') risk += 0.2;

    // Content diversity risk (very low diversity might indicate spam/bot)
    if (behaviorPatterns.contentDiversity < 0.2) risk += 0.2;

    return Math.min(1.0, risk);
  }

  /**
   * Calculate reputation adjustment multiplier
   */
  private calculateReputationAdjustment(reputation: number): number {
    // High reputation users get lower risk multiplier
    if (reputation >= 90) return 0.7;
    if (reputation >= 80) return 0.8;
    if (reputation >= 70) return 0.9;
    if (reputation >= 50) return 1.0;
    if (reputation >= 30) return 1.1;
    if (reputation >= 10) return 1.3;
    return 1.5; // Very low reputation
  }

  /**
   * Identify specific risk factors for transparency
   */
  private identifyRiskFactors(context: UserContext): string[] {
    const factors: string[] = [];

    if (context.accountAge < 7) factors.push('New account');
    if (context.recentViolations > 0) factors.push(`${context.recentViolations} recent violations`);
    if (context.walletRiskFactors.isNewWallet) factors.push('New wallet');
    if (context.walletRiskFactors.hasSequentialPattern) factors.push('Suspicious wallet pattern');
    if (context.behaviorPatterns.postingFrequency === 'suspicious') factors.push('Suspicious posting frequency');
    if (context.behaviorPatterns.timePatterns === 'bot-like') factors.push('Bot-like behavior');
    if (context.behaviorPatterns.engagementRatio < 0.1) factors.push('Low engagement');
    if (context.reputation < 30) factors.push('Low reputation');

    return factors;
  }

  /**
   * Calculate confidence modifier for AI thresholds
   */
  private calculateConfidenceModifier(
    overallRisk: number, 
    context: UserContext, 
    contentType: string
  ): number {
    let modifier = 1.0;

    // Base adjustment from overall risk
    modifier += overallRisk * 0.5; // 0-0.5 increase

    // Content type specific adjustments
    if (contentType === 'listing') modifier += 0.1;
    if (contentType === 'dm') modifier -= 0.05;

    // Reputation-based adjustment
    if (context.reputation > 80) modifier -= 0.1;
    else if (context.reputation < 30) modifier += 0.2;

    return Math.max(0.5, Math.min(2.0, modifier));
  }

  // Helper methods

  private mapActionToSeverity(action: string): string {
    switch (action) {
      case 'warn': return 'low';
      case 'limit': case 'quarantine': return 'medium';
      case 'suspend': return 'high';
      case 'ban': case 'delete_content': return 'critical';
      default: return 'medium';
    }
  }

  private estimateTransactionVolume(walletAddress: string): 'low' | 'medium' | 'high' {
    // Mock implementation - would query blockchain data
    const hash = walletAddress.slice(-4);
    const num = parseInt(hash, 16) % 100;
    if (num < 30) return 'low';
    if (num < 70) return 'medium';
    return 'high';
  }

  private calculateOnChainReputation(walletAddress: string, accountAge: number): number {
    // Mock implementation - would analyze on-chain behavior
    let reputation = 50; // Base reputation
    
    // Age bonus
    reputation += Math.min(20, accountAge * 0.5);
    
    // Random variation based on wallet address (mock)
    const hash = walletAddress.slice(-2);
    const variation = (parseInt(hash, 16) % 40) - 20; // -20 to +20
    reputation += variation;
    
    return Math.max(0, Math.min(100, reputation));
  }

  private categorizePostingFrequency(recentPosts: number): 'low' | 'medium' | 'high' | 'suspicious' {
    if (recentPosts === 0) return 'low';
    if (recentPosts <= 5) return 'medium';
    if (recentPosts <= 20) return 'high';
    return 'suspicious'; // More than 20 posts in 7 days
  }

  private async analyzeTimePatterns(userId: string): Promise<'normal' | 'bot-like' | 'suspicious'> {
    // Simplified implementation - would analyze posting timestamps
    return 'normal';
  }

  private async calculateContentDiversity(userId: string): Promise<number> {
    // Simplified implementation - would analyze content similarity
    return 0.7; // Mock diversity score
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId: string): void {
    this.contextCache.delete(userId);
  }

  /**
   * Clear all cached contexts
   */
  clearAllCache(): void {
    this.contextCache.clear();
  }
}

export const contextAwareScoringService = new ContextAwareScoringService();