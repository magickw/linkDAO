/**
 * Governance Error Boundary
 * Specialized error boundary for the governance page
 */

import React, { Component, ReactNode } from 'react';
import { ErrorCategory, errorManager } from '../../utils/errorHandling/ErrorManager';

interface GovernanceErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface GovernanceErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class GovernanceErrorBoundary extends Component<
  GovernanceErrorBoundaryProps,
  GovernanceErrorBoundaryState
> {
  private maxRetries = 3;

  constructor(props: GovernanceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<GovernanceErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorManager.handleError(error, {
      category: ErrorCategory.BLOCKCHAIN,
      metadata: {
        component: 'GovernancePage',
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
              Governance Page Error
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
              We encountered an issue loading the governance page. This could be due to a network
              connection problem or an issue with the blockchain.
            </p>

            {this.state.error && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 font-mono overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col space-y-2">
              {this.state.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Try Again ({this.maxRetries - this.state.retryCount} attempts remaining)
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Return to Home
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
              >
                Refresh Page
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                If the problem persists, please check your wallet connection or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
