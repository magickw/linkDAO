/**
 * Dynamic Prioritization Engine
 * Implements real-time reordering based on market conditions
 * Requirements: 4.1, 4.2, 4.3
 */

import {
  PaymentMethod,
  PaymentMethodType,
  PrioritizedPaymentMethod,
  MarketConditions,
  NetworkConditions,
  PrioritizationContext,
  CostEstimate
} from '../types/paymentPrioritization';
import { PaymentMethodScoringSystem, ScoringComponents } from './paymentMethodScoringSystem';
import { ICostEffectivenessCalculator } from './paymentMethodPrioritizationService';

export interface PrioritizationCache {
  key: string;
  prioritizedMethods: PrioritizedPaymentMethod[];
  timestamp: Date;
  marketConditionsHash: string;
  ttl: number; // Time to live in milliseconds
}

export interface ThresholdAdjustment {
  methodType: PaymentMethodType;
  originalPriority: number;
  adjustedPriority: number;
  reason: string;
  adjustment: number;
}

export interface DynamicPrioritizationResult {
  prioritizedMethods: PrioritizedPaymentMethod[];
  adjustments: ThresholdAdjustment[];
  cacheHit: boolean;
  processingTimeMs: number;
  marketConditionsChanged: boolean;
}

export class DynamicPrioritizationEngine {
  private scoringSystem: PaymentMethodScoringSystem;
  private costCalculator: ICostEffectivenessCalculator;
  private cache: Map<string, PrioritizationCache> = new Map();
  private readonly CACHE_TTL_MS = 30000; // 30 seconds cache TTL
  private readonly GAS_SPIKE_THRESHOLD = 2.0; // 2x normal gas price
  private readonly NETWORK_CONGESTION_THRESHOLD = 0.8; // 80% congestion threshold
  private readonly COST_CHANGE_THRESHOLD = 0.1; // 10% cost change threshold

  constructor(
    scoringSystem: PaymentMethodScoringSystem,
    costCalculator: ICostEffectivenessCalculator
  ) {
    this.scoringSystem = scoringSystem;
    this.costCalculator = costCalculator;
  }  /**

   * Perform dynamic prioritization with real-time market condition adjustments
   */
  async performDynamicPrioritization(
    context: PrioritizationContext,
    currentMethods?: PrioritizedPaymentMethod[]
  ): Promise<DynamicPrioritizationResult> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first
    const cachedResult = this.getCachedResult(cacheKey, context.marketConditions);
    if (cachedResult) {
      return {
        prioritizedMethods: cachedResult.prioritizedMethods,
        adjustments: [],
        cacheHit: true,
        processingTimeMs: Date.now() - startTime,
        marketConditionsChanged: false
      };
    }

    // Detect market condition changes
    const marketConditionsChanged = currentMethods ? 
      this.detectMarketConditionChanges(currentMethods, context.marketConditions) : false;

    // Calculate new prioritization
    const prioritizedMethods = await this.calculateDynamicPrioritization(context);
    
    // Apply threshold-based adjustments
    const adjustments = this.applyThresholdAdjustments(prioritizedMethods, context);
    
    // Update cache
    this.updateCache(cacheKey, prioritizedMethods, context.marketConditions);
    
