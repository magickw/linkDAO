import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { ReputationService } from './reputationService';
import { safeLogger } from '../utils/safeLogger';
import { AIModerationOrchestrator, ContentInput } from './aiModerationOrchestrator';
import { safeLogger } from '../utils/safeLogger';
import EvidenceStorageService from './evidenceStorageService';
import { safeLogger } from '../utils/safeLogger';
import { UserProfileService } from './userProfileService';
import { safeLogger } from '../utils/safeLogger';
import { z } from 'zod';
import { safeLogger } from '../utils/safeLogger';

// Marketplace-specific moderation schemas
export const MarketplaceVerificationLevel = z.enum([
  'basic',
  'enhanced',
  'premium',
  'institutional'
]);

export const NFTVerificationStatus = z.enum([
  'unverified',
  'pending',
  'verified',
  'flagged',
  'counterfeit'
]);

export const SellerTier = z.enum([
  'new',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'verified_business'
]);

export const ScamPattern = z.enum([
  'seed_phrase_request',
  'fake_giveaway',
  'impersonation',
  'phishing_link',
  'counterfeit_nft',
  'price_manipulation',
  'fake_urgency',
  'suspicious_pricing'
]);

// Marketplace moderation interfaces
export interface MarketplaceListingInput extends ContentInput {
  type: 'listing';
  listingData: {
    title: string;
    description: string;
    price: string;
    currency: string;
    category: string;
    images: string[];
    nftContract?: string;
    tokenId?: string;
    brandKeywords?: string[];
    isHighValue: boolean;
    sellerAddress: string;
  };
}

export interface NFTVerificationResult {
  status: z.infer<typeof NFTVerificationStatus>;
  ownershipVerified: boolean;
  signatureValid: boolean;
  contractVerified: boolean;
  metadataConsistent: boolean;
  riskFactors: string[];
  confidence: number;
}

export interface SellerVerificationResult {
  tier: z.infer<typeof SellerTier>;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  reputationScore: number;
  transactionHistory: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  verificationRequirements: string[];
}

export interface CounterfeitDetectionResult {
  isCounterfeit: boolean;
  confidence: number;
  matchedBrands: string[];
  suspiciousKeywords: string[];
  imageAnalysis?: {
    logoDetected: boolean;
    brandMatches: string[];
    qualityScore: number;
  };
}

export interface ScamDetectionResult {
  isScam: boolean;
  confidence: number;
  detectedPatterns: z.infer<typeof ScamPattern>[];
  riskFactors: string[];
  reasoning: string;
}

export interface MarketplaceModerationResult {
  listingId: string;
  overallDecision: 'allow' | 'review' | 'block';
  confidence: number;
  nftVerification?: NFTVerificationResult;
  sellerVerification: SellerVerificationResult;
  counterfeitDetection: CounterfeitDetectionResult;
  scamDetection: ScamDetectionResult;
  aiModeration: any; // From base AI moderation
  evidenceCid?: string;
  requiredActions: string[];
  riskScore: number;
}

export class MarketplaceModerationService {
  private databaseService: DatabaseService;
  private reputationService: ReputationService;
  private aiOrchestrator: AIModerationOrchestrator;
  private evidenceStorage: typeof EvidenceStorageService;
  private userProfileService: UserProfileService;
  
  // Brand keyword patterns for counterfeit detection
  private brandKeywords: Record<string, string[]> = {
    'luxury': ['gucci', 'louis vuitton', 'chanel', 'prada', 'hermès', 'rolex', 'cartier'],
    'tech': ['apple', 'samsung', 'sony', 'microsoft', 'google', 'tesla'],
    'gaming': ['nintendo', 'playstation', 'xbox', 'steam', 'epic games'],
    'crypto': ['bitcoin', 'ethereum', 'binance', 'coinbase', 'metamask', 'opensea'],
    'nft_collections': ['cryptopunks', 'bored ape', 'azuki', 'moonbirds', 'doodles']
  };

