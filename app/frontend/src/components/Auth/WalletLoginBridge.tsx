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
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const hasHandledAddressRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Only attempt login if:
    // 1. Auto-login is enabled
    // 2. Wallet is connected with an address
    // 3. User is not already authenticated
    // 4. Not currently loading
    // 5. Haven't already handled this address

    if (!autoLogin || !isConnected || !address || isAuthenticated || isAuthLoading) {
      return;
    }

    // Check if we've already handled this address
    if (hasHandledAddressRef.current.has(address)) {
      return;
    }

    // Mark this address as handled
    hasHandledAddressRef.current.add(address);

    // Add a small delay to ensure wallet state is stable
    const timeoutId = setTimeout(() => {
      console.log(`🔐 Attempting login for wallet: ${address}`);

      // Fire-and-forget login to avoid blocking UI/navigation while auth completes.
      // The login call will still update AuthContext state when complete.
      login(address, connector, status)
        .then(result => {
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
          const errorMessage = error?.message || 'An unknown error occurred';
          console.error('💥 Login threw an exception:', errorMessage);
          if (onLoginError) {
            onLoginError(errorMessage);
          }
        });
    }, 300); // 300ms delay for stability

    return () => clearTimeout(timeoutId);
  }, [address, isConnected, isAuthenticated, isAuthLoading, autoLogin, login, connector, status, onLoginSuccess, onLoginError]);

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
