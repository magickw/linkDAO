/**
 * WalletConnectButton Component - Web3 wallet connection
 * Provides wallet connection with multiple provider support
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, GhostButton } from '@/design-system/components/Button';
import { designTokens } from '@/design-system/tokens';
import { GlassPanel } from '@/design-system/components/GlassPanel';

interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  installed?: boolean;
}

interface WalletConnectButtonProps {
  onConnect?: (provider: WalletProvider) => void;
  className?: string;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onConnect,
  className = "",
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  const walletProviders: WalletProvider[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask wallet',
      installed: typeof window !== 'undefined' && !!(window as any).ethereum?.isMetaMask,
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '📱',
      description: 'Connect using WalletConnect protocol',
      installed: true,
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Connect using Coinbase Wallet',
      installed: typeof window !== 'undefined' && !!(window as any).ethereum?.isCoinbaseWallet,
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '🛡️',
      description: 'Connect using Trust Wallet',
      installed: typeof window !== 'undefined' && !!(window as any).ethereum?.isTrust,
    },
  ];

  const handleWalletConnect = async (provider: WalletProvider) => {
    try {
      // Mock wallet connection - in real app, this would use actual wallet connection logic
      setIsConnected(true);
      setConnectedAddress('0x1234...5678');
      setIsModalOpen(false);
      
      if (onConnect) {
        onConnect(provider);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setConnectedAddress(null);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && connectedAddress) {
    return (
      <div className={`relative ${className}`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 border border-green-400/30 rounded-lg text-green-400 backdrop-blur-sm"
        >
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="font-medium">{formatAddress(connectedAddress)}</span>
          <button
            onClick={handleDisconnect}
            className="text-green-400/60 hover:text-green-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="gradient"
        gradient="primary"
        onClick={() => setIsModalOpen(true)}
        className="font-medium"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Connect Wallet
      </Button>

      {/* Wallet Connection Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <GlassPanel
                variant="modal"
                className="w-full max-w-md"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <p className="text-white/80 mb-6 text-center">
                    Choose your preferred wallet to connect to the Web3 Marketplace
                  </p>

                  <div className="space-y-3">
                    {walletProviders.map((provider, index) => (
                      <motion.button
                        key={provider.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleWalletConnect(provider)}
                        disabled={!provider.installed}
                        className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                          provider.installed
                            ? 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 cursor-pointer'
                            : 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <span className="text-2xl">{provider.icon}</span>
                          <div className="text-left">
                            <p className="text-white font-medium">{provider.name}</p>
                            <p className="text-xs text-white/60">{provider.description}</p>
                          </div>
                        </div>
                        
                        {provider.installed ? (
                          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        ) : (
                          <span className="text-xs text-red-400 font-medium">Not Installed</span>
                        )}
                      </motion.button>
                    ))}
                  </div>

                  {/* Security Notice */}
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-blue-400 font-medium text-sm">Security Notice</p>
                        <p className="text-blue-300/80 text-xs mt-1">
                          Only connect wallets you trust. Never share your private keys or seed phrases.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};