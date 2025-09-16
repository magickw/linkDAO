/**
 * Base Wallet Login Demo - Test page for Base wallet authentication
 * Demonstrates automatic login flow with Base wallet (Coinbase Wallet)
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { WalletConnectButton } from '@/components/Auth/WalletConnectButton';
import Layout from '@/components/Layout';

export default function BaseWalletDemo() {
  const { address, isConnected, connector } = useAccount();
  const { user, isAuthenticated, logout } = useAuth();
  const { 
    isAuthenticating, 
    authError, 
    canAuthenticate, 
    authenticateWallet, 
    clearAuthError, 
    walletInfo 
  } = useWalletAuth();

  const [manualAuthResult, setManualAuthResult] = useState<string | null>(null);

  const handleManualAuth = async () => {
    setManualAuthResult(null);
    const result = await authenticateWallet();
    setManualAuthResult(result.success ? 'Success!' : `Failed: ${result.error}`);
  };

  const handleLogout = async () => {
    await logout();
    setManualAuthResult(null);
    clearAuthError();
  };

  return (
    <>
      <Head>
        <title>Base Wallet Login Demo - LinkDAO</title>
        <meta name="description" content="Test Base wallet automatic login functionality" />
      </Head>
      
      <Layout title="Base Wallet Login Demo">
        <div className="max-w-4xl mx-auto py-8 space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Base Wallet Login Demo
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Test automatic authentication with Base wallet (Coinbase Wallet)
            </p>
          </div>

          {/* Connection Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Connection Status
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Wallet Connected:</span>
                <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Yes' : 'No'}
                </span>
              </div>
              
              {isConnected && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Wallet Type:</span>
                    <span className={`font-medium ${walletInfo.isBaseWallet ? 'text-blue-600' : 'text-gray-600'}`}>
                      {connector?.name || 'Unknown'} {walletInfo.isBaseWallet && '(Base Wallet)'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Address:</span>
                    <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
                    </span>
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Authenticated:</span>
                <span className={`font-medium ${isAuthenticated ? 'text-green-600' : 'text-orange-600'}`}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </span>
              </div>
              
              {isAuthenticating && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Status:</span>
                  <span className="font-medium text-yellow-600 animate-pulse">
                    Authenticating...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* User Information */}
          {isAuthenticated && user && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-6 border border-green-200 dark:border-green-800">
              <h2 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-4">
                ✅ Successfully Logged In!
              </h2>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-green-700 dark:text-green-300">User ID:</span>
                  <span className="font-mono text-sm text-green-600 dark:text-green-400">
                    {user.id}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-green-700 dark:text-green-300">Handle:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {user.handle}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-green-700 dark:text-green-300">KYC Status:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {user.kycStatus}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {authError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-6 border border-red-200 dark:border-red-800">
              <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
                ❌ Authentication Error
              </h2>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {authError}
              </p>
              <button
                onClick={clearAuthError}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear Error
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Actions
            </h2>
            
            <div className="space-y-4">
              {/* Connect Wallet Button */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  1. Connect Your Wallet
                </label>
                <WalletConnectButton 
                  className="w-full"
                  showAuthStatus={true}
                  onSuccess={() => console.log('Wallet connected successfully')}
                  onError={(error) => console.error('Wallet connection error:', error)}
                />
              </div>

              {/* Manual Authentication */}
              {canAuthenticate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    2. Manual Authentication (if auto-login fails)
                  </label>
                  <button
                    onClick={handleManualAuth}
                    disabled={isAuthenticating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAuthenticating ? 'Authenticating...' : 'Authenticate Wallet'}
                  </button>
                  {manualAuthResult && (
                    <p className={`mt-2 text-sm ${manualAuthResult.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
                      {manualAuthResult}
                    </p>
                  )}
                </div>
              )}

              {/* Logout */}
              {isAuthenticated && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    3. Logout
                  </label>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-6 border border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">
              📋 Testing Instructions
            </h2>
            
            <div className="space-y-2 text-blue-700 dark:text-blue-300">
              <p><strong>For Base Wallet (Coinbase Wallet):</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Click "Connect Wallet" and select "Coinbase Wallet"</li>
                <li>Approve the connection in your Coinbase Wallet app/extension</li>
                <li>The system should automatically prompt you to sign a message</li>
                <li>Sign the authentication message to complete login</li>
                <li>You should see your user information displayed above</li>
              </ol>
              
              <p className="mt-4"><strong>Features being tested:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Automatic authentication trigger on wallet connection</li>
                <li>Base wallet detection and special handling</li>
                <li>Error handling for signature rejections</li>
                <li>User feedback during authentication process</li>
                <li>Persistent authentication across page reloads</li>
              </ul>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}