/**
 * Utility functions for handling browser extension-related errors
 * Specifically designed to suppress common wallet extension errors that don't affect app functionality
 */

export interface ExtensionError {
  message: string;
  stack?: string;
  source?: string;
}

/**
 * Patterns that indicate an error is related to browser extensions
 */
const EXTENSION_ERROR_PATTERNS = [
  // Chrome runtime API errors
  'chrome.runtime.sendMessage',
  'Extension ID',
  'chrome-extension://',
  
  // Common extension file patterns
  'inpage.js',
  'content_script',
  'injected.js',
  'provider.js',
  
  // Wallet-specific patterns
  'metamask',
  'wallet_',
  'web3-provider',
  'ethereum.request',
  'window.ethereum',
  
  // Common error messages
  'Non-Error promise rejection captured',
  'Script error',
  'TypeError: Error in invocation of runtime.sendMessage',
  'chrome.runtime.sendMessage() called from a webpage must specify an Extension ID',
  'runtime.sendMessage(optional string extensionId',
  'must specify an Extension ID (string) for its first argument',
  'Error in invocation of runtime.sendMessage',
  'called from a webpage must specify an Extension ID',
  'for its first argument',
  'opfgelmcmbiajamepnmloijbpoleiama', // Specific extension ID from your error
  
  // Extension-specific errors
  'coinbase wallet',
  'walletlink',
  'trust wallet',
  'phantom',
  'solflare',
  
  // Generic extension patterns
  'extension context invalidated',
  'extension:///',
  'moz-extension://',
  'safari-extension://',
] as const;

/**
 * Check if an error is related to browser extensions
 */
export function isExtensionError(error: ExtensionError | Error | string): boolean {
  let message = '';
  let stack = '';
  let source = '';
  
  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message || '';
    stack = error.stack || '';
  } else {
    message = error.message || '';
    stack = error.stack || '';
    source = error.source || '';
  }
  
  const textToCheck = `${message} ${stack} ${source}`.toLowerCase();
  
  return EXTENSION_ERROR_PATTERNS.some(pattern => 
    textToCheck.includes(pattern.toLowerCase())
  );
}

/**
 * Suppress extension-related errors in error handlers
 */
export function suppressExtensionError(error: ExtensionError | Error | string): boolean {
  if (isExtensionError(error)) {
    // Debug logging in development or when debug flag is set
    if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window as any).__DEBUG_EXTENSION_ERRORS__)) {
      console.group('🔇 Extension Error Suppressed');
      console.log('Error:', error);
      console.log('Type:', typeof error);
      if (error instanceof Error) {
        console.log('Stack:', error.stack);
        console.log('Name:', error.name);
      }
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    } else {
      console.debug('Suppressed extension error:', error);
    }
    return true;
  }
  return false;
}

/**
 * Enhanced error event handler that suppresses extension errors
 */
export function createExtensionSafeErrorHandler(
  originalHandler?: (event: ErrorEvent) => void
) {
  return (event: ErrorEvent) => {
    const error: ExtensionError = {
      message: event.message || '',
      stack: event.error?.stack || '',
      source: event.filename || ''
    };
    
    if (suppressExtensionError(error)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
    
    // Call original handler if provided and error is not suppressed
    if (originalHandler) {
      originalHandler(event);
    }
  };
}

/**
 * Enhanced promise rejection handler that suppresses extension errors
 */
export function createExtensionSafeRejectionHandler(
  originalHandler?: (event: PromiseRejectionEvent) => void
) {
  return (event: PromiseRejectionEvent) => {
    const reason = event.reason || '';
    const error: ExtensionError = {
      message: typeof reason === 'string' ? reason : (reason?.message || reason?.toString() || ''),
      stack: reason?.stack || ''
    };
    
    if (suppressExtensionError(error)) {
      event.preventDefault();
      return false;
    }
    
    // Call original handler if provided and error is not suppressed
    if (originalHandler) {
      originalHandler(event);
    }
  };
}

/**
 * Wrap a function to suppress extension errors
 */
export function withExtensionErrorSuppression<T extends (...args: any[]) => any>(
  fn: T
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          if (suppressExtensionError(error)) {
            return undefined; // Suppress the error
          }
          throw error; // Re-throw non-extension errors
        });
      }
      
      return result;
    } catch (error) {
      if (suppressExtensionError(error as Error)) {
        return undefined; // Suppress the error
      }
      throw error; // Re-throw non-extension errors
    }
  }) as T;
}

/**
 * Initialize global extension error suppression
 */
export function initializeExtensionErrorSuppression(): () => void {
  const errorHandler = createExtensionSafeErrorHandler();
  const rejectionHandler = createExtensionSafeRejectionHandler();
  
  // Add listeners with capture phase to catch errors early
  window.addEventListener('error', errorHandler, true);
  window.addEventListener('unhandledrejection', rejectionHandler, true);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('error', errorHandler, true);
    window.removeEventListener('unhandledrejection', rejectionHandler, true);
  };
}

/**
 * Safe wallet connection wrapper that suppresses extension errors
 */
export function safeWalletOperation<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  return withExtensionErrorSuppression(operation)().catch((error: Error) => {
    if (!isExtensionError(error)) {
      // Re-throw non-extension errors
      throw error;
    }
    
    console.debug('Wallet operation failed due to extension error:', error.message);
    return fallback;
  });
}

/**
 * Debug utility to log extension error suppression in development
 */
export function debugExtensionErrors(enabled: boolean = process.env.NODE_ENV === 'development') {
  if (!enabled) return;
  
  console.log('🐛 Extension error debugging enabled - will log suppressed errors');
  
  // Add global debug flag
  (window as any).__DEBUG_EXTENSION_ERRORS__ = true;
}

export default {
  isExtensionError,
  suppressExtensionError,
  createExtensionSafeErrorHandler,
  createExtensionSafeRejectionHandler,
  withExtensionErrorSuppression,
  initializeExtensionErrorSuppression,
  safeWalletOperation,
  debugExtensionErrors
};