import { eq, and, lt, desc } from 'drizzle-orm';
import { db } from '../db';
import { sellerVerifications, marketplaceUsers } from '../../db/marketplaceSchema';
import { SellerVerification, VerificationRequest } from '../../types/sellerVerification';
import { ValidationError } from '../../models/validation';
import { users } from '../../db/schema';
import { SellerVerificationAuditService } from './sellerVerificationAuditService';
import { SellerVerificationNotificationService } from './sellerVerificationNotificationService';
import { safeLogger } from '../../utils/safeLogger';

export class UnifiedSellerVerificationService {
  /**
   * Submit a new verification request (unified interface)
   */
  async submitVerification(userId: string, request: VerificationRequest): Promise<SellerVerification> {
    // Validate EIN format if provided
    if (request.ein && !this.isValidEIN(request.ein)) {
      throw new ValidationError('Invalid EIN format. Expected format: ##-#######', 'ein');
    }

    // Check if user already has a pending verification
    const existingVerification = await this.getActiveVerification(userId);
    if (existingVerification && existingVerification.status === 'pending') {
      throw new ValidationError('User already has a pending verification request', 'userId');
    }

    // Ensure marketplace user exists
    await this.ensureMarketplaceUser(userId);

    // Create new verification record
    const [verification] = await db.insert(sellerVerifications).values({
      userId,
      legalName: request.legalName,
      ein: request.ein,
      businessAddress: request.businessAddress,
      status: 'pending',
      progressStatus: 'submitted',
      progressUpdatedAt: new Date(),
      submittedAt: new Date(),
    }).returning();

    // Log the submission to audit trail
    await SellerVerificationAuditService.logVerificationSubmission(userId, verification.id);

    // Notify admins about new verification request
    await this.notifyAdminsOfNewRequest({
      ...verification,
      sellerId: verification.userId,
      status: verification.status as 'pending' | 'verified' | 'rejected' | 'expired',
      riskScore: verification.riskScore as 'low' | 'medium' | 'high'
    });

    // Trigger automated verification process
    this.processVerification({
      ...verification,
      sellerId: verification.userId,
      status: verification.status as 'pending' | 'verified' | 'rejected' | 'expired',
      riskScore: verification.riskScore as 'low' | 'medium' | 'high'
    }.id);

    // Map userId to sellerId for interface compatibility
    return {
      ...verification,
      sellerId: verification.userId,
      status: verification.status as 'pending' | 'verified' | 'rejected' | 'expired',
      riskScore: verification.riskScore as 'low' | 'medium' | 'high'
    };
  }

