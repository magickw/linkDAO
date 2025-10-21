import React, { useState, useEffect } from 'react';
import { SellerError, ErrorRecoveryStrategy, RecoveryAction } from '../../../../types/sellerError';
import { sellerErrorRecoveryService } from '../../../../services/sellerErrorRecoveryService';

interface DefaultSellerErrorFallbackProps {
  error?: SellerError;
  context?: string;
  onRetry?: () => void;
  onReset?: () => void;
  showDetails?: boolean;
}

/**
 * Default fallback component for seller errors with graceful degradation
 */
export const DefaultSellerErrorFallback: React.FC<DefaultSellerErrorFallbackProps> = ({
  error,
  context = 'unknown',
  onRetry,
  onReset,
  showDetails = false,
}) => {
  const [recoveryStrategy, setRecoveryStrategy] = useState<ErrorRecoveryStrategy | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(showDetails);

  useEffect(() => {
    if (error) {
      sellerErrorRecoveryService
        .handleError(error, context)
        .then(setRecoveryStrategy)
        .catch(console.error);
    }
  }, [error, context]);

  const handleRecoveryAction = async (action: RecoveryAction) => {
    setIsRecovering(true);
    try {
      await action.action();
      // If the action succeeds and we have an onReset callback, call it
      if (onReset) {
        onReset();
      }
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
      // If recovery fails, we might want to show a different error or fallback
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior - reload the page
      window.location.reload();
    }
  };

  const getErrorIcon = () => {
    if (!error) return '⚠️';
    
    switch (error.type) {
      case 'NETWORK_ERROR':
        return '🌐';
      case 'API_ERROR':
        return '🔌';
      case 'CACHE_ERROR':
        return '💾';
      case 'VALIDATION_ERROR':
        return '✏️';
      case 'PERMISSION_ERROR':
        return '🔒';
      case 'IMAGE_UPLOAD_ERROR':
        return '🖼️';
      case 'TIER_VALIDATION_ERROR':
        return '⭐';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="seller-error-fallback bg-white border border-red-200 rounded-lg p-6 max-w-md mx-auto">
      <div className="text-center">
        <div className="text-4xl mb-4">{getErrorIcon()}</div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Something went wrong
        </h3>
        
        <p className="text-gray-600 mb-4">
          {recoveryStrategy?.userMessage || 'We\'re having trouble loading your seller information.'}
        </p>

        {/* Recovery Actions */}
        {recoveryStrategy?.canRecover && recoveryStrategy.recoveryActions.length > 0 && (
          <div className="space-y-2 mb-4">
            {recoveryStrategy.recoveryActions
              .sort((a, b) => a.priority - b.priority)
              .slice(0, 2) // Show max 2 primary actions
              .map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleRecoveryAction(action)}
                  disabled={isRecovering}
                  className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                    index === 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
                  }`}
                >
                  {isRecovering ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Working...
                    </span>
                  ) : (
                    action.description
                  )}
                </button>
              ))}
          </div>
        )}

        {/* Default retry button if no recovery actions */}
        {(!recoveryStrategy?.canRecover || recoveryStrategy.recoveryActions.length === 0) && (
          <button
            onClick={handleRetry}
            disabled={isRecovering}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {isRecovering ? 'Retrying...' : 'Try Again'}
          </button>
        )}

        {/* Error Details Toggle */}
        {error && (
          <div className="mt-4">
            <button
              onClick={() => setShowErrorDetails(!showErrorDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {showErrorDetails ? 'Hide' : 'Show'} Error Details
            </button>
            
            {showErrorDetails && (
              <details className="mt-2 text-left">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-auto max-h-32">
                  <div><strong>Type:</strong> {error.type}</div>
                  <div><strong>Code:</strong> {error.code || 'N/A'}</div>
                  <div><strong>Message:</strong> {error.message}</div>
                  <div><strong>Timestamp:</strong> {error.timestamp}</div>
                  {error.details && (
                    <div><strong>Details:</strong> {JSON.stringify(error.details, null, 2)}</div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Help Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help?{' '}
            <a 
              href="/support" 
              className="text-blue-600 hover:text-blue-800 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DefaultSellerErrorFallback;