/**
 * Wallet Creation Flow Component
 * Handles creating new wallets with secure key generation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Eye, EyeOff, Copy, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Fingerprint } from 'lucide-react';
import { generateMnemonic, validateMnemonic, derivePrivateKeyFromMnemonic, deriveAddressFromPrivateKey, hasDuplicateWords } from '@/utils/bip39Utils';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { useToast } from '@/context/ToastContext';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { rateLimiter } from '@/services/rateLimiter';
import { isPasswordStrong } from '@/utils/passwordStrength';
import { webAuthnService } from '@/services/webAuthnService';

type Step = 'intro' | 'create' | 'backup' | 'password' | 'complete';

interface WalletCreationFlowProps {
  onComplete?: (address: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const WalletCreationFlow: React.FC<WalletCreationFlowProps> = ({
  onComplete,
  onCancel,
  className = '',
}) => {
  const { addToast } = useToast();
  const [step, setStep] = useState<Step>('intro');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [walletName, setWalletName] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifiedCount, setVerifiedCount] = useState(0); // Track how many words verified in order
  const [walletAddress, setWalletAddress] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [shuffledMnemonic, setShuffledMnemonic] = useState<string[]>([]);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array: string[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Ref to track clipboard clear timeout
  const clipboardClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Security: Clear sensitive data on component unmount
  useEffect(() => {
    return () => {
      // Clear mnemonic from state
      setMnemonic('');
      setPassword('');
      setConfirmPassword('');

      // Clear any pending clipboard timeout
      if (clipboardClearTimeoutRef.current) {
        clearTimeout(clipboardClearTimeoutRef.current);
      }

      // Attempt to clear clipboard if we copied mnemonic
      try {
        navigator.clipboard.writeText('').catch(() => {
          // Ignore clipboard clear errors on unmount
        });
      } catch {
        // Ignore if clipboard API not available
      }
    };
  }, []);

  // Check if biometric authentication is supported
  useEffect(() => {
    const checkBiometricSupport = async () => {
      const supported = await webAuthnService.isPlatformAuthenticatorAvailable();
      setIsBiometricSupported(supported);
    };
    checkBiometricSupport();
  }, []);

  // Security: Clear clipboard after timeout
  const clearClipboardAfterDelay = useCallback(() => {
    // Clear any existing timeout
    if (clipboardClearTimeoutRef.current) {
      clearTimeout(clipboardClearTimeoutRef.current);
    }

    // Set new timeout to clear clipboard after 60 seconds
    clipboardClearTimeoutRef.current = setTimeout(async () => {
      try {
        // Only clear if clipboard still contains sensitive data
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText === mnemonic && mnemonic) {
          await navigator.clipboard.writeText('');
          addToast('Clipboard cleared for security', 'info');
        }
      } catch {
        // Clipboard read may fail due to permissions - just clear anyway
        try {
          await navigator.clipboard.writeText('');
        } catch {
          // Ignore errors
        }
      }
      clipboardClearTimeoutRef.current = null;
    }, 60000); // 60 seconds
  }, [mnemonic, addToast]);

  const handleCreateNew = () => {
    const newMnemonic = generateMnemonic();
    setMnemonic(newMnemonic);
    setShuffledMnemonic(shuffleArray(newMnemonic.split(' ')));
    setStep('create');
  };

  const handleBack = () => {
    switch (step) {
      case 'create':
        setStep('intro');
        break;
      case 'backup':
        setStep('create');
        break;
      case 'password':
        setStep('backup');
        break;
      default:
        break;
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'intro':
        handleCreateNew();
        break;
      case 'create':
        setStep('backup');
        break;
      case 'backup':
        setStep('password');
        break;
      case 'password':
        handleComplete();
        break;
      default:
        break;
    }
  };

  const handleCopyMnemonic = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('Mnemonic copied - clipboard will clear in 60 seconds', 'success');

      // Security: Start clipboard clear countdown
      clearClipboardAfterDelay();
    } catch (error) {
      addToast('Failed to copy mnemonic', 'error');
    }
  };

  const handleWordClick = (word: string) => {
    const originalWords = mnemonic.split(' ');
    const correctWord = originalWords[verifiedCount];

    if (word === correctWord) {
      setVerifiedCount(prev => prev + 1);
      if (verifiedCount + 1 === 12) {
        addToast('Backup verified successfully!', 'success');
      }
    } else {
      addToast('Incorrect word order. Please try again.', 'error');
      // Optional: Reset progress on error? 
      // For now, just error message allows them to retry the next word without full reset.
      // But purely strictly, we could reset: setVerifiedCount(0);
      setVerifiedCount(0); // STRICT: Reset on error to force them to know the full sequence
    }
  };

  const handleComplete = async () => {
    // Check rate limit
    const rateCheck = rateLimiter.isAllowed('wallet_creation', 'password');
    if (!rateCheck.allowed) {
      const timeUntilUnblock = rateLimiter.getTimeUntilUnblocked('wallet_creation', 'password');
      const minutes = Math.ceil((timeUntilUnblock || 0) / 60000);
      addToast(`Too many attempts. Please wait ${minutes} minutes.`, 'error');
      return;
    }

    if (!password || password !== confirmPassword) {
      rateLimiter.recordAttempt('wallet_creation', 'password', false);
      addToast('Passwords do not match', 'error');
      return;
    }

    if (!isPasswordStrong(password)) {
      rateLimiter.recordAttempt('wallet_creation', 'password', false);
      addToast('Password is not strong enough', 'error');
      return;
    }

    // Success - record attempt but don't block
    rateLimiter.recordAttempt('wallet_creation', 'password', true);

    if (password.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }

    setIsCreating(true);

    try {
      // Derive private key from mnemonic using proper BIP-39
      const privateKey = derivePrivateKeyFromMnemonic(mnemonic, "m/44'/60'/0'/0/0", 0);
      const address = deriveAddressFromPrivateKey(privateKey);

      // Store wallet securely with mnemonic for backup/recovery
      await SecureKeyStorage.storeWallet(address, privateKey, password, {
        name: walletName || 'My Wallet',
        isHardwareWallet: false,
        chainIds: [1, 8453, 137, 42161], // Ethereum, Base, Polygon, Arbitrum
      }, mnemonic);

      // Register biometric credentials if enabled
      if (enableBiometric && isBiometricSupported) {
        try {
          const result = await webAuthnService.registerCredential({
            username: address,
            displayName: walletName || 'My Wallet',
            userId: address
          });

          if (result.success) {
            addToast('Biometric authentication enabled successfully', 'success');
          } else {
            addToast(`Biometric registration failed: ${result.error}`, 'warning');
          }
        } catch (error: any) {
          console.error('Biometric registration error:', error);
          addToast('Failed to enable biometric authentication', 'warning');
        }
      }

      setWalletAddress(address);
      setStep('complete');

      if (onComplete) {
        onComplete(address);
      }

      addToast('Wallet created successfully!', 'success');
    } catch (error: any) {
      addToast(`Failed to create wallet: ${error.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Plus className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Create New Wallet
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Generate a new wallet with a secure mnemonic phrase
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Secure Key Generation
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Uses cryptographic random number generation
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Encrypted Storage
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Private keys encrypted with AES-256
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Multi-Chain Support
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Works across Ethereum, Base, Polygon, and Arbitrum
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'create':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Your Recovery Phrase
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Write down these 12 words in order. Never share them with anyone.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Important Security Warning
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This is the ONLY way to recover your wallet. If you lose this phrase,
                    you will lose access to your funds permanently.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div
                className={`p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 ${showMnemonic
                  ? 'border-gray-200 dark:border-gray-600'
                  : 'border-gray-200 dark:border-gray-600 blur-sm select-none'
                  }`}
              >
                <div className="grid grid-cols-3 gap-3">
                  {mnemonic.split(' ').map((word, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg"
                    >
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-4">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {word}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowMnemonic(!showMnemonic)}
                className={`absolute inset-0 flex items-center justify-center rounded-xl transition-all duration-300 ${showMnemonic
                    ? 'bg-transparent'
                    : 'bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm'
                  }`}
              >
                {showMnemonic ? (
                  <Eye className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                ) : (
                  <EyeOff className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>

            <button
              onClick={handleCopyMnemonic}
              className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center space-x-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Recovery Phrase</span>
                </>
              )}
            </button>
          </div>
        );

      case 'backup':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Backup Complete
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Verify you've backed up your recovery phrase
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Select the words in the correct order to verify your backup:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {shuffledMnemonic.map((word, index) => {
                  const originalWords = mnemonic.split(' ');
                  const isVerified = originalWords.indexOf(word) < verifiedCount;

                  // Disable if already verified to prevent double clicking
                  // Hide if already verified? Or just style it? Stying is better UX.

                  return (
                    <button
                      key={`${word}-${index}`}
                      onClick={() => !isVerified && handleWordClick(word)}
                      disabled={isVerified}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${isVerified
                          ? 'bg-green-500 text-white opacity-50 cursor-not-allowed'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 transform'
                        }`}
                    >
                      {word}
                      {isVerified && <CheckCircle className="inline-block w-3 h-3 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {verifiedCount} / 12 words verified
              </p>
            </div>
          </div>
        );

      case 'password':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Wallet Created!
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
      case 'create':
        return true;
      case 'backup':
        return verifiedCount === 12;
      case 'password':
        const { isPasswordStrong } = require('@/utils/passwordStrength');
        return (
          password.length >= 8 &&
          password === confirmPassword &&
          isPasswordStrong(password)
        );
      case 'verify':
        return true;
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
            onClick={step !== 'intro' ? handleBack : onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            {['intro', 'create', 'backup', 'password', 'complete'].map(
              (s, index) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full ${step === s
                    ? 'bg-blue-500'
                    : ['intro', 'create', 'backup', 'password', 'complete'].indexOf(step) > index
                      ? 'bg-blue-200 dark:bg-blue-800'
                      : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                />
              )
            )}
          </div>
          <div className="w-8" /> {/* Spacer for balance */}
        </div>

        {/* Content */}
        {renderStep()}

        {/* Footer */}
        {step !== 'complete' && (
          <div className="mt-8 flex space-x-3">
            {step === 'intro' && (
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            )}
            {step !== 'intro' && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || isCreating}
              className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>{step === 'intro' ? 'Create Wallet' : 'Continue'}</span>
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