import React, { useState, useEffect } from 'react';
import { PaymentMethod } from '../../types/paymentPrioritization';
import { UnavailabilityHandlingResult, UnavailabilityReason, RetryStrategy } from '../../services/paymentMethodUnavailabilityHandler';

interface PaymentUnavailableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAlternative: (method: PaymentMethod) => void;
  onRetry: () => void;
  onTakeAction: (actionType: string, actionUrl?: string) => void;
  handlingResult: UnavailabilityHandlingResult;
  unavailableMethod: PaymentMethod;
  reason: UnavailabilityReason;
}

export const PaymentUnavailableModal: React.FC<PaymentUnavailableModalProps> = ({
  isOpen,
  onClose,
  onSelectAlternative,
  onRetry,
  onTakeAction,
  handlingResult,
  unavailableMethod,
  reason
}) => {
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (handlingResult.retryStrategy?.retryAfter && handlingResult.retryStrategy.retryAfter > 0) {
      setRetryCountdown(handlingResult.retryStrategy.retryAfter);
      
      const interval = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [handlingResult.retryStrategy?.retryAfter]);

  if (!isOpen) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getSeverityColor = () => {
    switch (handlingResult.severity) {
      case 'high':
        return 'border-red-500';
      case 'medium':
        return 'border-yellow-500';
      case 'low':
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  const getSeverityIcon = () => {
    switch (handlingResult.severity) {
      case 'high':
        return (
          <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'low':
      default:
        return (
          <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getReasonTitle = () => {
    switch (reason.type) {
      case 'insufficient_balance':
        return 'Insufficient Balance';
      case 'service_unavailable':
        return 'Service Unavailable';
      case 'network_error':
        return 'Network Error';
      case 'validation_failed':
        return 'Validation Failed';
      case 'rate_limit':
        return 'Rate Limit Exceeded';
      case 'maintenance':
        return 'Under Maintenance';
      default:
        return 'Payment Method Unavailable';
    }
  };

  const formatCountdown = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl max-w-md w-full border-2 ${getSeverityColor()}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {getSeverityIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{getReasonTitle()}</h3>
              <p className="text-sm text-gray-600">{unavailableMethod.name}</p>
            </div>
          </div>

          {/* Message */}
          <p className="text-gray-700 mb-4">{handlingResult.userMessage}</p>

          {/* Reason Details */}
          {reason.details && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">{reason.details}</p>
            </div>
          )}

          {/* Retry Section */}
          {handlingResult.retryStrategy && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Retry Available</h4>
                  {retryCountdown > 0 ? (
                    <p className="text-sm text-blue-700">
                      Retry in {formatCountdown(retryCountdown)}
                    </p>
                  ) : (
                    <p className="text-sm text-blue-700">Ready to retry</p>
                  )}
                </div>
                <button
                  onClick={handleRetry}
                  disabled={retryCountdown > 0 || isRetrying}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              </div>
            </div>
          )}

          {/* Action Required */}
          {handlingResult.actionRequired && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-orange-900">Action Required</h4>
                  <p className="text-sm text-orange-700">{handlingResult.actionRequired.description}</p>
                </div>
                <button
                  onClick={() => onTakeAction(handlingResult.actionRequired!.type, handlingResult.actionRequired!.actionUrl)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {handlingResult.actionRequired.type === 'add_funds' && 'Add Funds'}
                  {handlingResult.actionRequired.type === 'switch_network' && 'Switch Network'}
                  {handlingResult.actionRequired.type === 'contact_support' && 'Contact Support'}
                  {handlingResult.actionRequired.type === 'use_alternative' && 'Select Alternative'}
                  {handlingResult.actionRequired.type === 'wait_and_retry' && 'Wait & Retry'}
                </button>
              </div>
            </div>
          )}

          {/* Alternative Payment Methods */}
          {handlingResult.fallbackMethods.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Alternative Payment Methods:</h4>
              <div className="space-y-2">
                {handlingResult.fallbackMethods.slice(0, 3).map((method, index) => (
                  <button
                    key={index}
                    onClick={() => onSelectAlternative(method)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{method.name}</div>
                        <div className="text-sm text-gray-600">
                          {method.type === 'FIAT_STRIPE' && 'Credit/Debit Card'}
                          {method.type === 'STABLECOIN_USDC' && 'Stable cryptocurrency'}
                          {method.type === 'STABLECOIN_USDT' && 'Stable cryptocurrency'}
                          {method.type === 'NATIVE_ETH' && 'Ethereum'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.type === 'FIAT_STRIPE' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Recommended
                          </span>
                        )}
                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {handlingResult.fallbackMethods.length > 3 && (
                <p className="text-sm text-gray-500 mt-2">
                  +{handlingResult.fallbackMethods.length - 3} more options available
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            
            {handlingResult.canProceedWithoutAction && handlingResult.fallbackMethods.length > 0 && (
              <button
                onClick={() => onSelectAlternative(handlingResult.fallbackMethods[0])}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Use {handlingResult.fallbackMethods[0].name}
              </button>
            )}
            
            {handlingResult.retryStrategy?.canRetry && retryCountdown === 0 && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            )}
          </div>

          {/* Additional Info */}
          {reason.type === 'rate_limit' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                Rate limits help protect the payment system. Please wait before trying again or use an alternative method.
              </p>
            </div>
          )}

          {reason.type === 'maintenance' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                Scheduled maintenance helps improve service reliability. We apologize for any inconvenience.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentUnavailableModal;