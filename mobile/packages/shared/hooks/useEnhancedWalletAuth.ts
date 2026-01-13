/**
 * Enhanced Wallet Authentication Hook
 * Provides comprehensive wallet authentication with session recovery,
 * error handling, and connection state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useEnhancedAuth } from '@/context/EnhancedAuthContext';
import { enhancedAuthService } from '@/services/enhancedAuthService';

interface WalletInfo {
  isBaseWallet: boolean;
  chainId?: number;
  connector?: string;
  isConnected: boolean;
  address?: string;
}

interface AuthenticationState {
  isAuthenticating: boolean;
  isRecovering: boolean;
  error: string | null;
  lastAttempt: number | null;
  retryCount: number;
  canRetry: boolean;
}

interface UseEnhancedWalletAuthReturn {
  // Wallet info
  walletInfo: WalletInfo;
  
  // Authentication state
  authState: AuthenticationState;
  
  // Methods
  authenticate: (options?: { forceRefresh?: boolean; skipCache?: boolean }) => Promise<{ success: boolean; error?: string }>;
  recoverAuthentication: () => Promise<{ success: boolean; error?: string }>;
  disconnect: () => Promise<void>;
  clearError: () => void;
  
  // Status checks
  isWalletReady: boolean;
  needsAuthentication: boolean;
  canAutoAuthenticate: boolean;
}

export const useEnhancedWalletAuth = (): UseEnhancedWalletAuthReturn => {
  const { address, isConnected, connector, chainId } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    isRecovering, 
    error: contextError,
    authenticateWallet,
    recoverSession,
    logout,
    clearError: clearContextError
  } = useEnhancedAuth();

  const [authState, setAuthState] = useState<AuthenticationState>({
    isAuthenticating: false,
    isRecovering: false,
    error: null,
    lastAttempt: null,
    retryCount: 0,
    canRetry: true
  });

  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    isBaseWallet: false,
    isConnected: false
  });

  // Refs to prevent duplicate operations
  const authInProgressRef = useRef(false);
  const recoveryInProgressRef = useRef(false);
  const autoAuthAttemptedRef = useRef<string | null>(null);

  // Constants
  const MAX_RETRY_COUNT = 3;
  const RETRY_COOLDOWN = 30000; // 30 seconds
  const AUTO_AUTH_DELAY = 1000; // 1 second delay for auto-auth

  /**
   * Update wallet info when connection changes
   */
  useEffect(() => {
    setWalletInfo({
      isBaseWallet: connector?.name?.toLowerCase().includes('base') || false,
      chainId: chainId,
      connector: connector?.name,
      isConnected: isConnected,
      address: address
    });
  }, [isConnected, connector, chainId, address]);

  /**
   * Update authentication state from context
   */
  useEffect(() => {
    setAuthState(prev => ({
      ...prev,
      isAuthenticating: isLoading,
      isRecovering: isRecovering,
      error: contextError
    }));
  }, [isLoading, isRecovering, contextError]);

  /**
   * Auto-authenticate when wallet connects
   */
  useEffect(() => {
    const shouldAutoAuthenticate = () => {
      // Don't auto-authenticate if:
      // 1. Wallet not connected
      // 2. No address
      // 3. Already authenticated for this address
      // 4. Currently authenticating or recovering
      // 5. Already attempted for this address
      // 6. Too many recent failures

      if (!isConnected || !address) return false;
      if (isAuthenticated && user?.address === address) return false;
      if (authInProgressRef.current || recoveryInProgressRef.current) return false;
      if (autoAuthAttemptedRef.current === address) return false;
      if (authState.retryCount >= MAX_RETRY_COUNT) return false;

      return true;
    };

    if (shouldAutoAuthenticate()) {
      // Mark this address as attempted
      autoAuthAttemptedRef.current = address;
      
      // Add delay to ensure wallet is fully connected
      const timeoutId = setTimeout(() => {
        authenticate({ forceRefresh: false });
      }, AUTO_AUTH_DELAY);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, address, isAuthenticated, user?.address, authState.retryCount]);

  /**
   * Reset auto-auth attempt when address changes
   */
  useEffect(() => {
    if (autoAuthAttemptedRef.current && autoAuthAttemptedRef.current !== address) {
      autoAuthAttemptedRef.current = null;
      setAuthState(prev => ({ ...prev, retryCount: 0, canRetry: true }));
    }
  }, [address]);

  /**
   * Enhanced authentication with retry logic
   */
  const authenticate = useCallback(async (options: { 
    forceRefresh?: boolean; 
    skipCache?: boolean 
  } = {}): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected) {
      const error = 'Wallet not connected';
      setAuthState(prev => ({ ...prev, error }));
      return { success: false, error };
    }

    if (authInProgressRef.current) {
      return { success: false, error: 'Authentication already in progress' };
    }

    // Check retry cooldown
    if (authState.lastAttempt && Date.now() - authState.lastAttempt < RETRY_COOLDOWN) {
      const remainingTime = Math.ceil((RETRY_COOLDOWN - (Date.now() - authState.lastAttempt)) / 1000);
      const error = `Please wait ${remainingTime} seconds before retrying`;
      return { success: false, error };
    }

    // Check retry limit
    if (authState.retryCount >= MAX_RETRY_COUNT && !options.forceRefresh) {
      const error = 'Maximum retry attempts reached. Please refresh the page or try again later.';
      setAuthState(prev => ({ ...prev, error, canRetry: false }));
      return { success: false, error };
    }

    authInProgressRef.current = true;
    setAuthState(prev => ({
      ...prev,
      isAuthenticating: true,
      error: null,
      lastAttempt: Date.now()
    }));

    try {
      const result = await authenticateWallet({
        forceRefresh: options.forceRefresh
      });

      if (result.success) {
        // Reset retry count on success
        setAuthState(prev => ({
          ...prev,
          isAuthenticating: false,
          retryCount: 0,
          canRetry: true,
          error: null
        }));
        
        // Reset auto-auth attempt tracking
        autoAuthAttemptedRef.current = null;
        
        return { success: true };
      } else {
        // Increment retry count on failure
        setAuthState(prev => ({
          ...prev,
          isAuthenticating: false,
          retryCount: prev.retryCount + 1,
          error: result.error || 'Authentication failed',
          canRetry: prev.retryCount + 1 < MAX_RETRY_COUNT
        }));
        
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Authentication error';
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticating: false,
        retryCount: prev.retryCount + 1,
        error: errorMessage,
        canRetry: prev.retryCount + 1 < MAX_RETRY_COUNT
      }));
      
      return { success: false, error: errorMessage };
    } finally {
      authInProgressRef.current = false;
    }
  }, [address, isConnected, authenticateWallet, authState.lastAttempt, authState.retryCount]);

  /**
   * Recover authentication after network issues
   */
  const recoverAuthentication = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!address) {
      return { success: false, error: 'No wallet address available' };
    }

    if (recoveryInProgressRef.current) {
      return { success: false, error: 'Recovery already in progress' };
    }

    recoveryInProgressRef.current = true;
    setAuthState(prev => ({ ...prev, isRecovering: true, error: null }));

    try {
      const success = await recoverSession();
      
      if (success) {
        setAuthState(prev => ({
          ...prev,
          isRecovering: false,
          retryCount: 0,
          canRetry: true,
          error: null
        }));
        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isRecovering: false,
          error: 'Session recovery failed'
        }));
        return { success: false, error: 'Session recovery failed' };
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Recovery error';
      setAuthState(prev => ({
        ...prev,
        isRecovering: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    } finally {
      recoveryInProgressRef.current = false;
    }
  }, [address, recoverSession]);

  /**
   * Disconnect wallet and clear authentication
   */
  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await logout();
      wagmiDisconnect();
      
      // Reset state
      setAuthState({
        isAuthenticating: false,
        isRecovering: false,
        error: null,
        lastAttempt: null,
        retryCount: 0,
        canRetry: true
      });
      
      // Reset refs
      authInProgressRef.current = false;
      recoveryInProgressRef.current = false;
      autoAuthAttemptedRef.current = null;
      
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [logout, wagmiDisconnect]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
    clearContextError();
  }, [clearContextError]);

  /**
   * Reset retry state (for manual retry)
   */
  const resetRetryState = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      retryCount: 0,
      canRetry: true,
      error: null
    }));
    autoAuthAttemptedRef.current = null;
  }, []);

  // Computed properties
  const isWalletReady = isConnected && !!address && !!connector;
  const needsAuthentication = isWalletReady && !isAuthenticated;
  const canAutoAuthenticate = isWalletReady && !isAuthenticated && 
                             !authInProgressRef.current && 
                             !recoveryInProgressRef.current &&
                             authState.retryCount < MAX_RETRY_COUNT;

  /**
   * Handle network connectivity changes
   */
  useEffect(() => {
    const handleOnline = () => {
      if (needsAuthentication && address) {
        console.log('🌐 Back online, attempting authentication recovery');
        recoverAuthentication();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [needsAuthentication, address, recoverAuthentication]);

  /**
   * Expose additional methods for advanced usage
   */
  const enhancedMethods = {
    resetRetryState,
    getSessionStatus: () => enhancedAuthService.getSessionStatus(),
    forceRefresh: () => authenticate({ forceRefresh: true }),
    isRetryAvailable: () => authState.canRetry && authState.retryCount < MAX_RETRY_COUNT
  };

  return {
    walletInfo,
    authState,
    authenticate,
    recoverAuthentication,
    disconnect,
    clearError,
    isWalletReady,
    needsAuthentication,
    canAutoAuthenticate,
    ...enhancedMethods
  };
};

export default useEnhancedWalletAuth;