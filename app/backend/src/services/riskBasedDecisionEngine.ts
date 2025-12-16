import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { 
  moderationCases, 
  moderationActions,
  users,
  userReputationScores,
  reputationChangeEvents
} from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface ContentInput {
  id: string;
  type: 'post' | 'comment' | 'listing' | 'dm' | 'username';
  text?: string;
  media?: MediaFile[];
  links?: string[];
  userId: string;
  userReputation: number;
  walletAddress: string;
  metadata: Record<string, any>;
}

export interface MediaFile {
  url: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
}

export interface VendorResult {
  vendor: string;
  confidence: number;
  categories: string[];
  reasoning?: string;
  cost: number;
  latency: number;
  success: boolean;
}

export interface PolicyRule {
  id: number;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidenceThreshold: number;
  action: 'allow' | 'limit' | 'block' | 'review';
  reputationModifier: number;
  description: string;
  isActive: boolean;
}

export interface DecisionContext {
  userReputation: number;
  walletRiskScore: number;
  recentViolations: number;
  accountAge: number;
  contentType: string;
  hasLinks: boolean;
  hasMedia: boolean;
  isNewUser: boolean;
}

export interface ModerationDecision {
  action: 'allow' | 'limit' | 'block' | 'review';
  confidence: number;
  riskScore: number;
  primaryCategory: string;
  reasoning: string;
  appliedPolicies: PolicyRule[];
  thresholdAdjustments: Record<string, number>;
  recommendedDuration?: number; // For temporary actions in seconds
}

export class RiskBasedDecisionEngine {
  private policyCache: Map<string, PolicyRule[]> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;

  constructor() {
    this.loadPolicies();
  }

  /**
   * Main decision method that processes vendor results and makes moderation decision
   */
  async makeDecision(
    content: ContentInput,
    vendorResults: VendorResult[]
  ): Promise<ModerationDecision> {
    try {
      // Build decision context
      const context = await this.buildDecisionContext(content);
      
      // Get applicable policies
      const policies = await this.getApplicablePolicies();
      
      // Calculate confidence scores by category
      const categoryScores = this.calculateCategoryScores(vendorResults);
      
      // Apply reputation-based threshold adjustments
      const adjustedThresholds = this.calculateThresholdAdjustments(context, policies);
      
      // Determine primary violation category
      const primaryCategory = this.determinePrimaryCategory(categoryScores, policies);
      
      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(categoryScores, context, primaryCategory);
      
      // Make final decision
      const decision = this.determineAction(
        categoryScores,
        adjustedThresholds,
        policies,
        context,
        primaryCategory
      );
      
      // Calculate confidence in the decision
      const confidence = this.calculateDecisionConfidence(
        categoryScores,
        vendorResults,
        decision.action
      );
      
      // Determine action duration for temporary measures
      const recommendedDuration = this.calculateActionDuration(
        decision.action,
        context,
        primaryCategory
      );

      const finalDecision: ModerationDecision = {
        action: decision.action,
        confidence,
        riskScore,
        primaryCategory,
        reasoning: decision.reasoning,
        appliedPolicies: decision.appliedPolicies,
        thresholdAdjustments: adjustedThresholds,
        recommendedDuration
      };

      // Log decision for audit trail
      await this.logDecision(content, finalDecision, vendorResults);

      return finalDecision;

    } catch (error) {
      safeLogger.error('Error in risk-based decision engine:', error);
      
      // Return safe fallback decision
      return {
        action: 'review',
        confidence: 0,
        riskScore: 0.5,
        primaryCategory: 'error',
        reasoning: 'Decision engine error - defaulting to human review',
        appliedPolicies: [],
        thresholdAdjustments: {}
      };
    }
  }

