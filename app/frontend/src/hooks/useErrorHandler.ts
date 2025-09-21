/**
 * Error Handler Hook
 * Provides error handling utilities for components
 */

import { useState, useCallback, useRef } from 'react';
import { ErrorContext, ErrorCategory, errorManager } from '../utils/errorHandling/ErrorManager';

interface UseErrorHandlerOptions {
  category?: ErrorCategory;
  enableRetry?: boolean;
  maxRetries?: number;
  onError?: (error: ErrorContext) => void;
}

interface UseErrorHandlerReturn {
  error: ErrorContext | null;
  isLoading: boolean;
  retryCount: number;
  handleError: (error: Error | ErrorContext) => void;
  clearError: () => void;
  retry: () => void;
  executeWithErrorHandling: <T>(operation: () => Promise<T>) => Promise<T | null>;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn => {
  const [error, setError] = useState<ErrorContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);

  const {
    category = ErrorCategory.UNKNOWN,
    enableRetry = true,
    maxRetries = 3,
    onError
  } = options;

  const handleError = useCallback((errorInput: Error | ErrorContext) => {
    const errorContext = errorManager.handleError(errorInput, { category });
    setError(errorContext);
    setIsLoading(false);
    
    if (onError) {
      onError(errorContext);
    }
  }, [category, onError]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const retry = useCallback(async () => {
    if (!enableRetry || retryCount >= maxRetries || !lastOperationRef.current) {
      return;
    }

    setError(null);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      await lastOperationRef.current();
    } catch (err) {
      handleError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enableRetry, retryCount, maxRetries, handleError]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    lastOperationRef.current = operation;
    setIsLoading(true);
    setError(null);

    try {
      const result = await errorManager.retryOperation(operation, { category });
      setIsLoading(false);
      return result;
    } catch (err) {
      handleError(err as Error);
      return null;
    }
  }, [category, handleError]);

  return {
    error,
    isLoading,
    retryCount,
    handleError,
    clearError,
    retry,
    executeWithErrorHandling
  };
};

// Specialized hooks for different error categories

export const useNetworkErrorHandler = () => {
  return useErrorHandler({
    category: ErrorCategory.NETWORK,
    enableRetry: true,
    maxRetries: 3
  });
};

export const useWalletErrorHandler = () => {
  return useErrorHandler({
    category: ErrorCategory.WALLET,
    enableRetry: true,
    maxRetries: 2
  });
};

export const useContentErrorHandler = () => {
  return useErrorHandler({
    category: ErrorCategory.CONTENT,
    enableRetry: true,
    maxRetries: 2
  });
};

export const useBlockchainErrorHandler = () => {
  return useErrorHandler({
    category: ErrorCategory.BLOCKCHAIN,
    enableRetry: true,
    maxRetries: 3
  });
};

export const useValidationErrorHandler = () => {
  return useErrorHandler({
    category: ErrorCategory.VALIDATION,
    enableRetry: false,
    maxRetries: 0
  });
};