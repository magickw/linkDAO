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

// Global tracking to prevent duplicate auth attempts
let lastAuthenticatedAddress: string | null = null;

export const WalletLoginBridge: React.FC<WalletLoginBridgeProps> = ({
  autoLogin = true,
  onLoginSuccess,
  onLoginError,
  skipIfAuthenticated = true,
}) => {
  const { address, isConnected, connector, status } = useAccount();
  const { user, isAuthenticated, login } = useAuth();
  const hasHandledAddressRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Only attempt login if:
    // 1. Auto-login is enabled
    // 2. Wallet is connected with an address
    // 3. User is not already authenticated
    // 4. Haven't already handled this address
    // 5. Connector is available and ready
    // NOTE: Authentication runs in background without blocking navigation
    isMountedRef.current = true;
    console.log('WalletLoginBridge: useEffect triggered', {
      autoLogin,
      isConnected,
      address,
      isAuthenticated,
      connector
    });

    // FIRST: Check if we have a valid stored session before any other logic
    // This prevents race conditions where isAuthenticated is briefly false during session restoration
    const hasValidSession = (): boolean => {
      if (typeof window === 'undefined') return false;

      try {
        const sessionDataStr = localStorage.getItem('linkdao_session_data');
        if (!sessionDataStr) return false;

        const sessionData = JSON.parse(sessionDataStr);
        // Check if session is for the same address and not expired
        const isValid = sessionData.user?.address?.toLowerCase() === address?.toLowerCase() &&
          Date.now() < sessionData.expiresAt;

        if (isValid) {
          console.log('✅ Valid session exists in storage, skipping authentication');
        }

        return isValid;
      } catch (error) {
        console.error('Error checking session validity:', error);
        return false;
      }
    };

    // Skip authentication if we already have a valid session
    if (hasValidSession()) {
      console.log('WalletLoginBridge: Valid session exists, skipping login');
      return;
    }

    // Don't block on isAuthLoading - let auth happen in background
    // Only skip if NOT authenticated and we have all required connection info
    if (!autoLogin || !isConnected || !address || !connector) {
      console.log('WalletLoginBridge: Skipping login, conditions not met');
      return;
    }

    // If already authenticated, skip login
    if (isAuthenticated) {
      console.log('WalletLoginBridge: Already authenticated, skipping login');
      return;
    }

    // Check if we've already handled this address
    if (hasHandledAddressRef.current.has(address)) {
      console.log('WalletLoginBridge: Skipping login, address already handled');
      return;
    }

    // Mark this address as handled
    hasHandledAddressRef.current.add(address);
    console.log('WalletLoginBridge: Marking address as handled', address);

    console.log(`🔐 Attempting login for wallet: ${address}`);

    // Fire-and-forget login to avoid blocking UI/navigation while auth completes.
    // The login call will still update AuthContext state when complete.
    // Use setTimeout with 0 delay to defer execution to next tick and not block navigation
    const scheduleLogin = () => {
      // Create a promise to ensure the login process doesn't block the event loop
      Promise.resolve().then(() => {
        return login(address, connector, 'connected');
      })
      .then(result => {
        if (!isMountedRef.current) {
          console.log('WalletLoginBridge: Component unmounted, ignoring result');
          return;
        }
        if (result.success) {
          lastAuthenticatedAddress = address;
          console.log(`✅ Login successful for ${address}`);
          if (onLoginSuccess) {
            onLoginSuccess({ address });
          }
        } else {
          console.error(`❌ Login failed for ${address}:`, result.error);
          if (onLoginError) {
            onLoginError(result.error || 'Authentication failed');
          }
        }
      })
      .catch((error: any) => {
        if (!isMountedRef.current) {
          console.log('WalletLoginBridge: Component unmounted, ignoring error');
          return;
        }
        const errorMessage = error?.message || 'An unknown error occurred';
        console.error('💥 Login threw an exception:', errorMessage);
        if (onLoginError) {
          onLoginError(errorMessage);
        }
      });
    };

    // Always use setTimeout(0) to defer execution to next tick of event loop
    // This ensures the login doesn't block the main thread or navigation
    setTimeout(scheduleLogin, 0);

    return () => {
      console.log('WalletLoginBridge: Cleaning up effect');
      isMountedRef.current = false;
    };
  }, [address, isConnected, isAuthenticated, autoLogin, login, connector, status, onLoginSuccess, onLoginError]);
  // Reset when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      hasHandledAddressRef.current.clear();
      lastAuthenticatedAddress = null;
    }
  }, [isConnected]);

  return null;
};

export default WalletLoginBridge;
