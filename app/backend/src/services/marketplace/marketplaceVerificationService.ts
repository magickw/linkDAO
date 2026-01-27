import { eq, and, lt, desc } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../../db';
import { sellerVerifications, marketplaceVerifications } from '../../db/marketplaceSchema';
import { SellerVerification, VerificationRequest } from '../../types/sellerVerification';
import { ValidationError } from '../../models/validation';

// Define the ProofOfOwnership interface
export interface ProofOfOwnership {
  signature: string;
  message: string;
  walletAddress: string;
  tokenId: string;
  contractAddress: string;
  timestamp: number;
}

export class MarketplaceVerificationService {
  /**
   * Submit a new seller verification request
   */
  async submitSellerVerification(userId: string, request: VerificationRequest): Promise<SellerVerification> {
    // Validate EIN format if provided
    if (request.ein && !this.isValidEIN(request.ein)) {
      throw new ValidationError('Invalid EIN format. Expected format: ##-#######', 'ein', 'INVALID_EIN_FORMAT');
    }

    // Check if user already has a pending verification
    const existingVerification = await this.getActiveSellerVerification(userId);
    if (existingVerification && existingVerification.status === 'pending') {
      throw new ValidationError('User already has a pending verification request', 'userId', 'DUPLICATE_VERIFICATION');
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

    return {
      ...verification,
      sellerId: verification.userId
    } as SellerVerification;
  }

  /**
   * Get active verification for a user
   */
  async getActiveSellerVerification(userId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.userId, userId))
      .orderBy(desc(sellerVerifications.submittedAt))
      .limit(1);

    const verification = verifications[0];
    if (!verification) return null;
    
    return {
      ...verification,
      sellerId: verification.userId
    } as SellerVerification;
  }

  /**
   * Get verification by ID
   */
  async getSellerVerificationById(verificationId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.id, verificationId));

    const verification = verifications[0];
    if (!verification) return null;
    
    return {
      ...verification,
      sellerId: verification.userId
    } as SellerVerification;
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
        verificationMethod: metadata?.verificationMethod as 'irs_tin_match' | 'trulioo' | 'manual_review' | 'open_corporates' | undefined,
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

    return {
      ...updated,
      sellerId: updated.userId
    } as SellerVerification;
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

    return {
      ...updated,
      sellerId: updated.userId
    } as SellerVerification;
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

    return {
      ...updated,
      sellerId: updated.userId
    } as SellerVerification;
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
   * Verify high-value NFT listing
   */
  async verifyHighValueListing(
    listingId: string,
    sellerAddress: string,
    priceUSD: number,
    priceETH: number
  ): Promise<any> {
    try {
      // Mock implementation - in a real system, you would:
      // 1. Verify the seller's identity and verification status
      // 2. Check the NFT contract and token ID on-chain
      // 3. Validate the price against market data
      // 4. Check for any red flags or suspicious patterns
      
      const sellerVerification = await this.getActiveSellerVerification(sellerAddress);
      const isSellerVerified = sellerVerification?.status === 'verified';
      
      // Simple mock verification logic
      const isVerified = isSellerVerified && priceETH > 0.1; // Minimum 0.1 ETH for high-value verification
      
      return {
        listingId,
        sellerAddress,
        isVerified,
        verificationLevel: isVerified ? 'high' : 'standard',
        riskScore: isVerified ? 'low' : 'medium',
        timestamp: new Date().toISOString(),
        metadata: {
          priceUSD,
          priceETH,
          sellerVerified: isSellerVerified
        }
      };
    } catch (error) {
      safeLogger.error('Error verifying high-value listing:', error);
      throw new Error('Failed to verify high-value listing');
    }
  }

  /**
   * Verify proof of ownership signature
   */
  async verifyProofOfOwnership(proof: ProofOfOwnership): Promise<boolean> {
    try {
      // Mock implementation - in a real system, you would:
      // 1. Verify the signature using the wallet address and message
      // 2. Check that the signature hasn't expired (based on timestamp)
      // 3. Verify that the wallet owns the specified NFT
      
      // Simple mock verification - check if signature is not empty and not expired
      const isSignatureValid = proof.signature && proof.signature.length > 0;
      const isNotExpired = Date.now() - proof.timestamp < 3600000; // 1 hour expiration
      
      return isSignatureValid && isNotExpired;
    } catch (error) {
      safeLogger.error('Error verifying proof of ownership:', error);
      return false;
    }
  }

  /**
   * Get seller verification tier
   */
  async getSellerVerificationTier(sellerAddress: string): Promise<any> {
    try {
      // Mock implementation - in a real system, you would:
      // 1. Check the seller's verification status
      // 2. Look up their transaction history and reputation
      // 3. Calculate their tier based on various factors
      
      const sellerVerification = await this.getActiveSellerVerification(sellerAddress);
      
      let tier = 'unverified';
      let reputationScore = 0;
      
      if (sellerVerification) {
        if (sellerVerification.status === 'verified') {
          tier = 'verified';
          reputationScore = 80;
        } else if (sellerVerification.status === 'pending') {
          tier = 'pending';
          reputationScore = 50;
        } else {
          tier = 'rejected';
          reputationScore = 20;
        }
      }
      
      return {
        sellerAddress,
        tier,
        reputationScore,
        verificationStatus: sellerVerification?.status || 'none',
        nextTierRequirements: tier === 'bronze' ? ['submit_verification'] : []
      };
    } catch (error) {
      safeLogger.error('Error getting seller verification tier:', error);
      throw new Error('Failed to get seller verification tier');
    }
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
          lt(sellerVerifications.expiresAt, now)
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
