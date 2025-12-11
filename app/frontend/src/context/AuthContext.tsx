import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/router';
import { authService, KYCStatus } from '@/services/authService';
import { enhancedAuthService } from '@/services/enhancedAuthService';
import { sessionManager } from '@/services/sessionManager';
import { AuthUser } from '@/types/auth';
import { UserRole, Permission } from '@/types/auth';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { useToast } from '@/context/ToastContext';

// Global authentication lock to prevent concurrent auth processes
let globalAuthLock = false;
let globalAuthLockTimestamp = 0;
let globalAuthLockTimeout = 0; // timeout (ms) used for the current lock

// Timeouts (ms) for different connector types (defaults can be overridden via env)
// REDUCED timeouts to prevent navigation blocking
const DEFAULT_SOFTWARE_LOCK_TIMEOUT = 500; // 500ms for software wallets (reduced from 1s)
const DEFAULT_HARDWARE_LOCK_TIMEOUT = 1000; // 1s for hardware wallets (reduced from 3s)

// Parse env-provided timeout values safely (milliseconds)
const parseEnvTimeout = (envVar: string | undefined, fallback: number): number => {
  if (typeof envVar === 'undefined' || envVar === '') return fallback;
  const n = Number(envVar);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
};

// Read Next.js public env vars (available at build time and exposed to client)
const SOFTWARE_LOCK_TIMEOUT_MS = typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_AUTH_LOCK_TIMEOUT_SOFTWARE
  ? parseEnvTimeout(process.env.NEXT_PUBLIC_AUTH_LOCK_TIMEOUT_SOFTWARE, DEFAULT_SOFTWARE_LOCK_TIMEOUT)
  : DEFAULT_SOFTWARE_LOCK_TIMEOUT;

const HARDWARE_LOCK_TIMEOUT_MS = typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_AUTH_LOCK_TIMEOUT_HARDWARE
  ? parseEnvTimeout(process.env.NEXT_PUBLIC_AUTH_LOCK_TIMEOUT_HARDWARE, DEFAULT_HARDWARE_LOCK_TIMEOUT)
  : DEFAULT_HARDWARE_LOCK_TIMEOUT;

// Detect hardware wallets by connector id/name
const isHardwareConnector = (connector?: any): boolean => {
  if (!connector) return false;
  const id = (connector.id || '').toString().toLowerCase();
  const name = (connector.name || '').toString().toLowerCase();

  const hardwareIdentifiers = ['ledger', 'trezor', 'coldcard', 'bitbox', 'keepkey'];
  return hardwareIdentifiers.some(h => id.includes(h) || name.includes(h));
};

// Get lock timeout based on connector type
const getAuthLockTimeout = (connector?: any): number => {
  return isHardwareConnector(connector) ? HARDWARE_LOCK_TIMEOUT_MS : SOFTWARE_LOCK_TIMEOUT_MS;
};

// Global authentication queue to serialize auth attempts
let authQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  args: [string, any, string];
}> = [];
let isProcessingQueue = false;

// Helper to acquire auth lock (connector-aware timeout)
const acquireAuthLock = (connector?: any): boolean => {
  const now = Date.now();
  const timeoutMs = getAuthLockTimeout(connector);

  // Release stale lock if it exceeded the previously set timeout
  if (globalAuthLock && now - globalAuthLockTimestamp > (globalAuthLockTimeout || timeoutMs)) {
    console.log('🔓 Releasing stale auth lock');
    globalAuthLock = false;
    globalAuthLockTimeout = 0;
  }

  if (globalAuthLock) {
    return false;
  }

  globalAuthLock = true;
  globalAuthLockTimestamp = now;
  globalAuthLockTimeout = timeoutMs;
  return true;
};

// Helper to release auth lock
const releaseAuthLock = () => {
  globalAuthLock = false;
  globalAuthLockTimestamp = 0;
  globalAuthLockTimeout = 0;
};

// Export for use by WalletLoginBridge
export const isAuthLocked = () => globalAuthLock;

// Export helpers and defaults for testing and configuration
export const DEFAULT_SOFTWARE_LOCK_TIMEOUT_MS = DEFAULT_SOFTWARE_LOCK_TIMEOUT;
export const DEFAULT_HARDWARE_LOCK_TIMEOUT_MS = DEFAULT_HARDWARE_LOCK_TIMEOUT;
export const EFFECTIVE_SOFTWARE_LOCK_TIMEOUT_MS = SOFTWARE_LOCK_TIMEOUT_MS;
export const EFFECTIVE_HARDWARE_LOCK_TIMEOUT_MS = HARDWARE_LOCK_TIMEOUT_MS;

