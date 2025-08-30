import { Request, Response } from 'express';
import { MarketplaceModerationService } from '../services/marketplaceModerationService';
import { MarketplaceService } from '../services/marketplaceService';
import { DatabaseService } from '../services/databaseService';
import { z } from 'zod';

// Request validation schemas
const VerifyListingSchema = z.object({
  listingId: z.string(),
  proofOfOwnership: z.object({
    signature: z.string(),
    message: z.string(),
    walletAddress: z.string(),
    timestamp: z.number(),
  }).optional(),
});

const ModerateListingSchema = z.object({
  listingId: z.string(),
});

const AppealDecisionSchema = z.object({
  listingId: z.string(),
  decisionId: z.number(),
  appealReason: z.string(),
  evidence: z.record(z.any()).optional(),
});

const UpdateSellerTierSchema = z.object({
  walletAddress: z.string(),
  tier: z.enum(['unverified', 'basic', 'verified', 'premium']),
  reason: z.string(),
});

export class MarketplaceModerationController {
  private moderationService: MarketplaceModerationService;
  private marketplaceService: MarketplaceService;
  private databaseService: DatabaseService;

  constructor() {
    this.moderationService = new MarketplaceModerationService();
    this.marketplaceService = new MarketplaceService();
    this.databaseService = new DatabaseService();
  }

  /**
   * Verify a marketplace listing with enhanced checks
   * POST /api/marketplace/moderation/verify
   */
  async verifyListing(req: Request, res: Response): Promise<void> {
    try {
      const { listingId, proofOfOwnership } = VerifyListingSchema.parse(req.body);

      // Get the listing
      const listing = await this.marketplaceService.getListingById(listingId);
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      // Perform verification
      const verification = await this.moderationService.verifyHighValueNFTListing(
        listing,
        proofOfOwnership
      );

      // Store verification result
      await this.storeVerificationResult(verification);

      res.json({
        success: true,
        verification,
        message: `Listing verified with ${verification.verificationLevel} level`
      });

    } catch (error) {
      console.error('Error verifying listing:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Run comprehensive moderation on a marketplace listing
   * POST /api/marketplace/moderation/moderate
   */
  async moderateListing(req: Request, res: Response): Promise<void> {
    try {
      const { listingId } = ModerateListingSchema.parse(req.body);

      // Get the listing
      const listing = await this.marketplaceService.getListingById(listingId);
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      // Run comprehensive moderation
      const decision = await this.moderationService.moderateMarketplaceListing(listing);

      // Store moderation decision
      await this.storeModerationDecision(listingId, decision);

      // Apply the decision (block, review, etc.)
      await this.applyModerationDecision(listingId, decision);

      res.json({
        success: true,
        decision,
        message: `Listing moderation complete: ${decision.action}`
      });

    } catch (error) {
      console.error('Error moderating listing:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Detect counterfeit indicators in a listing
   * GET /api/marketplace/moderation/counterfeit/:listingId
   */
  async detectCounterfeit(req: Request, res: Response): Promise<void> {
    try {
      const { listingId } = req.params;

      // Get the listing
      const listing = await this.marketplaceService.getListingById(listingId);
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      // Run counterfeit detection
      const detection = await this.moderationService.detectCounterfeit(listing);

      // Store detection result
      await this.storeCounterfeitDetection(listingId, detection);

      res.json({
        success: true,
        detection,
        isCounterfeit: detection.suspiciousTerms.length > 2 || 
                      (detection.priceAnalysis?.isSuspicious ?? false)
      });

    } catch (error) {
      console.error('Error detecting counterfeit:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Detect scam patterns in a listing
   * GET /api/marketplace/moderation/scam-patterns/:listingId
   */
  async detectScamPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { listingId } = req.params;

      // Get the listing
      const listing = await this.marketplaceService.getListingById(listingId);
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }

      // Detect scam patterns
      const patterns = await this.moderationService.detectScamPatterns(listing);

      // Store pattern detection results
      for (const pattern of patterns) {
        await this.storeScamPattern(listingId, pattern);
      }

      res.json({
        success: true,
        patterns,
        highRiskPatterns: patterns.filter(p => p.confidence > 0.7)
      });

    } catch (error) {
      console.error('Error detecting scam patterns:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get seller verification tier
   * GET /api/marketplace/moderation/seller-tier/:walletAddress
   */
  async getSellerTier(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;

      // Validate wallet address format
      if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        res.status(400).json({ error: 'Invalid wallet address format' });
        return;
      }

      // Get seller tier
      const tier = await this.moderationService.determineSellerTier(walletAddress);

      // Get existing verification record
      const verification = await this.getSellerVerification(walletAddress);

      res.json({
        success: true,
        walletAddress,
        currentTier: tier,
        verification
      });

    } catch (error) {
      console.error('Error getting seller tier:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update seller verification tier (admin only)
   * PUT /api/marketplace/moderation/seller-tier
   */
  async updateSellerTier(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress, tier, reason } = UpdateSellerTierSchema.parse(req.body);

      // TODO: Add admin authentication check
      // if (!req.user?.isAdmin) {
      //   res.status(403).json({ error: 'Admin access required' });
      //   return;
      // }

      // Update seller tier
      await this.updateSellerVerification(walletAddress, tier, reason);

      res.json({
        success: true,
        message: `Seller tier updated to ${tier}`,
        walletAddress,
        newTier: tier
      });

    } catch (error) {
      console.error('Error updating seller tier:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Submit an appeal for a moderation decision
   * POST /api/marketplace/moderation/appeal
   */
  async submitAppeal(req: Request, res: Response): Promise<void> {
    try {
      const { listingId, decisionId, appealReason, evidence } = AppealDecisionSchema.parse(req.body);

      // TODO: Get appellant address from authenticated user
      const appellantAddress = req.body.appellantAddress || '0x0000000000000000000000000000000000000000';

      // Validate that the decision exists
      const decision = await this.getModerationDecision(decisionId);
      if (!decision) {
        res.status(404).json({ error: 'Moderation decision not found' });
        return;
      }

      // Create appeal record
      const appeal = await this.createAppeal(listingId, decisionId, appellantAddress, appealReason, evidence);

      res.json({
        success: true,
        appeal,
        message: 'Appeal submitted successfully'
      });

    } catch (error) {
      console.error('Error submitting appeal:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get moderation history for a listing
   * GET /api/marketplace/moderation/history/:listingId
   */
  async getModerationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { listingId } = req.params;

      const history = await this.getListingModerationHistory(listingId);

      res.json({
        success: true,
        listingId,
        history
      });

    } catch (error) {
      console.error('Error getting moderation history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get marketplace moderation statistics
   * GET /api/marketplace/moderation/stats
   */
  async getModerationStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.calculateModerationStats();

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Error getting moderation stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods for database operations

  private async storeVerificationResult(verification: any): Promise<void> {
    // In a real implementation, this would store to the marketplace_verifications table
    console.log('Storing verification result:', verification);
  }

  private async storeModerationDecision(listingId: string, decision: any): Promise<void> {
    // In a real implementation, this would store to the marketplace_moderation_decisions table
    console.log('Storing moderation decision:', { listingId, decision });
  }

  private async storeCounterfeitDetection(listingId: string, detection: any): Promise<void> {
    // In a real implementation, this would store to the counterfeit_detections table
    console.log('Storing counterfeit detection:', { listingId, detection });
  }

  private async storeScamPattern(listingId: string, pattern: any): Promise<void> {
    // In a real implementation, this would store to the scam_patterns table
    console.log('Storing scam pattern:', { listingId, pattern });
  }

  private async applyModerationDecision(listingId: string, decision: any): Promise<void> {
    // In a real implementation, this would update the listing status based on the decision
    if (decision.action === 'block') {
      // Block the listing
      console.log(`Blocking listing ${listingId}`);
    } else if (decision.action === 'review') {
      // Flag for human review
      console.log(`Flagging listing ${listingId} for review`);
    }
  }

  private async getSellerVerification(walletAddress: string): Promise<any> {
    // In a real implementation, this would query the seller_verifications table
    return {
      walletAddress,
      currentTier: 'basic',
      kycVerified: false,
      reputationScore: 50,
      totalVolume: 1000,
      successfulTransactions: 10,
      disputeRate: 0.05
    };
  }

  private async updateSellerVerification(walletAddress: string, tier: string, reason: string): Promise<void> {
    // In a real implementation, this would update the seller_verifications table
    console.log('Updating seller verification:', { walletAddress, tier, reason });
  }

  private async getModerationDecision(decisionId: number): Promise<any> {
    // In a real implementation, this would query the marketplace_moderation_decisions table
    return {
      id: decisionId,
      listingId: '1',
      decision: 'block',
      confidence: 0.8,
      primaryCategory: 'scam_detected'
    };
  }

  private async createAppeal(
    listingId: string,
    decisionId: number,
    appellantAddress: string,
    appealReason: string,
    evidence?: any
  ): Promise<any> {
    // In a real implementation, this would insert into the marketplace_appeals table
    return {
      id: Math.floor(Math.random() * 1000),
      listingId,
      decisionId,
      appellantAddress,
      appealReason,
      evidence,
      status: 'open',
      createdAt: new Date().toISOString()
    };
  }

  private async getListingModerationHistory(listingId: string): Promise<any[]> {
    // In a real implementation, this would query multiple moderation tables
    return [
      {
        type: 'verification',
        timestamp: new Date().toISOString(),
        result: 'enhanced_verification_required'
      },
      {
        type: 'counterfeit_check',
        timestamp: new Date().toISOString(),
        result: 'no_issues_detected'
      },
      {
        type: 'scam_check',
        timestamp: new Date().toISOString(),
        result: 'low_risk'
      }
    ];
  }

  private async calculateModerationStats(): Promise<any> {
    // In a real implementation, this would aggregate data from moderation tables
    return {
      totalListingsModerated: 1000,
      blockedListings: 50,
      reviewedListings: 200,
      allowedListings: 750,
      counterfeitDetections: 25,
      scamDetections: 30,
      appealsSubmitted: 10,
      appealsApproved: 3,
      averageProcessingTime: 2.5, // seconds
      sellerTierDistribution: {
        unverified: 400,
        basic: 300,
        verified: 200,
        premium: 100
      }
    };
  }
}