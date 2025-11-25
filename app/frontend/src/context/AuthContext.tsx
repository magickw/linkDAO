import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { authService, KYCStatus } from '@/services/authService';
import { enhancedAuthService } from '@/services/enhancedAuthService';
import { sessionManager } from '@/services/sessionManager';
import { AuthUser } from '@/types/auth';
import { UserRole, Permission } from '@/types/auth';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { useToast } from '@/context/ToastContext';

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
  const { addToast } = useToast();

  // Store session data - must be defined before checkStoredSession
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

  // Check if we have a valid stored session
  const checkStoredSession = useCallback(async () => {
    try {
      if (!address) return false;

      const normalizedAddress = address.toLowerCase();

      const sessionValidation = await validateSession(address);
      if (sessionValidation.isValid && sessionValidation.token) {
        // Try to get user data from storage first
        const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            setAccessToken(sessionValidation.token);
            console.log('✅ Restored wallet session from storage');
            return true;
          } catch (error) {
            console.warn('Failed to parse stored user data:', error);
          }
        }

        // If no user data in storage, try to fetch from auth service
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
            setUser(currentUser);
            setAccessToken(sessionValidation.token);
            // Store for future use
            storeSession(sessionValidation.token, currentUser);
            console.log('✅ Restored wallet session from auth service');
            return true;
          }
        } catch (error) {
          console.warn('Failed to get user from auth service:', error);
        }

        // Also try enhanced auth service
        try {
          const currentUser = await enhancedAuthService.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
            setUser(currentUser);
            setAccessToken(sessionValidation.token);
            // Store for future use
            storeSession(sessionValidation.token, currentUser);
            console.log('✅ Restored wallet session from enhanced auth service');
            return true;
          }
        } catch (error) {
          console.warn('Failed to get user from enhanced auth service:', error);
        }
      }
    } catch (error) {
      console.error('Error checking stored session:', error);
    }
    return false;
  }, [address, validateSession, storeSession]);

  // Initialize authentication state with comprehensive session checking
  // This should only run once on mount to avoid circular dependencies
  const initAuthRef = useRef(false);
  
  useEffect(() => {
    const initAuth = async () => {
      // Prevent multiple initializations
      if (initAuthRef.current) {
        return;
      }
      initAuthRef.current = true;
      
      setIsLoading(true);

      try {
        // First check our internal session state
        const currentAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const currentUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

        if (currentAccessToken && currentUserData) {
          try {
            const userData = JSON.parse(currentUserData);
            setUser(userData);
            setAccessToken(currentAccessToken);
            console.log('✅ Using existing session from localStorage');
            return;
          } catch (error) {
            console.warn('Failed to parse stored user data:', error);
          }
        }

        // Then check stored session with validation
        const hasValidSession = await checkStoredSession();
        if (hasValidSession) {
          console.log('✅ Restored session from validateSession');
          return;
        }

        // Also check if authService has a valid session
        if (authService.isAuthenticated()) {
          try {
            const currentUser = await authService.getCurrentUser();
            if (currentUser && currentUser.address) {
              const token = authService.getToken();
              if (token) {
                setUser(currentUser);
                setAccessToken(token);
                // Store in localStorage to persist
                storeSession(token, currentUser);
                console.log('✅ Using existing valid session from authService');
                return;
              }
            }
          } catch (error) {
            console.warn('Failed to validate existing authService session:', error);
          }
        }

        // Also check enhancedAuthService
        const sessionStatus = enhancedAuthService.getSessionStatus();
        if (sessionStatus.isAuthenticated && sessionStatus.address) {
          try {
            const currentUser = await enhancedAuthService.getCurrentUser();
            if (currentUser && currentUser.address) {
              setUser(currentUser);
              setAccessToken(enhancedAuthService.getToken());
              console.log('✅ Using existing valid session from enhancedAuthService');
              return;
            }
          } catch (error) {
            console.warn('Failed to validate existing enhancedAuthService session:', error);
          }
        }

        // Check if wallet is already connected but no valid session exists
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            // Create a fresh request object to avoid MetaMask frozen object issues
            const accounts = await window.ethereum.request({
              method: 'eth_accounts',
            }).catch((err: any) => {
              // Silently handle MetaMask requestId errors
              if (err.message?.includes('requestId') || err.message?.includes('read only')) {
                return [];
              }
              throw err;
            });
            if (accounts && accounts.length > 0) {
              console.log('👛 Wallet already connected, no valid session found - will require signature when needed');
            }
          } catch (error: any) {
            // Only log if it's not a MetaMask internal error
            if (!error.message?.includes('requestId') && !error.message?.includes('read only')) {
              console.error('Error checking wallet connection:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []); // Empty dependency array - only run once on mount

  // Handle wallet connection changes with enhanced session persistence
  useEffect(() => {
    const handleWalletConnectionChange = async () => {
      // Only logout if wallet is disconnected and we have a user
      if (!isConnected && user) {
        console.log('🔗 Wallet disconnected, logging out user');
        handleLogout();
        return;
      }
      
      // If wallet is connected but no user, try to restore session
      if (isConnected && address && !user && !isLoading) {
        console.log('🔗 Wallet connected, checking for existing session...');
        const hasValidSession = await checkStoredSession();
        if (hasValidSession) {
          console.log('✅ Restored session without requiring signature');
        } else {
          console.log('🔐 No valid session found, signature will be required when needed');
        }
        return;
      }
      
      // Handle wallet address changes more carefully (case-insensitive)
      if (isConnected && address && user) {
        // Check if this is a real address change vs. initial connection
        if (user.address && user.address.toLowerCase() !== address.toLowerCase()) {
          console.log('🔗 Wallet address changed from', user.address, 'to', address, 'logging out old user');
          handleLogout();
        }
        // If user.address is undefined or empty, it might be an initial connection, don't logout
      }
    };

    handleWalletConnectionChange();
  }, [isConnected, address, user, isLoading, checkStoredSession]);

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
      const normalizedWalletAddress = walletAddress.toLowerCase();

      // Check if we already have a valid session for this address in multiple places
      // First check the stored session in localStorage (case-insensitive)
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
      const storedTimestamp = localStorage.getItem(STORAGE_KEYS.SIGNATURE_TIMESTAMP);
      const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedAddress?.toLowerCase() === normalizedWalletAddress && storedTimestamp && storedUserData) {
        const timestamp = parseInt(storedTimestamp);
        const now = Date.now();
        const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

        if (now - timestamp < TOKEN_EXPIRY_TIME) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            setAccessToken(storedToken);
            setIsLoading(false);
            console.log('✅ Using existing valid session from localStorage');
            return;
          } catch (parseError) {
            console.warn('Failed to parse stored user data, proceeding with new authentication');
          }
        } else {
          console.log('⏰ Stored session expired, clearing and requesting new signature');
          // Clear expired session
          Object.values(STORAGE_KEYS).forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              console.warn(`Failed to remove ${key} from localStorage:`, error);
            }
          });
        }
      }

      // Check if we already have a valid session using validateSession function
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

      // Check if authService already has a token for this address (case-insensitive)
      if (authService.isAuthenticated()) {
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === normalizedWalletAddress) {
            const token = authService.getToken();
            if (token) {
              setUser(currentUser);
              setAccessToken(token);
              setIsLoading(false);
              console.log('✅ Using existing valid session from authService');
              return;
            }
          }
        } catch (error) {
          console.warn('Failed to validate existing authService session:', error);
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
    console.log('🔐 Login called for address:', walletAddress);

    // Normalize address to lowercase for case-insensitive comparisons
    const normalizedAddress = walletAddress.toLowerCase();

    try {
      // Check if already authenticated for this address (case-insensitive)
      if (user && user.address?.toLowerCase() === normalizedAddress && accessToken) {
        console.log('✅ Already authenticated for address:', walletAddress);
        return { success: true };
      }

      // First check the stored session in localStorage with proper validation
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
      const storedTimestamp = localStorage.getItem(STORAGE_KEYS.SIGNATURE_TIMESTAMP);
      const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedAddress?.toLowerCase() === normalizedAddress && storedTimestamp && storedUserData) {
        const timestamp = parseInt(storedTimestamp);
        const now = Date.now();
        const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

        if (now - timestamp < TOKEN_EXPIRY_TIME) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            setAccessToken(storedToken);
            await loadKYCStatus();
            console.log('✅ Using existing valid session from localStorage for:', walletAddress);
            return { success: true };
          } catch (parseError) {
            console.warn('Failed to parse stored user data, proceeding with new authentication');
          }
        } else {
          console.log('⏰ Stored session expired, clearing and requesting new signature');
          // Clear expired session
          Object.values(STORAGE_KEYS).forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              console.warn(`Failed to remove ${key} from localStorage:`, error);
            }
          });
        }
      }

      // Check if authService already has a token for this address (case-insensitive)
      if (authService.isAuthenticated()) {
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
            const token = authService.getToken();
            if (token) {
              setUser(currentUser);
              setAccessToken(token);
              // Store in localStorage for persistence across page refreshes
              storeSession(token, currentUser);
              await loadKYCStatus();
              console.log('✅ Using existing valid session from authService for:', walletAddress);
              return { success: true };
            }
          }
        } catch (error) {
          console.warn('Failed to validate existing authService session:', error);
        }
      }

      // Check enhancedAuthService as fallback (case-insensitive)
      const sessionStatus = enhancedAuthService.getSessionStatus();
      if (sessionStatus.isAuthenticated && sessionStatus.address?.toLowerCase() === normalizedAddress) {
        try {
          const currentUser = await enhancedAuthService.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
            const token = enhancedAuthService.getToken();
            if (token) {
              setUser(currentUser);
              setAccessToken(token);
              // Store in localStorage for persistence across page refreshes
              storeSession(token, currentUser);
              await loadKYCStatus();
              console.log('✅ Using existing valid session from enhancedAuthService for:', walletAddress);
              return { success: true };
            }
          }
        } catch (error) {
          console.warn('Failed to validate existing enhancedAuthService session:', error);
        }
      }

      // Check validateSession as final check before requesting signature
      const sessionValidation = await validateSession(walletAddress);
      if (sessionValidation.isValid && sessionValidation.token) {
        console.log('✅ Using existing valid session from validateSession for:', walletAddress);
        // Try to get user data from storage or fetch from backend
        const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (storedUserData) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            setAccessToken(sessionValidation.token);
            await loadKYCStatus();
            return { success: true };
          } catch (error) {
            console.warn('Failed to parse stored user data:', error);
          }
        }

        // Try to fetch user from backend
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
            setUser(currentUser);
            setAccessToken(sessionValidation.token);
            storeSession(sessionValidation.token, currentUser);
            await loadKYCStatus();
            return { success: true };
          }
        } catch (error) {
          console.warn('Failed to fetch user from backend:', error);
        }
      }

      // Only proceed with wallet signature if no valid session exists
      console.log('📝 No valid session found for address:', walletAddress, 'requesting wallet signature...');

      setIsLoading(true);

      const result = await authService.authenticateWallet(walletAddress, connector, status);
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        setAccessToken(result.token);
        // Store session for persistence
        storeSession(result.token, result.user);
        await loadKYCStatus();
        console.log('✅ Authentication successful for address:', walletAddress);
        
        // Show success notification
        addToast('Successfully authenticated!', 'success', 3000);
        
        return { success: true };
      } else {
        console.log('❌ Authentication failed for address:', walletAddress, 'error:', result.error);
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error: any) {
      console.error('Login failed for address:', walletAddress, error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Login failed';
      let toastType: 'error' | 'warning' | 'info' = 'error';
      
      if (error.message) {
        if (error.message.includes('403')) {
          errorMessage = 'Authentication blocked. Please try again later.';
          toastType = 'warning';
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please check your wallet connection.';
        } else if (error.message.includes('429')) {
          errorMessage = 'Too many authentication attempts. Please wait a moment and try again.';
          toastType = 'info';
        } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
          errorMessage = 'Network connection issue. Some features may be limited.';
          toastType = 'warning';
        } else {
          errorMessage = error.message;
        }
      }
      
      // Show user-friendly notification
      addToast(errorMessage, toastType, 5000);
      
      return { success: false, error: errorMessage };
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
          // No accounts - wallet disconnected
          handleLogout();
        } else if (user && user.address && accounts[0] !== user.address) {
          // Account changed to a completely different one, need to re-authenticate
          console.log('👛 Account changed, re-authenticating');
          handleLogout();
        } else if (user && !user.address && accounts[0]) {
          // First account connection, don't logout - just let the wallet connection effect handle it
          console.log('👛 Account connected, will be handled by wallet connection effect');
        }
      };

      const handleChainChanged = (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        if (user) {
          setUser({ ...user, chainId: newChainId });
        }
      };

      try {
        // Use try-catch to handle read-only property errors from wallet providers
        const ethereum = window.ethereum;

        // Check if the provider supports event listeners properly
        if (ethereum && typeof ethereum.on === 'function') {
          ethereum.on('accountsChanged', handleAccountsChanged);
          ethereum.on('chainChanged', handleChainChanged);

          return () => {
            try {
              if (ethereum && typeof ethereum.removeListener === 'function') {
                ethereum.removeListener('accountsChanged', handleAccountsChanged);
                ethereum.removeListener('chainChanged', handleChainChanged);
              }
            } catch (error) {
              // Ignore cleanup errors - wallet provider may have been removed
              console.debug('Error removing ethereum event listeners:', error);
            }
          };
        }
      } catch (error) {
        // Handle read-only property errors silently
        console.debug('Error setting up ethereum event listeners:', error);
      }
    }
  }, [user, handleLogout]);

  // Enhanced authentication method
  const enhancedAuthenticate = useCallback(async (options: { forceRefresh?: boolean } = {}): Promise<{ success: boolean; error?: string }> => {
    if (!address || !isConnected || !connector) {
      return { success: false, error: 'Wallet not connected' };
    }

    const normalizedAddress = address.toLowerCase();

    // Check for existing valid session first to avoid unnecessary signature requests
    if (!options.forceRefresh) {
      // Check the stored session in localStorage (case-insensitive)
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
      const storedTimestamp = localStorage.getItem(STORAGE_KEYS.SIGNATURE_TIMESTAMP);
      const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedAddress?.toLowerCase() === normalizedAddress && storedTimestamp && storedUserData) {
        const timestamp = parseInt(storedTimestamp);
        const now = Date.now();
        const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

        if (now - timestamp < TOKEN_EXPIRY_TIME) {
          try {
            const userData = JSON.parse(storedUserData);
            setUser(userData);
            setAccessToken(storedToken);
            await loadKYCStatus();
            console.log('✅ Using existing valid session from localStorage');
            return { success: true };
          } catch (parseError) {
            console.warn('Failed to parse stored user data, proceeding with new authentication');
          }
        } else {
          console.log('⏰ Stored session expired, clearing and requesting new signature');
          // Clear expired session
          Object.values(STORAGE_KEYS).forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              console.warn(`Failed to remove ${key} from localStorage:`, error);
            }
          });
        }
      }

      // Check enhanced auth service session (case-insensitive)
      const sessionStatus = enhancedAuthService.getSessionStatus();
      if (sessionStatus.isAuthenticated && sessionStatus.address?.toLowerCase() === normalizedAddress) {
        try {
          const currentUser = await enhancedAuthService.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
            setUser(currentUser);
            setAccessToken(enhancedAuthService.getToken());
            await loadKYCStatus();
            console.log('✅ Using existing valid session from enhancedAuthService');
            return { success: true };
          }
        } catch (error) {
          console.warn('Failed to validate existing enhancedAuthService session:', error);
        }
      }
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