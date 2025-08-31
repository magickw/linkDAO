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
  const [showModal, setShowModal] = useState(false);
  
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
      setShowModal(false);
      
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

  // Check if this is a compact navbar version
  const isCompact = className.includes('compact');

  if (isConnected && isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-white">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (isConnected && !isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-sm text-white">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <button
          onClick={handleAuthenticate}
          disabled={isAuthenticating}
          className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAuthenticating ? 'Auth...' : 'Sign'}
        </button>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowModal(!showModal)}
          className="px-4 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20 transition-colors backdrop-blur-sm"
        >
          Connect Wallet
        </button>
        
        {showModal && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowModal(false)}
            />
            
            {/* Modal */}
            <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 z-50 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Connect Wallet</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        {connector.name === 'MetaMask' && '🦊'}
                        {connector.name === 'WalletConnect' && '🔗'}
                        {connector.name === 'Injected Wallet' && '💼'}
                        {!['MetaMask', 'WalletConnect', 'Injected Wallet'].includes(connector.name) && '🔗'}
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
          </>
        )}
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
                {!['MetaMask', 'WalletConnect', 'Injected Wallet'].includes(connector.name) && '🔗'}
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