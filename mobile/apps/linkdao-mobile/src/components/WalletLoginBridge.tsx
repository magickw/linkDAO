/**
 * WalletLoginBridge - Automatic authentication bridge for wallet connections
 * Similar to the web app's WalletLoginBridge component
 * Triggers authentication flow when a user connects their wallet
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { authService } from '@linkdao/shared';

interface WalletLoginBridgeProps {
  autoLogin?: boolean;
  walletAddress?: string;
  connector?: any;
  onLoginSuccess?: (user: any) => void;
  onLoginError?: (error: string) => void;
  skipIfAuthenticated?: boolean;
}

// Global tracking to prevent duplicate auth attempts
let lastAuthenticatedAddress: string | null = null;

export const WalletLoginBridge: React.FC<WalletLoginBridgeProps> = ({
  autoLogin = true,
  walletAddress,
  connector,
  onLoginSuccess,
  onLoginError,
  skipIfAuthenticated = true,
}) => {
  const { user, isAuthenticated, setUser, setToken } = useAuthStore();
  const hasHandledAddressRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  useEffect(() => {
    // In development mode, skip wallet login bridge entirely
    // Mock auth is handled in _layout.tsx
    if (__DEV__) {
      console.log('🧪 WalletLoginBridge: Disabled in development mode');
      return;
    }

    isMountedRef.current = true;

    console.log('WalletLoginBridge: useEffect triggered', {
      autoLogin,
      walletAddress,
      isAuthenticated,
      connector: connector?.name
    });

    // Skip authentication if:
    // 1. Auto-login is disabled
    // 2. No wallet address
    // 3. User is already authenticated and skipIfAuthenticated is true
    // 4. Already handled this address
    if (!autoLogin || !walletAddress) {
      console.log('WalletLoginBridge: Skipping login, conditions not met');
      return;
    }

    if (isAuthenticated && skipIfAuthenticated) {
      console.log('WalletLoginBridge: Already authenticated, skipping login');
      return;
    }

    // Check if we've already handled this address
    if (hasHandledAddressRef.current.has(walletAddress)) {
      console.log('WalletLoginBridge: Skipping login, address already handled');
      return;
    }

    // Mark this address as handled
    hasHandledAddressRef.current.add(walletAddress);
    console.log('WalletLoginBridge: Marking address as handled', walletAddress);

    console.log(`🔐 Attempting login for wallet: ${walletAddress}`);

    // Fire-and-forget login to avoid blocking UI/navigation
    const scheduleLogin = () => {
      Promise.resolve().then(() => {
        return authService.authenticateWallet(walletAddress, connector, 'connected');
      })
        .then(result => {
          if (!isMountedRef.current) {
            console.log('WalletLoginBridge: Component unmounted, ignoring result');
            return;
          }
          if (result.success && result.token && result.user) {
            lastAuthenticatedAddress = walletAddress;
            console.log(`✅ Login successful for ${walletAddress}`);
            setUser(result.user);
            setToken(result.token);
            if (onLoginSuccess) {
              onLoginSuccess({ address: walletAddress, user: result.user });
            }
          } else {
            console.error(`❌ Login failed for ${walletAddress}:`, result.error);
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

    // Use setTimeout(0) to defer execution to next tick
    setTimeout(scheduleLogin, 0);

    return () => {
      console.log('WalletLoginBridge: Cleaning up effect');
      isMountedRef.current = false;
    };
  }, [walletAddress, connector, isAuthenticated, autoLogin, onLoginSuccess, onLoginError, skipIfAuthenticated, setUser, setToken]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!walletAddress) {
      hasHandledAddressRef.current.clear();
      lastAuthenticatedAddress = null;
    }
  }, [walletAddress]);

  return null;
};

export default WalletLoginBridge;