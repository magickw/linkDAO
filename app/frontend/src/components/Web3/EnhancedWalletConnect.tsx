import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import { 
  WalletIcon, 
  ArrowDownTrayIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { NetworkSwitcher } from './NetworkSwitcher';

interface EnhancedWalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
  showBalance?: boolean;
  showNetwork?: boolean;
  compact?: boolean;
}

export const EnhancedWalletConnect: React.FC<EnhancedWalletConnectProps> = ({
  onConnect,
  onDisconnect,
  className = '',
  showBalance = true,
  showNetwork = true,
  compact = false
}) => {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const { chainId } = useChainId();
  const { switchChain } = useSwitchChain();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if on Base network
  const isBaseNetwork = chainId === base.id;
  const isTestnet = chainId === baseSepolia.id;

  // Handle wallet connection
  const handleConnect = async (connector: any) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      await connect({ connector });
      if (onConnect && address) {
        onConnect(address);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      await disconnect();
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  // Switch to Base network
  const switchToBase = async () => {
    try {
      await switchChain({ chainId: base.id });
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
    }
  };

  // Copy address to clipboard
  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (err) {
        setError('Failed to copy address');
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen && !(event.target as Element).closest('.wallet-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // If not connected, show connect button
  if (!isConnected) {
    return (
      <div className={`relative ${className}`}>
        <RainbowConnectButton.Custom>
          {({ account, chain, openConnectModal }) => (
            <button
              onClick={openConnectModal}
              disabled={isPending || isConnecting}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
            >
              <WalletIcon className="w-5 h-5" />
              <span>{compact ? 'Connect' : 'Connect Wallet'}</span>
              {isConnecting && (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              )}
            </button>
          )}
        </RainbowConnectButton.Custom>

        {error && (
          <div className="absolute top-full mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm max-w-xs">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If connected, show wallet info
  return (
    <div className={`relative wallet-dropdown ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-200"
      >
        {/* Network indicator */}
        {showNetwork && (
          <div className={`w-2 h-2 rounded-full ${
            isBaseNetwork ? 'bg-blue-500' : 
            isTestnet ? 'bg-purple-500' : 
            'bg-gray-500'
          }`} />
        )}

        {/* Wallet icon */}
        <WalletIcon className="w-5 h-5 text-white" />

        {/* Address */}
        <span className="text-white font-medium">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'}
        </span>

        {/* Balance */}
        {showBalance && balance && (
          <span className="text-white/80 text-sm">
            {parseFloat(formatEther(balance.value)).toFixed(3)} ETH
          </span>
        )}

        {/* Dropdown arrow */}
        <ArrowDownTrayIcon className="w-4 h-4 text-white/70" />
      </button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Connected Wallet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {address}
                </p>
              </div>
              <button
                onClick={copyAddress}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {copiedAddress ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <ArrowDownTrayIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Network status */}
          {showNetwork && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Network
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isBaseNetwork ? 'Base Mainnet' : 
                     isTestnet ? 'Base Sepolia' : 
                     'Unknown Network'}
                  </p>
                </div>
                {!isBaseNetwork && !isTestnet && (
                  <button
                    onClick={switchToBase}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Switch to Base
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Balance */}
          {showBalance && balance && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Balance
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="p-4">
            <div className="space-y-2">
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                View on Explorer
              </button>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                Portfolio
              </button>
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-full mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm max-w-xs">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Export a simplified version for compact usage
export const CompactWalletConnect: React.FC<Omit<EnhancedWalletConnectProps, 'compact'>> = (props) => (
  <EnhancedWalletConnect {...props} compact={true} />
);