  /**
   * Get active verification for a user
   */
  async getActiveVerification(userId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.userId, userId))
      .orderBy(desc(sellerVerifications.submittedAt))
      .limit(1);

    if (verifications[0]) {
      return {
        ...verifications[0],
        sellerId: verifications[0].userId,
        status: verifications[0].status as 'pending' | 'verified' | 'rejected' | 'expired',
        riskScore: verifications[0].riskScore as 'low' | 'medium' | 'high'
      };
    }
    return null;
  }

  /**
   * Get verification by ID
   */
  async getVerificationById(verificationId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.id, verificationId));

    if (verifications[0]) {
      return {
        ...verifications[0],
        sellerId: verifications[0].userId,
        status: verifications[0].status as 'pending' | 'verified' | 'rejected' | 'expired',
        riskScore: verifications[0].riskScore as 'low' | 'medium' | 'high'
      };
    }
    return null;
  }

  /**
   * Get all pending verifications for admin review
   */
  async getPendingVerifications(): Promise<SellerVerification[]> {
    const verifications = await db.select({
      id: sellerVerifications.id,
      userId: sellerVerifications.userId,
      status: sellerVerifications.status,
      progressStatus: sellerVerifications.progressStatus,
      progressUpdatedAt: sellerVerifications.progressUpdatedAt,
      legalName: sellerVerifications.legalName,
      ein: sellerVerifications.ein,
      businessAddress: sellerVerifications.businessAddress,
      verificationMethod: sellerVerifications.verificationMethod,
      riskScore: sellerVerifications.riskScore,
      submittedAt: sellerVerifications.submittedAt,
      verifiedAt: sellerVerifications.verifiedAt,
      expiresAt: sellerVerifications.expiresAt,
      reviewedBy: sellerVerifications.reviewedBy,
      rejectionReason: sellerVerifications.rejectionReason,
      notes: sellerVerifications.notes,
      // Include user information
      user: {
        email: marketplaceUsers.email,
        legalName: marketplaceUsers.legalName,
        country: marketplaceUsers.country,
        kycVerified: marketplaceUsers.kycVerified,
      }
    })
    .from(sellerVerifications)
    .leftJoin(marketplaceUsers, eq(sellerVerifications.userId, marketplaceUsers.userId))
    .where(eq(sellerVerifications.status, 'pending'))
    .orderBy(desc(sellerVerifications.submittedAt));

    return verifications as unknown as SellerVerification[];
  }

  /**
   * Get verification progress by ID
   */
  async getVerificationProgress(verificationId: string): Promise<{ progressStatus: string; progressUpdatedAt: Date } | null> {
    const verifications = await db.select({
      progressStatus: sellerVerifications.progressStatus,
      progressUpdatedAt: sellerVerifications.progressUpdatedAt
    }).from(sellerVerifications)
      .where(eq(sellerVerifications.id, verificationId));

    return verifications[0] || null;
  }

  /**
   * Update verification progress
   */
  async updateVerificationProgress(
    verificationId: string, 
    progressStatus: 'submitted' | 'documents_verified' | 'manual_review' | 'approved' | 'rejected',
    notes?: string
  ): Promise<SellerVerification> {
    const [updated] = await db.update(sellerVerifications)
      .set({
        progressStatus,
        progressUpdatedAt: new Date(),
        notes: notes || undefined,
        updatedAt: new Date()
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    // Log progress update to audit trail
    await SellerVerificationAuditService.logAction({
      adminId: 'system',
      action: 'seller_verification_progress_updated',
      resourceType: 'seller_verification',
      resourceId: verificationId,
      details: {
        progressStatus,
        previousStatus: updated.progressStatus,
        notes
      }
    });

    return {
      ...updated,
      sellerId: updated.userId,
      status: updated.status as 'pending' | 'verified' | 'rejected' | 'expired',
      riskScore: updated.riskScore as 'low' | 'medium' | 'high'
    };
  }

  /**
   * Approve a verification
   */
  async approveVerification(
    verificationId: string, 
    adminId: string,
    metadata?: { 
      verificationMethod?: 'irs_tin_match' | 'trulioo' | 'manual_review' | 'open_corporates'; 
      verificationReference?: string;
      riskScore?: 'low' | 'medium' | 'high';
    }
  ): Promise<SellerVerification> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

    const [updated] = await db.update(sellerVerifications)
      .set({
        status: 'verified',
        progressStatus: 'approved',
        progressUpdatedAt: new Date(),
        verifiedAt: new Date(),
        expiresAt,
        verificationMethod: metadata?.verificationMethod,
        verificationReference: metadata?.verificationReference,
        riskScore: metadata?.riskScore,
        reviewedBy: adminId,
        updatedAt: new Date()
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    // Map userId to sellerId for interface compatibility
    const result = {
      ...updated,
      sellerId: updated.userId
    };

    // Log admin action to audit trail
    await SellerVerificationAuditService.logVerificationApproval(adminId, verificationId, {
      verificationMethod: metadata?.verificationMethod,
      riskScore: metadata?.riskScore,
      expiresAt
    });

    // Notify user about approval
    await SellerVerificationNotificationService.notifyVerificationApproved(
      updated.userId, 
      verificationId, 
      metadata
    );

    return {
      ...updated,
      sellerId: updated.userId,
      status: updated.status as 'pending' | 'verified' | 'rejected' | 'expired',
      riskScore: updated.riskScore as 'low' | 'medium' | 'high'
    };
  }

  /**
   * Reject a verification
   */
  async rejectVerification(verificationId: string, adminId: string, reason: string): Promise<SellerVerification> {
    const [updated] = await db.update(sellerVerifications)
      .set({
        status: 'rejected',
        progressStatus: 'rejected',
        progressUpdatedAt: new Date(),
        rejectionReason: reason,
        reviewedBy: adminId,
        updatedAt: new Date()
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    return {
      ...updated,
      sellerId: updated.userId,
      status: updated.status as 'pending' | 'verified' | 'rejected' | 'expired',
      riskScore: updated.riskScore as 'low' | 'medium' | 'high'
    };
  }

  /**
   * Flag verification for manual review
   */
  async flagForManualReview(verificationId: string, reason: string): Promise<SellerVerification> {
    const [updated] = await db.update(sellerVerifications)
      .set({
        progressStatus: 'manual_review',
        progressUpdatedAt: new Date(),
        notes: reason,
        updatedAt: new Date()
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    // Map userId to sellerId for interface compatibility
    const result = {
      ...updated,
      sellerId: updated.userId,
      status: updated.status as 'pending' | 'verified' | 'rejected' | 'expired',
      riskScore: updated.riskScore as 'low' | 'medium' | 'high'
    };

    return result;
  }

  /**
   * Validate EIN format
   */
  private isValidEIN(ein: string): boolean {
    // EIN format: ##-#######
    const einRegex = /^\d{2}-\d{7}$/;
    return einRegex.test(ein);
  }

  /**
   * Ensure marketplace user exists
   */
  private async ensureMarketplaceUser(userId: string): Promise<void> {
    const [user] = await db.select().from(marketplaceUsers)
      .where(eq(marketplaceUsers.userId, userId));
    
    if (!user) {
      // Get user details from main users table
      const [mainUser] = await db.select().from(users)
        .where(eq(users.id, userId));
      
      if (mainUser) {
        await db.insert(marketplaceUsers).values({
          userId,
          role: 'seller',
          email: mainUser.email,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  /**
   * Process verification through automated systems (stub implementation)
   */
  private async processVerification(verificationId: string): Promise<void> {
    // In a real implementation, this would integrate with:
    // - IRS TIN Matching API
    // - Trulioo or ComplyCube for comprehensive business verification
    // - OpenCorporates API for business registry checks
    // - Lob or SmartyStreets for address verification
    
    // For now, we'll just flag for manual review
    await this.flagForManualReview(verificationId, 'Awaiting manual review');
  }

  /**
   * Check for expired verifications and update their status
   */
  async checkExpiredVerifications(): Promise<void> {
    const now = new Date();
    
    // Find all verified sellers whose verification has expired
    const expiredVerifications = await db.select().from(sellerVerifications)
      .where(
        and(
          eq(sellerVerifications.status, 'verified'),
          lt(sellerVerifications.expiresAt, now)
        )
      );

    // Update status to expired
    for (const verification of expiredVerifications) {
      await db.update(sellerVerifications)
        .set({ status: 'expired' })
        .where(eq(sellerVerifications.id, verification.id));
      
      // Log expiration to audit trail
      await SellerVerificationAuditService.logVerificationExpiration(verification.id);
      
      // Notify user about expiration
      await SellerVerificationNotificationService.notifyVerificationExpired(
        verification.userId, 
        verification.id
      );
    }
  }

  /**
   * Notify admins about new verification request
   */
  private async notifyAdminsOfNewRequest(verification: SellerVerification): Promise<void> {
    try {
      // In a real implementation, this would fetch admin IDs from the database
      // For now, we'll use a placeholder
      const adminIds = ['admin-1', 'admin-2'];
      
      // Get user information for the notification
      const [user] = await db.select().from(marketplaceUsers)
        .where(eq(marketplaceUsers.userId, verification.sellerId));
      
      await SellerVerificationNotificationService.notifyNewVerificationRequest(
        adminIds,
        verification.id,
        {
          legalName: verification.legalName,
          email: user?.email,
          submittedAt: verification.submittedAt
        }
      );
    } catch (error) {
      safeLogger.error('Failed to notify admins of new verification request:', error);
    }
  }
}