/**
 * Payment Method Scoring System
 * Implements weighted scoring algorithm combining cost, preference, and availability
 * Requirements: 1.1, 1.2, 4.3
 */

import {
  PaymentMethod,
  PaymentMethodType,
  PaymentMethodConfig,
  CostEstimate,
  PrioritizationContext,
  UserPreferences,
  NetworkConditions,
  AvailabilityStatus
} from '../types/paymentPrioritization';
import { DEFAULT_PAYMENT_METHOD_CONFIGS } from '../types/paymentPrioritization';

export interface ScoringComponents {
  costScore: number;
  preferenceScore: number;
  availabilityScore: number;
  stablecoinBonus: number;
  networkOptimizationScore: number;
  totalScore: number;
}

export interface ScoringValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  scoreBreakdown: ScoringComponents;
}

export class PaymentMethodScoringSystem {
  private configs: Record<PaymentMethodType, PaymentMethodConfig>;
  private readonly STABLECOIN_BONUS_MULTIPLIER = 0.15; // 15% bonus for stablecoins
  private readonly NETWORK_OPTIMIZATION_WEIGHT = 0.1; // 10% weight for network optimization
  private readonly MIN_SCORE = 0.0;
  private readonly MAX_SCORE = 1.0;

  constructor(configs?: Record<PaymentMethodType, PaymentMethodConfig>) {
    this.configs = configs || DEFAULT_PAYMENT_METHOD_CONFIGS;
  }

