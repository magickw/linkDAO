import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassmorphismCard, AnimatedButton } from '../VisualPolish';

interface ServiceUnavailableHandlerProps {
  error?: Error & { status?: number; isServiceUnavailable?: boolean };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ServiceUnavailableHandler({
  error,
  onRetry,
  onDismiss,
  className = ''
}: ServiceUnavailableHandlerProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Auto-retry logic with exponential backoff
  useEffect(() => {
    if (error?.isServiceUnavailable && retryCount < 3) {
      const delay = Math.min(5000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
      setCountdown(Math.ceil(delay / 1000));
      
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            handleAutoRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [error, retryCount]);

  const handleAutoRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
      onRetry?.();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleManualRetry = () => {
    setRetryCount(0);
    setCountdown(0);
    handleAutoRetry();
  };

  if (!error?.isServiceUnavailable) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <GlassmorphismCard className="max-w-md mx-4 p-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {/* Service Unavailable Icon */}
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Service Temporarily Unavailable
            </h2>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              We're experiencing some technical difficulties. Our team is working to restore service as quickly as possible.
            </p>

            {/* Status Information */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Status:</span>
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  Service Unavailable (503)
                </span>
              </div>
              
              {countdown > 0 && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600 dark:text-gray-300">Auto-retry in:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {countdown}s
                  </span>
                </div>
              )}

              {retryCount > 0 && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600 dark:text-gray-300">Retry attempts:</span>
                  <span className="text-gray-600 dark:text-gray-300">
                    {retryCount}/3
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <AnimatedButton
                variant="primary"
                onClick={handleManualRetry}
                loading={isRetrying}
                disabled={isRetrying}
                className="flex-1"
                animation="lift"
              >
                {isRetrying ? 'Retrying...' : 'Retry Now'}
              </AnimatedButton>
              
              {onDismiss && (
                <AnimatedButton
                  variant="secondary"
                  onClick={onDismiss}
                  disabled={isRetrying}
                  animation="subtle"
                >
                  Dismiss
                </AnimatedButton>
              )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              If the problem persists, please check your internet connection or try again later.
            </p>
          </motion.div>
        </GlassmorphismCard>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for handling service unavailable errors
export function useServiceUnavailableHandler() {
  const [error, setError] = useState<Error & { status?: number; isServiceUnavailable?: boolean } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleError = (err: Error & { status?: number; isServiceUnavailable?: boolean }) => {
    if (err.isServiceUnavailable || err.status === 503) {
      setError(err);
      setIsVisible(true);
    }
  };

  const handleRetry = () => {
    // This should be implemented by the consuming component
    // to retry the failed request
    console.log('Retrying request...');
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setError(null);
  };

  return {
    error: isVisible ? error : null,
    handleError,
    handleRetry,
    handleDismiss,
    ServiceUnavailableHandler: () => (
      <ServiceUnavailableHandler
        error={isVisible ? error || undefined : undefined}
        onRetry={handleRetry}
        onDismiss={handleDismiss}
      />
    )
  };
}