import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  WifiOff, 
  RefreshCw, 
  X,
  Info,
  Zap
} from 'lucide-react';

export type StatusType = 'idle' | 'loading' | 'success' | 'error' | 'queued' | 'retrying' | 'offline';

interface StatusIndicatorProps {
  status: StatusType;
  message?: string;
  details?: string;
  retryable?: boolean;
  retryCount?: number;
  maxRetries?: number;
  estimatedTime?: number; // seconds
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showProgress?: boolean;
  actionLabel?: string;
}

export const EnhancedStatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  details,
  retryable = false,
  retryCount = 0,
  maxRetries = 3,
  estimatedTime,
  onRetry,
  onDismiss,
  className = '',
  showProgress = false,
  actionLabel
}) => {
  const [timeRemaining, setTimeRemaining] = useState(estimatedTime || 0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (estimatedTime && estimatedTime > 0) {
      setTimeRemaining(estimatedTime);
      
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [estimatedTime]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <Clock className="h-5 w-5 animate-pulse" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-500',
          title: 'Processing...',
          defaultMessage: 'Please wait while we process your request'
        };
      
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-700',
          iconColor: 'text-green-500',
          title: 'Success!',
          defaultMessage: 'Operation completed successfully'
        };
      
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-700',
          iconColor: 'text-red-500',
          title: 'Error',
          defaultMessage: 'Something went wrong'
        };
      
      case 'queued':
        return {
          icon: <Clock className="h-5 w-5" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-500',
          title: 'Queued',
          defaultMessage: 'Action queued and will be processed when service is available'
        };
      
      case 'retrying':
        return {
          icon: <RefreshCw className="h-5 w-5 animate-spin" />,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-700',
          iconColor: 'text-orange-500',
          title: 'Retrying...',
          defaultMessage: `Attempting to retry (${retryCount}/${maxRetries})`
        };
      
      case 'offline':
        return {
          icon: <WifiOff className="h-5 w-5" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
          title: 'Offline',
          defaultMessage: 'You are currently offline. Actions will be queued.'
        };
      
      default:
        return {
          icon: <Info className="h-5 w-5" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-500',
          title: 'Info',
          defaultMessage: 'Ready'
        };
    }
  };

  const config = getStatusConfig();
  const displayMessage = message || config.defaultMessage;

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={config.iconColor}>
          {config.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`font-medium ${config.textColor}`}>
              {config.title}
            </h4>
            
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className={`${config.textColor} hover:opacity-70 transition-opacity`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <p className={`text-sm ${config.textColor} mt-1`}>
            {displayMessage}
          </p>
          
          {details && (
            <p className={`text-xs ${config.textColor} opacity-75 mt-1`}>
              {details}
            </p>
          )}
          
          {/* Progress indicator */}
          {showProgress && status === 'loading' && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          )}
          
          {/* Time remaining */}
          {timeRemaining > 0 && (
            <div className={`text-xs ${config.textColor} opacity-75 mt-2`}>
              Estimated time: {timeRemaining}s
            </div>
          )}
          
          {/* Retry progress */}
          {status === 'retrying' && maxRetries > 0 && (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(retryCount / maxRetries) * 100}%` }}
                  />
                </div>
                <span className={`text-xs ${config.textColor}`}>
                  {retryCount}/{maxRetries}
                </span>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center space-x-3 mt-3">
            {retryable && onRetry && status === 'error' && (
              <button
                onClick={onRetry}
                className="flex items-center space-x-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{actionLabel || 'Retry'}</span>
              </button>
            )}
            
            {status === 'queued' && (
              <div className="flex items-center space-x-1 text-sm text-yellow-600">
                <Zap className="h-3 w-3" />
                <span>Will process automatically</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedStatusIndicator;