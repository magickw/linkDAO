import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  WifiIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface Web3Error {
  type: 'network' | 'transaction' | 'wallet' | 'gas' | 'timeout' | 'user_rejected' | 'insufficient_funds' | 'unknown';
  message: string;
  code?: string | number;
  details?: string;
  retryable?: boolean;
  actionRequired?: string;
}

interface MobileWeb3ErrorHandlerProps {
  error: Web3Error | null;
  onRetry?: () => void;
  onDismiss: () => void;
  onAction?: () => void;
  isRetrying?: boolean;
  autoRetry?: boolean;
  autoRetryDelay?: number;
  maxRetries?: number;
  className?: string;
}

export const MobileWeb3ErrorHandler: React.FC<MobileWeb3ErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  onAction,
  isRetrying = false,
  autoRetry = false,
  autoRetryDelay = 3000,
  maxRetries = 3,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses, safeAreaInsets } = useMobileOptimization();
  const { announceToScreenReader, accessibilityClasses } = useMobileAccessibility();
  
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(0);

  // Auto retry logic
  useEffect(() => {
    if (!error || !autoRetry || !onRetry || retryCount >= maxRetries) return;

    const countdown = setInterval(() => {
      setAutoRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          handleRetry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setAutoRetryCountdown(Math.ceil(autoRetryDelay / 1000));

    return () => clearInterval(countdown);
  }, [error, autoRetry, onRetry, retryCount, maxRetries, autoRetryDelay]);

  // Announce errors to screen reader
  useEffect(() => {
    if (error) {
      triggerHapticFeedback('error');
      announceToScreenReader(`Error: ${error.message}`);
    }
  }, [error, triggerHapticFeedback, announceToScreenReader]);

  const handleRetry = () => {
    if (!onRetry) return;
    
    setRetryCount(prev => prev + 1);
    setAutoRetryCountdown(0);
    triggerHapticFeedback('medium');
    onRetry();
    announceToScreenReader('Retrying operation');
  };

  const handleDismiss = () => {
    setRetryCount(0);
    setAutoRetryCountdown(0);
    triggerHapticFeedback('light');
    onDismiss();
    announceToScreenReader('Error dismissed');
  };

  const handleAction = () => {
    if (!onAction) return;
    
    triggerHapticFeedback('medium');
    onAction();
    announceToScreenReader('Taking corrective action');
  };

  if (!error) return null;

  const getErrorConfig = (error: Web3Error) => {
    switch (error.type) {
      case 'network':
        return {
          icon: WifiIcon,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          title: 'Network Error',
          suggestion: 'Check your internet connection and try again',
          retryable: true
        };
      
      case 'transaction':
        return {
          icon: XCircleIcon,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          title: 'Transaction Failed',
          suggestion: 'The transaction was rejected by the network',
          retryable: true
        };
      
      case 'wallet':
        return {
          icon: ShieldExclamationIcon,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          title: 'Wallet Error',
          suggestion: 'Check your wallet connection and try again',
          retryable: true
        };
      
      case 'gas':
        return {
          icon: CurrencyDollarIcon,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          title: 'Gas Fee Error',
          suggestion: 'Insufficient gas or gas price too low',
          retryable: true
        };
      
      case 'timeout':
        return {
          icon: ClockIcon,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          title: 'Request Timeout',
          suggestion: 'The request took too long to complete',
          retryable: true
        };
      
      case 'user_rejected':
        return {
          icon: XCircleIcon,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          borderColor: 'border-gray-200 dark:border-gray-700',
          title: 'User Cancelled',
          suggestion: 'You cancelled the transaction',
          retryable: false
        };
      
      case 'insufficient_funds':
        return {
          icon: CurrencyDollarIcon,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          title: 'Insufficient Funds',
          suggestion: 'You don\'t have enough tokens for this transaction',
          retryable: false
        };
      
      default:
        return {
          icon: ExclamationTriangleIcon,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          borderColor: 'border-gray-200 dark:border-gray-700',
          title: 'Unknown Error',
          suggestion: 'An unexpected error occurred',
          retryable: true
        };
    }
  };

  const config = getErrorConfig(error);
  const canRetry = config.retryable && onRetry && retryCount < maxRetries;
  const showAutoRetry = autoRetry && canRetry && autoRetryCountdown > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismiss}
      >
        <motion.div
          className={`
            w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl
            ${className}
            ${accessibilityClasses}
          `}
          style={{
            paddingBottom: `${safeAreaInsets.bottom}px`
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`
            p-6 border-b border-gray-200 dark:border-gray-700
            ${config.bgColor} ${config.borderColor}
          `}>
            <div className="flex items-start space-x-4">
              <div className={`
                p-3 rounded-full ${config.bgColor}
              `}>
                <config.icon className={`w-6 h-6 ${config.color}`} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {config.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {error.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {config.suggestion}
                </p>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {error.details && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Technical Details
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {error.details}
                  </p>
                  {error.code && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Error Code: {error.code}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auto Retry Countdown */}
          {showAutoRetry && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Auto-retrying in {autoRetryCountdown} seconds...
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="p-6">
            <div className="flex flex-col space-y-3">
              {/* Primary Action */}
              {error.actionRequired && onAction && (
                <button
                  onClick={handleAction}
                  className={`
                    w-full ${touchTargetClasses}
                    py-3 px-4 bg-blue-600 hover:bg-blue-700
                    text-white rounded-xl font-medium
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  `}
                >
                  {error.actionRequired}
                </button>
              )}

              {/* Retry Button */}
              {canRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying || showAutoRetry}
                  className={`
                    w-full ${touchTargetClasses}
                    py-3 px-4 border border-gray-300 dark:border-gray-600
                    text-gray-700 dark:text-gray-300 rounded-xl font-medium
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center space-x-2
                  `}
                >
                  {isRetrying ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-4 h-4" />
                      <span>
                        Retry {retryCount > 0 ? `(${retryCount}/${maxRetries})` : ''}
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className={`
                  w-full ${touchTargetClasses}
                  py-3 px-4 text-gray-500 dark:text-gray-400
                  hover:text-gray-700 dark:hover:text-gray-300
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                `}
              >
                Dismiss
              </button>
            </div>

            {/* Retry Limit Warning */}
            {retryCount >= maxRetries && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    Maximum retry attempts reached. Please check your connection and try again later.
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook for managing Web3 errors
export const useWeb3ErrorHandler = () => {
  const [error, setError] = useState<Web3Error | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = (error: any) => {
    let web3Error: Web3Error;

    // Parse different types of Web3 errors
    if (error?.code === 4001) {
      web3Error = {
        type: 'user_rejected',
        message: 'Transaction was cancelled by user',
        code: error.code,
        retryable: false
      };
    } else if (error?.code === -32603) {
      web3Error = {
        type: 'transaction',
        message: 'Transaction failed',
        code: error.code,
        details: error.message,
        retryable: true
      };
    } else if (error && (error instanceof Error ? error.message : String(error)).includes('insufficient funds')) {
      web3Error = {
        type: 'insufficient_funds',
        message: 'Insufficient funds for transaction',
        details: error instanceof Error ? error.message : String(error),
        retryable: false,
        actionRequired: 'Add Funds'
      };
    } else if (error && (error instanceof Error ? error.message : String(error)).includes('gas')) {
      web3Error = {
        type: 'gas',
        message: 'Gas estimation failed',
        details: error instanceof Error ? error.message : String(error),
        retryable: true
      };
    } else if (error && ((error instanceof Error ? error.message : String(error)).includes('network') || (error instanceof Error ? error.message : String(error)).includes('connection'))) {
      web3Error = {
        type: 'network',
        message: 'Network connection error',
        details: error instanceof Error ? error.message : String(error),
        retryable: true
      };
    } else if (error && (error instanceof Error ? error.message : String(error)).includes('timeout')) {
      web3Error = {
        type: 'timeout',
        message: 'Request timed out',
        details: error instanceof Error ? error.message : String(error),
        retryable: true
      };
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      web3Error = {
        type: 'unknown',
        message: errorMessage || 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
        retryable: true
      };
    }

    setError(web3Error);
  };

  const retry = async (operation: () => Promise<any>) => {
    setIsRetrying(true);
    try {
      const result = await operation();
      setError(null);
      return result;
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsRetrying(false);
    }
  };

  const clearError = () => {
    setError(null);
    setIsRetrying(false);
  };

  return {
    error,
    isRetrying,
    handleError,
    retry,
    clearError
  };
};

export default MobileWeb3ErrorHandler;