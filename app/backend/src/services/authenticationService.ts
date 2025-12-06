import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import { eq, and, gt, lt } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { authSessions, walletAuthAttempts, walletNonces, users } from '../db/schema';

export interface AuthResult {
  success: boolean;
  sessionToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: AuthError;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface SessionInfo {
  id: string;
  walletAddress: string;
  sessionToken: string;
  expiresAt: Date;
  isActive: boolean;
  lastUsedAt: Date;
  role?: string;
  permissions?: string[];
  userId?: string;
  handle?: string;
  email?: string;
  kycStatus?: string;
  isActiveUser?: boolean;
  isSuspended?: boolean;
}

export interface NonceInfo {
  nonce: string;
  message: string;
  expiresAt: Date;
}

export class AuthenticationService {
  private db: ReturnType<typeof drizzle>;
  private jwtSecret: string;
  private sessionExpiryHours: number = 24;
  private refreshExpiryDays: number = 7; // Reduced from 30 days for security
  private nonceExpiryMinutes: number = 10;
  private maxSessionAgeDays: number = 7; // Force re-authentication after 7 days regardless of activity
  private inactivityTimeoutHours: number = 4; // Session expires after 4 hours of inactivity

  constructor(connectionString: string, jwtSecret: string) {
    const sql = postgres(connectionString, { ssl: 'require' });
    this.db = drizzle(sql);
    this.jwtSecret = jwtSecret;
  }

