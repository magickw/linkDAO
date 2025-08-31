import { eq, and, gte, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, userReputationScores, sellerVerifications } from '../db/schema.js';
import { ethers } from 'ethers';
import crypto from 'crypto';

export interface VerificationResult {
  verified: boolean;
  tier: 'basic' | 'verified' | 'premium' | 'enterprise';
  score: number;
  requirements: string[];
  warnings: string[];
}

export interface ProofOfOwnership {
  signature: string;
  message: string;
  walletAddress: string;
  tokenId: string;
  contractAddress: string;
  timestamp: number;
}

export interface HighValueThresholds {
  usd: number;
  eth: number;
  reputation: number;
}

export class MarketplaceVerificationService {
  private readonly HIGH_VALUE_THRESHOLDS: HighValueThresholds = {
    usd: 10000, // $10k USD
    eth: 5, // 5 ETH
    reputation: 750 // Reputation score threshold
  };

  private readonly BRAND_KEYWORDS = [
    'nike', 'adidas', 'supreme', 'gucci', 'louis vuitton', 'rolex',
    'apple', 'samsung', 'sony', 'nintendo', 'pokemon', 'disney',
    'marvel', 'dc comics', 'star wars', 'coca cola', 'pepsi',
    'bored ape', 'cryptopunks', 'azuki', 'moonbirds', 'doodles'
  ];

  private readonly SCAM_PATTERNS = [
    /free\s+(nft|mint|airdrop)/i,
    /limited\s+time\s+offer/i,
    /click\s+here\s+to\s+claim/i,
    /exclusive\s+whitelist/i,
    /guaranteed\s+profit/i,
    /investment\s+opportunity/i,
    /double\s+your\s+(eth|crypto)/i,
    /send\s+\d+\s+eth\s+get\s+\d+/i,
    /official\s+giveaway/i,
    /verify\s+your\s+wallet/i
  ];

  /**
   * Enhanced verification for high-value NFT listings
   */
  async verifyHighValueListing(
    listingId: string,
    sellerAddress: string,
    priceUSD: number,
    priceETH: number
  ): Promise<VerificationResult> {
    const isHighValue = this.isHighValueListing(priceUSD, priceETH);
    
    if (!isHighValue) {
      return {
        verified: true,
        tier: 'basic',
        score: 100,
        requirements: [],
        warnings: []
      };
    }

    const [sellerReputation, kycStatus, ownershipProof] = await Promise.all([
      this.getSellerReputation(sellerAddress),
      this.checkKYCStatus(sellerAddress),
      this.validateOwnershipProof(listingId)
    ]);

    return this.calculateVerificationTier({
      reputation: sellerReputation,
      kycVerified: kycStatus,
      ownershipVerified: ownershipProof,
      priceUSD,
      priceETH
    });
  }

  /**
   * Detect counterfeit listings using brand keyword analysis
   */
  async detectCounterfeit(
    title: string,
    description: string,
    metadata: any
  ): Promise<{ isCounterfeit: boolean; confidence: number; brandMatches: string[] }> {
    const text = `${title} ${description} ${JSON.stringify(metadata)}`.toLowerCase();
    const brandMatches: string[] = [];
    
    // Check for brand keyword matches
    for (const brand of this.BRAND_KEYWORDS) {
      if (text.includes(brand.toLowerCase())) {
        brandMatches.push(brand);
      }
    }

    if (brandMatches.length === 0) {
      return { isCounterfeit: false, confidence: 0, brandMatches: [] };
    }

    // Calculate confidence based on suspicious patterns
    let suspiciousScore = 0;
    
    // Check for unofficial/fake indicators
    const fakeIndicators = [
      /unofficial/i,
      /inspired\s+by/i,
      /style\s+of/i,
      /similar\s+to/i,
      /replica/i,
      /copy/i,
      /fake/i,
      /bootleg/i
    ];

    for (const pattern of fakeIndicators) {
      if (pattern.test(text)) {
        suspiciousScore += 20;
      }
    }

    // Check for missing official verification
    const hasOfficialMarkers = /official|verified|authentic|licensed/.test(text);
    if (!hasOfficialMarkers && brandMatches.length > 0) {
      suspiciousScore += 30;
    }

    // Check for price anomalies (too cheap for branded items)
    const hasPriceAnomaly = /\$?\d+/.test(text) && 
      text.match(/\$?(\d+)/)?.[1] && 
      parseInt(text.match(/\$?(\d+)/)?.[1] || '0') < 100;
    
    if (hasPriceAnomaly && brandMatches.length > 0) {
      suspiciousScore += 25;
    }

    const confidence = Math.min(suspiciousScore, 95);
    const isCounterfeit = confidence >= 60;

    return { isCounterfeit, confidence, brandMatches };
  }

