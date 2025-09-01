'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FingerPrintIcon, 
  FaceSmileIcon, 
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface BiometricAuthProps {
  onSuccess: (credential: any) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  fallbackToPassword?: boolean;
  className?: string;
}

interface BiometricCapability {
  available: boolean;
  type: 'fingerprint' | 'face' | 'voice' | 'none';
  error?: string;
}

const BiometricAuth: React.FC<BiometricAuthProps> = ({
  onSuccess,
  onError,
  onCancel,
  title = 'Biometric Authentication',
  subtitle = 'Use your biometric to authenticate',
  fallbackToPassword = true,
  className = ''
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'authenticating' | 'success' | 'error'>('idle');
  const [capability, setCapability] = useState<BiometricCapability>({
    available: false,
    type: 'none'
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showFallback, setShowFallback] = useState(false);

  // Check biometric capabilities
  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setCapability({
          available: false,
          type: 'none',
          error: 'WebAuthn not supported'
        });
        return;
      }

      // Check if biometric authentication is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (available) {
        // Try to determine the type of biometric available
        const userAgent = navigator.userAgent.toLowerCase();
        let type: BiometricCapability['type'] = 'fingerprint';
        
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          // iOS devices - could be Face ID or Touch ID
          type = userAgent.includes('iphone x') || userAgent.includes('iphone 1') ? 'face' : 'fingerprint';
        } else if (userAgent.includes('android')) {
          // Android devices - usually fingerprint
          type = 'fingerprint';
        }

        setCapability({
          available: true,
          type
        });
      } else {
        setCapability({
          available: false,
          type: 'none',
          error: 'No biometric authenticator available'
        });
      }
    } catch (error) {
      setCapability({
        available: false,
        type: 'none',
        error: 'Failed to check biometric capabilities'
      });
    }
  };

  const authenticateWithBiometric = useCallback(async () => {
    if (!capability.available) {
      onError('Biometric authentication not available');
      return;
    }

    setIsAuthenticating(true);
    setAuthStatus('authenticating');
    setErrorMessage('');

    try {
      // Create credential request options
      const credentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: new Uint8Array(32), // In production, get this from your server
          allowCredentials: [], // Empty for platform authenticator
          userVerification: 'required',
          timeout: 60000
        }
      };

      // Request biometric authentication
      const credential = await navigator.credentials.get(credentialRequestOptions);

      if (credential) {
        setAuthStatus('success');
        
        // Add haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        setTimeout(() => {
          onSuccess(credential);
        }, 1000);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error: any) {
      setAuthStatus('error');
      
      let errorMsg = 'Authentication failed';
      
      if (error.name === 'NotAllowedError') {
        errorMsg = 'Authentication was cancelled or not allowed';
      } else if (error.name === 'InvalidStateError') {
        errorMsg = 'Authenticator is already in use';
      } else if (error.name === 'NotSupportedError') {
        errorMsg = 'Biometric authentication not supported';
      } else if (error.name === 'SecurityError') {
        errorMsg = 'Security error occurred';
      }
      
      setErrorMessage(errorMsg);
      onError(errorMsg);
      
      // Show fallback after error
      if (fallbackToPassword) {
        setTimeout(() => setShowFallback(true), 2000);
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [capability.available, onSuccess, onError, fallbackToPassword]);

  const getBiometricIcon = () => {
    switch (capability.type) {
      case 'face':
        return FaceSmileIcon;
      case 'fingerprint':
        return FingerPrintIcon;
      default:
        return DevicePhoneMobileIcon;
    }
  };

  const getBiometricLabel = () => {
    switch (capability.type) {
      case 'face':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID';
      default:
        return 'Biometric';
    }
  };

  const getStatusIcon = () => {
    switch (authStatus) {
      case 'success':
        return CheckCircleIcon;
      case 'error':
        return XCircleIcon;
      default:
        return getBiometricIcon();
    }
  };

  const getStatusColor = () => {
    switch (authStatus) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'authenticating':
        return 'text-indigo-500';
      default:
        return 'text-gray-700';
    }
  };

  if (!capability.available && !showFallback) {
    return (
      <div className={`text-center p-6 ${className}`}>
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Biometric Authentication Unavailable
        </h3>
        <p className="text-gray-600 mb-4">
          {capability.error || 'Your device does not support biometric authentication'}
        </p>
        {fallbackToPassword && (
          <button
            onClick={() => setShowFallback(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Use Password Instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`text-center p-6 ${className}`}>
      <AnimatePresence mode="wait">
        {!showFallback ? (
          <motion.div
            key="biometric"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Biometric Icon */}
            <motion.div
              className="relative mx-auto w-24 h-24 flex items-center justify-center"
              animate={{
                scale: isAuthenticating ? [1, 1.1, 1] : 1,
                rotate: authStatus === 'success' ? 360 : 0
              }}
              transition={{
                scale: {
                  duration: 1.5,
                  repeat: isAuthenticating ? Infinity : 0,
                  ease: 'easeInOut'
                },
                rotate: {
                  duration: 0.5,
                  ease: 'easeInOut'
                }
              }}
            >
              {/* Pulse animation for authenticating state */}
              {isAuthenticating && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-indigo-200"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              )}
              
              {/* Icon background */}
              <div className={`
                w-20 h-20 rounded-full flex items-center justify-center
                ${authStatus === 'success' ? 'bg-green-100' : 
                  authStatus === 'error' ? 'bg-red-100' : 
                  'bg-indigo-100'}
              `}>
                {React.createElement(getStatusIcon(), {
                  className: `w-10 h-10 ${getStatusColor()}`
                })}
              </div>
            </motion.div>

            {/* Title and Subtitle */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
              <p className="text-gray-600">
                {authStatus === 'authenticating' ? `Authenticating with ${getBiometricLabel()}...` :
                 authStatus === 'success' ? 'Authentication successful!' :
                 authStatus === 'error' ? errorMessage :
                 subtitle}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {authStatus === 'idle' || authStatus === 'error' ? (
                <motion.button
                  onClick={authenticateWithBiometric}
                  disabled={isAuthenticating}
                  className={`
                    w-full py-4 px-6 rounded-xl font-semibold text-lg
                    ${authStatus === 'error' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  `}
                  whileTap={{ scale: 0.98 }}
                >
                  {authStatus === 'error' ? 'Try Again' : `Use ${getBiometricLabel()}`}
                </motion.button>
              ) : null}

              {/* Fallback and Cancel buttons */}
              <div className="flex space-x-3">
                {fallbackToPassword && (
                  <button
                    onClick={() => setShowFallback(true)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Use Password
                  </button>
                )}
                
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="fallback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Enter Password</h2>
            <p className="text-gray-600 mb-6">
              Please enter your password to continue
            </p>
            
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full py-4 px-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              
              <button
                className="w-full py-4 px-6 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Sign In
              </button>
              
              <button
                onClick={() => setShowFallback(false)}
                className="w-full py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Biometric
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BiometricAuth;