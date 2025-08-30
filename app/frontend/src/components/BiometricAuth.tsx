import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/design-system/hooks/useResponsive';

interface BiometricAuthProps {
  onSuccess: (credential?: any) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  fallbackToPassword?: boolean;
  className?: string;
}

interface BiometricCapabilities {
  isSupported: boolean;
  isAvailable: boolean;
  supportedMethods: string[];
  hasCredentials: boolean;
}

export default function BiometricAuth({
  onSuccess,
  onError,
  onCancel,
  title = 'Authenticate',
  subtitle = 'Use your biometric to continue',
  fallbackToPassword = true,
  className = ''
}: BiometricAuthProps) {
  const { isMobile, isTouch } = useResponsive();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    isSupported: false,
    isAvailable: false,
    supportedMethods: [],
    hasCredentials: false
  });
  const [showFallback, setShowFallback] = useState(false);
  const [password, setPassword] = useState('');

  // Check biometric capabilities
  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      // Check if WebAuthn is supported
      const isWebAuthnSupported = 'credentials' in navigator && 'create' in navigator.credentials;
      
      if (!isWebAuthnSupported) {
        setCapabilities({
          isSupported: false,
          isAvailable: false,
          supportedMethods: [],
          hasCredentials: false
        });
        return;
      }

      // Check if biometric authentication is available
      let isAvailable = false;
      let supportedMethods: string[] = [];
      let hasCredentials = false;

      try {
        // Check for platform authenticator (biometric)
        const available = await (navigator.credentials as any).get({
          publicKey: {
            timeout: 1000,
            allowCredentials: [],
            userVerification: 'required'
          }
        }).catch(() => false);

        isAvailable = true;
        supportedMethods = ['platform'];

        // Check if there are existing credentials
        try {
          const credentialRequestOptions = {
            publicKey: {
              timeout: 1000,
              allowCredentials: [],
              userVerification: 'preferred'
            }
          };
          
          await (navigator.credentials as any).get(credentialRequestOptions);
          hasCredentials = true;
        } catch (error) {
          // No existing credentials or user cancelled
          hasCredentials = false;
        }
      } catch (error) {
        console.log('Biometric check failed:', error);
      }

      setCapabilities({
        isSupported: isWebAuthnSupported,
        isAvailable,
        supportedMethods,
        hasCredentials
      });
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      setCapabilities({
        isSupported: false,
        isAvailable: false,
        supportedMethods: [],
        hasCredentials: false
      });
    }
  };

  const authenticateWithBiometric = useCallback(async () => {
    if (!capabilities.isSupported || !capabilities.isAvailable) {
      onError('Biometric authentication is not available');
      return;
    }

    setIsAuthenticating(true);

    try {
      // Create credential request options
      const credentialRequestOptions = {
        publicKey: {
          timeout: 60000,
          allowCredentials: [],
          userVerification: 'required',
          challenge: new Uint8Array(32) // In production, this should come from your server
        }
      };

      // Request biometric authentication
      const credential = await (navigator.credentials as any).get(credentialRequestOptions);
      
      if (credential) {
        // Haptic feedback on success
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        
        onSuccess(credential);
      } else {
        onError('Authentication failed');
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      if (error.name === 'NotAllowedError') {
        onError('Authentication was cancelled');
      } else if (error.name === 'InvalidStateError') {
        onError('Biometric authentication is not set up');
      } else if (error.name === 'NotSupportedError') {
        onError('Biometric authentication is not supported');
      } else {
        onError('Authentication failed. Please try again.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [capabilities, onSuccess, onError]);

  const handlePasswordAuth = useCallback(async () => {
    if (!password.trim()) {
      onError('Please enter your password');
      return;
    }

    setIsAuthenticating(true);
    
    try {
      // Simulate password validation - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, validate password with your backend
      if (password === 'demo123') { // Demo password
        onSuccess({ type: 'password' });
      } else {
        onError('Invalid password');
      }
    } catch (error) {
      onError('Password authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  }, [password, onSuccess, onError]);

  const renderBiometricIcon = () => {
    if (isMobile) {
      return (
        <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  if (!capabilities.isSupported && !fallbackToPassword) {
    return (
      <div className={`text-center p-6 ${className}`}>
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Biometric Authentication Not Supported
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your device or browser doesn't support biometric authentication.
        </p>
      </div>
    );
  }

  return (
    <div className={`max-w-sm mx-auto ${className}`}>
      <AnimatePresence mode="wait">
        {!showFallback ? (
          <motion.div
            key="biometric"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-6"
          >
            {/* Biometric Icon */}
            <div className="flex justify-center">
              <motion.div
                animate={isAuthenticating ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: isAuthenticating ? Infinity : 0, duration: 1 }}
              >
                {renderBiometricIcon()}
              </motion.div>
            </div>

            {/* Title and Subtitle */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            </div>

            {/* Authentication Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={authenticateWithBiometric}
              disabled={isAuthenticating || !capabilities.isAvailable}
              className="w-full bg-blue-500 text-white py-4 rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAuthenticating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                `Authenticate with ${isMobile ? 'Biometric' : 'Security Key'}`
              )}
            </motion.button>

            {/* Fallback Options */}
            <div className="space-y-3">
              {fallbackToPassword && (
                <button
                  onClick={() => setShowFallback(true)}
                  className="w-full text-gray-600 dark:text-gray-400 py-2 text-sm hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Use password instead
                </button>
              )}
              
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full text-gray-500 dark:text-gray-500 py-2 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Capability Info */}
            {!capabilities.isAvailable && capabilities.isSupported && (
              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                Biometric authentication is supported but not set up on this device.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="password"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Password Icon */}
            <div className="flex justify-center">
              <svg className="w-16 h-16 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Enter Password
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please enter your password to continue
              </p>
            </div>

            {/* Password Input */}
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordAuth()}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Submit Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePasswordAuth}
              disabled={isAuthenticating || !password.trim()}
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAuthenticating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Continue'
              )}
            </motion.button>

            {/* Back to Biometric */}
            <div className="space-y-2">
              {capabilities.isAvailable && (
                <button
                  onClick={() => setShowFallback(false)}
                  className="w-full text-gray-600 dark:text-gray-400 py-2 text-sm hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  ← Back to biometric
                </button>
              )}
              
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="w-full text-gray-500 dark:text-gray-500 py-2 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}