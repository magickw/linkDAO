/**
 * Enhanced Authentication Service
 * Implements wallet signature verification with proper error handling, retry logic,
 * session persistence, CORS handling, and authentication recovery mechanisms
 */

import { signMessage, getAccount } from '@wagmi/core';
import { config } from '@/lib/rainbowkit';
import { ENV_CONFIG } from '@/config/environment';
import { AuthUser, UserRole } from '@/types/auth';
import { enhancedRequestManager } from './enhancedRequestManager';
import { apiCircuitBreaker } from './circuitBreaker';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  retryable?: boolean;
}

export interface SessionData {
  token: string;
  user: AuthUser;
  timestamp: number;
  expiresAt: number;
  refreshToken?: string;
}

export interface AuthenticationOptions {
  retries?: number;
  timeout?: number;
  skipCache?: boolean;
  forceRefresh?: boolean;
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

/**
 * Enhanced Authentication Service with resilient error handling
 */
class EnhancedAuthService {
  private baseUrl: string;
  private token: string | null = null;
  private sessionData: SessionData | null = null;
  private authenticationInProgress = false;
  private retryAttempts = new Map<string, number>();
  private lastAuthAttempt = 0;
  private readonly AUTH_COOLDOWN = 5000; // 5 seconds between auth attempts
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // Refresh 2 hours before expiry

  // Storage keys for session persistence
  private readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'linkdao_access_token',
    REFRESH_TOKEN: 'linkdao_refresh_token',
    WALLET_ADDRESS: 'linkdao_wallet_address',
    SESSION_DATA: 'linkdao_session_data',
    SIGNATURE_TIMESTAMP: 'linkdao_signature_timestamp',
    USER_DATA: 'linkdao_user_data'
  };

  constructor() {
    this.baseUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
    this.initializeFromStorage();
    this.setupPeriodicRefresh();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const sessionDataStr = localStorage.getItem(this.STORAGE_KEYS.SESSION_DATA);
      if (sessionDataStr) {
        const sessionData: SessionData = JSON.parse(sessionDataStr);

        // Check if session is still valid
        if (Date.now() < sessionData.expiresAt) {
          this.sessionData = sessionData;
          this.token = sessionData.token;
          console.log('✅ Restored valid session from storage');
        } else {
          console.log('⏰ Stored session expired, clearing...');
          this.clearStoredSession();
        }
      }
    } catch (error) {
      console.error('Error initializing from storage:', error);
      this.clearStoredSession();
    }
  }

  /**
   * Setup periodic token refresh
   */
  private setupPeriodicRefresh(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      if (this.shouldRefreshToken()) {
        this.refreshToken().catch(error => {
          console.warn('Periodic token refresh failed:', error);
        });
      }
    }, 10 * 60 * 1000); // Check every 10 minutes
  }

  /**
   * Check if token should be refreshed
   */
  private shouldRefreshToken(): boolean {
    if (!this.sessionData || !this.token) return false;

    const timeUntilExpiry = this.sessionData.expiresAt - Date.now();
    return timeUntilExpiry < this.REFRESH_THRESHOLD && timeUntilExpiry > 0;
  }

  /**
   * Enhanced wallet authentication with proper error handling and retry logic
   */
  async authenticateWallet(
    address: string,
    connector: any,
    status: string,
    options: AuthenticationOptions = {}
  ): Promise<AuthResponse> {
    const {
      retries = this.MAX_RETRY_ATTEMPTS,
      timeout = 30000,
      skipCache = false,
      forceRefresh = false
    } = options;

    // Prevent concurrent authentication attempts
    if (this.authenticationInProgress) {
      return {
        success: false,
        error: 'Authentication already in progress',
        retryable: false
      };
    }

    // Rate limiting - prevent too frequent authentication attempts
    const now = Date.now();
    if (now - this.lastAuthAttempt < this.AUTH_COOLDOWN) {
      return {
        success: false,
        error: 'Please wait before attempting authentication again',
        retryable: true
      };
    }

    this.lastAuthAttempt = now;
    this.authenticationInProgress = true;

    try {
      // Check for existing valid session unless forced refresh
      if (!forceRefresh && !skipCache && this.hasValidSession(address)) {
        console.log('✅ Using existing valid session for address:', address);
        return {
          success: true,
          token: this.sessionData!.token,
          user: this.sessionData!.user
        };
      }

      // Execute authentication with retry logic
      const result = await this.executeAuthenticationWithRetry(
        address,
        connector,
        status,
        retries,
        timeout
      );

      if (result.success && result.token && result.user) {
        this.storeSession(result.token, result.user, result.refreshToken);
      }

      return result;

    } catch (error: any) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: this.getErrorMessage(error),
        retryable: this.isRetryableError(error)
      };
    } finally {
      this.authenticationInProgress = false;
    }
  }

  /**
   * Execute authentication with retry logic and circuit breaker
   */
  private async executeAuthenticationWithRetry(
    address: string,
    connector: any,
    status: string,
    maxRetries: number,
    timeout: number
  ): Promise<AuthResponse & { refreshToken?: string }> {
    let lastError: any;
    const retryKey = `auth:${address}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Reset retry count on successful attempt
        if (attempt > 0) {
          console.log(`Authentication retry attempt ${attempt}/${maxRetries} for ${address}`);
        }

        const result = await this.performAuthentication(address, connector, status, timeout);

        // Clear retry count on success
        this.retryAttempts.delete(retryKey);

        return result;

      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
        console.warn(`Authentication attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);

        await this.sleep(delay);
      }
    }

    // Track retry attempts
    const currentRetries = this.retryAttempts.get(retryKey) || 0;
    this.retryAttempts.set(retryKey, currentRetries + 1);

    throw lastError;
  }

  /**
   * Perform the actual authentication process
   */
  private async performAuthentication(
    address: string,
    connector: any,
    status: string,
    timeout: number
  ): Promise<AuthResponse & { refreshToken?: string }> {
    // Validate inputs
    if (!address || !connector) {
      throw new Error('Invalid authentication parameters');
    }

    // Log status for debugging but don't fail on it
    console.log('Authentication status:', status);

    // Ensure wallet is ready
    await this.ensureWalletReady(connector, timeout);

    // Get nonce with retry logic
    const { nonce, message } = await this.getNonceWithRetry(address);

    // Sign message with enhanced error handling
    const signature = await this.signMessageWithRetry(address, message);

    // Authenticate with backend using circuit breaker - send message not nonce
    return await this.authenticateWithBackend(address, signature, message);
  }

  /**
   * Ensure wallet is ready for signing
   */
  private async ensureWalletReady(connector: any, timeout: number): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (connector && config) {
        // Verify the connector is actually connected
        const account = getAccount(config);
        if (account.isConnected && account.connector) {
          console.log('✅ Wallet connector is ready');
          return;
        }
      }
      await this.sleep(100);
    }

    throw new Error('Wallet not ready for authentication');
  }

  /**
   * Get authentication nonce with retry logic
   */
  private async getNonceWithRetry(address: string, retries = 3): Promise<{ nonce: string; message: string }> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await apiCircuitBreaker.execute(
          async () => {
            const response = await enhancedRequestManager.request<any>(
              `${this.baseUrl}/api/auth/nonce`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address })
              },
              { timeout: 10000, retries: 1 }
            );

            if (!response.success || !response.data) {
              throw new Error(response.error || 'Failed to get nonce');
            }

            return {
              nonce: response.data.nonce,
              message: response.data.message
            };
          },
          async () => {
            // Fallback nonce generation
            console.warn('Backend unavailable for nonce, using fallback');
            return {
              nonce: `fallback_nonce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              message: `Sign this message to authenticate with LinkDAO: ${Date.now()}`
            };
          }
        );
      } catch (error: any) {
        if (attempt === retries - 1) throw error;

        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`Nonce request failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }

    throw new Error('Failed to get nonce after retries');
  }

  /**
   * Sign message with enhanced error handling and retry logic
   */
  private async signMessageWithRetry(address: string, message: string, retries = 3): Promise<string> {
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid message for signing');
    }

    if (!config) {
      throw new Error('Wallet configuration not ready');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Wait for connector to be ready before attempting to sign
        const maxWaitTime = 5000; // 5 seconds max wait per attempt
        const startWait = Date.now();
        let account = getAccount(config);

        while ((!account.isConnected || !account.connector) && (Date.now() - startWait < maxWaitTime)) {
          await this.sleep(200);
          account = getAccount(config);
        }

        // Final check after waiting
        if (!account.isConnected || !account.connector) {
          throw new Error('Connector not connected');
        }

        const signature = await signMessage(config, {
          account: address as `0x${string}`,
          message: message
        });

        if (!signature) {
          throw new Error('No signature returned from wallet');
        }

        return signature;

      } catch (error: any) {
        const errorMessage = this.getSigningErrorMessage(error);

        // Don't retry on user rejection or unsupported operations
        if (this.isUserRejectionError(error) || this.isUnsupportedError(error)) {
          throw new Error(errorMessage);
        }

        if (attempt === retries - 1) {
          throw new Error(errorMessage);
        }

        console.warn(`Signing attempt ${attempt + 1} failed, retrying:`, errorMessage);
        await this.sleep(1000);
      }
    }

    throw new Error('Failed to sign message after retries');
  }

  /**
   * Authenticate with backend using circuit breaker
   */
  private async authenticateWithBackend(
    address: string,
    signature: string,
    message: string
  ): Promise<AuthResponse & { refreshToken?: string }> {
    return await apiCircuitBreaker.execute(
      async () => {
        const response = await enhancedRequestManager.request<any>(
          `${this.baseUrl}/api/auth/wallet-connect`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: address,
              signature,
              message
            })
          },
          { timeout: 15000, retries: 2 }
        );

        if (!response.success) {
          throw new Error(response.error || 'Authentication failed');
        }

        // Handle both direct token response and nested data response
        const sessionToken = response.sessionToken || (response.data && response.data.sessionToken) || response.token || (response.data && response.data.token);
        const refreshToken = response.refreshToken || (response.data && response.data.refreshToken) || undefined;

        if (!sessionToken) {
          throw new Error('No session token received');
        }

        // Use user data from nested data field if available
        const responseUserData = (response.data && response.data.user) || response.user || (response.data && response.data);
        const userData: AuthUser = this.createUserData(address, responseUserData);

        return {
          success: true,
          token: sessionToken,
          user: userData,
          refreshToken: refreshToken
        };
      }
    );
  }

  /**
   * Create user data from response
   */
  private createUserData(address: string, userData?: any): AuthUser {
    return {
      id: userData?.id || `user_${address}`,
      address: address,
      handle: userData?.handle || `user_${address.slice(0, 6)}`,
      ens: userData?.ens,
      email: userData?.email,
      kycStatus: userData?.kycStatus || 'none',
      role: (userData?.role as UserRole) || 'user',
      permissions: userData?.permissions || [],
      isActive: userData?.isActive !== false,
      isSuspended: userData?.isSuspended === true,
      createdAt: userData?.createdAt || new Date().toISOString(),
      updatedAt: userData?.updatedAt || new Date().toISOString(),
      chainId: userData?.chainId,
      preferences: userData?.preferences,
      privacySettings: userData?.privacySettings
    };
  }


  /**
   * Check if current session is valid for the given address
   */
  private hasValidSession(address: string): boolean {
    const now = Date.now();
    
    if (!this.sessionData || !this.token) {
      console.log('❌ Session invalid: no session data or token');
      return false;
    }

    // Check if session is for the same address (case-insensitive)
    if (this.sessionData.user.address.toLowerCase() !== address.toLowerCase()) {
      console.log('❌ Session invalid: address mismatch', {
        sessionAddress: this.sessionData.user.address,
        requestedAddress: address
      });
      return false;
    }

    // Check if session is not expired
    if (now >= this.sessionData.expiresAt) {
      console.log('❌ Session invalid: expired', {
        now,
        expiresAt: this.sessionData.expiresAt,
        timeSinceExpiry: now - this.sessionData.expiresAt
      });
      return false;
    }

    console.log('✅ Session valid:', {
      address,
      timeUntilExpiry: this.sessionData.expiresAt - now
    });
    return true;
  }

  /**
   * Store session data with persistence across browser refreshes
   */
  private storeSession(token: string, user: AuthUser, refreshToken?: string): void {
    const now = Date.now();
    const expiresAt = now + this.SESSION_EXPIRY;

    // Normalize address to lowercase for consistency
    const normalizedUser = {
      ...user,
      address: user.address.toLowerCase()
    };

    console.log('📝 Storing session:', {
      timestamp: now,
      expiresAt,
      expiresIn: this.SESSION_EXPIRY,
      timeUntilExpiry: expiresAt - now,
      tokenLength: token.length,
      userAddress: user.address,
      normalizedAddress: normalizedUser.address
    });

    this.sessionData = {
      token,
      user: normalizedUser,
      timestamp: now,
      expiresAt,
      refreshToken
    };

    this.token = token;

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEYS.SESSION_DATA, JSON.stringify(this.sessionData));
        localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, token);
        localStorage.setItem(this.STORAGE_KEYS.WALLET_ADDRESS, user.address);
        localStorage.setItem(this.STORAGE_KEYS.SIGNATURE_TIMESTAMP, now.toString());
        localStorage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(user));

        if (refreshToken) {
          localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }

        console.log('✅ Session stored successfully');
      } catch (error) {
        console.error('Failed to store session:', error);
      }
    }
  }

  /**
   * Clear stored session data
   */
  private clearStoredSession(): void {
    this.sessionData = null;
    this.token = null;

    if (typeof window !== 'undefined') {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

/**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    if (!this.sessionData?.refreshToken) {
      console.error('No refresh token available in session data');
      return { success: false, error: 'No refresh token available. Please log in again.' };
    }

    try {
      console.log('Attempting to refresh authentication token...');
      // Use global fetch wrapper with skipAuth to avoid circular dependency
      const { globalFetch } = await import('./globalFetchWrapper');
      
      const response = await globalFetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        skipAuth: true, // Don't add auth headers to refresh request
        body: JSON.stringify({
          refreshToken: this.sessionData!.refreshToken
        })
      });

      if (!response.success) {
        console.error('Token refresh API failed:', response.error);
        // Clear invalid session data
        this.clearStoredSession();
        throw new Error(response.error || 'Token refresh failed');
      }

      // Handle both direct token response and nested data response
      const token = (response.data as any)?.sessionToken || (response.data as any)?.data?.sessionToken || (response.data as any)?.token || (response.data as any)?.data?.token;
      const refreshToken = (response.data as any)?.refreshToken || (response.data as any)?.data?.refreshToken || undefined;

      if (!token) {
        console.error('No token received in refresh response');
        this.clearStoredSession();
        throw new Error('No token received in refresh response');
      }

      // Update session with new token
      this.storeSession(token, this.sessionData!.user, refreshToken);
      console.log('Token refresh successful');

      return {
        success: true,
        token,
        user: this.sessionData!.user,
        refreshToken
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear the invalid session to force re-authentication
      this.clearStoredSession();
      
      // Don't extend session temporarily - this was causing issues
      // Instead, force the user to re-authenticate
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token refresh failed. Please log in again.',
        retryable: false
      };
    }
  }

  /**
   * Get current user with session recovery
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.token) return null;

    // Return cached user if session is valid
    if (this.sessionData && Date.now() < this.sessionData.expiresAt) {
      return this.sessionData.user;
    }

    // Try to refresh session
    try {
      const refreshResult = await this.refreshToken();
      if (refreshResult.success && refreshResult.user) {
        return refreshResult.user;
      }
    } catch (error) {
      console.warn('Failed to refresh session:', error);
    }

    // Clear invalid session
    this.clearStoredSession();
    return null;
  }

  /**
   * Logout with proper cleanup
   */
  async logout(): Promise<void> {
    const token = this.token;

    // Clear session immediately
    this.clearStoredSession();

    // Notify backend (fire-and-forget)
    if (token && !token.startsWith('mock_token_')) {
      try {
        await enhancedRequestManager.request(
          `${this.baseUrl}/api/auth/logout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          },
          { timeout: 5000, retries: 1 }
        );
      } catch (error) {
        // Ignore logout errors - session is already cleared locally
        console.warn('Logout request failed (ignored):', error);
      }
    }

    console.log('👋 Logged out successfully');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.sessionData && Date.now() < this.sessionData.expiresAt;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('🔑 Auth headers prepared:', {
        hasToken: !!this.token,
        tokenLength: this.token.length,
        tokenPreview: this.token.substring(0, 20) + '...',
        headerPreview: headers['Authorization']?.substring(0, 40) + '...'
      });
    } else {
      console.log('❌ No token available for auth headers');
    }

    return headers;
  }

  /**
   * Recover authentication after network interruption
   */
  async recoverAuthentication(address: string): Promise<AuthResponse> {
    console.log('🔄 Attempting authentication recovery for:', address);

    // Check if we have a valid stored session
    if (this.hasValidSession(address)) {
      console.log('✅ Authentication recovered from stored session');
      return {
        success: true,
        token: this.sessionData!.token,
        user: this.sessionData!.user
      };
    }

    // Try to refresh token if we have one
    if (this.sessionData?.refreshToken) {
      const refreshResult = await this.refreshToken();
      if (refreshResult.success) {
        console.log('✅ Authentication recovered via token refresh');
        return refreshResult;
      }
    }

    // If recovery fails, clear session and require re-authentication
    this.clearStoredSession();
    return {
      success: false,
      error: 'Authentication recovery failed - please sign in again',
      retryable: true
    };
  }

  /**
   * Handle wallet connection changes
   */
  async handleWalletChange(newAddress?: string): Promise<void> {
    // Don't logout if authentication is in progress
    if (this.authenticationInProgress) {
      console.log('⏳ Authentication in progress, ignoring wallet change');
      return;
    }

    if (!newAddress) {
      // Wallet disconnected - only logout if we have an active session
      if (this.sessionData) {
        await this.logout();
      }
      return;
    }

    // Check if address changed - be careful about initial connections
    if (this.sessionData && this.sessionData.user.address) {
      // Only check for real address changes, not initial connections
      // Use case-insensitive comparison to prevent unnecessary logouts
      if (newAddress && this.sessionData.user.address.toLowerCase() !== newAddress.toLowerCase()) {
        console.log('👛 Wallet address changed from', this.sessionData.user.address, 'to', newAddress, 'clearing session');
        await this.logout();
      }
    }
    // If sessionData.user.address is undefined or empty, it's likely an initial connection, don't logout
  }

  /**
   * Get session status for debugging
   */
  getSessionStatus(): {
    isAuthenticated: boolean;
    hasToken: boolean;
    hasSession: boolean;
    expiresAt?: number;
    timeUntilExpiry?: number;
    address?: string;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!this.token,
      hasSession: !!this.sessionData,
      expiresAt: this.sessionData?.expiresAt,
      timeUntilExpiry: this.sessionData ? this.sessionData.expiresAt - Date.now() : undefined,
      address: this.sessionData?.user.address
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: any): Promise<{ success: boolean; preferences?: any; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await enhancedRequestManager.request<any>(
        `${this.baseUrl}/api/auth/preferences`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ preferences }),
        },
        { timeout: 10000, retries: 2 }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update preferences');
      }

      // Update local user data
      if (this.sessionData) {
        this.sessionData.user.preferences = { ...this.sessionData.user.preferences, ...preferences };
        this.storeSession(this.sessionData.token, this.sessionData.user, this.sessionData.refreshToken);
      }

      return { success: true, preferences: response.data };
    } catch (error: any) {
      console.error('Failed to update preferences:', error);
      return { success: false, error: this.getErrorMessage(error) };
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
      const response = await enhancedRequestManager.request<any>(
        `${this.baseUrl}/api/auth/privacy`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ privacySettings }),
        },
        { timeout: 10000, retries: 2 }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update privacy settings');
      }

      // Update local user data
      if (this.sessionData) {
        this.sessionData.user.privacySettings = { ...this.sessionData.user.privacySettings, ...privacySettings };
        this.storeSession(this.sessionData.token, this.sessionData.user, this.sessionData.refreshToken);
      }

      return { success: true, privacySettings: response.data };
    } catch (error: any) {
      console.error('Failed to update privacy settings:', error);
      return { success: false, error: this.getErrorMessage(error) };
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
      const response = await enhancedRequestManager.request<any>(
        `${this.baseUrl}/api/auth/kyc/initiate`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ tier, documents }),
        },
        { timeout: 15000, retries: 2 }
      );

      if (!response.success) {
        throw new Error(response.error || 'KYC initiation failed');
      }

      return { success: true, kycId: response.data.kycId };
    } catch (error: any) {
      console.error('Failed to initiate KYC:', error);
      return { success: false, error: this.getErrorMessage(error) };
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
      const response = await enhancedRequestManager.request<any>(
        `${this.baseUrl}/api/auth/kyc/status`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
        { timeout: 10000, retries: 2 }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to get KYC status');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get KYC status:', error);
      return null;
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
      const response = await enhancedRequestManager.request<any>(
        `${this.baseUrl}/api/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        },
        { timeout: 15000, retries: 2 }
      );

      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }

      const sessionToken = response.token || (response.data && response.data.token);
      if (!sessionToken) {
        throw new Error('No session token received');
      }

      const responseUserData = (response.data && response.data.user) || response.user;
      const newUser = this.createUserData(userData.address, responseUserData);

      this.storeSession(sessionToken, newUser);

      return {
        success: true,
        token: sessionToken,
        user: newUser
      };
    } catch (error: any) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: this.getErrorMessage(error),
        retryable: this.isRetryableError(error)
      };
    }
  }

  // Utility methods

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryableError(error: any): boolean {
    const message = this.getErrorMessage(error).toLowerCase();

    // Network errors are retryable
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return true;
    }

    // Server errors are retryable
    if (error?.status >= 500) {
      return true;
    }

    // Specific retryable errors
    const retryableErrors = [
      'service unavailable',
      'temporarily unavailable',
      'connection refused',
      'etimedout',
      'econnreset'
    ];

    return retryableErrors.some(err => message.includes(err));
  }

  private isUserRejectionError(error: any): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return message.includes('rejected') || message.includes('denied') || message.includes('cancelled');
  }

  private isUnsupportedError(error: any): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return message.includes('not supported') || message.includes('unsupported');
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'Unknown error occurred';
  }

  private getSigningErrorMessage(error: any): string {
    const message = this.getErrorMessage(error);

    if (message.includes('rejected') || message.includes('denied')) {
      return 'Signature request was rejected by user';
    }

    if (message.includes('not supported')) {
      return 'Your wallet does not support message signing';
    }

    return message || 'Failed to sign authentication message';
  }
}

// Create singleton instance
export const enhancedAuthService = new EnhancedAuthService();
export default enhancedAuthService;