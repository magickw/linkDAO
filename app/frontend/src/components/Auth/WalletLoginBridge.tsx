/**
 * WalletLoginBridge - Automatic authentication bridge for wallet connections
 * Triggers authentication flow when a user connects their wallet (including Base wallet)
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

interface WalletLoginBridgeProps {
  autoLogin?: boolean;
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: string) => void;
  skipIfAuthenticated?: boolean;
}

export const WalletLoginBridge: React.FC<WalletLoginBridgeProps> = ({
  autoLogin = true,
  onLoginSuccess,
  onLoginError,
  skipIfAuthenticated = true
}) => {
  const { address, isConnected, connector, status } = useAccount();
  const { user, isAuthenticated, login } = useAuth();
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const lastAddressRef = useRef<string | undefined>();
  const hasTriedLoginRef = useRef(false);

  // Prevent page refresh loops by tracking failed attempts
  const [failedAttempts, setFailedAttempts] = useState(0);
  const maxFailedAttempts = 3;

  // Simple notification function (will be enhanced when ToastProvider is available)
  const notify = (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Could also use browser notifications here if needed
  };

  useEffect(() => {
    // Check if wallet connection has changed
    const addressChanged = lastAddressRef.current !== address;
    lastAddressRef.current = address;

    // Skip if conditions not met
    if (!autoLogin || !isConnected || !address || isLoggingIn || status !== 'connected' || !connector) {
      return;
    }

    // Skip if user is already authenticated and we should skip
    if (skipIfAuthenticated && isAuthenticated) {
      console.log('📝 Skipping auto-login: user already authenticated');
      return;
    }

    // Skip if we already tried login for this address
    if (hasTriedLoginRef.current && !addressChanged) {
      console.log('📝 Skipping auto-login: already attempted for this address');
      return;
    }

    // Add delay to ensure connector is fully ready
    const timer = setTimeout(() => {
      console.log('🚀 Triggering auto-login for:', address);
      handleAutoLogin();
    }, 500);

    return () => clearTimeout(timer);
  }, [address, isConnected, isAuthenticated, autoLogin, skipIfAuthenticated, isLoggingIn, status, connector]);

  const handleAutoLogin = async () => {
    if (!address || isLoggingIn || !connector || status !== 'connected' || failedAttempts >= maxFailedAttempts) return;

    try {
      setIsLoggingIn(true);
      hasTriedLoginRef.current = true;

      console.log(`🔐 Attempting automatic login for wallet: ${address} via ${connector?.name || 'Unknown'}`);

      const result = await login(address, connector, status);
      console.log('🔍 Login result:', result);

      if (result.success) {
        const walletName = connector?.name || 'Wallet';
        console.log(`✅ Login successful for ${walletName}!`);
        setFailedAttempts(0); // Reset failed attempts on success
        
        if (onLoginSuccess) {
          onLoginSuccess({ address });
        }
      } else {
        const errorMessage = result.error || 'Authentication failed';
        console.error('❌ Auto-login failed:', errorMessage);
        
        // Increment failed attempts for certain types of errors
        if (errorMessage.includes('Connector not connected') || errorMessage.includes('Failed to sign')) {
          setFailedAttempts(prev => prev + 1);
        }
        
        // Don't show error notifications for connector issues to prevent spam
        if (!errorMessage.includes('Connector not connected')) {
          if (onLoginError) {
            onLoginError(errorMessage);
          }
        }
      }
    } catch (error) {
      console.error('💥 Auto-login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      // Increment failed attempts for connector errors
      if (errorMessage.includes('Connector not connected') || errorMessage.includes('Failed to sign')) {
        setFailedAttempts(prev => prev + 1);
      }
      
      // Don't show error notifications for connector issues
      if (!errorMessage.includes('Connector not connected')) {
        if (onLoginError) {
          onLoginError(errorMessage);
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Reset attempt flag when wallet disconnects or connector changes
  useEffect(() => {
    if (!isConnected || !connector) {
      hasTriedLoginRef.current = false;
    }
  }, [isConnected, connector]);

  // Monitor authentication status and reset login attempt when authenticated
  useEffect(() => {
    if (isAuthenticated && hasTriedLoginRef.current) {
      // User is now authenticated, reset the login attempt flag
      // This prevents repeated login attempts for the same session
      hasTriedLoginRef.current = false;
      console.log('User authenticated successfully, resetting login attempt flag');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (failedAttempts >= maxFailedAttempts) {
      console.log('Max failed login attempts reached, stopping auto-login');
      hasTriedLoginRef.current = true; // Prevent further attempts
    }
  }, [failedAttempts]);

  // This component doesn't render anything visible
  return null;
};

export default WalletLoginBridge;