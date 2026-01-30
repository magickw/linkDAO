/**
 * Authentication Service
 * Simplified auth service for mobile and web
 */

import { apiClient } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signMessageWithWallet } from './walletAdapter';

// Global tracking to prevent concurrent auth attempts for the same address
const globalAuthInProgress = new Map<string, Promise<any>>();

export interface AuthUser {
  id: string;
  address: string;
  walletAddress?: string;
  ens?: string;
  handle?: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  createdAt: string;
  lastLoginAt?: string;
  bio?: string;
  location?: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  requires2FA?: boolean;
  userId?: string;
  walletAddress?: string;
}

export interface LoginCredentials {
  address: string;
  signature: string;
  message?: string;
}

export interface RegisterData {
  address: string;
  signature: string;
  handle?: string;
  displayName?: string;
  email?: string;
}

class AuthService {
  private currentUser: AuthUser | null = null;
  private token: string | null = null;
  private readonly TOKEN_KEY = 'linkdao_token';
  private readonly USER_KEY = 'linkdao_user';

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/login', credentials);

      if (response.success && response.data) {
        this.token = response.data.token;
        this.currentUser = response.data.user;
        apiClient.setToken(this.token);

        // Persist session (platform-specific)
        await this.persistSession(response.data.token, response.data.user);

        return { success: true, token: this.token, user: this.currentUser };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Authenticate with wallet (similar to web app's enhancedAuthService)
   * This is the main authentication method for wallet-based login
   */
  async authenticateWallet(
    address: string,
    connector: any,
    status: string,
    options: { retries?: number; timeout?: number } = {}
  ): Promise<AuthResponse> {
    const { retries = 3, timeout = 30000 } = options;
    const addressKey = address.toLowerCase();

    // Check if auth is already in progress for this address
    if (globalAuthInProgress.has(addressKey)) {
      console.log('ℹ️ Auth already in progress for this address, returning existing promise');
      return globalAuthInProgress.get(addressKey)!;
    }

    try {
      // Create and store the auth promise
      const authPromise = (async () => {
        // Step 1: Check security lockout status
        const isLockedOut = await this.checkSecurityLockout();
        if (isLockedOut) {
          throw new Error('Account temporarily locked due to security concerns. Please try again later.');
        }

        // Step 2: Get authentication message and nonce from backend
        const { nonce, message } = await this.getNonce(address);

        // Step 3: Sign the message with wallet
        const signature = await this.signMessage(address, message);
        console.log('✅ Got signature from wallet:', signature.slice(0, 20) + '...');

        // Step 4: Verify signature with backend
        console.log('📤 Posting signature to backend...');
        const response = await apiClient.post<{ token: string; user: AuthUser; requires2FA?: boolean; userId?: string }>(
          '/api/auth/wallet-connect',
          {
            walletAddress: address,
            signature,
            message
          }
        );
        console.log('📥 Backend signature verification response:', JSON.stringify(response).slice(0, 100));

        if (response.success && response.data) {
          // Check if 2FA is required
          if (response.data.requires2FA) {
            return {
              success: true,
              requires2FA: true,
              userId: response.data.userId,
              walletAddress: address
            } as any;
          }

          this.token = response.data.token;
          this.currentUser = this.createUserData(address, response.data.user);
          apiClient.setToken(this.token);

          await this.persistSession(this.token, this.currentUser);
          
          // Record successful authentication
          await this.recordSuccessfulAuth(address);

          return { success: true, token: this.token, user: this.currentUser };
        }

        // Record failed authentication
        await this.recordFailedAuth(address);
        return { success: false, error: response.error || 'Authentication failed' };
      })();

      globalAuthInProgress.set(addressKey, authPromise);

      const result = await authPromise;
      console.log('🔐 Auth flow completed with result:', { success: result.success, hasToken: !!result.token, hasUser: !!result.user });
      return result;
    } catch (error) {
      console.error('💥 Auth flow threw error:', error);
      await this.recordFailedAuth(address);
      return { success: false, error: (error as Error).message || 'Authentication failed' };
    } finally {
      // Clear from in-progress map after completion
      globalAuthInProgress.delete(addressKey);
    }
  }

  /**
   * Check security lockout status
   */
  private async checkSecurityLockout(): Promise<boolean> {
    try {
      // Dynamically import security service to avoid circular dependencies
      const { securityService } = await import('../../../apps/linkdao-mobile/src/services/securityService');
      return await securityService.isLockedOut();
    } catch (error) {
      console.warn('Security service not available, skipping lockout check:', error);
      return false;
    }
  }

  /**
   * Record successful authentication
   */
  private async recordSuccessfulAuth(address: string): Promise<void> {
    try {
      const { securityService } = await import('../../../apps/linkdao-mobile/src/services/securityService');
      await securityService.recordAuthAttempt(true);
      await securityService.startSession();
      await securityService.logAuditEvent('AUTH_SUCCESS', 'LOW', {
        address: address.substring(0, 6) + '...' + address.substring(address.length - 4)
      });
    } catch (error) {
      console.warn('Failed to record successful auth:', error);
    }
  }

  /**
   * Record failed authentication
   */
  private async recordFailedAuth(address: string): Promise<void> {
    try {
      const { securityService } = await import('../../../apps/linkdao-mobile/src/services/securityService');
      await securityService.recordAuthAttempt(false);
      await securityService.logAuditEvent('AUTH_FAILED', 'MEDIUM', {
        address: address.substring(0, 6) + '...' + address.substring(address.length - 4)
      });
    } catch (error) {
      console.warn('Failed to record failed auth:', error);
    }
  }
  private async getNonce(address: string): Promise<{ nonce: string; message: string }> {
    try {
      console.log('📡 Requesting nonce from backend for address:', address);
      const response = await apiClient.post<{ nonce: string; message }>(
        '/api/auth/nonce',
        { walletAddress: address }
      );

      console.log('📡 Backend response:', JSON.stringify(response));

      // Handle double-wrapped response structure
      let nonce: string | undefined;
      let message: string | undefined;

      if (response && (response as any).data) {
        // Backend is returning { success: true, data: { nonce, message } }
        nonce = (response as any).data.nonce;
        message = (response as any).data.message;
      } else {
        // Backend is returning { nonce, message } directly in response
        nonce = (response as any).nonce;
        message = (response as any).message;
      }

      if (nonce && message) {
        console.log('✅ Got nonce from backend:', nonce);
        console.log('✅ Got message from backend:', message);
        return { nonce, message };
      }

      console.warn('⚠️ Backend response not successful');
      throw new Error('Failed to retrieve authentication nonce from server');
    } catch (error) {
      console.error('❌ Failed to get nonce from backend:', error);
      throw error;
    }
  }

  /**
   * Sign message with wallet
   * Uses the configured wallet adapter to sign the message
   */
  private async signMessage(address: string, message: string): Promise<string> {
    // Use wallet adapter to sign the message
    return await signMessageWithWallet(message, address);
  }

  /**
   * Create user data from backend response
   */
  private createUserData(address: string, userData?: any): AuthUser {
    return {
      id: userData?.id || `user_${address}`,
      address: address,
      walletAddress: address,
      handle: userData?.handle || `user_${address.slice(0, 6)}`,
      ens: userData?.ens,
      email: userData?.email,
      kycStatus: userData?.kycStatus || 'none',
      role: (userData?.role as any) || 'user',
      permissions: userData?.permissions || [],
      isActive: userData?.isActive !== false,
      isSuspended: userData?.isSuspended === true,
      createdAt: userData?.createdAt || new Date().toISOString(),
      updatedAt: userData?.updatedAt || new Date().toISOString(),
      chainId: userData?.chainId,
      preferences: userData?.preferences,
      privacySettings: userData?.privacySettings,
      bio: userData?.bio,
      location: userData?.location,
      website: userData?.website,
      twitter: userData?.twitter,
      linkedin: userData?.linkedin,
      github: userData?.github,
    };
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/register', data);

      if (response.success && response.data) {
        this.token = response.data.token;
        this.currentUser = response.data.user;
        apiClient.setToken(this.token);

        await this.persistSession(response.data.token, response.data.user);

        return { success: true, token: this.token, user: this.currentUser };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.token = null;
      this.currentUser = null;
      apiClient.setToken(null);
      await this.clearSession();
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ token: string; user: AuthUser }>('/api/auth/refresh');

      if (response.success && response.data) {
        this.token = response.data.token;
        this.currentUser = response.data.user;
        apiClient.setToken(this.token);

        await this.persistSession(this.token, this.currentUser);

        return { success: true, token: this.token, user: this.currentUser };
      }

      return { success: false, error: 'Token refresh failed' };
    } catch (error) {
      return { success: false, error: 'Token refresh failed' };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<AuthUser>): Promise<AuthResponse> {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await apiClient.put<AuthUser>('/api/user/profile', data);

      if (response.success && response.data) {
        this.currentUser = { ...this.currentUser, ...response.data };
        return { success: true, user: this.currentUser };
      }

      return { success: false, error: 'Profile update failed' };
    } catch (error) {
      return { success: false, error: 'Profile update failed' };
    }
  }

  /**
   * Persist session (platform-specific)
   */
  private async persistSession(token: string, user: AuthUser): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  /**
   * Clear session (platform-specific)
   */
  private async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      await AsyncStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Restore session from storage (platform-specific) with enhanced validation
   */
  async restoreSession(): Promise<AuthResponse> {
    try {
      const token = await AsyncStorage.getItem(this.TOKEN_KEY);
      const userStr = await AsyncStorage.getItem(this.USER_KEY);

      if (token && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        this.token = token;
        this.currentUser = user;
        apiClient.setToken(token);

        // Verify session is still valid with timeout
        console.log('🔍 Validating stored session...');
        const verifyResponse = await Promise.race([
          apiClient.get<{ valid: boolean }>('/api/auth/verify'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session validation timeout')), 10000)
          )
        ]);

        if (verifyResponse && (verifyResponse as any).success && (verifyResponse as any).data?.valid) {
          console.log('✅ Session validation successful');
          return { success: true, token, user };
        } else {
          console.log('⚠️ Stored session invalid, clearing authentication');
          // Session invalid, clear it
          await this.logout();
        }
      }
    } catch (error) {
      console.error('❌ Failed to restore session:', error);
      // Clear potentially corrupted session data
      await this.clearSession();
    }

    return { success: false, error: 'No valid session found' };
  }

  /**
   * Auto-restore session on app initialization
   */
  async autoRestoreSession(): Promise<AuthResponse> {
    console.log('🔄 Attempting automatic session restoration...');
    
    try {
      // Check network connectivity first
      const networkState = await this.checkNetworkConnectivity();
      if (!networkState.isOnline) {
        console.log('使用網路离线，跳过会话验证');
        // Try to restore from local storage without backend validation
        const token = await AsyncStorage.getItem(this.TOKEN_KEY);
        const userStr = await AsyncStorage.getItem(this.USER_KEY);
        
        if (token && userStr) {
          const user = JSON.parse(userStr) as AuthUser;
          this.token = token;
          this.currentUser = user;
          apiClient.setToken(token);
          console.log('✅ 离线模式下恢复本地会话');
          return { success: true, token, user };
        }
        return { success: false, error: 'No local session available' };
      }

      // Online mode - full validation
      const result = await this.restoreSession();
      if (result.success) {
        console.log('✅ 自动会话恢复成功');
      } else {
        console.log('⚠️ 自动会话恢复失败:', result.error);
      }
      return result;
    } catch (error) {
      console.error('💥 自动会话恢复异常:', error);
      return { success: false, error: 'Session restoration failed' };
    }
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(): Promise<{ isOnline: boolean; type?: string }> {
    try {
      // For React Native, we can check using NetInfo or simple fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://api.linkdao.io/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return { isOnline: response.ok, type: 'online' };
    } catch (error) {
      return { isOnline: false, type: 'offline' };
    }
  }
}

// Export singleton instance
export const authService = new AuthService();