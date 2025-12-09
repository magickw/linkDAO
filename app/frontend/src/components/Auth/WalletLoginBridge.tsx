/**
 * WalletLoginBridge - Automatic authentication bridge for wallet connections
 * Triggers authentication flow when a user connects their wallet.
 * This component is simplified to delegate all authentication logic to AuthContext.
 */

import React, { useEffect, useRef } from 'react';
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
  skipIfAuthenticated = true,
}) => {
  const { address, isConnected, connector, status } = useAccount();
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const hasAttemptedLoginRef = useRef(false);

  useEffect(() => {
    // Conditions for triggering auto-login
    const shouldAttemptLogin =
      autoLogin &&
      isConnected &&
      address &&
      !isAuthenticated &&
      !isAuthLoading &&
      !hasAttemptedLoginRef.current;

    if (!shouldAttemptLogin) {
      return;
    }

    const handleAutoLogin = async () => {
      hasAttemptedLoginRef.current = true;
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
      }
    };

    handleAutoLogin();

  }, [
    address,
    isConnected,
    isAuthenticated,
    isAuthLoading,
    autoLogin,
    login,
    connector,
    status,
    onLoginSuccess,
    onLoginError,
  ]);

  // Reset login attempt flag if the connected address changes
  useEffect(() => {
    hasAttemptedLoginRef.current = false;
  }, [address]);

  // Reset login attempt flag if user disconnects
  useEffect(() => {
    if (!isConnected) {
      hasAttemptedLoginRef.current = false;
    }
  }, [isConnected]);

  return null;
};

export default WalletLoginBridge;
