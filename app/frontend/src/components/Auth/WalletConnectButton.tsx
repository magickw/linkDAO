import React from 'react';
import { useAccount, useConnect } from 'wagmi';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/context/AuthContext';
import { useWalletAuth } from '@/hooks/useWalletAuth';

interface WalletConnectButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  showAuthStatus?: boolean;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onSuccess,
  onError,
  className = '',
  showAuthStatus = true
}) => {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { isAuthenticated } = useAuth();
  const { isAuthenticating, walletInfo } = useWalletAuth();
  const isCompact = className.includes('compact');

  // Function to connect specifically with MetaMask
  const connectMetaMask = () => {
    const metaMaskConnector = connectors.find(c => c.id === 'metaMask');
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    } else {
      // Fallback to injected connector (which includes MetaMask)
      const injectedConnector = connectors.find(c => c.id === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      } else {
        console.error('MetaMask not found');
        if (onError) onError('MetaMask not found. Please install MetaMask extension.');
      }
    }
  };

  // Show different states based on connection and authentication
  if (isConnected && isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RainbowConnectButton
          accountStatus="address"
          showBalance={false}
          chainStatus="none"
        />
        {showAuthStatus && walletInfo.isBaseWallet && (
          <span className="text-xs text-green-500 font-medium">
            Base ✓
          </span>
        )}
      </div>
    );
  }

  // Show authenticating state
  if (isConnected && isAuthenticating) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RainbowConnectButton
          accountStatus="address"
          showBalance={false}
          chainStatus="none"
        />
        {showAuthStatus && (
          <span className="text-xs text-yellow-500 font-medium animate-pulse">
            Signing in...
          </span>
        )}
      </div>
    );
  }

  // Show connected but not authenticated state
  if (isConnected && !isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RainbowConnectButton
          accountStatus="address"
          showBalance={false}
          chainStatus="none"
        />
        {showAuthStatus && (
          <span className="text-xs text-orange-500 font-medium">
            {walletInfo.isBaseWallet ? 'Base wallet connected' : 'Authenticating...'}
          </span>
        )}
      </div>
    );
  }

  // Show connect wallet state with explicit MetaMask option
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <RainbowConnectButton
        accountStatus="address"
        showBalance={false}
        chainStatus="none"
        label={isCompact ? 'Connect' : 'Connect Wallet'}
      />
      <button
        onClick={connectMetaMask}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Connect with MetaMask
      </button>
    </div>
  );
};