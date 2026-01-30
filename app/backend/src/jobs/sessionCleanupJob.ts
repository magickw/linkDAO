/**
 * Session Cleanup Job
 * Automatically cleans up expired sessions, nonces, and inactive auth attempts
 * Should be scheduled to run periodically (e.g., every hour)
 */

import { db } from '../db';
import { authSessions, authNonces, authAttempts } from '../db/schema';
import { lt, and, or, isNull } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export class SessionCleanupJob {
  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();

      // Delete sessions that are expired OR inactive AND past refresh expiry
      const result = await db
        .delete(authSessions)
        .where(
          or(
            lt(authSessions.expiresAt, now),
            and(
              eq(authSessions.isActive, false),
              lt(authSessions.refreshExpiresAt, now)
            )
          )
        );

      const deletedCount = result.rowCount || 0;

      if (deletedCount > 0) {
        safeLogger.info(`Session cleanup: Deleted ${deletedCount} expired/inactive sessions`);
      }

      return deletedCount;
    } catch (error) {
      safeLogger.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Clean up expired nonces
   * Nonces older than 10 minutes are expired
   */
  async cleanupExpiredNonces(): Promise<number> {
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const result = await db
        .delete(authNonces)
        .where(lt(authNonces.expiresAt, tenMinutesAgo));

      const deletedCount = result.rowCount || 0;

      if (deletedCount > 0) {
        safeLogger.info(`Nonce cleanup: Deleted ${deletedCount} expired nonces`);
      }

      return deletedCount;
    } catch (error) {
      safeLogger.error('Nonce cleanup error:', error);
      return 0;
    }
  }

  /**
   * Clean up old auth attempts
   * Keep auth attempts for the last 90 days
   */
  async cleanupOldAuthAttempts(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await db
        .delete(authAttempts)
        .where(lt(authAttempts.createdAt, ninetyDaysAgo));

      const deletedCount = result.rowCount || 0;

      if (deletedCount > 0) {
        safeLogger.info(`Auth attempts cleanup: Deleted ${deletedCount} old records`);
      }

      return deletedCount;
    } catch (error) {
      safeLogger.error('Auth attempts cleanup error:', error);
      return 0;
    }
  }

  /**
   * Run all cleanup tasks
   */
  async runAll(): Promise<{
    sessionsDeleted: number;
    noncesDeleted: number;
    authAttemptsDeleted: number;
    totalDeleted: number;
  }> {
    safeLogger.info('Starting session cleanup job...');

    const [sessionsDeleted, noncesDeleted, authAttemptsDeleted] = await Promise.all([
      this.cleanupExpiredSessions(),
      this.cleanupExpiredNonces(),
      this.cleanupOldAuthAttempts()
    ]);

    const totalDeleted = sessionsDeleted + noncesDeleted + authAttemptsDeleted;

    safeLogger.info('Session cleanup job completed', {
      sessionsDeleted,
      noncesDeleted,
      authAttemptsDeleted,
      totalDeleted
    });

    return {
      sessionsDeleted,
      noncesDeleted,
      authAttemptsDeleted,
      totalDeleted
    };
  }
}

export const sessionCleanupJob = new SessionCleanupJob();