  // Scam detection patterns
  private scamPatterns: Record<string, RegExp[]> = {
    seed_phrase: [
      /seed\s+phrase/i,
      /recovery\s+phrase/i,
      /12\s+words?/i,
      /24\s+words?/i,
      /mnemonic/i
    ],
    fake_giveaway: [
      /free\s+nft/i,
      /airdrop/i,
      /giveaway/i,
      /claim\s+now/i,
      /limited\s+time/i
    ],
    phishing: [
      /connect\s+wallet/i,
      /verify\s+wallet/i,
      /claim\s+rewards?/i,
      /urgent\s+action/i
    ],
    price_manipulation: [
      /floor\s+price/i,
      /pump/i,
      /moon/i,
      /guaranteed\s+profit/i
    ]
  };

  constructor() {
    this.databaseService = new DatabaseService();
    this.reputationService = new ReputationService();
    this.aiOrchestrator = new AIModerationOrchestrator();
    this.evidenceStorage = EvidenceStorageService;
    this.userProfileService = new UserProfileService();
  }

  async moderateMarketplaceListing(input: MarketplaceListingInput): Promise<MarketplaceModerationResult> {
    const startTime = Date.now();
    
    try {
      // Run all moderation checks in parallel
      const [
        aiModerationResult,
        nftVerificationResult,
        sellerVerificationResult,
        counterfeitResult,
        scamResult
      ] = await Promise.all([
        this.aiOrchestrator.scanContent(input),
        this.verifyNFTOwnership(input),
        this.verifySellerTier(input.listingData.sellerAddress),
        this.detectCounterfeit(input),
        this.detectScamPatterns(input)
      ]);

      // Calculate overall risk score
      const riskScore = this.calculateOverallRiskScore({
        aiModeration: aiModerationResult,
        nftVerification: nftVerificationResult,
        sellerVerification: sellerVerificationResult,
        counterfeit: counterfeitResult,
        scam: scamResult
      });

      // Determine final decision
      const overallDecision = this.determineOverallDecision({
        aiModeration: aiModerationResult,
        nftVerification: nftVerificationResult,
        sellerVerification: sellerVerificationResult,
        counterfeit: counterfeitResult,
        scam: scamResult,
        riskScore
      });

      // Generate required actions
      const requiredActions = this.generateRequiredActions({
        decision: overallDecision,
        nftVerification: nftVerificationResult,
        sellerVerification: sellerVerificationResult,
        counterfeit: counterfeitResult,
        scam: scamResult
      });

      // Store evidence
      const evidenceCid = await this.storeMarketplaceEvidence({
        listingId: input.id,
        aiModeration: aiModerationResult,
        nftVerification: nftVerificationResult,
        sellerVerification: sellerVerificationResult,
        counterfeit: counterfeitResult,
        scam: scamResult,
        processingTime: Date.now() - startTime
      });

      const result: MarketplaceModerationResult = {
        listingId: input.id,
        overallDecision,
        confidence: Math.min(
          aiModerationResult.overallConfidence,
          counterfeitResult.confidence,
          scamResult.confidence
        ),
        nftVerification: nftVerificationResult,
        sellerVerification: sellerVerificationResult,
        counterfeitDetection: counterfeitResult,
        scamDetection: scamResult,
        aiModeration: aiModerationResult,
        evidenceCid,
        requiredActions,
        riskScore
      };

      // Log moderation decision
      await this.logModerationDecision(result);

      return result;

    } catch (error) {
      safeLogger.error('Marketplace moderation error:', error);
      
      // Return safe fallback
      return {
        listingId: input.id,
        overallDecision: 'review',
        confidence: 0,
        sellerVerification: await this.verifySellerTier(input.listingData.sellerAddress),
        counterfeitDetection: { isCounterfeit: false, confidence: 0, matchedBrands: [], suspiciousKeywords: [] },
        scamDetection: { isScam: false, confidence: 0, detectedPatterns: [], riskFactors: [], reasoning: 'Error during analysis' },
        aiModeration: null,
        requiredActions: ['manual_review_required'],
        riskScore: 0.8
      };
    }
  }

