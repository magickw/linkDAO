/**
 * Payment Error Types and Handlers
 * Provides user-friendly error messages and recovery suggestions
 */

export enum PaymentErrorCode {
  // Wallet Errors
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WALLET_INITIALIZATION_FAILED = 'WALLET_INITIALIZATION_FAILED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  WRONG_NETWORK = 'WRONG_NETWORK',
  RPC_ERROR = 'RPC_ERROR',

  // Transaction Errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_TIMEOUT = 'TRANSACTION_TIMEOUT',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',

  // Smart Contract Errors
  CONTRACT_EXECUTION_FAILED = 'CONTRACT_EXECUTION_FAILED',
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',

  // Fiat Payment Errors
  STRIPE_ERROR = 'STRIPE_ERROR',
  CARD_DECLINED = 'CARD_DECLINED',
  INSUFFICIENT_FUNDS_FIAT = 'INSUFFICIENT_FUNDS_FIAT',
  PAYMENT_METHOD_INVALID = 'PAYMENT_METHOD_INVALID',

  // API Errors
  BACKEND_UNAVAILABLE = 'BACKEND_UNAVAILABLE',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  RATE_LIMITED = 'RATE_LIMITED',

  // Validation Errors
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface PaymentErrorDetails {
  code: PaymentErrorCode;
  message: string;
  userMessage: string;
  recoveryOptions: RecoveryOption[];
  retryable: boolean;
  metadata?: Record<string, any>;
}

export interface RecoveryOption {
  action: string;
  label: string;
  description: string;
  priority: 'primary' | 'secondary';
}

export class PaymentError extends Error {
  public readonly code: PaymentErrorCode;
  public readonly userMessage: string;
  public readonly recoveryOptions: RecoveryOption[];
  public readonly retryable: boolean;
  public readonly metadata?: Record<string, any>;

  constructor(details: PaymentErrorDetails) {
    super(details.message);
    this.name = 'PaymentError';
    this.code = details.code;
    this.userMessage = details.userMessage;
    this.recoveryOptions = details.recoveryOptions;
    this.retryable = details.retryable;
    this.metadata = details.metadata;
  }

  static fromError(error: any): PaymentError {
    // Wallet connection errors
    if (error.message?.includes('wallet') || error.message?.includes('Wallet')) {
      if (error.message?.includes('not initialized') || error.message?.includes('not connected')) {
        return new PaymentError({
          code: PaymentErrorCode.WALLET_NOT_CONNECTED,
          message: error.message,
          userMessage: 'Please connect your wallet to continue',
          recoveryOptions: [
            {
              action: 'connect_wallet',
              label: 'Connect Wallet',
              description: 'Connect your Web3 wallet to proceed with the payment',
              priority: 'primary'
            },
            {
              action: 'switch_to_fiat',
              label: 'Pay with Card',
              description: 'Use a credit/debit card instead',
              priority: 'secondary'
            }
          ],
          retryable: true
        });
      }
    }

    // Insufficient balance
    if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient')) {
      return new PaymentError({
        code: PaymentErrorCode.INSUFFICIENT_BALANCE,
        message: error.message,
        userMessage: 'Insufficient balance to complete this transaction',
        recoveryOptions: [
          {
            action: 'add_funds',
            label: 'Add Funds',
            description: 'Add more crypto to your wallet',
            priority: 'primary'
          },
          {
            action: 'switch_token',
            label: 'Use Different Token',
            description: 'Pay with a different cryptocurrency',
            priority: 'secondary'
          },
          {
            action: 'switch_to_fiat',
            label: 'Pay with Card',
            description: 'Use a credit/debit card instead',
            priority: 'secondary'
          }
        ],
        retryable: false
      });
    }

    // Transaction rejected
    if (error.message?.includes('User rejected') || error.code === 4001) {
      return new PaymentError({
        code: PaymentErrorCode.TRANSACTION_REJECTED,
        message: error.message,
        userMessage: 'Transaction was cancelled',
        recoveryOptions: [
          {
            action: 'retry',
            label: 'Try Again',
            description: 'Retry the payment',
            priority: 'primary'
          }
        ],
        retryable: true
      });
    }

    // Network errors
    if (error.message?.includes('network') || error.message?.includes('RPC')) {
      return new PaymentError({
        code: PaymentErrorCode.NETWORK_ERROR,
        message: error.message,
        userMessage: 'Network connection issue. Please check your internet connection',
        recoveryOptions: [
          {
            action: 'retry',
            label: 'Retry',
            description: 'Try the payment again',
            priority: 'primary'
          },
          {
            action: 'switch_rpc',
            label: 'Switch RPC',
            description: 'Try a different network provider',
            priority: 'secondary'
          }
        ],
        retryable: true
      });
    }

    // Backend unavailable
    if (error.message?.includes('Circuit breaker') || error.message?.includes('Too many recent failures')) {
      return new PaymentError({
        code: PaymentErrorCode.CIRCUIT_BREAKER_OPEN,
        message: error.message,
        userMessage: 'Payment system is temporarily unavailable. Please try again in a few minutes',
        recoveryOptions: [
          {
            action: 'wait_retry',
            label: 'Try Again Later',
            description: 'Wait a few minutes and retry',
            priority: 'primary'
          },
          {
            action: 'contact_support',
            label: 'Contact Support',
            description: 'Get help from our support team',
            priority: 'secondary'
          }
        ],
        retryable: true,
        metadata: { retryAfter: 5 * 60 * 1000 } // 5 minutes
      });
    }

    // Stripe errors
    if (error.type?.includes('StripeError') || error.message?.includes('Stripe')) {
      if (error.code === 'card_declined') {
        return new PaymentError({
          code: PaymentErrorCode.CARD_DECLINED,
          message: error.message,
          userMessage: 'Your card was declined. Please try a different payment method',
          recoveryOptions: [
            {
              action: 'try_different_card',
              label: 'Use Different Card',
              description: 'Try another payment method',
              priority: 'primary'
            },
            {
              action: 'switch_to_crypto',
              label: 'Pay with Crypto',
              description: 'Use cryptocurrency instead',
              priority: 'secondary'
            }
          ],
          retryable: false
        });
      }

      return new PaymentError({
        code: PaymentErrorCode.STRIPE_ERROR,
        message: error.message,
        userMessage: 'Payment processing error. Please try again',
        recoveryOptions: [
          {
            action: 'retry',
            label: 'Try Again',
            description: 'Retry the payment',
            priority: 'primary'
          },
          {
            action: 'switch_to_crypto',
            label: 'Pay with Crypto',
            description: 'Use cryptocurrency instead',
            priority: 'secondary'
          }
        ],
        retryable: true
      });
    }

    // Default unknown error
    return new PaymentError({
      code: PaymentErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Unknown error occurred',
      userMessage: 'An unexpected error occurred. Please try again',
      recoveryOptions: [
        {
          action: 'retry',
          label: 'Try Again',
          description: 'Retry the payment',
          priority: 'primary'
        },
        {
          action: 'contact_support',
          label: 'Contact Support',
          description: 'Get help from our support team',
          priority: 'secondary'
        }
      ],
      retryable: true,
      metadata: { originalError: error }
    });
  }
}

/**
 * Payment Error Recovery Handler
 */
export class PaymentErrorRecoveryHandler {
  static async handleError(
    error: PaymentError,
    context: {
      onRetry?: () => Promise<void>;
      onConnectWallet?: () => Promise<void>;
      onSwitchPaymentMethod?: (method: 'crypto' | 'fiat') => void;
      onContactSupport?: () => void;
    }
  ): Promise<void> {
    // Log error for monitoring
    console.error('[Payment Error]', {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      metadata: error.metadata
    });

    // Show user-friendly toast notification
    const toast = (await import('react-hot-toast')).default;
    toast.error(error.userMessage, {
      duration: 5000,
      position: 'top-center'
    });

    // Return the error for component handling
    return;
  }

  static getErrorMetrics(error: PaymentError): {
    severity: 'low' | 'medium' | 'high';
    category: string;
    impactUser: boolean;
    impactRevenue: boolean;
  } {
    const severityMap: Record<PaymentErrorCode, 'low' | 'medium' | 'high'> = {
      [PaymentErrorCode.WALLET_NOT_CONNECTED]: 'low',
      [PaymentErrorCode.WALLET_INITIALIZATION_FAILED]: 'medium',
      [PaymentErrorCode.INSUFFICIENT_BALANCE]: 'low',
      [PaymentErrorCode.INSUFFICIENT_GAS]: 'low',
      [PaymentErrorCode.NETWORK_ERROR]: 'medium',
      [PaymentErrorCode.WRONG_NETWORK]: 'low',
      [PaymentErrorCode.RPC_ERROR]: 'medium',
      [PaymentErrorCode.TRANSACTION_FAILED]: 'high',
      [PaymentErrorCode.TRANSACTION_REJECTED]: 'low',
      [PaymentErrorCode.TRANSACTION_TIMEOUT]: 'medium',
      [PaymentErrorCode.GAS_ESTIMATION_FAILED]: 'medium',
      [PaymentErrorCode.CONTRACT_EXECUTION_FAILED]: 'high',
      [PaymentErrorCode.CONTRACT_NOT_FOUND]: 'high',
      [PaymentErrorCode.STRIPE_ERROR]: 'high',
      [PaymentErrorCode.CARD_DECLINED]: 'medium',
      [PaymentErrorCode.INSUFFICIENT_FUNDS_FIAT]: 'medium',
      [PaymentErrorCode.PAYMENT_METHOD_INVALID]: 'medium',
      [PaymentErrorCode.BACKEND_UNAVAILABLE]: 'high',
      [PaymentErrorCode.CIRCUIT_BREAKER_OPEN]: 'high',
      [PaymentErrorCode.RATE_LIMITED]: 'medium',
      [PaymentErrorCode.INVALID_AMOUNT]: 'low',
      [PaymentErrorCode.INVALID_ADDRESS]: 'low',
      [PaymentErrorCode.INVALID_TOKEN]: 'low',
      [PaymentErrorCode.UNKNOWN_ERROR]: 'medium'
    };

    const severity = severityMap[error.code] || 'medium';

    const highRevenueImpact = [
      PaymentErrorCode.BACKEND_UNAVAILABLE,
      PaymentErrorCode.CIRCUIT_BREAKER_OPEN,
      PaymentErrorCode.CONTRACT_EXECUTION_FAILED,
      PaymentErrorCode.STRIPE_ERROR
    ];

    return {
      severity,
      category: error.code.split('_')[0].toLowerCase(),
      impactUser: true,
      impactRevenue: highRevenueImpact.includes(error.code)
    };
  }
}
