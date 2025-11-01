/**
 * Wallet Connection Prompt Component
 * User-friendly wallet connection with error handling
 */

import React, { useState } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Wallet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface WalletConnectionPromptProps {
  onConnected?: () => void;
  onError?: (error: Error) => void;
  requiredNetwork?: number;
  showNetworkWarning?: boolean;
}

export const WalletConnectionPrompt: React.FC<WalletConnectionPromptProps> = ({
  onConnected,
  onError,
  requiredNetwork,
  showNetworkWarning = true
}) => {
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [selectedConnector, setSelectedConnector] = useState<typeof connectors[0] | null>(null);

  const handleConnect = async (connector: typeof connectors[0]) => {
    setSelectedConnector(connector);
    try {
      await connect({ connector });
      onConnected?.();
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const isWrongNetwork = requiredNetwork && chain?.id !== requiredNetwork;

  if (isConnected && !isWrongNetwork) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              Wallet Connected
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <button
            onClick={() => disconnect()}
            className="text-xs text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (isConnected && isWrongNetwork && showNetworkWarning) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              Wrong Network
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Please switch to {getNetworkName(requiredNetwork)} to continue
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Wallet className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect your Web3 wallet to proceed with crypto payment
        </p>
      </div>

      {connectError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {connectError.message || 'Failed to connect wallet'}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => handleConnect(connector)}
            disabled={isPending || !connector.ready}
            className="w-full flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {connector.name}
                </p>
                {!connector.ready && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Not detected
                  </p>
                )}
              </div>
            </div>
            {isPending && selectedConnector?.id === connector.id && (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
            )}
          </button>
        ))}
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Don't have a wallet?{' '}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Get MetaMask
          </a>
        </p>
      </div>
    </div>
  );
};

function getNetworkName(chainId?: number): string {
  const networks: Record<number, string> = {
    1: 'Ethereum Mainnet',
    137: 'Polygon',
    42161: 'Arbitrum One',
    10: 'Optimism',
    8453: 'Base',
    11155111: 'Sepolia Testnet',
    80001: 'Mumbai Testnet'
  };

  return networks[chainId || 1] || `Network ${chainId}`;
}

export default WalletConnectionPrompt;
