import { PaymentMethod, GasEstimate } from '../types/paymentPrioritization';
import { gasFeeThresholdHandler, GasFeeHandlingResult } from './gasFeeThresholdHandler';
import { networkUnavailabilityHandler, NetworkHandlingResult } from './networkUnavailabilityHandler';
import { paymentMethodUnavailabilityHandler, UnavailabilityHandlingResult, UnavailabilityReason } from './paymentMethodUnavailabilityHandler';

export interface PaymentErrorContext {
  selectedMethod: PaymentMethod;
  availableAlternatives: PaymentMethod[];
  currentNetwork: number;
  transactionAmount: number;
  gasEstimate?: GasEstimate;
}

export interface PaymentErrorHandlingResult {
  type: 'success' | 'gas_fee_warning' | 'network_unavailable' | 'method_unavailable';
  recommendedAction: string;
  fallbackMethods: PaymentMethod[];
  gasFeeResult?: GasFeeHandlingResult;
  networkResult?: NetworkHandlingResult;
  unavailabilityResult?: UnavailabilityHandlingResult;
}

export class PaymentErrorHandlingService {
  /**
   * Main error handling orchestrator - handles all payment method errors
   */
  async handlePaymentMethodErrors(context: PaymentErrorContext): Promise<PaymentErrorHandlingResult> {
    // 1. Check gas fees if we have a gas estimate
    if (context.gasEstimate) {
      const gasFeeResult = await gasFeeThresholdHandler.handleGasFee(
        context.selectedMethod,
        context.gasEstimate,
        context.availableAlternatives,
        context.transactionAmount
      );

      if (gasFeeResult.action !== 'proceed') {
        return {
          type: 'gas_fee_warning',
          recommendedAction: gasFeeResult.message,
          fallbackMethods: gasFeeResult.alternatives || [],
          gasFeeResult
        };
      }
    }

    // 2. Check network compatibility
    const networkResult = await this.checkNetworkCompatibility(context);
    if (networkResult) {
      return {
        type: 'network_unavailable',
        recommendedAction: networkResult.userMessage,
        fallbackMethods: networkResult.alternatives || [],
        networkResult
      };
    }

    // 3. All checks passed
    return {
      type: 'success',
      recommendedAction: 'Payment method is ready to use',
      fallbackMethods: []
    };
  }

  /**
   * Handles payment retry after a failure
   */
  async handlePaymentRetry(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: PaymentErrorContext
  ): Promise<boolean> {
    const unavailabilityResult = await paymentMethodUnavailabilityHandler.handleUnavailableMethod(
      method,
      reason,
      {
        amount: context.transactionAmount,
        currency: 'USD',
        urgency: 'medium'
      },
      context.availableAlternatives
    );

    // Check if retry is possible
    if (unavailabilityResult.retryStrategy?.canRetry) {
      const canRetryNow = paymentMethodUnavailabilityHandler.canRetryNow(
        method,
        reason,
        unavailabilityResult.retryStrategy
      );

      if (canRetryNow) {
        // Record the retry attempt
        paymentMethodUnavailabilityHandler.recordRetryAttempt(method, reason);

        // In a real implementation, this would attempt the actual payment
        // For now, we'll simulate a 50% success rate
        const success = Math.random() > 0.5;

        if (success) {
          paymentMethodUnavailabilityHandler.resetRetryAttempts(method, reason);
        }

        return success;
      }
    }

    return false;
  }

  /**
   * Handles method unavailability scenarios
   */
  async handleMethodUnavailability(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: PaymentErrorContext
  ): Promise<PaymentErrorHandlingResult> {
    const unavailabilityResult = await paymentMethodUnavailabilityHandler.handleUnavailableMethod(
      method,
      reason,
      {
        amount: context.transactionAmount,
        currency: 'USD',
        urgency: 'medium'
      },
      context.availableAlternatives
    );

    return {
      type: 'method_unavailable',
      recommendedAction: unavailabilityResult.userMessage,
      fallbackMethods: unavailabilityResult.fallbackMethods,
      unavailabilityResult
    };
  }

  /**
   * Checks if the selected payment method is compatible with the current network
   */
  private async checkNetworkCompatibility(
    context: PaymentErrorContext
  ): Promise<NetworkHandlingResult | null> {
    const { selectedMethod, currentNetwork, availableAlternatives } = context;

    // Check if method has network requirements
    if (!selectedMethod.supportedNetworks || selectedMethod.supportedNetworks.length === 0) {
      // Method doesn't require network (e.g., fiat)
      return null;
    }

    // Check if current network is supported
    if (selectedMethod.supportedNetworks.includes(currentNetwork)) {
      // Current network is supported
      return null;
    }

    // Network is not supported, handle the error
    return await networkUnavailabilityHandler.handleUnsupportedNetwork(
      selectedMethod,
      currentNetwork,
      availableAlternatives
    );
  }

  /**
   * Gets recommended fallback payment methods based on error type
   */
  getRecommendedFallbacks(
    failedMethod: PaymentMethod,
    errorType: 'gas_fee' | 'network' | 'unavailable',
    availableMethods: PaymentMethod[]
  ): PaymentMethod[] {
    switch (errorType) {
      case 'gas_fee':
        // For high gas fees, recommend stablecoins or fiat
        return availableMethods.filter(m =>
          m.type === 'STABLECOIN_USDC' ||
          m.type === 'STABLECOIN_USDT' ||
          m.type === 'FIAT_STRIPE'
        );

      case 'network':
        // For network issues, recommend methods available on current network or fiat
        return availableMethods.filter(m => m.type === 'FIAT_STRIPE');

      case 'unavailable':
        // For unavailable methods, return all other available methods
        return availableMethods.filter(m => m.id !== failedMethod.id);

      default:
        return availableMethods;
    }
  }

  /**
   * Validates if a payment method can be used in the current context
   */
  async validatePaymentMethod(context: PaymentErrorContext): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check network compatibility
    if (context.selectedMethod.supportedNetworks && context.selectedMethod.supportedNetworks.length > 0) {
      if (!context.selectedMethod.supportedNetworks.includes(context.currentNetwork)) {
        errors.push('Payment method not supported on current network');
      }
    }

    // Check gas fees
    if (context.gasEstimate) {
      const gasFeeResult = await gasFeeThresholdHandler.handleGasFee(
        context.selectedMethod,
        context.gasEstimate,
        context.availableAlternatives,
        context.transactionAmount
      );

      if (gasFeeResult.action === 'block_transaction') {
        errors.push(`Gas fees too high: $${context.gasEstimate.totalCostUSD?.toFixed(2)}`);
      } else if (gasFeeResult.action === 'warn' || gasFeeResult.action === 'suggest_alternatives') {
        warnings.push(`High gas fees: $${context.gasEstimate.totalCostUSD?.toFixed(2)}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const paymentErrorHandlingService = new PaymentErrorHandlingService();
