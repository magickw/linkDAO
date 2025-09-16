import React from 'react';
import { useAccount } from 'wagmi';
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
  const { isAuthenticated } = useAuth();
  const { isAuthenticating, walletInfo } = useWalletAuth();
  const isCompact = className.includes('compact');

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

  // Show connect wallet state
  return (
    <div className={className}>
      <RainbowConnectButton
        accountStatus="address"
        showBalance={false}
        chainStatus="none"
        label={isCompact ? 'Connect' : 'Connect Wallet'}
      />
    </div>
  );
};