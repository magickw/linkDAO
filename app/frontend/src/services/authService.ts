import { signMessage } from '@wagmi/core';
import { config } from '@/lib/wagmi';

export interface AuthUser {
  id: string;
  address: string;
  handle: string;
  ens?: string;
  email?: string;
  kycStatus: 'none' | 'pending' | 'basic' | 'intermediate' | 'advanced';
  kycTier?: string;
  role: 'user' | 'moderator' | 'admin' | 'super_admin';
  permissions?: string[];
  isSuspended?: boolean;
  suspensionReason?: string;
  suspensionExpiresAt?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
    };
    privacy?: {
      showEmail?: boolean;
      showTransactions?: boolean;
      allowDirectMessages?: boolean;
    };
    trading?: {
      autoApproveSmallAmounts?: boolean;
      defaultSlippage?: number;
      preferredCurrency?: string;
    };
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'private' | 'friends';
    activityVisibility?: 'public' | 'private' | 'friends';
    contactVisibility?: 'public' | 'private' | 'friends';
  };
  sessionInfo?: {
    lastLogin?: string;
    loginCount?: number;
    deviceInfo?: any;
  };
  createdAt: string;
}

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

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  /**
   * Get authentication nonce for wallet signature
   */
  async getNonce(address: string): Promise<{ nonce: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/nonce/${address}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get nonce');
      }
      
      return { nonce: data.nonce, message: data.message };
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
    try {
      // Ensure wallet is connected and ready
      if (!connector) {
        return { success: false, error: 'Connector not available' };
      }
      
      if (status !== 'connected') {
        return { success: false, error: 'Wallet not connected' };
      }

      // Add small delay to ensure connector is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get nonce and message
      const { nonce, message } = await this.getNonce(address);
      
      // Check if we're running in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('Wallet authentication requires browser environment');
      }
      
      let signature: string;
      try {
        // Sign message with wallet - this will prompt the user
        signature = await signMessage(config, { message });
        
        if (!signature) {
          throw new Error('Signature is required for authentication');
        }
      } catch (signError: any) {
        // Handle specific signing errors
        if (signError.message?.includes('rejected') || signError.message?.includes('denied')) {
          throw new Error('Signature request was rejected by user');
        } else if (signError.message?.includes('not supported')) {
          throw new Error('Your wallet does not support message signing');
        } else {
          console.error('Signing error:', signError);
          throw new Error('Failed to sign authentication message');
        }
      }
      
      // Send authentication request
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/wallet`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address,
            signature,
            message,
            nonce,
          }),
        });
        
        if (!response.ok) {
          // If backend is not available, return success with mock user
          if (response.status >= 500 || !response.status) {
            console.warn('Backend unavailable, proceeding with mock authentication');
            return this.createMockAuthResponse(address);
          }
          const errorData = await response.json().catch(() => ({ error: 'Network error' }));
          throw new Error(errorData.error || `Authentication failed (${response.status})`);
        }
        
        const data = await response.json();
        
        if (data.success && data.token) {
          this.setToken(data.token);
          console.log('Authentication successful for address:', address);
        } else {
          throw new Error(data.error || 'Authentication failed - no token received');
        }
        
        return data;
      } catch (fetchError: any) {
        // If fetch fails (network error, backend down), use mock authentication
        if (fetchError.name === 'TypeError' || fetchError.message.includes('fetch')) {
          console.warn('Backend unavailable, proceeding with mock authentication');
          return this.createMockAuthResponse(address);
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Wallet authentication failed:', error);
      // If it's a network error, proceed without authentication
      if (error.message?.includes('fetch') || error.message?.includes('Network')) {
        console.warn('Network error, proceeding without authentication');
        return { success: true };
      }
      return {
        success: false,
        error: error.message || 'Authentication failed'
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
          ens: undefined,
          email: undefined,
          kycStatus: 'none',
          role: 'user',
          permissions: [],
          preferences: {
            notifications: {
              email: true,
              push: true,
              inApp: true,
            },
            privacy: {
              showEmail: false,
              showTransactions: true,
              allowDirectMessages: true,
            },
            trading: {
              autoApproveSmallAmounts: false,
              defaultSlippage: 0.5,
              preferredCurrency: 'USD',
            },
          },
          privacySettings: {
            profileVisibility: 'public',
            activityVisibility: 'public',
            contactVisibility: 'friends',
          },
          createdAt: new Date().toISOString(),
        };
      }
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        return data.user;
      }
      
      // Token might be invalid, clear it
      if (response.status === 401 || response.status === 403) {
        this.clearToken();
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
            kycStatus: 'none',
            role: 'user',
            createdAt: new Date().toISOString(),
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
      
      const data = await response.json();
      
      if (data.success) {
        return data;
      }
      
      return null;
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
    if (this.token) {
      try {
        await fetch(`${this.baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }
    
    this.clearToken();
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
    return this.token;
  }

  /**
   * Set authentication token
   */
  private setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  /**
   * Clear authentication token
   */
  private clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Create mock authentication response for offline mode
   */
  private createMockAuthResponse(address: string): AuthResponse {
    const mockToken = `mock_token_${address}_${Date.now()}`;
    const mockUser: AuthUser = {
      id: `mock_${address}`,
      address: address,
      handle: `user_${address.slice(0, 6)}`,
      ens: undefined,
      email: undefined,
      kycStatus: 'none',
      role: 'user',
      permissions: [],
      preferences: {
        notifications: {
          email: true,
          push: true,
          inApp: true,
        },
        privacy: {
          showEmail: false,
          showTransactions: true,
          allowDirectMessages: true,
        },
        trading: {
          autoApproveSmallAmounts: false,
          defaultSlippage: 0.5,
          preferredCurrency: 'USD',
        },
      },
      privacySettings: {
        profileVisibility: 'public',
        activityVisibility: 'public',
        contactVisibility: 'friends',
      },
      createdAt: new Date().toISOString(),
    };

    this.setToken(mockToken);
    console.log('Mock authentication successful for address:', address);
    
    return {
      success: true,
      token: mockToken,
      user: mockUser,
    };
  }

  /**
   * Get authorization headers
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }
}

export const authService = new AuthService();
export default authService;