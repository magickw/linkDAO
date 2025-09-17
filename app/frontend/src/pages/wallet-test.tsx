import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConnect } from 'wagmi';
import Layout from '@/components/Layout';

export default function WalletTest() {
  const { address, isConnected, connector } = useAccount();
  const { connectors, connect, error, isPending } = useConnect();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Wallet Connection Test</h1>
            
            {/* RainbowKit Connect Button */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">RainbowKit Connect Button</h2>
              <ConnectButton />
            </div>

            {/* Connection Status */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
                <p><strong>Address:</strong> {address || 'Not connected'}</p>
                <p><strong>Connector:</strong> {connector?.name || 'None'}</p>
              </div>
            </div>

            {/* Available Connectors */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Available Connectors</h2>
              <div className="space-y-2">
                {connectors.map((connector) => (
                  <div key={connector.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                    <div>
                      <span className="font-medium">{connector.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({connector.id})
                      </span>
                      {!connector.ready && (
                        <span className="text-xs text-red-500 ml-2">(Not Ready)</span>
                      )}
                    </div>
                    <button
                      onClick={() => connect({ connector })}
                      disabled={!connector.ready || isPending}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-red-600">Connection Error</h2>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <p><strong>Error:</strong> {error.message}</p>
                  <p><strong>Name:</strong> {error.name}</p>
                  {error.cause && (
                    <p><strong>Cause:</strong> {String(error.cause)}</p>
                  )}
                </div>
              </div>
            )}

            {/* Debug Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p><strong>User Agent:</strong> {typeof window !== 'undefined' ? navigator.userAgent : 'Server'}</p>
                <p><strong>Window.ethereum:</strong> {typeof window !== 'undefined' && window.ethereum ? 'Available' : 'Not Available'}</p>
                <p><strong>WalletConnect Project ID:</strong> {process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? 'Set' : 'Not Set'}</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Testing Instructions</h3>
              <ul className="text-blue-800 space-y-1">
                <li>1. Try clicking the RainbowKit "Connect Wallet" button above</li>
                <li>2. Check if wallet options appear in the modal</li>
                <li>3. Try connecting with individual connector buttons</li>
                <li>4. Check the debug information for any missing dependencies</li>
                <li>5. Open browser console to see any error messages</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}