  /**
   * Calculate comprehensive score for a payment method
   */
  async calculateMethodScore(
    method: PaymentMethod,
    context: PrioritizationContext,
    costEstimate: CostEstimate
  ): Promise<ScoringComponents> {
    const config = this.getMethodConfig(method.type);
    
    // Calculate individual scoring components
    const costScore = this.calculateCostScore(costEstimate, context.transactionAmount);
    const preferenceScore = this.calculatePreferenceScore(method, context.userContext.preferences);
    const availabilityScore = this.calculateAvailabilityScore(method, context, costEstimate);
    const stablecoinBonus = this.calculateStablecoinBonus(method, costEstimate);
    const networkOptimizationScore = this.calculateNetworkOptimizationScore(method, context);

    // Apply weighted scoring based on configuration
    const weightedCostScore = costScore * config.costWeight;
    const weightedPreferenceScore = preferenceScore * config.preferenceWeight;
    const weightedAvailabilityScore = availabilityScore * config.availabilityWeight;
    const weightedNetworkScore = networkOptimizationScore * this.NETWORK_OPTIMIZATION_WEIGHT;

    // Calculate base score from weighted components
    let totalScore = weightedCostScore + weightedPreferenceScore + weightedAvailabilityScore + weightedNetworkScore;
    
    // Apply base priority adjustment (lower number = higher priority)
    const basePriorityScore = (5 - config.basePriority) / 4; // Normalize to 0-1 range
    totalScore = (totalScore * 0.9) + (basePriorityScore * 0.1);

    // Apply stablecoin bonus
    totalScore += stablecoinBonus;

    // Normalize final score to valid range
    totalScore = Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, totalScore));

    return {
      costScore,
      preferenceScore,
      availabilityScore,
      stablecoinBonus,
      networkOptimizationScore,
      totalScore
    };
  }

  /**
   * Calculate cost effectiveness score (higher score = lower cost)
   */
  private calculateCostScore(costEstimate: CostEstimate, transactionAmount: number): number {
    if (transactionAmount <= 0) return 0;

    const costRatio = costEstimate.totalCost / transactionAmount;
    
    // Progressive scoring based on cost ratio
    if (costRatio <= 0.005) return 1.0;      // Less than 0.5% cost - excellent
    if (costRatio <= 0.01) return 0.95;      // Less than 1% cost - very good
    if (costRatio <= 0.02) return 0.85;      // Less than 2% cost - good
    if (costRatio <= 0.03) return 0.75;      // Less than 3% cost - acceptable
    if (costRatio <= 0.05) return 0.60;      // Less than 5% cost - moderate
    if (costRatio <= 0.10) return 0.40;      // Less than 10% cost - high
    if (costRatio <= 0.15) return 0.25;      // Less than 15% cost - very high
    if (costRatio <= 0.20) return 0.15;      // Less than 20% cost - excessive
    
    return 0.05; // More than 20% cost - prohibitive
  }

  /**
   * Calculate user preference score based on historical usage
   */
  private calculatePreferenceScore(method: PaymentMethod, preferences: UserPreferences): number {
    // Check if method is explicitly avoided
    if (preferences.avoidedMethods.includes(method.type)) {
      return 0.1; // Very low score for avoided methods
    }

    // Find specific preference for this method
    const methodPreference = preferences.preferredMethods.find(
      pref => pref.methodType === method.type
    );

    if (methodPreference) {
      // Apply time decay to preference score
      const daysSinceLastUse = this.getDaysSince(methodPreference.lastUsed);
      const decayFactor = Math.max(0.3, 1 - (daysSinceLastUse / 30)); // 30-day decay
      
      return methodPreference.score * decayFactor;
    }

    // Apply general preferences for method types
    if (method.type === PaymentMethodType.STABLECOIN_USDC || 
        method.type === PaymentMethodType.STABLECOIN_USDT) {
      return preferences.preferStablecoins ? 0.8 : 0.6;
    }

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return preferences.preferFiat ? 0.9 : 0.7;
    }

    // Default neutral score for other methods
    return 0.5;
  }

  /**
   * Calculate availability score based on network support and balance
   */
  private calculateAvailabilityScore(
    method: PaymentMethod,
    context: PrioritizationContext,
    costEstimate: CostEstimate
  ): number {
    // Fiat payments are always available
    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return 1.0;
    }

    // Check network compatibility
    if (method.chainId && method.chainId !== context.userContext.chainId) {
      return 0.2; // Low score for wrong network
    }

    // Check user balance for crypto methods
    if (method.token) {
      const balance = context.userContext.walletBalances.find(
        b => b.token.address.toLowerCase() === method.token!.address.toLowerCase() &&
             b.chainId === context.userContext.chainId
      );

      if (!balance) {
        return 0.1; // Very low score for no balance
      }

      const requiredAmount = context.transactionAmount + costEstimate.gasFee;
      if (balance.balanceUSD < requiredAmount) {
        const availableRatio = balance.balanceUSD / requiredAmount;
        return Math.max(0.1, availableRatio * 0.5); // Partial availability score
      }
    }

    // Check gas fee acceptability
    const config = this.getMethodConfig(method.type);
    if (costEstimate.gasFee > config.gasFeeThreshold.maxAcceptableGasFeeUSD) {
      return 0.3; // Low score for high gas fees
    }

    if (costEstimate.gasFee > config.gasFeeThreshold.warningThresholdUSD) {
      return 0.7; // Moderate score for warning-level gas fees
    }

    return 1.0; // Fully available
  }

  /**
   * Calculate stablecoin bonus for stable value methods
   */
  private calculateStablecoinBonus(method: PaymentMethod, costEstimate: CostEstimate): number {
    if (method.type !== PaymentMethodType.STABLECOIN_USDC && 
        method.type !== PaymentMethodType.STABLECOIN_USDT) {
      return 0;
    }

    // Base stablecoin bonus
    let bonus = this.STABLECOIN_BONUS_MULTIPLIER;

    // Additional bonus for low gas fees
    if (costEstimate.gasFee < 5) {
      bonus += 0.05; // 5% additional bonus for very low gas fees
    }

    // Additional bonus for high confidence estimates
    if (costEstimate.confidence > 0.8) {
      bonus += 0.03; // 3% additional bonus for high confidence
    }

    return bonus;
  }

  /**
   * Calculate network optimization score based on network conditions
   */
  private calculateNetworkOptimizationScore(
    method: PaymentMethod,
    context: PrioritizationContext
  ): number {
    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      return 1.0; // Fiat doesn't depend on network conditions
    }

    const networkCondition = context.marketConditions.gasConditions.find(
      gc => gc.chainId === method.chainId
    );

    if (!networkCondition) {
      return 0.5; // Neutral score if no network data
    }

    // Score based on network congestion (lower congestion = higher score)
    let networkScore = 0.5;
    switch (networkCondition.networkCongestion) {
      case 'low':
        networkScore = 1.0;
        break;
      case 'medium':
        networkScore = 0.7;
        break;
      case 'high':
        networkScore = 0.3;
        break;
    }

    // Adjust based on block time (faster = better)
    if (networkCondition.blockTime < 5) {
      networkScore += 0.1; // Bonus for fast networks
    } else if (networkCondition.blockTime > 30) {
      networkScore -= 0.1; // Penalty for slow networks
    }

    return Math.max(0, Math.min(1, networkScore));
  }

  /**
   * Validate scoring components and configuration
   */
  validateScoring(
    method: PaymentMethod,
    scoringComponents: ScoringComponents,
    context: PrioritizationContext
  ): ScoringValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate score ranges
    if (scoringComponents.totalScore < this.MIN_SCORE || scoringComponents.totalScore > this.MAX_SCORE) {
      errors.push(`Total score ${scoringComponents.totalScore} is outside valid range [${this.MIN_SCORE}, ${this.MAX_SCORE}]`);
    }

    // Validate individual component scores
    const components = [
      { name: 'costScore', value: scoringComponents.costScore },
      { name: 'preferenceScore', value: scoringComponents.preferenceScore },
      { name: 'availabilityScore', value: scoringComponents.availabilityScore },
      { name: 'networkOptimizationScore', value: scoringComponents.networkOptimizationScore }
    ];

    components.forEach(component => {
      if (component.value < 0 || component.value > 1) {
        errors.push(`${component.name} ${component.value} is outside valid range [0, 1]`);
      }
    });

    // Validate configuration
    const config = this.getMethodConfig(method.type);
    const totalWeight = config.costWeight + config.preferenceWeight + config.availabilityWeight;
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      warnings.push(`Weight configuration for ${method.type} doesn't sum to 1.0 (actual: ${totalWeight})`);
    }

    // Validate stablecoin bonus application
    if (scoringComponents.stablecoinBonus > 0 && 
        method.type !== PaymentMethodType.STABLECOIN_USDC && 
        method.type !== PaymentMethodType.STABLECOIN_USDT) {
      warnings.push(`Stablecoin bonus applied to non-stablecoin method ${method.type}`);
    }

    // Performance warnings
    if (scoringComponents.availabilityScore < 0.5) {
      warnings.push(`Low availability score (${scoringComponents.availabilityScore}) may indicate method issues`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      scoreBreakdown: scoringComponents
    };
  }

  /**
   * Get configuration for a payment method type
   */
  private getMethodConfig(methodType: PaymentMethodType): PaymentMethodConfig {
    const config = this.configs[methodType];
    if (!config) {
      throw new Error(`No configuration found for payment method type: ${methodType}`);
    }
    return config;
  }

  /**
   * Calculate days since a given date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Update scoring configuration
   */
  updateMethodConfig(methodType: PaymentMethodType, config: Partial<PaymentMethodConfig>): void {
    this.configs[methodType] = {
      ...this.configs[methodType],
      ...config
    };
  }

  /**
   * Get all scoring configurations
   */
  getAllConfigs(): Record<PaymentMethodType, PaymentMethodConfig> {
    return { ...this.configs };
  }

  /**
   * Reset to default configurations
   */
  resetToDefaults(): void {
    this.configs = { ...DEFAULT_PAYMENT_METHOD_CONFIGS };
  }

  /**
   * Create scoring utilities for testing
   */
  createScoringUtilities() {
    return {
      calculateCostScore: (costEstimate: CostEstimate, transactionAmount: number) =>
        this.calculateCostScore(costEstimate, transactionAmount),
      
      calculatePreferenceScore: (method: PaymentMethod, preferences: UserPreferences) =>
        this.calculatePreferenceScore(method, preferences),
      
      calculateAvailabilityScore: (
        method: PaymentMethod,
        context: PrioritizationContext,
        costEstimate: CostEstimate
      ) => this.calculateAvailabilityScore(method, context, costEstimate),
      
      calculateStablecoinBonus: (method: PaymentMethod, costEstimate: CostEstimate) =>
        this.calculateStablecoinBonus(method, costEstimate),
      
      validateScoring: (
        method: PaymentMethod,
        scoringComponents: ScoringComponents,
        context: PrioritizationContext
      ) => this.validateScoring(method, scoringComponents, context)
    };
  }
}

export default PaymentMethodScoringSystem;