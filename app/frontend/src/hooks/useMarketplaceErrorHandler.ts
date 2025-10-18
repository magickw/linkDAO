/**
 * Hook for handling marketplace-specific errors
 * Provides consistent error handling across marketplace components
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '@/context/ToastContext';

export interface MarketplaceError {
  type: 'not_found' | 'network' | 'server' | 'validation' | 'unauthorized' | 'generic';
  message: string;
  retryable: boolean;
  suggestedActions?: string[];
  originalError?: Error;
}

export interface ErrorState {
  error: MarketplaceError | null;
  isLoading: boolean;
  retryCount: number;
}

export const useMarketplaceErrorHandler = () => {
  const router = useRouter();
  const { addToast } = useToast();
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    retryCount: 0
  });

  const classifyError = useCallback((error: any): MarketplaceError => {
    const message = error?.message || String(error);
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
      return {
        type: 'not_found',
        message: 'The requested item could not be found',
        retryable: false,
        suggestedActions: [
          'Check if the URL is correct',
          'Return to marketplace homepage',
          'Search for similar items'
        ]
      };
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
      return {
        type: 'network',
        message: 'Network connection error. Please check your internet connection.',
        retryable: true,
        suggestedActions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Disable VPN if enabled'
        ]
      };
    }

    if (lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503') || lowerMessage.includes('server')) {
      return {
        type: 'server',
        message: 'Server is temporarily unavailable. Please try again later.',
        retryable: true,
        suggestedActions: [
          'Wait a few minutes and try again',
          'Check our status page for updates'
        ]
      };
    }

    if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized')) {
      return {
        type: 'unauthorized',
        message: 'Please connect your wallet to access this content.',
        retryable: false,
        suggestedActions: [
          'Connect your wallet',
          'Refresh the page after connecting'
        ]
      };
    }

    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return {
        type: 'validation',
        message: 'Invalid data provided. Please check your input.',
        retryable: false,
        suggestedActions: [
          'Check all required fields',
          'Verify data format is correct'
        ]
      };
    }

    return {
      type: 'generic',
      message: 'An unexpected error occurred',
      retryable: true,
      suggestedActions: [
        'Try refreshing the page',
        'Contact support if the problem persists'
      ],
      originalError: error instanceof Error ? error : new Error(String(error))
    };
  }, []);

  const handleError = useCallback((error: any, context?: string) => {
    const marketplaceError = classifyError(error);
    
    setErrorState(prev => ({
      error: marketplaceError,
      isLoading: false,
      retryCount: prev.retryCount
    }));

    // Show toast notification for certain error types
    if (marketplaceError.type === 'network' || marketplaceError.type === 'server') {
      addToast({
        type: 'error',
        message: marketplaceError.message,
        duration: 5000
      });
    }

    // Log error for debugging
    console.error(`Marketplace error${context ? ` in ${context}` : ''}:`, error);

    return marketplaceError;
  }, [classifyError, addToast]);

  const clearError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  const retry = useCallback((retryFunction: () => Promise<void> | void) => {
    setErrorState(prev => ({
      error: null,
      isLoading: true,
      retryCount: prev.retryCount + 1
    }));

    try {
      const result = retryFunction();
      if (result instanceof Promise) {
        result.catch(handleError);
      }
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const navigateToMarketplace = useCallback(() => {
    router.push('/marketplace');
  }, [router]);

  const navigateBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      navigateToMarketplace();
    }
  }, [router, navigateToMarketplace]);

  const showErrorToast = useCallback((message: string, duration: number = 5000) => {
    addToast({
      type: 'error',
      message,
      duration
    });
  }, [addToast]);

  const showSuccessToast = useCallback((message: string, duration: number = 3000) => {
    addToast({
      type: 'success',
      message,
      duration
    });
  }, [addToast]);

  return {
    // State
    error: errorState.error,
    isLoading: errorState.isLoading,
    retryCount: errorState.retryCount,
    hasError: !!errorState.error,

    // Actions
    handleError,
    clearError,
    setLoading,
    retry,
    classifyError,

    // Navigation helpers
    navigateToMarketplace,
    navigateBack,

    // Toast helpers
    showErrorToast,
    showSuccessToast,

    // Utility functions
    isRetryableError: (error: MarketplaceError) => error.retryable,
    getErrorMessage: (error: MarketplaceError) => error.message,
    getSuggestedActions: (error: MarketplaceError) => error.suggestedActions || []
  };
};

export default useMarketplaceErrorHandler;