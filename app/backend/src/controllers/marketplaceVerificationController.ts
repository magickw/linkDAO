import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { MarketplaceVerificationService } from '../services/marketplaceVerificationService';
import { MarketplaceModerationService } from '../services/marketplaceModerationService';
import { z } from 'zod';

// Define the ProofOfOwnership interface
interface ProofOfOwnership {
  signature: string;
  message: string;
  walletAddress: string;
  tokenId: string;
  contractAddress: string;
  timestamp: number;
}

// Create instances of the services
const marketplaceVerificationService = new MarketplaceVerificationService();
const marketplaceModerationService = new MarketplaceModerationService();

const VerifyListingSchema = z.object({
  listingId: z.string(),
  sellerAddress: z.string(),
  priceUSD: z.number().min(0),
  priceETH: z.number().min(0)
});

const CounterfeitDetectionSchema = z.object({
  title: z.string(),
  description: z.string(),
  metadata: z.any().optional()
});

const ProofOfOwnershipSchema = z.object({
  signature: z.string(),
  message: z.string(),
  walletAddress: z.string(),
  tokenId: z.string(),
  contractAddress: z.string(),
  timestamp: z.number()
});

const ScamDetectionSchema = z.object({
  title: z.string(),
  description: z.string(),
  priceETH: z.number().min(0),
  sellerReputation: z.number().min(0)
});