export { isHardwareConnector, getAuthLockTimeout, acquireAuthLock, releaseAuthLock };

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
  // Ensure user is authenticated before performing an action
  ensureAuthenticated: () => Promise<{ success: boolean; error?: string }>;
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

  // Add authentication cooldown tracking using ref to prevent re-render loops
  // Using ref instead of state because we don't want changes to trigger re-renders
  const lastAuthTimeRef = useRef<number>(0);
  const AUTH_COOLDOWN = 50; // 50ms cooldown between auth attempts (reduced from 100ms)

  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { validateSession } = useSessionValidation();
  const { addToast } = useToast();
  const router = useRouter();

  // Track disconnect debounce to prevent false disconnection during state transitions
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDisconnectingRef = useRef(false);

  // Refs to avoid stale closure issues in processAuthQueue and prevent circular dependencies
  const performLoginRef = useRef<(walletAddress: string, connector: any, status: string) => Promise<{ success: boolean; error?: string }>>();
  const isProcessingQueueRef = useRef(false);

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
  // Memoized with useCallback to prevent infinite re-render loops
  const checkStoredSession = useCallback(async () => {
    try {
      // First check if we have a token in localStorage (most common case for returning users)
      const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedUserData = localStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (storedToken && storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          // Check if token is not expired (24 hours)
          const timestamp = parseInt(localStorage.getItem(STORAGE_KEYS.SIGNATURE_TIMESTAMP) || '0');
          const now = Date.now();
          const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

          if (now - timestamp < TOKEN_EXPIRY_TIME) {
            setUser(userData);
            setAccessToken(storedToken);
            console.log('✅ Restored existing session from localStorage');
            return true;
          } else {
            // Token expired, clear it
            clearStoredSession();
            console.log('⏰ Stored session expired, cleared');
          }
        } catch (error) {
          console.warn('Failed to parse stored user data:', error);
          clearStoredSession();
        }
      }

      // If we have an address but no valid session, check with backend
      if (address) {
        const normalizedAddress = address.toLowerCase();
        const sessionValidation = await validateSession(address);

        if (sessionValidation.isValid && sessionValidation.token) {
          // Try to get user data
          try {
            const currentUser = await authService.getCurrentUser();
            if (currentUser && currentUser.address?.toLowerCase() === normalizedAddress) {
              setUser(currentUser);
              setAccessToken(sessionValidation.token);
              storeSession(sessionValidation.token, currentUser);
              console.log('✅ Restored session from backend');
              return true;
            }
          } catch (error) {
            console.warn('Failed to get user from auth service:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error checking stored session:', error);
    }
    return false;
  }, [address, clearStoredSession, storeSession, validateSession]);

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

      // Try to acquire global auth lock
      if (!acquireAuthLock(connector)) {
        console.log('⏳ Auth initialization skipped - another auth process is running');
        setIsLoading(false);
        return;
      }

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
        releaseAuthLock();
      }
    };

    initAuth();
  }, []); // Empty dependency array - only run once on mount

  // Handle wallet connection changes with enhanced session persistence
  // IMPORTANT: Uses debounce to prevent false disconnection during state transitions
  useEffect(() => {
    const handleWalletConnectionChange = async () => {
      // Clear any pending disconnect timeout if wallet is now connected
      if (isConnected && disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
        isDisconnectingRef.current = false;
        console.log('🔗 Wallet reconnected, cancelling pending logout');
      }

      // Only logout if wallet is disconnected and we have a user
      // Use a debounce to prevent false disconnects during state transitions
      if (!isConnected && user && !isDisconnectingRef.current) {
        // Don't immediately logout - wait to confirm it's a real disconnect
        isDisconnectingRef.current = true;
        console.log('🔗 Wallet appears disconnected, waiting to confirm...');

        // Clear any existing timeout
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
        }

        // Wait 50ms to confirm it's a real disconnect, not a state transition (reduced from 100ms)
        disconnectTimeoutRef.current = setTimeout(() => {
          // Double-check that wallet is still disconnected before logging out
          // We check isConnected again via the closure, but also check localStorage as backup
          const storedAddress = localStorage.getItem('linkdao_wallet_address');
          const storedToken = localStorage.getItem('linkdao_access_token');

          // If we still have stored credentials, the disconnect might be temporary
          if (storedToken && storedAddress) {
            console.log('🔗 Stored session exists, checking if wallet reconnected...');
            // Don't logout if we have a valid stored session - let the next render cycle handle it
            isDisconnectingRef.current = false;
            return;
          }

          console.log('🔗 Wallet disconnected confirmed, logging out user');
          handleLogout();
          isDisconnectingRef.current = false;
        }, 500); // Reduced from 1500ms

        return;
      }

      // Reset disconnecting flag if connected
      if (isConnected) {
        isDisconnectingRef.current = false;
      }

      // If wallet is connected but no user, try to restore session (non-blocking)
      if (isConnected && address && !user && !isLoading) {
        const now = Date.now();
        if (now - lastAuthTimeRef.current >= AUTH_COOLDOWN) {
          // Check if auth is already in progress using the helper function
          if (isAuthLocked()) {
            console.log('⏳ Auth lock active, skipping session check');
            return;
          }
          // Non-blocking session check - don't wait for it
          lastAuthTimeRef.current = now;
          checkStoredSession().then(hasValidSession => {
            if (hasValidSession) {
              console.log('✅ Restored session without requiring signature');
            } else {
              console.log('🔐 No valid session found, signature will be required when needed');
            }
          }).catch(err => {
            console.warn('Session check failed:', err);
          });
        } else {
          console.log('⏳ Wallet connection change cooldown active, skipping session check');
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

    // Cleanup timeout on unmount
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, [isConnected, address, user, isLoading, checkStoredSession]); // Removed lastAuthTime - using ref instead

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

      // Prevent authentication loops by checking if we already have a valid session
      if (user && user.address?.toLowerCase() === normalizedWalletAddress && accessToken) {
        console.log('✅ Session already exists for MetaMask, no action needed');
        setIsLoading(false);
        return;
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

  // Process authentication queue with debouncing to prevent navigation blocking
  // Uses ref to access the current performLogin to avoid stale closure
  const processAuthQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || authQueue.length === 0) return;
    
    console.log('Auth: Processing authentication queue, items:', authQueue.length);
    isProcessingQueueRef.current = true;
    
    try {
      while (authQueue.length > 0) {
        const { resolve, reject, args } = authQueue.shift()!;
        
        try {
          // Call the current performLogin function stored in ref
          const performLoginFn = performLoginRef.current;
          if (performLoginFn) {
            console.log('Auth: Processing login for address:', args[0]);
            const result = await performLoginFn(...args);
            console.log('Auth: Login completed for address:', args[0], 'success:', result.success);
            resolve(result);
          } else {
            reject(new Error('performLogin not initialized'));
          }
        } catch (error) {
          console.error('Auth: Login failed for address:', args[0], error);
          reject(error);
        }
      }
    } finally {
      console.log('Auth: Finished processing authentication queue');
      isProcessingQueueRef.current = false;
    }
  }, []);

  // Actual login implementation - memoized to prevent effect re-triggers
  const performLogin = useCallback(async (walletAddress: string, connector: any, status: string): Promise<{ success: boolean; error?: string }> => {
    // Try to acquire lock with timeout (pass connector so hardware wallets get longer timeout)
    const lockAcquired = acquireAuthLock(connector);
    if (!lockAcquired) {
      console.warn('Could not acquire auth lock, auth may be in progress');
      return { success: false, error: 'Authentication in progress' };
    }

    try {
      setIsLoading(true);

      const result = await authService.authenticateWallet(walletAddress, connector, status);

      if (result.success && result.user && result.token) {
        setUser(result.user);
        setAccessToken(result.token);
        storeSession(result.token, result.user);
        await loadKYCStatus();
        console.log('✅ Authentication successful for address:', walletAddress);
        addToast('Successfully authenticated!', 'success', 3000);
        return { success: true };
      } else {
        console.log('❌ Authentication failed for address:', walletAddress, 'error:', result.error);
        return { success: false, error: result.error || 'Authentication failed' };
      }
    } catch (error: any) {
      console.error('Login failed for address:', walletAddress, error);
      addToast(error.message || 'Login failed', 'error', 5000);
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setIsLoading(false);
      releaseAuthLock();
    }
  }, [storeSession, loadKYCStatus, addToast]);

  // Update the ref whenever performLogin changes so processAuthQueue always has latest
  useEffect(() => {
    performLoginRef.current = performLogin;
  }, [performLogin]);

  // Login with wallet authentication - now uses queue and is memoized
  const login = useCallback(async (walletAddress: string, connector: any, status: string): Promise<{ success: boolean; error?: string }> => {
    console.log('🔐 Login queued for address:', walletAddress);

    // Check if already authenticated for this address
    // Note: isAuthenticated is computed from user && accessToken, so we check both directly
    const currentlyAuthenticated = !!user && !!accessToken;
    if (currentlyAuthenticated && user?.address?.toLowerCase() === walletAddress.toLowerCase()) {
      console.log('✅ Already authenticated for address:', walletAddress);
      return { success: true };
    }

    // Return a promise that will be resolved when processed from the queue
    return new Promise((resolve, reject) => {
      console.log('Auth: Adding login to queue for address:', walletAddress);
      authQueue.push({ resolve, reject, args: [walletAddress, connector, status] });
      console.log('Auth: Queue size after adding:', authQueue.length);
      
      // Start processing the queue if not already running (use Promise to not block)
      if (!isProcessingQueueRef.current) {
        console.log('Auth: Starting queue processing');
        // Schedule processing asynchronously to avoid blocking navigation
        Promise.resolve().then(() => processAuthQueue());
      } else {
        console.log('Auth: Queue processing already in progress');
      }
    });
  }, [user, accessToken, processAuthQueue]);

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

  // Refresh token with improved error handling
  const refreshTokenMethod = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        console.warn('No refresh token available, skipping refresh');
        return; // Don't throw - this is not a critical error
      }

      const result = await authService.refreshToken();
      if (result.success && result.token) {
        setAccessToken(result.token);
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, result.token);
        localStorage.setItem(STORAGE_KEYS.SIGNATURE_TIMESTAMP, Date.now().toString());
        console.log('✅ Token refreshed successfully');
      } else {
        console.warn('Token refresh failed:', result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Categorize errors
      const isNetworkError = errorMessage.includes('fetch') ||
        errorMessage.includes('Network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ECONNREFUSED');

      const isAuthError = errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Forbidden');

      if (isNetworkError) {
        // Network errors - don't logout, just log
        console.warn('🌐 Token refresh failed due to network error, will retry later:', errorMessage);
      } else if (isAuthError) {
        // Authentication errors - logout required
        console.error('🔐 Authentication expired, logging out:', errorMessage);
        await handleLogout();
      } else {
        // Unknown errors - log but don't logout
        console.error('❌ Token refresh error:', error);
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

  // Ensure user is authenticated - simple helper for components
  const ensureAuthenticated = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // If already authenticated with valid token, return success immediately
    if (user && accessToken) {
      console.log('✅ User already authenticated');
      return { success: true };
    }

    // If wallet is not connected, return error
    if (!isConnected || !address) {
      return {
        success: false,
        error: 'Please connect your wallet first'
      };
    }

    // If wallet is connected but not authenticated, trigger login (with cooldown check)
    const now = Date.now();
    if (now - lastAuthTimeRef.current >= AUTH_COOLDOWN) {
      console.log('🔐 Wallet connected but not authenticated, triggering login...');
      lastAuthTimeRef.current = now; // Update cooldown timer
      try {
        const result = await login(address, connector, 'connected');
        return result;
      } catch (error: any) {
        console.error('Authentication failed:', error);
        return {
          success: false,
          error: error.message || 'Authentication failed. Please try again.'
        };
      }
    } else {
      console.log(`⏳ Authentication cooldown active, skipping login (${AUTH_COOLDOWN - (now - lastAuthTimeRef.current)}ms remaining)`);
      return { success: true }; // Return success to prevent error loops
    }
  }, [user, accessToken, isConnected, address, connector, login]);

  // Auto-refresh token periodically with improved error handling
  useEffect(() => {
    if (!accessToken || !user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshTokenMethod();
      } catch (error) {
        // Error handling is now done in refreshTokenMethod
        console.debug('Token refresh interval error (handled):', error);
      }
    }, 45 * 60 * 1000); // Refresh every 45 minutes (less aggressive)

    return () => clearInterval(refreshInterval);
  }, [user, accessToken, refreshTokenMethod]);

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