  /**
   * Verify proof of ownership signature
   */
  async verifyProofOfOwnership(proof: ProofOfOwnership): Promise<boolean> {
    try {
      // Reconstruct the message that should have been signed
      const message = this.constructOwnershipMessage(
        proof.tokenId,
        proof.contractAddress,
        proof.timestamp
      );

      if (message !== proof.message) {
        return false;
      }

      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(message, proof.signature);
      
      // Check if recovered address matches the claimed wallet
      if (recoveredAddress.toLowerCase() !== proof.walletAddress.toLowerCase()) {
        return false;
      }

      // Verify timestamp is recent (within 1 hour)
      const now = Date.now();
      const timeDiff = now - proof.timestamp;
      if (timeDiff > 3600000) { // 1 hour in milliseconds
        return false;
      }

      // TODO: Verify on-chain ownership of the NFT
      // This would require calling the NFT contract to check current owner
      
      return true;
    } catch (error) {
      console.error('Error verifying proof of ownership:', error);
      return false;
    }
  }

  /**
   * Determine seller verification tier based on reputation and KYC
   */
  async getSellerVerificationTier(sellerAddress: string): Promise<VerificationResult> {
    const [reputation, kycStatus, transactionHistory] = await Promise.all([
      this.getSellerReputation(sellerAddress),
      this.checkKYCStatus(sellerAddress),
      this.getTransactionHistory(sellerAddress)
    ]);

    const requirements: string[] = [];
    const warnings: string[] = [];
    let tier: 'basic' | 'verified' | 'premium' | 'enterprise' = 'basic';
    let score = 0;

    // Base score from reputation
    score += Math.min(reputation / 10, 50);

    // KYC verification bonus
    if (kycStatus) {
      score += 25;
    } else {
      requirements.push('Complete KYC verification');
    }

    // Transaction history bonus
    if (transactionHistory.successfulSales > 10) {
      score += 15;
    } else if (transactionHistory.successfulSales < 3) {
      warnings.push('Limited transaction history');
    }

    // Dispute rate penalty
    if (transactionHistory.disputeRate > 0.1) {
      score -= 20;
      warnings.push('High dispute rate detected');
    }

    // Determine tier based on score
    if (score >= 85 && kycStatus) {
      tier = 'enterprise';
    } else if (score >= 70 && kycStatus) {
      tier = 'premium';
    } else if (score >= 50) {
      tier = 'verified';
    }

    return {
      verified: score >= 50,
      tier,
      score: Math.max(0, Math.min(100, score)),
      requirements,
      warnings
    };
  }

  /**
   * Detect scam patterns in marketplace listings
   */
  detectScamPatterns(
    title: string,
    description: string,
    priceETH: number,
    sellerReputation: number
  ): { isScam: boolean; confidence: number; patterns: string[] } {
    const text = `${title} ${description}`.toLowerCase();
    const detectedPatterns: string[] = [];
    let scamScore = 0;

    // Check for known scam patterns
    for (const pattern of this.SCAM_PATTERNS) {
      if (pattern.test(text)) {
        detectedPatterns.push(pattern.source);
        scamScore += 25;
      }
    }

    // Check for price manipulation indicators
    if (priceETH > 0 && priceETH < 0.001) {
      scamScore += 15;
      detectedPatterns.push('Suspiciously low price');
    }

    // Check for new seller with high-value items
    if (sellerReputation < 100 && priceETH > 10) {
      scamScore += 20;
      detectedPatterns.push('New seller with high-value listing');
    }

    // Check for urgency indicators
    const urgencyPatterns = [
      /act\s+fast/i,
      /hurry/i,
      /expires\s+soon/i,
      /last\s+chance/i,
      /only\s+\d+\s+left/i
    ];

    for (const pattern of urgencyPatterns) {
      if (pattern.test(text)) {
        scamScore += 10;
        detectedPatterns.push('Urgency manipulation');
        break;
      }
    }

    // Check for external link redirects
    if (/bit\.ly|tinyurl|t\.co|shortened\.link/.test(text)) {
      scamScore += 30;
      detectedPatterns.push('Suspicious shortened links');
    }

    const confidence = Math.min(scamScore, 95);
    const isScam = confidence >= 70;

    return { isScam, confidence, patterns: detectedPatterns };
  }

