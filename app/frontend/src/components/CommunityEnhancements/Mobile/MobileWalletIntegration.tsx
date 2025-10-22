import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../../design-system/hooks/useResponsive';

interface WalletConnection {
  address: string;
  balance: number;
  network: string;
  isConnected: boolean;
}

interface MobileWalletIntegrationProps {
  walletConnection: WalletConnection | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onNetworkSwitch: (network: string) => Promise<void>;
  supportedNetworks: string[];
  isConnecting: boolean;
}

/**
 * MobileWalletIntegration Component
 * 
 * Mobile-optimized wallet connection interface with biometric authentication support,
 * network switching, and touch-friendly transaction signing.
 */
export const MobileWalletIntegration: React.FC<MobileWalletIntegrationProps> = ({
  walletConnection,
  onConnect,
  onDisconnect,
  onNetworkSwitch,
  supportedNetworks,
  isConnecting
}) => {
  const { isMobile } = useResponsive();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check for biometric support
  useEffect(() => {
    const checkBiometricSupport = async () => {
      if ('credentials' in navigator && 'create' in navigator.credentials) {
        try {
          const available = await (navigator.credentials as any).get({
            publicKey: {
              challenge: new Uint8Array(32),
              rp: { name: 'LinkDAO' },
              user: {
                id: new Uint8Array(16),
                name: 'user',
                displayName: 'User'
              },
              pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
              timeout: 60000,
              userVerification: 'preferred'
            }
          });
          setBiometricSupported(true);
        } catch (error) {
          setBiometricSupported(false);
        }
      }
    };

    if (isMobile) {
      checkBiometricSupport();
    }
  }, [isMobile]);

  const handleConnect = useCallback(async () => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      await onConnect();
      setShowWalletModal(false);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  }, [onConnect]);

  const handleBiometricAuth = useCallback(async () => {
    if (!biometricSupported) return false;

    try {
      const credential = await (navigator.credentials as any).create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'LinkDAO' },
          user: {
            id: new Uint8Array(16),
            name: walletConnection?.address || 'user',
            displayName: 'Wallet User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
          userVerification: 'required'
        }
      });

      return !!credential;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }, [biometricSupported, walletConnection?.address]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <div className="mobile-wallet-integration">
      {/* Wallet Status Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
        {walletConnection?.isConnected ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatAddress(walletConnection.address)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatBalance(walletConnection.balance)} ETH • {walletConnection.network}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Wallet Not Connected
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect to participate in governance
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {walletConnection?.isConnected && (
            <button
              onClick={() => setShowNetworkModal(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Switch network"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          )}
          
          <button
            onClick={() => walletConnection?.isConnected ? onDisconnect() : setShowWalletModal(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              walletConnection?.isConnected
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-blue-600 text-white'
            }`}
          >
            {walletConnection?.isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Biometric Settings */}
      {walletConnection?.isConnected && biometricSupported && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Biometric Authentication
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Secure transactions with fingerprint/face ID
                </p>
              </div>
            </div>
            <button
              onClick={() => setBiometricEnabled(!biometricEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                biometricEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                biometricEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      )}

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleConnect}
        isConnecting={isConnecting}
        biometricSupported={biometricSupported}
        onBiometricAuth={handleBiometricAuth}
      />

      {/* Network Switch Modal */}
      <NetworkSwitchModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        currentNetwork={walletConnection?.network || ''}
        supportedNetworks={supportedNetworks}
        onNetworkSwitch={onNetworkSwitch}
      />
    </div>
  );
};

interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  isConnecting: boolean;
  biometricSupported: boolean;
  onBiometricAuth: () => Promise<boolean>;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting,
  biometricSupported,
  onBiometricAuth
}) => {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [useBiometric, setUseBiometric] = useState(false);

  const walletOptions = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊' },
    { id: 'walletconnect', name: 'WalletConnect', icon: '🔗' },
    { id: 'coinbase', name: 'Coinbase Wallet', icon: '🔵' },
    { id: 'trust', name: 'Trust Wallet', icon: '🛡️' }
  ];

  const handleWalletConnect = async () => {
    if (!selectedWallet) return;

    if (useBiometric && biometricSupported) {
      const biometricSuccess = await onBiometricAuth();
      if (!biometricSuccess) {
        return;
      }
    }

    onConnect();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring' as any, damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Connect Wallet
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose your preferred wallet to connect
              </p>
            </div>

            {/* Wallet Options */}
            <div className="p-4 space-y-3">
              {walletOptions.map((wallet) => (
                <motion.button
                  key={wallet.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedWallet(wallet.id)}
                  className={`w-full flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                    selectedWallet === wallet.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {wallet.name}
                  </span>
                  {selectedWallet === wallet.id && (
                    <svg className="w-5 h-5 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Biometric Option */}
            {biometricSupported && selectedWallet && (
              <div className="px-4 pb-4">
                <label className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <input
                    type="checkbox"
                    checked={useBiometric}
                    onChange={(e) => setUseBiometric(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Enable Biometric Authentication
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Use fingerprint or face ID for secure transactions
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Connect Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleWalletConnect}
                disabled={!selectedWallet || isConnecting}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface NetworkSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNetwork: string;
  supportedNetworks: string[];
  onNetworkSwitch: (network: string) => Promise<void>;
}

const NetworkSwitchModal: React.FC<NetworkSwitchModalProps> = ({
  isOpen,
  onClose,
  currentNetwork,
  supportedNetworks,
  onNetworkSwitch
}) => {
  const [switching, setSwitching] = useState(false);

  const handleNetworkSwitch = async (network: string) => {
    if (network === currentNetwork) {
      onClose();
      return;
    }

    setSwitching(true);
    try {
      await onNetworkSwitch(network);
      onClose();
    } catch (error) {
      console.error('Network switch failed:', error);
    } finally {
      setSwitching(false);
    }
  };

  const getNetworkIcon = (network: string) => {
    switch (network.toLowerCase()) {
      case 'ethereum': return '⟠';
      case 'polygon': return '⬟';
      case 'bsc': return '🟡';
      case 'arbitrum': return '🔵';
      default: return '🌐';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring' as any, damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[60vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Switch Network
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Current: {currentNetwork}
              </p>
            </div>

            {/* Network Options */}
            <div className="p-4 space-y-2">
              {supportedNetworks.map((network) => (
                <motion.button
                  key={network}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNetworkSwitch(network)}
                  disabled={switching}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    network === currentNetwork
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getNetworkIcon(network)}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {network}
                    </span>
                  </div>
                  
                  {network === currentNetwork && (
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Current
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileWalletIntegration;