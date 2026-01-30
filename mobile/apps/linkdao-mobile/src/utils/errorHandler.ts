/**
 * Standardized Error Handler
 * Provides consistent error handling and user-friendly messages across the app
 */

import { Alert } from 'react-native';

// Error categories for standardized handling
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  WALLET = 'wallet',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// Standard error codes and messages
export const ERROR_CODES = {
  // Network errors
  NETWORK_OFFLINE: { code: 'NETWORK_OFFLINE', message: 'No internet connection', category: ErrorCategory.NETWORK },
  NETWORK_TIMEOUT: { code: 'NETWORK_TIMEOUT', message: 'Request timed out', category: ErrorCategory.TIMEOUT },
  NETWORK_SERVER_ERROR: { code: 'NETWORK_SERVER_ERROR', message: 'Server is temporarily unavailable', category: ErrorCategory.NETWORK },
  
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid login credentials', category: ErrorCategory.AUTHENTICATION },
  AUTH_SESSION_EXPIRED: { code: 'AUTH_SESSION_EXPIRED', message: 'Session expired. Please log in again', category: ErrorCategory.AUTHENTICATION },
  AUTH_RATE_LIMITED: { code: 'AUTH_RATE_LIMITED', message: 'Too many login attempts. Please try again later', category: ErrorCategory.AUTHENTICATION },
  
  // Wallet errors
  WALLET_NOT_CONNECTED: { code: 'WALLET_NOT_CONNECTED', message: 'Wallet not connected', category: ErrorCategory.WALLET },
  WALLET_LOCKED: { code: 'WALLET_LOCKED', message: 'Wallet is locked. Please unlock your wallet', category: ErrorCategory.WALLET },
  WALLET_REJECTED: { code: 'WALLET_REJECTED', message: 'Wallet connection was cancelled', category: ErrorCategory.WALLET },
  WALLET_NOT_INSTALLED: { code: 'WALLET_NOT_INSTALLED', message: 'Wallet app not installed', category: ErrorCategory.WALLET },
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: { code: 'VALIDATION_REQUIRED_FIELD', message: 'This field is required', category: ErrorCategory.VALIDATION },
  VALIDATION_INVALID_FORMAT: { code: 'VALIDATION_INVALID_FORMAT', message: 'Invalid format', category: ErrorCategory.VALIDATION },
  
  // Permission errors
  PERMISSION_DENIED: { code: 'PERMISSION_DENIED', message: 'Permission denied', category: ErrorCategory.PERMISSION },
  PERMISSION_CAMERA: { code: 'PERMISSION_CAMERA', message: 'Camera permission required', category: ErrorCategory.PERMISSION },
} as const;

interface HandledError {
  code: string;
  message: string;
  category: ErrorCategory;
  originalError?: any;
  recoverySuggestion?: string;
  shouldShowAlert?: boolean;
}

export class ErrorHandler {
  /**
   * Parse and categorize an error
   */
  static parseError(error: any): HandledError {
    const errorMessage = error?.message || String(error);
    const errorString = errorMessage.toLowerCase();

    // Network errors
    if (errorString.includes('network') || errorString.includes('internet') || errorString.includes('offline')) {
      return {
        code: ERROR_CODES.NETWORK_OFFLINE.code,
        message: ERROR_CODES.NETWORK_OFFLINE.message,
        category: ERROR_CODES.NETWORK_OFFLINE.category,
        originalError: error,
        recoverySuggestion: 'Check your internet connection and try again',
        shouldShowAlert: true
      };
    }

    if (errorString.includes('timeout') || errorString.includes('timed out')) {
      return {
        code: ERROR_CODES.NETWORK_TIMEOUT.code,
        message: ERROR_CODES.NETWORK_TIMEOUT.message,
        category: ERROR_CODES.NETWORK_TIMEOUT.category,
        originalError: error,
        recoverySuggestion: 'The request took too long. Please try again',
        shouldShowAlert: true
      };
    }

    // Authentication errors
    if (errorString.includes('invalid') && (errorString.includes('credential') || errorString.includes('signature'))) {
      return {
        code: ERROR_CODES.AUTH_INVALID_CREDENTIALS.code,
        message: ERROR_CODES.AUTH_INVALID_CREDENTIALS.message,
        category: ERROR_CODES.AUTH_INVALID_CREDENTIALS.category,
        originalError: error,
        recoverySuggestion: 'Please check your wallet connection and try again',
        shouldShowAlert: true
      };
    }

    if (errorString.includes('session') && errorString.includes('expired')) {
      return {
        code: ERROR_CODES.AUTH_SESSION_EXPIRED.code,
        message: ERROR_CODES.AUTH_SESSION_EXPIRED.message,
        category: ERROR_CODES.AUTH_SESSION_EXPIRED.category,
        originalError: error,
        recoverySuggestion: 'Please log in again to continue',
        shouldShowAlert: true
      };
    }

    if (errorString.includes('rate limit') || errorString.includes('too many')) {
      return {
        code: ERROR_CODES.AUTH_RATE_LIMITED.code,
        message: ERROR_CODES.AUTH_RATE_LIMITED.message,
        category: ERROR_CODES.AUTH_RATE_LIMITED.category,
        originalError: error,
        recoverySuggestion: 'Wait a few minutes before trying again',
        shouldShowAlert: true
      };
    }

    // Wallet errors
    if (errorString.includes('not connected') || errorString.includes('disconnected')) {
      return {
        code: ERROR_CODES.WALLET_NOT_CONNECTED.code,
        message: ERROR_CODES.WALLET_NOT_CONNECTED.message,
        category: ERROR_CODES.WALLET_NOT_CONNECTED.category,
        originalError: error,
        recoverySuggestion: 'Please connect your wallet and try again',
        shouldShowAlert: true
      };
    }

    if (errorString.includes('locked') || errorString.includes('unlock')) {
      return {
        code: ERROR_CODES.WALLET_LOCKED.code,
        message: ERROR_CODES.WALLET_LOCKED.message,
        category: ERROR_CODES.WALLET_LOCKED.category,
        originalError: error,
        recoverySuggestion: 'Unlock your wallet app and try again',
        shouldShowAlert: true
      };
    }

    if (errorString.includes('rejected') || errorString.includes('cancelled') || errorString.includes('denied')) {
      return {
        code: ERROR_CODES.WALLET_REJECTED.code,
        message: ERROR_CODES.WALLET_REJECTED.message,
        category: ERROR_CODES.WALLET_REJECTED.category,
        originalError: error,
        recoverySuggestion: 'The action was cancelled. Please try again if you wish to proceed',
        shouldShowAlert: false
      };
    }

    if (errorString.includes('not installed') || errorString.includes('not found')) {
      return {
        code: ERROR_CODES.WALLET_NOT_INSTALLED.code,
        message: ERROR_CODES.WALLET_NOT_INSTALLED.message,
        category: ERROR_CODES.WALLET_NOT_INSTALLED.category,
        originalError: error,
        recoverySuggestion: 'Install the required wallet app from your device store',
        shouldShowAlert: true
      };
    }

    // Default unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      category: ErrorCategory.UNKNOWN,
      originalError: error,
      recoverySuggestion: 'Please try again or contact support if the problem persists',
      shouldShowAlert: true
    };
  }

  /**
   * Handle error with appropriate user feedback
   */
  static handleError(error: any, options: { showAlert?: boolean; logError?: boolean } = {}): HandledError {
    const { showAlert = true, logError = true } = options;
    
    const handledError = this.parseError(error);
    
    if (logError) {
      console.error(`[${handledError.category}] ${handledError.code}:`, handledError.originalError || handledError.message);
    }

    if (showAlert && handledError.shouldShowAlert) {
      Alert.alert(
        'Error',
        handledError.message,
        handledError.recoverySuggestion ? [
          { text: 'OK', style: 'default' },
          { 
            text: 'Help', 
            style: 'default',
            onPress: () => Alert.alert('Help', handledError.recoverySuggestion)
          }
        ] : [{ text: 'OK', style: 'default' }]
      );
    }

    return handledError;
  }

  /**
   * Create a standardized error
   */
  static createError(code: keyof typeof ERROR_CODES, customMessage?: string): HandledError {
    const errorConfig = ERROR_CODES[code];
    return {
      code: errorConfig.code,
      message: customMessage || errorConfig.message,
      category: errorConfig.category,
      shouldShowAlert: true
    };
  }

  /**
   * Log error for debugging/monitoring
   */
  static logError(error: HandledError, context?: string): void {
    const logData = {
      timestamp: new Date().toISOString(),
      code: error.code,
      category: error.category,
      message: error.message,
      context: context || 'unspecified',
      originalError: error.originalError ? String(error.originalError) : undefined
    };
    
    console.error('🚨 Error Log:', JSON.stringify(logData, null, 2));
    
    // In production, you might want to send this to your analytics/error tracking service
    // analytics.track('error_occurred', logData);
  }
}

// Convenience functions
export const handleNetworkError = (error: any) => ErrorHandler.handleError(error, { showAlert: true });
export const handleAuthError = (error: any) => ErrorHandler.handleError(error, { showAlert: true });
export const handleWalletError = (error: any) => ErrorHandler.handleError(error, { showAlert: true });
export const logAndHandleError = (error: any, context?: string) => {
  const handledError = ErrorHandler.handleError(error, { logError: true });
  ErrorHandler.logError(handledError, context);
  return handledError;
};

export default ErrorHandler;