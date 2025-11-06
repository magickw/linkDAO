/**
 * Authentication Error Handler
 * Provides comprehensive error handling for authentication failures,
 * network issues, and wallet connection problems with user-friendly messages
 */

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  recoverable: boolean;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorContext {
  operation: string;
  walletAddress?: string;
  connector?: string;
  networkStatus?: 'online' | 'offline';
  retryCount?: number;
  timestamp: number;
}

/**
 * Authentication Error Handler Class
 */
export class AuthErrorHandler {
  private readonly ERROR_PATTERNS = {
    // User rejection errors
    USER_REJECTION: [
      'rejected',
      'denied',
      'cancelled',
      'user rejected',
      'user denied',
      'user cancelled'
    ],
    
    // Network errors
    NETWORK_ERROR: [
      'network error',
      'fetch failed',
      'connection refused',
      'timeout',
      'etimedout',
      'econnreset',
      'enotfound'
    ],
    
    // Service unavailable
    SERVICE_UNAVAILABLE: [
      'service unavailable',
      'temporarily unavailable',
      '503',
      'backend unavailable',
      'server error'
    ],
    
    // Wallet errors
    WALLET_ERROR: [
      'wallet not connected',
      'no wallet',
      'wallet locked',
      'not supported',
      'unsupported'
    ],
    
    // Authentication errors
    AUTH_ERROR: [
      'authentication failed',
      'invalid signature',
      'nonce expired',
      'session expired',
      'token expired'
    ],
    
    // Rate limiting
    RATE_LIMIT: [
      'rate limit',
      'too many requests',
      '429',
      'quota exceeded'
    ]
  };

  /**
   * Handle authentication error and return structured error information
   */
  handleError(error: any, context: ErrorContext): AuthError {
    const errorMessage = this.extractErrorMessage(error);
    const errorCode = this.determineErrorCode(errorMessage, error);
    
    return {
      code: errorCode,
      message: errorMessage,
      userMessage: this.getUserFriendlyMessage(errorCode, errorMessage, context),
      retryable: this.isRetryable(errorCode, context),
      recoverable: this.isRecoverable(errorCode),
      suggestions: this.getSuggestions(errorCode, context),
      severity: this.getSeverity(errorCode)
    };
  }

