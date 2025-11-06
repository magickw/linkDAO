/**
 * Enhanced Authentication Context
 * Provides resilient authentication state management with session persistence,
 * automatic recovery, and proper error handling for wallet connections
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { enhancedAuthService, AuthResponse } from '@/services/enhancedAuthService';
import { AuthUser } from '@/types/auth';
import { UserRole, Permission } from '@/types/auth';

interface EnhancedAuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRecovering: boolean;
  error: string | null;
  accessToken: string | null;
  sessionStatus: any;
  
  // Authentication methods
  authenticateWallet: (options?: { forceRefresh?: boolean }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  
  // Session recovery
  recoverSession: () => Promise<boolean>;
  
  // Role-based access control
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export const EnhancedAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Refs to prevent multiple simultaneous operations
  const authInProgressRef = useRef(false);
  const recoveryInProgressRef = useRef(false);
  const lastAddressRef = useRef<string | null>(null);

  /**
   * Initialize authentication state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        // Try to get current user from stored session
        const currentUser = await enhancedAuthService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setAccessToken(enhancedAuthService.getToken());
          console.log('✅ Authentication initialized from stored session');
        } else {
          console.log('ℹ️ No valid stored session found');
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Handle wallet connection changes
   */
  useEffect(() => {
    const handleWalletChange = async () => {
      // Skip if we're already processing
      if (authInProgressRef.current || recoveryInProgressRef.current) return;

      const currentAddress = address?.toLowerCase();
      const lastAddress = lastAddressRef.current?.toLowerCase();

      // Update last address reference
      lastAddressRef.current = currentAddress || null;

      if (!isConnected || !currentAddress) {
        // Wallet disconnected
        if (user) {
          console.log('👛 Wallet disconnected, logging out');
          await handleLogout();
        }
        return;
      }

      // Check if address changed
      if (lastAddress && lastAddress !== currentAddress) {
        console.log('👛 Wallet address changed, clearing session');
        await handleLogout();
        return;
      }

      // Auto-authenticate if wallet is connected but user is not authenticated
      if (!user && currentAddress) {
        console.log('👛 Wallet connected, attempting authentication');
        await authenticateWallet({ forceRefresh: false });
      }
    };

    handleWalletChange();
  }, [isConnected, address, user]);

  /**
   * Handle network connectivity changes
   */
  useEffect(() => {
    const handleOnline = async () => {
      if (user && address && !enhancedAuthService.isAuthenticated()) {
        console.log('🌐 Back online, attempting session recovery');
        await recoverSession();
      }
    };

    const handleOffline = () => {
      console.log('🌐 Gone offline, authentication may be affected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, address]);

  /**
   * Authenticate wallet with enhanced error handling
   */
  const authenticateWallet = useCallback(async (options: { forceRefresh?: boolean } = {}): Promise<AuthResponse> => {
    if (authInProgressRef.current) {
      return { success: false, error: 'Authentication already in progress' };
    }

    if (!isConnected || !address || !connector) {
      const errorMsg = 'Wallet not connected';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    authInProgressRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await enhancedAuthService.authenticateWallet(
        address,
        connector,
        'connected',
        {
          forceRefresh: options.forceRefresh,
          timeout: 30000,
          retries: 3
        }
      );

      if (result.success && result.user && result.token) {
        setUser(result.user);
        setAccessToken(result.token);
        console.log('✅ Wallet authentication successful');
        return result;
      } else {
        const errorMsg = result.error || 'Authentication failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Authentication error';
      console.error('Wallet authentication error:', error);
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
      authInProgressRef.current = false;
    }
  }, [isConnected, address, connector]);

  /**
   * Recover session after network interruption
   */
  const recoverSession = useCallback(async (): Promise<boolean> => {
    if (recoveryInProgressRef.current || !address) {
      return false;
    }

    recoveryInProgressRef.current = true;
    setIsRecovering(true);
    setError(null);

    try {
      const result = await enhancedAuthService.recoverAuthentication(address);
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setAccessToken(result.token);
        console.log('✅ Session recovered successfully');
        return true;
      } else {
        console.log('❌ Session recovery failed:', result.error);
        if (result.retryable) {
          setError('Session expired - please sign in again');
        }
        return false;
      }
    } catch (error: any) {
      console.error('Session recovery error:', error);
      setError('Failed to recover session');
      return false;
    } finally {
      setIsRecovering(false);
      recoveryInProgressRef.current = false;
    }
  }, [address]);

  /**
   * Refresh current session
   */
  const refreshSession = useCallback(async (): Promise<void> => {
    if (!enhancedAuthService.isAuthenticated()) {
      return;
    }

    try {
      const result = await enhancedAuthService.refreshToken();
      
      if (result.success && result.token) {
        setAccessToken(result.token);
        if (result.user) {
          setUser(result.user);
        }
        console.log('✅ Session refreshed successfully');
      } else {
        console.warn('Session refresh failed:', result.error);
        if (!result.retryable) {
          await handleLogout();
        }
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  }, []);

  /**
   * Logout with proper cleanup
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await enhancedAuthService.logout();
      setUser(null);
      setAccessToken(null);
      setError(null);
      
      // Disconnect wallet if connected
      if (isConnected) {
        disconnect();
      }
      
      console.log('👋 Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state even if logout request fails
      setUser(null);
      setAccessToken(null);
    }
  }, [isConnected, disconnect]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle wallet account changes
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          handleLogout();
        } else if (user && accounts[0].toLowerCase() !== user.address.toLowerCase()) {
          // Account changed, need to re-authenticate
          console.log('👛 Account changed, re-authenticating');
          handleLogout();
        }
      };

      const handleChainChanged = (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        if (user && user.chainId && user.chainId !== newChainId) {
          console.log('⛓️ Chain changed, updating user data');
          setUser(prev => prev ? { ...prev, chainId: newChainId } : null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [user, handleLogout]);

  /**
   * Periodic session validation
   */
  useEffect(() => {
    if (!user || !accessToken) return;

    const validateSession = async () => {
      try {
        const currentUser = await enhancedAuthService.getCurrentUser();
        if (!currentUser) {
          console.log('⚠️ Session validation failed, logging out');
          await handleLogout();
        }
      } catch (error) {
        console.warn('Session validation error:', error);
      }
    };

    // Validate session every 5 minutes
    const interval = setInterval(validateSession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, accessToken, handleLogout]);

  // Role-based access control
  const roleHierarchy: Record<UserRole, number> = {
    user: 0,
    moderator: 1,
    admin: 2,
    super_admin: 3
  };

  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!user || !user.role) return false;
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }, [user]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission as unknown as string);
  }, [user]);

  const isAdmin = hasRole('admin');
  const isModerator = hasRole('moderator');
  const isSuperAdmin = hasRole('super_admin');

  // Get session status for debugging
  const sessionStatus = enhancedAuthService.getSessionStatus();

  const value: EnhancedAuthContextType = {
    user,
    isAuthenticated: !!user && !!accessToken && enhancedAuthService.isAuthenticated(),
    isLoading,
    isRecovering,
    error,
    accessToken,
    sessionStatus,
    
    // Methods
    authenticateWallet,
    logout: handleLogout,
    refreshSession,
    clearError,
    recoverSession,
    
    // Role-based access control
    hasRole,
    hasPermission,
    isAdmin,
    isModerator,
    isSuperAdmin,
  };

  return (
    <EnhancedAuthContext.Provider value={value}>
      {children}
    </EnhancedAuthContext.Provider>
  );
};

export const useEnhancedAuth = () => {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
};

export default EnhancedAuthContext;