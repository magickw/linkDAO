/**
 * Comprehensive Error Boundary System
 * Provides different error boundaries for different feature areas
 */

import React, { Component, ReactNode } from 'react';
import { ErrorContext, ErrorCategory, ErrorSeverity, errorManager } from '../../utils/errorHandling/ErrorManager';
import { ErrorFallbackUI } from './ErrorFallbackUI';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  category?: ErrorCategory;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  enableRetry?: boolean;
  enableFallback?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorContext?: ErrorContext;
  retryCount: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorContext = errorManager.handleError(error, {
      category: this.props.category || ErrorCategory.UNKNOWN,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    this.setState({ errorContext });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        errorContext: undefined,
        retryCount: this.state.retryCount + 1
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallbackUI
          errorContext={this.state.errorContext}
          onRetry={this.props.enableRetry ? this.handleRetry : undefined}
          canRetry={this.state.retryCount < this.maxRetries}
          enableFallback={this.props.enableFallback}
        />
      );
    }

    return this.props.children;
  }
}

// Specialized Error Boundaries for different feature areas

export const ContentCreationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.CONTENT}
    enableRetry={true}
    enableFallback={true}
  >
    {children}
  </ErrorBoundary>
);

export const WalletErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.WALLET}
    enableRetry={true}
    enableFallback={false}
  >
    {children}
  </ErrorBoundary>
);

export const FeedErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.CONTENT}
    enableRetry={true}
    enableFallback={true}
    fallback={
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Feed Temporarily Unavailable</h3>
        <p className="text-gray-600 mb-4">We're having trouble loading your feed right now.</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Page
        </button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const NavigationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.UNKNOWN}
    enableRetry={true}
    enableFallback={true}
    fallback={
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">Navigation component failed to load</p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const ReputationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.CONTENT}
    enableRetry={true}
    enableFallback={true}
    fallback={
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-600">Reputation data temporarily unavailable</p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const TokenReactionErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.BLOCKCHAIN}
    enableRetry={true}
    enableFallback={true}
    fallback={
      <div className="p-2 text-center">
        <p className="text-sm text-gray-500">Reactions temporarily unavailable</p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const PerformanceErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    category={ErrorCategory.PERFORMANCE}
    enableRetry={true}
    enableFallback={true}
  >
    {children}
  </ErrorBoundary>
);