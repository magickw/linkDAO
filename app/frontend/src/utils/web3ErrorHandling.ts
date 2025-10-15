/**
 * Web3 error handling utilities and progressive enhancement framework
 */

export type Web3ErrorType = 
  | 'WALLET_NOT_CONNECTED'
  | 'WALLET_CONNECTION_REJECTED'
  | 'NETWORK_MISMATCH'
  | 'INSUFFICIENT_FUNDS'
  | 'TRANSACTION_REJECTED'
  | 'TRANSACTION_FAILED'
  | 'CONTRACT_ERROR'
  | 'RPC_ERROR'
  | 'PRICE_FEED_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Web3Error {
  type: Web3ErrorType;
  message: string;
  severity: ErrorSeverity;
  code?: string | number;
  originalError?: Error;
  timestamp: Date;
  context?: ErrorContext;
}

export interface ErrorContext {
  action?: string;
  component?: string;
  userAddress?: string;
  chainId?: number;
  transactionHash?: string;
  contractAddress?: string;
  methodName?: string;
  gasLimit?: number;
  gasPrice?: number;
}

export interface ErrorResponse {
  message: string;
  severity: ErrorSeverity;
  fallbackAction?: () => void;
  retryAction?: () => void;
  userGuidance?: string;
  technicalDetails?: string;
  reportable: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: Web3ErrorType[];
}

