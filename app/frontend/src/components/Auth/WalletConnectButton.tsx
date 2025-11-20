import React from 'react';
import { useAccount, useConnect } from 'wagmi';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/context/AuthContext';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { NetworkSwitcher } from '@/components/Web3/NetworkSwitcher';

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
    // Mock reputation data - in real app, this would come from a hook or service
    const userReputation = {
      score: 850,
      level: 'Trusted Seller',
      daoApproved: true
    };

    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* User Reputation Score */}
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg border border-purple-400/30">
          <div className="flex items-center space-x-1">
            <span className="text-yellow-400">⭐</span>
            <span className="text-sm font-semibold text-white">{userReputation.score}</span>
          </div>
          {userReputation.daoApproved && (
            <div className="flex items-center space-x-1">
              <span className="text-green-400">✓</span>
              <span className="text-xs text-green-300">DAO</span>
            </div>
          )}
        </div>

        {/* Network Switcher */}
        <NetworkSwitcher variant="compact" />
        
        {/* Wallet Connect Button */}
        <RainbowConnectButton
          accountStatus="address"
          showBalance={false}
          chainStatus="none"
        />
      </div>
    );
  }

  if (isConnected && !isAuthenticated) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Network Switcher */}
        <NetworkSwitcher variant="compact" />
        
        {/* Wallet Connect Button */}
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