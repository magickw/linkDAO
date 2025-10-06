import React, { useState, useEffect } from 'react';
import { MessageEncryptionService } from '../../services/messageEncryptionService';

interface KeyExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserAddress: string;
  otherUserAddress: string;
  onKeyExchangeComplete: () => void;
}

export const KeyExchangeModal: React.FC<KeyExchangeModalProps> = ({
  isOpen,
  onClose,
  currentUserAddress,
  otherUserAddress,
  onKeyExchangeComplete,
}) => {
  const [step, setStep] = useState<'generate' | 'exchange' | 'verify' | 'complete'>('generate');
  const [publicKey, setPublicKey] = useState<string>('');
  const [otherPublicKey, setOtherPublicKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const encryptionService = MessageEncryptionService.getInstance();

  useEffect(() => {
    if (isOpen) {
      initializeKeyExchange();
    }
  }, [isOpen]);

  const initializeKeyExchange = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Generate or get public key for current user
      const userPublicKey = await encryptionService.exportPublicKey(currentUserAddress);
      setPublicKey(userPublicKey);
      setStep('exchange');
    } catch (error) {
      setError('Failed to generate encryption keys');
      console.error('Key generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyExchange = async () => {
    if (!otherPublicKey.trim()) {
      setError('Please enter the other user\'s public key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Store the other user's public key
      await encryptionService.storePublicKey(otherUserAddress, otherPublicKey.trim());
      
      // Verify the key exchange worked
      const testMessage = 'Key exchange test';
      const encrypted = await encryptionService.encryptMessage(
        testMessage,
        otherPublicKey.trim(),
        currentUserAddress
      );
      
      setStep('verify');
    } catch (error) {
      setError('Invalid public key or encryption failed');
      console.error('Key exchange failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeKeyExchange = () => {
    setStep('complete');
    onKeyExchangeComplete();
    setTimeout(() => {
      onClose();
      resetModal();
    }, 2000);
  };

  const resetModal = () => {
    setStep('generate');
    setPublicKey('');
    setOtherPublicKey('');
    setError('');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Key Exchange
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            {['generate', 'exchange', 'verify', 'complete'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === stepName || (index < ['generate', 'exchange', 'verify', 'complete'].indexOf(step))
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  }
                `}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${index < ['generate', 'exchange', 'verify', 'complete'].indexOf(step)
                      ? 'bg-blue-600' 
                      : 'bg-gray-200 dark:bg-gray-600'
                    }
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-4">
          {step === 'generate' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isLoading ? (
                    <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  ) : (
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Generating Encryption Keys
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Creating secure encryption keys for your conversation with {truncateAddress(otherUserAddress)}
                </p>
              </div>
            </div>
          )}

          {step === 'exchange' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Exchange Public Keys
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Public Key (share this with {truncateAddress(otherUserAddress)})
                  </label>
                  <div className="flex space-x-2">
                    <textarea
                      value={publicKey}
                      readOnly
                      rows={4}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs"
                    />
                    <button
                      onClick={() => copyToClipboard(publicKey)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {truncateAddress(otherUserAddress)}'s Public Key
                  </label>
                  <textarea
                    value={otherPublicKey}
                    onChange={(e) => setOtherPublicKey(e.target.value)}
                    placeholder="Paste the other user's public key here..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={handleKeyExchange}
                  disabled={isLoading || !otherPublicKey.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying Keys...' : 'Exchange Keys'}
                </button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Keys Verified Successfully
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Encryption keys have been exchanged and verified. Your conversation is now secure.
                </p>
                
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">End-to-end encryption enabled</span>
                  </div>
                </div>

                <button
                  onClick={completeKeyExchange}
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Setup Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your secure conversation is ready. Messages will now be encrypted end-to-end.
              </p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Security Notice
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Keep your private keys secure. Never share them with anyone. 
                If you lose access to your keys, you won't be able to decrypt your messages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};