/**
 * Enhanced Authentication Demo Component
 * Demonstrates the enhanced authentication system with session recovery,
 * error handling, and user feedback
 */

import React, { useState, useEffect } from 'react';
import { useEnhancedAuth } from '@/context/EnhancedAuthContext';
import { useEnhancedWalletAuth } from '@/hooks/useEnhancedWalletAuth';
import { AuthenticationRecovery } from '@/components/Auth/AuthenticationRecovery';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export const EnhancedAuthDemo: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    isRecovering,
    error,
    sessionStatus,
    recoverSession,
    logout,
    clearError
  } = useEnhancedAuth();

  const {
    walletInfo,
    authState,
    authenticate,
    recoverAuthentication,
    disconnect,
    clearError: clearWalletError,
    isWalletReady,
    needsAuthentication
  } = useEnhancedWalletAuth();

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const [demoState, setDemoState] = useState({
    showSessionDetails: false,
    showWalletDetails: false,
    lastAction: '',
    actionResult: ''
  });

  /**
   * Handle authentication with feedback
   */
  const handleAuthenticate = async (forceRefresh = false) => {
    setDemoState(prev => ({ 
      ...prev, 
      lastAction: `Authenticate (force: ${forceRefresh})`,
      actionResult: 'Processing...'
    }));

    try {
      const result = await authenticate({ forceRefresh });
      setDemoState(prev => ({
        ...prev,
        actionResult: result.success ? 'Success!' : `Failed: ${result.error}`
      }));
    } catch (error: any) {
      setDemoState(prev => ({
        ...prev,
        actionResult: `Error: ${error.message}`
      }));
    }
  };

  /**
   * Handle session recovery with feedback
   */
  const handleRecovery = async () => {
    setDemoState(prev => ({ 
      ...prev, 
      lastAction: 'Session Recovery',
      actionResult: 'Processing...'
    }));

    try {
      const result = await recoverAuthentication();
      setDemoState(prev => ({
        ...prev,
        actionResult: result.success ? 'Recovery successful!' : `Recovery failed: ${result.error}`
      }));
    } catch (error: any) {
      setDemoState(prev => ({
        ...prev,
        actionResult: `Recovery error: ${error.message}`
      }));
    }
  };

  /**
   * Handle logout with feedback
   */
  const handleLogout = async () => {
    setDemoState(prev => ({ 
      ...prev, 
      lastAction: 'Logout',
      actionResult: 'Processing...'
    }));

    try {
      await logout();
      setDemoState(prev => ({
        ...prev,
        actionResult: 'Logged out successfully!'
      }));
    } catch (error: any) {
      setDemoState(prev => ({
        ...prev,
        actionResult: `Logout error: ${error.message}`
      }));
    }
  };

  /**
   * Clear all errors
   */
  const handleClearErrors = () => {
    clearError();
    clearWalletError();
    setDemoState(prev => ({
      ...prev,
      lastAction: 'Clear Errors',
      actionResult: 'Errors cleared'
    }));
  };

  return (
    <div className="enhanced-auth-demo p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Enhanced Authentication Demo</h1>
      
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Authentication Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Authentication Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Wallet Connected:</span>
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Wallet Ready:</span>
              <span className={isWalletReady ? 'text-green-600' : 'text-red-600'}>
                {isWalletReady ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Authenticated:</span>
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Loading:</span>
              <span className={isLoading ? 'text-yellow-600' : 'text-gray-600'}>
                {isLoading ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Recovering:</span>
              <span className={isRecovering ? 'text-yellow-600' : 'text-gray-600'}>
                {isRecovering ? 'Yes' : 'No'}
              </span>
            </div>
            {address && (
              <div className="flex justify-between">
                <span>Address:</span>
                <span className="text-xs font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* User Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">User Information</h2>
          {user ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Handle:</span>
                <span>{user.handle}</span>
              </div>
              <div className="flex justify-between">
                <span>Role:</span>
                <span className="capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span>KYC Status:</span>
                <span className="capitalize">{user.kycStatus}</span>
              </div>
              <div className="flex justify-between">
                <span>Active:</span>
                <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
                  {user.isActive ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No user data available</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Connect Wallet
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAuthenticate(false)}
                disabled={authState.isAuthenticating || isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Authenticate
              </button>
              
              <button
                onClick={() => handleAuthenticate(true)}
                disabled={authState.isAuthenticating || isLoading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                Force Refresh
              </button>
              
              <button
                onClick={handleRecovery}
                disabled={authState.isRecovering || isRecovering}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Recover Session
              </button>
              
              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Error Handling */}
        {(error || authState.error) && (
          <div className="mt-4">
            <button
              onClick={handleClearErrors}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear Errors
            </button>
          </div>
        )}

        {/* Last Action Result */}
        {demoState.lastAction && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="text-sm">
              <strong>Last Action:</strong> {demoState.lastAction}
            </div>
            <div className="text-sm mt-1">
              <strong>Result:</strong> {demoState.actionResult}
            </div>
          </div>
        )}
      </div>

      {/* Authentication Recovery Component */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Authentication Recovery</h2>
        <AuthenticationRecovery
          onRecoverySuccess={() => {
            setDemoState(prev => ({
              ...prev,
              lastAction: 'Auto Recovery',
              actionResult: 'Recovery successful!'
            }));
          }}
          onRecoveryFailed={(error) => {
            setDemoState(prev => ({
              ...prev,
              lastAction: 'Auto Recovery',
              actionResult: `Recovery failed: ${error}`
            }));
          }}
          showRetryButton={true}
          autoRetry={false}
        />
      </div>

      {/* Debug Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Session Details</h2>
            <button
              onClick={() => setDemoState(prev => ({ 
                ...prev, 
                showSessionDetails: !prev.showSessionDetails 
              }))}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {demoState.showSessionDetails ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {demoState.showSessionDetails && (
            <div className="space-y-2 text-xs">
              <div><strong>Has Session:</strong> {sessionStatus.hasSession ? 'Yes' : 'No'}</div>
              <div><strong>Is Valid:</strong> {sessionStatus.isValid ? 'Yes' : 'No'}</div>
              <div><strong>Needs Refresh:</strong> {sessionStatus.needsRefresh ? 'Yes' : 'No'}</div>
              {sessionStatus.expiresAt && (
                <div><strong>Expires:</strong> {new Date(sessionStatus.expiresAt).toLocaleString()}</div>
              )}
              {sessionStatus.timeUntilExpiry && (
                <div><strong>Time Until Expiry:</strong> {Math.round(sessionStatus.timeUntilExpiry / 1000 / 60)} minutes</div>
              )}
              {sessionStatus.walletAddress && (
                <div><strong>Wallet:</strong> {sessionStatus.walletAddress.slice(0, 6)}...{sessionStatus.walletAddress.slice(-4)}</div>
              )}
            </div>
          )}
        </div>

        {/* Wallet Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Wallet Details</h2>
            <button
              onClick={() => setDemoState(prev => ({ 
                ...prev, 
                showWalletDetails: !prev.showWalletDetails 
              }))}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {demoState.showWalletDetails ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {demoState.showWalletDetails && (
            <div className="space-y-2 text-xs">
              <div><strong>Connector:</strong> {walletInfo.connector || 'None'}</div>
              <div><strong>Chain ID:</strong> {walletInfo.chainId || 'Unknown'}</div>
              <div><strong>Is Base Wallet:</strong> {walletInfo.isBaseWallet ? 'Yes' : 'No'}</div>
              <div><strong>Retry Count:</strong> {authState.retryCount}</div>
              <div><strong>Can Retry:</strong> {authState.canRetry ? 'Yes' : 'No'}</div>
              {authState.lastAttempt && (
                <div><strong>Last Attempt:</strong> {new Date(authState.lastAttempt).toLocaleString()}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {(error || authState.error) && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Error Information</h3>
          <div className="text-red-700 text-sm">
            {error || authState.error}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAuthDemo;