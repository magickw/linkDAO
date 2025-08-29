import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

interface WalletConnectButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { login, isAuthenticated } = useAuth();

  const handleConnect = async (connectorId: string) => {
    try {
      setIsConnecting(true);
      
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        throw new Error('Connector not found');
      }

      // Connect wallet
      await connect({ connector });
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      onError?.(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAuthenticate = async () => {
    if (!address) {
      onError?.('No wallet address found');
      return;
    }

    try {
      setIsAuthenticating(true);
      
      const result = await login(address);
      
      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      onError?.(error.message || 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  if (isConnected && isAuthenticated) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (isConnected && !isAuthenticated) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-sm text-gray-600">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={handleAuthenticate}
          disabled={isAuthenticating}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAuthenticating ? 'Authenticating...' : 'Sign Message'}
        </button>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect Your Wallet</h3>
      
      <div className="grid gap-3">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => handleConnect(connector.id)}
            disabled={isConnecting}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                {connector.name === 'MetaMask' && '🦊'}
                {connector.name === 'WalletConnect' && '🔗'}
                {connector.name === 'Injected Wallet' && '💼'}
              </div>
              <span className="font-medium text-gray-900">{connector.name}</span>
            </div>
            
            {isConnecting ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>New to Web3?</strong> We recommend MetaMask for beginners. 
          <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="underline ml-1">
            Download here
          </a>
        </p>
      </div>
    </div>
  );
};