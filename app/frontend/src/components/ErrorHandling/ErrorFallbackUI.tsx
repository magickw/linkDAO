/**
 * Error Fallback UI Components
 * Provides user-friendly error displays with actionable recovery steps
 */

import React from 'react';
import { ErrorContext, ErrorSeverity, ErrorCategory } from '../../utils/errorHandling/ErrorManager';

interface ErrorFallbackUIProps {
  errorContext?: ErrorContext;
  onRetry?: () => void;
  canRetry?: boolean;
  enableFallback?: boolean;
}

export const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  errorContext,
  onRetry,
  canRetry = true,
  enableFallback = true
}) => {
  if (!errorContext) {
    return <GenericErrorFallback onRetry={onRetry} canRetry={canRetry} />;
  }

  const getSeverityStyles = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-50 border-red-200 text-red-800';
      case ErrorSeverity.HIGH:
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case ErrorSeverity.LOW:
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = (category: ErrorCategory) => {
    switch (category) {
      case ErrorCategory.NETWORK:
        return '🌐';
      case ErrorCategory.WALLET:
        return '👛';
      case ErrorCategory.BLOCKCHAIN:
        return '⛓️';
      case ErrorCategory.AUTHENTICATION:
        return '🔐';
      case ErrorCategory.PERMISSION:
        return '🚫';
      case ErrorCategory.VALIDATION:
        return '⚠️';
      case ErrorCategory.PERFORMANCE:
        return '⚡';
      default:
        return '❌';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${getSeverityStyles(errorContext.severity)}`}>
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{getIcon(errorContext.category)}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">
            {errorContext.userMessage}
          </h3>
          
          {errorContext.actionableSteps.length > 0 && (
            <div className="mb-4">
              <p className="font-medium mb-2">Try these steps:</p>
              <ul className="list-disc list-inside space-y-1">
                {errorContext.actionableSteps.map((step, index) => (
                  <li key={index} className="text-sm">{step}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex space-x-3">
            {onRetry && canRetry && errorContext.retryable && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Refresh Page
            </button>
            
            {errorContext.severity === ErrorSeverity.CRITICAL && (
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Go Home
              </button>
            )}
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">
                Debug Information
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(errorContext, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

const GenericErrorFallback: React.FC<{ onRetry?: () => void; canRetry?: boolean }> = ({
  onRetry,
  canRetry = true
}) => (
  <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
    <div className="text-4xl mb-4">😵</div>
    <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
    <p className="text-gray-600 mb-4">
      We encountered an unexpected error. Please try again.
    </p>
    <div className="flex justify-center space-x-3">
      {onRetry && canRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      )}
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

// Specialized fallback components for different scenarios

export const GenericNetworkErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
    <div className="text-4xl mb-4">🌐</div>
    <h3 className="text-lg font-semibold mb-2">Connection Issue</h3>
    <p className="text-blue-700 mb-4">
      Unable to connect to the server. Please check your internet connection.
    </p>
    <div className="flex justify-center space-x-3">
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      )}
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
      >
        Refresh
      </button>
    </div>
  </div>
);

export const WalletErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg text-center">
    <div className="text-4xl mb-4">👛</div>
    <h3 className="text-lg font-semibold mb-2">Wallet Connection Issue</h3>
    <p className="text-orange-700 mb-4">
      Unable to connect to your wallet. Please check your wallet connection.
    </p>
    <div className="flex justify-center space-x-3">
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
        >
          Reconnect Wallet
        </button>
      )}
    </div>
  </div>
);

export const ContentLoadingErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
    <div className="text-4xl mb-4">📄</div>
    <h3 className="text-lg font-semibold mb-2">Content Unavailable</h3>
    <p className="text-gray-600 mb-4">
      Unable to load content right now. Please try again.
    </p>
    <div className="flex justify-center space-x-3">
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Reload Content
        </button>
      )}
    </div>
  </div>
);

export const PerformanceErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
    <div className="text-4xl mb-4">⚡</div>
    <h3 className="text-lg font-semibold mb-2">Performance Issue</h3>
    <p className="text-yellow-700 mb-4">
      The system is running slowly. Please wait a moment and try again.
    </p>
    <div className="flex justify-center space-x-3">
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
);