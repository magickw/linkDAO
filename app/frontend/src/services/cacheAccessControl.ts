/**
 * Cache Access Control and Session Management
 * Implements user-scoped cache isolation with session binding
 */

interface UserSession {
  userId: string;
  sessionId: string;
  walletAddress?: string;
  timestamp: number;
  expiresAt: number;
}

interface CacheAccessPolicy {
  userScoped: boolean;
  sessionBound: boolean;
  encryptionRequired: string[]; // URL patterns requiring encryption
  maxAge: number;
  allowedOrigins: string[];
}

interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  userScope?: string;
}

export class CacheAccessControl {
  private readonly SESSION_STORAGE_KEY = 'cache-session-v1';
  private readonly ACCESS_POLICY_STORE = 'cache-access-policy-v1';
  private currentSession: UserSession | null = null;
  private db: IDBDatabase | null = null;

  private readonly DEFAULT_POLICY: CacheAccessPolicy = {
    userScoped: true,
    sessionBound: true,
    encryptionRequired: ['/api/messages', '/api/wallet', '/api/user/private'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    allowedOrigins: [typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000']
  };

  /**
   * Initialize access control system
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.loadCurrentSession();
      this.setupSessionListeners();
      console.log('Cache access control initialized');
    } catch (error) {
      console.error('Failed to initialize cache access control:', error);
    }
  }

  /**
   * Create user-scoped cache key with session binding
   */
  generateSecureCacheKey(url: string, options: any = {}): string {
    const session = this.getCurrentSession();
    if (!session) {
      throw new Error('No active session for cache access');
    }

    // Generate base key
    const baseKey = this.normalizeUrl(url);
    
    // Add user scope
    const userScope = options.userScope || session.userId;
    
    // Add session binding if required
    const sessionBinding = this.shouldBindToSession(url) ? session.sessionId : '';
    
    // Combine components
    const components = [userScope, sessionBinding, baseKey].filter(Boolean);
    return components.join(':');
  }

  /**
   * Validate cache access permissions
   */
  async validateCacheAccess(url: string, operation: 'read' | 'write' | 'delete'): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      // Check if user has active session
      const session = this.getCurrentSession();
      if (!session) {
        result.errors.push('No active user session');
        return result;
      }

      // Check session validity
      if (Date.now() > session.expiresAt) {
        result.errors.push('Session expired');
        await this.clearSession();
        return result;
      }

      // Check origin validation
      if (!this.validateOrigin()) {
        result.errors.push('Invalid origin for cache access');
        return result;
      }

      // Check URL pattern permissions
      const urlValidation = this.validateUrlPattern(url);
      if (!urlValidation.isValid) {
        result.errors.push(...urlValidation.errors);
        result.warnings.push(...urlValidation.warnings);
      }

      // Check encryption requirements
      if (this.requiresEncryption(url) && operation === 'write') {
        result.warnings.push('URL requires encrypted storage');
      }

      // Set user scope for valid access
      if (result.errors.length === 0) {
        result.isValid = true;
        result.userScope = session.userId;
      }

      return result;
    } catch (error) {
      result.errors.push(`Access validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Set current user session
   */
  async setUserSession(userId: string, walletAddress?: string): Promise<void> {
    try {
      const sessionId = this.generateSessionId();
      const timestamp = Date.now();
      const expiresAt = timestamp + this.DEFAULT_POLICY.maxAge;

      const session: UserSession = {
        userId,
        sessionId,
        walletAddress,
        timestamp,
        expiresAt
      };

      // Store session
      await this.storeSession(session);
      this.currentSession = session;

      console.log(`Cache session created for user: ${userId}`);
    } catch (error) {
      console.error('Failed to set user session:', error);
      throw error;
    }
  }

  /**
   * Clear current session and associated caches
   */
  async clearSession(): Promise<void> {
    try {
      const session = this.getCurrentSession();
      if (session) {
        // Clear user-scoped cache entries
        await this.clearUserScopedCaches(session.userId);
        
        // Remove session storage
        await this.removeStoredSession();
        this.currentSession = null;

        console.log(`Cache session cleared for user: ${session.userId}`);
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Switch user account (clear old session, set new one)
   */
  async switchUserAccount(newUserId: string, walletAddress?: string): Promise<void> {
    try {
      // Clear current session and caches
      await this.clearSession();
      
      // Set new session
      await this.setUserSession(newUserId, walletAddress);
      
      console.log(`Switched cache session to user: ${newUserId}`);
    } catch (error) {
      console.error('Failed to switch user account:', error);
      throw error;
    }
  }

  /**
   * Get current session information
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Check if URL requires encryption
   */
  requiresEncryption(url: string): boolean {
    return this.DEFAULT_POLICY.encryptionRequired.some(pattern => 
      this.matchesPattern(url, pattern)
    );
  }

  /**
   * Validate user permissions for cache operation
   */
  async validateUserPermissions(userId: string, operation: string, resource: string): Promise<boolean> {
    try {
      const session = this.getCurrentSession();
      if (!session || session.userId !== userId) {
        return false;
      }

      // Add custom permission logic here based on user roles, etc.
      // For now, basic session validation
      return Date.now() < session.expiresAt;
    } catch (error) {
      console.error('Failed to validate user permissions:', error);
      return false;
    }
  }

  // Private methods

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CacheAccessControl', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create session store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'userId' });
          sessionStore.createIndex('sessionId', 'sessionId', { unique: true });
          sessionStore.createIndex('expiresAt', 'expiresAt');
        }
        
        // Create access policy store
        if (!db.objectStoreNames.contains('accessPolicies')) {
          db.createObjectStore('accessPolicies', { keyPath: 'pattern' });
        }
      };
    });
  }

  private async loadCurrentSession(): Promise<void> {
    try {
      // Try to load from IndexedDB first
      const storedSession = await this.getStoredSession();
      if (storedSession && Date.now() < storedSession.expiresAt) {
        this.currentSession = storedSession;
        return;
      }

      // Clear expired session
      if (storedSession) {
        await this.removeStoredSession();
      }
    } catch (error) {
      console.warn('Failed to load current session:', error);
    }
  }

  private setupSessionListeners(): void {
    // Listen for storage events (session changes in other tabs)
    window.addEventListener('storage', (event) => {
      if (event.key === this.SESSION_STORAGE_KEY) {
        this.handleSessionChange();
      }
    });

    // Listen for beforeunload to cleanup
    window.addEventListener('beforeunload', () => {
      // Don't clear session on page unload, only on explicit logout
    });

    // Listen for visibility change to validate session
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.validateCurrentSession();
      }
    });
  }

  private async handleSessionChange(): Promise<void> {
    try {
      await this.loadCurrentSession();
    } catch (error) {
      console.error('Failed to handle session change:', error);
    }
  }

  private async validateCurrentSession(): Promise<void> {
    const session = this.getCurrentSession();
    if (session && Date.now() > session.expiresAt) {
      await this.clearSession();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizeUrl(url: string): string {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const urlObj = new URL(url, baseUrl);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  }

  private shouldBindToSession(url: string): boolean {
    // Bind sensitive endpoints to session
    const sessionBoundPatterns = [
      '/api/user',
      '/api/wallet',
      '/api/messages',
      '/api/admin'
    ];
    
    return sessionBoundPatterns.some(pattern => url.includes(pattern));
  }

  private validateOrigin(): boolean {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return this.DEFAULT_POLICY.allowedOrigins.includes(currentOrigin);
  }

  private validateUrlPattern(url: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Add URL pattern validation logic
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      new URL(url, baseUrl);
    } catch {
      result.isValid = false;
      result.errors.push('Invalid URL format');
    }

    return result;
  }

  private matchesPattern(url: string, pattern: string): boolean {
    return url.includes(pattern);
  }

  private async storeSession(session: UserSession): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      const request = store.put(session);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getStoredSession(): Promise<UserSession | null> {
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      
      // Get the most recent session (assuming single user for now)
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result;
        if (sessions.length > 0) {
          // Return the most recent session
          const latestSession = sessions.sort((a, b) => b.timestamp - a.timestamp)[0];
          resolve(latestSession);
        } else {
          resolve(null);
        }
      };
    });
  }

  private async removeStoredSession(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');
      
      // Clear all sessions for now (single user assumption)
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async clearUserScopedCaches(userId: string): Promise<void> {
    try {
      // Clear from all cache instances
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const url = request.url;
          // Check if cache key contains user scope
          if (url.includes(`${userId}:`)) {
            await cache.delete(request);
          }
        }
      }
      
      console.log(`Cleared user-scoped caches for user: ${userId}`);
    } catch (error) {
      console.error('Failed to clear user-scoped caches:', error);
    }
  }
}

// Export singleton instance
export const cacheAccessControl = new CacheAccessControl();