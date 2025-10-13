/**
 * useWalletAuth - Custom hook for wallet authentication with Base wallet support
 * Provides manual authentication controls and status checking
 */

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';

export interface UseWalletAuthReturn {
  // Authentication state
  isAuthenticating: boolean;
  authError: string | null;
  canAuthenticate: boolean;
  
  // Authentication actions
  authenticateWallet: () => Promise<{ success: boolean; error?: string }>;
  clearAuthError: () => void;
  
  // Wallet info
  walletInfo: {
    address: string | undefined;
    isConnected: boolean;
    connectorName: string | undefined;
    isBaseWallet: boolean;
  };
}

export const useWalletAuth = (): UseWalletAuthReturn => {
  const { address, isConnected, connector } = useAccount();
  const { login, isAuthenticated } = useAuth();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check if current wallet is Base wallet (Coinbase Wallet)
  const isBaseWallet = connector?.name?.toLowerCase().includes('coinbase') || 
                      connector?.id === 'coinbaseWallet' ||
                      connector?.name?.toLowerCase().includes('base');

  // Can authenticate if wallet is connected, not already authenticated, and not currently authenticating
  const canAuthenticate = isConnected && !!address && !isAuthenticated && !isAuthenticating;

  const authenticateWallet = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected) {
      const error = 'Please connect your wallet first';
      setAuthError(error);
      return { success: false, error };
    }

    if (isAuthenticating) {
      const error = 'Authentication already in progress';
      setAuthError(error);
      return { success: false, error };
    }

    if (isAuthenticated) {
      return { success: true };
    }

    try {
      setIsAuthenticating(true);
      setAuthError(null);

      console.log(`Starting authentication for ${isBaseWallet ? 'Base' : 'other'} wallet:`, address);

      // Add a small delay to ensure connector is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await login(address, connector, 'connected');

      if (!result.success) {
        setAuthError(result.error || 'Authentication failed');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, isConnected, isAuthenticating, isAuthenticated, isBaseWallet, login]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  return {
    // Authentication state
    isAuthenticating,
    authError,
    canAuthenticate,
    
    // Authentication actions
    authenticateWallet,
    clearAuthError,
    
    // Wallet info
    walletInfo: {
      address,
      isConnected,
      connectorName: connector?.name,
      isBaseWallet: isBaseWallet || false
    }
  };
};

export default useWalletAuth;