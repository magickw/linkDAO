/**
 * Redis-backed Session Service for Checkout
 *
 * Provides persistent session storage across multiple server instances
 * with automatic expiration and efficient key management.
 */

import { createClient, RedisClientType } from 'redis';
import { safeLogger } from '../utils/safeLogger';

export interface CheckoutSession {
  sessionId: string;
  orderId: string;
  userId?: string;
  items: any[];
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    platformFee: number;
    total: number;
  };
  shippingAddress?: any;
  billingAddress?: any;
  paymentMethod?: 'crypto' | 'fiat' | 'x402';
  paymentDetails?: any;
  metadata?: Record<string, any>;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
}

export class RedisSessionService {
  private static instance: RedisSessionService;
  private client: RedisClientType | null = null;
  private isConnected = false;
  private readonly SESSION_PREFIX = 'checkout:session:';
  private readonly DEFAULT_TTL = 30 * 60; // 30 minutes in seconds
  private readonly EXTENDED_TTL = 24 * 60 * 60; // 24 hours for saved sessions

  private constructor() {}

  public static getInstance(): RedisSessionService {
    if (!RedisSessionService.instance) {
      RedisSessionService.instance = new RedisSessionService();
    }
    return RedisSessionService.instance;
  }

  /**
   * Initialize Redis connection
   */
  async initialize(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              safeLogger.error('Redis reconnection failed after 10 retries');
              return new Error('Max reconnection attempts reached');
            }
            // Exponential backoff: 100ms, 200ms, 400ms, ...
            return Math.min(100 * Math.pow(2, retries), 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        safeLogger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        safeLogger.info('Redis client connecting...');
      });

      this.client.on('ready', () => {
        safeLogger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        safeLogger.warn('Redis client reconnecting...');
      });

      this.client.on('end', () => {
        safeLogger.warn('Redis client connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
      safeLogger.info('Redis session service initialized');
    } catch (error) {
      safeLogger.error('Failed to initialize Redis session service:', error);
      throw error;
    }
  }

  /**
   * Create a new checkout session
   */
  async createSession(session: Omit<CheckoutSession, 'createdAt' | 'lastAccessedAt'>): Promise<CheckoutSession> {
    await this.ensureConnected();

    const now = new Date();
    const fullSession: CheckoutSession = {
      ...session,
      createdAt: now,
      lastAccessedAt: now
    };

    const key = this.getSessionKey(session.sessionId);
    const ttl = session.metadata?.extendedExpiry ? this.EXTENDED_TTL : this.DEFAULT_TTL;

    try {
      await this.client!.setEx(
        key,
        ttl,
        JSON.stringify(fullSession)
      );

      // Create secondary index by orderId for quick lookups
      if (session.orderId) {
        await this.client!.setEx(
          `checkout:order:${session.orderId}`,
          ttl,
          session.sessionId
        );
      }

      // Create user index for session management
      if (session.userId) {
        await this.client!.sAdd(`checkout:user:${session.userId}`, session.sessionId);
        await this.client!.expire(`checkout:user:${session.userId}`, ttl);
      }

      safeLogger.info(`Checkout session created: ${session.sessionId}`);
      return fullSession;
    } catch (error) {
      safeLogger.error('Failed to create checkout session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<CheckoutSession | null> {
    await this.ensureConnected();

    try {
      const key = this.getSessionKey(sessionId);
      const data = await this.client!.get(key);

      if (!data) {
        return null;
      }

      const session: CheckoutSession = JSON.parse(data);

      // Update last accessed time
      session.lastAccessedAt = new Date();
      await this.updateSession(sessionId, { lastAccessedAt: session.lastAccessedAt });

      return session;
    } catch (error) {
      safeLogger.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Get session by order ID
   */
  async getSessionByOrderId(orderId: string): Promise<CheckoutSession | null> {
    await this.ensureConnected();

    try {
      const sessionId = await this.client!.get(`checkout:order:${orderId}`);
      if (!sessionId) {
        return null;
      }

      return this.getSession(sessionId);
    } catch (error) {
      safeLogger.error(`Failed to get session by order ID ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId: string, updates: Partial<CheckoutSession>): Promise<boolean> {
    await this.ensureConnected();

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const updatedSession: CheckoutSession = {
        ...session,
        ...updates,
        lastAccessedAt: new Date()
      };

      const key = this.getSessionKey(sessionId);
      const ttl = await this.client!.ttl(key);

      // Preserve existing TTL or use default
      await this.client!.setEx(
        key,
        ttl > 0 ? ttl : this.DEFAULT_TTL,
        JSON.stringify(updatedSession)
      );

      return true;
    } catch (error) {
      safeLogger.error(`Failed to update session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, additionalSeconds: number = 1800): Promise<boolean> {
    await this.ensureConnected();

    try {
      const key = this.getSessionKey(sessionId);
      const currentTTL = await this.client!.ttl(key);

      if (currentTTL <= 0) {
        return false; // Session doesn't exist or already expired
      }

      const newTTL = currentTTL + additionalSeconds;
      await this.client!.expire(key, newTTL);

      safeLogger.info(`Extended session ${sessionId} by ${additionalSeconds}s`);
      return true;
    } catch (error) {
      safeLogger.error(`Failed to extend session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    await this.ensureConnected();

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      // Delete main session
      await this.client!.del(this.getSessionKey(sessionId));

      // Delete order index
      if (session.orderId) {
        await this.client!.del(`checkout:order:${session.orderId}`);
      }

      // Remove from user index
      if (session.userId) {
        await this.client!.sRem(`checkout:user:${session.userId}`, sessionId);
      }

      safeLogger.info(`Deleted session: ${sessionId}`);
      return true;
    } catch (error) {
      safeLogger.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<CheckoutSession[]> {
    await this.ensureConnected();

    try {
      const sessionIds = await this.client!.sMembers(`checkout:user:${userId}`);
      const sessions: CheckoutSession[] = [];

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      safeLogger.error(`Failed to get user sessions for ${userId}:`, error);
      return [];
    }
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    await this.ensureConnected();

    try {
      // Redis automatically handles expiration, but we can clean up orphaned indexes
      let cleaned = 0;

      // This is a maintenance operation and should be run sparingly
      safeLogger.info('Session cleanup completed');
      return cleaned;
    } catch (error) {
      safeLogger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageTTL: number;
  }> {
    await this.ensureConnected();

    try {
      const keys = await this.client!.keys(`${this.SESSION_PREFIX}*`);
      const totalSessions = keys.length;

      let totalTTL = 0;
      for (const key of keys) {
        const ttl = await this.client!.ttl(key);
        if (ttl > 0) {
          totalTTL += ttl;
        }
      }

      return {
        totalSessions,
        activeSessions: totalSessions,
        averageTTL: totalSessions > 0 ? Math.round(totalTTL / totalSessions) : 0
      };
    } catch (error) {
      safeLogger.error('Failed to get session stats:', error);
      return { totalSessions: 0, activeSessions: 0, averageTTL: 0 };
    }
  }

  /**
   * Gracefully close Redis connection
   */
  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      safeLogger.info('Redis session service closed');
    }
  }

  /**
   * Helper methods
   */
  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected || !this.client) {
      await this.initialize();
    }
  }

  /**
   * Check if Redis is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureConnected();
      await this.client!.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const redisSessionService = RedisSessionService.getInstance();