    return {
      prioritizedMethods,
      adjustments,
      cacheHit: false,
      processingTimeMs: Date.now() - startTime,
      marketConditionsChanged
    };
  }

  /**
   * Update existing prioritization based on new market conditions
   */
  async updatePrioritization(
    currentMethods: PrioritizedPaymentMethod[],
    newMarketConditions: MarketConditions
  ): Promise<PrioritizedPaymentMethod[]> {
    const updatedMethods = await Promise.all(
      currentMethods.map(async (prioritizedMethod) => {
        const networkCondition = newMarketConditions.gasConditions.find(
          gc => gc.chainId === prioritizedMethod.method.chainId
        );

        if (!networkCondition) {
          return prioritizedMethod; // No update if no network condition
        }

        // Recalculate cost estimate with new conditions
        const updatedCostEstimate = await this.costCalculator.calculateTransactionCost(
          prioritizedMethod.method,
          prioritizedMethod.costEstimate.baseCost,
          networkCondition
        );

        // Recalculate scoring components
        const context: PrioritizationContext = {
          userContext: {
            chainId: prioritizedMethod.method.chainId || 1,
            preferences: {
              preferredMethods: [],
              avoidedMethods: [],
              maxGasFeeThreshold: 25,
              preferStablecoins: true,
              preferFiat: false,
              lastUsedMethods: [],
              autoSelectBestOption: true
            },
            walletBalances: []
          },
          transactionAmount: prioritizedMethod.costEstimate.baseCost,
          transactionCurrency: 'USD',
          marketConditions: newMarketConditions,
          availablePaymentMethods: [prioritizedMethod.method]
        };

        const newScoringComponents = await this.scoringSystem.calculateMethodScore(
          prioritizedMethod.method,
          context,
          updatedCostEstimate
        );

        const updatedPrioritizedMethod: PrioritizedPaymentMethod = {
          ...prioritizedMethod,
          costEstimate: updatedCostEstimate,
          totalScore: newScoringComponents.totalScore,
          availabilityStatus: this.determineAvailabilityStatus(
            prioritizedMethod.method,
            updatedCostEstimate
          )
        };

        return updatedPrioritizedMethod;
      })
    );

    // Re-sort by total score and update priorities
    return this.resortByScore(updatedMethods);
  }

  /**
   * Calculate dynamic prioritization from scratch
   */
  private async calculateDynamicPrioritization(
    context: PrioritizationContext
  ): Promise<PrioritizedPaymentMethod[]> {
    const methodsWithScores = await Promise.all(
      context.availablePaymentMethods.map(async (method, index) => {
        // Get network condition for this method
        const networkCondition = context.marketConditions.gasConditions.find(
          gc => gc.chainId === method.chainId
        ) || context.marketConditions.gasConditions[0]; // Fallback

        // Calculate cost estimate
        const costEstimate = await this.costCalculator.calculateTransactionCost(
          method,
          context.transactionAmount,
          networkCondition
        );

        // Calculate scoring components
        const scoringComponents = await this.scoringSystem.calculateMethodScore(
          method,
          context,
          costEstimate
        );

        const prioritizedMethod: PrioritizedPaymentMethod = {
          method,
          priority: index + 1, // Will be updated after sorting
          costEstimate,
          availabilityStatus: this.determineAvailabilityStatus(method, costEstimate),
          userPreferenceScore: scoringComponents.preferenceScore,
          recommendationReason: this.generateRecommendationReason(method, scoringComponents),
          totalScore: scoringComponents.totalScore,
          warnings: this.generateMethodWarnings(method, costEstimate, context),
          benefits: this.generateMethodBenefits(method, costEstimate, scoringComponents)
        };

        return prioritizedMethod;
      })
    );

    // Sort by total score and update priorities
    return this.resortByScore(methodsWithScores);
  }

  /**
   * Apply threshold-based priority adjustments
   */
  private applyThresholdAdjustments(
    methods: PrioritizedPaymentMethod[],
    context: PrioritizationContext
  ): ThresholdAdjustment[] {
    const adjustments: ThresholdAdjustment[] = [];

    methods.forEach((method, index) => {
      const originalPriority = method.priority;
      let adjustedPriority = originalPriority;
      let adjustmentReason = '';
      let adjustmentValue = 0;

      // Gas spike adjustment
      if (method.costEstimate.gasFee > 0) {
        const networkCondition = context.marketConditions.gasConditions.find(
          gc => gc.chainId === method.method.chainId
        );

        if (networkCondition && networkCondition.networkCongestion === 'high') {
          // Demote crypto methods during high congestion
          if (method.method.type !== PaymentMethodType.FIAT_STRIPE) {
            adjustmentValue = -0.2; // 20% penalty
            adjustedPriority = Math.min(methods.length, originalPriority + 2);
            adjustmentReason = 'High network congestion penalty';
          }
        }
      }

      // Cost threshold adjustment
      const costRatio = method.costEstimate.totalCost / context.transactionAmount;
      if (costRatio > 0.15) { // More than 15% cost
        adjustmentValue -= 0.3; // 30% penalty
        adjustedPriority = Math.min(methods.length, originalPriority + 3);
        adjustmentReason += (adjustmentReason ? '; ' : '') + 'High cost ratio penalty';
      }

      // User preference threshold adjustment
      if (method.userPreferenceScore > 0.8) {
        adjustmentValue += 0.1; // 10% bonus for strong preference
        adjustedPriority = Math.max(1, originalPriority - 1);
        adjustmentReason += (adjustmentReason ? '; ' : '') + 'Strong user preference bonus';
      }

      // Record adjustment if significant
      if (Math.abs(adjustmentValue) > 0.05 || adjustedPriority !== originalPriority) {
        adjustments.push({
          methodType: method.method.type,
          originalPriority,
          adjustedPriority,
          reason: adjustmentReason || 'Minor adjustment',
          adjustment: adjustmentValue
        });

        // Apply the adjustment to the method
        method.priority = adjustedPriority;
        method.totalScore = Math.max(0, Math.min(1, method.totalScore + adjustmentValue));
      }
    });

    return adjustments;
  }

  /**
   * Detect if market conditions have changed significantly
   */
  private detectMarketConditionChanges(
    currentMethods: PrioritizedPaymentMethod[],
    newMarketConditions: MarketConditions
  ): boolean {
    for (const method of currentMethods) {
      if (method.method.type === PaymentMethodType.FIAT_STRIPE) continue;

      const newNetworkCondition = newMarketConditions.gasConditions.find(
        gc => gc.chainId === method.method.chainId
      );

      if (!newNetworkCondition) continue;

      // Check for significant gas price changes
      const estimatedOldGasPrice = method.costEstimate.gasFee / 
        (method.costEstimate.breakdown.gasLimit ? Number(method.costEstimate.breakdown.gasLimit) / 1e9 : 21000);
      
      const gasPriceChange = Math.abs(newNetworkCondition.gasPriceUSD - estimatedOldGasPrice) / estimatedOldGasPrice;
      
      if (gasPriceChange > this.COST_CHANGE_THRESHOLD) {
        return true;
      }

      // Check for network congestion changes
      // This would require storing previous congestion state, simplified for now
      if (newNetworkCondition.networkCongestion === 'high') {
        return true;
      }
    }

    return false;
  }  /**

   * Cache management methods
   */
  private generateCacheKey(context: PrioritizationContext): string {
    const keyComponents = [
      context.userContext.chainId,
      context.transactionAmount,
      context.userContext.userAddress || 'anonymous',
      context.availablePaymentMethods.map(m => m.id).sort().join(',')
    ];
    
    return keyComponents.join('|');
  }

  private generateMarketConditionsHash(marketConditions: MarketConditions): string {
    const hashComponents = [
      marketConditions.lastUpdated.getTime(),
      ...marketConditions.gasConditions.map(gc => 
        `${gc.chainId}:${gc.gasPriceUSD}:${gc.networkCongestion}`
      ),
      ...marketConditions.exchangeRates.map(er => 
        `${er.fromToken}:${er.toToken}:${er.rate}`
      )
    ];
    
    return hashComponents.join('|');
  }

  private getCachedResult(
    cacheKey: string,
    currentMarketConditions: MarketConditions
  ): PrioritizationCache | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Check if market conditions have changed
    const currentHash = this.generateMarketConditionsHash(currentMarketConditions);
    if (cached.marketConditionsHash !== currentHash) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  private updateCache(
    cacheKey: string,
    prioritizedMethods: PrioritizedPaymentMethod[],
    marketConditions: MarketConditions
  ): void {
    const cacheEntry: PrioritizationCache = {
      key: cacheKey,
      prioritizedMethods: [...prioritizedMethods], // Deep copy
      timestamp: new Date(),
      marketConditionsHash: this.generateMarketConditionsHash(marketConditions),
      ttl: this.CACHE_TTL_MS
    };

    this.cache.set(cacheKey, cacheEntry);

    // Clean up old cache entries
    this.cleanupCache();
  }

  private cleanupCache(): void {
    const now = Date.now();
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Utility methods
   */
  private resortByScore(methods: PrioritizedPaymentMethod[]): PrioritizedPaymentMethod[] {
    return methods
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((method, index) => {
        const prioritizedMethod: PrioritizedPaymentMethod = {
          ...method,
          priority: index + 1
        };
        return prioritizedMethod;
      });
  }

  private determineAvailabilityStatus(
    method: PaymentMethod,
    costEstimate: CostEstimate
  ): any {
    // Import the enum value - simplified for now
    return 'available'; // Would use proper AvailabilityStatus enum
  }

  private generateRecommendationReason(
    method: PaymentMethod,
    scoringComponents: ScoringComponents
  ): string {
    if (method.type === PaymentMethodType.STABLECOIN_USDC) {
      if (scoringComponents.costScore > 0.8) {
        return 'Recommended: Low cost and stable value';
      }
      return 'Stable value with reasonable costs';
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return 'No gas fees and familiar payment experience';
    }

    if (scoringComponents.totalScore > 0.8) {
      return 'Highly recommended based on current conditions';
    }

    return 'Good option for current transaction';
  }

  private generateMethodWarnings(
    method: PaymentMethod,
    costEstimate: CostEstimate,
    context: PrioritizationContext
  ): string[] {
    const warnings: string[] = [];

    if (costEstimate.gasFee > 25) {
      warnings.push(`High gas fees: $${costEstimate.gasFee.toFixed(2)}`);
    }

    if (costEstimate.confidence < 0.7) {
      warnings.push('Cost estimate has low confidence');
    }

    const costRatio = costEstimate.totalCost / context.transactionAmount;
    if (costRatio > 0.1) {
      warnings.push(`High transaction cost: ${(costRatio * 100).toFixed(1)}% of amount`);
    }

    return warnings;
  }

  private generateMethodBenefits(
    method: PaymentMethod,
    costEstimate: CostEstimate,
    scoringComponents: ScoringComponents
  ): string[] {
    const benefits: string[] = [];

    if (method.type === PaymentMethodType.STABLECOIN_USDC) {
      benefits.push('Price stability');
      if (scoringComponents.stablecoinBonus > 0) {
        benefits.push('Stablecoin optimization bonus');
      }
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      benefits.push('No gas fees');
      benefits.push('Instant processing');
    }

    if (costEstimate.gasFee < 5) {
      benefits.push('Very low transaction fees');
    }

    if (scoringComponents.networkOptimizationScore > 0.8) {
      benefits.push('Optimal network conditions');
    }

    return benefits;
  }

  /**
   * Performance and monitoring methods
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const entries = Array.from(this.cache.values());
    
    return {
      size: this.cache.size,
      hitRate: 0, // Would track this in production
      oldestEntry: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.timestamp.getTime()))) : null,
      newestEntry: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.timestamp.getTime()))) : null
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  setCacheTTL(ttlMs: number): void {
    // Would update TTL for future cache entries
  }
}

export default DynamicPrioritizationEngine;