/**
 * Wallet Import Flow Component
 * Handles importing existing wallets from private key or mnemonic
 */

import React, { useState } from 'react';
import { Upload, Key, FileText, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { validateMnemonic, derivePrivateKeyFromMnemonic, deriveAddressFromPrivateKey, hasDuplicateWords } from '@/utils/bip39Utils';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { useToast } from '@/context/ToastContext';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { rateLimiter } from '@/services/rateLimiter';
import { isPasswordStrong } from '@/utils/passwordStrength';

type ImportMethod = 'mnemonic' | 'privateKey' | 'hardware';
type Step = 'method' | 'input' | 'password' | 'complete';

interface WalletImportFlowProps {
  onComplete?: (address: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const WalletImportFlow: React.FC<WalletImportFlowProps> = ({
  onComplete,
  onCancel,
  className = '',
}) => {
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>('method');
  const [importMethod, setImportMethod] = useState<ImportMethod>('mnemonic');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletName, setWalletName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const handleMethodSelect = (method: ImportMethod) => {
    setImportMethod(method);
    setStep('input');
  };

  const handleBack = () => {
    switch (step) {
      case 'input':
        setStep('method');
        break;
      case 'password':
        setStep('input');
        break;
      default:
        break;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'input':
        setStep('password');
        break;
      case 'password':
        handleComplete();
        break;
      default:
        break;
    }
  };

  const handleComplete = async () => {
    // Check rate limit
    const rateCheck = rateLimiter.isAllowed('wallet_import', 'password');
    if (!rateCheck.allowed) {
      const timeUntilUnblock = rateLimiter.getTimeUntilUnblocked('wallet_import', 'password');
      const minutes = Math.ceil((timeUntilUnblock || 0) / 60000);
      addToast(`Too many attempts. Please wait ${minutes} minutes.`, 'error');
      return;
    }

    if (!password || password !== confirmPassword) {
      rateLimiter.recordAttempt('wallet_import', 'password', false);
      addToast('Passwords do not match', 'error');
      return;
    }

    if (!isPasswordStrong(password)) {
      rateLimiter.recordAttempt('wallet_import', 'password', false);
      addToast('Password is not strong enough', 'error');
      return;
    }

    // Success - record attempt but don't block
    rateLimiter.recordAttempt('wallet_import', 'password', true);

    if (password.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsImporting(true);

    try {
      let privateKeyToUse = privateKey;
      let address = '';

      if (importMethod === 'mnemonic') {
        // Derive private key from mnemonic using proper BIP-39
        privateKeyToUse = derivePrivateKeyFromMnemonic(mnemonic, "m/44'/60'/0'/0/0", 0);
        address = deriveAddressFromPrivateKey(privateKeyToUse);
      } else if (importMethod === 'privateKey') {
        address = deriveAddressFromPrivateKey(privateKeyToUse);
      } else {
        throw new Error('Hardware wallet import not yet implemented');
      }

      // Store wallet securely
      await SecureKeyStorage.storeWallet(address, privateKeyToUse, password, {
        name: walletName || 'Imported Wallet',
        isHardwareWallet: importMethod === 'hardware',
        chainIds: [1, 8453, 137, 42161],
      });

      setWalletAddress(address);
      setStep('complete');

      if (onComplete) {
        onComplete(address);
      }

      addToast('Wallet imported successfully!', 'success');
    } catch (error: any) {
      addToast(`Failed to import wallet: ${error.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'method':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Import Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose how you want to import your wallet
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleMethodSelect('mnemonic')}
                className="w-full p-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Recovery Phrase
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Import using 12 or 24 word mnemonic
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleMethodSelect('privateKey')}
                className="w-full p-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <Key className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Private Key
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Import using private key string
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleMethodSelect('hardware')}
                className="w-full p-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <Upload className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Hardware Wallet
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Connect Ledger or Trezor (Coming Soon)
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );

      case 'input':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {importMethod === 'mnemonic'
                  ? 'Enter Recovery Phrase'
                  : 'Enter Private Key'}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {importMethod === 'mnemonic'
                  ? 'Enter your 12 or 24 word recovery phrase in order'
                  : 'Enter your private key (64 hexadecimal characters)'}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Security Warning
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Never share your {importMethod === 'mnemonic' ? 'recovery phrase' : 'private key'} with anyone.
                    LinkDAO support will never ask for it.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              {importMethod === 'mnemonic' ? (
                <textarea
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="word1 word2 word3 ..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white font-mono text-sm"
                />
              ) : (
                <input
                  type={showInput ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white font-mono text-sm"
                />
              )}

              {importMethod === 'privateKey' && (
                <button
                  onClick={() => setShowInput(!showInput)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showInput ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            {importMethod === 'mnemonic' && mnemonic && !validateMnemonic(mnemonic) && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {hasDuplicateWords(mnemonic)
                  ? 'Invalid recovery phrase: Contains duplicate words. Each word should be unique.'
                  : 'Invalid recovery phrase. Must be 12 or 24 valid BIP-39 words.'}
              </p>
            )}

            {importMethod === 'privateKey' && privateKey && !/^0x[a-fA-F0-9]{64}$/.test(privateKey) && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Invalid private key. Must be 64 hexadecimal characters.
              </p>
            )}
          </div>
        );

      case 'password':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Set Wallet Password
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Create a password to encrypt your wallet
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wallet Name (Optional)
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="My Wallet"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <PasswordStrengthIndicator password={password} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Wallet Imported!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your wallet is ready to use
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Wallet Address:
              </p>
              <p className="font-mono text-sm text-gray-900 dark:text-white break-all">
                {walletAddress}
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Remember Your Password
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    You'll need this password to access your wallet. If you forget it,
                    you'll need to restore from your recovery phrase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'input':
        if (importMethod === 'mnemonic') {
          return validateMnemonic(mnemonic);
        } else if (importMethod === 'privateKey') {
          return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
        }
        return false;
      case 'password':
        const { isPasswordStrong } = require('@/utils/passwordStrength');
        return (
          password.length >= 8 &&
          password === confirmPassword &&
          isPasswordStrong(password)
        );
      default:
        return true;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={step !== 'method' ? handleBack : onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            {['method', 'input', 'password', 'complete'].map((s, index) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${step === s
                  ? 'bg-blue-500'
                  : ['method', 'input', 'password', 'complete'].indexOf(step) > index
                    ? 'bg-blue-200 dark:bg-blue-800'
                    : 'bg-gray-200 dark:bg-gray-700'
                  }`}
              />
            ))}
          </div>
          <div className="w-8" /> {/* Spacer for balance */}
        </div>

        {/* Content */}
        {renderStep()}

        {/* Footer */}
        {step !== 'complete' && (
          <div className="mt-8 flex space-x-3">
            {step === 'method' && (
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            )}
            {step !== 'method' && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || isImporting}
              className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isImporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : step === 'complete' ? (
                'Done'
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};