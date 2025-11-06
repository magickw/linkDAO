import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
}

interface Props {
  error?: Error;
  onRetry?: () => void;
  estimatedRecoveryTime?: number; // in seconds
  affectedServices?: string[];
  showServiceStatus?: boolean;
}

export const ServiceUnavailableHandler: React.FC<Props> = ({
  error,
  onRetry,
  estimatedRecoveryTime = 60,
  affectedServices = ['API'],
  showServiceStatus = true
}) => {
  const [countdown, setCountdown] = useState(estimatedRecoveryTime);
  const [isRetrying, setIsRetrying] = useState(false);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (showServiceStatus) {
      // Mock service status - in real implementation, this would fetch from health endpoint
      const mockStatuses: ServiceStatus[] = affectedServices.map(service => ({
        name: service,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: undefined
      }));
      setServiceStatuses(mockStatuses);
    }
  }, [affectedServices, showServiceStatus]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
      // Reset countdown on successful retry
      setCountdown(estimatedRecoveryTime);
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-[300px] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-lg border border-orange-200 p-6">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <AlertCircle className="h-8 w-8 text-orange-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Service Temporarily Unavailable</h2>
            <p className="text-sm text-gray-600">We're experiencing high traffic and working to restore service</p>
          </div>
        </div>

        {/* Service Status */}
        {showServiceStatus && serviceStatuses.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Service Status</h3>
            <div className="space-y-2">
              {serviceStatuses.map((service) => (
                <div
                  key={service.name}
                  className={`flex items-center justify-between p-3 rounded-md border ${getStatusColor(service.status)}`}
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(service.status)}
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="capitalize">{service.status}</span>
                    {service.responseTime && (
                      <span className="ml-2 text-gray-500">({service.responseTime}ms)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recovery Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">Estimated Recovery Time</span>
          </div>
          <p className="text-lg font-semibold text-blue-900">{formatTime(countdown)}</p>
          <p className="text-xs text-blue-600 mt-1">
            Service typically recovers within this timeframe
          </p>
        </div>

        {/* What's Working */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">What's Still Working</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Browsing cached content</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Viewing your profile and settings</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Preparing posts and actions for later</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking...' : 'Check Again'}</span>
          </button>

          <div className="text-xs text-gray-500">
            <p>Auto-retry in {formatTime(countdown)}</p>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If this issue persists, try refreshing the page or{' '}
            <a href="/support" className="text-blue-600 hover:underline">
              contact support
            </a>
          </p>
        </div>

        {/* Development Error Details */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              Error Details (Development)
            </summary>
            <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ServiceUnavailableHandler;