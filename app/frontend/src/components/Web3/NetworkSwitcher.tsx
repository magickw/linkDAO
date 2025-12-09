import React, { useState } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { mainnet, polygon, arbitrum, sepolia, base, baseSepolia } from 'wagmi/chains';

interface NetworkSwitcherProps {
  variant?: 'compact' | 'full';
  showDisconnect?: boolean;
}

const SUPPORTED_NETWORKS = [
  {
    id: baseSepolia.id,
    name: 'Base Sepolia',
    shortName: 'SEP',
    color: 'bg-blue-300',
    isTestnet: true
  },
  {
    id: mainnet.id,
    name: 'Ethereum',
    shortName: 'ETH',
    color: 'bg-blue-500',
    isTestnet: false
  },
  {
    id: polygon.id,
    name: 'Polygon',
    shortName: 'MATIC',
    color: 'bg-purple-600',
    isTestnet: false
  },
  {
    id: arbitrum.id,
    name: 'Arbitrum',
    shortName: 'ARB',
    color: 'bg-blue-600',
    isTestnet: false
  },
  {
    id: base.id,
    name: 'Base',
    shortName: 'BASE',
    color: 'bg-blue-400',
    isTestnet: false
  }
];

export const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ 
  variant = 'full', 
  showDisconnect = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const currentNetwork = SUPPORTED_NETWORKS.find(network => network.id === chainId);
  const defaultNetwork = SUPPORTED_NETWORKS[0]; // Fallback to Ethereum

  const handleNetworkSwitch = async (networkId: number) => {
    try {
      await switchChain({ chainId: networkId });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          disabled={isPending}
        >
          <div className={`w-2 h-2 rounded-full ${currentNetwork?.color || defaultNetwork.color}`}></div>
          <span className="text-sm font-medium text-white">
            {currentNetwork?.shortName || defaultNetwork.shortName}
          </span>
          <ChevronDownIcon className="w-4 h-4 text-white/70" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg z-50">
            <div className="py-1">
              {SUPPORTED_NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleNetworkSwitch(network.id)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-700/50"
                  disabled={isPending}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${network.color}`}></div>
                    <span>{network.name}</span>
                  </div>
                  {chainId === network.id && (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-3 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-colors min-w-[200px]"
        disabled={isPending}
      >
        <div className={`w-3 h-3 rounded-full ${currentNetwork?.color || defaultNetwork.color}`}></div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-white">
            {currentNetwork?.name || defaultNetwork.name}
          </div>
        </div>
        <ChevronDownIcon className="w-5 h-5 text-white/70" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg z-50">
            <div className="py-2">
              {SUPPORTED_NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => handleNetworkSwitch(network.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-gray-700/50"
                  disabled={isPending}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${network.color}`}></div>
                    <span className="font-medium">{network.name}</span>
                  </div>
                  {chainId === network.id && (
                    <CheckIcon className="w-5 h-5 text-green-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};