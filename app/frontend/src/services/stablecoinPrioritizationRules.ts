/**
 * Stablecoin Prioritization Rules
 * Implements USDC-first prioritization logic and stablecoin preference over volatile assets
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

import {
  PaymentMethod,
  PaymentMethodType,
  PrioritizedPaymentMethod,
  CostEstimate,
  PrioritizationContext,
  NetworkConditions
} from '../types/paymentPrioritization';

export interface StablecoinPriorityRule {
  name: string;
  description: string;
  priority: number; // Lower number = higher priority
  condition: (method: PaymentMethod, context: PrioritizationContext) => boolean;
  scoreBonus: number; // Additional score bonus (0-1)
  fallbackChain?: PaymentMethodType[]; // Fallback order if primary unavailable
}

export interface StablecoinAvailabilityResult {
  availableStablecoins: PaymentMethod[];
  primaryChoice: PaymentMethod | null;
  fallbackChain: PaymentMethod[];
  unavailableReasons: Record<string, string>;
}

export interface StablecoinPrioritizationResult {
  prioritizedStablecoins: PrioritizedPaymentMethod[];
  appliedRules: string[];
  fallbacksActivated: string[];
  usdcFirstApplied: boolean;
}

export class StablecoinPrioritizationRules {
  private readonly USDC_PRIORITY_BONUS = 0.2; // 20% bonus for USDC
  private readonly STABLECOIN_VOLATILITY_BONUS = 0.15; // 15% bonus over volatile assets
  private readonly LOW_GAS_THRESHOLD = 10; // $10 USD gas fee threshold
  private readonly NETWORK_PREFERENCE_BONUS = 0.1; // 10% bonus for preferred networks

  private prioritizationRules: StablecoinPriorityRule[] = [
    {
      name: 'USDC_FIRST',
      description: 'USDC is prioritized as the primary stablecoin choice',
      priority: 1,
      condition: (method) => method.type === PaymentMethodType.STABLECOIN_USDC,
      scoreBonus: this.USDC_PRIORITY_BONUS,
      fallbackChain: [PaymentMethodType.STABLECOIN_USDT, PaymentMethodType.FIAT_STRIPE]
    },
    {
      name: 'LOW_GAS_USDC',
      description: 'Additional bonus for USDC when gas fees are low',
      priority: 2,
      condition: (method, context) => {
        if (method.type !== PaymentMethodType.STABLECOIN_USDC) return false;
        const networkCondition = this.getNetworkCondition(method, context);
        return networkCondition ? networkCondition.gasPriceUSD < this.LOW_GAS_THRESHOLD : false;
      },
      scoreBonus: 0.1
    },
    {
      name: 'STABLECOIN_OVER_VOLATILE',
      description: 'Stablecoins preferred over volatile assets like ETH',
      priority: 3,
      condition: (method) =>
        method.type === PaymentMethodType.STABLECOIN_USDC ||
        method.type === PaymentMethodType.STABLECOIN_USDT,
      scoreBonus: this.STABLECOIN_VOLATILITY_BONUS
    },
    {
      name: 'NETWORK_OPTIMIZED_STABLECOIN',
      description: 'Bonus for stablecoins on low-cost networks',
      priority: 4,
      condition: (method, context) => {
        if (method.type !== PaymentMethodType.STABLECOIN_USDC &&
          method.type !== PaymentMethodType.STABLECOIN_USDT) return false;

        const networkCondition = this.getNetworkCondition(method, context);
        return networkCondition ? networkCondition.networkCongestion === 'low' : false;
      },
      scoreBonus: this.NETWORK_PREFERENCE_BONUS
    }
  ];

  /**
   * Apply stablecoin prioritization rules to payment methods
   */
  applyStablecoinPrioritization(
    methods: PrioritizedPaymentMethod[],
    context: PrioritizationContext
  ): StablecoinPrioritizationResult {
    const appliedRules: string[] = [];
    const fallbacksActivated: string[] = [];
    let usdcFirstApplied = false;

    // Create a copy to avoid mutating original array
    const prioritizedMethods = methods ? [...methods] : [];

    if (prioritizedMethods.length === 0) {
      return {
        prioritizedStablecoins: [],
        appliedRules: [],
        fallbacksActivated: [],
        usdcFirstApplied: false
      };
    }

    // Apply each prioritization rule
    for (const rule of this.prioritizationRules) {
      const applicableMethods = prioritizedMethods.filter(pm =>
        rule.condition(pm.method, context)
      );

      if (applicableMethods.length > 0) {
        appliedRules.push(rule.name);

        // Apply score bonus to applicable methods
        applicableMethods.forEach(method => {
          method.totalScore = Math.min(1.0, method.totalScore + rule.scoreBonus);

          // Update recommendation reason
          if (rule.name === 'USDC_FIRST') {
            method.recommendationReason = 'Recommended: USDC-first prioritization';
            usdcFirstApplied = true;
          } else if (rule.name === 'LOW_GAS_USDC') {
            method.recommendationReason = 'Recommended: USDC with low gas fees';
          } else if (rule.name === 'STABLECOIN_OVER_VOLATILE') {
            method.recommendationReason = 'Recommended: Stable value over volatile assets';
          }

          // Add benefits
          if (!method.benefits) method.benefits = [];
          method.benefits.push(`Applied rule: ${rule.description}`);
        });
      }
    }

    // Check for fallback activation
    const usdcMethods = prioritizedMethods.filter(pm =>
      pm.method.type === PaymentMethodType.STABLECOIN_USDC
    );

    if (usdcMethods.length === 0 || usdcMethods.every(m => m.availabilityStatus !== 'available')) {
      fallbacksActivated.push('USDC_UNAVAILABLE_FALLBACK');
      this.activateStablecoinFallback(prioritizedMethods, context);
    }

    // Re-sort methods by total score
    const sortedMethods = prioritizedMethods
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((method, index) => ({
        ...method,
        priority: index + 1
      }));

    // Extract stablecoin methods for result
    const prioritizedStablecoins = sortedMethods.filter(pm =>
      pm.method.type === PaymentMethodType.STABLECOIN_USDC ||
      pm.method.type === PaymentMethodType.STABLECOIN_USDT
    );

    return {
      prioritizedStablecoins,
      appliedRules,
      fallbacksActivated,
      usdcFirstApplied
    };
  }

  /**
   * Create stablecoin availability fallback chain
   */
  createStablecoinFallbackChain(
    availableMethods: PaymentMethod[],
    context: PrioritizationContext
  ): StablecoinAvailabilityResult {
    const stablecoins = availableMethods.filter(method =>
      method.type === PaymentMethodType.STABLECOIN_USDC ||
      method.type === PaymentMethodType.STABLECOIN_USDT
    );

    const unavailableReasons: Record<string, string> = {};

    // Check USDC availability first
    const usdcMethods = stablecoins.filter(m => m.type === PaymentMethodType.STABLECOIN_USDC);
    const availableUsdc = usdcMethods.filter(method =>
      this.isMethodAvailable(method, context, unavailableReasons)
    );

    // Check USDT availability
    const usdtMethods = stablecoins.filter(m => m.type === PaymentMethodType.STABLECOIN_USDT);
    const availableUsdt = usdtMethods.filter(method =>
      this.isMethodAvailable(method, context, unavailableReasons)
    );

    // Build fallback chain
    const fallbackChain: PaymentMethod[] = [];
    let primaryChoice: PaymentMethod | null = null;

    // USDC first priority
    if (availableUsdc.length > 0) {
      primaryChoice = this.selectBestStablecoinOption(availableUsdc, context);
      fallbackChain.push(...availableUsdc);
    }

    // USDT as fallback
    if (availableUsdt.length > 0) {
      if (!primaryChoice) {
        primaryChoice = this.selectBestStablecoinOption(availableUsdt, context);
      }
      fallbackChain.push(...availableUsdt);
    }

    // Add fiat as final fallback if no stablecoins available
    if (!primaryChoice) {
      const fiatMethods = availableMethods.filter(m => m.type === PaymentMethodType.FIAT_STRIPE);
      if (fiatMethods.length > 0) {
        primaryChoice = fiatMethods[0];
        fallbackChain.push(...fiatMethods);
      }
    }

    return {
      availableStablecoins: [...availableUsdc, ...availableUsdt],
      primaryChoice,
      fallbackChain,
      unavailableReasons
    };
  }

  /**
   * Implement USDC-first prioritization logic
   */
  implementUsdcFirstLogic(
    methods: PrioritizedPaymentMethod[],
    context: PrioritizationContext
  ): PrioritizedPaymentMethod[] {
    const usdcMethods = methods.filter(m => m.method.type === PaymentMethodType.STABLECOIN_USDC);
    const nonUsdcMethods = methods.filter(m => m.method.type !== PaymentMethodType.STABLECOIN_USDC);

    // Apply USDC-first bonus
    usdcMethods.forEach(method => {
      method.totalScore = Math.min(1.0, method.totalScore + this.USDC_PRIORITY_BONUS);
      method.recommendationReason = 'USDC-first prioritization: Stable value with priority';

      if (!method.benefits) method.benefits = [];
      method.benefits.unshift('USDC-first priority');

      // Additional bonus for low gas fees
      if (method.costEstimate.gasFee < this.LOW_GAS_THRESHOLD) {
        method.totalScore = Math.min(1.0, method.totalScore + 0.05);
        method.benefits.push('Low gas fee bonus');
      }
    });

    // Combine and re-sort
    const allMethods = [...usdcMethods, ...nonUsdcMethods];
    return allMethods
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((method, index) => ({
        ...method,
        priority: index + 1
      }));
  }

  /**
   * Add stablecoin preference over volatile assets
   */
  addStablecoinPreferenceOverVolatile(
    methods: PrioritizedPaymentMethod[],
    context: PrioritizationContext
  ): PrioritizedPaymentMethod[] {
    const stablecoinMethods = methods.filter(m =>
      m.method.type === PaymentMethodType.STABLECOIN_USDC ||
      m.method.type === PaymentMethodType.STABLECOIN_USDT
    );

    const volatileMethods = methods.filter(m =>
      m.method.type === PaymentMethodType.NATIVE_ETH
    );

    // Apply stablecoin bonus
    stablecoinMethods.forEach(method => {
      method.totalScore = Math.min(1.0, method.totalScore + this.STABLECOIN_VOLATILITY_BONUS);

      if (!method.benefits) method.benefits = [];
      method.benefits.push('Stable value advantage');

      // Update recommendation reason if not already set by USDC-first
      if (!method.recommendationReason.includes('USDC-first')) {
        method.recommendationReason = 'Recommended: Stable value over volatile assets';
      }
    });

    // Add volatility warnings to volatile methods
    volatileMethods.forEach(method => {
      if (!method.warnings) method.warnings = [];
      method.warnings.push('Price volatility risk');

      // Reduce score slightly for volatility
      method.totalScore = Math.max(0, method.totalScore - 0.05);
    });

    return methods
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((method, index) => ({
        ...method,
        priority: index + 1
      }));
  }

  /**
   * Private helper methods
   */
  private getNetworkCondition(
    method: PaymentMethod,
    context: PrioritizationContext
  ): NetworkConditions | undefined {
    return context.marketConditions.gasConditions.find(
      gc => gc.chainId === method.chainId
    );
  }

  private isMethodAvailable(
    method: PaymentMethod,
    context: PrioritizationContext,
    unavailableReasons: Record<string, string>
  ): boolean {
    // Check network compatibility
    if (method.chainId && method.chainId !== context.userContext.chainId) {
      unavailableReasons[method.id] = `Wrong network: requires chain ${method.chainId}`;
      return false;
    }

    // Check user balance for crypto methods
    if (method.token) {
      const balance = context.userContext.walletBalances.find(
        b => b.token.address.toLowerCase() === method.token!.address.toLowerCase() &&
          b.chainId === context.userContext.chainId
      );

      if (!balance || balance.balanceUSD < context.transactionAmount) {
        unavailableReasons[method.id] = 'Insufficient balance';
        return false;
      }
    }

    return true;
  }

  private selectBestStablecoinOption(
    stablecoins: PaymentMethod[],
    context: PrioritizationContext
  ): PaymentMethod {
    // Prefer USDC over USDT
    const usdcOptions = stablecoins.filter(m => m.type === PaymentMethodType.STABLECOIN_USDC);
    if (usdcOptions.length > 0) {
      // Select USDC on the network with lowest gas fees
      return usdcOptions.reduce((best, current) => {
        const bestNetwork = this.getNetworkCondition(best, context);
        const currentNetwork = this.getNetworkCondition(current, context);

        if (!bestNetwork) return current;
        if (!currentNetwork) return best;

        return currentNetwork.gasPriceUSD < bestNetwork.gasPriceUSD ? current : best;
      });
    }

    // Fallback to USDT with same logic
    return stablecoins.reduce((best, current) => {
      const bestNetwork = this.getNetworkCondition(best, context);
      const currentNetwork = this.getNetworkCondition(current, context);

      if (!bestNetwork) return current;
      if (!currentNetwork) return best;

      return currentNetwork.gasPriceUSD < bestNetwork.gasPriceUSD ? current : best;
    });
  }

  private activateStablecoinFallback(
    methods: PrioritizedPaymentMethod[],
    context: PrioritizationContext
  ): void {
    // Boost USDT if USDC is unavailable
    const usdtMethods = methods.filter(m => m.method.type === PaymentMethodType.STABLECOIN_USDT);
    usdtMethods.forEach(method => {
      method.totalScore = Math.min(1.0, method.totalScore + 0.15);
      method.recommendationReason = 'Recommended: USDT as USDC fallback';

      if (!method.benefits) method.benefits = [];
      method.benefits.push('USDC fallback activation');
    });

    // Boost fiat as final fallback
    const fiatMethods = methods.filter(m => m.method.type === PaymentMethodType.FIAT_STRIPE);
    fiatMethods.forEach(method => {
      method.totalScore = Math.min(1.0, method.totalScore + 0.1);
      method.recommendationReason = 'Recommended: Fiat as stablecoin fallback';

      if (!method.benefits) method.benefits = [];
      method.benefits.push('Stablecoin fallback option');
    });
  }

  /**
   * Configuration and utility methods
   */
  addCustomRule(rule: StablecoinPriorityRule): void {
    this.prioritizationRules.push(rule);
    this.prioritizationRules.sort((a, b) => a.priority - b.priority);
  }

  removeRule(ruleName: string): boolean {
    const index = this.prioritizationRules.findIndex(rule => rule.name === ruleName);
    if (index >= 0) {
      this.prioritizationRules.splice(index, 1);
      return true;
    }
    return false;
  }

  getRules(): StablecoinPriorityRule[] {
    return [...this.prioritizationRules];
  }

  updateRuleBonus(ruleName: string, newBonus: number): boolean {
    const rule = this.prioritizationRules.find(r => r.name === ruleName);
    if (rule) {
      rule.scoreBonus = Math.max(0, Math.min(1, newBonus));
      return true;
    }
    return false;
  }

  /**
   * Analytics and monitoring methods
   */
  analyzeStablecoinUsage(
    methods: PrioritizedPaymentMethod[]
  ): {
    stablecoinCount: number;
    usdcCount: number;
    usdtCount: number;
    averageStablecoinScore: number;
    topStablecoin: PaymentMethodType | null;
  } {
    const stablecoins = methods.filter(m =>
      m.method.type === PaymentMethodType.STABLECOIN_USDC ||
      m.method.type === PaymentMethodType.STABLECOIN_USDT
    );

    const usdcMethods = stablecoins.filter(m => m.method.type === PaymentMethodType.STABLECOIN_USDC);
    const usdtMethods = stablecoins.filter(m => m.method.type === PaymentMethodType.STABLECOIN_USDT);

    const averageScore = stablecoins.length > 0
      ? stablecoins.reduce((sum, m) => sum + m.totalScore, 0) / stablecoins.length
      : 0;

    const topStablecoin = stablecoins.length > 0
      ? stablecoins.reduce((best, current) =>
        current.totalScore > best.totalScore ? current : best
      ).method.type
      : null;

    return {
      stablecoinCount: stablecoins.length,
      usdcCount: usdcMethods.length,
      usdtCount: usdtMethods.length,
      averageStablecoinScore: averageScore,
      topStablecoin
    };
  }

  validateStablecoinPrioritization(
    methods: PrioritizedPaymentMethod[]
  ): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const stablecoins = methods.filter(m =>
      m.method.type === PaymentMethodType.STABLECOIN_USDC ||
      m.method.type === PaymentMethodType.STABLECOIN_USDT
    );

    const usdcMethods = stablecoins.filter(m => m.method.type === PaymentMethodType.STABLECOIN_USDC);
    const usdtMethods = stablecoins.filter(m => m.method.type === PaymentMethodType.STABLECOIN_USDT);

    // Check USDC-first implementation
    if (usdcMethods.length > 0 && usdtMethods.length > 0) {
      const topUsdc = usdcMethods.reduce((best, current) =>
        current.totalScore > best.totalScore ? current : best
      );
      const topUsdt = usdtMethods.reduce((best, current) =>
        current.totalScore > best.totalScore ? current : best
      );

      if (topUsdt.totalScore > topUsdc.totalScore) {
        issues.push('USDT scored higher than USDC - USDC-first rule may not be applied correctly');
      }
    }

    // Check stablecoin vs volatile asset prioritization
    const volatileMethods = methods.filter(m => m.method.type === PaymentMethodType.NATIVE_ETH);
    if (stablecoins.length > 0 && volatileMethods.length > 0) {
      const topStablecoin = stablecoins.reduce((best, current) =>
        current.totalScore > best.totalScore ? current : best
      );
      const topVolatile = volatileMethods.reduce((best, current) =>
        current.totalScore > best.totalScore ? current : best
      );

      if (topVolatile.totalScore > topStablecoin.totalScore) {
        const scoreDiff = topVolatile.totalScore - topStablecoin.totalScore;
        if (scoreDiff > 0.1) {
          issues.push('Volatile asset scored significantly higher than stablecoins');
        } else {
          recommendations.push('Consider increasing stablecoin preference bonus');
        }
      }
    }

    // Check for missing stablecoin options
    if (stablecoins.length === 0) {
      recommendations.push('No stablecoin options available - consider adding USDC/USDT support');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Testing utilities
   */
  createTestingUtilities() {
    return {
      applyUsdcFirstRule: (methods: PrioritizedPaymentMethod[], context: PrioritizationContext) =>
        this.implementUsdcFirstLogic(methods, context),

      applyStablecoinPreference: (methods: PrioritizedPaymentMethod[], context: PrioritizationContext) =>
        this.addStablecoinPreferenceOverVolatile(methods, context),

      createFallbackChain: (methods: PaymentMethod[], context: PrioritizationContext) =>
        this.createStablecoinFallbackChain(methods, context),

      validatePrioritization: (methods: PrioritizedPaymentMethod[]) =>
        this.validateStablecoinPrioritization(methods)
    };
  }
}

export default StablecoinPrioritizationRules;