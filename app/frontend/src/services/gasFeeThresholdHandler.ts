import { PaymentMethod, GasEstimate, CostEstimate, PaymentMethodType } from '../types/paymentPrioritization';

export interface GasFeeThresholdConfig {
  warningThreshold: number; // USD amount
  blockingThreshold: number; // USD amount
  maxAcceptableGasPrice: number; // Gwei
}

export interface GasFeeHandlingResult {
  action: 'proceed' | 'warn' | 'suggest_alternatives' | 'block_transaction';
  message: string;
  alternatives?: PaymentMethod[];
  costComparison?: CostComparison[];
  userConfirmationRequired?: boolean;
}

export interface CostComparison {
  method: PaymentMethod;
  totalCost: number;
  gasFee: number;
  savings: number;
  savingsPercentage: number;
}

export class GasFeeThresholdHandler {
  private config: GasFeeThresholdConfig;

  constructor(config: GasFeeThresholdConfig) {
    this.config = config;
  }

  /**
   * Handles high gas fee scenarios and provides appropriate responses
   */
  async handleGasFee(
    method: PaymentMethod,
    gasEstimate: GasEstimate,
    alternatives: PaymentMethod[],
    transactionAmount: number
  ): Promise<GasFeeHandlingResult> {
    const gasFeeUSD = gasEstimate.totalCostUSD || 0;
    const gasPrice = Number(gasEstimate.gasPrice) || 0;

    // Check if gas fee exceeds blocking threshold
    if (gasFeeUSD >= this.config.blockingThreshold) {
      return this.handleBlockingGasFee(method, gasEstimate, alternatives, transactionAmount);
    }

    // Check if gas fee exceeds warning threshold
    if (gasFeeUSD >= this.config.warningThreshold || gasPrice >= this.config.maxAcceptableGasPrice) {
      return this.handleWarningGasFee(method, gasEstimate, alternatives, transactionAmount);
    }

    // Gas fee is acceptable
    return {
      action: 'proceed',
      message: `Gas fee of $${gasFeeUSD.toFixed(2)} is within acceptable limits.`,
      userConfirmationRequired: false
    };
  }

  /**
   * Handles blocking gas fee scenarios
   */
  private async handleBlockingGasFee(
    method: PaymentMethod,
    gasEstimate: GasEstimate,
    alternatives: PaymentMethod[],
    transactionAmount: number
  ): Promise<GasFeeHandlingResult> {
    const gasFeeUSD = gasEstimate.totalCostUSD || 0;
    const costComparison = await this.generateCostComparison(method, alternatives, transactionAmount);
    
    const bestAlternatives = alternatives.filter(alt => 
      alt.type === PaymentMethodType.STABLECOIN_USDC || 
      alt.type === PaymentMethodType.FIAT_STRIPE
    );

    return {
      action: 'block_transaction',
      message: `Gas fee of $${gasFeeUSD.toFixed(2)} is extremely high. We recommend using an alternative payment method to save on fees.`,
      alternatives: bestAlternatives,
      costComparison,
      userConfirmationRequired: false
    };
  }

  /**
   * Handles warning gas fee scenarios
   */
  private async handleWarningGasFee(
    method: PaymentMethod,
    gasEstimate: GasEstimate,
    alternatives: PaymentMethod[],
    transactionAmount: number
  ): Promise<GasFeeHandlingResult> {
    const gasFeeUSD = gasEstimate.totalCostUSD || 0;
    const costComparison = await this.generateCostComparison(method, alternatives, transactionAmount);
    
    const hasSignificantSavings = costComparison.some(comp => comp.savingsPercentage > 20);

    if (hasSignificantSavings) {
      return {
        action: 'suggest_alternatives',
        message: `Gas fee of $${gasFeeUSD.toFixed(2)} is high. You could save money using alternative payment methods.`,
        alternatives: alternatives.slice(0, 3), // Top 3 alternatives
        costComparison,
        userConfirmationRequired: true
      };
    }

    return {
      action: 'warn',
      message: `Gas fee of $${gasFeeUSD.toFixed(2)} is higher than usual. Do you want to proceed?`,
      costComparison,
      userConfirmationRequired: true
    };
  }

