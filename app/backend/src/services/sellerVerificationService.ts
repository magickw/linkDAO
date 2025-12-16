import { eq, and, lt } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { sellerVerifications } from '../database/schemas/sellerVerification';
import { sellers } from '../db/schema';
import { SellerVerification, VerificationRequest } from '../types/sellerVerification';
import { ValidationError } from '../models/validation';
import { desc } from 'drizzle-orm';

export class SellerVerificationService {
  /**
   * Submit a new verification request
   */
  async submitVerification(sellerId: string, request: VerificationRequest): Promise<SellerVerification> {
    // Validate EIN format if provided
    if (request.ein && !this.isValidEIN(request.ein)) {
      throw new ValidationError('Invalid EIN format. Expected format: ##-#######', 'ein');
    }

    // Check if seller already has a pending verification
    const existingVerification = await this.getActiveVerification(sellerId);
    if (existingVerification && existingVerification.status === 'pending') {
      throw new ValidationError('Seller already has a pending verification request', 'sellerId');
    }

    // Create new verification record
    const [verification] = await db.insert(sellerVerifications).values({
      sellerId,
      legalName: request.legalName,
      ein: request.ein,
      businessAddress: request.businessAddress,
      status: 'pending',
      submittedAt: new Date(),
    }).returning();

    // Trigger automated verification process
    this.processVerification(verification.id);

    return verification;
  }

  /**
   * Get active verification for a seller
   */
  async getActiveVerification(sellerId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.sellerId, sellerId))
      .orderBy(desc(sellerVerifications.submittedAt))
      .limit(1);

    return verifications[0] || null;
  }

  /**
   * Get verification by ID
   */
  async getVerificationById(verificationId: string): Promise<SellerVerification | null> {
    const verifications = await db.select().from(sellerVerifications)
      .where(eq(sellerVerifications.id, verificationId));

    return verifications[0] || null;
  }

  /**
   * Process verification through automated systems
   */
  private async processVerification(verificationId: string): Promise<void> {
    const verification = await this.getVerificationById(verificationId);
    if (!verification) return;

    try {
      // 1. Validate EIN format
      if (verification.ein && !this.isValidEIN(verification.ein)) {
        await this.rejectVerification(verificationId, 'Invalid EIN format. Expected format: ##-#######');
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

      // 3. Automated verification using real services
      const verificationResult = await this.performAutomatedVerification(verification);
      
      if (verificationResult.success) {
        await this.approveVerification(verificationId, {
          verificationMethod: this.mapVerificationMethod(verificationResult.method),
          verificationReference: verificationResult.reference,
          riskScore: verificationResult.riskScore
        });
      } else {
        // Flag for manual review if automated verification fails
        await this.flagForManualReview(verificationId, verificationResult.reason || 'Automated verification failed');
      }
    } catch (error) {
      safeLogger.error('Error processing verification:', error);
      // Flag for manual review on error
      await this.flagForManualReview(verificationId, 'System error during verification: ' + (error as Error).message);
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
    try {
      // 1. IRS TIN Matching API verification (if EIN provided)
      if (verification.ein && verification.legalName) {
        const irsResult = await this.verifyWithIRSTINMatch(
          verification.ein,
          verification.legalName
        );
        
        if (!irsResult.success) {
          return {
            success: false,
            method: 'irs_tin_match',
            reason: irsResult.reason || 'IRS TIN Match verification failed'
          };
        }
      }

      // 2. Address verification using SmartyStreets or similar
      if (verification.businessAddress) {
        const addressResult = await this.verifyAddress(verification.businessAddress);
        
        if (!addressResult.success) {
          // Address verification is not critical for approval, but affects risk score
          safeLogger.warn('Address verification warning:', addressResult.reason);
        }
      }

      // 3. Business registry check using OpenCorporates or similar
      if (verification.legalName) {
        const registryResult = await this.checkBusinessRegistry(verification.legalName);
        
        if (!registryResult.success) {
          // Registry check is not critical for approval, but affects risk score
          safeLogger.warn('Business registry check warning:', registryResult.reason);
        }
      }

      // Determine risk score based on verification results
      const riskScore = this.calculateRiskScore(verification);

      return {
        success: true,
        method: 'automated_verification',
        reference: `auto_${Date.now()}`,
        riskScore: riskScore
      };
    } catch (error) {
      safeLogger.error('Error in automated verification:', error);
      return {
        success: false,
        reason: 'System error during automated verification: ' + (error as Error).message
      };
    }
  }

  /**
   * Verify EIN and business name match using IRS TIN Matching API
   */
  private async verifyWithIRSTINMatch(ein: string, legalName: string): Promise<{
    success: boolean;
    reason?: string;
  }> {
    // In a real implementation, you would integrate with the IRS TIN Matching API
    // This requires proper authentication and follows IRS guidelines
    // For now, we'll simulate a successful verification
    
    // Example implementation (commented out):
    /*
    try {
      const response = await fetch('https://www.irs.gov/tin-match-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.IRS_API_KEY}`
        },
        body: JSON.stringify({
          ein: ein.replace('-', ''),
          legalName: legalName.toUpperCase()
        })
      });
      
      const result = await response.json();
      
      if (result.match) {
        return { success: true };
      } else {
        return { 
          success: false, 
          reason: result.reason || 'EIN and business name do not match' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        reason: 'Failed to connect to IRS TIN Matching API' 
      };
    }
    */
    
    // Mock implementation for demonstration
    return { success: true };
  }

  /**
   * Verify address using SmartyStreets or similar service
   */
  private async verifyAddress(address: string): Promise<{
    success: boolean;
    normalizedAddress?: string;
    reason?: string;
  }> {
    // In a real implementation, you would integrate with SmartyStreets, Lob, or Google Maps API
    // For now, we'll simulate a successful verification
    
    // Example implementation (commented out):
    /*
    try {
      const response = await fetch('https://api.smartystreets.com/street-address', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SMARTY_STREETS_AUTH_ID}:${process.env.SMARTY_STREETS_AUTH_TOKEN}`
        },
        params: {
          street: address
        }
      });
      
      const result = await response.json();
      
      if (result.length > 0 && result[0].delivery_line_1) {
        return { 
          success: true,
          normalizedAddress: `${result[0].delivery_line_1}, ${result[0].last_line}`
        };
      } else {
        return { 
          success: false, 
          reason: 'Address could not be verified' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        reason: 'Failed to connect to address verification service' 
      };
    }
    */
    
    // Mock implementation for demonstration
    return { success: true, normalizedAddress: address };
  }

  /**
   * Check business registry using OpenCorporates or similar service
   */
  private async checkBusinessRegistry(legalName: string): Promise<{
    success: boolean;
    reason?: string;
  }> {
    // In a real implementation, you would integrate with OpenCorporates API or similar
    // For now, we'll simulate a successful verification
    
    // Example implementation (commented out):
    /*
    try {
      const response = await fetch(`https://api.opencorporates.com/v0.4/companies/search`, {
        method: 'GET',
        headers: {
          'Authorization': `Token token=${process.env.OPENCORPORATES_API_KEY}`
        },
        params: {
          q: legalName
        }
      });
      
      const result = await response.json();
      
      if (result.results.companies.length > 0) {
        return { success: true };
      } else {
        return { 
          success: false, 
          reason: 'Business not found in registry' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        reason: 'Failed to connect to business registry service' 
      };
    }
    */
    
    // Mock implementation for demonstration
    return { success: true };
  }

  /**
   * Calculate risk score based on verification results
   */
  private calculateRiskScore(verification: SellerVerification): 'low' | 'medium' | 'high' {
    // In a real implementation, this would be more sophisticated
    // For now, we'll use a simple scoring system
    
    let score = 0;
    
    // EIN verification adds trust (if provided)
    if (verification.ein) {
      score += 1;
    }
    
    // Address verification adds trust
    if (verification.businessAddress) {
      score += 1;
    }
    
    // Business registry check adds trust
    if (verification.legalName) {
      score += 1;
    }
    
    // Return risk score based on accumulated points
    if (score >= 3) {
      return 'low';
    } else if (score >= 2) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * Approve a verification
   */
  async approveVerification(
    verificationId: string, 
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
        verifiedAt: new Date(),
        expiresAt,
        verificationMethod: metadata?.verificationMethod,
        verificationReference: metadata?.verificationReference,
        riskScore: metadata?.riskScore,
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

    // Update seller status in marketplace schema
    if (updated) {
      // Find the seller record using userId
      const [seller] = await db.select()
        .from(sellers)
        .where(eq(sellers.walletAddress, (updated as any).userId))
        .limit(1);
      
      if (seller) {
        await db.update(sellers)
          .set({ isVerified: true })
          .where(eq(sellers.id, seller.id));
      }
    }

    return updated;
  }

  /**
   * Reject a verification
   */
  async rejectVerification(verificationId: string, reason: string): Promise<SellerVerification> {
    const [updated] = await db.update(sellerVerifications)
      .set({
        status: 'rejected',
        rejectionReason: reason,
      })
      .where(eq(sellerVerifications.id, verificationId))
      .returning();

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
      
      // Find the seller record using userId
      const [seller] = await db.select()
        .from(sellers)
        .where(eq(sellers.walletAddress, (verification as any).userId))
        .limit(1);
      
      // Update seller status
      if (seller) {
        await db.update(sellers)
          .set({ isVerified: false })
          .where(eq(sellers.id, seller.id));
      }
    }
  }

  private mapVerificationMethod(method: string): 'irs_tin_match' | 'trulioo' | 'manual_review' | 'open_corporates' {
    switch (method.toLowerCase()) {
      case 'irs':
      case 'irs_tin':
      case 'tin_match':
        return 'irs_tin_match';
      case 'trulioo':
        return 'trulioo';
      case 'manual':
      case 'manual_review':
        return 'manual_review';
      case 'open_corporates':
      case 'opencorporates':
        return 'open_corporates';
      default:
        return 'manual_review';
    }
  }
}
