import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { authService, KYCStatus } from '@/services/authService';
import { AuthUser } from '@/types/auth';
import { UserRole, Permission } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  kycStatus: KYCStatus | null;
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
  updatePreferences: (preferences: any) => Promise<{ success: boolean; error?: string }>;
  updatePrivacySettings: (privacySettings: any) => Promise<{ success: boolean; error?: string }>;
  initiateKYC: (tier: 'basic' | 'intermediate' | 'advanced') => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  refreshKYCStatus: () => Promise<void>;
  // Role-based access control
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      if (authService.isAuthenticated()) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          await loadKYCStatus();
        } else {
          // Token is invalid, clear it
          await authService.logout();
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

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

  // Login with wallet authentication
  const login = async (walletAddress: string, connector: any, status: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const result = await authService.authenticateWallet(walletAddress, connector, status);
      
      if (result.success && result.user) {
        setUser(result.user);
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
      setKycStatus(null);
      
      // Disconnect wallet if connected
      if (isConnected) {
        disconnect();
      }
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

  // Auto-refresh token periodically
  useEffect(() => {
    if (!authService.isAuthenticated()) return;

    const refreshInterval = setInterval(async () => {
      try {
        await authService.refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, logout user
        await handleLogout();
      }
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    kycStatus,
    login,
    register,
    logout: handleLogout,
    updatePreferences,
    updatePrivacySettings,
    initiateKYC,
    refreshUser,
    refreshKYCStatus,
    // Role-based access control
    hasRole,
    hasPermission,
    isAdmin,
    isModerator,
    isSuperAdmin,
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