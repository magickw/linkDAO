/**
 * Payment Error Recovery Modal
 * Shows user-friendly error messages and recovery options
 */

import React from 'react';
import { X, AlertCircle, Info } from 'lucide-react';
import { PaymentError, RecoveryOption } from '@/services/paymentErrorHandler';

interface PaymentErrorModalProps {
  error: PaymentError | null;
  isOpen: boolean;
  onClose: () => void;
  onRecoveryAction: (action: string) => Promise<void>;
}

export const PaymentErrorModal: React.FC<PaymentErrorModalProps> = ({
  error,
  isOpen,
  onClose,
  onRecoveryAction
}) => {
  const [processingAction, setProcessingAction] = React.useState<string | null>(null);

  if (!isOpen || !error) return null;

  const handleRecovery = async (option: RecoveryOption) => {
    setProcessingAction(option.action);
    try {
      await onRecoveryAction(option.action);
      onClose();
    } catch (err) {
      console.error('Recovery action failed:', err);
    } finally {
      setProcessingAction(null);
    }
  };

  const getSeverityColor = () => {
    if (!error.retryable) return 'red';
    return 'yellow';
  };

  const severityColor = getSeverityColor();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`bg-${severityColor}-50 dark:bg-${severityColor}-900/20 border-b border-${severityColor}-200 dark:border-${severityColor}-800 p-4`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-6 h-6 text-${severityColor}-600 dark:text-${severityColor}-400 mt-0.5`} />
              <div>
                <h3 className={`text-lg font-semibold text-${severityColor}-900 dark:text-${severityColor}-100`}>
                  Payment Error
                </h3>
                <p className={`text-sm text-${severityColor}-700 dark:text-${severityColor}-300 mt-1`}>
                  {error.userMessage}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`text-${severityColor}-600 dark:text-${severityColor}-400 hover:text-${severityColor}-900 dark:hover:text-${severityColor}-100`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Technical Details (Collapsible) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-gray-700 dark:text-gray-300 font-mono">
                <p><strong>Code:</strong> {error.code}</p>
                <p><strong>Message:</strong> {error.message}</p>
                {error.metadata && (
                  <p><strong>Metadata:</strong> {JSON.stringify(error.metadata, null, 2)}</p>
                )}
              </div>
            </details>
          )}

          {/* Recovery Options */}
          {error.recoveryOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Info className="w-4 h-4" />
                <span>What would you like to do?</span>
              </div>

              <div className="space-y-2">
                {error.recoveryOptions.map((option) => (
                  <button
                    key={option.action}
                    onClick={() => handleRecovery(option)}
                    disabled={processingAction !== null}
                    className={`
                      w-full p-4 rounded-lg border text-left transition-all
                      ${option.priority === 'primary'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                      ${processingAction === option.action ? 'opacity-75 cursor-wait' : ''}
                      ${processingAction && processingAction !== option.action ? 'opacity-50 cursor-not-allowed' : ''}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          option.priority === 'primary'
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {option.label}
                          {processingAction === option.action && (
                            <span className="ml-2 text-xs">(Processing...)</span>
                          )}
                        </p>
                        <p className={`text-xs mt-1 ${
                          option.priority === 'primary'
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Retry Warning */}
          {error.metadata?.retryAfter && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Please wait {Math.ceil(error.metadata.retryAfter / 1000 / 60)} minutes before retrying
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Need help?</span>
            <a
              href="/support"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentErrorModal;
