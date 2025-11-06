import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
  isRetrying: boolean;
}

export class ConnectivityErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({
      error,
      errorInfo
    });

    // Log error for monitoring
    console.error('ConnectivityErrorBoundary caught an error:', error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    if (this.state.isRetrying) return;

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }

    // Auto-retry with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);
    
    this.retryTimeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false
      });
    }, retryDelay);
  };

  getErrorType = (): 'network' | 'server' | 'rate-limit' | 'unknown' => {
    const error = this.state.error;
    if (!error) return 'unknown';

    const message = error.message.toLowerCase();
    
    if (message.includes('503') || message.includes('service unavailable')) {
      return 'server';
    }
    if (message.includes('429') || message.includes('rate limit')) {
      return 'rate-limit';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    
    return 'unknown';
  };

  getErrorMessage = (): { title: string; description: string; suggestion: string } => {
    const errorType = this.getErrorType();
    
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Problem',
          description: 'Unable to connect to our servers. Please check your internet connection.',
          suggestion: 'Try refreshing the page or check your network connection.'
        };
      
      case 'server':
        return {
          title: 'Service Temporarily Unavailable',
          description: 'Our servers are experiencing high load. We\'re working to restore normal service.',
          suggestion: 'Please wait a moment and try again. Your data is safe.'
        };
      
      case 'rate-limit':
        return {
          title: 'Too Many Requests',
          description: 'You\'re making requests too quickly. Please slow down to avoid being rate limited.',
          suggestion: 'Wait a few seconds before trying again.'
        };
      
      default:
        return {
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred. This has been logged and we\'re looking into it.',
          suggestion: 'Try refreshing the page or contact support if the problem persists.'
        };
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { title, description, suggestion } = this.getErrorMessage();
      const errorType = this.getErrorType();
      const isOnline = navigator.onLine;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              {errorType === 'network' ? (
                isOnline ? <Wifi className="h-6 w-6 text-orange-500" /> : <WifiOff className="h-6 w-6 text-red-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            
            <p className="text-gray-600 mb-4">{description}</p>
            <p className="text-sm text-gray-500 mb-6">{suggestion}</p>
            
            <div className="flex items-center justify-between">
              <button
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                <span>{this.state.isRetrying ? 'Retrying...' : 'Try Again'}</span>
              </button>
              
              <span className="text-xs text-gray-400">
                Attempt {this.state.retryCount + 1}/3
              </span>
            </div>
            
            {!isOnline && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <WifiOff className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-700">You appear to be offline</span>
                </div>
              </div>
            )}
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ConnectivityErrorBoundary;