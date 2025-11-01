import { eq, and } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { sellerVerifications, marketplaceVerifications } from '../db/marketplaceSchema';
import { safeLogger } from '../utils/safeLogger';
import { SellerVerification, VerificationRequest } from '../types/sellerVerification';
import { safeLogger } from '../utils/safeLogger';
import { ValidationError } from '../models/validation';
import { safeLogger } from '../utils/safeLogger';

export class MarketplaceVerificationService {
  /**
   * Submit a new seller verification request
   */
  async submitSellerVerification(userId: string, request: VerificationRequest): Promise<SellerVerification> {
    // Validate EIN format if provided
    if (request.ein && !this.isValidEIN(request.ein)) {
      throw new ValidationError('Invalid EIN format. Expected format: ##-#######');
    }

    // Check if user already has a pending verification
    const existingVerification = await this.getActiveSellerVerification(userId);
    if (existingVerification && existingVerification.status === 'pending') {
      throw new ValidationError('User already has a pending verification request');
    }

    // Create new verification record
    const [verification] = await db.insert(sellerVerifications).values({
      userId,
      legalName: request.legalName,
      ein: request.ein,
      businessAddress: request.businessAddress,
      status: 'pending',
      submittedAt: new Date(),
    }).returning();

    // Update marketplace verification record
    await this.updateMarketplaceVerification(userId, verification.id);

    // Trigger automated verification process
    this.processVerification(verification.id);

    return verification;
  }

  /**
   * Get active verification for a user
   */
  async getActiveSellerVerification(userId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.userId, userId))
      .orderBy(sellerVerifications.submittedAt, 'desc')
      .limit(1);

    return verifications[0] || null;
  }

  /**
   * Get verification by ID
   */
  async getSellerVerificationById(verificationId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.id, verificationId));

    return verifications[0] || null;
  }

  /**
   * Update marketplace verification record with seller verification reference
   */
  private async updateMarketplaceVerification(userId: string, sellerVerificationId: string): Promise<void> {
    // Check if marketplace verification exists
    const existing = await db.select().from(marketplaceVerifications)
      .where(eq(marketplaceVerifications.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db.update(marketplaceVerifications)
        .set({ 
          sellerVerificationId,
          verificationStatus: 'pending',
          updatedAt: new Date()
        })
        .where(eq(marketplaceVerifications.userId, userId));
    } else {
      // Create new record
      await db.insert(marketplaceVerifications).values({
        userId,
        sellerVerificationId,
        verificationLevel: 'basic',
        sellerTier: 'unverified',
        riskScore: '0',
        verificationStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  /**
   * Process verification through automated systems
   */
  private async processVerification(verificationId: string): Promise<void> {
    const verification = await this.getSellerVerificationById(verificationId);
    if (!verification) return;

    try {
      // 1. Validate EIN format
      if (verification.ein && !this.isValidEIN(verification.ein)) {
        await this.rejectSellerVerification(verificationId, 'Invalid EIN format');
        return;
      }

      // 2. Normalize address using geocoding service
      if (verification.businessAddress) {
        const normalizedAddress = await this.normalizeAddress(verification.businessAddress);
        if (!normalizedAddress) {
          // Log warning but continue with verification
          safeLogger.warn('Failed to normalize address for verification:', verificationId);
        }
      }

      // 3. Automated verification (mock implementation)
      // In a real implementation, you would integrate with:
      // - IRS TIN Matching API
      // - Trulioo or ComplyCube
      // - OpenCorporates API
      // - Lob or SmartyStreets for address verification
      
      const verificationResult = await this.performAutomatedVerification(verification);
      
      if (verificationResult.success) {
        await this.approveSellerVerification(verificationId, {
          verificationMethod: verificationResult.method,
          verificationReference: verificationResult.reference,
          riskScore: verificationResult.riskScore
        });
      } else {
        // Flag for manual review if automated verification fails
        await this.flagForManualReview(verificationId, verificationResult.reason);
      }
    } catch (error) {
      safeLogger.error('Error processing verification:', error);
      // Flag for manual review on error
      await this.flagForManualReview(verificationId, 'System error during verification');
    }
  }

  /**
   * Perform automated verification using external services
   */
  private async performAutomatedVerification(verification: SellerVerification): Promise<{
    success: boolean;
    method?: string;
    reference?: string;
    riskScore?: 'low' | 'medium' | 'high';
    reason?: string;
  }> {
    // This is a mock implementation. In a real system, you would:
    // 1. Call IRS TIN Matching API to verify EIN and business name match
    // 2. Use Trulioo or similar service for comprehensive business verification
    // 3. Verify address using Lob or SmartyStreets
    
    // Mock verification logic
    const mockSuccess = Math.random() > 0.3; // 70% success rate for demo
    
    return {
      success: mockSuccess,
      method: mockSuccess ? 'mock_verification' : undefined,
      reference: mockSuccess ? `ref_${Date.now()}` : undefined,
      riskScore: mockSuccess ? 'low' : 'high',
      reason: mockSuccess ? undefined : 'Automated verification failed - requires manual review'
    };
  }

  /**
   * Approve a seller verification
   */
  async approveSellerVerification(
    verificationId: string, 
    metadata?: { 
      verificationMethod?: string; 
      verificationReference?: string;
      riskScore?: 'low' | 'medium' | 'high';
    }
  ): Promise<SellerVerification> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

    const [updated] = await db.update(sellerVerifications)
      .set({
        status: 'verified',
        verifiedAt: new Date(),
        expiresAt,
        verificationMethod: metadata?.verificationMethod,
        verificationReference: metadata?.verificationReference,
        riskScore: metadata?.riskScore,
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    // Update marketplace verification record
    if (updated) {
      await db.update(marketplaceVerifications)
        .set({ 
          verificationStatus: 'approved',
          sellerTier: 'verified',
          updatedAt: new Date()
        })
        .where(eq(marketplaceVerifications.sellerVerificationId, verificationId));
    }

    return updated;
  }

  /**
   * Reject a seller verification
   */
  async rejectSellerVerification(verificationId: string, reason: string): Promise<SellerVerification> {
    const [updated] = await db.update(sellerVerifications)
      .set({
        status: 'rejected',
        rejectionReason: reason,
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    // Update marketplace verification record
    if (updated) {
      await db.update(marketplaceVerifications)
        .set({ 
          verificationStatus: 'rejected',
          updatedAt: new Date()
        })
        .where(eq(marketplaceVerifications.sellerVerificationId, verificationId));
    }

    return updated;
  }

  /**
   * Flag verification for manual review
   */
  async flagForManualReview(verificationId: string, reason: string): Promise<SellerVerification> {
    const [updated] = await db.update(sellerVerifications)
      .set({
        notes: reason,
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    // In a real implementation, you would also:
    // - Send notification to admin dashboard
    // - Add to manual review queue
    // - Send email to admins

    return updated;
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
   * Normalize address using geocoding service
   */
  private async normalizeAddress(address: string): Promise<string | null> {
    // In a real implementation, you would integrate with:
    // - Google Maps Geocoding API
    // - USPS Address Validation API
    // - SmartyStreets API
    
    // Mock implementation
    return address.trim();
  }

  /**
   * Check if verifications have expired
   */
  async checkExpiredVerifications(): Promise<void> {
    const now = new Date();
    
    // Find all verified sellers whose verification has expired
    const expiredVerifications = await db.select().from(sellerVerifications)
      .where(
        and(
          eq(sellerVerifications.status, 'verified'),
          sellerVerifications.expiresAt.lt(now)
        )
      );

    // Update status to expired
    for (const verification of expiredVerifications) {
      await db.update(sellerVerifications)
        .set({ status: 'expired' })
        .where(eq(sellerVerifications.id, verification.id));
      
      // Update marketplace verification
      await db.update(marketplaceVerifications)
        .set({ 
          verificationStatus: 'expired',
          sellerTier: 'unverified',
          updatedAt: new Date()
        })
        .where(eq(marketplaceVerifications.sellerVerificationId, verification.id));
    }
  }
}