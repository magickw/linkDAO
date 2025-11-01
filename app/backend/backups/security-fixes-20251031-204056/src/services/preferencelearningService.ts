/**
 * Preference Learning Service
 * Implements machine learning algorithms for payment method preference learning
 */

import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { paymentMethodUsageHistory, paymentMethodPreferences } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { UserPreferences, PaymentMethodPreference } from './userPreferenceService';
import { safeLogger } from '../utils/safeLogger';

export interface LearningContext {
  userId: string;
  transactionAmount: number;
  currency: string;
  networkId?: number;
  gasFeeUsd?: number;
  totalCostUsd?: number;
  marketConditions?: {
    gasPrice?: number;
    ethPrice?: number;
    networkCongestion?: 'low' | 'medium' | 'high';
    timeOfDay?: number; // 0-23
    dayOfWeek?: number; // 0-6
  };
}

export interface PreferencePattern {
  methodType: string;
  conditions: {
    amountRange?: { min: number; max: number };
    gasFeeThreshold?: number;
    networkIds?: number[];
    timePatterns?: { hours: number[]; days: number[] };
  };
  confidence: number;
  frequency: number;
}

export class PreferenceLearningService {
  private readonly LEARNING_RATE = 0.1;
  private readonly DECAY_FACTOR = 0.95; // How much old preferences decay over time
  private readonly MIN_TRANSACTIONS_FOR_LEARNING = 3;
  private readonly CONFIDENCE_THRESHOLD = 0.6;
  private readonly PATTERN_ANALYSIS_DAYS = 90;

  /**
   * Analyze user payment patterns and update preference scores
   */
  async analyzeAndUpdatePreferences(userId: string): Promise<UserPreferences> {
    try {
      // Get historical usage data
      const usageHistory = await this.getUserUsageHistory(userId, this.PATTERN_ANALYSIS_DAYS);
      
      if (usageHistory.length < this.MIN_TRANSACTIONS_FOR_LEARNING) {
        // Not enough data for learning, return current preferences
        return await this.getCurrentPreferences(userId);
      }

      // Analyze patterns
      const patterns = await this.identifyPreferencePatterns(usageHistory);
      
      // Calculate updated preference scores
      const updatedPreferences = await this.calculateUpdatedPreferences(userId, patterns, usageHistory);
      
      // Apply temporal decay to old preferences
      const decayedPreferences = this.applyTemporalDecay(updatedPreferences);
      
      // Save updated preferences
      await this.saveUpdatedPreferences(userId, decayedPreferences);
      
      return decayedPreferences;
    } catch (error) {
      safeLogger.error('Error analyzing and updating preferences:', error);
      throw error;
    }
  }

  /**
   * Predict preferred payment method for given context
   */
  async predictPreferredMethod(
    userId: string,
    availableMethods: string[],
    context: LearningContext
  ): Promise<{
    recommendedMethod: string;
    confidence: number;
    reasoning: string[];
  }> {
    try {
      const preferences = await this.getCurrentPreferences(userId);
      const patterns = await this.getRelevantPatterns(userId, context);
      
      // Score each available method
      const methodScores = await Promise.all(
        availableMethods.map(async (method) => {
          const score = await this.calculateContextualScore(method, context, preferences, patterns);
          return { method, score };
        })
      );

      // Sort by score and get the best method
      methodScores.sort((a, b) => b.score.total - a.score.total);
      const bestMethod = methodScores[0];

      return {
        recommendedMethod: bestMethod.method,
        confidence: bestMethod.score.confidence,
        reasoning: bestMethod.score.reasoning
      };
    } catch (error) {
      safeLogger.error('Error predicting preferred method:', error);
      throw error;
    }
  }

