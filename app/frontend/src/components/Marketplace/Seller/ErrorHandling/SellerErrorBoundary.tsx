import React, { Component, ErrorInfo, ReactNode } from 'react';
import { SellerError, SellerErrorType } from '../../../../types/sellerError';
import { DefaultSellerErrorFallback } from './DefaultSellerErrorFallback';

interface SellerErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error?: SellerError; onReset?: () => void }>;
  context?: string;
  onError?: (error: SellerError, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
}

interface SellerErrorBoundaryState {
  hasError: boolean;
  error?: SellerError;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

/**
 * Error boundary component for seller system with consistent error handling
 * and graceful degradation capabilities
 */
export class SellerErrorBoundary extends Component<
  SellerErrorBoundaryProps,
  SellerErrorBoundaryState
> {
  private maxRetries = 3;
  private errorReportingService?: any;

  constructor(props: SellerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SellerErrorBoundaryState> {
    // Safely handle any error, including ones that occur during error processing
    try {
      // Safely check if error is an instance of SellerError
      let sellerError: SellerError;

      if (error && typeof error === 'object' && error.constructor.name === 'SellerError') {
        // It's a SellerError
        sellerError = error as SellerError;
      } else if (error instanceof SellerError) {
        sellerError = error;
      } else {
        // Convert regular errors to SellerError if needed
        const message = error?.message || 'An unexpected error occurred';
        const errorName = error?.name || 'UnknownError';

        sellerError = new SellerError(
          SellerErrorType.API_ERROR,
          message,
          'COMPONENT_ERROR',
          { originalError: errorName }
        );
      }

      return {
        hasError: true,
        error: sellerError,
      };
    } catch (err: any) {
      // If even creating the error fails, return a basic error state
      console.error('Failed to process error in error boundary:', err);

      try {
        return {
          hasError: true,
          error: new SellerError(
            SellerErrorType.API_ERROR,
            'An unexpected error occurred',
            'ERROR_BOUNDARY_FAILURE',
            { processingError: err?.message }
          ),
        };
      } catch (fallbackErr) {
        // Last resort: return just the state flag
        console.error('Failed even in fallback error handling:', fallbackErr);
        return {
          hasError: true,
        };
      }
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      const sellerError = this.state.error ||
        (error && error.constructor.name === 'SellerError' ? error :
          new SellerError(
            SellerErrorType.API_ERROR,
            error?.message || 'An unknown error occurred',
            'COMPONENT_ERROR'
          ));

      this.setState({ errorInfo });

      // Log error to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Seller Error Boundary Caught Error');
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        if (sellerError && typeof sellerError.toJSON === 'function') {
          console.error('Seller Error:', sellerError.toJSON());
        }
        console.groupEnd();
      }

      // Report error to monitoring service
      if (sellerError) {
        this.reportError(sellerError, errorInfo);
      }

      // Call custom error handler if provided
      if (this.props.onError && sellerError) {
        this.props.onError(sellerError, errorInfo);
      }
    } catch (handlerError) {
      // If error handling itself fails, just log it
      console.error('Error in componentDidCatch handler:', handlerError);
    }
  }

  private reportError(error: SellerError, errorInfo: ErrorInfo) {
    try {
      // Only proceed if we have a valid error object
      if (!error) return;

      // Report to error tracking service if available
      try {
        if (this.errorReportingService && typeof this.errorReportingService.reportError === 'function') {
          this.errorReportingService.reportError(error, {
            context: this.props.context || 'seller-component',
            componentStack: errorInfo?.componentStack || 'unknown',
            errorBoundary: true,
            retryCount: this.state?.retryCount || 0,
          });
        }
      } catch (serviceError) {
        console.warn('Failed to report to error service:', serviceError);
      }

      // Report to browser's error reporting if available
      try {
        if (typeof window !== 'undefined' && 'reportError' in window && typeof (window as any).reportError === 'function') {
          (window as any).reportError(error);
        }
      } catch (reportingError) {
        console.warn('Failed to report to browser error handler:', reportingError);
      }
    } catch (err) {
      // Silently fail if error reporting itself breaks
      console.warn('Error reporting service failed:', err);
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: retryCount + 1,
      });
    } else {
      // Max retries reached, force page reload
      window.location.reload();
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultSellerErrorFallback;
      
      return (
        <div className="seller-error-boundary-container">
          <FallbackComponent
            error={this.state.error}
            context={this.props.context}
            onRetry={this.props.enableRecovery !== false ? this.handleRetry : undefined}
            onReset={this.handleReset}
            showDetails={process.env.NODE_ENV === 'development'}
          />
          
          {/* Development-only error details */}
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <summary className="font-medium text-red-800 cursor-pointer">
                Development Error Details
              </summary>
              <div className="mt-2 text-sm">
                <div className="mb-2">
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
                <div>
                  <strong>Retry Count:</strong> {this.state.retryCount} / {this.maxRetries}
                </div>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }

  /**
   * Set error reporting service for external error tracking
   */
  setErrorReportingService(service: any) {
    this.errorReportingService = service;
  }

  /**
   * Manually trigger error boundary (useful for testing)
   */
  triggerError(error: SellerError) {
    this.setState({
      hasError: true,
      error,
      retryCount: 0,
    });
  }

  /**
   * Check if component is in error state
   */
  hasError(): boolean {
    return this.state.hasError;
  }

  /**
   * Get current error if any
   */
  getCurrentError(): SellerError | undefined {
    return this.state.error;
  }
}

export default SellerErrorBoundary;