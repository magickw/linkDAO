import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ServiceUnavailableHandlerProps {
  children: React.ReactNode;
  fallbackData?: any;
  serviceName?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export const ServiceUnavailableHandler: React.FC<ServiceUnavailableHandlerProps> = ({
  children,
  fallbackData,
  serviceName = 'service',
  showRetry = true,
  onRetry
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry - reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getRetryDelay = () => {
    // Exponential backoff: 5s, 10s, 20s, 40s, max 60s
    return Math.min(5000 * Math.pow(2, retryCount), 60000);
  };

  return (
    <div className="relative">
      {/* Service Status Banner */}
      {!isOnline && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex items-center">
            <WifiOff className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm text-red-700">
                You're currently offline. Some features may not work properly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Unavailable Warning */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Service Temporarily Unavailable
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                Our {serviceName} is currently experiencing high load. 
                {fallbackData ? ' We\'re showing you cached data.' : ' Please try again in a few moments.'}
              </p>
              {retryCount > 0 && (
                <p className="mt-1 text-xs">
                  Retry attempts: {retryCount}
                </p>
              )}
            </div>
            {showRetry && (
              <div className="mt-3">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                      Try Again
                    </>
                  )}
                </button>
                {retryCount > 2 && (
                  <p className="mt-2 text-xs text-yellow-600">
                    Next retry in {Math.round(getRetryDelay() / 1000)} seconds
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={fallbackData ? 'opacity-75' : ''}>
        {children}
      </div>

      {/* Fallback Data Notice */}
      {fallbackData && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Wifi className="h-3 w-3 mr-1" />
            Showing cached data
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceUnavailableHandler;