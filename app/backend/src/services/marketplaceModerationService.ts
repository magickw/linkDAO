import { z } from 'zod';
import { DatabaseService } from './databaseService';
import { ReputationService } from './reputationService';
import { KYCService } from './kycService';
import { ContentInput, EnsembleDecision, AIModelResult } from '../models/ModerationModels';
import { MarketplaceListing } from '../models/Marketplace';

// Marketplace-specific moderation schemas
export const MarketplaceVerificationSchema = z.object({
  listingId: z.string(),
  verificationLevel: z.enum(['basic', 'enhanced', 'premium']),
  proofOfOwnership: z.object({
    signature: z.string(),
    message: z.string(),
    walletAddress: z.string(),
    timestamp: z.number(),
  }).optional(),
  brandVerification: z.object({
    brandName: z.string(),
    isAuthorized: z.boolean(),
    verificationSource: z.string(),
  }).optional(),
  sellerTier: z.enum(['unverified', 'basic', 'verified', 'premium']),
  riskScore: z.number().min(0).max(1),
});

export const ScamPatternSchema = z.object({
  patternType: z.enum(['counterfeit', 'phishing', 'fake_listing', 'price_manipulation', 'stolen_nft']),
  confidence: z.number().min(0).max(1),
  indicators: z.array(z.string()),
  description: z.string(),
});

export const CounterfeitDetectionSchema = z.object({
  brandKeywords: z.array(z.string()),
  suspiciousTerms: z.array(z.string()),
  imageAnalysis: z.object({
    logoDetected: z.boolean(),
    brandMatch: z.boolean(),
    confidence: z.number(),
  }).optional(),
  priceAnalysis: z.object({
    marketPrice: z.number().optional(),
    listingPrice: z.number(),
    priceDeviation: z.number(),
    isSuspicious: z.boolean(),
  }).optional(),
});

export type MarketplaceVerification = z.infer<typeof MarketplaceVerificationSchema>;
export type ScamPattern = z.infer<typeof ScamPatternSchema>;
export type CounterfeitDetection = z.infer<typeof CounterfeitDetectionSchema>;

export class MarketplaceModerationService {
  private databaseService: DatabaseService;
  private reputationService: ReputationService;
  private kycService: KYCService;

  // Brand keyword patterns for counterfeit detection
  private readonly BRAND_KEYWORDS = [
    'nike', 'adidas', 'gucci', 'louis vuitton', 'chanel', 'rolex', 'apple',
    'supreme', 'off-white', 'balenciaga', 'versace', 'prada', 'hermès',
    'cartier', 'tiffany', 'burberry', 'dior', 'fendi', 'givenchy'
  ];

  // Suspicious terms that often indicate counterfeits
  private readonly COUNTERFEIT_INDICATORS = [
    'replica', 'fake', 'copy', 'inspired by', 'similar to', 'style of',
    'unbranded', 'no box', 'no papers', 'aaa quality', 'mirror quality',
    'factory direct', 'wholesale', 'bulk', 'liquidation'
  ];

  // Scam pattern indicators
  private readonly SCAM_PATTERNS = {
    phishing: [
      'click here to claim', 'limited time offer', 'act now', 'exclusive deal',
      'free nft', 'airdrop', 'whitelist', 'presale', 'mint now'
    ],
    fake_listing: [
      'too good to be true', 'urgent sale', 'must sell today', 'no returns',
      'cash only', 'wire transfer', 'western union', 'gift cards'
    ],
    price_manipulation: [
      'pump', 'dump', 'moon', 'diamond hands', 'to the moon', 'hodl',
      'guaranteed profit', 'insider info', 'sure thing'
    ]
  };

  constructor() {
    this.databaseService = new DatabaseService();
    this.reputationService = new ReputationService();
    this.kycService = new KYCService();
  }

  /**
   * Enhanced verification system for high-value NFT listings
   * Requirement 9.1: High-value NFTs require proof-of-ownership signatures
   */
  async verifyHighValueNFTListing(
    listing: MarketplaceListing,
    proofOfOwnership?: {
      signature: string;
      message: string;
      walletAddress: string;
      timestamp: number;
    }
  ): Promise<MarketplaceVerification> {
    const listingValue = parseFloat(listing.price);
    const HIGH_VALUE_THRESHOLD = 1000; // $1000 USD equivalent

    // Determine verification level based on listing value
    let verificationLevel: 'basic' | 'enhanced' | 'premium' = 'basic';
    if (listingValue > HIGH_VALUE_THRESHOLD * 10) {
      verificationLevel = 'premium';
    } else if (listingValue > HIGH_VALUE_THRESHOLD) {
      verificationLevel = 'enhanced';
    }

    // Get seller reputation and tier
    const sellerReputation = await this.reputationService.getUserReputation(listing.sellerWalletAddress);
    const sellerTier = await this.determineSellerTier(listing.sellerWalletAddress);

    let riskScore = 0.1; // Base risk score

    // Verify proof of ownership for high-value listings
    if (verificationLevel !== 'basic' && listing.itemType === 'NFT') {
      if (!proofOfOwnership) {
        riskScore += 0.5; // High risk if no proof provided
      } else {
        const isValidProof = await this.validateProofOfOwnership(
          listing.tokenAddress,
          listing.tokenId || '',
          proofOfOwnership
        );
        if (!isValidProof) {
          riskScore += 0.7; // Very high risk for invalid proof
        }
      }
    }

    // Adjust risk based on seller reputation
    const reputationScore = sellerReputation?.overallScore || 0;
    if (reputationScore < 50) {
      riskScore += 0.3;
    } else if (reputationScore > 80) {
      riskScore -= 0.1;
    }

    // Adjust risk based on seller tier
    switch (sellerTier) {
      case 'unverified':
        riskScore += 0.2;
        break;
      case 'premium':
        riskScore -= 0.2;
        break;
    }

    riskScore = Math.max(0, Math.min(1, riskScore));

    return {
      listingId: listing.id,
      verificationLevel,
      proofOfOwnership,
      sellerTier,
      riskScore,
    };
  }

  /**
   * Counterfeit detection using brand keyword models
   * Requirement 9.2: Enhanced counterfeit detection for brand keywords
   */
  async detectCounterfeit(listing: MarketplaceListing): Promise<CounterfeitDetection> {
    const title = listing.metadataURI.toLowerCase();
    const description = listing.metadataURI.toLowerCase(); // Simplified for demo

    // Detect brand keywords
    const detectedBrands = this.BRAND_KEYWORDS.filter(brand => 
      title.includes(brand) || description.includes(brand)
    );

    // Detect suspicious terms
    const suspiciousTerms = this.COUNTERFEIT_INDICATORS.filter(term =>
      title.includes(term) || description.includes(term)
    );

    // Price analysis for counterfeits (unusually low prices for luxury brands)
    const listingPrice = parseFloat(listing.price);
    let priceAnalysis;
    
    if (detectedBrands.length > 0) {
      // Estimate market price based on brand (simplified logic)
      const estimatedMarketPrice = this.estimateMarketPrice(detectedBrands[0], listing.itemType);
      const priceDeviation = (estimatedMarketPrice - listingPrice) / estimatedMarketPrice;
      
      priceAnalysis = {
        marketPrice: estimatedMarketPrice,
        listingPrice,
        priceDeviation,
        isSuspicious: priceDeviation > 0.7 && listingPrice < estimatedMarketPrice * 0.3
      };
    }

    return {
      brandKeywords: detectedBrands,
      suspiciousTerms,
      priceAnalysis,
    };
  }

  /**
   * Proof-of-ownership signature verification
   * Requirement 9.3: Signature verification for NFT ownership
   */
  async validateProofOfOwnership(
    tokenAddress: string,
    tokenId: string,
    proof: {
      signature: string;
      message: string;
      walletAddress: string;
      timestamp: number;
    }
  ): Promise<boolean> {
    try {
      // Verify signature timestamp (must be recent)
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      if (now - proof.timestamp > maxAge) {
        return false;
      }

      // Verify message format
      const expectedMessage = `I own NFT ${tokenId} at contract ${tokenAddress} - ${proof.timestamp}`;
      if (proof.message !== expectedMessage) {
        return false;
      }

      // In a real implementation, we would:
      // 1. Verify the signature cryptographically
      // 2. Check on-chain ownership of the NFT
      // 3. Ensure the signing wallet currently holds the NFT
      
      // For now, we'll simulate this verification
      const isValidSignature = this.verifySignature(proof.message, proof.signature, proof.walletAddress);
      const isCurrentOwner = await this.checkNFTOwnership(tokenAddress, tokenId, proof.walletAddress);

      return isValidSignature && isCurrentOwner;
    } catch (error) {
      console.error('Error validating proof of ownership:', error);
      return false;
    }
  }

  /**
   * Seller verification tiering based on reputation and KYC
   * Requirement 9.4: Seller verification tiers
   */
  async determineSellerTier(walletAddress: string): Promise<'unverified' | 'basic' | 'verified' | 'premium'> {
    try {
      const reputation = await this.reputationService.getUserReputation(walletAddress);
      const kycStatus = await this.kycService.getKYCStatus(walletAddress);
      
      // Check transaction history and volume
      const sellerHistory = await this.getSellerHistory(walletAddress);
      
      const reputationScore = reputation?.overallScore || 0;
      
      if (kycStatus?.status === 'approved' && reputationScore > 90 && sellerHistory.totalVolume > 50000) {
        return 'premium';
      } else if (kycStatus?.status === 'approved' && reputationScore > 70) {
        return 'verified';
      } else if (reputationScore > 50 || sellerHistory.successfulTransactions > 10) {
        return 'basic';
      } else {
        return 'unverified';
      }
    } catch (error) {
      console.error('Error determining seller tier:', error);
      return 'unverified';
    }
  }

  /**
   * Scam pattern detection for marketplace listings
   * Requirement 9.5: Scam pattern detection
   */
  async detectScamPatterns(listing: MarketplaceListing): Promise<ScamPattern[]> {
    const detectedPatterns: ScamPattern[] = [];
    const title = listing.metadataURI.toLowerCase();
    const description = listing.metadataURI.toLowerCase(); // Simplified

    // Check for phishing patterns
    const phishingIndicators = this.SCAM_PATTERNS.phishing.filter(pattern =>
      title.includes(pattern) || description.includes(pattern)
    );
    
    if (phishingIndicators.length > 0) {
      detectedPatterns.push({
        patternType: 'phishing',
        confidence: Math.min(0.9, phishingIndicators.length * 0.3),
        indicators: phishingIndicators,
        description: 'Potential phishing attempt detected in listing content'
      });
    }

    // Check for fake listing patterns
    const fakeListingIndicators = this.SCAM_PATTERNS.fake_listing.filter(pattern =>
      title.includes(pattern) || description.includes(pattern)
    );
    
    if (fakeListingIndicators.length > 0) {
      detectedPatterns.push({
        patternType: 'fake_listing',
        confidence: Math.min(0.8, fakeListingIndicators.length * 0.25),
        indicators: fakeListingIndicators,
        description: 'Suspicious listing patterns detected'
      });
    }

    // Check for price manipulation patterns
    const priceManipulationIndicators = this.SCAM_PATTERNS.price_manipulation.filter(pattern =>
      title.includes(pattern) || description.includes(pattern)
    );
    
    if (priceManipulationIndicators.length > 0) {
      detectedPatterns.push({
        patternType: 'price_manipulation',
        confidence: Math.min(0.7, priceManipulationIndicators.length * 0.2),
        indicators: priceManipulationIndicators,
        description: 'Price manipulation language detected'
      });
    }

    // Check for stolen NFT patterns (simplified)
    if (listing.itemType === 'NFT') {
      const stolenNFTRisk = await this.checkStolenNFTDatabase(listing.tokenAddress, listing.tokenId || '');
      if (stolenNFTRisk > 0.5) {
        detectedPatterns.push({
          patternType: 'stolen_nft',
          confidence: stolenNFTRisk,
          indicators: ['nft_flagged_as_stolen'],
          description: 'NFT may be flagged as stolen or disputed'
        });
      }
    }

    return detectedPatterns;
  }

  /**
   * Comprehensive marketplace moderation check
   */
  async moderateMarketplaceListing(listing: MarketplaceListing): Promise<EnsembleDecision> {
    try {
      // Run all marketplace-specific checks
      const verification = await this.verifyHighValueNFTListing(listing);
      const counterfeitDetection = await this.detectCounterfeit(listing);
      const scamPatterns = await this.detectScamPatterns(listing);

      // Calculate overall confidence and risk
      let overallConfidence = 0.5;
      let primaryCategory = 'marketplace_review';
      let action: 'allow' | 'limit' | 'block' | 'review' = 'allow';

      // Adjust based on verification results
      if (verification.riskScore > 0.7) {
        overallConfidence = 0.8;
        action = 'block';
        primaryCategory = 'high_risk_listing';
      } else if (verification.riskScore > 0.4) {
        overallConfidence = 0.6;
        action = 'review';
        primaryCategory = 'suspicious_listing';
      }

      // Adjust based on counterfeit detection
      if (counterfeitDetection.suspiciousTerms.length > 2 || 
          (counterfeitDetection.priceAnalysis?.isSuspicious)) {
        overallConfidence = Math.max(overallConfidence, 0.7);
        action = action === 'allow' ? 'review' : action;
        primaryCategory = 'potential_counterfeit';
      }

      // Adjust based on scam patterns
      const highConfidenceScams = scamPatterns.filter(p => p.confidence > 0.6);
      if (highConfidenceScams.length > 0) {
        overallConfidence = 0.9;
        action = 'block';
        primaryCategory = 'scam_detected';
      }

      // Create vendor results for marketplace checks
      const vendorResults: AIModelResult[] = [
        {
          vendor: 'marketplace_verification',
          confidence: 1 - verification.riskScore,
          categories: [verification.verificationLevel, verification.sellerTier],
          reasoning: `Seller tier: ${verification.sellerTier}, Risk score: ${verification.riskScore}`,
          cost: 0,
          latency: 100,
        },
        {
          vendor: 'counterfeit_detection',
          confidence: counterfeitDetection.suspiciousTerms.length > 0 ? 0.8 : 0.2,
          categories: counterfeitDetection.brandKeywords,
          reasoning: `Detected brands: ${counterfeitDetection.brandKeywords.join(', ')}, Suspicious terms: ${counterfeitDetection.suspiciousTerms.length}`,
          cost: 0,
          latency: 50,
        },
        {
          vendor: 'scam_detection',
          confidence: scamPatterns.length > 0 ? Math.max(...scamPatterns.map(p => p.confidence)) : 0.1,
          categories: scamPatterns.map(p => p.patternType),
          reasoning: `Detected ${scamPatterns.length} potential scam patterns`,
          cost: 0,
          latency: 75,
        }
      ];

      return {
        overallConfidence,
        primaryCategory,
        action,
        vendorResults,
        reasoning: `Marketplace moderation: ${action} - ${primaryCategory} (confidence: ${overallConfidence})`
      };

    } catch (error) {
      console.error('Error in marketplace moderation:', error);
      
      // Fallback to safe action on error
      return {
        overallConfidence: 0.5,
        primaryCategory: 'moderation_error',
        action: 'review',
        vendorResults: [],
        reasoning: 'Error occurred during marketplace moderation, flagged for human review'
      };
    }
  }

  // Helper methods

  private verifySignature(message: string, signature: string, walletAddress: string): boolean {
    // In a real implementation, this would use cryptographic signature verification
    // For now, we'll simulate this
    return signature.length > 100 && walletAddress.startsWith('0x');
  }

  private async checkNFTOwnership(tokenAddress: string, tokenId: string, walletAddress: string): Promise<boolean> {
    // In a real implementation, this would query the blockchain
    // For now, we'll simulate this check
    return tokenAddress.startsWith('0x') && tokenId.length > 0;
  }

  private estimateMarketPrice(brand: string, itemType: string): number {
    // Simplified market price estimation
    const brandMultipliers: Record<string, number> = {
      'rolex': 5000,
      'gucci': 1500,
      'nike': 200,
      'supreme': 300,
      'louis vuitton': 2000,
    };

    return brandMultipliers[brand] || 100;
  }

  private async getSellerHistory(walletAddress: string): Promise<{
    totalVolume: number;
    successfulTransactions: number;
    disputeRate: number;
  }> {
    // In a real implementation, this would query the database
    // For now, we'll return mock data
    return {
      totalVolume: Math.random() * 100000,
      successfulTransactions: Math.floor(Math.random() * 50),
      disputeRate: Math.random() * 0.1,
    };
  }

  private async checkStolenNFTDatabase(tokenAddress: string, tokenId: string): Promise<number> {
    // In a real implementation, this would check against stolen NFT databases
    // For now, we'll return a low random risk score
    return Math.random() * 0.3;
  }
}