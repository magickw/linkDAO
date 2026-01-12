/**
 * WebSocket Authentication Service
 * Provides authentication and authorization for WebSocket connections
 */

import { enhancedAuthService } from './enhancedAuthService';

export interface WebSocketAuthConfig {
  token?: string;
  userId?: string;
  connectionId?: string;
}

export interface AuthMessage {
  type: 'auth';
  token: string;
  userId: string;
  connectionId: string;
  timestamp: number;
}

export class WebSocketAuthService {
  private static instance: WebSocketAuthService;
  private authenticatedConnections: Map<string, WebSocketAuthConfig> = new Map();
  private pendingConnections: Map<string, Promise<boolean>> = new Map();
  private authTokens: Map<string, string> = new Map();

  private constructor() {}

  static getInstance(): WebSocketAuthService {
    if (!WebSocketAuthService.instance) {
      WebSocketAuthService.instance = new WebSocketAuthService();
    }
    return WebSocketAuthService.instance;
  }

  /**
   * Authenticate a WebSocket connection
   */
  async authenticate(connectionId: string, config: WebSocketAuthConfig = {}): Promise<boolean> {
    // Check if already authenticated
    if (this.isAuthenticated(connectionId)) {
      return true;
    }

    // Check if there's a pending authentication
    if (this.pendingConnections.has(connectionId)) {
      return this.pendingConnections.get(connectionId)!;
    }

    // Create authentication promise
    const authPromise = this.performAuthentication(connectionId, config);
    this.pendingConnections.set(connectionId, authPromise);

    try {
      const result = await authPromise;
      return result;
    } finally {
      this.pendingConnections.delete(connectionId);
    }
  }

  /**
   * Perform the actual authentication
   */
  private async performAuthentication(
    connectionId: string,
    config: WebSocketAuthConfig
  ): Promise<boolean> {
    try {
      // Get auth token from config or service
      const token = config.token || await this.getAuthToken();
      if (!token) {
        console.error('WebSocket authentication failed: No token available');
        return false;
      }

      // Get user ID from config or service
      const userId = config.userId || await this.getUserId();
      if (!userId) {
        console.error('WebSocket authentication failed: No user ID available');
        return false;
      }

      // Validate token with backend
      const isValid = await this.validateTokenWithBackend(token);
      if (!isValid) {
        console.error('WebSocket authentication failed: Invalid token');
        return false;
      }

      // Store authenticated connection
      this.authenticatedConnections.set(connectionId, {
        token,
        userId,
        connectionId: config.connectionId || connectionId,
      });

      // Store token mapping
      this.authTokens.set(token, connectionId);

      return true;
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      return false;
    }
  }

  /**
   * Get authentication token from enhanced auth service
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const sessionData = enhancedAuthService.getSessionData();
      return sessionData?.token || null;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Get user ID from enhanced auth service
   */
  private async getUserId(): Promise<string | null> {
    try {
      const sessionData = enhancedAuthService.getSessionData();
      return sessionData?.user?.address || null;
    } catch (error) {
      console.error('Failed to get user ID:', error);
      return null;
    }
  }

  /**
   * Validate token with backend
   */
  private async validateTokenWithBackend(token: string): Promise<boolean> {
    try {
      // In production, this would call the backend API
      // For now, we'll do basic validation
      if (typeof token !== 'string' || token.length < 20) {
        return false;
      }

      // Check if token looks like a JWT
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // TODO: Add backend validation
      // const response = await fetch('/api/auth/validate', {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // return response.ok;

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Check if a connection is authenticated
   */
  isAuthenticated(connectionId: string): boolean {
    return this.authenticatedConnections.has(connectionId);
  }

  /**
   * Get authentication config for a connection
   */
  getAuthConfig(connectionId: string): WebSocketAuthConfig | undefined {
    return this.authenticatedConnections.get(connectionId);
  }

  /**
   * Disconnect and deauthenticate a connection
   */
  disconnect(connectionId: string): void {
    const authConfig = this.authenticatedConnections.get(connectionId);
    if (authConfig?.token) {
      this.authTokens.delete(authConfig.token);
    }
    this.authenticatedConnections.delete(connectionId);
  }

  /**
   * Create authentication message to send over WebSocket
   */
  createAuthMessage(connectionId: string): AuthMessage | null {
    const authConfig = this.authenticatedConnections.get(connectionId);
    if (!authConfig) {
      return null;
    }

    return {
      type: 'auth',
      token: authConfig.token,
      userId: authConfig.userId,
      connectionId: authConfig.connectionId,
      timestamp: Date.now(),
    };
  }

  /**
   * Validate incoming WebSocket message
   */
  validateMessage(message: any, connectionId: string): boolean {
    // Check if connection is authenticated
    if (!this.isAuthenticated(connectionId)) {
      console.error('Message from unauthenticated connection:', connectionId);
      return false;
    }

    // Basic message validation
    if (!message || typeof message !== 'object') {
      return false;
    }

    // Check for required fields based on message type
    if (message.type) {
      switch (message.type) {
        case 'subscribe':
        case 'unsubscribe':
        case 'request':
          return typeof message.channel === 'string';
        case 'response':
          return typeof message.requestId === 'string';
        default:
          return true;
      }
    }

    return true;
  }

  /**
   * Rate limit check for WebSocket messages
   */
  private messageCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_MESSAGES_PER_MINUTE = 60;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute

  checkRateLimit(connectionId: string): boolean {
    const now = Date.now();
    const record = this.messageCounts.get(connectionId);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.messageCounts.set(connectionId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (record.count >= this.MAX_MESSAGES_PER_MINUTE) {
      console.error('WebSocket rate limit exceeded for:', connectionId);
      return false;
    }

    record.count++;
    return true;
  }

  /**
   * Clear all authenticated connections (e.g., on logout)
   */
  clearAll(): void {
    this.authenticatedConnections.clear();
    this.authTokens.clear();
    this.messageCounts.clear();
    this.pendingConnections.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    authenticatedConnections: number;
    pendingConnections: number;
    rateLimitedConnections: number;
  } {
    const now = Date.now();
    const rateLimitedCount = Array.from(this.messageCounts.values()).filter(
      (record) => record.count >= this.MAX_MESSAGES_PER_MINUTE && now < record.resetTime
    ).length;

    return {
      authenticatedConnections: this.authenticatedConnections.size,
      pendingConnections: this.pendingConnections.size,
      rateLimitedConnections: rateLimitedCount,
    };
  }
}

export const webSocketAuthService = WebSocketAuthService.getInstance();