/**
 * Payment Method Prioritization Service
 * Core service for intelligent payment method ordering and selection
 */

import {
  PaymentMethod,
  PaymentMethodType,
  PrioritizedPaymentMethod,
  PaymentMethodConfig,
  UserContext,
  PrioritizationContext,
  PrioritizationResult,
  CostEstimate,
  AvailabilityStatus,
  MarketConditions,
  NetworkConditions,
  UserPreferences,
  DEFAULT_PAYMENT_METHOD_CONFIGS,
  PrioritizationRecommendation,
  PrioritizationWarning,
  CostComparison
} from '../types/paymentPrioritization';
import PaymentMethodScoringSystem from './paymentMethodScoringSystem';
import DynamicPrioritizationEngine from './dynamicPrioritizationEngine';
import StablecoinPrioritizationRules from './stablecoinPrioritizationRules';
import { prioritizationPerformanceOptimizer } from './prioritizationPerformanceOptimizer';
import { intelligentCacheService } from './intelligentCacheService';

export interface IPaymentMethodPrioritizationService {
  prioritizePaymentMethods(context: PrioritizationContext): Promise<PrioritizationResult>;
  updatePrioritization(
    currentMethods: PrioritizedPaymentMethod[],
    marketConditions: MarketConditions
  ): Promise<PrioritizedPaymentMethod[]>;
  getDefaultPaymentMethod(prioritizedMethods: PrioritizedPaymentMethod[]): PrioritizedPaymentMethod | null;
  calculateMethodScore(
    method: PaymentMethod,
    context: PrioritizationContext,
    costEstimate: CostEstimate
  ): Promise<number>;
}

export interface ICostEffectivenessCalculator {
  calculateTransactionCost(
    paymentMethod: PaymentMethod,
    amount: number,
    networkConditions: NetworkConditions
  ): Promise<CostEstimate>;
  comparePaymentMethods(
    methods: PaymentMethod[],
    amount: number,
    networkConditions: NetworkConditions[]
  ): Promise<CostComparison[]>;
  isGasFeeAcceptable(
    gasEstimate: CostEstimate,
    threshold: number
  ): boolean;
}

export interface INetworkAvailabilityChecker {
  getAvailablePaymentMethods(chainId: number): Promise<PaymentMethod[]>;
  isPaymentMethodSupported(method: PaymentMethod, chainId: number): boolean;
  getSupportedNetworks(method: PaymentMethod): number[];
  validateNetworkCompatibility(
    methods: PaymentMethod[],
    chainId: number
  ): Promise<{ method: PaymentMethod; isSupported: boolean; alternativeNetworks?: number[] }[]>;
}

export interface IUserPreferenceManager {
  getUserPaymentPreferences(userId: string): Promise<UserPreferences>;
  updatePaymentPreference(
    userId: string,
    method: PaymentMethodType,
    transactionContext: { amount: number; successful: boolean; chainId?: number }
  ): Promise<void>;
  calculatePreferenceScore(method: PaymentMethod, preferences: UserPreferences): number;
  getRecommendedMethod(
    availableMethods: PaymentMethod[],
    preferences: UserPreferences
  ): PaymentMethod | null;
}

export class PaymentMethodPrioritizationService implements IPaymentMethodPrioritizationService {
  private configs: Record<PaymentMethodType, PaymentMethodConfig>;
  private costCalculator: ICostEffectivenessCalculator;
  private networkChecker: INetworkAvailabilityChecker;
  private preferenceManager: IUserPreferenceManager;
  private scoringSystem: PaymentMethodScoringSystem;
  private dynamicEngine: DynamicPrioritizationEngine;
  private stablecoinRules: StablecoinPrioritizationRules;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly MAX_FAILURES = 5;
  private readonly FAILURE_RESET_TIME = 5 * 60 * 1000; // 5 minutes

  constructor(
    costCalculator: ICostEffectivenessCalculator,
    networkChecker: INetworkAvailabilityChecker,
    preferenceManager: IUserPreferenceManager,
    configs?: Record<PaymentMethodType, PaymentMethodConfig>
  ) {
    this.configs = configs || DEFAULT_PAYMENT_METHOD_CONFIGS;
    this.costCalculator = costCalculator;
    this.networkChecker = networkChecker;
    this.preferenceManager = preferenceManager;

    // Initialize new core components
    this.scoringSystem = new PaymentMethodScoringSystem(this.configs);
    this.dynamicEngine = new DynamicPrioritizationEngine(this.scoringSystem, this.costCalculator);
    this.stablecoinRules = new StablecoinPrioritizationRules();
  }

