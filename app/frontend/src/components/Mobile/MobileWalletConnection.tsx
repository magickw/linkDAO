import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WalletIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  QrCodeIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  isInstalled: boolean;
  isMobileOptimized: boolean;
  deepLink?: string;
  downloadUrl?: string;
}

interface MobileWalletConnectionProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletId: string) => Promise<void>;
  isConnecting?: boolean;
  error?: string;
  className?: string;
}

export const MobileWalletConnection: React.FC<MobileWalletConnectionProps> = ({
  isOpen,
  onClose,
  onConnect,
  isConnecting = false,
  error,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses, safeAreaInsets } = useMobileOptimization();
  const { announceToScreenReader, accessibilityClasses } = useMobileAccessibility();
  
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '/icons/metamask.svg',
      description: 'Connect using MetaMask mobile app',
      isInstalled: typeof window !== 'undefined' && !!window.ethereum,
      isMobileOptimized: true,
      deepLink: 'https://metamask.app.link/dapp/',
      downloadUrl: 'https://metamask.io/download/'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '/icons/walletconnect.svg',
      description: 'Scan QR code with your wallet',
      isInstalled: true,
      isMobileOptimized: true
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '/icons/coinbase.svg',
      description: 'Connect using Coinbase Wallet app',
      isInstalled: false,
      isMobileOptimized: true,
      deepLink: 'https://go.cb-w.com/dapp',
      downloadUrl: 'https://wallet.coinbase.com/'
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '/icons/trust.svg',
      description: 'Connect using Trust Wallet app',
      isInstalled: false,
      isMobileOptimized: true,
      downloadUrl: 'https://trustwallet.com/download'
    }
  ];

  const handleWalletSelect = async (wallet: WalletOption) => {
    triggerHapticFeedback('medium');
    setSelectedWallet(wallet.id);
    
    if (wallet.id === 'walletconnect') {
      setShowQRCode(true);
      announceToScreenReader('QR code displayed for wallet connection');
    } else if (!wallet.isInstalled && wallet.downloadUrl) {
      // Redirect to download
      window.open(wallet.downloadUrl, '_blank');
      announceToScreenReader(`Redirecting to download ${wallet.name}`);
    } else if (wallet.deepLink) {
      // Try deep link first
      const currentUrl = window.location.href;
      const deepLinkUrl = `${wallet.deepLink}${encodeURIComponent(currentUrl)}`;
      window.location.href = deepLinkUrl;
      
      // Fallback to direct connection after a delay
      setTimeout(() => {
        onConnect(wallet.id);
      }, 1000);
    } else {
      await onConnect(wallet.id);
    }
  };

  const handleClose = () => {
    triggerHapticFeedback('light');
    setSelectedWallet(null);
    setShowQRCode(false);
    onClose();
  };

  useEffect(() => {
    if (error) {
      triggerHapticFeedback('error');
      announceToScreenReader(`Connection error: ${error}`);
    }
  }, [error, triggerHapticFeedback, announceToScreenReader]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className={`
              fixed bottom-0 left-0 right-0 z-50
              bg-white dark:bg-gray-900 rounded-t-3xl
              shadow-2xl overflow-hidden
              ${className}
              ${accessibilityClasses}
            `}
            style={{
              paddingBottom: `${safeAreaInsets.bottom}px`
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring' as any, stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Connect Wallet
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Choose your preferred wallet to connect
                </p>
              </div>
              
              <button
                onClick={handleClose}
                className={`
                  ${touchTargetClasses}
                  p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  rounded-full
                `}
                aria-label="Close wallet connection modal"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Error Message */}
              {error && (
                <motion.div
                  className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center space-x-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* QR Code View */}
              {showQRCode ? (
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="mb-4">
                    <QrCodeIcon className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Scan QR Code
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Open your wallet app and scan the QR code to connect
                    </p>
                  </div>

                  {/* QR Code Placeholder */}
                  <div className="w-48 h-48 mx-auto bg-white border-2 border-gray-200 rounded-xl flex items-center justify-center mb-4">
                    <div className="w-40 h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                      <QrCodeIcon className="w-20 h-20 text-gray-400" />
                    </div>
                  </div>

                  <button
                    onClick={() => setShowQRCode(false)}
                    className={`
                      ${touchTargetClasses}
                      text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300
                      transition-colors duration-200
                    `}
                  >
                    ← Back to wallet options
                  </button>
                </motion.div>
              ) : (
                /* Wallet Options */
                <div className="space-y-3">
                  {walletOptions.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      onClick={() => handleWalletSelect(wallet)}
                      disabled={isConnecting && selectedWallet === wallet.id}
                      className={`
                        w-full ${touchTargetClasses}
                        flex items-center space-x-4 p-4 rounded-xl border-2
                        ${selectedWallet === wallet.id && isConnecting
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                        ${!wallet.isInstalled ? 'opacity-75' : ''}
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        disabled:cursor-not-allowed
                      `}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Wallet Icon */}
                      <div className="relative">
                        <img
                          src={wallet.icon}
                          alt={wallet.name}
                          className="w-12 h-12 rounded-xl"
                        />
                        {wallet.isMobileOptimized && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center">
                            <DevicePhoneMobileIcon className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Wallet Info */}
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {wallet.name}
                          </h3>
                          {wallet.isInstalled && (
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {wallet.description}
                        </p>
                        {!wallet.isInstalled && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Tap to install
                          </p>
                        )}
                      </div>

                      {/* Loading Indicator */}
                      {isConnecting && selectedWallet === wallet.id && (
                        <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Help Text */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  New to Web3?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  A wallet is required to interact with Web3 features like staking, governance, and tipping. 
                  It's free to create and keeps your digital assets secure.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileWalletConnection;