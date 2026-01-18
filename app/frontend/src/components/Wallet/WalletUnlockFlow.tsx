/**
 * Wallet Unlock Flow Component
 * Handles unlocking existing wallets with password or biometric authentication
 */

import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint, Key, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { useToast } from '@/context/ToastContext';
import { webAuthnService } from '@/services/webAuthnService';
import { rateLimiter } from '@/services/rateLimiter';

type UnlockMethod = 'password' | 'biometric';

interface WalletUnlockFlowProps {
  walletAddress: string;
  walletName?: string;
  onUnlock?: (privateKey: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const WalletUnlockFlow: React.FC<WalletUnlockFlowProps> = ({
  walletAddress,
  walletName = 'My Wallet',
  onUnlock,
  onCancel,
  className = '',
}) => {
  const { addToast } = useToast();
  const [unlockMethod, setUnlockMethod] = useState<UnlockMethod>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasBiometricCredential, setHasBiometricCredential] = useState(false);
  const [error, setError] = useState<string>('');

  // Check if biometric authentication is supported and if wallet has biometric credential
  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const supported = await webAuthnService.isPlatformAuthenticatorAvailable();
        setIsBiometricSupported(supported);

        if (supported) {
          // Check if this wallet has a biometric credential
          const hasCredential = await webAuthnService.hasCredential(walletAddress);
          setHasBiometricCredential(hasCredential);
        }
      } catch (err) {
        console.error('Error checking biometric support:', err);
        setIsBiometricSupported(false);
      }
    };
    checkBiometricSupport();
  }, [walletAddress]);

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnlocking(true);

    try {
      // Check rate limit
      const rateCheck = rateLimiter.isAllowed('wallet_unlock', 'password');
      if (!rateCheck.allowed) {
        const timeUntilUnblock = rateLimiter.getTimeUntilUnblocked('wallet_unlock', 'password');
        const minutes = Math.ceil((timeUntilUnblock || 0) / 60000);
        throw new Error(`Too many failed attempts. Please wait ${minutes} minutes.`);
      }

      if (!password) {
        throw new Error('Please enter your password');
      }

      // Attempt to retrieve and decrypt wallet
      const privateKey = await SecureKeyStorage.getPrivateKey(walletAddress, password);

      if (!privateKey) {
        rateLimiter.recordAttempt('wallet_unlock', 'password', false);
        throw new Error('Invalid password. Please try again.');
      }

      // Success - record attempt
      rateLimiter.recordAttempt('wallet_unlock', 'password', true);

      addToast('Wallet unlocked successfully', 'success');

      if (onUnlock) {
        onUnlock(privateKey);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unlock wallet');
      addToast(err.message || 'Failed to unlock wallet', 'error');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleBiometricUnlock = async () => {
    setError('');
    setIsUnlocking(true);

    try {
      // Check rate limit
      const rateCheck = rateLimiter.isAllowed('wallet_unlock', 'biometric');
      if (!rateCheck.allowed) {
        const timeUntilUnblock = rateLimiter.getTimeUntilUnblocked('wallet_unlock', 'biometric');
        const minutes = Math.ceil((timeUntilUnblock || 0) / 60000);
        throw new Error(`Too many failed attempts. Please wait ${minutes} minutes.`);
      }

      // Attempt biometric unlock
      const result = await webAuthnService.biometricUnlock(walletAddress);

      if (!result.success || !result.privateKey) {
        rateLimiter.recordAttempt('wallet_unlock', 'biometric', false);
        throw new Error(result.error || 'Biometric authentication failed');
      }

      // Success - record attempt
      rateLimiter.recordAttempt('wallet_unlock', 'biometric', true);

      addToast('Wallet unlocked with biometrics', 'success');

      if (onUnlock) {
        onUnlock(result.privateKey);
      }
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed');
      addToast(err.message || 'Biometric authentication failed', 'error');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unlock Wallet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {walletName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        </div>

        {/* Unlock Method Selection */}
        {isBiometricSupported && hasBiometricCredential && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setUnlockMethod('password')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                unlockMethod === 'password'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Key className="w-4 h-4 inline-block mr-2" />
              Password
            </button>
            <button
              onClick={() => setUnlockMethod('biometric')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                unlockMethod === 'biometric'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Fingerprint className="w-4 h-4 inline-block mr-2" />
              Biometric
            </button>
          </div>
        )}

        {/* Password Unlock Form */}
        {unlockMethod === 'password' && (
          <form onSubmit={handlePasswordUnlock} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white"
                  placeholder="Enter your password"
                  disabled={isUnlocking}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  disabled={isUnlocking}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isUnlocking}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isUnlocking ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Unlocking...
                </span>
              ) : (
                'Unlock Wallet'
              )}
            </button>
          </form>
        )}

        {/* Biometric Unlock */}
        {unlockMethod === 'biometric' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <button
                onClick={handleBiometricUnlock}
                disabled={isUnlocking}
                className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Fingerprint className="w-12 h-12 text-white" />
              </button>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Tap to authenticate with biometrics
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Use your fingerprint or face to unlock your wallet
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleBiometricUnlock}
              disabled={isUnlocking}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isUnlocking ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </span>
              ) : (
                'Authenticate with Biometrics'
              )}
            </button>
          </div>
        )}

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isUnlocking}
            className="w-full mt-4 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};