  /**
   * Extract error message from various error formats
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error) {
      return typeof error.error === 'string' ? error.error : error.error.message || 'Unknown error';
    }
    
    if (error?.data?.message) {
      return error.data.message;
    }
    
    if (error?.reason) {
      return error.reason;
    }
    
    return 'Unknown error occurred';
  }

  /**
   * Determine error code based on message and error object
   */
  private determineErrorCode(message: string, error: any): string {
    const lowerMessage = message.toLowerCase();
    
    // Check HTTP status codes
    if (error?.status || error?.response?.status) {
      const status = error.status || error.response.status;
      switch (status) {
        case 401:
          return 'UNAUTHORIZED';
        case 403:
          return 'FORBIDDEN';
        case 404:
          return 'NOT_FOUND';
        case 429:
          return 'RATE_LIMIT_EXCEEDED';
        case 500:
        case 502:
        case 503:
        case 504:
          return 'SERVICE_UNAVAILABLE';
      }
    }

    // Check error patterns
    for (const [category, patterns] of Object.entries(this.ERROR_PATTERNS)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()))) {
        switch (category) {
          case 'USER_REJECTION':
            return 'USER_REJECTED_SIGNATURE';
          case 'NETWORK_ERROR':
            return 'NETWORK_CONNECTION_ERROR';
          case 'SERVICE_UNAVAILABLE':
            return 'SERVICE_UNAVAILABLE';
          case 'WALLET_ERROR':
            return 'WALLET_CONNECTION_ERROR';
          case 'AUTH_ERROR':
            return 'AUTHENTICATION_FAILED';
          case 'RATE_LIMIT':
            return 'RATE_LIMIT_EXCEEDED';
        }
      }
    }

    // Check specific error codes
    if (error?.code) {
      switch (error.code) {
        case 4001:
          return 'USER_REJECTED_SIGNATURE';
        case -32002:
          return 'WALLET_REQUEST_PENDING';
        case -32603:
          return 'WALLET_INTERNAL_ERROR';
      }
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(code: string, originalMessage: string, context: ErrorContext): string {
    switch (code) {
      case 'USER_REJECTED_SIGNATURE':
        return 'You rejected the signature request. Please try again and approve the request in your wallet.';
      
      case 'WALLET_CONNECTION_ERROR':
        return 'There\'s an issue with your wallet connection. Please check that your wallet is connected and unlocked.';
      
      case 'WALLET_REQUEST_PENDING':
        return 'There\'s already a pending request in your wallet. Please check your wallet and complete or cancel the pending request.';
      
      case 'NETWORK_CONNECTION_ERROR':
        if (context.networkStatus === 'offline') {
          return 'You\'re currently offline. Please check your internet connection and try again.';
        }
        return 'Network connection issue detected. Please check your internet connection and try again.';
      
      case 'SERVICE_UNAVAILABLE':
        return 'Our service is temporarily unavailable. We\'re working to restore it. Please try again in a few moments.';
      
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment before trying again.';
      
      case 'AUTHENTICATION_FAILED':
        return 'Authentication failed. Please try signing in again.';
      
      case 'UNAUTHORIZED':
        return 'Your session has expired. Please sign in again.';
      
      case 'FORBIDDEN':
        return 'Access denied. Please check your permissions.';
      
      case 'WALLET_INTERNAL_ERROR':
        return 'Your wallet encountered an internal error. Please try refreshing the page or restarting your wallet.';
      
      default:
        // Try to make the original message more user-friendly
        if (originalMessage.length > 100) {
          return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
        }
        return originalMessage;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(code: string, context: ErrorContext): boolean {
    // Don't retry if we've already tried too many times
    if (context.retryCount && context.retryCount >= 3) {
      return false;
    }

    switch (code) {
      case 'USER_REJECTED_SIGNATURE':
      case 'WALLET_REQUEST_PENDING':
        return true;
      
      case 'NETWORK_CONNECTION_ERROR':
      case 'SERVICE_UNAVAILABLE':
        return true;
      
      case 'RATE_LIMIT_EXCEEDED':
        return true; // But with delay
      
      case 'AUTHENTICATION_FAILED':
        return context.retryCount ? context.retryCount < 2 : true;
      
      case 'WALLET_CONNECTION_ERROR':
      case 'WALLET_INTERNAL_ERROR':
        return true;
      
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return false;
      
      default:
        return true;
    }
  }

  /**
   * Check if error is recoverable through session recovery
   */
  private isRecoverable(code: string): boolean {
    switch (code) {
      case 'NETWORK_CONNECTION_ERROR':
      case 'SERVICE_UNAVAILABLE':
      case 'AUTHENTICATION_FAILED':
      case 'UNAUTHORIZED':
        return true;
      
      case 'USER_REJECTED_SIGNATURE':
      case 'WALLET_CONNECTION_ERROR':
      case 'FORBIDDEN':
        return false;
      
      default:
        return false;
    }
  }

  /**
   * Get suggestions for resolving the error
   */
  private getSuggestions(code: string, context: ErrorContext): string[] {
    const suggestions: string[] = [];

    switch (code) {
      case 'USER_REJECTED_SIGNATURE':
        suggestions.push('Click "Retry" and approve the signature request in your wallet');
        suggestions.push('Make sure your wallet is unlocked');
        break;
      
      case 'WALLET_CONNECTION_ERROR':
        suggestions.push('Check that your wallet extension is installed and enabled');
        suggestions.push('Try refreshing the page');
        suggestions.push('Make sure your wallet is unlocked');
        break;
      
      case 'WALLET_REQUEST_PENDING':
        suggestions.push('Check your wallet for pending requests');
        suggestions.push('Complete or cancel any pending transactions');
        suggestions.push('Try refreshing your wallet');
        break;
      
      case 'NETWORK_CONNECTION_ERROR':
        suggestions.push('Check your internet connection');
        suggestions.push('Try refreshing the page');
        if (context.networkStatus === 'offline') {
          suggestions.push('Wait for your connection to be restored');
        }
        break;
      
      case 'SERVICE_UNAVAILABLE':
        suggestions.push('Wait a few moments and try again');
        suggestions.push('Check our status page for service updates');
        break;
      
      case 'RATE_LIMIT_EXCEEDED':
        suggestions.push('Wait 30 seconds before trying again');
        suggestions.push('Avoid making too many requests quickly');
        break;
      
      case 'AUTHENTICATION_FAILED':
        suggestions.push('Try signing in again');
        suggestions.push('Make sure your wallet is connected');
        if (context.retryCount && context.retryCount > 1) {
          suggestions.push('Try refreshing the page');
        }
        break;
      
      case 'UNAUTHORIZED':
        suggestions.push('Sign in again to refresh your session');
        break;
      
      case 'WALLET_INTERNAL_ERROR':
        suggestions.push('Try refreshing the page');
        suggestions.push('Restart your wallet extension');
        suggestions.push('Clear your browser cache');
        break;
      
      default:
        suggestions.push('Try again in a few moments');
        suggestions.push('Refresh the page if the problem persists');
    }

    return suggestions;
  }

  /**
   * Get error severity level
   */
  private getSeverity(code: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (code) {
      case 'USER_REJECTED_SIGNATURE':
      case 'WALLET_REQUEST_PENDING':
        return 'low';
      
      case 'RATE_LIMIT_EXCEEDED':
      case 'NETWORK_CONNECTION_ERROR':
        return 'medium';
      
      case 'WALLET_CONNECTION_ERROR':
      case 'AUTHENTICATION_FAILED':
      case 'SERVICE_UNAVAILABLE':
        return 'high';
      
      case 'FORBIDDEN':
      case 'WALLET_INTERNAL_ERROR':
        return 'critical';
      
      default:
        return 'medium';
    }
  }

  /**
   * Get retry delay based on error code and attempt count
   */
  getRetryDelay(code: string, retryCount: number = 0): number {
    switch (code) {
      case 'RATE_LIMIT_EXCEEDED':
        return 30000; // 30 seconds
      
      case 'SERVICE_UNAVAILABLE':
        return Math.min(5000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s
      
      case 'NETWORK_CONNECTION_ERROR':
        return Math.min(2000 * Math.pow(2, retryCount), 15000); // Exponential backoff, max 15s
      
      case 'AUTHENTICATION_FAILED':
        return 3000; // 3 seconds
      
      default:
        return 1000; // 1 second
    }
  }

  /**
   * Check if error should trigger session recovery
   */
  shouldTriggerRecovery(code: string): boolean {
    return [
      'NETWORK_CONNECTION_ERROR',
      'SERVICE_UNAVAILABLE',
      'AUTHENTICATION_FAILED',
      'UNAUTHORIZED'
    ].includes(code);
  }

  /**
   * Format error for logging
   */
  formatForLogging(error: AuthError, context: ErrorContext): any {
    return {
      code: error.code,
      message: error.message,
      severity: error.severity,
      retryable: error.retryable,
      recoverable: error.recoverable,
      context: {
        operation: context.operation,
        walletAddress: context.walletAddress ? `${context.walletAddress.slice(0, 6)}...${context.walletAddress.slice(-4)}` : undefined,
        connector: context.connector,
        networkStatus: context.networkStatus,
        retryCount: context.retryCount,
        timestamp: new Date(context.timestamp).toISOString()
      }
    };
  }
}

// Create singleton instance
export const authErrorHandler = new AuthErrorHandler();
export default authErrorHandler;