  private async shouldAttemptRequest(): Promise<boolean> {
    const now = Date.now();

    // Reset failure count if enough time has passed
    if (this.lastFailureTime && (now - this.lastFailureTime) > this.FAILURE_RESET_TIME) {
      this.failureCount = 0;
      this.lastFailureTime = null;
    }

    // Prevent requests if too many failures recently
    if (this.failureCount >= this.MAX_FAILURES) {
      console.warn('Circuit breaker open: Too many recent failures');
      return false;
    }

    return true;
  }

  private async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (i < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  async prioritizePaymentMethods(context: PrioritizationContext): Promise<PrioritizationResult> {
    // Check circuit breaker
    if (!(await this.shouldAttemptRequest())) {
      throw new Error('Too many recent failures, request blocked by circuit breaker');
    }

    const startTime = Date.now();

    try {
      // Generate cache key for this prioritization context
      const contextKey = this.generatePrioritizationCacheKey(context);

      // Check intelligent cache first
      const cached = await intelligentCacheService.getCachedPrioritizationResult(contextKey);
      if (cached && this.isCacheValid(cached, context)) {
        return cached;
      }

      // Defensive check: Ensure availablePaymentMethods exists
      if (!context.availablePaymentMethods || !Array.isArray(context.availablePaymentMethods) || context.availablePaymentMethods.length === 0) {
        console.warn('No payment methods available for prioritization, returning empty result');
        // Return a safe empty result
        return {
          prioritizedMethods: [],
          defaultMethod: null,
          recommendations: [],
          warnings: [{
            type: 'service_unavailable',
            message: 'No payment methods available',
            affectedMethods: [],
            severity: 'high',
            actionRequired: 'Please refresh the page or try again later'
          }],
          metadata: {
            calculatedAt: new Date(),
            totalMethodsEvaluated: 0,
            averageConfidence: 0,
            processingTimeMs: Date.now() - startTime
          }
        };
      }

      // Use performance optimizer for parallel cost calculations with retry logic
      const costResults = await this.withRetry(() =>
        prioritizationPerformanceOptimizer.parallelCostCalculation(
          context.availablePaymentMethods,
          context.userContext,
          context.transactionAmount
        )
      );

      // Create a map of methods with costs for the dynamic engine
      const methodsWithCosts = costResults.results.map((result) => ({
        method: result.method,
        costEstimate: result.costEstimate,
        priority: 0, // Placeholder
        availabilityStatus: AvailabilityStatus.AVAILABLE, // Placeholder
        userPreferenceScore: 0, // Placeholder
        recommendationReason: '', // Placeholder
        totalScore: 0, // Placeholder
        warnings: [],
        benefits: []
      }));

      // Use the new dynamic prioritization engine with optimized cost data
      // Pass the pre-calculated costs to avoid re-fetching
      const dynamicResult = await this.withRetry(() =>
        this.dynamicEngine.performDynamicPrioritization(context, methodsWithCosts)
      );

      // Apply stablecoin prioritization rules
      const stablecoinResult = this.stablecoinRules.applyStablecoinPrioritization(
        dynamicResult.prioritizedMethods,
        context
      );

      // Use the enhanced prioritized methods
      const prioritizedMethods = (stablecoinResult?.prioritizedStablecoins?.length ?? 0) > 0
        ? this.mergeStablecoinResults(dynamicResult.prioritizedMethods, stablecoinResult)
        : dynamicResult.prioritizedMethods;

      // Generate enhanced recommendations and warnings
      const recommendations = this.generateEnhancedRecommendations(
        prioritizedMethods,
        context,
        stablecoinResult
      );
      const warnings = this.generateEnhancedWarnings(
        prioritizedMethods,
        context,
        dynamicResult
      );

      // Select default method
      const defaultMethod = this.getDefaultPaymentMethod(prioritizedMethods);

      const processingTime = Date.now() - startTime;

      const result: PrioritizationResult = {
        prioritizedMethods,
        defaultMethod,
        recommendations,
        warnings,
        metadata: {
          calculatedAt: new Date(),
          totalMethodsEvaluated: context.availablePaymentMethods.length,
          averageConfidence: this.calculateAverageConfidence(prioritizedMethods),
          processingTimeMs: processingTime
        }
      };

      // Cache the result for future use
      await this.withRetry(() =>
        prioritizationPerformanceOptimizer.cachePrioritizationResults(
          contextKey,
          prioritizedMethods,
          context.userContext
        )
      );

      // Reset failure count on success
      this.failureCount = 0;
      this.lastFailureTime = null;

      return result;
    } catch (error) {
      console.error('Error in payment method prioritization:', error);
      this.failureCount++;
      this.lastFailureTime = Date.now();
      throw new Error('Failed to prioritize payment methods');
    }
  }

  async updatePrioritization(
    currentMethods: PrioritizedPaymentMethod[],
    marketConditions: MarketConditions
  ): Promise<PrioritizedPaymentMethod[]> {
    // Use the dynamic engine for real-time updates
    return await this.dynamicEngine.updatePrioritization(currentMethods, marketConditions);
  }

  getDefaultPaymentMethod(prioritizedMethods: PrioritizedPaymentMethod[]): PrioritizedPaymentMethod | null {
    // Return the highest priority available method
    const availableMethods = prioritizedMethods.filter(
      method => method.availabilityStatus === AvailabilityStatus.AVAILABLE
    );

    if (availableMethods.length === 0) {
      return null;
    }

    // Sort by priority (lower number = higher priority) and total score
    return availableMethods.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.totalScore - a.totalScore;
    })[0];
  }

  async calculateMethodScore(
    method: PaymentMethod,
    context: PrioritizationContext,
    costEstimate: CostEstimate
  ): Promise<number> {
    // Use the new scoring system
    const scoringComponents = await this.scoringSystem.calculateMethodScore(
      method,
      context,
      costEstimate
    );

    return scoringComponents.totalScore;
  }

  private async filterAvailableMethods(
    methods: PaymentMethod[],
    chainId: number
  ): Promise<PaymentMethod[]> {
    const compatibilityResults = await this.networkChecker.validateNetworkCompatibility(
      methods,
      chainId
    );

    return compatibilityResults
      .filter(result => result.isSupported)
      .map(result => result.method);
  }

  private async calculateCostsForMethods(
    methods: PaymentMethod[],
    amount: number,
    marketConditions: MarketConditions
  ): Promise<Array<{ method: PaymentMethod; costEstimate: CostEstimate }>> {
    return Promise.all(
      methods.map(async (method) => {
        try {
          const networkCondition = marketConditions.gasConditions.find(
            gc => gc.chainId === method.chainId
          ) || marketConditions.gasConditions[0]; // Fallback to first available

          const costEstimate = await this.costCalculator.calculateTransactionCost(
            method,
            amount,
            networkCondition
          );

          return { method, costEstimate };
        } catch (error) {
          console.warn(`Failed to calculate cost for ${method.type}, using fallback:`, error);
          // Return fallback cost estimate
          // Fiat payments should have 0 gas fee
          const isFiatPayment = method.type === PaymentMethodType.FIAT_STRIPE;
          const fallbackGasFee = isFiatPayment ? 0 : 5;
          const fallbackNetworkFee = isFiatPayment ? (amount * 0.029 + 0.30) : 5; // Stripe fee for fiat

          const fallbackCostEstimate: CostEstimate = {
            totalCost: amount + fallbackGasFee + fallbackNetworkFee + (amount * 0.15),
            baseCost: amount,
            gasFee: fallbackGasFee,
            exchangeRate: 1,
            estimatedTime: isFiatPayment ? 1 : 5, // Instant for fiat
            confidence: 0.3, // Low confidence
            currency: 'USD',
            breakdown: {
              amount,
              networkFee: fallbackNetworkFee,
              platformFee: amount * 0.15 // 2.5% platform fee
            }
          };
          return { method, costEstimate: fallbackCostEstimate };
        }
      })
    );
  }

  private async scoreAndPrioritizeMethods(
    methodsWithCosts: Array<{ method: PaymentMethod; costEstimate: CostEstimate }>,
    context: PrioritizationContext
  ): Promise<PrioritizedPaymentMethod[]> {
    const scoredMethods = await Promise.all(
      methodsWithCosts.map(async ({ method, costEstimate }, index) => {
        const totalScore = await this.calculateMethodScore(method, context, costEstimate);
        const preferenceScore = this.preferenceManager.calculatePreferenceScore(
          method,
          context.userContext.preferences
        );
        const availabilityStatus = this.determineAvailabilityStatus(method, costEstimate);
        const recommendationReason = this.generateRecommendationReason(
          method,
          costEstimate,
          totalScore,
          context
        );

        const prioritizedMethod: PrioritizedPaymentMethod = {
          method,
          priority: index + 1, // Will be updated after sorting
          costEstimate,
          availabilityStatus,
          userPreferenceScore: preferenceScore,
          recommendationReason,
          totalScore,
          warnings: this.generateMethodWarnings(method, costEstimate, context),
          benefits: this.generateMethodBenefits(method, costEstimate, context)
        };

        return prioritizedMethod;
      })
    );

    // Sort by total score (descending) and update priority
    const sortedMethods = scoredMethods.sort((a, b) => b.totalScore - a.totalScore);

    return sortedMethods.map((method, index) => ({
      ...method,
      priority: index + 1
    }));
  }

  private calculateCostScore(costEstimate: CostEstimate, transactionAmount: number): number {
    // Lower cost = higher score
    const costRatio = costEstimate.totalCost / transactionAmount;

    // Normalize cost ratio to 0-1 score (lower cost = higher score)
    if (costRatio <= 0.01) return 1.0; // Less than 1% cost
    if (costRatio <= 0.02) return 0.9; // Less than 2% cost
    if (costRatio <= 0.05) return 0.7; // Less than 5% cost
    if (costRatio <= 0.10) return 0.5; // Less than 10% cost
    if (costRatio <= 0.20) return 0.3; // Less than 20% cost

    return 0.1; // More than 20% cost
  }

  private calculateAvailabilityScore(method: PaymentMethod, context: PrioritizationContext): number {
    // Check if method is available on current network
    if (!this.networkChecker.isPaymentMethodSupported(method, context.userContext.chainId)) {
      return 0;
    }

    // Check user balance for crypto methods
    if (method.token) {
      const balance = context.userContext.walletBalances.find(
        b => b.token.address.toLowerCase() === method.token!.address.toLowerCase() &&
          b.chainId === context.userContext.chainId
      );

      if (!balance || balance.balanceUSD < context.transactionAmount) {
        return 0.2; // Low score for insufficient balance
      }
    }

    return 1.0; // Fully available
  }

  private determineAvailabilityStatus(
    method: PaymentMethod,
    costEstimate: CostEstimate
  ): AvailabilityStatus {
    const config = this.configs[method.type];


    // Fiat payments and x402 payments are ALWAYS available regardless of:
    // - Wallet connection status
    // - Network/chain ID
    // - Gas fees (fiat has no gas fees, x402 has reduced fees)
    // Users can choose fiat even when their wallet is connected
    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      // Check for Stripe minimum amount ($0.50 USD)
      // We assume costEstimate.totalCost roughly reflects the USD value
      if (costEstimate.totalCost < 0.50) {
        return AvailabilityStatus.UNAVAILABLE_MINIMUM_AMOUNT; // Or a specific status if available
      }
      return AvailabilityStatus.AVAILABLE;
    }

    if (method.type === PaymentMethodType.X402) {
      return AvailabilityStatus.AVAILABLE;
    }

    // Check gas fee thresholds for crypto methods
    if (method.token && costEstimate.gasFee > config.gasFeeThreshold.maxAcceptableGasFeeUSD) {
      return AvailabilityStatus.UNAVAILABLE_HIGH_GAS_FEES;
    }

    return AvailabilityStatus.AVAILABLE;
  }

  private generateRecommendationReason(
    method: PaymentMethod,
    costEstimate: CostEstimate,
    totalScore: number,
    context: PrioritizationContext
  ): string {
    const config = this.configs[method.type];

    if (method.type === PaymentMethodType.STABLECOIN_USDC) {
      if (costEstimate.gasFee < config.gasFeeThreshold.warningThresholdUSD) {
        return 'Recommended: Low gas fees and stable value';
      }
      return 'Stable value with predictable costs';
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return 'No gas fees and familiar payment experience';
    }

    if (method.type === PaymentMethodType.NATIVE_ETH) {
      if (costEstimate.gasFee > config.gasFeeThreshold.warningThresholdUSD) {
        return 'Available but high gas fees - consider alternatives';
      }
      return 'Native token with broad acceptance';
    }

    return 'Alternative payment option';
  }

  private generateMethodWarnings(
    method: PaymentMethod,
    costEstimate: CostEstimate,
    context: PrioritizationContext
  ): string[] {
    const warnings: string[] = [];
    const config = this.configs[method.type];

    if (method.token && costEstimate.gasFee > config.gasFeeThreshold.warningThresholdUSD) {
      warnings.push(`High gas fees: $${costEstimate.gasFee.toFixed(2)}`);
    }

    if (costEstimate.confidence < 0.7) {
      warnings.push('Cost estimate has low confidence');
    }

    if (costEstimate.estimatedTime > 30) {
      warnings.push(`Longer confirmation time: ~${costEstimate.estimatedTime} minutes`);
    }

    return warnings;
  }

  private generateMethodBenefits(
    method: PaymentMethod,
    costEstimate: CostEstimate,
    context: PrioritizationContext
  ): string[] {
    const benefits: string[] = [];

    if (method.type === PaymentMethodType.STABLECOIN_USDC) {
      benefits.push('Price stability');
      benefits.push('Lower volatility risk');
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      benefits.push('No gas fees');
      benefits.push('Familiar payment flow');
      benefits.push('Buyer protection');
    }

    if (costEstimate.gasFee < 1) {
      benefits.push('Very low transaction fees');
    }

    if (costEstimate.estimatedTime < 5) {
      benefits.push('Fast confirmation');
    }

    return benefits;
  }

  private generateRecommendations(
    prioritizedMethods: PrioritizedPaymentMethod[],
    context: PrioritizationContext
  ): PrioritizationRecommendation[] {
    const recommendations: PrioritizationRecommendation[] = [];

    if (prioritizedMethods.length < 2) return recommendations;

    const topMethod = prioritizedMethods[0];
    const secondMethod = prioritizedMethods[1];

    // Cost savings recommendation
    if (topMethod.costEstimate.totalCost < secondMethod.costEstimate.totalCost) {
      const savings = secondMethod.costEstimate.totalCost - topMethod.costEstimate.totalCost;
      recommendations.push({
        type: 'cost_savings',
        message: `Save $${savings.toFixed(2)} by using ${topMethod.method.name}`,
        suggestedMethod: topMethod.method.type,
        potentialSavings: savings
      });
    }

    return recommendations;
  }

  private generateWarnings(
    prioritizedMethods: PrioritizedPaymentMethod[],
    context: PrioritizationContext
  ): PrioritizationWarning[] {
    const warnings: PrioritizationWarning[] = [];

    // Check for high gas fees across all methods
    const highGasFeeMethods = prioritizedMethods.filter(
      method => method.costEstimate.gasFee > 25 // $25 threshold
    );

    if (highGasFeeMethods.length > 0) {
      warnings.push({
        type: 'high_gas_fees',
        message: 'Gas fees are currently high across crypto payment methods',
        affectedMethods: highGasFeeMethods.map(m => m.method.type),
        severity: 'medium',
        actionRequired: 'Consider using fiat payment or waiting for lower gas fees'
      });
    }

    return warnings;
  }

  private calculateAverageConfidence(methods: PrioritizedPaymentMethod[]): number {
    if (methods.length === 0) return 0;

    const totalConfidence = methods.reduce((sum, method) => sum + method.costEstimate.confidence, 0);
    return totalConfidence / methods.length;
  }

  private resortByPriority(methods: PrioritizedPaymentMethod[]): PrioritizedPaymentMethod[] {
    return methods
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((method, index) => ({
        ...method,
        priority: index + 1
      }));
  }

  // Enhanced helper methods for new functionality
  private mergeStablecoinResults(
    allMethods: PrioritizedPaymentMethod[],
    stablecoinResult: any
  ): PrioritizedPaymentMethod[] {
    // Merge stablecoin-enhanced methods back into the full list
    const stablecoinMap = new Map<string, PrioritizedPaymentMethod>(
      stablecoinResult.prioritizedStablecoins.map((m: PrioritizedPaymentMethod) => [m.method.id, m])
    );

    const mergedMethods: PrioritizedPaymentMethod[] = allMethods.map(method => {
      const enhanced = stablecoinMap.get(method.method.id);
      return enhanced || method;
    });

    return mergedMethods
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((method, index) => {
        const prioritizedMethod: PrioritizedPaymentMethod = {
          ...method,
          priority: index + 1
        };
        return prioritizedMethod;
      });
  }

  private generateEnhancedRecommendations(
    prioritizedMethods: PrioritizedPaymentMethod[],
    context: PrioritizationContext,
    stablecoinResult: any
  ): PrioritizationRecommendation[] {
    const recommendations = this.generateRecommendations(prioritizedMethods, context);

    // Add stablecoin-specific recommendations
    if (stablecoinResult.usdcFirstApplied) {
      recommendations.unshift({
        type: 'convenience',
        message: 'USDC prioritized for stable value and predictable costs',
        suggestedMethod: PaymentMethodType.STABLECOIN_USDC
      });
    }

    if (stablecoinResult?.fallbacksActivated?.length > 0) {
      recommendations.push({
        type: 'convenience',
        message: 'Stablecoin fallback activated - consider alternative networks',
        suggestedMethod: PaymentMethodType.FIAT_STRIPE
      });
    }

    return recommendations;
  }

  private generateEnhancedWarnings(
    prioritizedMethods: PrioritizedPaymentMethod[],
    context: PrioritizationContext,
    dynamicResult: any
  ): PrioritizationWarning[] {
    const warnings = this.generateWarnings(prioritizedMethods, context);

    // Add dynamic prioritization warnings
    if (dynamicResult.marketConditionsChanged) {
      warnings.push({
        type: 'network_congestion',
        message: 'Market conditions changed - prioritization updated in real-time',
        affectedMethods: prioritizedMethods.map(m => m.method.type),
        severity: 'low',
        actionRequired: 'Review updated payment method order'
      });
    }

    return warnings;
  }

  // Configuration management methods
  updateMethodConfig(methodType: PaymentMethodType, config: Partial<PaymentMethodConfig>): void {
    this.configs[methodType] = {
      ...this.configs[methodType],
      ...config
    };

    // Update scoring system configuration
    this.scoringSystem.updateMethodConfig(methodType, this.configs[methodType]);
  }

  getMethodConfig(methodType: PaymentMethodType): PaymentMethodConfig {
    return this.configs[methodType];
  }

  getAllConfigs(): Record<PaymentMethodType, PaymentMethodConfig> {
    return { ...this.configs };
  }

  // Access to new components for advanced usage
  getScoringSystem(): PaymentMethodScoringSystem {
    return this.scoringSystem;
  }

  getDynamicEngine(): DynamicPrioritizationEngine {
    return this.dynamicEngine;
  }

  getStablecoinRules(): StablecoinPrioritizationRules {
    return this.stablecoinRules;
  }

  // Performance optimization helper methods
  private generatePrioritizationCacheKey(context: PrioritizationContext): string {
    const methodIds = context.availablePaymentMethods
      .map(m => m.type)
      .sort()
      .join(',');

    const userContextHash = this.hashUserContext(context.userContext);
    const amount = Math.round(context.transactionAmount);

    return `prioritization_${methodIds}_${userContextHash}_${amount}`;
  }

  private hashUserContext(userContext: UserContext): string {
    // Create a simple hash of relevant user context data
    const contextString = `${userContext.chainId}_${userContext.userAddress || 'anonymous'}`;
    return btoa(contextString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private isCacheValid(cached: any, context: PrioritizationContext): boolean {
    // Check if cached result is still valid based on context
    if (!cached.timestamp || Date.now() - cached.timestamp > 60000) { // 1 minute
      return false;
    }

    // Check if market conditions have changed significantly
    if (cached.userContext?.chainId !== context.userContext.chainId) {
      return false;
    }

    return true;
  }

  // Performance monitoring methods
  async getPerformanceMetrics(): Promise<any> {
    return {
      prioritizationMetrics: prioritizationPerformanceOptimizer.getPerformanceMetrics(),
      cacheMetrics: intelligentCacheService.getCacheMetrics()
    };
  }

  async optimizePerformance(): Promise<void> {
    // Optimize both performance optimizer and cache service
    await prioritizationPerformanceOptimizer.optimizeMemoryUsage();
    await intelligentCacheService.optimizeCache();
  }

  async preloadCommonScenarios(): Promise<void> {
    // Preload common prioritization scenarios
    await prioritizationPerformanceOptimizer.preloadCommonScenarios();
    await intelligentCacheService.preloadCommonEntries();
  }
}

export default PaymentMethodPrioritizationService;