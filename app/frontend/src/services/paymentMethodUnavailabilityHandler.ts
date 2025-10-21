import { PaymentMethod, PaymentMethodType } from '../types/paymentPrioritization';

export interface UnavailabilityReason {
  type: 'insufficient_balance' | 'service_unavailable' | 'network_error' | 'validation_failed' | 'rate_limit' | 'maintenance';
  message: string;
  details?: string;
  retryAfter?: number; // seconds
}

export interface UserAction {
  type: 'add_funds' | 'switch_network' | 'wait_and_retry' | 'contact_support' | 'use_alternative';
  description: string;
  actionUrl?: string;
}

export interface RetryStrategy {
  canRetry: boolean;
  retryAfter?: number; // seconds
  maxRetries: number;
  backoffMultiplier: number;
}

export interface UnavailabilityHandlingResult {
  fallbackMethods: PaymentMethod[];
  userMessage: string;
  actionRequired?: UserAction;
  retryStrategy?: RetryStrategy;
  severity: 'low' | 'medium' | 'high';
  canProceedWithoutAction: boolean;
}

export interface TransactionContext {
  amount: number;
  currency: string;
  recipient?: string;
  urgency: 'low' | 'medium' | 'high';
}

export class PaymentMethodUnavailabilityHandler {
  private retryAttempts: Map<string, number> = new Map();
  private lastRetryTime: Map<string, number> = new Map();

  /**
   * Handles unavailable payment method scenarios
   */
  async handleUnavailableMethod(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): Promise<UnavailabilityHandlingResult> {
    switch (reason.type) {
      case 'insufficient_balance':
        return this.handleInsufficientBalance(method, reason, context, availableAlternatives);
      
      case 'service_unavailable':
        return this.handleServiceUnavailable(method, reason, context, availableAlternatives);
      
      case 'network_error':
        return this.handleNetworkError(method, reason, context, availableAlternatives);
      
      case 'validation_failed':
        return this.handleValidationFailed(method, reason, context, availableAlternatives);
      
      case 'rate_limit':
        return this.handleRateLimit(method, reason, context, availableAlternatives);
      
      case 'maintenance':
        return this.handleMaintenance(method, reason, context, availableAlternatives);
      
      default:
        return this.handleGenericError(method, reason, context, availableAlternatives);
    }
  }

  /**
   * Handles insufficient balance scenarios
   */
  private handleInsufficientBalance(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): UnavailabilityHandlingResult {
    const fallbackMethods = this.prioritizeFallbackMethods(availableAlternatives, method);
    
    // Check if user has other crypto options
    const otherCryptoMethods = fallbackMethods.filter(m => 
      m.type !== PaymentMethodType.FIAT_STRIPE && m.id !== method.id
    );
    
    // Check if fiat is available
    const fiatMethod = fallbackMethods.find(m => m.type === PaymentMethodType.FIAT_STRIPE);

    let actionRequired: UserAction | undefined;
    let userMessage: string;
    let canProceedWithoutAction = false;

    if (method.type === PaymentMethodType.FIAT_STRIPE) {
      // Fiat payment failed - likely card issue
      userMessage = `Payment failed: ${reason.message}. Please try a different payment method or update your payment information.`;
      actionRequired = {
        type: 'use_alternative',
        description: 'Use a different payment method',
        actionUrl: '/payment-methods'
      };
    } else {
      // Crypto payment - insufficient balance
      if (fiatMethod) {
        userMessage = `Insufficient ${method.name} balance. You can use fiat payment or add funds to your wallet.`;
        canProceedWithoutAction = true;
      } else if (otherCryptoMethods.length > 0) {
        userMessage = `Insufficient ${method.name} balance. You can use ${otherCryptoMethods[0].name} or add funds to your wallet.`;
        canProceedWithoutAction = true;
      } else {
        userMessage = `Insufficient ${method.name} balance. Please add funds to your wallet to continue.`;
        actionRequired = {
          type: 'add_funds',
          description: `Add ${method.name} to your wallet`,
          actionUrl: this.getAddFundsUrl(method)
        };
      }
    }

    return {
      fallbackMethods,
      userMessage,
      actionRequired,
      severity: fallbackMethods.length > 0 ? 'medium' : 'high',
      canProceedWithoutAction
    };
  }

  /**
   * Handles service unavailable scenarios
   */
  private handleServiceUnavailable(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): UnavailabilityHandlingResult {
    const fallbackMethods = this.prioritizeFallbackMethods(availableAlternatives, method);
    const retryStrategy = this.createRetryStrategy(method, reason);

    return {
      fallbackMethods,
      userMessage: `${method.name} is temporarily unavailable: ${reason.message}. ${fallbackMethods.length > 0 ? 'You can use an alternative payment method or try again later.' : 'Please try again later.'}`,
      retryStrategy,
      severity: fallbackMethods.length > 0 ? 'low' : 'high',
      canProceedWithoutAction: fallbackMethods.length > 0
    };
  }

  /**
   * Handles network error scenarios
   */
  private handleNetworkError(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): UnavailabilityHandlingResult {
    const fallbackMethods = this.prioritizeFallbackMethods(availableAlternatives, method);
    const retryStrategy = this.createRetryStrategy(method, reason);

    // Prioritize fiat payment for network errors
    const fiatMethod = fallbackMethods.find(m => m.type === PaymentMethodType.FIAT_STRIPE);
    if (fiatMethod) {
      fallbackMethods.unshift(fiatMethod);
    }

    return {
      fallbackMethods,
      userMessage: `Network connection issue with ${method.name}: ${reason.message}. ${fiatMethod ? 'You can use fiat payment which doesn\'t require blockchain connectivity.' : 'Please check your connection and try again.'}`,
      retryStrategy,
      severity: 'medium',
      canProceedWithoutAction: fallbackMethods.length > 0
    };
  }

  /**
   * Handles validation failed scenarios
   */
  private handleValidationFailed(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): UnavailabilityHandlingResult {
    const fallbackMethods = this.prioritizeFallbackMethods(availableAlternatives, method);

    return {
      fallbackMethods,
      userMessage: `${method.name} validation failed: ${reason.message}. Please try a different payment method.`,
      actionRequired: {
        type: 'use_alternative',
        description: 'Select a different payment method'
      },
      severity: 'medium',
      canProceedWithoutAction: fallbackMethods.length > 0
    };
  }

  /**
   * Handles rate limit scenarios
   */
  private handleRateLimit(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): UnavailabilityHandlingResult {
    const fallbackMethods = this.prioritizeFallbackMethods(availableAlternatives, method);
    const retryAfter = reason.retryAfter || 300; // 5 minutes default

    return {
      fallbackMethods,
      userMessage: `${method.name} rate limit exceeded. ${fallbackMethods.length > 0 ? 'You can use an alternative payment method or' : 'Please'} wait ${this.formatRetryTime(retryAfter)} before trying again.`,
      retryStrategy: {
        canRetry: true,
        retryAfter,
        maxRetries: 3,
        backoffMultiplier: 1.5
      },
      severity: fallbackMethods.length > 0 ? 'low' : 'medium',
      canProceedWithoutAction: fallbackMethods.length > 0
    };
  }

  /**
   * Handles maintenance scenarios
   */
  private handleMaintenance(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): UnavailabilityHandlingResult {
    const fallbackMethods = this.prioritizeFallbackMethods(availableAlternatives, method);
    const retryAfter = reason.retryAfter || 3600; // 1 hour default

    return {
      fallbackMethods,
      userMessage: `${method.name} is under maintenance: ${reason.message}. ${fallbackMethods.length > 0 ? 'Please use an alternative payment method.' : `Service will be restored in approximately ${this.formatRetryTime(retryAfter)}.`}`,
      retryStrategy: reason.retryAfter ? {
        canRetry: true,
        retryAfter,
        maxRetries: 1,
        backoffMultiplier: 1
      } : undefined,
      severity: fallbackMethods.length > 0 ? 'low' : 'high',
      canProceedWithoutAction: fallbackMethods.length > 0
    };
  }

  /**
   * Handles generic error scenarios
   */
  private handleGenericError(
    method: PaymentMethod,
    reason: UnavailabilityReason,
    context: TransactionContext,
    availableAlternatives: PaymentMethod[]
  ): UnavailabilityHandlingResult {
    const fallbackMethods = this.prioritizeFallbackMethods(availableAlternatives, method);

    return {
      fallbackMethods,
      userMessage: `${method.name} is currently unavailable: ${reason.message}. ${fallbackMethods.length > 0 ? 'Please try an alternative payment method.' : 'Please try again later or contact support.'}`,
      actionRequired: fallbackMethods.length === 0 ? {
        type: 'contact_support',
        description: 'Contact customer support for assistance'
      } : undefined,
      severity: fallbackMethods.length > 0 ? 'medium' : 'high',
      canProceedWithoutAction: fallbackMethods.length > 0
    };
  }

