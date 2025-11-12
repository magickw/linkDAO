import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { authService, KYCStatus } from '@/services/authService';
import { enhancedAuthService } from '@/services/enhancedAuthService';
import { sessionManager } from '@/services/sessionManager';
import { AuthUser } from '@/types/auth';
import { UserRole, Permission } from '@/types/auth';
import { useSessionValidation } from '@/hooks/useSessionValidation';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  kycStatus: KYCStatus | null;
  accessToken: string | null;
  login: (address: string, connector: any, status: string) => Promise<{ success: boolean; error?: string }>;
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
  // Role-based access control
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  
  // Enhanced authentication with session recovery
  enhancedAuthenticate: (options?: { forceRefresh?: boolean }) => Promise<{ success: boolean; error?: string }>;
  recoverSession: () => Promise<boolean>;
  getSessionStatus: () => any;
}

// Storage keys for session persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'linkdao_access_token',
  REFRESH_TOKEN: 'linkdao_refresh_token',
  WALLET_ADDRESS: 'linkdao_wallet_address',
  SIGNATURE_TIMESTAMP: 'linkdao_signature_timestamp',
  USER_DATA: 'linkdao_user_data'
};

// Token expiration time (24 hours)
const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { validateSession } = useSessionValidation();

  // Check if we have a valid stored session
  const checkStoredSession = useCallback(async () => {
    try {
      if (!address) return false;
      
      const sessionValidation = await validateSession(address);
      if (sessionValidation.isValid && sessionValidation.token) {
        // Try to get user data from storage
        const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUser(userData);
          setAccessToken(sessionValidation.token);
          console.log('✅ Restored wallet session from storage');
          return true;
        }
      }
    } catch (error) {
      console.error('Error checking stored session:', error);
    }
    return false;
  }, [address, validateSession]);

  // Clear stored session
  const clearStoredSession = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    });
  }, []);

  // Store session data
  const storeSession = useCallback((token: string, userData: AuthUser) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, userData.address);
      localStorage.setItem(STORAGE_KEYS.SIGNATURE_TIMESTAMP, Date.now().toString());
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      const hasValidSession = await checkStoredSession();
      if (!hasValidSession) {
        // Check if wallet is already connected
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            const accounts = await window.ethereum.request({
              method: 'eth_accounts',
            });
            if (accounts.length > 0) {
              console.log('👛 Wallet already connected, checking session...');
              // Wallet is connected but no valid session, user needs to sign again
            }
          } catch (error) {
            console.error('Error checking wallet connection:', error);
          }
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, [checkStoredSession]);

  // Handle wallet connection changes
  useEffect(() => {
    if (!isConnected && user) {
      // Wallet disconnected, logout user
      handleLogout();
    }
  }, [isConnected, user]);

  // Load KYC status
  const loadKYCStatus = async () => {
    if (authService.isAuthenticated()) {
      const status = await authService.getKYCStatus();
      setKycStatus(status);
    }
  };

  // Connect wallet without requiring signature if already connected
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!window.ethereum) {
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0];

      // Check if we already have a valid session for this address
      const sessionValidation = await validateSession(walletAddress);
      if (sessionValidation.isValid && sessionValidation.token) {
        console.log('✅ Using existing valid session');
        // Try to get user data from storage
        const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUser(userData);
          setAccessToken(sessionValidation.token);
          setIsLoading(false);
          return;
        }
      }

      // Only request signature if we don't have a valid session
      console.log('🔐 Requesting new signature for authentication...');
      const result = await authService.authenticateWallet(walletAddress, null, 'connected');
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setAccessToken(result.token);
        // Store session for persistence
        storeSession(result.token, result.user);
        console.log('✅ Authentication successful');
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      if (error.code === 4001) {
        throw new Error('Please approve the connection request in your wallet');
      } else if (error.code === -32002) {
        throw new Error('Please check your wallet - there may be a pending request');
      } else {
        throw new Error(error.message || 'Failed to connect wallet');
      }
    } finally {
      setIsLoading(false);
    }
  }, [storeSession, validateSession]);

  // Login with wallet authentication (legacy method for compatibility)
  const login = async (walletAddress: string, connector: any, status: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if already authenticated for this address
      if (user && user.address === walletAddress) {
        console.log('Already authenticated for address:', walletAddress);
        return { success: true };
      }

      // Check if we have a valid session for this address
      const sessionValidation = await validateSession(walletAddress);
      if (sessionValidation.isValid && sessionValidation.token) {
        console.log('✅ Using existing valid session');
        // Try to get user data from storage
        const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setUser(userData);
          setAccessToken(sessionValidation.token);
          await loadKYCStatus();
          return { success: true };
        }
      }
      
      setIsLoading(true);
      
      const result = await authService.authenticateWallet(walletAddress, connector, status);
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setAccessToken(result.token);
        // Store session for persistence
        storeSession(result.token, result.user);
        await loadKYCStatus();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Register new user
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
      
      const result = await authService.register(userData);
      
      if (result.success && result.user) {
        setUser(result.user);
        await loadKYCStatus();
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

  // Logout user
  const handleLogout = async (): Promise<void> => {
    try {
      await authService.logout();
      setUser(null);
      setAccessToken(null);
      setKycStatus(null);
      clearStoredSession();
      
      // Disconnect wallet if connected
      if (isConnected) {
        disconnect();
      }
      console.log('👋 Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Update user preferences
  const updatePreferences = async (preferences: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authService.updatePreferences(preferences);
      
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

  // Update privacy settings
  const updatePrivacySettings = async (privacySettings: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authService.updatePrivacySettings(privacySettings);
      
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

  // Initiate KYC verification
  const initiateKYC = async (tier: 'basic' | 'intermediate' | 'advanced'): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authService.initiateKYC(tier);
      
      if (result.success) {
        // Refresh KYC status
        await loadKYCStatus();
      }
      
      return result;
    } catch (error: any) {
      console.error('Failed to initiate KYC:', error);
      return { success: false, error: error.message || 'KYC initiation failed' };
    }
  };

  // Refresh user data
  const refreshUser = async (): Promise<void> => {
    if (authService.isAuthenticated()) {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    }
  };

  // Refresh KYC status
  const refreshKYCStatus = async (): Promise<void> => {
    await loadKYCStatus();
  };

  // Refresh token
  const refreshTokenMethod = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const result = await authService.refreshToken();
      if (result.success && result.token) {
        setAccessToken(result.token);
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.token);
        localStorage.setItem(STORAGE_KEYS.SIGNATURE_TIMESTAMP, Date.now().toString());
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // Only logout if it's a critical auth error, not network issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        console.log('Authentication expired, logging out');
        await handleLogout();
      }
    }
  }, [handleLogout]);

  // Role hierarchy: super_admin > admin > moderator > user
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

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          handleLogout();
        } else if (user && accounts[0] !== user.address) {
          // Account changed, need to re-authenticate
          handleLogout();
        }
      };

      const handleChainChanged = (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        if (user) {
          setUser({ ...user, chainId: newChainId });
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

  // Enhanced authentication method
  const enhancedAuthenticate = useCallback(async (options: { forceRefresh?: boolean } = {}): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected || !connector) {
      return { success: false, error: 'Wallet not connected' };
    }

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
        await loadKYCStatus();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Authentication error' };
    }
  }, [address, isConnected, connector, loadKYCStatus]);

  // Session recovery method
  const recoverSession = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    try {
      const result = await enhancedAuthService.recoverAuthentication(address);
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setAccessToken(result.token);
        await loadKYCStatus();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Session recovery failed:', error);
      return false;
    }
  }, [address, loadKYCStatus]);

  // Get session status
  const getSessionStatus = useCallback(() => {
    return {
      ...enhancedAuthService.getSessionStatus(),
      ...sessionManager.getSessionStatus()
    };
  }, []);

  // Auto-refresh token periodically (less aggressive)
  useEffect(() => {
    if (!accessToken || !user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshTokenMethod();
      } catch (error) {
        console.error('Token refresh error:', error);
        // Only logout if it's a critical auth error, not network issues
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
          console.log('Authentication expired, logging out');
          await handleLogout();
        }
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes (less aggressive)

    return () => clearInterval(refreshInterval);
  }, [user, accessToken, refreshTokenMethod, handleLogout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    kycStatus,
    accessToken,
    login,
    register,
    logout: handleLogout,
    connectWallet,
    updatePreferences,
    updatePrivacySettings,
    initiateKYC,
    refreshUser,
    refreshKYCStatus,
    refreshToken: refreshTokenMethod,
    // Role-based access control
    hasRole,
    hasPermission,
    isAdmin,
    isModerator,
    isSuperAdmin,
    // Enhanced authentication methods
    enhancedAuthenticate,
    recoverSession,
    getSessionStatus,
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