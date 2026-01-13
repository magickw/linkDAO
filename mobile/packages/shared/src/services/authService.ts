/**
 * Authentication Service
 * Simplified auth service for mobile and web
 */

import { apiClient } from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  address: string;
  handle?: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  role: 'user' | 'admin' | 'moderator';
  tier: 'free' | 'basic' | 'premium' | 'enterprise';
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
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

    try {
      // Step 1: Get authentication message and nonce from backend
      const { nonce, message } = await this.getNonce(address);

      // Step 2: Sign the message with wallet
      const signature = await this.signMessage(address, message);

      // Step 3: Verify signature with backend
      const response = await apiClient.post<{ token: string; user: AuthUser; requires2FA?: boolean; userId?: string }>(
        '/api/auth/wallet-connect',
        {
          walletAddress: address,
          signature,
          message
        }
      );

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

        return { success: true, token: this.token, user: this.currentUser };
      }

      return { success: false, error: response.error || 'Authentication failed' };
    } catch (error) {
      return { success: false, error: (error as Error).message || 'Authentication failed' };
    }
  }

  /**
   * Get authentication nonce and message from backend
   */
  private async getNonce(address: string): Promise<{ nonce: string; message: string }> {
    try {
      const response = await apiClient.post<{ nonce: string; message }>(
        '/api/auth/nonce',
        { walletAddress: address }
      );

      if (response.success && response.data) {
        return {
          nonce: response.data.nonce,
          message: response.data.message
        };
      }

      // Fallback nonce generation
      const fallbackNonce = `fallback_nonce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fallbackMessage = `Sign this message to authenticate with LinkDAO: ${Date.now()}`;
      return { nonce: fallbackNonce, message: fallbackMessage };
    } catch (error) {
      // Fallback nonce generation
      const fallbackNonce = `fallback_nonce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fallbackMessage = `Sign this message to authenticate with LinkDAO: ${Date.now()}`;
      return { nonce: fallbackNonce, message: fallbackMessage };
    }
  }

  /**
   * Sign message with wallet
   * This is a stub - actual implementation would integrate with wallet provider
   */
  private async signMessage(address: string, message: string): Promise<string> {
    // In a real implementation, this would integrate with wallet providers like:
    // - WalletConnect
    // - MetaMask (if available in mobile)
    // - Native wallet SDKs
    // For now, return a mock signature
    const mockSignature = `0x${Buffer.from(message).toString('hex').padEnd(130, '0').substring(0, 130)}`;
    return mockSignature;
  }

  /**
   * Create user data from backend response
   */
  private createUserData(address: string, userData?: any): AuthUser {
    return {
      id: userData?.id || `user_${address}`,
      address: address,
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
      privacySettings: userData?.privacySettings
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
   * Restore session from storage (platform-specific)
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

        // Verify session is still valid
        const verifyResponse = await apiClient.get<{ valid: boolean }>('/api/auth/verify');
        if (verifyResponse.success && verifyResponse.data?.valid) {
          return { success: true, token, user };
        } else {
          // Session invalid, clear it
          await this.logout();
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }

    return { success: false, error: 'No valid session' };
  }
}

// Export singleton instance
export const authService = new AuthService();