/**
 * Authentication Service
 * Simplified auth service for mobile and web
 */

import { apiClient } from './apiClient';
import { ENV_CONFIG } from '../constants/environment';

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

  /**
   * Login with wallet signature
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
    // This will be implemented differently for web vs mobile
    // Web: localStorage
    // Mobile: AsyncStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('linkdao_token', token);
        window.localStorage.setItem('linkdao_user', JSON.stringify(user));
      } catch (error) {
        console.error('Failed to persist session:', error);
      }
    }
  }

  /**
   * Clear session (platform-specific)
   */
  private async clearSession(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('linkdao_token');
        window.localStorage.removeItem('linkdao_user');
      } catch (error) {
        console.error('Failed to clear session:', error);
      }
    }
  }

  /**
   * Restore session from storage (platform-specific)
   */
  async restoreSession(): Promise<AuthResponse> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const token = window.localStorage.getItem('linkdao_token');
        const userStr = window.localStorage.getItem('linkdao_user');

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
    }

    return { success: false, error: 'No valid session' };
  }
}

// Export singleton instance
export const authService = new AuthService();