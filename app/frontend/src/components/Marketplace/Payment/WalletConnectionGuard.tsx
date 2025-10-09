/**
 * WalletConnectionGuard - Prevents checkout without wallet connection
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { Wallet, AlertCircle } from 'lucide-react';
import { Button } from '@/design-system/components/Button';

interface WalletConnectionGuardProps {
  children: React.ReactNode;
  onConnectClick?: () => void;
}

export const WalletConnectionGuard: React.FC<WalletConnectionGuardProps> = ({
  children,
  onConnectClick,
}) => {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Wallet size={32} className="text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Connect your wallet to continue
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You need to connect your Web3 wallet to proceed with checkout and complete your purchase securely.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200 text-left">
                <p className="font-medium mb-1">Why connect a wallet?</p>
                <ul className="space-y-1 text-blue-800 dark:text-blue-300">
                  <li>• Secure on-chain payments with escrow protection</li>
                  <li>• Receive NFT receipts for your purchases</li>
                  <li>• Access DAO governance and dispute resolution</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={onConnectClick}
            className="w-full sm:w-auto"
          >
            <Wallet size={18} className="mr-2" />
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