export class MarketplaceVerificationController {
  /**
   * Verify high-value NFT listing
   */
  async verifyHighValueListing(req: Request, res: Response) {
    try {
      const validation = VerifyListingSchema.safeParse(req.body);
      if (!('data' in validation)) {
        const errorDetails = validation.error.issues.map(issue => ({
          message: issue.message,
          path: issue.path.join('.')
        }));
        return res.status(400).json({
          error: 'Invalid request data',
          details: errorDetails
        });
      }

      const { listingId, sellerAddress, priceUSD, priceETH } = validation.data;

      const result = await marketplaceVerificationService.verifyHighValueListing(
        listingId,
        sellerAddress,
        priceUSD,
        priceETH
      );

      res.json({
        success: true,
        verification: result
      });
    } catch (error) {
      safeLogger.error('Error verifying high-value listing:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify listing'
      });
    }
  }

  /**
   * Detect counterfeit listings
   */
  async detectCounterfeit(req: Request, res: Response) {
    try {
      const validation = CounterfeitDetectionSchema.safeParse(req.body);
      if (!('data' in validation)) {
        const errorDetails = validation.error.issues.map(issue => ({
          message: issue.message,
          path: issue.path.join('.')
        }));
        return res.status(400).json({
          error: 'Invalid request data',
          details: errorDetails
        });
      }

      const { title, description, metadata } = validation.data;

      // Create a mock input for the moderation service
      const mockInput = {
        id: 'counterfeit-check',
        type: 'listing' as const,
        userId: 'system',
        userReputation: 50,
        walletAddress: '0x0000000000000000000000000000000000000000',
        metadata: metadata || {},
        listingData: {
          title: title || '',
          description: description || '',
          price: '0',
          currency: 'USD',
          category: 'general',
          images: [],
          isHighValue: false,
          sellerAddress: '0x0000000000000000000000000000000000000000'
        },
        text: `${title} ${description}`
      };

      const result = await marketplaceModerationService.moderateMarketplaceListing(mockInput);

      res.json({
        success: true,
        counterfeit: result.counterfeitDetection
      });
    } catch (error) {
      safeLogger.error('Error detecting counterfeit:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to detect counterfeit'
      });
    }
  }

  /**
   * Verify proof of ownership signature
   */
  async verifyProofOfOwnership(req: Request, res: Response) {
    try {
      const validation = ProofOfOwnershipSchema.safeParse(req.body);
      if (!('data' in validation)) {
        const errorDetails = validation.error.issues.map(issue => ({
          message: issue.message,
          path: issue.path.join('.')
        }));
        return res.status(400).json({
          error: 'Invalid request data',
          details: errorDetails
        });
      }
      
      const proof: ProofOfOwnership = {
        signature: validation.data.signature,
        message: validation.data.message,
        walletAddress: validation.data.walletAddress,
        tokenId: validation.data.tokenId,
        contractAddress: validation.data.contractAddress,
        timestamp: validation.data.timestamp
      };

      const isValid = await marketplaceVerificationService.verifyProofOfOwnership(proof);

      res.json({
        success: true,
        verified: isValid,
        proof: {
          walletAddress: proof.walletAddress,
          tokenId: proof.tokenId,
          contractAddress: proof.contractAddress,
          timestamp: proof.timestamp
        }
      });
    } catch (error) {
      safeLogger.error('Error verifying proof of ownership:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify proof of ownership'
      });
    }
  }

  /**
   * Get seller verification tier
   */
  async getSellerVerificationTier(req: Request, res: Response) {
    try {
      const { sellerAddress } = req.params;

      if (!sellerAddress) {
        return res.status(400).json({
          error: 'Seller address is required'
        });
      }

      const result = await marketplaceVerificationService.getSellerVerificationTier(sellerAddress);

      res.json({
        success: true,
        verification: result
      });
    } catch (error) {
      safeLogger.error('Error getting seller verification tier:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get seller verification tier'
      });
    }
  }

  /**
   * Detect scam patterns in listings
   */
  async detectScamPatterns(req: Request, res: Response) {
    try {
      const validation = ScamDetectionSchema.safeParse(req.body);
      if (!('data' in validation)) {
        const errorDetails = validation.error.issues.map(issue => ({
          message: issue.message,
          path: issue.path.join('.')
        }));
        return res.status(400).json({
          error: 'Invalid request data',
          details: errorDetails
        });
      }

      const { title, description, priceETH, sellerReputation } = validation.data;

      // Create a mock input for the moderation service
      const mockInput = {
        id: 'scam-check',
        type: 'listing' as const,
        userId: 'system',
        userReputation: sellerReputation || 50,
        walletAddress: '0x0000000000000000000000000000000000000000',
        metadata: {},
        listingData: {
          title: title || '',
          description: description || '',
          price: priceETH.toString() || '0',
          currency: 'ETH',
          category: 'general',
          images: [],
          isHighValue: priceETH > 1,
          sellerAddress: '0x0000000000000000000000000000000000000000'
        },
        text: `${title} ${description}`
      };

      const result = await marketplaceModerationService.moderateMarketplaceListing(mockInput);

      res.json({
        success: true,
        scam: result.scamDetection
      });
    } catch (error) {
      safeLogger.error('Error detecting scam patterns:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to detect scam patterns'
      });
    }
  }

  /**
   * Comprehensive marketplace listing verification
   */
  async verifyMarketplaceListing(req: Request, res: Response) {
    try {
      const {
        listingId,
        sellerAddress,
        title,
        description,
        priceUSD,
        priceETH,
        metadata,
        proofOfOwnership
      } = req.body;

      // Validate required fields
      if (!listingId || !sellerAddress || !title || !description) {
        return res.status(400).json({
          error: 'Missing required fields: listingId, sellerAddress, title, description'
        });
      }

      // Create mock inputs for the moderation service
      const counterfeitInput = {
        id: `counterfeit-check-${listingId}`,
        type: 'listing' as const,
        userId: 'system',
        userReputation: 50,
        walletAddress: '0x0000000000000000000000000000000000000000',
        metadata: metadata || {},
        listingData: {
          title: title || '',
          description: description || '',
          price: '0',
          currency: 'USD',
          category: 'general',
          images: [],
          isHighValue: false,
          sellerAddress: '0x0000000000000000000000000000000000000000'
        },
        text: `${title} ${description}`
      };

      const scamInput = {
        id: `scam-check-${listingId}`,
        type: 'listing' as const,
        userId: 'system',
        userReputation: 50,
        walletAddress: '0x0000000000000000000000000000000000000000',
        metadata: {},
        listingData: {
          title: title || '',
          description: description || '',
          price: priceETH?.toString() || '0',
          currency: 'ETH',
          category: 'general',
          images: [],
          isHighValue: (priceETH || 0) > 1,
          sellerAddress: '0x0000000000000000000000000000000000000000'
        },
        text: `${title} ${description}`
      };

      // Run all verification checks in parallel
      const [
        highValueVerification,
        counterfeitResult,
        sellerVerification,
        scamResult,
        ownershipVerification
      ] = await Promise.all([
        marketplaceVerificationService.verifyHighValueListing(
          listingId,
          sellerAddress,
          priceUSD || 0,
          priceETH || 0
        ),
        marketplaceModerationService.moderateMarketplaceListing(counterfeitInput),
        marketplaceVerificationService.getSellerVerificationTier(sellerAddress),
        marketplaceModerationService.moderateMarketplaceListing(scamInput),
        proofOfOwnership ? 
          marketplaceVerificationService.verifyProofOfOwnership(proofOfOwnership) : 
          Promise.resolve(false)
      ]);

      const counterfeitDetection = counterfeitResult.counterfeitDetection;
      const scamDetection = scamResult.scamDetection;

      // Calculate overall risk score
      let riskScore = 0;
      const issues: string[] = [];

      if (counterfeitDetection.isCounterfeit) {
        riskScore += counterfeitDetection.confidence * 100;
        issues.push(`Potential counterfeit (${Math.round(counterfeitDetection.confidence * 100)}% confidence)`);
      }

      if (scamDetection.isScam) {
        riskScore += scamDetection.confidence * 100;
        issues.push(`Scam patterns detected (${Math.round(scamDetection.confidence * 100)}% confidence)`);
      }

      if (sellerVerification.verificationStatus !== 'verified') {
        riskScore += 30;
        issues.push('Seller not verified');
      }

      if (!ownershipVerification && (priceUSD || 0) > 1000) {
        riskScore += 25;
        issues.push('No proof of ownership for high-value item');
      }

      // Determine final action
      let action: 'allow' | 'review' | 'block' = 'allow';
      if (riskScore >= 80) {
        action = 'block';
      } else if (riskScore >= 40) {
        action = 'review';
      }

      res.json({
        success: true,
        verification: {
          listingId,
          action,
          riskScore: Math.min(100, riskScore),
          issues,
          details: {
            highValue: highValueVerification,
            counterfeit: counterfeitDetection,
            seller: sellerVerification,
            scam: scamDetection,
            ownership: ownershipVerification
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error verifying marketplace listing:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify marketplace listing'
      });
    }
  }
}

export const marketplaceVerificationController = new MarketplaceVerificationController();