  // Private helper methods

  private isHighValueListing(priceUSD: number, priceETH: number): boolean {
    return priceUSD >= this.HIGH_VALUE_THRESHOLDS.usd || 
           priceETH >= this.HIGH_VALUE_THRESHOLDS.eth;
  }

  private async getSellerReputation(walletAddress: string): Promise<number> {
    try {
      // First get the user ID from wallet address
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);
      
      if (!user[0]) return 0;
      
      // Then get the reputation score
      const reputation = await db
        .select({ score: userReputationScores.overallScore })
        .from(userReputationScores)
        .where(eq(userReputationScores.userId, user[0].id))
        .limit(1);

      return Number(reputation[0]?.score) || 0;
    } catch (error) {
      console.error('Error fetching seller reputation:', error);
      return 0;
    }
  }

  private async checkKYCStatus(walletAddress: string): Promise<boolean> {
    try {
      // Check KYC status from seller_verifications table
      const verification = await db
        .select({ kycVerified: sellerVerifications.kycVerified })
        .from(sellerVerifications)
        .where(eq(sellerVerifications.walletAddress, walletAddress))
        .limit(1);

      return verification[0]?.kycVerified || false;
    } catch (error) {
      console.error('Error checking KYC status:', error);
      return false;
    }
  }

  private async validateOwnershipProof(listingId: string): Promise<boolean> {
    // This would check if a valid proof of ownership exists for the listing
    // For now, return true as a placeholder
    return true;
  }

  private async getTransactionHistory(walletAddress: string): Promise<{
    successfulSales: number;
    disputeRate: number;
    totalVolume: number;
  }> {
    // This would query the transaction history from the database
    // For now, return default values
    return {
      successfulSales: 0,
      disputeRate: 0,
      totalVolume: 0
    };
  }

  private calculateVerificationTier(params: {
    reputation: number;
    kycVerified: boolean;
    ownershipVerified: boolean;
    priceUSD: number;
    priceETH: number;
  }): VerificationResult {
    const { reputation, kycVerified, ownershipVerified, priceUSD, priceETH } = params;
    
    let score = 0;
    const requirements: string[] = [];
    const warnings: string[] = [];

    // Base reputation score
    score += Math.min(reputation / 10, 40);

    // KYC requirement for high-value items
    if (kycVerified) {
      score += 30;
    } else {
      requirements.push('KYC verification required for high-value listings');
      score -= 20;
    }

    // Ownership proof requirement
    if (ownershipVerified) {
      score += 30;
    } else {
      requirements.push('Proof of ownership signature required');
      score -= 30;
    }

    // Determine tier
    let tier: 'basic' | 'verified' | 'premium' | 'enterprise' = 'basic';
    
    if (score >= 85 && kycVerified && ownershipVerified) {
      tier = 'enterprise';
    } else if (score >= 70 && kycVerified) {
      tier = 'premium';
    } else if (score >= 50) {
      tier = 'verified';
    }

    return {
      verified: score >= 50 && requirements.length === 0,
      tier,
      score: Math.max(0, Math.min(100, score)),
      requirements,
      warnings
    };
  }

  private constructOwnershipMessage(
    tokenId: string,
    contractAddress: string,
    timestamp: number
  ): string {
    return `I own NFT ${tokenId} from contract ${contractAddress} at ${timestamp}`;
  }
}

export const marketplaceVerificationService = new MarketplaceVerificationService();