import { PaymentMethod, GasEstimate, CostEstimate, PaymentMethodType } from '../types/paymentPrioritization';

export interface EnhancedGasFeeThresholdConfig {
  warningThreshold: number; // USD amount
  blockingThreshold: number; // USD amount
  maxAcceptableGasPrice: number; // Gwei
  percentageWarningThreshold: number; // Percentage of transaction amount
  percentageBlockingThreshold: number; // Percentage of transaction amount
  networkCongestionMultiplier: number; // Multiplier for congested networks
  dynamicThresholdEnabled: boolean; // Enable dynamic threshold adjustment
}

export interface EnhancedGasFeeHandlingResult {
  action: 'proceed' | 'warn' | 'suggest_alternatives' | 'block_transaction';
  message: string;
  alternatives?: PaymentMethod[];
  costComparison?: CostComparison[];
  userConfirmationRequired?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  estimatedWaitTime?: number; // Minutes to wait for lower fees
  networkCongestionLevel: 'low' | 'medium' | 'high';
}

export interface CostComparison {
  method: PaymentMethod;
  totalCost: number;
  gasFee: number;
  savings: number;
  savingsPercentage: number;
  estimatedTime: number;
  confidence: number;
}

export class EnhancedGasFeeThresholdHandler {
  private config: EnhancedGasFeeThresholdConfig;
  private historicalGasPrices: number[] = [];
  private networkCongestionCache = new Map<string, { level: string; timestamp: number }>();

  constructor(config: EnhancedGasFeeThresholdConfig) {
    this.config = config;
  }

  /**
   * Enhanced gas fee handling with dynamic thresholds and network congestion awareness
   */
  async handleGasFee(
    method: PaymentMethod,
    gasEstimate: GasEstimate,
    alternatives: PaymentMethod[],
    transactionAmount: number,
    networkId?: string
  ): Promise<EnhancedGasFeeHandlingResult> {
    const gasFeeUSD = gasEstimate.totalCostUSD || 0;
    const gasPrice = Number(gasEstimate.gasPrice) || 0;
    const gasFeePercentage = (gasFeeUSD / transactionAmount) * 100;
    
    // Assess network congestion
    const congestionLevel = await this.assessNetworkCongestion(gasPrice, networkId);
    
    // Calculate dynamic thresholds based on network conditions
    const dynamicThresholds = this.calculateDynamicThresholds(congestionLevel);
    
    // Determine severity and action
    const severity = this.determineSeverity(gasFeeUSD, gasFeePercentage, gasPrice, dynamicThresholds);
    const action = this.determineAction(severity, alternatives.length > 0);
    
    // Generate cost comparison
    const costComparison = await this.generateEnhancedCostComparison(
      method, 
      alternatives, 
      transactionAmount,
      congestionLevel
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      severity,
      congestionLevel,
      gasFeeUSD,
      gasFeePercentage,
      alternatives
    );
    
    // Estimate wait time for lower fees
    const estimatedWaitTime = this.estimateWaitTimeForLowerFees(gasPrice, congestionLevel);
    
    return {
      action,
      message: this.generateEnhancedMessage(severity, gasFeeUSD, gasFeePercentage, congestionLevel),
      alternatives: this.prioritizeAlternatives(alternatives, costComparison),
      costComparison,
      userConfirmationRequired: severity !== 'low',
      severity,
      recommendations,
      estimatedWaitTime,
      networkCongestionLevel: congestionLevel
    };
  }

  /**
   * Assess network congestion level based on gas price and historical data
   */
  private async assessNetworkCongestion(gasPrice: number, networkId?: string): Promise<'low' | 'medium' | 'high'> {
    const cacheKey = networkId || 'default';
    const cached = this.networkCongestionCache.get(cacheKey);
    
    // Use cached result if recent (within 5 minutes)
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached.level as 'low' | 'medium' | 'high';
    }
    
    // Update historical data
    this.historicalGasPrices.push(gasPrice);
    if (this.historicalGasPrices.length > 100) {
      this.historicalGasPrices.shift();
    }
    
