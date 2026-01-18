/**
 * Non-Custodial Wallet Login Component
 * Allows users to login using their locally stored non-custodial wallet
 */

import React, { useState, useEffect } from 'react';
import { Wallet, Lock, Fingerprint, Plus, AlertCircle, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { enhancedAuthService } from '@/services/enhancedAuthService';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { webAuthnService } from '@/services/webAuthnService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { WalletUnlockFlow } from '@/components/Wallet/WalletUnlockFlow';
import { WalletCreationFlow } from '@/components/Wallet/WalletCreationFlow';
import { WalletImportFlow } from '@/components/Wallet/WalletImportFlow';

type LoginStep = 'select-wallet' | 'unlock-wallet' | 'create-wallet' | 'import-wallet' | 'authenticating';

interface NonCustodialWalletLoginProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const NonCustodialWalletLogin: React.FC<NonCustodialWalletLoginProps> = ({
  onSuccess,
  onCancel,
  className = '',
}) => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [step, setStep] = useState<LoginStep>('select-wallet');
  const [wallets, setWallets] = useState<Array<{ address: string; name: string }>>([]);
  const [selectedWallet, setSelectedWallet] = useState<{ address: string; name: string } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string>('');

  // Load available wallets on mount
  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const walletList = await SecureKeyStorage.listWallets();
      setWallets(walletList.map(w => ({
        address: w.address,
        name: w.name || 'My Wallet'
      })));
    } catch (err: any) {
      console.error('Failed to load wallets:', err);
      addToast('Failed to load wallets', 'error');
    }
  };

  const handleWalletSelect = (wallet: { address: string; name: string }) => {
    setSelectedWallet(wallet);
    setStep('unlock-wallet');
  };

  const handleWalletUnlock = async (privateKey: string) => {
    if (!selectedWallet) {
      setError('No wallet selected');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    try {
      // Authenticate with backend using non-custodial wallet
      const result = await enhancedAuthService.authenticateWithNonCustodialWallet(
        selectedWallet.address,
        privateKey
      );

      if (result.success && result.token && result.user) {
        // Update auth context
        await login(result.token, result.user);

        addToast('Successfully logged in with non-custodial wallet', 'success');

        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.error || 'Authentication failed');
        addToast(result.error || 'Authentication failed', 'error');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Authentication failed';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleWalletCreated = async (address: string) => {
    // Reload wallet list
    await loadWallets();
    
    // Automatically authenticate with the newly created wallet
    setSelectedWallet({ address, name: 'New Wallet' });
    setStep('unlock-wallet');
  };

  const handleWalletImported = async (address: string) => {
    // Reload wallet list
    await loadWallets();
    
    // Automatically authenticate with the imported wallet
    setSelectedWallet({ address, name: 'Imported Wallet' });
    setStep('unlock-wallet');
  };

  const handleBack = () => {
    switch (step) {
      case 'unlock-wallet':
        setStep('select-wallet');
        setSelectedWallet(null);
        break;
      case 'create-wallet':
      case 'import-wallet':
        setStep('select-wallet');
        break;
      default:
        break;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'select-wallet':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Login with Non-Custodial Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select your wallet or create a new one
              </p>
            </div>

            {wallets.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Wallets
                </p>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.address}
                    onClick={() => handleWalletSelect(wallet)}
                    className="w-full p-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {wallet.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No wallets found. Create or import one to get started.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setStep('create-wallet')}
                className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
              >
                <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Create New
                </span>
              </button>
              <button
                onClick={() => setStep('import-wallet')}
                className="flex flex-col items-center p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
              >
                <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Import
                </span>
              </button>
            </div>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        );

      case 'unlock-wallet':
        return (
          <div className="space-y-4">
            {selectedWallet && (
              <WalletUnlockFlow
                walletAddress={selectedWallet.address}
                walletName={selectedWallet.name}
                onUnlock={handleWalletUnlock}
                onCancel={handleBack}
              />
            )}
          </div>
        );

      case 'create-wallet':
        return (
          <WalletCreationFlow
            onComplete={handleWalletCreated}
            onCancel={handleBack}
          />
        );

      case 'import-wallet':
        return (
          <WalletImportFlow
            onComplete={handleWalletImported}
            onCancel={handleBack}
          />
        );

      case 'authenticating':
        return (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="animate-spin w-8 h-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authenticating...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we verify your wallet
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        {renderStep()}
      </div>
    </div>
  );
};