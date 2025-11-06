/**
 * Enhanced Session Manager
 * Handles session persistence, CORS authentication, and cross-origin token storage
 * with proper security measures and recovery mechanisms
 */

import { enhancedRequestManager } from './enhancedRequestManager';
import { apiCircuitBreaker } from './circuitBreaker';

export interface SessionData {
  token: string;
  refreshToken?: string;
  user: any;
  expiresAt: number;
  createdAt: number;
  lastRefresh: number;
  walletAddress: string;
  chainId?: number;
}

export interface SessionOptions {
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
  maxAge?: number;
}

export interface CrossOriginAuthConfig {
  allowedOrigins: string[];
  trustedDomains: string[];
  corsCredentials: boolean;
  secureTokenStorage: boolean;
}

/**
 * Enhanced Session Manager with CORS support
 */
class SessionManager {
  private readonly STORAGE_PREFIX = 'linkdao_';
  private readonly SESSION_KEY = 'session_data';
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly SIGNATURE_KEY = 'signature_timestamp';
  private readonly WALLET_KEY = 'wallet_address';
  
  private readonly DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours before expiry
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private corsConfig: CrossOriginAuthConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(corsConfig?: Partial<CrossOriginAuthConfig>) {
    this.corsConfig = {
      allowedOrigins: [
        'https://linkdao.io',
        'https://www.linkdao.io',
        'https://app.linkdao.io',
        'https://marketplace.linkdao.io',
        'https://linkdao.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      trustedDomains: ['linkdao.io', 'vercel.app'],
      corsCredentials: true,
      secureTokenStorage: process.env.NODE_ENV === 'production',
      ...corsConfig
    };

    this.initializeCleanup();
    this.setupCrossOriginListener();
  }

  /**
   * Store session data with CORS-compatible storage
   */
  async storeSession(sessionData: Omit<SessionData, 'createdAt' | 'lastRefresh'>): Promise<void> {
    const now = Date.now();
    const fullSessionData: SessionData = {
      ...sessionData,
      createdAt: now,
      lastRefresh: now
    };

    try {
      // Store in localStorage with encryption if secure mode
      if (typeof window !== 'undefined') {
        const dataToStore = this.corsConfig.secureTokenStorage 
          ? this.encryptSessionData(fullSessionData)
          : JSON.stringify(fullSessionData);

        localStorage.setItem(this.getStorageKey(this.SESSION_KEY), dataToStore);
        localStorage.setItem(this.getStorageKey(this.TOKEN_KEY), sessionData.token);
        localStorage.setItem(this.getStorageKey(this.WALLET_KEY), sessionData.walletAddress);
        localStorage.setItem(this.getStorageKey(this.SIGNATURE_KEY), now.toString());

        if (sessionData.refreshToken) {
          localStorage.setItem(this.getStorageKey(this.REFRESH_KEY), sessionData.refreshToken);
        }

        console.log('✅ Session stored successfully');
      }

      // Store in secure cross-origin storage if available
      await this.storeCrossOriginSession(fullSessionData);

    } catch (error) {
      console.error('Failed to store session:', error);
      throw new Error('Session storage failed');
    }
  }

  /**
   * Retrieve session data with validation
   */
  async getSession(): Promise<SessionData | null> {
    try {
      // Try localStorage first
      const localSession = this.getLocalSession();
      if (localSession && this.isSessionValid(localSession)) {
        return localSession;
      }

      // Try cross-origin storage
      const crossOriginSession = await this.getCrossOriginSession();
      if (crossOriginSession && this.isSessionValid(crossOriginSession)) {
        // Sync back to localStorage
        await this.storeSession(crossOriginSession);
        return crossOriginSession;
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve session:', error);
      return null;
    }
  }

  /**
   * Get session from localStorage
   */
  private getLocalSession(): SessionData | null {
    if (typeof window === 'undefined') return null;

    try {
      const sessionDataStr = localStorage.getItem(this.getStorageKey(this.SESSION_KEY));
      if (!sessionDataStr) return null;

      const sessionData = this.corsConfig.secureTokenStorage
        ? this.decryptSessionData(sessionDataStr)
        : JSON.parse(sessionDataStr);

      return sessionData;
    } catch (error) {
      console.error('Failed to parse local session:', error);
      return null;
    }
  }

  /**
   * Validate session data
   */
  private isSessionValid(session: SessionData): boolean {
    const now = Date.now();
    
    // Check expiration
    if (now >= session.expiresAt) {
      console.log('Session expired');
      return false;
    }

    // Check required fields
    if (!session.token || !session.walletAddress) {
      console.log('Session missing required fields');
      return false;
    }

    return true;
  }

  /**
   * Refresh session token
   */
  async refreshSession(currentSession: SessionData): Promise<SessionData | null> {
    if (!currentSession.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      return await apiCircuitBreaker.execute(
        async () => {
          const response = await enhancedRequestManager.request<any>(
            '/api/auth/refresh',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession.token}`,
                'X-Wallet-Address': currentSession.walletAddress
              },
              body: JSON.stringify({
                refreshToken: currentSession.refreshToken,
                walletAddress: currentSession.walletAddress
              })
            },
            {
              timeout: 10000,
              retries: 2,
              fallbackData: null
            }
          );

          if (!response.success || !response.token) {
            throw new Error(response.error || 'Token refresh failed');
          }

          const refreshedSession: SessionData = {
            ...currentSession,
            token: response.token,
            refreshToken: response.refreshToken || currentSession.refreshToken,
            lastRefresh: Date.now(),
            expiresAt: Date.now() + this.DEFAULT_EXPIRY
          };

          await this.storeSession(refreshedSession);
          return refreshedSession;
        },
        async () => {
          // Fallback: extend current session temporarily
          console.warn('Token refresh failed, extending current session');
          const extendedSession: SessionData = {
            ...currentSession,
            expiresAt: Date.now() + (30 * 60 * 1000), // Extend by 30 minutes
            lastRefresh: Date.now()
          };
          
          await this.storeSession(extendedSession);
          return extendedSession;
        }
      );
    } catch (error: any) {
      console.error('Session refresh failed:', error);
      throw error;
    }
  }

  /**
   * Check if session needs refresh
   */
  shouldRefreshSession(session: SessionData): boolean {
    const timeUntilExpiry = session.expiresAt - Date.now();
    return timeUntilExpiry < this.REFRESH_THRESHOLD && timeUntilExpiry > 0;
  }

  /**
   * Clear session data
   */
  async clearSession(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        // Clear localStorage
        const keys = [
          this.SESSION_KEY,
          this.TOKEN_KEY,
          this.REFRESH_KEY,
          this.SIGNATURE_KEY,
          this.WALLET_KEY
        ];

        keys.forEach(key => {
          localStorage.removeItem(this.getStorageKey(key));
        });
      }

      // Clear cross-origin storage
      await this.clearCrossOriginSession();

      console.log('✅ Session cleared successfully');
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Handle cross-origin authentication
   */
  async authenticateWithCORS(
    walletAddress: string,
    signature: string,
    nonce: string,
    origin?: string
  ): Promise<SessionData> {
    // Validate origin if provided
    if (origin && !this.isOriginAllowed(origin)) {
      throw new Error('Origin not allowed for cross-origin authentication');
    }

    try {
      const response = await enhancedRequestManager.request<any>(
        '/api/auth/wallet',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': origin || window.location.origin,
            'X-Requested-With': 'XMLHttpRequest',
            'X-Wallet-Address': walletAddress
          },
          credentials: this.corsConfig.corsCredentials ? 'include' : 'same-origin',
          body: JSON.stringify({
            walletAddress,
            signature,
            nonce,
            origin: origin || window.location.origin
          })
        },
        {
          timeout: 15000,
          retries: 2
        }
      );

      if (!response.success || !response.sessionToken) {
        throw new Error(response.error || 'Authentication failed');
      }

      const sessionData: SessionData = {
        token: response.sessionToken,
        refreshToken: response.refreshToken,
        user: response.user || { address: walletAddress },
        expiresAt: Date.now() + this.DEFAULT_EXPIRY,
        createdAt: Date.now(),
        lastRefresh: Date.now(),
        walletAddress,
        chainId: response.chainId
      };

      await this.storeSession(sessionData);
      return sessionData;

    } catch (error: any) {
      console.error('CORS authentication failed:', error);
      throw error;
    }
  }

  /**
   * Store session in cross-origin storage (postMessage API)
   */
  private async storeCrossOriginSession(sessionData: SessionData): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Only store in trusted domains
      const trustedFrames = this.getTrustedFrames();
      
      for (const frame of trustedFrames) {
        frame.postMessage({
          type: 'STORE_SESSION',
          sessionData: this.corsConfig.secureTokenStorage 
            ? this.encryptSessionData(sessionData)
            : sessionData,
          origin: window.location.origin
        }, '*');
      }
    } catch (error) {
      console.warn('Cross-origin session storage failed:', error);
    }
  }

  /**
   * Get session from cross-origin storage
   */
  private async getCrossOriginSession(): Promise<SessionData | null> {
    if (typeof window === 'undefined') return null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 2000);

      const messageHandler = (event: MessageEvent) => {
        if (!this.isOriginAllowed(event.origin)) return;

        if (event.data.type === 'SESSION_DATA' && event.data.sessionData) {
          clearTimeout(timeout);
          window.removeEventListener('message', messageHandler);
          
          try {
            const sessionData = this.corsConfig.secureTokenStorage
              ? this.decryptSessionData(event.data.sessionData)
              : event.data.sessionData;
            resolve(sessionData);
          } catch (error) {
            resolve(null);
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Request session from trusted frames
      const trustedFrames = this.getTrustedFrames();
      for (const frame of trustedFrames) {
        frame.postMessage({
          type: 'GET_SESSION',
          origin: window.location.origin
        }, '*');
      }
    });
  }

  /**
   * Clear cross-origin session
   */
  private async clearCrossOriginSession(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const trustedFrames = this.getTrustedFrames();
      
      for (const frame of trustedFrames) {
        frame.postMessage({
          type: 'CLEAR_SESSION',
          origin: window.location.origin
        }, '*');
      }
    } catch (error) {
      console.warn('Cross-origin session clearing failed:', error);
    }
  }

  /**
   * Setup cross-origin message listener
   */
  private setupCrossOriginListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      if (!this.isOriginAllowed(event.origin)) return;

      switch (event.data.type) {
        case 'GET_SESSION':
          this.handleCrossOriginSessionRequest(event);
          break;
        case 'STORE_SESSION':
          this.handleCrossOriginSessionStore(event);
          break;
        case 'CLEAR_SESSION':
          this.handleCrossOriginSessionClear(event);
          break;
      }
    });
  }

  /**
   * Handle cross-origin session request
   */
  private handleCrossOriginSessionRequest(event: MessageEvent): void {
    const session = this.getLocalSession();
    
    event.source?.postMessage({
      type: 'SESSION_DATA',
      sessionData: session ? (this.corsConfig.secureTokenStorage 
        ? this.encryptSessionData(session)
        : session) : null,
      origin: window.location.origin
    }, event.origin);
  }

  /**
   * Handle cross-origin session store
   */
  private handleCrossOriginSessionStore(event: MessageEvent): void {
    try {
      const sessionData = this.corsConfig.secureTokenStorage
        ? this.decryptSessionData(event.data.sessionData)
        : event.data.sessionData;
      
      this.storeSession(sessionData);
    } catch (error) {
      console.error('Failed to store cross-origin session:', error);
    }
  }

  /**
   * Handle cross-origin session clear
   */
  private handleCrossOriginSessionClear(event: MessageEvent): void {
    this.clearSession();
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    return this.corsConfig.allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      }
      return false;
    });
  }

  /**
   * Get trusted frames for cross-origin communication
   */
  private getTrustedFrames(): Window[] {
    if (typeof window === 'undefined') return [];

    const frames: Window[] = [];
    
    try {
      // Check for trusted iframes
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        if (iframe.contentWindow && this.isTrustedDomain(iframe.src)) {
          frames.push(iframe.contentWindow);
        }
      }

      // Check parent window if in iframe
      if (window.parent !== window && this.isTrustedDomain(document.referrer)) {
        frames.push(window.parent);
      }
    } catch (error) {
      console.warn('Failed to get trusted frames:', error);
    }

    return frames;
  }

  /**
   * Check if domain is trusted
   */
  private isTrustedDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.corsConfig.trustedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Initialize cleanup timer
   */
  private initializeCleanup(): void {
    if (typeof window === 'undefined') return;

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
    });
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    try {
      const session = this.getLocalSession();
      if (session && !this.isSessionValid(session)) {
        console.log('Cleaning up expired session');
        this.clearSession();
      }
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  /**
   * Get storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  /**
   * Encrypt session data (basic implementation)
   */
  private encryptSessionData(data: SessionData): string {
    // In production, use proper encryption
    // This is a basic implementation for demonstration
    try {
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch {
      return JSON.stringify(data);
    }
  }

  /**
   * Decrypt session data (basic implementation)
   */
  private decryptSessionData(encryptedData: string): SessionData {
    // In production, use proper decryption
    // This is a basic implementation for demonstration
    try {
      const jsonString = atob(encryptedData);
      return JSON.parse(jsonString);
    } catch {
      return JSON.parse(encryptedData);
    }
  }

  /**
   * Get session status for debugging
   */
  getSessionStatus(): {
    hasSession: boolean;
    isValid: boolean;
    expiresAt?: number;
    timeUntilExpiry?: number;
    needsRefresh: boolean;
    walletAddress?: string;
  } {
    const session = this.getLocalSession();
    
    if (!session) {
      return {
        hasSession: false,
        isValid: false,
        needsRefresh: false
      };
    }

    const isValid = this.isSessionValid(session);
    const timeUntilExpiry = session.expiresAt - Date.now();

    return {
      hasSession: true,
      isValid,
      expiresAt: session.expiresAt,
      timeUntilExpiry: timeUntilExpiry > 0 ? timeUntilExpiry : 0,
      needsRefresh: this.shouldRefreshSession(session),
      walletAddress: session.walletAddress
    };
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();
export default sessionManager;