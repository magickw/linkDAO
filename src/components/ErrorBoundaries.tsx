import React, { Component, ReactNode, ErrorInfo } from 'react';

// Base error boundary props
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Base Error Boundary class
class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
interface DefaultErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

function DefaultErrorFallback({ error, onRetry }: DefaultErrorFallbackProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
      <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
        Something went wrong
      </h3>
      <p className="text-red-600 dark:text-red-300 mb-4">
        {error?.message || 'An unexpected error occurred'}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
        >
          Try Again
        </button>
      )}
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400">
            Error Details (Development)
          </summary>
          <pre className="mt-2 text-xs text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/40 p-2 rounded overflow-auto">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

// Feed Error Boundary
interface FeedErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

export function FeedErrorBoundary({ children, onRetry }: FeedErrorBoundaryProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const fallback = (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
      <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
        Feed Error
      </h3>
      <p className="text-red-600 dark:text-red-300 mb-6">
        We couldn't load your social feed. This might be due to a network issue or server problem.
      </p>
      <div className="flex items-center justify-center space-x-4">
        <button 
          onClick={handleRetry}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
        >
          Reload Feed
        </button>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="px-6 py-3 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <BaseErrorBoundary fallback={fallback}>
      {children}
    </BaseErrorBoundary>
  );
}

// Community Error Boundary
interface CommunityErrorBoundaryProps {
  children: ReactNode;
  communityId?: string;
  onRetry?: () => void;
}

export function CommunityErrorBoundary({ children, communityId, onRetry }: CommunityErrorBoundaryProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const fallback = (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
      <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
        Community Error
      </h3>
      <p className="text-red-600 dark:text-red-300 mb-6">
        We couldn't load the community {communityId ? `"${communityId}"` : ''}. 
        This might be due to a network issue or the community might not exist.
      </p>
      <div className="flex items-center justify-center space-x-4">
        <button 
          onClick={handleRetry}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
        >
          Try Again
        </button>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          className="px-6 py-3 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <BaseErrorBoundary fallback={fallback}>
      {children}
    </BaseErrorBoundary>
  );
}

// Web3 Error Boundary
interface Web3ErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

export function Web3ErrorBoundary({ children, onRetry }: Web3ErrorBoundaryProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const fallback = (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-8 text-center">
      <svg className="mx-auto h-16 w-16 text-orange-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <h3 className="text-xl font-semibold text-orange-800 dark:text-orange-200 mb-2">
        Web3 Connection Error
      </h3>
      <p className="text-orange-600 dark:text-orange-300 mb-6">
        There was an issue with your wallet connection or blockchain interaction. 
        Please check your wallet and try again.
      </p>
      <div className="flex items-center justify-center space-x-4">
        <button 
          onClick={handleRetry}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 font-medium"
        >
          Reconnect Wallet
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors duration-200 font-medium"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );

  return (
    <BaseErrorBoundary fallback={fallback}>
      {children}
    </BaseErrorBoundary>
  );
}

// Network Error Component (for API failures)
interface NetworkErrorProps {
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ error, onRetry, className = '' }: NetworkErrorProps) {
  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center ${className}`}>
      <svg className="mx-auto h-12 w-12 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
        Network Error
      </h3>
      <p className="text-yellow-600 dark:text-yellow-300 mb-4">
        {error || 'Unable to connect to the server. Please check your internet connection.'}
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Offline Error Component
interface OfflineErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineError({ onRetry, className = '' }: OfflineErrorProps) {
  return (
    <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center ${className}`}>
      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
        You're Offline
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Please check your internet connection and try again.
      </p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Generic Error Display Component
interface ErrorDisplayProps {
  title?: string;
  message?: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({ 
  title = 'Error', 
  message = 'Something went wrong', 
  type = 'error',
  onRetry,
  onDismiss,
  className = '' 
}: ErrorDisplayProps) {
  const typeStyles = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      subtext: 'text-red-600 dark:text-red-300',
      button: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      subtext: 'text-yellow-600 dark:text-yellow-300',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      subtext: 'text-blue-600 dark:text-blue-300',
      button: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const styles = typeStyles[type];

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-xl p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`text-lg font-medium ${styles.text} mb-2`}>
            {title}
          </h3>
          <p className={styles.subtext}>
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`ml-4 ${styles.subtext} hover:opacity-75`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {onRetry && (
        <div className="mt-4">
          <button 
            onClick={onRetry}
            className={`px-4 py-2 ${styles.button} text-white rounded-lg transition-colors duration-200`}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default BaseErrorBoundary;