import React, { useState, useCallback } from 'react';
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface RetryHandlerProps {
  onRetry: () => Promise<void>;
  error: Error | null;
  isLoading?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  showNetworkStatus?: boolean;
  children?: React.ReactNode;
}

interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  lastRetryTime: number | null;
}

export const RetryHandler: React.FC<RetryHandlerProps> = ({
  onRetry,
  error,
  isLoading = false,
  maxRetries = 3,
  retryDelay = 1000,
  showNetworkStatus = true,
  children
}) => {
  const [retryState, setRetryState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    lastRetryTime: null
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = useCallback(async () => {
    if (retryState.retryCount >= maxRetries || retryState.isRetrying) {
      return;
    }

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
      lastRetryTime: Date.now()
    }));

    try {
      // Add delay before retry
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryState.retryCount));
      }

      await onRetry();
      
      // Reset retry count on success
      setRetryState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: 0
      }));
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      setRetryState(prev => ({
        ...prev,
        isRetrying: false
      }));
    }
  }, [onRetry, retryState.retryCount, retryState.isRetrying, maxRetries, retryDelay]);

  const getErrorType = (error: Error): 'network' | 'server' | 'client' | 'unknown' => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || !isOnline) {
      return 'network';
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'server';
    }
    if (message.includes('400') || message.includes('401') || message.includes('403')) {
      return 'client';
    }
    return 'unknown';
  };

  const getErrorMessage = (error: Error): string => {
    const errorType = getErrorType(error);
    
    switch (errorType) {
      case 'network':
        return isOnline 
          ? 'Network connection issue. Please check your internet connection.'
          : 'You appear to be offline. Please check your internet connection.';
      case 'server':
        return 'Server is temporarily unavailable. Please try again in a moment.';
      case 'client':
        return 'There was an issue with your request. Please refresh the page.';
      default:
        return 'Something went wrong. Please try again.';
    }
  };

  const canRetry = retryState.retryCount < maxRetries && !retryState.isRetrying;
  const shouldShowRetry = error && canRetry;

  if (isLoading || retryState.isRetrying) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
        <span className="text-sm text-gray-600">
          {retryState.isRetrying ? 'Retrying...' : 'Loading...'}
        </span>
      </div>
    );
  }

  if (error) {
    const errorType = getErrorType(error);
    const errorMessage = getErrorMessage(error);

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800">
              {errorType === 'network' ? 'Connection Error' : 'Loading Error'}
            </h3>
            <p className="text-sm text-red-700 mt-1">
              {errorMessage}
            </p>
            
            {/* Network status indicator */}
            {showNetworkStatus && (
              <div className="flex items-center mt-2 text-xs text-red-600">
                {isOnline ? (
                  <Wifi className="w-3 h-3 mr-1" />
                ) : (
                  <WifiOff className="w-3 h-3 mr-1" />
                )}
                <span>
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
            )}

            {/* Retry information */}
            {retryState.retryCount > 0 && (
              <p className="text-xs text-red-600 mt-1">
                Attempted {retryState.retryCount} of {maxRetries} retries
              </p>
            )}

            {/* Action buttons */}
            <div className="flex space-x-2 mt-3">
              {shouldShowRetry && (
                <button
                  onClick={handleRetry}
                  disabled={!isOnline && errorType === 'network'}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry ({maxRetries - retryState.retryCount} left)
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RetryHandler;