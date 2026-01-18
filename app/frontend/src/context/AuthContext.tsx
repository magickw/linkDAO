import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/router';
import { enhancedAuthService, KYCStatus } from '@/services/enhancedAuthService';
import { AuthUser, UserRole, Permission } from '@/types/auth';
import { useToast } from '@/context/ToastContext';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  kycStatus: KYCStatus | null;
  accessToken: string | null;
  login: (address: string, connector: any, status: string) => Promise<{ success: boolean; error?: string }>;
  loginWithNonCustodialWallet: (token: string, user: any) => Promise<{ success: boolean; error?: string }>;
  register: (userData: {
    address: string;
    handle: string;
    ens?: string;
    email?: string;
    preferences?: any;
    privacySettings?: any;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  connectWallet: () => Promise<void>;
  updatePreferences: (preferences: any) => Promise<{ success: boolean; error?: string }>;
  updatePrivacySettings: (privacySettings: any) => Promise<{ success: boolean; error?: string }>;
  initiateKYC: (tier: 'basic' | 'intermediate' | 'advanced') => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  refreshKYCStatus: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  enhancedAuthenticate: (options?: { forceRefresh?: boolean }) => Promise<{ success: boolean; error?: string }>;
  recoverSession: () => Promise<boolean>;
  getSessionStatus: () => any;
  ensureAuthenticated: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Start with isLoading: false to prevent blocking navigation on initial load
  // Authentication will happen in background and update state when complete
  const [isLoading, setIsLoading] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { addToast } = useToast();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    await enhancedAuthService.logout();
    setUser(null);
    setAccessToken(null);
    setKycStatus(null);
    if (isConnected) {
      disconnect();
    }
    console.log('👋 Logged out successfully');
  }, [disconnect, isConnected]);

  const syncAuthState = useCallback(async () => {
    // Don't set global isLoading for initial sync - this prevents blocking navigation
    // setIsLoading(true); -- REMOVED to prevent blocking navigation on page load
    try {
      const currentUser = await enhancedAuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setAccessToken(enhancedAuthService.getToken());
        const status = await enhancedAuthService.getKYCStatus();
        setKycStatus(status);
      } else {
        // No stored session - just clear state without calling logout
        setUser(null);
        setAccessToken(null);
        setKycStatus(null);
      }
    } catch (error) {
      console.error('Failed to sync auth state:', error);
      // Only logout on actual errors
      setUser(null);
      setAccessToken(null);
      setKycStatus(null);
    }
    // Don't need to set isLoading(false) since we didn't set it to true
  }, []);

  // Only sync auth state once on mount to prevent continuous reloads
  useEffect(() => {
    let mounted = true;

    const syncOnce = async () => {
      if (mounted) {
        try {
          await syncAuthState();
        } catch (error) {
          console.error('Auth sync error:', error);
        }
      }
    };

    // Defer sync to prevent blocking initial render
    // The 500ms delay prevents infinite reload loops
    const timeoutId = setTimeout(syncOnce, 500);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    // Only handle wallet changes if there's an actual change
    const sessionStatus = enhancedAuthService.getSessionStatus();

    // Skip during initial mount when there's no address yet
    // This prevents premature logout when page loads with a saved session
    if (!address) {
      // Only proceed if we have a session and wallet is actually disconnecting
      // Otherwise, skip to avoid clearing session during initial page load
      if (!sessionStatus.hasSession) {
        return; // No session, no address - initial state, do nothing
      }
      // If we have a session but no address, this might be a disconnect
      // But we should wait to see if wallet reconnects before logging out
      return;
    }

    // Skip if address matches current session (no actual change)
    if (sessionStatus.address &&
      address.toLowerCase() === sessionStatus.address.toLowerCase()) {
      return;
    }

    // At this point, either:
    // 1. We have a new address (wallet connected/changed)
    // 2. Address changed from previous session
    const handleWalletChangeAsync = async () => {
      await enhancedAuthService.handleWalletChange(address);
      // Sync auth state to ensure UI reflects the changes (e.g. logout)
      // and triggers re-authentication if needed
      await syncAuthState();
    };

    handleWalletChangeAsync();
  }, [address, syncAuthState]);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!address || !connector) {
        throw new Error('Please connect your wallet first.');
      }
      const result = await enhancedAuthService.authenticateWallet(address, connector, 'connected');
      if (result.success && result.user) {
        // Fire-and-forget: Don't await to prevent blocking
        syncAuthState().catch(err => console.error('Background auth sync failed:', err));
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      addToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [address, connector, syncAuthState, addToast]);

  const login = useCallback(async (walletAddress: string, connector: any, status: string): Promise<{ success: boolean; error?: string }> => {
    // Set loading state to prevent premature redirects during auth
    setIsLoading(true);
    try {
      const result = await enhancedAuthService.authenticateWallet(walletAddress, connector, status);
      if (result.success && result.user) {
        // Await state sync to ensure UI reflects authenticated state immediately
        await syncAuthState();
        addToast('Successfully authenticated!', 'success');
        return { success: true };
      }
      return { success: false, error: result.error || 'Authentication failed' };
    } catch (error: any) {
      addToast(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [syncAuthState, addToast]);

  const loginWithNonCustodialWallet = useCallback(async (token: string, user: any): Promise<{ success: boolean; error?: string }> => {
    // Set loading state to prevent premature redirects during auth
    setIsLoading(true);
    try {
      // Store the token and user data
      setUser(user);
      await syncAuthState();
      addToast('Successfully authenticated with non-custodial wallet!', 'success');
      return { success: true };
    } catch (error: any) {
      addToast(error.message, 'error');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [syncAuthState, addToast]);

  const register = async (userData: {
    address: string;
    handle: string;
    ens?: string;
    email?: string;
    preferences?: any;
    privacySettings?: any;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const result = await enhancedAuthService.register(userData);

      if (result.success && result.user) {
        setUser(result.user);
        await refreshKYCStatus();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (preferences: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await enhancedAuthService.updatePreferences(preferences);

      if (result.success && user) {
        setUser({
          ...user,
          preferences: { ...user.preferences, ...preferences }
        });
      }

      return result;
    } catch (error: any) {
      console.error('Failed to update preferences:', error);
      return { success: false, error: error.message || 'Update failed' };
    }
  };

  const updatePrivacySettings = async (privacySettings: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await enhancedAuthService.updatePrivacySettings(privacySettings);

      if (result.success && user) {
        setUser({
          ...user,
          privacySettings: { ...user.privacySettings, ...privacySettings }
        });
      }

      return result;
    } catch (error: any) {
      console.error('Failed to update privacy settings:', error);
      return { success: false, error: error.message || 'Update failed' };
    }
  };

  const initiateKYC = async (tier: 'basic' | 'intermediate' | 'advanced'): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await enhancedAuthService.initiateKYC(tier);

      if (result.success) {
        await refreshKYCStatus();
      }

      return result;
    } catch (error: any) {
      console.error('Failed to initiate KYC:', error);
      return { success: false, error: error.message || 'KYC initiation failed' };
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    await syncAuthState();
  }, [syncAuthState]);

  const refreshKYCStatus = useCallback(async (): Promise<void> => {
    const status = await enhancedAuthService.getKYCStatus();
    setKycStatus(status);
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    await enhancedAuthService.refreshToken();
    await syncAuthState();
  }, [syncAuthState]);

  const roleHierarchy: Record<UserRole, number> = {
    user: 0,
    moderator: 1,
    admin: 2,
    super_admin: 3
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    if (!user || !user.role) return false;
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission as unknown as string);
  };

  const isAdmin = hasRole('admin');
  const isModerator = hasRole('moderator');
  const isSuperAdmin = hasRole('super_admin');

  const enhancedAuthenticate = useCallback(async (options: { forceRefresh?: boolean } = {}): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected || !connector) {
      return { success: false, error: 'Wallet not connected' };
    }
    const result = await enhancedAuthService.authenticateWallet(address, connector, 'connected', options);
    if (result.success) {
      // Fire-and-forget: Don't await to prevent blocking
      syncAuthState().catch(err => console.error('Background auth sync failed:', err));
    }
    return result;
  }, [address, isConnected, connector, syncAuthState]);

  const recoverSession = useCallback(async (): Promise<boolean> => {
    if (!address) return false;
    const result = await enhancedAuthService.recoverAuthentication(address);
    if (result.success) {
      // Fire-and-forget: Don't await to prevent blocking
      syncAuthState().catch(err => console.error('Background auth sync failed:', err));
    }
    return result.success;
  }, [address, syncAuthState]);

  const getSessionStatus = useCallback(() => {
    return enhancedAuthService.getSessionStatus();
  }, []);

  const ensureAuthenticated = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (user && accessToken) {
      return { success: true };
    }
    if (!isConnected || !address || !connector) {
      return { success: false, error: 'Please connect your wallet first' };
    }
    return login(address, connector, 'connected');
  }, [user, accessToken, isConnected, address, connector, login]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    kycStatus,
    accessToken,
    login,
    loginWithNonCustodialWallet,
    register,
    logout: handleLogout,
    connectWallet,
    updatePreferences,
    updatePrivacySettings,
    initiateKYC,
    refreshUser,
    refreshKYCStatus,
    refreshToken,
    hasRole,
    hasPermission,
    isAdmin,
    isModerator,
    isSuperAdmin,
    enhancedAuthenticate,
    recoverSession,
    getSessionStatus,
    ensureAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;