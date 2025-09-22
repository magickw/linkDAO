/**
 * Community Enhancement Error Boundary
 * Handles errors in community enhancement components with graceful degradation
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryState } from '../../../types/communityEnhancements';

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
}

class CommunityEnhancementErrorBoundary extends Component<Props, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorType: 'unknown',
      retryCount: 0,
      fallbackComponent: props.fallbackComponent,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Categorize error types for better handling
    let errorType: ErrorBoundaryState['errorType'] = 'unknown';
    
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.message.includes('Cannot read') || error.message.includes('undefined')) {
      errorType = 'data';
    } else if (error.stack?.includes('React')) {
      errorType = 'rendering';
    }

    return {
      hasError: true,
      errorType,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for monitoring
    console.error('Community Enhancement Error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (if available)
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.captureException(error, {
        tags: {
          component: 'CommunityEnhancement',
          errorType: this.state.errorType,
        },
        extra: errorInfo,
      });
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleAutoRetry = () => {
    // Auto-retry for network errors with exponential backoff
    if (this.state.errorType === 'network' && this.state.retryCount < 2) {
      const delay = Math.pow(2, this.state.retryCount) * 1000; // 1s, 2s, 4s
      
      const timeout = setTimeout(() => {
        this.handleRetry();
      }, delay);
      
      this.retryTimeouts.push(timeout);
    }
  };

  render() {
    if (this.state.hasError) {
      // Auto-retry for certain error types
      if (this.state.errorType === 'network' && this.state.retryCount === 0) {
        this.handleAutoRetry();
      }

      // Use custom fallback component if provided
      if (this.state.fallbackComponent) {
        const FallbackComponent = this.state.fallbackComponent;
        return (
          <FallbackComponent 
            error={new Error(`${this.state.errorType} error`)} 
            retry={this.handleRetry} 
          />
        );
      }

      // Default fallback UI based on error type
      return this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback() {
    const { errorType, retryCount } = this.state;
    const maxRetries = this.props.maxRetries || 3;
    const canRetry = retryCount < maxRetries;

    const errorMessages = {
      network: 'Unable to connect to the server. Please check your internet connection.',
      rendering: 'Something went wrong while displaying this content.',
      data: 'There was an issue loading the data for this section.',
      unknown: 'An unexpected error occurred.',
    };

    const errorIcons = {
      network: '🌐',
      rendering: '⚠️',
      data: '📊',
      unknown: '❌',
    };

    return (
      <div className="ce-error-boundary">
        <div className="ce-error-content">
          <div className="ce-error-icon">
            {errorIcons[errorType]}
          </div>
          <h3 className="ce-error-title">
            Oops! Something went wrong
          </h3>
          <p className="ce-error-message">
            {errorMessages[errorType]}
          </p>
          {canRetry && (
            <button 
              className="ce-button ce-button-primary ce-error-retry"
              onClick={this.handleRetry}
            >
              Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
            </button>
          )}
          {!canRetry && (
            <p className="ce-error-help">
              If this problem persists, please refresh the page or contact support.
            </p>
          )}
        </div>
        
        <style jsx>{`
          .ce-error-boundary {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            padding: var(--ce-space-lg);
            background: var(--ce-bg-secondary);
            border: 1px solid var(--ce-border-light);
            border-radius: var(--ce-radius-lg);
            margin: var(--ce-space-md) 0;
          }
          
          .ce-error-content {
            text-align: center;
            max-width: 400px;
          }
          
          .ce-error-icon {
            font-size: 3rem;
            margin-bottom: var(--ce-space-md);
          }
          
          .ce-error-title {
            font-size: var(--ce-font-size-lg);
            font-weight: 600;
            color: var(--ce-text-primary);
            margin: 0 0 var(--ce-space-sm) 0;
          }
          
          .ce-error-message {
            font-size: var(--ce-font-size-sm);
            color: var(--ce-text-secondary);
            margin: 0 0 var(--ce-space-lg) 0;
            line-height: 1.5;
          }
          
          .ce-error-retry {
            margin-bottom: var(--ce-space-md);
          }
          
          .ce-error-help {
            font-size: var(--ce-font-size-xs);
            color: var(--ce-text-tertiary);
            margin: 0;
            line-height: 1.4;
          }
          
          @media (max-width: 768px) {
            .ce-error-boundary {
              min-height: 150px;
              padding: var(--ce-space-md);
            }
            
            .ce-error-icon {
              font-size: 2rem;
            }
            
            .ce-error-title {
              font-size: var(--ce-font-size-base);
            }
          }
        `}</style>
      </div>
    );
  }
}

export default CommunityEnhancementErrorBoundary;