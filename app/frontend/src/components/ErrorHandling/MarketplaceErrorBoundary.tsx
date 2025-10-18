/**
 * Marketplace-specific Error Boundary
 * Handles errors in marketplace navigation and data loading
 */

import React, { Component, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { ErrorHandler } from '../../utils/errorHandling';

interface MarketplaceErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface MarketplaceErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

export class MarketplaceErrorBoundary extends Component<
  MarketplaceErrorBoundaryProps,
  MarketplaceErrorBoundaryState
> {
  private maxRetries = 3;

  constructor(props: MarketplaceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<MarketplaceErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error for debugging
    console.error('Marketplace Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to error tracking service
    ErrorHandler.displayError(error, 'Marketplace Navigation');
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: this.state.retryCount + 1
      });
    }
  };

  handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/marketplace';
    }
  };

  handleReturnToMarketplace = () => {
    window.location.href = '/marketplace';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <MarketplaceErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.state.retryCount < this.maxRetries ? this.handleRetry : undefined}
          onGoBack={this.handleGoBack}
          onReturnToMarketplace={this.handleReturnToMarketplace}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
        />
      );
    }

    return this.props.children;
  }
}

interface MarketplaceErrorFallbackProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  onRetry?: () => void;
  onGoBack: () => void;
  onReturnToMarketplace: () => void;
  retryCount: number;
  maxRetries: number;
}

const MarketplaceErrorFallback: React.FC<MarketplaceErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onGoBack,
  onReturnToMarketplace,
  retryCount,
  maxRetries
}) => {
  const getErrorMessage = () => {
    if (!error) return 'An unexpected error occurred';

    // Provide user-friendly messages for common marketplace errors
    if (error.message.includes('404') || error.message.includes('not found')) {
      return 'The requested item could not be found. It may have been removed or is no longer available.';
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Unable to connect to the marketplace. Please check your internet connection.';
    }
    
    if (error.message.includes('timeout')) {
      return 'The request is taking longer than expected. Please try again.';
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('403')) {
      return 'You don\'t have permission to access this content.';
    }

    return 'Something went wrong while loading the marketplace content.';
  };

  const getErrorIcon = () => {
    if (error?.message.includes('404') || error?.message.includes('not found')) {
      return (
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
        </svg>
      );
    }
    
    if (error?.message.includes('network') || error?.message.includes('fetch')) {
      return (
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
    }

    return (
      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {getErrorIcon()}
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h2>
        
        <p className="text-gray-600 mb-6">
          {getErrorMessage()}
        </p>

        {retryCount > 0 && (
          <p className="text-sm text-gray-500 mb-4">
            Retry attempt {retryCount} of {maxRetries}
          </p>
        )}

        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Try Again</span>
            </button>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onGoBack}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Go Back</span>
            </button>

            <button
              onClick={onReturnToMarketplace}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              <span>Marketplace</span>
            </button>
          </div>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default MarketplaceErrorBoundary;