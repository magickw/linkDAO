import { getStorage } from '../utils/storage';
import { Config } from '../constants/config';

// ... (AuthUser and other interfaces)

class EnhancedAuthService {
  private baseUrl: string;
  // ... (other members)

  constructor() {
    this.baseUrl = Config.backendUrl;
    this.ready = this.initialize();
    this.setupPeriodicRefresh();
  }

  private async initialize(): Promise<void> {
    try {
      const storage = getStorage();
      if (!storage) return;

      this.sessionKey = await storage.getItem(this.STORAGE_KEYS.SESSION_KEY);
      if (!this.sessionKey) {
        this.sessionKey = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await storage.setItem(this.STORAGE_KEYS.SESSION_KEY, this.sessionKey);
      }

      const sessionDataStr = await storage.getItem(this.STORAGE_KEYS.SESSION_DATA);
      if (sessionDataStr) {
        const sessionData: SessionData | null = JSON.parse(sessionDataStr);
        if (sessionData && Date.now() < sessionData.expiresAt) {
          this.sessionData = sessionData;
          this.token = sessionData.token;
          console.log('✅ Restored valid session from storage');
        } else {
          await this.clearStoredSession();
        }
      }
    } catch (error) {
      console.error('Error initializing from storage:', error);
      await this.clearStoredSession();
    }
  }

  private setupPeriodicRefresh(): void {
    setInterval(() => {
      if (this.shouldRefreshToken()) {
        this.refreshToken().catch(error => {
          console.warn('Periodic token refresh failed:', error);
        });
      }
    }, 10 * 60 * 1000);
  }

  private shouldRefreshToken(): boolean {
    if (!this.sessionData || !this.token) return false;
    const timeUntilExpiry = this.sessionData.expiresAt - Date.now();
    return timeUntilExpiry < this.REFRESH_THRESHOLD && timeUntilExpiry > 0;
  }

  async authenticateWallet(
    address: string,
    connector: any,
    status: string,
    options: AuthenticationOptions = {}
  ): Promise<AuthResponse> {
    if (this.authenticationInProgress) {
      return { success: false, error: 'Authentication already in progress', retryable: false };
    }

    const now = Date.now();
    if (now - this.lastAuthAttempt < this.AUTH_COOLDOWN) {
      return { success: false, error: 'Please wait before attempting authentication again', retryable: true };
    }

    this.lastAuthAttempt = now;
    this.authenticationInProgress = true;

    try {
      if (!options.forceRefresh && !options.skipCache && this.hasValidSession(address)) {
        return { success: true, token: this.sessionData!.token, user: this.sessionData!.user };
      }

      // Mock authentication for now - in real implementation would involve signing
      const mockUser: AuthUser = {
        id: `user_${address}`,
        address,
        handle: `user_${address.slice(0, 6)}`,
        kycStatus: 'none',
        role: 'user',
        permissions: [],
        isActive: true,
        isSuspended: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockToken = 'mock_token_' + Math.random().toString(36).substring(2);
      await this.storeSession(mockToken, mockUser);

      return { success: true, token: mockToken, user: mockUser };
    } catch (error: any) {
      console.error('Authentication failed:', error);
      return { success: false, error: error.message || 'Unknown error', retryable: true };
    } finally {
      this.authenticationInProgress = false;
    }
  }

  private async storeSession(token: string, user: AuthUser, refreshToken?: string): Promise<void> {
    const now = Date.now();
    const expiresAt = now + this.SESSION_EXPIRY;
    this.sessionData = { token, user, timestamp: now, expiresAt, refreshToken };
    this.token = token;

    const storage = getStorage();
    if (storage) {
      try {
        await storage.setItem(this.STORAGE_KEYS.SESSION_DATA, JSON.stringify(this.sessionData));
        await storage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, token);
        if (refreshToken) {
          await storage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
      } catch (error) {
        console.error('Failed to store session:', error);
      }
    }
  }

  private async clearStoredSession(): Promise<void> {
    this.sessionData = null;
    this.token = null;
    const storage = getStorage();
    if (storage) {
      for (const key of Object.values(this.STORAGE_KEYS)) {
        await storage.removeItem(key);
      }
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    // Basic implementation
    return { success: false, error: 'Token refresh not implemented yet' };
  }

  async logout(): Promise<void> {
    await this.clearStoredSession();
  }

  isAuthenticated(): boolean {
    return !!(this.token && this.sessionData && Date.now() < this.sessionData.expiresAt);
  }

  getToken(): string | null {
    return this.isAuthenticated() ? this.token : null;
  }

  getWalletAddress(): string | null {
    return this.sessionData?.user?.address || null;
  }

  private hasValidSession(address: string): boolean {
    return !!(this.sessionData && this.token && 
      this.sessionData.user.address.toLowerCase() === address.toLowerCase() && 
      Date.now() < this.sessionData.expiresAt);
  }
}

export const enhancedAuthService = new EnhancedAuthService();
export default enhancedAuthService;
