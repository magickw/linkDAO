import { signMessage } from '@wagmi/core';
import { config } from '@/lib/rainbowkit';
import { ENV_CONFIG } from '@/config/environment';
import { AuthUser, UserRole } from '@/types/auth';
import { csrfService } from './csrfService';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export interface KYCStatus {
  status: string;
  tier: string;
  submittedAt?: string;
  reviewedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
  requiredDocuments?: string[];
  completedDocuments?: string[];
}

class AuthService {
  private baseUrl: string;
  private token: string | null = null;
  // Add retry tracking fields
  private lastAuthAttempt: number = 0;
  private authAttemptCount: number = 0;
  private readonly MAX_AUTH_DELAY: number = 30000; // Cap max delay at 30 seconds (increased from 5s)
  private readonly MAX_AUTH_ATTEMPTS: number = 3; // Maximum total attempts before giving up

  constructor() {
    // Use centralized environment config to ensure correct backend port
    this.baseUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';

    // Load token from localStorage on initialization
    // Check for the correct token keys used throughout the app
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('linkdao_access_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('auth_token') || '';
    }
  }

  /**
   * Reset authentication attempt counter
   * This allows users to retry after hitting the maximum attempts limit
   */
  public resetAuthAttempts(): void {
    this.authAttemptCount = 0;
    this.lastAuthAttempt = 0;
    console.log('✅ Authentication attempt counter reset');
  }

