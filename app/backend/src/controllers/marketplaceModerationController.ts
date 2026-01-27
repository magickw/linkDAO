import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { MarketplaceModerationService, MarketplaceListingInput } from '../services/marketplace/marketplaceModerationService';
import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { z } from 'zod';

// Request validation schemas
const ModerateListingSchema = z.object({
  listingId: z.string().min(1),
  listingData: z.object({
    title: z.string().min(1).max(500),
    description: z.string().min(1).max(5000),
    price: z.string().min(1),
    currency: z.string().min(1).max(10),
    category: z.string().min(1).max(100),
    images: z.array(z.string().url()).min(1),
    nftContract: z.string().optional(),
    tokenId: z.string().optional(),
    brandKeywords: z.array(z.string()).optional(),
    isHighValue: z.boolean().default(false),
    sellerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
  }),
  userId: z.string().uuid(),
  userReputation: z.number().min(0).max(100).default(50),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  metadata: z.record(z.any()).default({})
});

const VerifyNFTOwnershipSchema = z.object({
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenId: z.string().min(1),
  sellerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().optional()
});

const CheckCounterfeitSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  images: z.array(z.string().url()).optional(),
  brandKeywords: z.array(z.string()).optional()
});

const DetectScamSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  currency: z.string().min(1),
  sellerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

export class MarketplaceModerationController {
  private moderationService: MarketplaceModerationService;

  constructor() {
    this.moderationService = new MarketplaceModerationService();
  }

  /**
   * Moderate a complete marketplace listing
   */
  async moderateListing(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = ModerateListingSchema.parse(req.body);
      
      const input: MarketplaceListingInput = {
        id: validatedData.listingId,
        type: 'listing',
        userId: validatedData.userId,
        userReputation: validatedData.userReputation,
        walletAddress: validatedData.walletAddress,
        metadata: validatedData.metadata,
        listingData: {
          title: validatedData.listingData.title || '',
          description: validatedData.listingData.description || '',
          price: validatedData.listingData.price || '0',
          currency: validatedData.listingData.currency || 'USD',
          category: validatedData.listingData.category || 'general',
          images: validatedData.listingData.images || [],
          nftContract: validatedData.listingData.nftContract,
          tokenId: validatedData.listingData.tokenId,
          brandKeywords: validatedData.listingData.brandKeywords,
          isHighValue: validatedData.listingData.isHighValue || false,
          sellerAddress: validatedData.listingData.sellerAddress || '0x0000000000000000000000000000000000000000'
        },
        text: `${validatedData.listingData.title || ''} ${validatedData.listingData.description || ''}`,
        media: (validatedData.listingData.images || []).map(url => ({
          url,
          type: 'image' as const,
          mimeType: 'image/jpeg',
          size: 0
        }))
      };

      const result = await this.moderationService.moderateMarketplaceListing(input);
      
      return res.status(200).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Moderation failed: ${error.message}`);
    }
  }

  /**
   * Verify NFT ownership for high-value listings
   */
  async verifyNFTOwnership(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = VerifyNFTOwnershipSchema.parse(req.body);
      
      // Create a minimal input for NFT verification
      const input: MarketplaceListingInput = {
        id: `nft_${validatedData.contractAddress}_${validatedData.tokenId}`,
        type: 'listing',
        userId: 'system',
        userReputation: 50,
        walletAddress: validatedData.sellerAddress,
        metadata: {},
        listingData: {
          title: 'NFT Verification',
          description: 'NFT ownership verification',
          price: '1000', // Mark as high value for verification
          currency: 'ETH',
          category: 'nft',
          images: [],
          nftContract: validatedData.contractAddress,
          tokenId: validatedData.tokenId,
          isHighValue: true,
          sellerAddress: validatedData.sellerAddress
        }
      };

      const result = await this.moderationService.moderateMarketplaceListing(input);
      
      return res.status(200).json({
        success: true,
        data: {
          nftVerification: result.nftVerification,
          verified: result.nftVerification?.status === 'verified',
          riskFactors: result.nftVerification?.riskFactors || []
        }
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`NFT verification failed: ${error.message}`);
    }
  }

  /**
   * Check for counterfeit products
   */
  async checkCounterfeit(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = CheckCounterfeitSchema.parse(req.body);
      
      const input: MarketplaceListingInput = {
        id: `counterfeit_check_${Date.now()}`,
        type: 'listing',
        userId: 'system',
        userReputation: 50,
        walletAddress: '0x0000000000000000000000000000000000000000',
        metadata: {},
        listingData: {
          title: validatedData.title,
          description: validatedData.description,
          price: '100',
          currency: 'USD',
          category: 'general',
          images: validatedData.images || [],
          brandKeywords: validatedData.brandKeywords,
          isHighValue: false,
          sellerAddress: '0x0000000000000000000000000000000000000000'
        },
        text: `${validatedData.title} ${validatedData.description}`,
        media: (validatedData.images || []).map(url => ({
          url,
          type: 'image' as const,
          mimeType: 'image/jpeg',
          size: 0
        }))
      };

      const result = await this.moderationService.moderateMarketplaceListing(input);
      
      return res.status(200).json({
        success: true,
        data: {
          counterfeitDetection: result.counterfeitDetection,
          isCounterfeit: result.counterfeitDetection.isCounterfeit,
          confidence: result.counterfeitDetection.confidence,
          matchedBrands: result.counterfeitDetection.matchedBrands,
          suspiciousKeywords: result.counterfeitDetection.suspiciousKeywords
        }
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Counterfeit detection failed: ${error.message}`);
    }
  }

  /**
   * Detect scam patterns in listings
   */
  async detectScam(req: Request, res: Response): Promise<Response> {
    try {
      const validatedData = DetectScamSchema.parse(req.body);
      
      const input: MarketplaceListingInput = {
        id: `scam_check_${Date.now()}`,
        type: 'listing',
        userId: 'system',
        userReputation: 50,
        walletAddress: validatedData.sellerAddress,
        metadata: {},
        listingData: {
          title: validatedData.title,
          description: validatedData.description,
          price: validatedData.price,
          currency: validatedData.currency,
          category: 'general',
          images: [],
          isHighValue: false,
          sellerAddress: validatedData.sellerAddress
        },
        text: `${validatedData.title} ${validatedData.description}`
      };

      const result = await this.moderationService.moderateMarketplaceListing(input);
      
      return res.status(200).json({
        success: true,
        data: {
          scamDetection: result.scamDetection,
          isScam: result.scamDetection.isScam,
          confidence: result.scamDetection.confidence,
          detectedPatterns: result.scamDetection.detectedPatterns,
          riskFactors: result.scamDetection.riskFactors,
          reasoning: result.scamDetection.reasoning
        }
      });

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Scam detection failed: ${error.message}`);
    }
  }

  /**
   * Get seller verification status and tier
   */
  async getSellerVerification(req: Request, res: Response): Promise<Response> {
    try {
      const { sellerAddress } = req.params;
      
      if (!sellerAddress || !/^0x[a-fA-F0-9]{40}$/.test(sellerAddress)) {
        throw new ValidationError('Invalid seller address format');
      }

      // Create minimal input for seller verification
      const input: MarketplaceListingInput = {
        id: `seller_check_${sellerAddress}`,
        type: 'listing',
        userId: 'system',
        userReputation: 50,
        walletAddress: sellerAddress,
        metadata: {},
        listingData: {
          title: 'Seller Verification',
          description: 'Seller verification check',
          price: '100',
          currency: 'USD',
          category: 'general',
          images: [],
          isHighValue: false,
          sellerAddress
        }
      };

      const result = await this.moderationService.moderateMarketplaceListing(input);
      
      return res.status(200).json({
        success: true,
        data: {
          sellerVerification: result.sellerVerification,
          tier: result.sellerVerification.tier,
          riskLevel: result.sellerVerification.riskLevel,
          reputationScore: result.sellerVerification.reputationScore,
          verificationRequirements: result.sellerVerification.verificationRequirements
        }
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Seller verification failed: ${error.message}`);
    }
  }

  /**
   * Get moderation status for a listing
   */
  async getModerationStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      
      if (!listingId) {
        throw new ValidationError('Listing ID is required');
      }

      // In production, this would fetch from database
      // For now, return a mock status
      const status = {
        listingId,
        status: 'pending',
        lastChecked: new Date().toISOString(),
        decision: null,
        confidence: 0,
        riskScore: 0,
        requiredActions: []
      };

      return res.status(200).json({
        success: true,
        data: status
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get moderation status: ${error.message}`);
    }
  }

  /**
   * Bulk moderate multiple listings
   */
  async bulkModerate(req: Request, res: Response): Promise<Response> {
    try {
      const { listings } = req.body;
      
      if (!Array.isArray(listings) || listings.length === 0) {
        throw new ValidationError('Listings array is required and must not be empty');
      }

      if (listings.length > 50) {
        throw new ValidationError('Maximum 50 listings can be processed at once');
      }

      const results = [];
      
      // Process listings in parallel with concurrency limit
      const concurrency = 5;
      for (let i = 0; i < listings.length; i += concurrency) {
        const batch = listings.slice(i, i + concurrency);
        
        const batchPromises = batch.map(async (listingData: any) => {
          try {
            const validatedData = ModerateListingSchema.parse(listingData);
            
            const input: MarketplaceListingInput = {
              id: validatedData.listingId,
              type: 'listing',
              userId: validatedData.userId,
              userReputation: validatedData.userReputation,
              walletAddress: validatedData.walletAddress,
              metadata: validatedData.metadata,
              listingData: {
                title: validatedData.listingData.title || '',
                description: validatedData.listingData.description || '',
                price: validatedData.listingData.price || '0',
                currency: validatedData.listingData.currency || 'USD',
                category: validatedData.listingData.category || 'general',
                images: validatedData.listingData.images || [],
                nftContract: validatedData.listingData.nftContract,
                tokenId: validatedData.listingData.tokenId,
                brandKeywords: validatedData.listingData.brandKeywords,
                isHighValue: validatedData.listingData.isHighValue || false,
                sellerAddress: validatedData.listingData.sellerAddress || '0x0000000000000000000000000000000000000000'
              },
              text: `${validatedData.listingData.title || ''} ${validatedData.listingData.description || ''}`,
              media: validatedData.listingData.images.map(url => ({
                url,
                type: 'image' as const,
                mimeType: 'image/jpeg',
                size: 0
              }))
            };

            const result = await this.moderationService.moderateMarketplaceListing(input);
            return { success: true, listingId: validatedData.listingId, data: result };
            
          } catch (error: any) {
            return { 
              success: false, 
              listingId: listingData.listingId || 'unknown',
              error: error.message 
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return res.status(200).json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount
          }
        }
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Bulk moderation failed: ${error.message}`);
    }
  }

  /**
   * Get marketplace moderation statistics
   */
  async getModerationStats(req: Request, res: Response): Promise<Response> {
    try {
      // In production, this would query the database for real statistics
      const stats = {
        totalListingsModerated: 1250,
        blockedListings: 45,
        reviewedListings: 180,
        allowedListings: 1025,
        nftVerifications: 320,
        counterfeitDetections: 28,
        scamDetections: 17,
        averageProcessingTime: 2.3,
        topRiskFactors: [
          { factor: 'new_seller', count: 156 },
          { factor: 'suspicious_pricing', count: 89 },
          { factor: 'brand_keywords', count: 67 },
          { factor: 'high_value_nft', count: 45 }
        ],
        dailyStats: {
          today: { moderated: 45, blocked: 2, reviewed: 8 },
          yesterday: { moderated: 52, blocked: 3, reviewed: 12 },
          thisWeek: { moderated: 312, blocked: 15, reviewed: 67 }
        }
      };

      return res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      throw new AppError(`Failed to get moderation statistics: ${error.message}`);
    }
  }
}
