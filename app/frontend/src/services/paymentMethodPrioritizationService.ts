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
  }

  async prioritizePaymentMethods(context: PrioritizationContext): Promise<PrioritizationResult> {
    const startTime = Date.now();
    
    try {
      // Filter available methods for current network
      const availableMethods = await this.filterAvailableMethods(
        context.availablePaymentMethods,
        context.userContext.chainId
      );

      // Calculate costs for all methods
      const methodsWithCosts = await this.calculateCostsForMethods(
        availableMethods,
        context.transactionAmount,
        context.marketConditions
      );

      // Score and prioritize methods
      const prioritizedMethods = await this.scoreAndPrioritizeMethods(
        methodsWithCosts,
        context
      );

      // Generate recommendations and warnings
      const recommendations = this.generateRecommendations(prioritizedMethods, context);
      const warnings = this.generateWarnings(prioritizedMethods, context);

      // Select default method
      const defaultMethod = this.getDefaultPaymentMethod(prioritizedMethods);

      const processingTime = Date.now() - startTime;

      return {
        prioritizedMethods,
        defaultMethod,
        recommendations,
        warnings,
        metadata: {
          calculatedAt: new Date(),
          totalMethodsEvaluated: availableMethods.length,
          averageConfidence: this.calculateAverageConfidence(prioritizedMethods),
          processingTimeMs: processingTime
        }
      };
    } catch (error) {
      console.error('Error in payment method prioritization:', error);
      throw new Error('Failed to prioritize payment methods');
    }
  }

  async updatePrioritization(
    currentMethods: PrioritizedPaymentMethod[],
    marketConditions: MarketConditions
  ): Promise<PrioritizedPaymentMethod[]> {
    // Update cost estimates based on new market conditions
    const updatedMethods = await Promise.all(
      currentMethods.map(async (prioritizedMethod) => {
        const networkCondition = marketConditions.gasConditions.find(
          gc => gc.chainId === prioritizedMethod.method.chainId
        );

        if (networkCondition) {
          const updatedCostEstimate = await this.costCalculator.calculateTransactionCost(
            prioritizedMethod.method,
            prioritizedMethod.costEstimate.baseCost,
            networkCondition
          );

          return {
            ...prioritizedMethod,
            costEstimate: updatedCostEstimate,
            availabilityStatus: this.determineAvailabilityStatus(
              prioritizedMethod.method,
              updatedCostEstimate
            )
          };
        }

        return prioritizedMethod;
      })
    );

    // Re-sort based on updated scores
    return this.resortByPriority(updatedMethods);
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
    const config = this.configs[method.type];
    if (!config) {
      throw new Error(`No configuration found for payment method type: ${method.type}`);
    }

    // Calculate individual scores
    const costScore = this.calculateCostScore(costEstimate, context.transactionAmount);
    const preferenceScore = this.preferenceManager.calculatePreferenceScore(
      method,
      context.userContext.preferences
    );
    const availabilityScore = this.calculateAvailabilityScore(method, context);

    // Apply weighted scoring
    const totalScore = 
      (config.basePriority * 0.1) + // Base priority has lower weight
      (costScore * config.costWeight) +
      (preferenceScore * config.preferenceWeight) +
      (availabilityScore * config.availabilityWeight);

    return Math.max(0, Math.min(1, totalScore)); // Normalize to 0-1 range
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
        const networkCondition = marketConditions.gasConditions.find(
          gc => gc.chainId === method.chainId
        ) || marketConditions.gasConditions[0]; // Fallback to first available

        const costEstimate = await this.costCalculator.calculateTransactionCost(
          method,
          amount,
          networkCondition
        );

        return { method, costEstimate };
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

        return {
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

  // Configuration management methods
  updateMethodConfig(methodType: PaymentMethodType, config: Partial<PaymentMethodConfig>): void {
    this.configs[methodType] = {
      ...this.configs[methodType],
      ...config
    };
  }

  getMethodConfig(methodType: PaymentMethodType): PaymentMethodConfig {
    return this.configs[methodType];
  }

  getAllConfigs(): Record<PaymentMethodType, PaymentMethodConfig> {
    return { ...this.configs };
  }
}

export default PaymentMethodPrioritizationService;