  /**
   * Track user selection and update learning model
   */
  async trackUserSelection(
    userId: string,
    selectedMethod: string,
    availableMethods: string[],
    context: LearningContext,
    wasRecommended: boolean
  ): Promise<void> {
    try {
      // Record the selection
      await this.recordSelection(userId, selectedMethod, context, wasRecommended);
      
      // Update preference scores based on selection
      await this.updatePreferenceScores(userId, selectedMethod, availableMethods, context, wasRecommended);
      
      // If enough new data, retrain the model
      const recentSelections = await this.getRecentSelections(userId, 10);
      if (recentSelections.length >= 5) {
        await this.analyzeAndUpdatePreferences(userId);
      }
    } catch (error) {
      safeLogger.error('Error tracking user selection:', error);
      throw error;
    }
  }

  /**
   * Identify preference patterns from usage history
   */
  private async identifyPreferencePatterns(usageHistory: any[]): Promise<PreferencePattern[]> {
    const patterns: PreferencePattern[] = [];
    const methodGroups = this.groupByMethod(usageHistory);

    for (const [methodType, transactions] of Object.entries(methodGroups)) {
      const pattern = this.analyzeMethodPattern(methodType, transactions as any[]);
      if (pattern.confidence >= this.CONFIDENCE_THRESHOLD) {
        patterns.push(pattern);
      }
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze pattern for a specific payment method
   */
  private analyzeMethodPattern(methodType: string, transactions: any[]): PreferencePattern {
    const pattern: PreferencePattern = {
      methodType,
      conditions: {},
      confidence: 0,
      frequency: transactions.length
    };

    // Analyze amount patterns
    const amounts = transactions.map(t => parseFloat(t.transactionAmount || '0'));
    if (amounts.length > 0) {
      pattern.conditions.amountRange = {
        min: Math.min(...amounts),
        max: Math.max(...amounts)
      };
    }

    // Analyze gas fee patterns
    const gasFees = transactions
      .map(t => parseFloat(t.gasFeeUsd || '0'))
      .filter(fee => fee > 0);
    
    if (gasFees.length > 0) {
      pattern.conditions.gasFeeThreshold = gasFees.reduce((sum, fee) => sum + fee, 0) / gasFees.length;
    }

    // Analyze network patterns
    const networks = transactions
      .map(t => t.networkId)
      .filter(id => id !== null && id !== undefined);
    
    if (networks.length > 0) {
      pattern.conditions.networkIds = [...new Set(networks)];
    }

    // Analyze time patterns
    const timestamps = transactions.map(t => new Date(t.createdAt));
    const hours = timestamps.map(t => t.getHours());
    const days = timestamps.map(t => t.getDay());
    
    pattern.conditions.timePatterns = {
      hours: this.findCommonValues(hours),
      days: this.findCommonValues(days)
    };

    // Calculate confidence based on consistency and frequency
    const totalTransactions = transactions.length;
    const preferredTransactions = transactions.filter(t => t.wasPreferred).length;
    const consistencyScore = totalTransactions > 0 ? preferredTransactions / totalTransactions : 0;
    const frequencyScore = Math.min(1, totalTransactions / 10); // Normalize to max 10 transactions
    
    pattern.confidence = (consistencyScore * 0.7) + (frequencyScore * 0.3);

    return pattern;
  }

  /**
   * Calculate contextual score for a payment method
   */
  private async calculateContextualScore(
    methodType: string,
    context: LearningContext,
    preferences: UserPreferences,
    patterns: PreferencePattern[]
  ): Promise<{
    total: number;
    confidence: number;
    reasoning: string[];
  }> {
    const reasoning: string[] = [];
    let totalScore = 0;
    let confidence = 0.5; // Base confidence

    // Base preference score
    const basePreference = preferences.preferredMethods.find(p => p.methodType === methodType);
    const baseScore = basePreference?.preferenceScore || 0.5;
    totalScore += baseScore * 0.4;
    reasoning.push(`Base preference score: ${baseScore.toFixed(2)}`);

    // Pattern matching score
    const relevantPattern = patterns.find(p => p.methodType === methodType);
    if (relevantPattern) {
      const patternScore = this.calculatePatternMatch(relevantPattern, context);
      totalScore += patternScore * 0.3;
      confidence = Math.max(confidence, relevantPattern.confidence);
      reasoning.push(`Pattern match score: ${patternScore.toFixed(2)} (confidence: ${relevantPattern.confidence.toFixed(2)})`);
    }

    // Context-specific adjustments
    const contextScore = this.calculateContextScore(methodType, context);
    totalScore += contextScore * 0.2;
    reasoning.push(`Context adjustment: ${contextScore.toFixed(2)}`);

    // Recent usage boost
    const recentUsage = preferences.lastUsedMethods.find(m => m.methodType === methodType);
    if (recentUsage) {
      const daysSinceUse = (Date.now() - recentUsage.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 0.1 * (7 - daysSinceUse) / 7); // Boost for recent usage within 7 days
      totalScore += recencyBoost;
      reasoning.push(`Recent usage boost: ${recencyBoost.toFixed(2)}`);
    }

    // Avoided methods penalty
    if (preferences.avoidedMethods.includes(methodType)) {
      totalScore *= 0.5;
      reasoning.push('Avoided method penalty applied');
    }

    return {
      total: Math.max(0, Math.min(1, totalScore)),
      confidence,
      reasoning
    };
  }

  /**
   * Calculate how well a pattern matches the current context
   */
  private calculatePatternMatch(pattern: PreferencePattern, context: LearningContext): number {
    let matchScore = 0;
    let totalChecks = 0;

    // Amount range check
    if (pattern.conditions.amountRange) {
      totalChecks++;
      const { min, max } = pattern.conditions.amountRange;
      if (context.transactionAmount >= min && context.transactionAmount <= max) {
        matchScore += 1;
      }
    }

    // Gas fee threshold check
    if (pattern.conditions.gasFeeThreshold && context.gasFeeUsd) {
      totalChecks++;
      if (context.gasFeeUsd <= pattern.conditions.gasFeeThreshold) {
        matchScore += 1;
      }
    }

    // Network check
    if (pattern.conditions.networkIds && context.networkId) {
      totalChecks++;
      if (pattern.conditions.networkIds.includes(context.networkId)) {
        matchScore += 1;
      }
    }

    // Time pattern check
    if (pattern.conditions.timePatterns && context.marketConditions) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      if (pattern.conditions.timePatterns.hours.length > 0) {
        totalChecks++;
        if (pattern.conditions.timePatterns.hours.includes(currentHour)) {
          matchScore += 1;
        }
      }

      if (pattern.conditions.timePatterns.days.length > 0) {
        totalChecks++;
        if (pattern.conditions.timePatterns.days.includes(currentDay)) {
          matchScore += 1;
        }
      }
    }

    return totalChecks > 0 ? matchScore / totalChecks : 0.5;
  }

  /**
   * Calculate context-specific score adjustments
   */
  private calculateContextScore(methodType: string, context: LearningContext): number {
    let score = 0;

    // Gas fee considerations
    if (context.gasFeeUsd) {
      if (methodType === 'FIAT_STRIPE') {
        score += 0.2; // Fiat has no gas fees
      } else if (methodType.startsWith('STABLECOIN') && context.gasFeeUsd < 10) {
        score += 0.1; // Stablecoins are good for low gas fees
      } else if (methodType === 'NATIVE_ETH' && context.gasFeeUsd > 50) {
        score -= 0.2; // ETH is expensive with high gas fees
      }
    }

    // Amount-based preferences
    if (context.transactionAmount > 1000) {
      if (methodType === 'FIAT_STRIPE') {
        score += 0.1; // Fiat is good for large amounts
      }
    } else if (context.transactionAmount < 50) {
      if (methodType.startsWith('STABLECOIN')) {
        score += 0.1; // Stablecoins are good for small amounts
      }
    }

    // Network congestion considerations
    if (context.marketConditions?.networkCongestion === 'high') {
      if (methodType === 'FIAT_STRIPE') {
        score += 0.15; // Fiat avoids network congestion
      } else {
        score -= 0.1; // Crypto methods suffer from congestion
      }
    }

    return score;
  }

  /**
   * Apply temporal decay to preference scores
   */
  private applyTemporalDecay(preferences: UserPreferences): UserPreferences {
    const decayedPreferences = { ...preferences };
    
    decayedPreferences.preferredMethods = preferences.preferredMethods.map(method => {
      const daysSinceLastUse = method.lastUsed
        ? (Date.now() - method.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
        : 30; // Assume 30 days if no last use date

      const decayFactor = Math.pow(this.DECAY_FACTOR, daysSinceLastUse / 7); // Decay per week
      
      return {
        ...method,
        preferenceScore: method.preferenceScore * decayFactor
      };
    });

    return decayedPreferences;
  }

  // Helper methods

  private async getUserUsageHistory(userId: string, days: number): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(paymentMethodUsageHistory)
      .where(
        and(
          eq(paymentMethodUsageHistory.userId, userId),
          gte(paymentMethodUsageHistory.createdAt, cutoffDate)
        )
      )
      .orderBy(desc(paymentMethodUsageHistory.createdAt));
  }

  private async getCurrentPreferences(userId: string): Promise<UserPreferences> {
    // This would typically call the userPreferenceService
    // For now, return a basic structure
    return {
      preferredMethods: [],
      avoidedMethods: [],
      maxGasFeeThreshold: 50,
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: []
    };
  }

  private groupByMethod(transactions: any[]): Record<string, any[]> {
    return transactions.reduce((groups, transaction) => {
      const method = transaction.paymentMethodType;
      if (!groups[method]) {
        groups[method] = [];
      }
      groups[method].push(transaction);
      return groups;
    }, {});
  }

  private findCommonValues(values: number[]): number[] {
    const frequency: Record<number, number> = {};
    values.forEach(value => {
      frequency[value] = (frequency[value] || 0) + 1;
    });

    const threshold = Math.max(1, values.length * 0.3); // At least 30% frequency
    return Object.entries(frequency)
      .filter(([_, count]) => count >= threshold)
      .map(([value, _]) => parseInt(value));
  }

  private async getRelevantPatterns(userId: string, context: LearningContext): Promise<PreferencePattern[]> {
    // This would fetch and filter patterns based on context
    // For now, return empty array
    return [];
  }

  private async recordSelection(
    userId: string,
    selectedMethod: string,
    context: LearningContext,
    wasRecommended: boolean
  ): Promise<void> {
    await db.insert(paymentMethodUsageHistory).values({
      userId,
      paymentMethodType: selectedMethod,
      transactionAmount: context.transactionAmount.toString(),
      transactionCurrency: context.currency,
      gasFeeUsd: context.gasFeeUsd?.toString(),
      totalCostUsd: context.totalCostUsd?.toString(),
      networkId: context.networkId,
      wasPreferred: true, // User selected it
      wasSuggested: wasRecommended,
      contextData: context.marketConditions || {}
    });
  }

  private async updatePreferenceScores(
    userId: string,
    selectedMethod: string,
    availableMethods: string[],
    context: LearningContext,
    wasRecommended: boolean
  ): Promise<void> {
    // Update preference scores based on user selection
    // This would integrate with the userPreferenceService
    safeLogger.info('Updating preference scores for user:', userId, 'method:', selectedMethod);
  }

  private async getRecentSelections(userId: string, limit: number): Promise<any[]> {
    return await db
      .select()
      .from(paymentMethodUsageHistory)
      .where(eq(paymentMethodUsageHistory.userId, userId))
      .orderBy(desc(paymentMethodUsageHistory.createdAt))
      .limit(limit);
  }

  private async calculateUpdatedPreferences(
    userId: string,
    patterns: PreferencePattern[],
    usageHistory: any[]
  ): Promise<UserPreferences> {
    // Calculate updated preferences based on patterns and history
    // This is a simplified implementation
    return {
      preferredMethods: patterns.map(p => ({
        methodType: p.methodType,
        preferenceScore: p.confidence,
        usageCount: p.frequency,
        lastUsed: new Date()
      })),
      avoidedMethods: [],
      maxGasFeeThreshold: 50,
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: []
    };
  }

  private async saveUpdatedPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    // Save updated preferences to database
    // This would integrate with the userPreferenceService
    safeLogger.info('Saving updated preferences for user:', userId);
  }
}

export const preferenceLearningService = new PreferenceLearningService();