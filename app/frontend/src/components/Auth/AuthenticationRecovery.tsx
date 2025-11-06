/**
 * Authentication Recovery Component
 * Provides user interface for handling authentication failures,
 * session recovery, and wallet connection issues with clear guidance
 */

import React, { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/context/EnhancedAuthContext';
import { useEnhancedWalletAuth } from '@/hooks/useEnhancedWalletAuth';
import { useAccount } from 'wagmi';

interface AuthenticationRecoveryProps {
  onRecoverySuccess?: () => void;
  onRecoveryFailed?: (error: string) => void;
  showRetryButton?: boolean;
  autoRetry?: boolean;
  className?: string;
}

export const AuthenticationRecovery: React.FC<AuthenticationRecoveryProps> = ({
  onRecoverySuccess,
  onRecoveryFailed,
  showRetryButton = true,
  autoRetry = false,
  className = ''
}) => {
  const { 
    isAuthenticated, 
    isRecovering, 
    error: authError, 
    sessionStatus,
    clearError 
  } = useEnhancedAuth();
  
  const { 
    walletInfo, 
    authState, 
    authenticate, 
    recoverAuthentication, 
    clearError: clearWalletError,
    isWalletReady,
    needsAuthentication
  } = useEnhancedWalletAuth();
  
  const { isConnected } = useAccount();
  
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [isManualRecovery, setIsManualRecovery] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const MAX_AUTO_RECOVERY_ATTEMPTS = 2;

  /**
   * Auto-retry logic for network issues
   */
  useEffect(() => {
    if (autoRetry && 
        needsAuthentication && 
        isWalletReady && 
        !authState.isAuthenticating && 
        !isRecovering &&
        recoveryAttempts < MAX_AUTO_RECOVERY_ATTEMPTS) {
      
      const timer = setTimeout(() => {
        handleRecovery(true);
      }, 3000); // Wait 3 seconds before auto-retry

      return () => clearTimeout(timer);
    }
  }, [autoRetry, needsAuthentication, isWalletReady, authState.isAuthenticating, isRecovering, recoveryAttempts]);

  /**
   * Handle authentication recovery
   */
  const handleRecovery = async (isAutomatic = false) => {
    if (!isAutomatic) {
      setIsManualRecovery(true);
    }

    try {
      setRecoveryAttempts(prev => prev + 1);
      
      let result;
      if (sessionStatus.hasSession && sessionStatus.expiresAt && sessionStatus.expiresAt > Date.now()) {
        // Try session recovery first
        result = await recoverAuthentication();
      } else {
        // Try full authentication
        result = await authenticate({ forceRefresh: true });
      }

      if (result.success) {
        console.log('✅ Authentication recovery successful');
        onRecoverySuccess?.();
        setRecoveryAttempts(0);
      } else {
        console.warn('❌ Authentication recovery failed:', result.error);
        onRecoveryFailed?.(result.error || 'Recovery failed');
      }
    } catch (error: any) {
      console.error('Recovery error:', error);
      onRecoveryFailed?.(error.message || 'Recovery error');
    } finally {
      setIsManualRecovery(false);
    }
  };

  /**
   * Clear all errors
   */
  const handleClearErrors = () => {
    clearError();
    clearWalletError();
    setRecoveryAttempts(0);
  };

  /**
   * Get recovery status message
   */
  const getStatusMessage = (): { message: string; type: 'info' | 'warning' | 'error' | 'success' } => {
    if (isAuthenticated) {
      return { message: 'Authentication successful', type: 'success' };
    }

    if (isRecovering || authState.isAuthenticating || isManualRecovery) {
      return { message: 'Recovering authentication...', type: 'info' };
    }

    if (!isConnected) {
      return { message: 'Please connect your wallet to continue', type: 'warning' };
    }

    if (!isWalletReady) {
      return { message: 'Wallet connection not ready', type: 'warning' };
    }

    if (authError || authState.error) {
      const error = authError || authState.error;
      if (error?.includes('rejected') || error?.includes('denied')) {
        return { message: 'Signature request was rejected. Please try again.', type: 'warning' };
      }
      if (error?.includes('network') || error?.includes('unavailable')) {
        return { message: 'Network issue detected. Attempting recovery...', type: 'warning' };
      }
      return { message: error, type: 'error' };
    }

    if (needsAuthentication) {
      return { message: 'Authentication required', type: 'info' };
    }

    return { message: 'Checking authentication status...', type: 'info' };
  };

  /**
   * Get recovery suggestions based on error type
   */
  const getRecoverySuggestions = (): string[] => {
    const suggestions: string[] = [];
    const error = authError || authState.error;

    if (!isConnected) {
      suggestions.push('Connect your wallet using the wallet button');
      return suggestions;
    }

    if (error?.includes('rejected') || error?.includes('denied')) {
      suggestions.push('Click "Retry" and approve the signature request in your wallet');
      suggestions.push('Make sure your wallet is unlocked');
    } else if (error?.includes('network') || error?.includes('unavailable')) {
      suggestions.push('Check your internet connection');
      suggestions.push('The service may be temporarily unavailable - we\'ll retry automatically');
    } else if (error?.includes('timeout')) {
      suggestions.push('The request timed out - please try again');
      suggestions.push('Make sure your wallet is responsive');
    } else if (authState.retryCount >= 3) {
      suggestions.push('Multiple attempts failed - please refresh the page');
      suggestions.push('Try disconnecting and reconnecting your wallet');
    } else if (needsAuthentication) {
      suggestions.push('Click "Authenticate" to sign in with your wallet');
    }

    return suggestions;
  };

  const status = getStatusMessage();
  const suggestions = getRecoverySuggestions();
  const canRetry = showRetryButton && !authState.isAuthenticating && !isRecovering && !isManualRecovery;
  const showRecoveryUI = !isAuthenticated && (authError || authState.error || needsAuthentication);

  if (!showRecoveryUI) {
    return null;
  }

  return (
    <div className={`authentication-recovery ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Status Message */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {status.type === 'error' && (
              <div className="w-5 h-5 text-red-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {status.type === 'warning' && (
              <div className="w-5 h-5 text-yellow-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {status.type === 'info' && (
              <div className="w-5 h-5 text-blue-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {status.type === 'success' && (
              <div className="w-5 h-5 text-green-500">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${
              status.type === 'error' ? 'text-red-800' :
              status.type === 'warning' ? 'text-yellow-800' :
              status.type === 'success' ? 'text-green-800' :
              'text-blue-800'
            }`}>
              {status.message}
            </p>
            
            {/* Recovery Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-2">
                <ul className="text-sm text-gray-600 space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex space-x-2">
            {canRetry && (
              <button
                onClick={() => handleRecovery(false)}
                disabled={!authState.canRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {needsAuthentication ? 'Authenticate' : 'Retry'}
              </button>
            )}
            
            {(authError || authState.error) && (
              <button
                onClick={handleClearErrors}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear
              </button>
            )}
          </div>

          {/* Debug Info Toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Debug Information */}
        {showDetails && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Debug Information</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Wallet Connected: {isConnected ? 'Yes' : 'No'}</div>
              <div>Wallet Ready: {isWalletReady ? 'Yes' : 'No'}</div>
              <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
              <div>Has Session: {sessionStatus.hasSession ? 'Yes' : 'No'}</div>
              <div>Recovery Attempts: {recoveryAttempts}</div>
              <div>Retry Count: {authState.retryCount}</div>
              <div>Can Retry: {authState.canRetry ? 'Yes' : 'No'}</div>
              {walletInfo.connector && <div>Connector: {walletInfo.connector}</div>}
              {sessionStatus.timeUntilExpiry && (
                <div>Session Expires: {Math.round(sessionStatus.timeUntilExpiry / 1000 / 60)} minutes</div>
              )}
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {(isRecovering || authState.isAuthenticating || isManualRecovery) && (
          <div className="mt-3 flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Processing...
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthenticationRecovery;