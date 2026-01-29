/**
 * WalletLoginBridge - Automatic authentication bridge for wallet connections
 * Similar to the web app's WalletLoginBridge component
 * Triggers authentication flow when a user connects their wallet
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store';
import { authService } from '@linkdao/shared';
import { walletService } from '../services/walletConnectService';

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
  const authInProgressRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    isMountedRef.current = true;

    const addressKey = walletAddress?.toLowerCase() || '';

    console.log('WalletLoginBridge: useEffect triggered', {
      autoLogin,
      walletAddress: addressKey,
      isAuthenticated,
      connector: connector?.name,
      authInProgress: authInProgressRef.current.get(addressKey) || false
    });

    // Skip authentication if:
    // 1. Auto-login is disabled
    // 2. No wallet address
    // 3. User is already authenticated and skipIfAuthenticated is true
    // 4. Already handled this address
    // 5. Auth is already in progress for this address
    if (!autoLogin || !walletAddress) {
      console.log('WalletLoginBridge: Skipping login, conditions not met');
      return;
    }

    if (isAuthenticated && skipIfAuthenticated) {
      console.log('WalletLoginBridge: Already authenticated, skipping login');
      return;
    }

    // Check if we've already handled this address
    if (hasHandledAddressRef.current.has(addressKey)) {
      console.log('WalletLoginBridge: Skipping login, address already handled');
      return;
    }

    // Check if auth is already in progress for this address
    if (authInProgressRef.current.get(addressKey)) {
      console.log('WalletLoginBridge: Auth already in progress for this address');
      return;
    }

    // Mark this address as handled
    hasHandledAddressRef.current.add(addressKey);
    console.log('WalletLoginBridge: Marking address as handled', addressKey);

    console.log(`🔐 Attempting login for wallet: ${addressKey}`);

    // Fire-and-forget login to avoid blocking UI/navigation
    const scheduleLogin = () => {
      // Mark auth as in progress
      authInProgressRef.current.set(addressKey, true);

      // Initialize wallet service with connection state
      const connectorType = connector === 'walletconnect' ? 'walletconnect' : connector?.name || 'walletconnect';
      console.log(`⚙️ Initializing wallet service with provider: ${connectorType}`);
      walletService.setConnectionState(connectorType as any, walletAddress, 1);

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
            console.log(`✅ Login successful for ${addressKey}`);
            setUser(result.user);
            setToken(result.token);
            if (onLoginSuccess) {
              onLoginSuccess({ address: walletAddress, user: result.user });
            }
          } else {
            console.error(`❌ Login failed for ${addressKey}:`, result.error);
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
        })
        .finally(() => {
          // Mark auth as complete
          authInProgressRef.current.set(addressKey, false);
        });
    };

    // Use setTimeout(0) to defer execution to next tick
    setTimeout(scheduleLogin, 0);

    return () => {
      console.log('WalletLoginBridge: Cleaning up effect');
      isMountedRef.current = false;
    };
  }, [walletAddress, connector, autoLogin, onLoginSuccess, onLoginError, skipIfAuthenticated]);

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