  /**
   * Generates cost comparison between payment methods
   */
  private async generateCostComparison(
    currentMethod: PaymentMethod,
    alternatives: PaymentMethod[],
    transactionAmount: number
  ): Promise<CostComparison[]> {
    const comparisons: CostComparison[] = [];
    const currentCost = await this.estimateMethodCost(currentMethod, transactionAmount);

    for (const alternative of alternatives) {
      const altCost = await this.estimateMethodCost(alternative, transactionAmount);
      const savings = currentCost.totalCost - altCost.totalCost;
      const savingsPercentage = (savings / currentCost.totalCost) * 100;

      if (savings > 0) {
        comparisons.push({
          method: alternative,
          totalCost: altCost.totalCost,
          gasFee: altCost.gasFee,
          savings,
          savingsPercentage
        });
      }
    }

    // Sort by savings (highest first)
    return comparisons.sort((a, b) => b.savings - a.savings);
  }

  /**
   * Estimates cost for a payment method
   */
  private async estimateMethodCost(method: PaymentMethod, amount: number): Promise<CostEstimate> {
    // This would integrate with the cost effectiveness calculator
    // For now, return mock data based on method type
    switch (method.type) {
      case PaymentMethodType.STABLECOIN_USDC:
        return {
          totalCost: amount + 2, // $2 gas fee for USDC
          baseCost: amount,
          gasFee: 2,
          currency: 'USD',
          estimatedTime: 60,
          confidence: 0.9,
          breakdown: {
            amount: amount,
            networkFee: 2,
            platformFee: 0
          }
        };
      
      case PaymentMethodType.FIAT_STRIPE:
        return {
          totalCost: amount + (amount * 0.029), // 2.9% Stripe fee
          baseCost: amount,
          gasFee: 0,
          currency: 'USD',
          estimatedTime: 0,
          confidence: 1.0,
          breakdown: {
            amount: amount,
            networkFee: 0,
            platformFee: amount * 0.029
          }
        };
      
      case PaymentMethodType.NATIVE_ETH:
      default:
        return {
          totalCost: amount + 50, // High gas fee
          baseCost: amount,
          gasFee: 50,
          currency: 'USD',
          estimatedTime: 120,
          confidence: 0.8,
          breakdown: {
            amount: amount,
            networkFee: 50,
            platformFee: 0
          }
        };
    }
  }

  /**
   * Updates gas fee threshold configuration
   */
  updateConfig(newConfig: Partial<GasFeeThresholdConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current threshold configuration
   */
  getConfig(): GasFeeThresholdConfig {
    return { ...this.config };
  }

  /**
   * Checks if gas fee requires user confirmation
   */
  requiresUserConfirmation(gasEstimate: GasEstimate): boolean {
    const gasFeeUSD = gasEstimate.totalCostUSD || 0;
    return gasFeeUSD >= this.config.warningThreshold;
  }

  /**
   * Generates user-friendly gas fee warning message
   */
  generateWarningMessage(gasEstimate: GasEstimate, alternatives: PaymentMethod[]): string {
    const gasFeeUSD = gasEstimate.totalCostUSD || 0;
    const hasAlternatives = alternatives.length > 0;

    if (gasFeeUSD >= this.config.blockingThreshold) {
      return hasAlternatives 
        ? `Gas fees are extremely high ($${gasFeeUSD.toFixed(2)}). We strongly recommend using an alternative payment method.`
        : `Gas fees are extremely high ($${gasFeeUSD.toFixed(2)}). Consider waiting for lower network congestion.`;
    }

    if (gasFeeUSD >= this.config.warningThreshold) {
      return hasAlternatives
        ? `Gas fees are higher than usual ($${gasFeeUSD.toFixed(2)}). You might save money with alternative payment methods.`
        : `Gas fees are higher than usual ($${gasFeeUSD.toFixed(2)}). Proceed with caution.`;
    }

    return `Gas fee: $${gasFeeUSD.toFixed(2)}`;
  }
}

// Default configuration
export const DEFAULT_GAS_FEE_CONFIG: GasFeeThresholdConfig = {
  warningThreshold: 10, // $10 USD
  blockingThreshold: 50, // $50 USD
  maxAcceptableGasPrice: 100 // 100 Gwei
};

// Export singleton instance
export const gasFeeThresholdHandler = new GasFeeThresholdHandler(DEFAULT_GAS_FEE_CONFIG);