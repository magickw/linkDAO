import bcrypt from 'bcrypt';
import { safeLogger } from '../utils/safeLogger';
import jwt from 'jsonwebtoken';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, gt } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { users, adminSessions, adminAuditLog } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { ssl: 'require' });
const db = drizzle(sql);

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const SESSION_DURATION_HOURS = 24;

export class AdminAuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId: string): Promise<boolean> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) return false;

    const userData = user[0];
    if (!userData.lockedUntil) return false;

    return new Date(userData.lockedUntil) > new Date();
  }

  /**
   * Increment login attempts and lock if needed
   */
  static async incrementLoginAttempts(userId: string): Promise<void> {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) return;

    const attempts = (user[0].loginAttempts || 0) + 1;
    const updateData: any = { loginAttempts: attempts };

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + LOCK_DURATION_MINUTES);
      updateData.lockedUntil = lockUntil;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  /**
   * Reset login attempts on successful login
   */
  static async resetLoginAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Create admin session
   */
  static async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; sessionId: string }> {
    const token = jwt.sign(
      {
        userId,
        timestamp: Date.now(),
        type: 'admin',
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: `${SESSION_DURATION_HOURS}h` }
    );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

    const session = await db
      .insert(adminSessions)
      .values({
        userId,
        tokenHash,
        ipAddress,
        userAgent,
        expiresAt,
      })
      .returning();

    return {
      token,
      sessionId: session[0].id,
    };
  }

  /**
   * Validate session token
   */
  static async validateSession(token: string): Promise<any> {
    try {
      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret'
      );

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const session = await db
        .select()
        .from(adminSessions)
        .where(
          and(
            eq(adminSessions.tokenHash, tokenHash),
            eq(adminSessions.isActive, true),
            gt(adminSessions.expiresAt, new Date())
          )
        )
        .limit(1);

      if (session.length === 0) {
        return null;
      }

      await db
        .update(adminSessions)
        .set({ lastActivity: new Date() })
        .where(eq(adminSessions.id, session[0].id));

      return decoded;
    } catch (error) {
      safeLogger.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Revoke session
   */
  static async revokeSession(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await db
      .update(adminSessions)
      .set({ isActive: false })
      .where(eq(adminSessions.tokenHash, tokenHash));
  }

  /**
   * Log admin action
   */
  static async logAction(
    adminId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await db.insert(adminAuditLog).values({
      adminId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Admin credentials login
   */
  static async loginWithCredentials(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    message?: string;
  }> {
    try {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (userResult.length === 0) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      const user = userResult[0];

      if (await this.isAccountLocked(user.id)) {
        return {
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        };
      }

      if (!user.passwordHash || !(await this.verifyPassword(password, user.passwordHash))) {
        await this.incrementLoginAttempts(user.id);
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      const adminRoles = ['admin', 'super_admin', 'moderator'];
      if (!adminRoles.includes(user.role || '')) {
        await this.logAction(
          user.id,
          'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
          'auth',
          user.id,
          { email, role: user.role },
          ipAddress,
          userAgent
        );

        return {
          success: false,
          message: 'Insufficient permissions for admin access',
        };
      }

      await this.resetLoginAttempts(user.id);

      const { token } = await this.createSession(user.id, ipAddress, userAgent);

      await this.logAction(
        user.id,
        'ADMIN_LOGIN_SUCCESS',
        'auth',
        user.id,
        { email, method: 'credentials' },
        ipAddress,
        userAgent
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          walletAddress: user.walletAddress,
          handle: user.handle,
        },
      };
    } catch (error) {
      safeLogger.error('Admin login error:', error);
      return {
        success: false,
        message: 'Login failed due to server error',
      };
    }
  }

  /**
   * Create admin user
   */
  static async createAdminUser(
    email: string,
    password: string,
    role: 'admin' | 'super_admin' | 'moderator',
    walletAddress: string,
    permissions: string[] = []
  ): Promise<{ success: boolean; userId?: string; message?: string }> {
    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Email already registered',
        };
      }

      const passwordHash = await this.hashPassword(password);

      const defaultPermissions: Record<string, string[]> = {
        super_admin: ['*'],
        admin: [
          'content.moderate',
          'users.manage',
          'disputes.resolve',
          'marketplace.seller_review',
          'system.analytics',
        ],
        moderator: ['content.moderate', 'users.view', 'disputes.view'],
      };

      const finalPermissions = permissions.length > 0 ? permissions : defaultPermissions[role];

      const result = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          role,
          permissions: finalPermissions,
          emailVerified: true,
          walletAddress: walletAddress.toLowerCase(),
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        userId: result[0].id,
      };
    } catch (error) {
      safeLogger.error('Create admin user error:', error);
      return {
        success: false,
        message: 'Failed to create admin user',
      };
    }
  }
}

export const adminAuthService = AdminAuthService;
