/**
 * Hardware Wallet Connect Component
 * Provides UI for connecting and using Ledger and Trezor hardware wallets
 */

import React, { useState, useEffect } from 'react';
import { Usb, Shield, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react';
import { realHardwareWalletService } from '@/services/hardwareWalletService.real';
import { useToast } from '@/context/ToastContext';

interface HardwareWalletConnectProps {
  onConnect?: (walletInfo: any) => void;
  onDisconnect?: () => void;
  className?: string;
}

type WalletType = 'ledger' | 'trezor';
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export const HardwareWalletConnect: React.FC<HardwareWalletConnectProps> = ({
  onConnect,
  onDisconnect,
  className = ''
}) => {
  const { addToast } = useToast();
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [derivationPath, setDerivationPath] = useState("m/44'/60'/0'/0/0");
  const [chainId, setChainId] = useState(1);

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = async () => {
      if (selectedWallet === 'ledger') {
        const isConnected = await realHardwareWalletService.isLedgerConnected();
        if (!isConnected && connectionStatus === 'connected') {
          setConnectionStatus('idle');
          setWalletInfo(null);
          onDisconnect?.();
        }
      } else if (selectedWallet === 'trezor') {
        const isConnected = await realHardwareWalletService.isTrezorConnected();
        if (!isConnected && connectionStatus === 'connected') {
          setConnectionStatus('idle');
          setWalletInfo(null);
          onDisconnect?.();
        }
      }
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [selectedWallet, connectionStatus, onDisconnect]);

  const handleConnect = async (walletType: WalletType) => {
    setSelectedWallet(walletType);
    setConnectionStatus('connecting');
    setError(null);

    try {
      let info;
      if (walletType === 'ledger') {
        info = await realHardwareWalletService.connectLedger(derivationPath, chainId);
      } else {
        info = await realHardwareWalletService.connectTrezor(derivationPath, chainId);
      }

      if (info) {
        setWalletInfo(info);
        setConnectionStatus('connected');
        addToast(`${walletType === 'ledger' ? 'Ledger' : 'Trezor'} connected successfully`, 'success');
        onConnect?.(info);
      } else {
        throw new Error('Failed to connect to hardware wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setConnectionStatus('error');
      addToast(`Failed to connect to ${walletType === 'ledger' ? 'Ledger' : 'Trezor'}: ${err.message}`, 'error');
    }
  };

  const handleDisconnect = async () => {
    if (selectedWallet === 'ledger') {
      await realHardwareWalletService.disconnectLedger();
    }
    
    setConnectionStatus('idle');
    setWalletInfo(null);
    setSelectedWallet(null);
    setError(null);
    onDisconnect?.();
    addToast('Hardware wallet disconnected', 'info');
  };

  const getDeviceIcon = () => {
    if (selectedWallet === 'ledger') {
      return <Usb className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
    }
    return <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Hardware Wallet
        </h3>
        {connectionStatus === 'connected' && (
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
      </div>

      {connectionStatus === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect your Ledger or Trezor hardware wallet for enhanced security
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleConnect('ledger')}
              className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
            >
              <Usb className="w-8 h-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ledger</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Nano X/S</span>
            </button>

            <button
              onClick={() => handleConnect('trezor')}
              className="flex flex-col items-center p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 transition-colors group"
            >
              <Shield className="w-8 h-8 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 mb-2" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trezor</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Model T/One</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Derivation Path
            </label>
            <input
              type="text"
              value={derivationPath}
              onChange={(e) => setDerivationPath(e.target.value)}
              placeholder="m/44'/60'/0'/0/0"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Chain ID
            </label>
            <select
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value={1}>Ethereum Mainnet (1)</option>
              <option value={5}>Goerli Testnet (5)</option>
              <option value={11155111}>Sepolia Testnet (11155111)</option>
              <option value={137}>Polygon (137)</option>
              <option value={42161}>Arbitrum (42161)</option>
              <option value={8453}>Base (8453)</option>
            </select>
          </div>
        </div>
      )}

      {connectionStatus === 'connecting' && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connecting to {selectedWallet === 'ledger' ? 'Ledger' : 'Trezor'}...
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Please confirm on your device
          </p>
        </div>
      )}

      {connectionStatus === 'connected' && walletInfo && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            {getDeviceIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedWallet === 'ledger' ? 'Ledger' : 'Trezor'} Connected
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {walletInfo.address.substring(0, 6)}...{walletInfo.address.substring(38)}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Type:</span>
              <span className="text-gray-900 dark:text-white font-medium capitalize">
                {walletInfo.type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Chain ID:</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {walletInfo.chainId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Path:</span>
              <span className="text-gray-900 dark:text-white font-medium text-xs">
                {walletInfo.path}
              </span>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Secure Signing
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  All transactions must be confirmed on your hardware wallet. Your private keys never leave the device.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {connectionStatus === 'error' && error && (
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Connection Failed
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {error}
              </p>
            </div>
          </div>

          <button
            onClick={() => setConnectionStatus('idle')}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Try Again
          </button>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p className="font-medium mb-2">Troubleshooting tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ensure your device is unlocked</li>
              <li>Open the Ethereum app on your device</li>
              <li>Check USB connection</li>
              <li>Try a different USB port</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};