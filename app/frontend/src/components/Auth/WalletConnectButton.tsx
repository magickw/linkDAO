import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
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
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const isCompact = className.includes('compact');

  if (isConnected && isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RainbowConnectButton
          accountStatus="address"
          showBalance={false}
          chainStatus="none"
        />
      </div>
    );
  }

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