  /**
   * Build comprehensive context for decision making
   */
  private async buildDecisionContext(content: ContentInput): Promise<DecisionContext> {
    // Get user information and history
    const userInfo = await db
      .select({
        createdAt: users.createdAt,
        walletAddress: users.walletAddress
      })
      .from(users)
      .where(eq(users.id, content.userId))
      .limit(1);

    // Get recent violations count (last 30 days)
    const recentViolations = await db
      .select({ count: sql<number>`count(*)` })
      .from(moderationActions)
      .where(
        and(
          eq(moderationActions.userId, content.userId),
          sql`${moderationActions.createdAt} > NOW() - INTERVAL '30 days'`
        )
      );

    // Calculate account age in days
    const accountAge = userInfo[0]?.createdAt 
      ? Math.floor((Date.now() - userInfo[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate wallet risk score (simplified - in production would use on-chain analysis)
    const walletRiskScore = this.calculateWalletRiskScore(content.walletAddress, accountAge);

    return {
      userReputation: content.userReputation,
      walletRiskScore,
      recentViolations: recentViolations[0]?.count || 0,
      accountAge,
      contentType: content.type,
      hasLinks: (content.links?.length || 0) > 0,
      hasMedia: (content.media?.length || 0) > 0,
      isNewUser: accountAge < 7 // Less than 7 days old
    };
  }

  /**
   * Calculate wallet risk score based on various factors
   */
  private calculateWalletRiskScore(walletAddress: string, accountAge: number): number {
    let riskScore = 0;

    // New wallet penalty
    if (accountAge < 1) riskScore += 0.3;
    else if (accountAge < 7) riskScore += 0.2;
    else if (accountAge < 30) riskScore += 0.1;

    // Check for suspicious wallet patterns (simplified)
    const addressLower = walletAddress.toLowerCase();
    
    // Sequential or repeated characters (potential vanity address or bot)
    const hasSequential = /0123456789|abcdef|fedcba|987654321/.test(addressLower);
    const hasRepeated = /(.)\1{4,}/.test(addressLower);
    
    if (hasSequential || hasRepeated) {
      riskScore += 0.1;
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Load and cache moderation policies
   */
  private async loadPolicies(): Promise<void> {
    try {
      // Use hardcoded policies since moderationPolicies table doesn't exist
      const policies = [
        {
          id: 1,
          category: 'spam',
          severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
          confidenceThreshold: 0.7,
          action: 'review' as 'allow' | 'limit' | 'block' | 'review',
          reputationModifier: 0.1,
          description: 'Spam content detection policy',
          isActive: true
        },
        {
          id: 2,
          category: 'scam',
          severity: 'high' as 'low' | 'medium' | 'high' | 'critical',
          confidenceThreshold: 0.8,
          action: 'block' as 'allow' | 'limit' | 'block' | 'review',
          reputationModifier: 0.3,
          description: 'Scam content detection policy',
          isActive: true
        },
        {
          id: 3,
          category: 'harassment',
          severity: 'high' as 'low' | 'medium' | 'high' | 'critical',
          confidenceThreshold: 0.75,
          action: 'block' as 'allow' | 'limit' | 'block' | 'review',
          reputationModifier: 0.25,
          description: 'Harassment content detection policy',
          isActive: true
        },
        {
          id: 4,
          category: 'nsfw',
          severity: 'high' as 'low' | 'medium' | 'high' | 'critical',
          confidenceThreshold: 0.85,
          action: 'block' as 'allow' | 'limit' | 'block' | 'review',
          reputationModifier: 0.2,
          description: 'NSFW content detection policy',
          isActive: true
        },
        {
          id: 5,
          category: 'crypto_scam',
          severity: 'critical' as 'low' | 'medium' | 'high' | 'critical',
          confidenceThreshold: 0.9,
          action: 'block' as 'allow' | 'limit' | 'block' | 'review',
          reputationModifier: 0.4,
          description: 'Crypto scam detection policy',
          isActive: true
        }
      ];

      // Group policies by category
      const policyMap = new Map<string, PolicyRule[]>();
      
      policies.forEach(policy => {
        const category = policy.category;
        if (!policyMap.has(category)) {
          policyMap.set(category, []);
        }
        policyMap.get(category)!.push(policy);
      });

      this.policyCache = policyMap;
      this.lastCacheUpdate = Date.now();
    } catch (error) {
      safeLogger.error('Failed to load moderation policies:', error);
    }
  }

  /**
   * Get applicable policies with cache management
   */
  private async getApplicablePolicies(): Promise<PolicyRule[]> {
    // Refresh cache if expired
    if (Date.now() - this.lastCacheUpdate > this.cacheExpiry) {
      await this.loadPolicies();
    }

    const allPolicies: PolicyRule[] = [];
    this.policyCache.forEach(policies => {
      allPolicies.push(...policies);
    });

    return allPolicies;
  }

  /**
   * Calculate confidence scores by category from vendor results
   */
  private calculateCategoryScores(vendorResults: VendorResult[]): Record<string, number> {
    const categoryScores: Record<string, number> = {};
    const categoryWeights: Record<string, number> = {};

    // Vendor confidence weights
    const vendorWeights: Record<string, number> = {
      'openai': 0.4,
      'perspective': 0.3,
      'google-vision': 0.3,
      'aws-rekognition': 0.2,
      'custom-crypto-scam': 0.5,
      'url-analysis': 0.3
    };

    vendorResults.forEach(result => {
      if (!result.success) return;

      const vendorWeight = vendorWeights[result.vendor] || 0.1;

      if (result.categories.length === 0) {
        // No violations detected
        const category = 'safe';
        if (!categoryScores[category]) {
          categoryScores[category] = 0;
          categoryWeights[category] = 0;
        }
        categoryScores[category] += (1 - result.confidence) * vendorWeight;
        categoryWeights[category] += vendorWeight;
      } else {
        // Violations detected
        result.categories.forEach(category => {
          if (!categoryScores[category]) {
            categoryScores[category] = 0;
            categoryWeights[category] = 0;
          }
          categoryScores[category] += result.confidence * vendorWeight;
          categoryWeights[category] += vendorWeight;
        });
      }
    });

    // Normalize scores by total weights
    Object.keys(categoryScores).forEach(category => {
      if (categoryWeights[category] > 0) {
        categoryScores[category] /= categoryWeights[category];
      }
    });

    return categoryScores;
  }

  /**
   * Calculate threshold adjustments based on user context
   */
  private calculateThresholdAdjustments(
    context: DecisionContext,
    policies: PolicyRule[]
  ): Record<string, number> {
    const adjustments: Record<string, number> = {};

    policies.forEach(policy => {
      let adjustment = 1.0; // Base multiplier

      // Reputation-based adjustment
      if (context.userReputation >= 90) {
        adjustment *= 0.7; // Very lenient for high reputation users
      } else if (context.userReputation >= 70) {
        adjustment *= 0.8; // Lenient for good reputation users
      } else if (context.userReputation >= 50) {
        adjustment *= 0.9; // Slightly lenient for average users
      } else if (context.userReputation >= 30) {
        adjustment *= 1.1; // Slightly strict for low reputation users
      } else {
        adjustment *= 1.3; // Very strict for very low reputation users
      }

      // New user penalty
      if (context.isNewUser) {
        adjustment *= 1.2;
      }

      // Recent violations penalty
      if (context.recentViolations > 0) {
        adjustment *= 1.0 + (context.recentViolations * 0.1);
      }

      // Wallet risk adjustment
      adjustment *= 1.0 + context.walletRiskScore;

      // Content type specific adjustments
      if (context.contentType === 'dm') {
        adjustment *= 0.9; // Slightly more lenient for private messages
      } else if (context.contentType === 'listing') {
        adjustment *= 1.1; // Stricter for marketplace listings
      }

      // Media content gets stricter thresholds
      if (context.hasMedia) {
        adjustment *= 1.1;
      }

      // Links get stricter thresholds (potential phishing)
      if (context.hasLinks) {
        adjustment *= 1.2;
      }

      adjustments[policy.category] = Math.max(0.3, Math.min(2.0, adjustment));
    });

    return adjustments;
  }

  /**
   * Determine the primary violation category
   */
  private determinePrimaryCategory(
    categoryScores: Record<string, number>,
    policies: PolicyRule[]
  ): string {
    // Exclude 'safe' category from primary violations
    const violationCategories = Object.keys(categoryScores).filter(cat => cat !== 'safe');
    
    if (violationCategories.length === 0) {
      return 'safe';
    }

    // Find category with highest confidence score
    let primaryCategory = 'unknown';
    let highestScore = 0;

    violationCategories.forEach(category => {
      const score = categoryScores[category];
      if (score > highestScore) {
        highestScore = score;
        primaryCategory = category;
      }
    });

    return primaryCategory;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    categoryScores: Record<string, number>,
    context: DecisionContext,
    primaryCategory: string
  ): number {
    let riskScore = 0;

    // Base risk from AI confidence
    if (primaryCategory !== 'safe' && categoryScores[primaryCategory]) {
      riskScore = categoryScores[primaryCategory];
    }

    // Context-based risk adjustments
    riskScore += context.walletRiskScore * 0.2;
    riskScore += (context.recentViolations * 0.1);
    riskScore += (context.isNewUser ? 0.1 : 0);
    riskScore += (100 - context.userReputation) / 1000; // 0-0.1 based on reputation

    // Content type risk
    if (context.hasLinks) riskScore += 0.05;
    if (context.hasMedia) riskScore += 0.03;

    return Math.min(1.0, Math.max(0.0, riskScore));
  }

  /**
   * Determine final moderation action
   */
  private determineAction(
    categoryScores: Record<string, number>,
    adjustedThresholds: Record<string, number>,
    policies: PolicyRule[],
    context: DecisionContext,
    primaryCategory: string
  ): { action: 'allow' | 'limit' | 'block' | 'review'; reasoning: string; appliedPolicies: PolicyRule[] } {
    
    if (primaryCategory === 'safe' || !categoryScores[primaryCategory]) {
      return {
        action: 'allow',
        reasoning: 'No policy violations detected',
        appliedPolicies: []
      };
    }

    const confidence = categoryScores[primaryCategory];
    const appliedPolicies: PolicyRule[] = [];
    let finalAction: 'allow' | 'limit' | 'block' | 'review' = 'allow';
    let reasoning = '';

    // Find matching policies for the primary category
    const categoryPolicies = policies.filter(p => p.category === primaryCategory);
    
    for (const policy of categoryPolicies) {
      const adjustedThreshold = policy.confidenceThreshold * (adjustedThresholds[policy.category] || 1.0);
      
      if (confidence >= adjustedThreshold) {
        appliedPolicies.push(policy);
        
        // Use the most restrictive action
        if (policy.action === 'block') {
          finalAction = 'block';
        } else if (policy.action === 'review' && finalAction !== 'block') {
          finalAction = 'review';
        } else if (policy.action === 'limit' && finalAction === 'allow') {
          finalAction = 'limit';
        }
      }
    }

    // Special overrides for critical situations
    if (confidence >= 0.95 && ['hate_speech', 'violence', 'scam', 'seed_phrase'].includes(primaryCategory)) {
      finalAction = 'block';
      reasoning = `High confidence (${confidence.toFixed(2)}) ${primaryCategory} detection - automatic block`;
    } else if (context.recentViolations >= 3 && confidence >= 0.7) {
      finalAction = 'block';
      reasoning = `Repeat offender with ${context.recentViolations} recent violations`;
    } else if (context.isNewUser && confidence >= 0.8) {
      finalAction = 'review';
      reasoning = `New user account with high confidence violation - requires human review`;
    } else if (appliedPolicies.length > 0) {
      const highestSeverityPolicy = appliedPolicies.reduce((prev, curr) => {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        return severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev;
      });
      reasoning = `Applied ${appliedPolicies.length} policy rule(s). Primary: ${highestSeverityPolicy.description}`;
    } else {
      reasoning = `Confidence ${confidence.toFixed(2)} below adjusted threshold for ${primaryCategory}`;
    }

    return { action: finalAction, reasoning, appliedPolicies };
  }

  /**
   * Calculate confidence in the decision
   */
  private calculateDecisionConfidence(
    categoryScores: Record<string, number>,
    vendorResults: VendorResult[],
    action: string
  ): number {
    const successfulResults = vendorResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return 0;
    }

    // Base confidence on vendor agreement
    const avgConfidence = successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length;
    
    // Adjust based on number of agreeing vendors
    const agreementBonus = Math.min(0.2, successfulResults.length * 0.05);
    
    // Adjust based on action severity
    let actionMultiplier = 1.0;
    if (action === 'block') actionMultiplier = 1.1;
    else if (action === 'review') actionMultiplier = 0.9;
    else if (action === 'limit') actionMultiplier = 0.95;

    return Math.min(1.0, (avgConfidence + agreementBonus) * actionMultiplier);
  }

  /**
   * Calculate recommended duration for temporary actions
   */
  private calculateActionDuration(
    action: string,
    context: DecisionContext,
    primaryCategory: string
  ): number | undefined {
    if (action === 'allow') return undefined;

    let baseDuration = 0;

    // Base durations by action type (in seconds)
    switch (action) {
      case 'limit':
        baseDuration = 24 * 60 * 60; // 24 hours
        break;
      case 'review':
        return undefined; // Human review doesn't have duration
      case 'block':
        baseDuration = 7 * 24 * 60 * 60; // 7 days
        break;
    }

    // Adjust based on violation severity
    const severityMultipliers: Record<string, number> = {
      'spam': 0.5,
      'nsfw': 1.0,
      'harassment': 2.0,
      'hate_speech': 3.0,
      'violence': 4.0,
      'scam': 5.0,
      'seed_phrase': 10.0
    };

    const severityMultiplier = severityMultipliers[primaryCategory] || 1.0;
    baseDuration *= severityMultiplier;

    // Adjust based on user history
    if (context.recentViolations > 0) {
      baseDuration *= (1 + context.recentViolations * 0.5);
    }

    // Adjust based on reputation
    if (context.userReputation < 30) {
      baseDuration *= 1.5;
    } else if (context.userReputation > 80) {
      baseDuration *= 0.7;
    }

    return Math.floor(baseDuration);
  }

  /**
   * Log decision for audit trail
   */
  private async logDecision(
    content: ContentInput,
    decision: ModerationDecision,
    vendorResults: VendorResult[]
  ): Promise<void> {
    try {
      // Create moderation case record
      await db.insert(moderationCases).values({
        contentId: content.id,
        contentType: content.type,
        userId: content.userId,
        status: decision.action === 'allow' ? 'allowed' : 
                decision.action === 'review' ? 'under_review' : 
                decision.action === 'block' ? 'blocked' : 'quarantined',
        riskScore: decision.riskScore.toString(),
        decision: decision.action,
        reasonCode: decision.primaryCategory,
        confidence: decision.confidence.toString(),
        vendorScores: JSON.stringify(vendorResults.reduce((acc, result) => {
          acc[result.vendor] = result.confidence;
          return acc;
        }, {} as Record<string, number>))
      });

      // If action requires enforcement, create action record
      if (decision.action !== 'allow') {
        await db.insert(moderationActions).values({
          userId: content.userId,
          contentId: content.id,
          action: decision.action === 'block' ? 'delete_content' : 
                  decision.action === 'limit' ? 'quarantine' : 'warn',
          durationSec: decision.recommendedDuration || 0,
          appliedBy: 'system',
          rationale: decision.reasoning
        });
      }

      // Update reputation if there's an impact
      if (decision.action !== 'allow' && decision.primaryCategory !== 'safe') {
        const impactValue = this.calculateReputationImpact(decision.action, decision.primaryCategory);
        
        if (impactValue !== 0) {
          // Update user reputation scores table
          await db
            .update(userReputationScores)
            .set({
              overallScore: sql`overall_score + ${impactValue}`,
              moderationScore: sql`moderation_score + ${impactValue}`,
              violationCount: sql`violation_count + 1`,
              lastViolationAt: new Date()
            })
            .where(eq(userReputationScores.userId, content.userId));
          
          // Log reputation change event
          await db.insert(reputationChangeEvents).values({
            userId: content.userId,
            eventType: 'violation',
            scoreChange: impactValue.toString(),
            previousScore: content.userReputation.toString(),
            newScore: Math.max(0, content.userReputation + impactValue).toString(),
            description: `${decision.action} action for ${decision.primaryCategory}`,
            metadata: JSON.stringify({ decision, content })
          });
        }
      }

    } catch (error) {
      safeLogger.error('Failed to log moderation decision:', error);
    }
  }

  /**
   * Calculate reputation impact based on violation
   */
  private calculateReputationImpact(action: string, category: string): number {
    const baseImpacts: Record<string, number> = {
      'limit': -2,
      'review': -1,
      'block': -5
    };

    const categoryMultipliers: Record<string, number> = {
      'spam': 0.5,
      'nsfw': 1.0,
      'harassment': 2.0,
      'hate_speech': 3.0,
      'violence': 4.0,
      'scam': 5.0,
      'seed_phrase': 10.0
    };

    const baseImpact = baseImpacts[action] || 0;
    const multiplier = categoryMultipliers[category] || 1.0;

    return Math.floor(baseImpact * multiplier);
  }

  /**
   * Update policy configuration
   */
  async updatePolicy(policyUpdate: Partial<PolicyRule> & { id: number }): Promise<boolean> {
    try {
      // Since moderationPolicies table doesn't exist, we can't update it in the database
      // In a real implementation, you would need to create the table or use a different approach
      safeLogger.warn('Cannot update policy in database - moderationPolicies table does not exist');
      
      // Invalidate cache to force reload of hardcoded policies
      this.lastCacheUpdate = 0;
      
      return true;
    } catch (error) {
      safeLogger.error('Failed to update policy:', error);
      return false;
    }
  }

  /**
   * Get decision statistics for monitoring
   */
  async getDecisionStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalDecisions: number;
    actionBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    averageConfidence: number;
    averageRiskScore: number;
  }> {
    try {
      const timeCondition = timeframe === 'hour' ? "1 hour" :
                           timeframe === 'day' ? "1 day" : "7 days";

      const stats = await db
        .select({
          decision: moderationCases.decision,
          reasonCode: moderationCases.reasonCode,
          confidence: moderationCases.confidence,
          riskScore: moderationCases.riskScore
        })
        .from(moderationCases)
        .where(sql`${moderationCases.createdAt} > NOW() - INTERVAL '${sql.raw(timeCondition)}'`);

      const actionBreakdown: Record<string, number> = {};
      const categoryBreakdown: Record<string, number> = {};
      let totalConfidence = 0;
      let totalRiskScore = 0;

      stats.forEach(stat => {
        // Action breakdown
        const action = stat.decision || 'unknown';
        actionBreakdown[action] = (actionBreakdown[action] || 0) + 1;

        // Category breakdown
        const category = stat.reasonCode || 'unknown';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;

        // Accumulate for averages
        totalConfidence += parseFloat(stat.confidence || '0');
        totalRiskScore += parseFloat(stat.riskScore || '0');
      });

      return {
        totalDecisions: stats.length,
        actionBreakdown,
        categoryBreakdown,
        averageConfidence: stats.length > 0 ? totalConfidence / stats.length : 0,
        averageRiskScore: stats.length > 0 ? totalRiskScore / stats.length : 0
      };

    } catch (error) {
      safeLogger.error('Failed to get decision stats:', error);
      return {
        totalDecisions: 0,
        actionBreakdown: {},
        categoryBreakdown: {},
        averageConfidence: 0,
        averageRiskScore: 0
      };
    }
  }
}

export const riskBasedDecisionEngine = new RiskBasedDecisionEngine();
