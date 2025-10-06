import React, { useState, useEffect } from 'react';
import { MessageEncryptionService } from '../../services/messageEncryptionService';

interface EncryptionIndicatorProps {
  conversationId: string;
  participants: string[];
  currentUserAddress: string;
  className?: string;
}

export const EncryptionIndicator: React.FC<EncryptionIndicatorProps> = ({
  conversationId,
  participants,
  currentUserAddress,
  className = '',
}) => {
  const [encryptionStatus, setEncryptionStatus] = useState<{
    isEncrypted: boolean;
    missingKeys: string[];
    readyForEncryption: boolean;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const encryptionService = MessageEncryptionService.getInstance();

  useEffect(() => {
    checkEncryptionStatus();
  }, [conversationId, participants]);

  const checkEncryptionStatus = async () => {
    try {
      const status = await encryptionService.getConversationEncryptionStatus(
        conversationId,
        participants
      );
      setEncryptionStatus(status);
    } catch (error) {
      console.error('Failed to check encryption status:', error);
    }
  };

  const initializeEncryption = async () => {
    setIsInitializing(true);
    try {
      const success = await encryptionService.initializeConversationEncryption(
        conversationId,
        participants,
        currentUserAddress
      );
      
      if (success) {
        await checkEncryptionStatus();
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const exchangeKeys = async (otherUserAddress: string) => {
    try {
      const result = await encryptionService.exchangeKeys(currentUserAddress, otherUserAddress);
      if (result.success) {
        await checkEncryptionStatus();
      }
    } catch (error) {
      console.error('Key exchange failed:', error);
    }
  };

  if (!encryptionStatus) {
    return (
      <div className={`encryption-indicator ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
          <span className="text-sm">Checking encryption...</span>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (encryptionStatus.isEncrypted) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      );
    } else if (encryptionStatus.readyForEncryption) {
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    }
  };

  const getStatusText = () => {
    if (encryptionStatus.isEncrypted) {
      return 'End-to-end encrypted';
    } else if (encryptionStatus.readyForEncryption) {
      return 'Ready for encryption';
    } else {
      return 'Not encrypted';
    }
  };

  const getStatusColor = () => {
    if (encryptionStatus.isEncrypted) {
      return 'text-green-600 dark:text-green-400';
    } else if (encryptionStatus.readyForEncryption) {
      return 'text-yellow-600 dark:text-yellow-400';
    } else {
      return 'text-red-600 dark:text-red-400';
    }
  };

  return (
    <div className={`encryption-indicator ${className}`}>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`text-sm font-medium ${getStatusColor()} hover:underline`}
        >
          {getStatusText()}
        </button>
      </div>

      {showDetails && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-white">Status: </span>
              <span className={getStatusColor()}>{getStatusText()}</span>
            </div>

            {encryptionStatus.missingKeys.length > 0 && (
              <div className="text-sm">
                <span className="font-medium text-gray-900 dark:text-white">Missing keys for: </span>
                <div className="mt-1 space-y-1">
                  {encryptionStatus.missingKeys.map((address) => (
                    <div key={address} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                      <button
                        onClick={() => exchangeKeys(address)}
                        className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        Exchange Keys
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {encryptionStatus.readyForEncryption && !encryptionStatus.isEncrypted && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={initializeEncryption}
                  disabled={isInitializing}
                  className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInitializing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Initializing...</span>
                    </div>
                  ) : (
                    'Enable Encryption'
                  )}
                </button>
              </div>
            )}

            {encryptionStatus.isEncrypted && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-1 mb-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Messages are encrypted with RSA-2048 + AES-256</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Keys are stored securely in your browser</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};