  private async verifyNFTOwnership(input: MarketplaceListingInput): Promise<NFTVerificationResult | undefined> {
    if (!input.listingData.nftContract || !input.listingData.tokenId) {
      return undefined;
    }

    try {
      // Check if this is a high-value NFT that requires enhanced verification
      const isHighValue = input.listingData.isHighValue || parseFloat(input.listingData.price) > 1000;
      
      if (!isHighValue) {
        return {
          status: 'unverified',
          ownershipVerified: false,
          signatureValid: false,
          contractVerified: false,
          metadataConsistent: false,
          riskFactors: [],
          confidence: 0.5
        };
      }

      // For high-value NFTs, perform comprehensive verification
      const riskFactors: string[] = [];
      let confidence = 1.0;

      // Check contract verification (simplified - would integrate with blockchain)
      const contractVerified = await this.verifyNFTContract(input.listingData.nftContract);
      if (!contractVerified) {
        riskFactors.push('unverified_contract');
        confidence *= 0.7;
      }

      // Check ownership signature (simplified - would verify cryptographic signature)
      const signatureValid = await this.verifyOwnershipSignature(
        input.listingData.sellerAddress,
        input.listingData.nftContract,
        input.listingData.tokenId
      );
      if (!signatureValid) {
        riskFactors.push('invalid_ownership_signature');
        confidence *= 0.5;
      }

      // Check metadata consistency
      const metadataConsistent = await this.verifyNFTMetadata(
        input.listingData.nftContract,
        input.listingData.tokenId,
        input.listingData.images
      );
      if (!metadataConsistent) {
        riskFactors.push('metadata_mismatch');
        confidence *= 0.8;
      }

      // Determine status based on verification results
      let status: z.infer<typeof NFTVerificationStatus>;
      if (contractVerified && signatureValid && metadataConsistent) {
        status = 'verified';
      } else if (riskFactors.length > 2) {
        status = 'flagged';
      } else {
        status = 'pending';
      }

      return {
        status,
        ownershipVerified: signatureValid,
        signatureValid,
        contractVerified,
        metadataConsistent,
        riskFactors,
        confidence
      };

    } catch (error) {
      safeLogger.error('NFT verification error:', error);
      return {
        status: 'flagged',
        ownershipVerified: false,
        signatureValid: false,
        contractVerified: false,
        metadataConsistent: false,
        riskFactors: ['verification_error'],
        confidence: 0
      };
    }
  }

  private async verifySellerTier(sellerAddress: string): Promise<SellerVerificationResult> {
    try {
      // Get seller reputation and history
      const reputation = await this.reputationService.getUserReputation(sellerAddress);
      const userProfile = await this.userProfileService.getProfileByAddress(sellerAddress);
      
      // Calculate transaction history (simplified)
      const transactionHistory = await this.getSellerTransactionCount(sellerAddress);
      
      // Use overall score from reputation service
      const reputationScore = reputation?.overallScore || 0;
      
      // Determine seller tier based on reputation and history
      let tier: z.infer<typeof SellerTier>;
      if (reputationScore >= 90 && transactionHistory >= 100) {
        tier = 'platinum';
      } else if (reputationScore >= 80 && transactionHistory >= 50) {
        tier = 'gold';
      } else if (reputationScore >= 70 && transactionHistory >= 20) {
        tier = 'silver';
      } else if (reputationScore >= 60 && transactionHistory >= 5) {
        tier = 'bronze';
      } else {
        tier = 'new';
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (reputationScore >= 80 && transactionHistory >= 20) {
        riskLevel = 'low';
      } else if (reputationScore >= 60 && transactionHistory >= 5) {
        riskLevel = 'medium';
      } else if (reputationScore >= 40) {
        riskLevel = 'high';
      } else {
        riskLevel = 'critical';
      }

      // Generate verification requirements
      const verificationRequirements: string[] = [];
      if (tier === 'new') {
        verificationRequirements.push('identity_verification', 'initial_deposit');
      }
      if (riskLevel === 'high' || riskLevel === 'critical') {
        verificationRequirements.push('enhanced_kyc', 'transaction_monitoring');
      }

      return {
        tier,
        kycStatus: (userProfile?.kycStatus as 'none' | 'pending' | 'verified' | 'rejected') || 'none',
        reputationScore,
        transactionHistory,
        riskLevel,
        verificationRequirements
      };

    } catch (error) {
      safeLogger.error('Seller verification error:', error);
      return {
        tier: 'new',
        kycStatus: 'none',
        reputationScore: 0,
        transactionHistory: 0,
        riskLevel: 'critical',
        verificationRequirements: ['manual_review_required']
      };
    }
  }

  private async detectCounterfeit(input: MarketplaceListingInput): Promise<CounterfeitDetectionResult> {
    try {
      const { title, description, brandKeywords = [] } = input.listingData;
      const content = `${title} ${description}`.toLowerCase();
      
      let isCounterfeit = false;
      let confidence = 0;
      const matchedBrands: string[] = [];
      const suspiciousKeywords: string[] = [];

      // Check against known brand keywords
      for (const [category, keywords] of Object.entries(this.brandKeywords)) {
        for (const keyword of keywords) {
          if (content.includes(keyword.toLowerCase())) {
            matchedBrands.push(keyword);
            
            // Check for suspicious patterns around brand names
            const brandPattern = new RegExp(`(replica|fake|copy|inspired|style|like)\\s+${keyword}|${keyword}\\s+(replica|fake|copy|inspired|style)`, 'i');
            if (brandPattern.test(content)) {
              isCounterfeit = true;
              confidence = Math.max(confidence, 0.8);
              suspiciousKeywords.push(`suspicious_${keyword}_usage`);
            }
          }
        }
      }

      // Check user-provided brand keywords
      for (const brand of brandKeywords) {
        if (content.includes(brand.toLowerCase())) {
          matchedBrands.push(brand);
          
          // Additional checks for user-provided brands
          const suspiciousPatterns = [
            /not\s+authentic/i,
            /unauthorized/i,
            /bootleg/i,
            /knockoff/i
          ];
          
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
              isCounterfeit = true;
              confidence = Math.max(confidence, 0.9);
              suspiciousKeywords.push('unauthorized_usage');
            }
          }
        }
      }

      // Analyze images for brand logos (simplified)
      let imageAnalysis;
      if (input.listingData.images.length > 0) {
        imageAnalysis = await this.analyzeImagesForBrands(input.listingData.images, matchedBrands);
        if (imageAnalysis.logoDetected && imageAnalysis.qualityScore < 0.5) {
          isCounterfeit = true;
          confidence = Math.max(confidence, 0.7);
        }
      }

      return {
        isCounterfeit,
        confidence,
        matchedBrands,
        suspiciousKeywords,
        imageAnalysis
      };

    } catch (error) {
      safeLogger.error('Counterfeit detection error:', error);
      return {
        isCounterfeit: false,
        confidence: 0,
        matchedBrands: [],
        suspiciousKeywords: ['detection_error']
      };
    }
  }

  private async detectScamPatterns(input: MarketplaceListingInput): Promise<ScamDetectionResult> {
    try {
      const { title, description, price, currency } = input.listingData;
      const content = `${title} ${description}`.toLowerCase();
      
      const detectedPatterns: z.infer<typeof ScamPattern>[] = [];
      const riskFactors: string[] = [];
      let confidence = 0;

      // Check for scam patterns
      for (const [patternType, regexes] of Object.entries(this.scamPatterns)) {
        for (const regex of regexes) {
          if (regex.test(content)) {
            detectedPatterns.push(patternType as z.infer<typeof ScamPattern>);
            confidence = Math.max(confidence, 0.8);
            break;
          }
        }
      }

      // Check for suspicious pricing
      const priceValue = parseFloat(price);
      if (priceValue > 0) {
        // Extremely low prices for high-value items
        if (priceValue < 0.01 && (content.includes('nft') || content.includes('rare'))) {
          detectedPatterns.push('suspicious_pricing');
          riskFactors.push('unrealistic_low_price');
          confidence = Math.max(confidence, 0.7);
        }
        
        // Extremely high prices without justification
        if (priceValue > 10000 && !content.includes('rare') && !content.includes('unique')) {
          riskFactors.push('suspicious_high_price');
          confidence = Math.max(confidence, 0.5);
        }
      }

      // Check for urgency tactics
      const urgencyPatterns = [
        /limited\s+time/i,
        /act\s+fast/i,
        /only\s+\d+\s+left/i,
        /expires\s+soon/i
      ];
      
      for (const pattern of urgencyPatterns) {
        if (pattern.test(content)) {
          detectedPatterns.push('fake_urgency');
          riskFactors.push('urgency_tactics');
          confidence = Math.max(confidence, 0.6);
          break;
        }
      }

      // Check for impersonation attempts
      const impersonationPatterns = [
        /official/i,
        /verified/i,
        /authentic/i,
        /original/i
      ];
      
      let impersonationScore = 0;
      for (const pattern of impersonationPatterns) {
        if (pattern.test(content)) {
          impersonationScore += 0.2;
        }
      }
      
      if (impersonationScore >= 0.4) {
        detectedPatterns.push('impersonation');
        riskFactors.push('false_authenticity_claims');
        confidence = Math.max(confidence, 0.7);
      }

      const isScam = detectedPatterns.length > 0 && confidence >= 0.6;
      
      const reasoning = isScam 
        ? `Detected ${detectedPatterns.length} scam patterns with ${Math.round(confidence * 100)}% confidence`
        : 'No significant scam patterns detected';

      return {
        isScam,
        confidence,
        detectedPatterns,
        riskFactors,
        reasoning
      };

    } catch (error) {
      safeLogger.error('Scam detection error:', error);
      return {
        isScam: false,
        confidence: 0,
        detectedPatterns: [],
        riskFactors: ['detection_error'],
        reasoning: 'Error during scam pattern analysis'
      };
    }
  }

  private calculateOverallRiskScore(results: {
    aiModeration: any;
    nftVerification?: NFTVerificationResult;
    sellerVerification: SellerVerificationResult;
    counterfeit: CounterfeitDetectionResult;
    scam: ScamDetectionResult;
  }): number {
    let riskScore = 0;
    
    // AI moderation risk (30% weight)
    riskScore += results.aiModeration.riskScore * 0.3;
    
    // Seller verification risk (25% weight)
    const sellerRisk = results.sellerVerification.riskLevel === 'critical' ? 1.0 :
                      results.sellerVerification.riskLevel === 'high' ? 0.8 :
                      results.sellerVerification.riskLevel === 'medium' ? 0.5 : 0.2;
    riskScore += sellerRisk * 0.25;
    
    // Counterfeit risk (25% weight)
    riskScore += (results.counterfeit.isCounterfeit ? results.counterfeit.confidence : 0) * 0.25;
    
    // Scam risk (20% weight)
    riskScore += (results.scam.isScam ? results.scam.confidence : 0) * 0.2;
    
    // NFT verification risk (bonus/penalty)
    if (results.nftVerification) {
      if (results.nftVerification.status === 'flagged') {
        riskScore += 0.3;
      } else if (results.nftVerification.status === 'verified') {
        riskScore *= 0.8; // Reduce risk for verified NFTs
      }
    }
    
    return Math.min(1.0, riskScore);
  }

  private determineOverallDecision(params: {
    aiModeration: any;
    nftVerification?: NFTVerificationResult;
    sellerVerification: SellerVerificationResult;
    counterfeit: CounterfeitDetectionResult;
    scam: ScamDetectionResult;
    riskScore: number;
  }): 'allow' | 'review' | 'block' {
    const { aiModeration, nftVerification, sellerVerification, counterfeit, scam, riskScore } = params;
    
    // Immediate block conditions
    if (scam.isScam && scam.confidence >= 0.8) return 'block';
    if (counterfeit.isCounterfeit && counterfeit.confidence >= 0.8) return 'block';
    if (aiModeration.action === 'block') return 'block';
    if (nftVerification?.status === 'flagged') return 'block';
    
    // Review conditions
    if (riskScore >= 0.7) return 'review';
    if (sellerVerification.riskLevel === 'critical') return 'review';
    if (sellerVerification.tier === 'new' && parseFloat('1000') > 100) return 'review'; // High-value from new seller
    if (scam.isScam || counterfeit.isCounterfeit) return 'review';
    if (aiModeration.action === 'review') return 'review';
    
    // Allow with conditions
    return 'allow';
  }

  private generateRequiredActions(params: {
    decision: 'allow' | 'review' | 'block';
    nftVerification?: NFTVerificationResult;
    sellerVerification: SellerVerificationResult;
    counterfeit: CounterfeitDetectionResult;
    scam: ScamDetectionResult;
  }): string[] {
    const actions: string[] = [];
    const { decision, nftVerification, sellerVerification, counterfeit, scam } = params;
    
    if (decision === 'block') {
      actions.push('listing_blocked');
      if (scam.isScam) actions.push('scam_investigation');
      if (counterfeit.isCounterfeit) actions.push('counterfeit_investigation');
    }
    
    if (decision === 'review') {
      actions.push('human_review_required');
    }
    
    // Seller-specific actions
    if (sellerVerification.verificationRequirements.length > 0) {
      actions.push(...sellerVerification.verificationRequirements);
    }
    
    // NFT-specific actions
    if (nftVerification && !nftVerification.ownershipVerified) {
      actions.push('ownership_verification_required');
    }
    
    if (counterfeit.matchedBrands.length > 0) {
      actions.push('brand_verification_required');
    }
    
    return actions;
  }

  private async storeMarketplaceEvidence(evidence: any): Promise<string> {
    try {
      const bundle = await this.evidenceStorage.storeEvidenceBundle({
        caseId: 0, // Will be updated when case is created
        contentId: evidence.listingId,
        contentType: 'listing',
        contentHash: this.generateContentHash(evidence),
        modelOutputs: evidence.aiModeration?.vendorResults || {},
        decisionRationale: `Marketplace moderation decision: ${evidence.aiModeration?.action || 'unknown'}`,
        policyVersion: '1.0',
        originalContent: {
          metadata: evidence
        }
      });
      return bundle.ipfsHash;
    } catch (error) {
      safeLogger.error('Evidence storage error:', error);
      return '';
    }
  }

  private generateContentHash(content: any): string {
    // Simple hash generation for content identification
    return Buffer.from(JSON.stringify(content)).toString('base64').slice(0, 32);
  }

  private async logModerationDecision(result: MarketplaceModerationResult): Promise<void> {
    try {
      // Log moderation decision for analytics
      safeLogger.info('Marketplace moderation decision:', {
        listingId: result.listingId,
        decision: result.overallDecision,
        confidence: result.confidence,
        riskScore: result.riskScore,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Moderation logging error:', error);
    }
  }

  // Helper methods (simplified implementations)
  private async verifyNFTContract(contractAddress: string): Promise<boolean> {
    // In production, this would check against verified contract registries
    // For now, return true for known contract patterns
    return /^0x[a-fA-F0-9]{40}$/.test(contractAddress);
  }

  private async verifyOwnershipSignature(
    sellerAddress: string,
    contractAddress: string,
    tokenId: string
  ): Promise<boolean> {
    // In production, this would verify cryptographic signatures
    // For now, return true (would integrate with Web3 libraries)
    return true;
  }

  private async verifyNFTMetadata(
    contractAddress: string,
    tokenId: string,
    providedImages: string[]
  ): Promise<boolean> {
    // In production, this would fetch on-chain metadata and compare
    // For now, return true if images are provided
    return providedImages.length > 0;
  }

  private async getSellerTransactionCount(sellerAddress: string): Promise<number> {
    // In production, this would query blockchain and database
    // For now, return a mock value based on address
    return Math.floor(Math.random() * 100);
  }

  private async analyzeImagesForBrands(
    images: string[],
    brands: string[]
  ): Promise<{ logoDetected: boolean; brandMatches: string[]; qualityScore: number }> {
    // In production, this would use computer vision APIs
    // For now, return mock analysis
    return {
      logoDetected: brands.length > 0,
      brandMatches: brands.slice(0, 2),
      qualityScore: Math.random()
    };
  }
}