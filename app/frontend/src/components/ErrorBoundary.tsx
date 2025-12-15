import React from 'react';
import { isExtensionError } from '@/utils/extensionErrorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if this is an extension-related error using the utility
    if (isExtensionError(error)) {
      console.debug('ErrorBoundary: Ignored extension-related error:', error);
      // Don't update state for extension errors - let the app continue
      return { hasError: false };
    }
    
    // Special handling for frameId errors which are definitely extension-related
    if (error.message && (error.message.includes('Invalid frameId for foreground frameId') || 
                         error.message.includes('No tab with id'))) {
      console.debug('ErrorBoundary: Ignored frameId extension error:', error);
      return { hasError: false };
    }
    
    // Update state for actual application errors
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is an extension-related error using the utility
    if (isExtensionError(error)) {
      console.debug('ErrorBoundary: Caught and ignored extension error:', { error, errorInfo });
      return;
    }
    
    // Log actual application errors
    console.error('ErrorBoundary: Caught application error:', { error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
        Something went wrong
      </h2>
      
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
        We encountered an unexpected error. Please try refreshing the page.
      </p>
      
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
            Error Details
          </summary>
          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
      
      <div className="flex space-x-3">
        <button
          onClick={resetError}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  </div>
);

export default ErrorBoundary;