  /**
   * Prioritizes fallback methods based on reliability and user preference
   */
  private prioritizeFallbackMethods(availableMethods: PaymentMethod[], failedMethod: PaymentMethod): PaymentMethod[] {
    const filtered = availableMethods.filter(m => m.id !== failedMethod.id);
    
    // Sort by reliability: Fiat > Stablecoins > Native tokens
    return filtered.sort((a, b) => {
      const priorityOrder = {
        [PaymentMethodType.FIAT_STRIPE]: 1,
        [PaymentMethodType.STABLECOIN_USDC]: 2,
        [PaymentMethodType.STABLECOIN_USDT]: 3,
        [PaymentMethodType.NATIVE_ETH]: 4
      };
      
      return (priorityOrder[a.type] || 5) - (priorityOrder[b.type] || 5);
    });
  }

  /**
   * Creates retry strategy based on method and reason
   */
  private createRetryStrategy(method: PaymentMethod, reason: UnavailabilityReason): RetryStrategy {
    const methodKey = `${method.id}-${reason.type}`;
    const currentAttempts = this.retryAttempts.get(methodKey) || 0;
    
    let maxRetries = 3;
    let backoffMultiplier = 2;
    let baseRetryAfter = 30; // 30 seconds

    switch (reason.type) {
      case 'network_error':
        maxRetries = 5;
        baseRetryAfter = 10;
        break;
      case 'service_unavailable':
        maxRetries = 3;
        baseRetryAfter = 60;
        break;
      case 'rate_limit':
        maxRetries = 2;
        baseRetryAfter = reason.retryAfter || 300;
        backoffMultiplier = 1;
        break;
    }

    const retryAfter = Math.min(baseRetryAfter * Math.pow(backoffMultiplier, currentAttempts), 600); // Max 10 minutes

    return {
      canRetry: currentAttempts < maxRetries,
      retryAfter,
      maxRetries,
      backoffMultiplier
    };
  }

  /**
   * Records a retry attempt
   */
  recordRetryAttempt(method: PaymentMethod, reason: UnavailabilityReason): void {
    const methodKey = `${method.id}-${reason.type}`;
    const currentAttempts = this.retryAttempts.get(methodKey) || 0;
    this.retryAttempts.set(methodKey, currentAttempts + 1);
    this.lastRetryTime.set(methodKey, Date.now());
  }

  /**
   * Resets retry attempts for a method
   */
  resetRetryAttempts(method: PaymentMethod, reason: UnavailabilityReason): void {
    const methodKey = `${method.id}-${reason.type}`;
    this.retryAttempts.delete(methodKey);
    this.lastRetryTime.delete(methodKey);
  }

  /**
   * Checks if retry is allowed based on time and attempt limits
   */
  canRetryNow(method: PaymentMethod, reason: UnavailabilityReason, retryStrategy: RetryStrategy): boolean {
    const methodKey = `${method.id}-${reason.type}`;
    const lastRetry = this.lastRetryTime.get(methodKey);
    
    if (!lastRetry) return true;
    
    const timeSinceLastRetry = (Date.now() - lastRetry) / 1000;
    return timeSinceLastRetry >= (retryStrategy.retryAfter || 0);
  }

  /**
   * Gets URL for adding funds for a specific payment method
   */
  private getAddFundsUrl(method: PaymentMethod): string {
    switch (method.type) {
      case PaymentMethodType.NATIVE_ETH:
        return 'https://ethereum.org/en/get-eth/';
      case PaymentMethodType.STABLECOIN_USDC:
        return 'https://www.centre.io/usdc';
      case PaymentMethodType.STABLECOIN_USDT:
        return 'https://tether.to/';
      default:
        return '/wallet';
    }
  }

  /**
   * Formats retry time in human-readable format
   */
  private formatRetryTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      const hours = Math.ceil(seconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }

  /**
   * Clears old retry attempts (cleanup method)
   */
  clearOldRetryAttempts(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    for (const [key, timestamp] of this.lastRetryTime.entries()) {
      if (now - timestamp > maxAge) {
        this.retryAttempts.delete(key);
        this.lastRetryTime.delete(key);
      }
    }
  }
}

// Export singleton instance
export const paymentMethodUnavailabilityHandler = new PaymentMethodUnavailabilityHandler();