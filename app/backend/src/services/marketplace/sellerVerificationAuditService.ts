import { db } from '../../db';
import { safeLogger } from '../../utils/safeLogger';
import { adminAuditLog } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

export interface AuditLogEntry {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class SellerVerificationAuditService {
  /**
   * Log an admin action to the audit trail
   */
  static async logAction(entry: AuditLogEntry): Promise<void> {
    if (!db) {
      safeLogger.warn('Database not available, skipping audit log entry');
      return;
    }

    try {
      await db.insert(adminAuditLog).values({
        adminId: entry.adminId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: entry.ipAddress || '',
        userAgent: entry.userAgent || '',
        createdAt: new Date()
      });
    } catch (error) {
      safeLogger.error('Failed to log admin action to audit trail:', error);
      // Don't throw error as we don't want audit logging to break the main flow
    }
  }

  /**
   * Log seller verification submission
   */
  static async logVerificationSubmission(userId: string, verificationId: string): Promise<void> {
    await this.logAction({
      adminId: userId,
      action: 'seller_verification_submitted',
      resourceType: 'seller_verification',
      resourceId: verificationId,
      details: {
        userId,
        verificationId,
        action: 'submitted'
      }
    });
  }

  /**
   * Log seller verification approval
   */
  static async logVerificationApproval(adminId: string, verificationId: string, metadata?: any): Promise<void> {
    await this.logAction({
      adminId,
      action: 'seller_verification_approved',
      resourceType: 'seller_verification',
      resourceId: verificationId,
      details: {
        verificationId,
        status: 'approved',
        ...metadata
      }
    });
  }

  /**
   * Log seller verification rejection
   */
  static async logVerificationRejection(adminId: string, verificationId: string, reason: string): Promise<void> {
    await this.logAction({
      adminId,
      action: 'seller_verification_rejected',
      resourceType: 'seller_verification',
      resourceId: verificationId,
      details: {
        verificationId,
        status: 'rejected',
        reason
      }
    });
  }

  /**
   * Log seller verification expiration
   */
  static async logVerificationExpiration(verificationId: string): Promise<void> {
    await this.logAction({
      adminId: 'system',
      action: 'seller_verification_expired',
      resourceType: 'seller_verification',
      resourceId: verificationId,
      details: {
        verificationId,
        status: 'expired'
      }
    });
  }

  /**
   * Get audit logs for a specific seller verification
   */
  static async getAuditLogsForResource(resourceId: string): Promise<any[]> {
    if (!db) {
      return [];
    }

    try {
      const logs = await db.select().from(adminAuditLog)
        .where(eq(adminAuditLog.resourceId, resourceId))
        .orderBy(desc(adminAuditLog.createdAt));
      
      return logs;
    } catch (error) {
      safeLogger.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific admin
   */
  static async getAuditLogsForAdmin(adminId: string): Promise<any[]> {
    if (!db) {
      return [];
    }

    try {
      const logs = await db.select().from(adminAuditLog)
        .where(eq(adminAuditLog.adminId, adminId))
        .orderBy(desc(adminAuditLog.createdAt));
      
      return logs;
    } catch (error) {
      safeLogger.error('Failed to fetch audit logs:', error);
      return [];
    }
  }
}
