/**
 * WalletLoginBridge - Automatic authentication bridge for wallet connections
 * Triggers authentication flow when a user connects their wallet.
 * This component is simplified to delegate all authentication logic to AuthContext.
 * 
 * FIXED: Added debouncing and global lock to prevent concurrent authentication processes
 * that were causing page freezes on wallet connection.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

interface WalletLoginBridgeProps {
  autoLogin?: boolean;
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: string) => void;
  skipIfAuthenticated?: boolean;
}

// Global debounce tracking to prevent multiple concurrent auth attempts
let globalAuthInProgress = false;
let lastAuthAttemptTime = 0;
const AUTH_DEBOUNCE_DELAY = 2000; // 2 seconds between auth attempts

export const WalletLoginBridge: React.FC<WalletLoginBridgeProps> = ({
  autoLogin = true,
  onLoginSuccess,
  onLoginError,
  skipIfAuthenticated = true,
}) => {
  const { address, isConnected, connector, status } = useAccount();
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const hasAttemptedLoginRef = useRef(false);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAddressRef = useRef<string | null>(null);

  // Clear any pending timeout when address changes or component unmounts
  useEffect(() => {
    return () => {
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
    };
  }, []);

  // Reset state when wallet address changes
  useEffect(() => {
    if (address !== currentAddressRef.current) {
      currentAddressRef.current = address || null;
      hasAttemptedLoginRef.current = false;
      
      // Clear any pending login when address changes
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
    }
  }, [address]);

  // Reset state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasAttemptedLoginRef.current = false;
      globalAuthInProgress = false;
      
      if (loginTimeoutRef.current) {
        clearTimeout(loginTimeoutRef.current);
        loginTimeoutRef.current = null;
      }
    }
  }, [isConnected]);

  const attemptLogin = useCallback(async () => {
    if (!address || !connector) {
      return;
    }

    // Mark this address as attempted
    hasAttemptedLoginRef.current = true;
    globalAuthInProgress = true;
    lastAuthAttemptTime = Date.now();

    console.log(`🔐 Triggering auto-login for wallet: ${address}`);

    try {
      const result = await login(address, connector, status);

      if (result.success) {
        console.log(`✅ Auto-login successful for ${address}`);
        if (onLoginSuccess) {
          onLoginSuccess({ address });
        }
      } else {
        console.error(`❌ Auto-login failed for ${address}:`, result.error);
        if (onLoginError) {
          onLoginError(result.error || 'Authentication failed');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('💥 Auto-login threw an exception:', errorMessage);
      if (onLoginError) {
        onLoginError(errorMessage);
      }
    } finally {
      globalAuthInProgress = false;
    }
  }, [address, connector, status, login, onLoginSuccess, onLoginError]);

  useEffect(() => {
    // Clear any existing timeout
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }

    // Check if we should attempt login
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAuthAttemptTime;
    
    const shouldAttemptLogin =
      autoLogin &&
      isConnected &&
      address &&
      !isAuthenticated &&
      !isAuthLoading &&
      !hasAttemptedLoginRef.current &&
      !globalAuthInProgress &&
      timeSinceLastAttempt >= AUTH_DEBOUNCE_DELAY;

    if (!shouldAttemptLogin) {
      return;
    }

    // Add a small delay to ensure wallet is fully connected and all states are settled
    loginTimeoutRef.current = setTimeout(() => {
      attemptLogin();
    }, 500); // 500ms delay to ensure stability

  }, [
    address,
    isConnected,
    isAuthenticated,
    isAuthLoading,
    autoLogin,
    attemptLogin,
  ]);

  return null;
};

export default WalletLoginBridge;
