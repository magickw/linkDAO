import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  widgetName?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onDismiss?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
  isDismissed: boolean;
}

export class SidebarErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
      isDismissed: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `sidebar-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Sidebar Widget Error Boundary caught an error:', error, errorInfo);
    
    // Log error for monitoring
    this.logError(error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      widgetName: this.props.widgetName || 'Unknown Widget',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Store in localStorage for debugging
    const existingErrors = JSON.parse(localStorage.getItem('sidebar-errors') || '[]');
    existingErrors.push(errorData);
    localStorage.setItem('sidebar-errors', JSON.stringify(existingErrors.slice(-10)));
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorId: '',
        isDismissed: false
      });
    }
  };

  private handleDismiss = () => {
    this.setState({ isDismissed: true });
    this.props.onDismiss?.();
  };

  render() {
    if (this.state.hasError && !this.state.isDismissed) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-yellow-800">
                  {this.props.widgetName || 'Widget'} Unavailable
                </h4>
                <p className="text-xs text-yellow-700 mt-1">
                  This section couldn't load properly. The rest of the page should work normally.
                </p>
                <div className="flex space-x-2 mt-2">
                  {this.retryCount < this.maxRetries && (
                    <button
                      onClick={this.handleRetry}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </button>
                  )}
                  <button
                    onClick={this.handleDismiss}
                    className="text-xs font-medium text-yellow-700 hover:text-yellow-800 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={this.handleDismiss}
              className="text-yellow-600 hover:text-yellow-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    if (this.state.isDismissed) {
      return null;
    }

    return this.props.children;
  }
}

export default SidebarErrorBoundary;