  /**
   * Get authentication nonce for wallet signature
   */
  async getNonce(address: string): Promise<{ nonce: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/nonce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address })
      });
      if (!response.ok) {
        // Handle non-JSON error responses safely
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get nonce');
        } catch (e) {
          throw new Error(`Failed to get nonce: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      // Backend returns data wrapped in data object
      const nonceData = data.data || data;
      return { nonce: nonceData.nonce, message: nonceData.message };
    } catch (error) {
      // If backend is unavailable, return mock nonce
      console.warn('Backend unavailable for nonce, using fallback');
      return {
        nonce: `fallback_nonce_${Date.now()}`,
        message: `Sign this message to authenticate with LinkDAO: ${Date.now()}`
      };
    }
  }

  /**
   * Authenticate with Web3 wallet signature
   */
  async authenticateWallet(address: string, connector: any, status: string): Promise<AuthResponse> {
    // Reset authentication counter when starting a new authentication flow
    // This allows users to retry after disconnecting and reconnecting their wallet
    if (this.authAttemptCount >= this.MAX_AUTH_ATTEMPTS) {
      console.log('🔄 Resetting authentication counter for new wallet connection attempt');
      this.authAttemptCount = 0;
      this.lastAuthAttempt = 0;
    }

    // Track authentication attempt
    this.lastAuthAttempt = Date.now();

    // Check if we've exceeded maximum attempts
    if (this.authAttemptCount >= this.MAX_AUTH_ATTEMPTS) {
      console.error(`❌ Maximum authentication attempts (${this.MAX_AUTH_ATTEMPTS}) exceeded. Please try again later.`);
      throw new Error(`Maximum authentication attempts exceeded. Please wait before trying again.`);
    }

    try {
      // Add conditional delay based on retry count to prevent rapid retry loops
      // Only apply delay after failures, not on first attempt
      if (this.authAttemptCount > 0) {
        // Calculate exponential backoff with cap
        const elapsed = Date.now() - this.lastAuthAttempt;
        const baseDelay = Math.min(1000 * Math.pow(2, this.authAttemptCount - 1), this.MAX_AUTH_DELAY);
        const remainingDelay = Math.max(0, baseDelay - elapsed);

        if (remainingDelay > 0) {
          console.log(`⏳ Applying ${remainingDelay}ms delay before authentication attempt #${this.authAttemptCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, remainingDelay));
        }
      }

      // Check if we already have a valid session for this address (case-insensitive)
      if (this.token && !this.token.startsWith('mock_token_')) {
        try {
          const currentUser = await this.getCurrentUser();
          if (currentUser && currentUser.address?.toLowerCase() === address.toLowerCase()) {
            console.log('✅ Reusing existing valid session for address:', address);
            return {
              success: true,
              token: this.token,
              user: currentUser
            };
          }
        } catch (error) {
          console.log('Existing session check failed, proceeding with new authentication');
        }
      }

      // Check localStorage for existing session with enhanced validation
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('linkdao_access_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('authToken') ||
          localStorage.getItem('auth_token');
        const storedAddress = localStorage.getItem('linkdao_wallet_address') ||
          localStorage.getItem('wallet_address');
        const storedTimestamp = localStorage.getItem('linkdao_signature_timestamp') ||
          localStorage.getItem('signature_timestamp');
        const storedUserData = localStorage.getItem('linkdao_user_data') ||
          localStorage.getItem('user_data');

        // Case-insensitive address comparison for session validation
        if (storedToken && storedAddress?.toLowerCase() === address.toLowerCase() && storedTimestamp && storedUserData) {
          const timestamp = parseInt(storedTimestamp);
          const now = Date.now();
          const TOKEN_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

          if (now - timestamp < TOKEN_EXPIRY_TIME) {
            try {
              const userData = JSON.parse(storedUserData);
              this.setToken(storedToken);
              console.log('✅ Restored session from localStorage for address:', address);
              return {
                success: true,
                token: storedToken,
                user: userData
              };
            } catch (parseError) {
              console.warn('Failed to parse stored user data, proceeding with new authentication');
            }
          } else {
            console.log('⏰ Stored session expired, clearing and requesting new signature');
            // Clear expired session
            localStorage.removeItem('linkdao_access_token');
            localStorage.removeItem('linkdao_wallet_address');
            localStorage.removeItem('linkdao_signature_timestamp');
            localStorage.removeItem('linkdao_user_data');
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('wallet_address');
            localStorage.removeItem('signature_timestamp');
            localStorage.removeItem('user_data');
          }
        }
      }

      // Ensure wallet is connected and ready
      if (!connector) {
        // Increment authentication attempt count on failure
        this.authAttemptCount++;
        return { success: false, error: 'Connector not available' };
      }

      if (status !== 'connected') {
        // Increment authentication attempt count on failure
        this.authAttemptCount++;
        return { success: false, error: 'Wallet not connected' };
      }

      // Add delay to ensure connector is fully ready and config is hydrated
      await new Promise(resolve => setTimeout(resolve, 300));

      // Get nonce and message
      const nonceInfo = await this.getNonce(address);

      // Validate message
      if (!nonceInfo.message || typeof nonceInfo.message !== 'string') {
        console.error('Invalid message received from getNonce:', nonceInfo.message);
        // Increment authentication attempt count on failure
        this.authAttemptCount++;
        return { success: false, error: 'Failed to generate authentication message' };
      }

      // Check if we're running in a browser environment for SSR safety
      if (typeof window === 'undefined') {
        // Increment authentication attempt count on failure
        this.authAttemptCount++;
        return { success: false, error: 'Wallet authentication requires browser environment' };
      }

      // Validate config is available
      if (!config) {
        console.error('Wagmi config is not initialized');
        // Increment authentication attempt count on failure
        this.authAttemptCount++;
        return { success: false, error: 'Wallet configuration not ready. Please refresh and try again.' };
      }

      let signature: string | null = null;
      try {
        // Sign message with wallet - this will prompt the user
        // Using wagmi/core signMessage with proper error handling
        signature = await signMessage(config, {
          account: address as `0x${string}`,
          message: nonceInfo.message as string
        });

        if (!signature) {
          // Increment authentication attempt count on failure
          this.authAttemptCount++;
          return { success: false, error: 'Signature is required for authentication' };
        }
      } catch (signError: any) {
        // Handle specific signing errors without throwing (avoid runtime overlays)
        let signErrorMessage = 'Failed to sign authentication message';

        if (signError && typeof signError === 'object') {
          if (signError.message) {
            signErrorMessage = signError.message;
          } else if (signError.toString && typeof signError.toString === 'function') {
            signErrorMessage = signError.toString();
          }
        } else if (typeof signError === 'string') {
          signErrorMessage = signError;
        }

        const lowerMessage = signErrorMessage.toLowerCase();

        if (lowerMessage.includes('rejected') || lowerMessage.includes('denied')) {
          // User rejected signature - RESET counter instead of incrementing
          // This prevents authentication loop when user explicitly rejects
          console.log('User rejected signature request - resetting authentication counter');
          this.authAttemptCount = 0;
          this.lastAuthAttempt = 0;
          return { success: false, error: 'Signature request was rejected by user' };
        } else if (lowerMessage.includes('not supported')) {
          // Wallet doesn't support signing - this is not a retry-able error
          // Reset counter to prevent blocking future attempts with different wallets
          console.log('Wallet does not support signing - resetting authentication counter');
          this.authAttemptCount = 0;
          this.lastAuthAttempt = 0;
          return { success: false, error: 'Your wallet does not support message signing' };
        } else {
          console.error('Signing error:', signError);
          // Only increment for actual technical errors (not user actions)
          this.authAttemptCount++;
          return { success: false, error: signErrorMessage };
        }
      }

      // Send authentication request with better error handling
      try {
        console.log('🔄 Attempting authentication with backend:', this.baseUrl);
        const response = await fetch(`${this.baseUrl}/api/auth/wallet-connect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: address,
            signature,
            nonce: nonceInfo.nonce,
            message: nonceInfo.message,
          }),
        });

        if (!response.ok) {
          console.error('❌ Authentication failed with status:', response.status, 'for address:', address);

          // Handle specific error cases
          if (response.status === 403) {
            console.error('🚫 Authentication blocked (403) - may be rate limited or blocked');
            this.authAttemptCount++;
            throw new Error('Authentication blocked (403). Please try again later.');
          }

          if (response.status === 401) {
            console.error('🔒 Authentication unauthorized (401)');
            this.clearToken();
            this.authAttemptCount++;
            throw new Error('Authentication unauthorized (401). Invalid credentials.');
          }

          // If backend is not available (5xx errors) or rate limited
          if (response.status >= 500 || response.status === 429 || response.status === 503) {
            console.error('Backend unavailable or rate limited');
            this.authAttemptCount++;
            throw new Error(`Backend unavailable (${response.status}). Please try again later.`);
          }

          // Try to parse error message safely
          try {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Authentication failed');
          } catch (e) {
            throw new Error(`Authentication failed with status ${response.status}`);
          }
        }

        const data = await response.json();

        // Handle both direct token response and nested data response
        const sessionToken = data.sessionToken || (data.data && data.data.sessionToken) || data.token || (data.data && data.data.token);

        if (data.success && sessionToken) {
          this.setToken(sessionToken);
          console.log('✅ Authentication successful for address:', address);

          // Initialize CSRF service with session token as session ID
          await csrfService.initialize(sessionToken);

          // Use user data from backend response if available, otherwise create default user
          const responseUserData = data.data?.user || data.user;
          let userData: AuthUser;

          if (responseUserData) {
            // Use user data from backend response
            userData = responseUserData;
          } else {
            // Create default user object if not provided by backend
            userData = {
              id: `user_${address}`,
              address: address,
              handle: `user_${address.slice(0, 6)}`,
              ens: undefined,
              email: undefined,
              kycStatus: 'none',
              role: 'user' as UserRole,
              permissions: [],
              isActive: true,
              isSuspended: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }

          // Force admin role if address matches configured admin address
          if (this.isAdminAddress(address)) {
            console.log('Override: Granting admin role to configured admin address');
            userData.role = 'admin';
            if (!userData.permissions.includes('admin_access')) {
              userData.permissions = [...userData.permissions, 'admin_access', 'manage_users', 'manage_content'];
            }
          }

          // Store session data for persistence with multiple keys for compatibility
          if (typeof window !== 'undefined') {
            localStorage.setItem('linkdao_access_token', sessionToken);
            localStorage.setItem('token', sessionToken);
            localStorage.setItem('authToken', sessionToken);
            localStorage.setItem('auth_token', sessionToken);
            localStorage.setItem('linkdao_wallet_address', address);
            localStorage.setItem('wallet_address', address);
            localStorage.setItem('linkdao_signature_timestamp', Date.now().toString());
            localStorage.setItem('signature_timestamp', Date.now().toString());
            localStorage.setItem('linkdao_user_data', JSON.stringify(userData));
            localStorage.setItem('user_data', JSON.stringify(userData));
          }

          // Reset authentication attempt tracking on success
          this.authAttemptCount = 0;

          // Return in expected format
          return {
            success: true,
            token: sessionToken,
            user: userData
          };
        } else {
          // Increment authentication attempt count on failure
          this.authAttemptCount++;
          throw new Error(data.error?.message || data.error || 'Authentication failed - no token received');
        }
      } catch (fetchError: any) {
        // Increment authentication attempt count on failure
        this.authAttemptCount++;

        // If fetch fails (network error, backend down), throw error
        let fetchErrorMessage = 'Network error';

        if (fetchError && typeof fetchError === 'object') {
          if (fetchError.message) {
            fetchErrorMessage = fetchError.message;
          } else if (fetchError.name) {
            fetchErrorMessage = fetchError.name;
          }
        } else if (typeof fetchError === 'string') {
          fetchErrorMessage = fetchError;
        }

        // Re-throw with proper error message
        const error = new Error(fetchErrorMessage);
        error.name = fetchError.name || 'FetchError';
        throw error;
      }
    } catch (error: any) {
      console.error('Wallet authentication failed:', error);

      // Increment authentication attempt count on failure
      this.authAttemptCount++;

      // Ensure error message is properly serialized
      let errorMessage = 'Authentication failed';
      if (error && typeof error === 'object') {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.toString && typeof error.toString === 'function') {
          errorMessage = error.toString();
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // If it's a network error, proceed without authentication
      if (errorMessage.includes('fetch') || errorMessage.includes('Network')) {
        console.warn('Network error, proceeding without authentication');
        return { success: true };
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Register new user with enhanced profile data
   */
  async register(userData: {
    address: string;
    handle: string;
    ens?: string;
    email?: string;
    preferences?: any;
    privacySettings?: any;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success && data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error: any) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    // Ensure we have a token before proceeding
    if (!this.token) {
      this.token = localStorage.getItem('linkdao_access_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('auth_token') ||
        '';
    }

    if (!this.token) {
      return null;
    }

    // Check if this is a mock token (offline mode)
    if (this.token.startsWith('mock_token_')) {
      const addressMatch = this.token.match(/mock_token_(0x[a-fA-F0-9]{40})/);
      if (addressMatch) {
        const address = addressMatch[1];
        return {
          id: `mock_${address}`,
          address: address,
          handle: `user_${address.slice(0, 6)}`,
          kycStatus: 'none',
          role: 'user' as UserRole,
          permissions: [],
          isActive: true,
          isSuspended: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/status`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data.authenticated) {
        // Convert session data to AuthUser format, use role and permissions from backend if available
        const user: AuthUser = {
          id: data.data.id || data.data.sessionId || `user_${data.data.walletAddress}`,
          address: data.data.walletAddress,
          handle: data.data.handle || `user_${data.data.walletAddress.slice(0, 6)}`,
          ens: data.data.ens,
          email: data.data.email,
          kycStatus: data.data.kycStatus || 'none',
          role: (data.data.role || 'user') as UserRole,
          permissions: data.data.permissions || [],
          isActive: data.data.isActive ?? true,
          isSuspended: data.data.isSuspended ?? false,
          suspensionReason: data.data.suspensionReason,
          suspensionExpiresAt: data.data.suspensionExpiresAt,
          lastLogin: data.data.lastLogin,
          createdAt: data.data.createdAt || new Date().toISOString(),
          updatedAt: data.data.updatedAt || new Date().toISOString(),
          avatarCid: data.data.avatarCid,
          preferences: data.data.preferences,
          privacySettings: data.data.privacySettings,
        };

        // Force admin role if address matches configured admin address
        if (this.isAdminAddress(user.address)) {
          console.log('Override: Granting admin role to configured admin address');
          user.role = 'admin';
          // Ensure admin permissions are present
          const adminPermissions = ['admin_access', 'manage_users', 'manage_content', 'view_analytics', 'manage_settings'];
          user.permissions = Array.from(new Set([...user.permissions, ...adminPermissions]));
        }

        // Log user role for debugging
        console.log('Current user role:', user.role);

        return user;
      }

      // Token might be invalid, clear it only if it's a 401/403 error (unauthorized)
      if (response.status === 401 || response.status === 403) {
        console.log(`Token validation failed with status ${response.status}, clearing token`);
        this.clearToken();
      } else {
        // For other errors (like 500, network issues), don't clear token, just return null
        console.warn(`Token validation failed with status ${response.status}, but not clearing token`);
      }

      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      // If backend is unavailable and we have a token, try to extract mock user info
      if (this.token.startsWith('mock_token_')) {
        const addressMatch = this.token.match(/mock_token_(0x[a-fA-F0-9]{40})/);
        if (addressMatch) {
          const address = addressMatch[1];
          return {
            id: `mock_${address}`,
            address: address,
            handle: `user_${address.slice(0, 6)}`,
            ens: undefined,
            email: undefined,
            kycStatus: 'none',
            role: 'user' as UserRole,
            permissions: [],
            isActive: true,
            isSuspended: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: undefined,
            privacySettings: undefined,
          } as AuthUser;
        }
      }
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<{ success: boolean; preferences?: any; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ preferences }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Failed to update preferences:', error);
      return { success: false, error: error.message || 'Update failed' };
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(privacySettings: any): Promise<{ success: boolean; privacySettings?: any; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ privacySettings }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Failed to update privacy settings:', error);
      return { success: false, error: error.message || 'Update failed' };
    }
  }

  /**
   * Initiate KYC verification
   */
  async initiateKYC(tier: 'basic' | 'intermediate' | 'advanced', documents?: any[]): Promise<{ success: boolean; kycId?: string; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/kyc/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ tier, documents }),
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Failed to initiate KYC:', error);
      return { success: false, error: error.message || 'KYC initiation failed' };
    }
  }

  /**
   * Get KYC status
   */
  async getKYCStatus(): Promise<KYCStatus | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/kyc/status`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      // If backend is unavailable, return null without throwing
      if (!response.ok) {
        if (response.status >= 500) {
          console.warn('Backend unavailable for KYC status, returning null');
          return null;
        }

        if (response.status === 401) {
          console.warn('Authentication failed for KYC status, clearing token');
          this.clearToken();
          return null;
        }

        if (response.status === 404) {
          console.warn('KYC status endpoint not found, returning default status');
          return {
            status: 'none',
            tier: 'none'
          };
        }

        throw new Error(`KYC status request failed (${response.status})`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Failed to get KYC status:', error);
      return null;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'No token to refresh' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.token) {
        this.setToken(data.token);
      }

      return data;
    } catch (error: any) {
      console.error('Failed to refresh token:', error);
      return { success: false, error: error.message || 'Token refresh failed' };
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Capture token and clear immediately to avoid UI blocking on network errors
    const token = this.token;
    this.clearToken();

    // Clear all stored session data with multiple keys
    if (typeof window !== 'undefined') {
      localStorage.removeItem('linkdao_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('linkdao_wallet_address');
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('linkdao_signature_timestamp');
      localStorage.removeItem('signature_timestamp');
      localStorage.removeItem('linkdao_user_data');
      localStorage.removeItem('user_data');
      localStorage.removeItem('linkdao_refresh_token');
    }

    if (token) {
      try {
        // Fire-and-forget; do not surface network errors to the UI
        await fetch(`${this.baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }).catch((e) => {
          console.warn('Logout network call failed, proceeding locally:', e);
        });
      } catch (error) {
        // Extra safety: never throw from logout
        console.warn('Logout request error suppressed:', error);
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    // Check localStorage as fallback if token is not in memory
    if (!this.token) {
      this.token = localStorage.getItem('linkdao_access_token') ||
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('auth_token') ||
        '';
    }
    return this.token;
  }

  /**
   * Check if we have a potentially valid session without validating it
   * This is used to prevent signature prompts on page refresh
   */
  hasPotentialSession(): boolean {
    const token = this.getToken();
    const storedAddress = localStorage.getItem('linkdao_wallet_address') ||
      localStorage.getItem('wallet_address');
    const storedTimestamp = localStorage.getItem('linkdao_signature_timestamp') ||
      localStorage.getItem('signature_timestamp');

    // Quick check - if we have a token and basic session data, we might have a valid session
    return !!(token && storedAddress && storedTimestamp);
  }

  /**
   * Set authentication token
   */
  private setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      // Store token in all expected keys for consistency
      localStorage.setItem('linkdao_access_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('authToken', token);
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Clear authentication token
   */
  private clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      // Clear all token storage keys for consistency
      localStorage.removeItem('linkdao_access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('auth_token');
    }
    // Also clear CSRF service
    csrfService.clear();
  }

  /**
   * Check if an address is the configured admin address
   */
  private isAdminAddress(address: string): boolean {
    const adminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || '0xEe034b53D4cCb101b2a4faec27708be507197350';
    if (!adminAddress || !address) return false;

    const normalizedAdmin = adminAddress.trim().toLowerCase();
    const normalizedUser = address.trim().toLowerCase();

    const isMatch = normalizedAdmin === normalizedUser;
    if (isMatch) {
      console.log(`[AuthService] Admin address match confirmed for ${address}`);
    }
    return isMatch;
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Try multiple token sources to ensure we get the token
    const token = this.getToken() ||
      localStorage.getItem('linkdao_access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Note: Missing token is expected during initial page load before authentication
    // Services should handle unauthenticated requests gracefully

    return headers;
  }

  /**
   * Admin login with credentials
   */
  async adminLogin(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.message || data.error || 'Login failed',
        };
      }

      if (data.data && data.data.token) {
        this.token = data.data.token;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.data.token);
        }
      }

      return {
        success: true,
        token: data.data?.token,
        user: data.data?.user,
      };
    } catch (error) {
      console.error('Admin login error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData: any): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'Current user not found' };
      }

      const response = await fetch(`${this.baseUrl}/api/profiles/address/${currentUser.address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Update the stored user data
        if (typeof window !== 'undefined') {
          localStorage.setItem('linkdao_user_data', JSON.stringify(data.data));
        }
        return { success: true, user: data.data };
      } else {
        return { success: false, error: data.error || 'Update failed' };
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      return { success: false, error: error.message || 'Update failed' };
    }
  }

  /**
   * Admin logout
   */
  async adminLogout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${this.baseUrl}/api/auth/admin/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Admin logout error:', error);
    } finally {
      this.clearToken();
    }
  }
}

export const authService = new AuthService();
export default authService;