export class Web3ErrorHandler {
  private static instance: Web3ErrorHandler;
  private errorLog: Web3Error[] = [];
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['RPC_ERROR', 'TIMEOUT_ERROR', 'PRICE_FEED_ERROR']
  };

  static getInstance(): Web3ErrorHandler {
    if (!Web3ErrorHandler.instance) {
      Web3ErrorHandler.instance = new Web3ErrorHandler();
    }
    return Web3ErrorHandler.instance;
  }

  handleError(error: Error | Web3Error, context?: ErrorContext): ErrorResponse {
    const web3Error = this.normalizeError(error, context);
    this.logError(web3Error);
    
    return this.createErrorResponse(web3Error);
  }

  private normalizeError(error: Error | Web3Error, context?: ErrorContext): Web3Error {
    if (this.isWeb3Error(error)) {
      return { ...error, context: { ...error.context, ...context } };
    }

    // Convert standard errors to Web3Error
    const errorType = this.classifyError(error);
    return {
      type: errorType,
      message: error.message || 'An unknown error occurred',
      severity: this.getSeverity(errorType),
      originalError: error,
      timestamp: new Date(),
      context
    };
  }

  private isWeb3Error(error: any): error is Web3Error {
    return error && typeof error.type === 'string' && typeof error.severity === 'string';
  }

  private classifyError(error: Error): Web3ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('user rejected') || message.includes('user denied')) {
      return 'TRANSACTION_REJECTED';
    }
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return 'INSUFFICIENT_FUNDS';
    }
    if (message.includes('network') || message.includes('chain')) {
      return 'NETWORK_MISMATCH';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT_ERROR';
    }
    if (message.includes('rpc') || message.includes('provider')) {
      return 'RPC_ERROR';
    }
    if (message.includes('contract') || message.includes('revert')) {
      return 'CONTRACT_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  private getSeverity(errorType: Web3ErrorType): ErrorSeverity {
    const severityMap: Record<Web3ErrorType, ErrorSeverity> = {
      'WALLET_NOT_CONNECTED': 'medium',
      'WALLET_CONNECTION_REJECTED': 'low',
      'NETWORK_MISMATCH': 'medium',
      'INSUFFICIENT_FUNDS': 'medium',
      'TRANSACTION_REJECTED': 'low',
      'TRANSACTION_FAILED': 'high',
      'CONTRACT_ERROR': 'high',
      'RPC_ERROR': 'medium',
      'PRICE_FEED_ERROR': 'low',
      'TIMEOUT_ERROR': 'medium',
      'UNKNOWN_ERROR': 'high'
    };
    
    return severityMap[errorType] || 'medium';
  }

  private createErrorResponse(error: Web3Error): ErrorResponse {
    const responses: Record<Web3ErrorType, Omit<ErrorResponse, 'severity'>> = {
      'WALLET_NOT_CONNECTED': {
        message: 'Please connect your wallet to continue',
        fallbackAction: () => this.showWalletConnection(),
        userGuidance: 'Click the "Connect Wallet" button to get started',
        reportable: false
      },
      'WALLET_CONNECTION_REJECTED': {
        message: 'Wallet connection was cancelled',
        retryAction: () => this.showWalletConnection(),
        userGuidance: 'Please approve the connection request in your wallet',
        reportable: false
      },
      'NETWORK_MISMATCH': {
        message: 'Please switch to the correct network',
        fallbackAction: () => this.showNetworkSwitch(),
        userGuidance: 'Switch to the required network in your wallet',
        reportable: false
      },
      'INSUFFICIENT_FUNDS': {
        message: 'Insufficient funds for this transaction',
        userGuidance: 'Please add more funds to your wallet or reduce the transaction amount',
        reportable: false
      },
      'TRANSACTION_REJECTED': {
        message: 'Transaction was cancelled',
        retryAction: () => this.retryLastAction(),
        userGuidance: 'You can try the transaction again',
        reportable: false
      },
      'TRANSACTION_FAILED': {
        message: 'Transaction failed on the blockchain',
        retryAction: () => this.retryLastAction(),
        userGuidance: 'The transaction was rejected by the network. Please try again with higher gas fees.',
        reportable: true
      },
      'CONTRACT_ERROR': {
        message: 'Smart contract interaction failed',
        userGuidance: 'There was an issue with the smart contract. Please try again later.',
        reportable: true
      },
      'RPC_ERROR': {
        message: 'Network connection issue',
        retryAction: () => this.retryLastAction(),
        userGuidance: 'Please check your internet connection and try again',
        reportable: true
      },
      'PRICE_FEED_ERROR': {
        message: 'Unable to fetch current prices',
        fallbackAction: () => this.showCachedPrices(),
        userGuidance: 'Showing cached prices. Live prices will update when connection is restored.',
        reportable: false
      },
      'TIMEOUT_ERROR': {
        message: 'Request timed out',
        retryAction: () => this.retryLastAction(),
        userGuidance: 'The request took too long. Please try again.',
        reportable: false
      },
      'UNKNOWN_ERROR': {
        message: 'An unexpected error occurred',
        userGuidance: 'Please try again. If the problem persists, contact support.',
        reportable: true
      }
    };

    const response = responses[error.type];
    return {
      ...response,
      severity: error.severity,
      technicalDetails: error.originalError?.stack || error.message
    };
  }

  private logError(error: Web3Error): void {
    this.errorLog.push(error);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Web3 Error:', error);
    }

    // Report critical errors
    if (error.severity === 'critical') {
      this.reportError(error);
    }
  }

  private reportError(error: Web3Error): void {
    // Implementation for error reporting service
    // This would typically send to an error tracking service like Sentry
    console.error('Critical Web3 Error reported:', error);
  }

  private showWalletConnection(): void {
    // Trigger wallet connection modal
    window.dispatchEvent(new CustomEvent('show-wallet-connection'));
  }

  private showNetworkSwitch(): void {
    // Trigger network switch modal
    window.dispatchEvent(new CustomEvent('show-network-switch'));
  }

  private showCachedPrices(): void {
    // Show cached price data
    window.dispatchEvent(new CustomEvent('show-cached-prices'));
  }

  private retryLastAction(): void {
    // Retry the last failed action
    window.dispatchEvent(new CustomEvent('retry-last-action'));
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    context?: ErrorContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const web3Error = this.normalizeError(lastError, context);
        
        if (!config.retryableErrors.includes(web3Error.type) || attempt === config.maxAttempts) {
          throw error;
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  getErrorHistory(): Web3Error[] {
    return [...this.errorLog];
  }

  clearErrorHistory(): void {
    this.errorLog = [];
  }
}

export const web3ErrorHandler = Web3ErrorHandler.getInstance();