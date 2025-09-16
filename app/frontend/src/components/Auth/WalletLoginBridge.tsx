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
  const { address, isConnected, connector } = useAccount();
  const { user, isAuthenticated, login } = useAuth();
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const lastAddressRef = useRef<string | undefined>();
  const hasTriedLoginRef = useRef(false);

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
    if (!autoLogin || !isConnected || !address || isLoggingIn) {
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

    console.log('🚀 Triggering auto-login for:', address);
    // Trigger automatic login
    handleAutoLogin();
  }, [address, isConnected, isAuthenticated, autoLogin, skipIfAuthenticated, isLoggingIn]);

  const handleAutoLogin = async () => {
    if (!address || isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      hasTriedLoginRef.current = true;

      console.log(`🔐 Attempting automatic login for wallet: ${address} via ${connector?.name || 'Unknown'}`);

      // Show user-friendly notification for Base wallet
      if (connector?.name?.toLowerCase().includes('coinbase') || connector?.id === 'coinbaseWallet') {
        notify('Base wallet connected! Signing in...', 'info');
      } else {
        notify('Wallet connected! Signing in...', 'info');
      }

      const result = await login(address);
      console.log('🔍 Login result:', result);

      if (result.success) {
        // Success notification
        const walletName = connector?.name || 'Wallet';
        console.log(`✅ Login successful for ${walletName}!`);
        notify(`Successfully logged in with ${walletName}!`, 'success');
        
        // Call success callback with address - user state will be updated by AuthContext
        if (onLoginSuccess) {
          onLoginSuccess({ address });
        }
      } else {
        // Handle login failure
        const errorMessage = result.error || 'Authentication failed';
        console.error('❌ Auto-login failed:', errorMessage);
        
        // User-friendly error notification
        if (errorMessage.includes('signature')) {
          notify('Please sign the message in your wallet to complete login', 'warning');
        } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
          notify('Login cancelled. You can connect again anytime.', 'info');
        } else {
          notify('Login failed. Please try connecting your wallet again.', 'error');
        }

        if (onLoginError) {
          onLoginError(errorMessage);
        }
      }
    } catch (error) {
      console.error('💥 Auto-login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      notify('Wallet login failed. Please try again.', 'error');
      
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Reset attempt flag when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasTriedLoginRef.current = false;
    }
  }, [isConnected]);

  // Monitor authentication status and reset login attempt when authenticated
  useEffect(() => {
    if (isAuthenticated && hasTriedLoginRef.current) {
      // User is now authenticated, reset the login attempt flag
      // This prevents repeated login attempts for the same session
      hasTriedLoginRef.current = false;
      console.log('User authenticated successfully, resetting login attempt flag');
    }
  }, [isAuthenticated]);

  // This component doesn't render anything visible
  return null;
};

export default WalletLoginBridge;