  /**
   * Generate a nonce for wallet signature verification
   */
  async generateNonce(walletAddress: string): Promise<NonceInfo> {
    try {
      // Clean up expired nonces first
      await this.cleanupExpiredNonces();

      const nonce = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.nonceExpiryMinutes * 60 * 1000);
      const message = `Sign this message to authenticate with LinkDAO Marketplace.\n\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

      await this.db.insert(walletNonces).values({
        walletAddress: walletAddress.toLowerCase(),
        nonce,
        message,
        expiresAt,
        used: false,
      });

      return { nonce, message, expiresAt };
    } catch (error) {
      safeLogger.error('Error generating nonce:', error);
      throw new Error('Failed to generate authentication nonce');
    }
  }

  /**
   * Authenticate wallet with signature verification
   */
  async authenticateWallet(
    walletAddress: string,
    signature: string,
    nonce: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    try {
      // Check for existing valid session first to avoid unnecessary re-authentication
      const existingSession = await this.getValidSession(walletAddress);
      if (existingSession) {
        safeLogger.info('Reusing existing valid session for wallet:', walletAddress);
        return {
          success: true,
          sessionToken: existingSession.sessionToken,
          refreshToken: existingSession.refreshToken,
          expiresAt: existingSession.expiresAt,
        };
      }

      // Validate and consume nonce
      const nonceRecord = await this.validateAndConsumeNonce(walletAddress, nonce);
      if (!nonceRecord) {
        await this.logAuthAttempt(walletAddress, 'login', false, 'Invalid or expired nonce', ipAddress, userAgent);
        return {
          success: false,
          error: {
            code: 'INVALID_NONCE',
            message: 'Invalid or expired nonce. Please request a new one.',
          },
        };
      }

      // Verify signature
      const isValidSignature = await this.verifySignature(walletAddress, nonceRecord.message, signature);
      if (!isValidSignature) {
        await this.logAuthAttempt(walletAddress, 'login', false, 'Invalid signature', ipAddress, userAgent);
        return {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Invalid wallet signature. Please try signing again.',
          },
        };
      }

      // Create session tokens
      const sessionToken = this.generateSessionToken(walletAddress);
      const refreshToken = this.generateRefreshToken(walletAddress);
      const expiresAt = new Date(Date.now() + this.sessionExpiryHours * 60 * 60 * 1000);
      const refreshExpiresAt = new Date(Date.now() + this.refreshExpiryDays * 24 * 60 * 60 * 1000);

      // Only invalidate sessions older than 1 hour to allow multiple tabs/devices
      await this.invalidateOldSessions(walletAddress);

      // Create new session
      await this.db.insert(authSessions).values({
        walletAddress: walletAddress.toLowerCase(),
        sessionToken,
        refreshToken,
        expiresAt,
        refreshExpiresAt,
        isActive: true,
        userAgent,
        ipAddress,
        lastUsedAt: new Date(),
      });

      await this.logAuthAttempt(walletAddress, 'login', true, null, ipAddress, userAgent);

      return {
        success: true,
        sessionToken,
        refreshToken,
        expiresAt,
      };
    } catch (error) {
      safeLogger.error('Error authenticating wallet:', error);
      await this.logAuthAttempt(walletAddress, 'login', false, error.message, ipAddress, userAgent);
      
      // Handle ConnectorNotConnectedError gracefully
      if (error.message?.includes('ConnectorNotConnectedError') || error.message?.includes('connector')) {
        return {
          success: false,
          error: {
            code: 'WALLET_NOT_CONNECTED',
            message: 'Wallet is not connected. Please connect your wallet and try again.',
            details: 'The wallet connector is not available. This may be due to network issues or the wallet being disconnected.',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Authentication failed. Please try again.',
          details: error.message,
        },
      };
    }
  }

  /**
   * Validate session token and return session info with user data
   * Includes inactivity timeout and max session age checks
   */
  async validateSession(sessionToken: string): Promise<SessionInfo | null> {
    try {
      const sessions = await this.db
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.sessionToken, sessionToken),
            eq(authSessions.isActive, true),
            gt(authSessions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (sessions.length === 0) {
        return null;
      }

      const session = sessions[0];
      const now = new Date();

      // Check inactivity timeout (4 hours of no activity)
      const inactivityThreshold = new Date(now.getTime() - this.inactivityTimeoutHours * 60 * 60 * 1000);
      if (session.lastUsedAt < inactivityThreshold) {
        safeLogger.info('Session expired due to inactivity:', session.walletAddress);
        await this.db
          .update(authSessions)
          .set({ isActive: false })
          .where(eq(authSessions.id, session.id));
        return null;
      }

      // Check max session age (7 days from creation)
      const maxAgeThreshold = new Date(now.getTime() - this.maxSessionAgeDays * 24 * 60 * 60 * 1000);
      if (session.createdAt < maxAgeThreshold) {
        safeLogger.info('Session expired due to max age policy:', session.walletAddress);
        await this.db
          .update(authSessions)
          .set({ isActive: false })
          .where(eq(authSessions.id, session.id));
        return null;
      }

      // Fetch user information including role
      const userRecords = await this.db
        .select()
        .from(users)
        .where(eq(users.walletAddress, session.walletAddress))
        .limit(1);

      const user = userRecords[0] || null;

      // Update last used timestamp (sliding window)
      await this.db
        .update(authSessions)
        .set({ lastUsedAt: new Date() })
        .where(eq(authSessions.id, session.id));

      return {
        id: session.id,
        walletAddress: session.walletAddress,
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        lastUsedAt: new Date(),
        role: user?.role || 'user',
        permissions: user?.permissions || [],
        userId: user?.id,
        handle: user?.handle,
        email: user?.email,
        kycStatus: (user as any)?.kycStatus || 'none',
        isActiveUser: user?.isActive ?? true,
        isSuspended: user?.isSuspended ?? false,
      };
    } catch (error) {
      safeLogger.error('Error validating session:', error);
      return null;
    }
  }

  /**
   * Refresh session using refresh token
   */
  async refreshSession(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<AuthResult> {
    try {
      const sessions = await this.db
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.refreshToken, refreshToken),
            eq(authSessions.isActive, true),
            gt(authSessions.refreshExpiresAt, new Date())
          )
        )
        .limit(1);

      if (sessions.length === 0) {
        await this.logAuthAttempt('unknown', 'refresh', false, 'Invalid refresh token', ipAddress, userAgent);
        return {
          success: false,
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token. Please log in again.',
          },
        };
      }

      const session = sessions[0];
      const walletAddress = session.walletAddress;

      // Generate new tokens
      const newSessionToken = this.generateSessionToken(walletAddress);
      const newRefreshToken = this.generateRefreshToken(walletAddress);
      const expiresAt = new Date(Date.now() + this.sessionExpiryHours * 60 * 60 * 1000);
      const refreshExpiresAt = new Date(Date.now() + this.refreshExpiryDays * 24 * 60 * 60 * 1000);

      // Update session with new tokens
      await this.db
        .update(authSessions)
        .set({
          sessionToken: newSessionToken,
          refreshToken: newRefreshToken,
          expiresAt,
          refreshExpiresAt,
          lastUsedAt: new Date(),
          userAgent,
          ipAddress,
        })
        .where(eq(authSessions.id, session.id));

      await this.logAuthAttempt(walletAddress, 'refresh', true, null, ipAddress, userAgent);

      return {
        success: true,
        sessionToken: newSessionToken,
        refreshToken: newRefreshToken,
        expiresAt,
      };
    } catch (error) {
      safeLogger.error('Error refreshing session:', error);
      await this.logAuthAttempt('unknown', 'refresh', false, error.message, ipAddress, userAgent);
      return {
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: 'Failed to refresh session. Please log in again.',
          details: error.message,
        },
      };
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(sessionToken: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    try {
      const sessions = await this.db
        .select()
        .from(authSessions)
        .where(eq(authSessions.sessionToken, sessionToken))
        .limit(1);

      if (sessions.length > 0) {
        const session = sessions[0];
        await this.db
          .update(authSessions)
          .set({ isActive: false })
          .where(eq(authSessions.id, session.id));

        await this.logAuthAttempt(session.walletAddress, 'logout', true, null, ipAddress, userAgent);
      }

      return true;
    } catch (error) {
      safeLogger.error('Error during logout:', error);
      return false;
    }
  }

  /**
   * Verify wallet signature
   */
  private async verifySignature(walletAddress: string, message: string, signature: string): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      safeLogger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Validate and consume nonce
   */
  private async validateAndConsumeNonce(walletAddress: string, nonce: string): Promise<{ message: string } | null> {
    try {
      const nonces = await this.db
        .select()
        .from(walletNonces)
        .where(
          and(
            eq(walletNonces.walletAddress, walletAddress.toLowerCase()),
            eq(walletNonces.nonce, nonce),
            eq(walletNonces.used, false),
            gt(walletNonces.expiresAt, new Date())
          )
        )
        .limit(1);

      if (nonces.length === 0) {
        return null;
      }

      const nonceRecord = nonces[0];

      // Mark nonce as used
      await this.db
        .update(walletNonces)
        .set({ used: true })
        .where(eq(walletNonces.id, nonceRecord.id));

      return { message: nonceRecord.message };
    } catch (error) {
      safeLogger.error('Error validating nonce:', error);
      return null;
    }
  }

  /**
   * Generate JWT session token
   */
  private generateSessionToken(walletAddress: string): string {
    return jwt.sign(
      {
        walletAddress: walletAddress.toLowerCase(),
        type: 'session',
        timestamp: Date.now(),
      },
      this.jwtSecret,
      { expiresIn: `${this.sessionExpiryHours}h` }
    );
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(walletAddress: string): string {
    return jwt.sign(
      {
        walletAddress: walletAddress.toLowerCase(),
        type: 'refresh',
        timestamp: Date.now(),
      },
      this.jwtSecret,
      { expiresIn: `${this.refreshExpiryDays}d` }
    );
  }

  /**
   * Get valid session for wallet if exists
   */
  private async getValidSession(walletAddress: string): Promise<{ sessionToken: string; refreshToken: string; expiresAt: Date } | null> {
    try {
      const sessions = await this.db
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.walletAddress, walletAddress.toLowerCase()),
            eq(authSessions.isActive, true),
            gt(authSessions.expiresAt, new Date()),
            gt(authSessions.refreshExpiresAt, new Date())
          )
        )
        .orderBy(authSessions.lastUsedAt)
        .limit(1);

      if (sessions.length > 0) {
        const session = sessions[0];
        // Update last used timestamp
        await this.db
          .update(authSessions)
          .set({ lastUsedAt: new Date() })
          .where(eq(authSessions.id, session.id));

        return {
          sessionToken: session.sessionToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('Error getting valid session:', error);
      return null;
    }
  }

  /**
   * Invalidate existing sessions for wallet
   */
  private async invalidateExistingSessions(walletAddress: string): Promise<void> {
    try {
      await this.db
        .update(authSessions)
        .set({ isActive: false })
        .where(eq(authSessions.walletAddress, walletAddress.toLowerCase()));
    } catch (error) {
      safeLogger.error('Error invalidating existing sessions:', error);
    }
  }

  /**
   * Invalidate only old sessions (older than 1 hour) to allow multiple tabs/devices
   */
  private async invalidateOldSessions(walletAddress: string): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await this.db
        .update(authSessions)
        .set({ isActive: false })
        .where(
          and(
            eq(authSessions.walletAddress, walletAddress.toLowerCase()),
            lt(authSessions.lastUsedAt, oneHourAgo)
          )
        );
    } catch (error) {
      safeLogger.error('Error invalidating old sessions:', error);
    }
  }

  /**
   * Log authentication attempt
   */
  private async logAuthAttempt(
    walletAddress: string,
    attemptType: string,
    success: boolean,
    errorMessage?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.db.insert(walletAuthAttempts).values({
        walletAddress: walletAddress.toLowerCase(),
        attemptType,
        success,
        errorMessage,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      safeLogger.error('Error logging auth attempt:', error);
    }
  }

  /**
   * Clean up expired nonces
   */
  private async cleanupExpiredNonces(): Promise<void> {
    try {
      await this.db
        .delete(walletNonces)
        .where(lt(walletNonces.expiresAt, new Date()));
    } catch (error) {
      safeLogger.error('Error cleaning up expired nonces:', error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.db
        .update(authSessions)
        .set({ isActive: false })
        .where(lt(authSessions.expiresAt, new Date()));
    } catch (error) {
      safeLogger.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Get authentication statistics for monitoring
   */
  async getAuthStats(walletAddress?: string): Promise<any> {
    try {
      // This would return authentication statistics
      // Implementation depends on specific monitoring requirements
      return {
        totalSessions: 0,
        activeSessions: 0,
        recentAttempts: 0,
        successRate: 0,
      };
    } catch (error) {
      safeLogger.error('Error getting auth stats:', error);
      return null;
    }
  }
}