    // Calculate percentiles
    const sortedPrices = [...this.historicalGasPrices].sort((a, b) => a - b);
    const p75 = sortedPrices[Math.floor(sortedPrices.length * 0.75)] || gasPrice;
    const p90 = sortedPrices[Math.floor(sortedPrices.length * 0.90)] || gasPrice;
    
    let level: 'low' | 'medium' | 'high';
    if (gasPrice >= p90) {
      level = 'high';
    } else if (gasPrice >= p75) {
      level = 'medium';
    } else {
      level = 'low';
    }
    
    // Cache result
    this.networkCongestionCache.set(cacheKey, { level, timestamp: Date.now() });
    
    return level;
  }

  /**
   * Calculate dynamic thresholds based on network congestion
   */
  private calculateDynamicThresholds(congestionLevel: 'low' | 'medium' | 'high') {
    if (!this.config.dynamicThresholdEnabled) {
      return {
        warningThreshold: this.config.warningThreshold,
        blockingThreshold: this.config.blockingThreshold,
        percentageWarningThreshold: this.config.percentageWarningThreshold,
        percentageBlockingThreshold: this.config.percentageBlockingThreshold
      };
    }

    const multiplier = congestionLevel === 'high' ? 1.5 : congestionLevel === 'medium' ? 1.2 : 1.0;
    
    return {
      warningThreshold: this.config.warningThreshold * multiplier,
      blockingThreshold: this.config.blockingThreshold * multiplier,
      percentageWarningThreshold: this.config.percentageWarningThreshold * multiplier,
      percentageBlockingThreshold: this.config.percentageBlockingThreshold * multiplier
    };
  }

  /**
   * Determine severity level based on multiple factors
   */
  private determineSeverity(
    gasFeeUSD: number,
    gasFeePercentage: number,
    gasPrice: number,
    thresholds: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    const isVeryHighAbsolute = gasFeeUSD >= thresholds.blockingThreshold * 1.5;
    const isVeryHighPercentage = gasFeePercentage >= thresholds.percentageBlockingThreshold * 1.5;
    const isVeryHighGasPrice = gasPrice >= this.config.maxAcceptableGasPrice * 2;

    if (isVeryHighAbsolute || isVeryHighPercentage || isVeryHighGasPrice) {
      return 'critical';
    }

    const isHighAbsolute = gasFeeUSD >= thresholds.blockingThreshold;
    const isHighPercentage = gasFeePercentage >= thresholds.percentageBlockingThreshold;
    const isHighGasPrice = gasPrice >= this.config.maxAcceptableGasPrice * 1.5;

    if (isHighAbsolute || isHighPercentage || isHighGasPrice) {
      return 'high';
    }

    const isMediumAbsolute = gasFeeUSD >= thresholds.warningThreshold;
    const isMediumPercentage = gasFeePercentage >= thresholds.percentageWarningThreshold;
    const isMediumGasPrice = gasPrice >= this.config.maxAcceptableGasPrice;

    if (isMediumAbsolute || isMediumPercentage || isMediumGasPrice) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Determine action based on severity and available alternatives
   */
  private determineAction(
    severity: 'low' | 'medium' | 'high' | 'critical',
    hasAlternatives: boolean
  ): 'proceed' | 'warn' | 'suggest_alternatives' | 'block_transaction' {
    switch (severity) {
      case 'critical':
        return 'block_transaction';
      case 'high':
        return hasAlternatives ? 'suggest_alternatives' : 'block_transaction';
      case 'medium':
        return hasAlternatives ? 'suggest_alternatives' : 'warn';
      case 'low':
      default:
        return 'proceed';
    }
  }

  /**
   * Generate enhanced cost comparison with more detailed analysis
   */
  private async generateEnhancedCostComparison(
    currentMethod: PaymentMethod,
    alternatives: PaymentMethod[],
    transactionAmount: number,
    congestionLevel: 'low' | 'medium' | 'high'
  ): Promise<CostComparison[]> {
    const comparisons: CostComparison[] = [];
    const currentCost = await this.estimateEnhancedMethodCost(currentMethod, transactionAmount, congestionLevel);

    for (const alternative of alternatives) {
      const altCost = await this.estimateEnhancedMethodCost(alternative, transactionAmount, congestionLevel);
      const savings = currentCost.totalCost - altCost.totalCost;
      const savingsPercentage = (savings / currentCost.totalCost) * 100;

      if (savings > 0) {
        comparisons.push({
          method: alternative,
          totalCost: altCost.totalCost,
          gasFee: altCost.gasFee,
          savings,
          savingsPercentage,
          estimatedTime: altCost.estimatedTime,
          confidence: altCost.confidence
        });
      }
    }

    // Sort by savings (highest first), then by confidence
    return comparisons.sort((a, b) => {
      if (Math.abs(a.savings - b.savings) < 1) {
        return b.confidence - a.confidence;
      }
      return b.savings - a.savings;
    });
  }

  /**
   * Enhanced cost estimation with congestion awareness
   */
  private async estimateEnhancedMethodCost(
    method: PaymentMethod,
    amount: number,
    congestionLevel: 'low' | 'medium' | 'high'
  ): Promise<CostEstimate> {
    const congestionMultiplier = congestionLevel === 'high' ? 1.8 : congestionLevel === 'medium' ? 1.3 : 1.0;

    switch (method.type) {
      case PaymentMethodType.STABLECOIN_USDC:
        const usdcGasFee = 3 * congestionMultiplier;
        return {
          totalCost: amount + usdcGasFee,
          baseCost: amount,
          gasFee: usdcGasFee,
          currency: 'USD',
          estimatedTime: congestionLevel === 'high' ? 180 : congestionLevel === 'medium' ? 120 : 60,
          confidence: 0.9,
          breakdown: {
            amount: amount,
            networkFee: usdcGasFee,
            platformFee: 0
          }
        };
      
      case PaymentMethodType.FIAT_STRIPE:
        const stripeFee = amount * 0.029 + 0.30; // 2.9% + $0.30
        return {
          totalCost: amount + stripeFee,
          baseCost: amount,
          gasFee: 0,
          currency: 'USD',
          estimatedTime: 0,
          confidence: 1.0,
          breakdown: {
            amount: amount,
            networkFee: 0,
            platformFee: stripeFee
          }
        };
      
      case PaymentMethodType.NATIVE_ETH:
      default:
        const ethGasFee = 25 * congestionMultiplier;
        return {
          totalCost: amount + ethGasFee,
          baseCost: amount,
          gasFee: ethGasFee,
          currency: 'USD',
          estimatedTime: congestionLevel === 'high' ? 300 : congestionLevel === 'medium' ? 180 : 120,
          confidence: congestionLevel === 'high' ? 0.6 : congestionLevel === 'medium' ? 0.7 : 0.8,
          breakdown: {
            amount: amount,
            networkFee: ethGasFee,
            platformFee: 0
          }
        };
    }
  }

  /**
   * Generate contextual recommendations based on conditions
   */
  private generateRecommendations(
    severity: 'low' | 'medium' | 'high' | 'critical',
    congestionLevel: 'low' | 'medium' | 'high',
    gasFeeUSD: number,
    gasFeePercentage: number,
    alternatives: PaymentMethod[]
  ): string[] {
    const recommendations: string[] = [];

    if (severity === 'critical') {
      recommendations.push('Consider using a different payment method to avoid excessive fees');
      if (alternatives.some(alt => alt.type === PaymentMethodType.FIAT_STRIPE)) {
        recommendations.push('Fiat payment via card has no gas fees and instant confirmation');
      }
      if (alternatives.some(alt => alt.type === PaymentMethodType.STABLECOIN_USDC)) {
        recommendations.push('USDC typically has lower gas fees than ETH');
      }
    }

    if (severity === 'high' || severity === 'critical') {
      if (congestionLevel === 'high') {
        recommendations.push('Network congestion is high - consider waiting 1-2 hours for lower fees');
        recommendations.push('Try again during off-peak hours (typically late night/early morning UTC)');
      }
    }

    if (gasFeePercentage > 15) {
      recommendations.push(`Gas fee represents ${gasFeePercentage.toFixed(1)}% of your transaction - consider if this is worth it`);
    }

    if (severity === 'medium' && alternatives.length > 0) {
      recommendations.push('Alternative payment methods available with potentially lower costs');
    }

    if (congestionLevel === 'high') {
      recommendations.push('Consider setting a lower gas price and waiting longer for confirmation');
    }

    return recommendations;
  }

  /**
   * Estimate wait time for lower gas fees
   */
  private estimateWaitTimeForLowerFees(gasPrice: number, congestionLevel: 'low' | 'medium' | 'high'): number {
    switch (congestionLevel) {
      case 'high':
        return 120; // 2 hours
      case 'medium':
        return 60; // 1 hour
      case 'low':
      default:
        return 30; // 30 minutes
    }
  }

  /**
   * Prioritize alternatives based on cost comparison and reliability
   */
  private prioritizeAlternatives(alternatives: PaymentMethod[], costComparison: CostComparison[]): PaymentMethod[] {
    if (costComparison.length === 0) return alternatives;

    // Create a map for quick lookup
    const comparisonMap = new Map(costComparison.map(comp => [comp.method.id, comp]));

    // Sort alternatives by savings and confidence
    return alternatives.sort((a, b) => {
      const aComp = comparisonMap.get(a.id);
      const bComp = comparisonMap.get(b.id);

      if (!aComp && !bComp) return 0;
      if (!aComp) return 1;
      if (!bComp) return -1;

      // Prioritize by savings, then confidence
      if (Math.abs(aComp.savings - bComp.savings) < 1) {
        return bComp.confidence - aComp.confidence;
      }
      return bComp.savings - aComp.savings;
    });
  }

  /**
   * Generate enhanced user-friendly message
   */
  private generateEnhancedMessage(
    severity: 'low' | 'medium' | 'high' | 'critical',
    gasFeeUSD: number,
    gasFeePercentage: number,
    congestionLevel: 'low' | 'medium' | 'high'
  ): string {
    const congestionText = congestionLevel === 'high' ? ' due to high network congestion' : 
                          congestionLevel === 'medium' ? ' due to moderate network activity' : '';

    switch (severity) {
      case 'critical':
        return `Gas fees are extremely high ($${gasFeeUSD.toFixed(2)}, ${gasFeePercentage.toFixed(1)}% of transaction)${congestionText}. We strongly recommend using an alternative payment method.`;
      
      case 'high':
        return `Gas fees are very high ($${gasFeeUSD.toFixed(2)}, ${gasFeePercentage.toFixed(1)}% of transaction)${congestionText}. Consider using an alternative payment method to save money.`;
      
      case 'medium':
        return `Gas fees are higher than usual ($${gasFeeUSD.toFixed(2)}, ${gasFeePercentage.toFixed(1)}% of transaction)${congestionText}. You might save money with alternative payment methods.`;
      
      case 'low':
      default:
        return `Gas fee of $${gasFeeUSD.toFixed(2)} (${gasFeePercentage.toFixed(1)}% of transaction) is within acceptable limits.`;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EnhancedGasFeeThresholdConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EnhancedGasFeeThresholdConfig {
    return { ...this.config };
  }

  /**
   * Clear historical data and cache
   */
  clearCache(): void {
    this.historicalGasPrices = [];
    this.networkCongestionCache.clear();
  }
}

// Enhanced default configuration
export const ENHANCED_DEFAULT_GAS_FEE_CONFIG: EnhancedGasFeeThresholdConfig = {
  warningThreshold: 10, // $10 USD
  blockingThreshold: 50, // $50 USD
  maxAcceptableGasPrice: 100, // 100 Gwei
  percentageWarningThreshold: 10, // 10% of transaction
  percentageBlockingThreshold: 25, // 25% of transaction
  networkCongestionMultiplier: 1.5,
  dynamicThresholdEnabled: true
};

// Export singleton instance
export const enhancedGasFeeThresholdHandler = new EnhancedGasFeeThresholdHandler(ENHANCED_DEFAULT_GAS_FEE_CONFIG);