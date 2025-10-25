import React from 'react';
import { analyticsService } from '@/services/analyticsService';

interface FeedErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface FeedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class FeedErrorBoundary extends React.Component<FeedErrorBoundaryProps, FeedErrorBoundaryState> {
  constructor(props: FeedErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FeedErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with analytics
    analyticsService.trackUserEvent('feed_component_error', {
      error: error.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    console.error('FeedErrorBoundary caught an error:', error, errorInfo);
    
    // Also log to error service if available
    if (typeof window !== 'undefined' && (window as any).errorService) {
      (window as any).errorService.logError(error, {
        componentStack: errorInfo.componentStack,
        context: 'feed_component'
      });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || FeedErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const FeedErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex flex-col items-center justify-center text-center">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full mb-4">
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Feed Loading Error
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We're having trouble loading the feed content. This might be due to a network issue or temporary server problem.
      </p>
      
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm max-w-full">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
            Technical Details
          </summary>
          <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto max-w-full">
            {error.message}
          </pre>
        </details>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
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

export default FeedErrorBoundary;