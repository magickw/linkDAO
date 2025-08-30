import request from 'supertest';
import express from 'express';
import { MarketplaceModerationController } from '../controllers/marketplaceModerationController';
import { MarketplaceModerationService } from '../services/marketplaceModerationService';
import { errorHandler } from '../middleware/errorHandler';

// Mock the service
jest.mock('../services/marketplaceModerationService');

describe('MarketplaceModerationController', () => {
  let app: express.Application;
  let mockService: jest.Mocked<MarketplaceModerationService>;

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Setup controller
    const controller = new MarketplaceModerationController();
    
    // Setup routes
    app.post('/moderate', controller.moderateListing.bind(controller));
    app.post('/verify-nft', controller.verifyNFTOwnership.bind(controller));
    app.post('/check-counterfeit', controller.checkCounterfeit.bind(controller));
    app.post('/detect-scam', controller.detectScam.bind(controller));
    app.get('/seller/:sellerAddress', controller.getSellerVerification.bind(controller));
    app.get('/status/:listingId', controller.getModerationStatus.bind(controller));
    app.post('/bulk-moderate', controller.bulkModerate.bind(controller));
    app.get('/stats', controller.getModerationStats.bind(controller));
    
    // Add error handler
    app.use(errorHandler);
    
    // Get mock service instance
    mockService = MarketplaceModerationService.prototype as jest.Mocked<MarketplaceModerationService>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /moderate', () => {
    const validModerationRequest = {
      listingId: 'listing_123',
      listingData: {
        title: 'Test Product',
        description: 'Test product description',
        price: '100',
        currency: 'USD',
        category: 'electronics',
        images: ['https://example.com/image1.jpg'],
        isHighValue: false,
        sellerAddress: '0x1234567890123456789012345678901234567890'
      },
      userId: '550e8400-e29b-41d4-a716-446655440000',
      userReputation: 75,
      walletAddress: '0x1234567890123456789012345678901234567890',
      metadata: {}
    };

    const mockModerationResult = {
      listingId: 'listing_123',
      overallDecision: 'allow' as const,
      confidence: 0.8,
      sellerVerification: {
        tier: 'silver' as const,
        kycStatus: 'verified' as const,
        reputationScore: 75,
        transactionHistory: 25,
        riskLevel: 'medium' as const,
        verificationRequirements: []
      },
      counterfeitDetection: {
        isCounterfeit: false,
        confidence: 0.1,
        matchedBrands: [],
        suspiciousKeywords: []
      },
      scamDetection: {
        isScam: false,
        confidence: 0.1,
        detectedPatterns: [],
        riskFactors: [],
        reasoning: 'No scam patterns detected'
      },
      aiModeration: {
        overallConfidence: 0.2,
        primaryCategory: 'safe',
        action: 'allow'
      },
      evidenceCid: 'evidence_123',
      requiredActions: [],
      riskScore: 0.3
    };

    it('should successfully moderate a valid listing', async () => {
      mockService.moderateMarketplaceListing.mockResolvedValue(mockModerationResult);

      const response = await request(app)
        .post('/moderate')
        .send(validModerationRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockModerationResult);
      expect(mockService.moderateMarketplaceListing).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'listing_123',
          type: 'listing',
          listingData: validModerationRequest.listingData
        })
      );
    });

    it('should return 400 for invalid request data', async () => {
      const invalidRequest = {
        ...validModerationRequest,
        listingData: {
          ...validModerationRequest.listingData,
          title: '', // Invalid empty title
          sellerAddress: 'invalid_address' // Invalid address format
        }
      };

      const response = await request(app)
        .post('/moderate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRequest = {
        listingId: 'listing_123'
        // Missing required fields
      };

      const response = await request(app)
        .post('/moderate')
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });

    it('should handle service errors gracefully', async () => {
      mockService.moderateMarketplaceListing.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/moderate')
        .send(validModerationRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Moderation failed');
    });
  });

  describe('POST /verify-nft', () => {
    const validNFTRequest = {
      contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      tokenId: '1234',
      sellerAddress: '0x1234567890123456789012345678901234567890'
    };

    const mockNFTResult = {
      listingId: 'nft_0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D_1234',
      overallDecision: 'allow' as const,
      confidence: 0.9,
      nftVerification: {
        status: 'verified' as const,
        ownershipVerified: true,
        signatureValid: true,
        contractVerified: true,
        metadataConsistent: true,
        riskFactors: [],
        confidence: 0.95
      },
      sellerVerification: {
        tier: 'gold' as const,
        kycStatus: 'verified' as const,
        reputationScore: 85,
        transactionHistory: 50,
        riskLevel: 'low' as const,
        verificationRequirements: []
      },
      counterfeitDetection: {
        isCounterfeit: false,
        confidence: 0.1,
        matchedBrands: [],
        suspiciousKeywords: []
      },
      scamDetection: {
        isScam: false,
        confidence: 0.1,
        detectedPatterns: [],
        riskFactors: [],
        reasoning: 'No scam patterns detected'
      },
      aiModeration: null,
      requiredActions: [],
      riskScore: 0.2
    };

    it('should successfully verify NFT ownership', async () => {
      mockService.moderateMarketplaceListing.mockResolvedValue(mockNFTResult);

      const response = await request(app)
        .post('/verify-nft')
        .send(validNFTRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nftVerification).toEqual(mockNFTResult.nftVerification);
      expect(response.body.data.verified).toBe(true);
    });

    it('should return 400 for invalid contract address', async () => {
      const invalidRequest = {
        ...validNFTRequest,
        contractAddress: 'invalid_address'
      };

      const response = await request(app)
        .post('/verify-nft')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation error');
    });
  });

  describe('POST /check-counterfeit', () => {
    const validCounterfeitRequest = {
      title: 'Authentic Nike Sneakers',
      description: 'Brand new Nike Air Jordan sneakers',
      images: ['https://example.com/image1.jpg'],
      brandKeywords: ['nike', 'jordan']
    };

    const mockCounterfeitResult = {
      listingId: expect.any(String),
      overallDecision: 'allow' as const,
      confidence: 0.2,
      counterfeitDetection: {
        isCounterfeit: false,
        confidence: 0.2,
        matchedBrands: ['nike'],
        suspiciousKeywords: []
      },
      sellerVerification: expect.any(Object),
      scamDetection: expect.any(Object),
      aiModeration: expect.any(Object),
      requiredActions: [],
      riskScore: 0.3
    };

    it('should successfully check for counterfeits', async () => {
      mockService.moderateMarketplaceListing.mockResolvedValue(mockCounterfeitResult);

      const response = await request(app)
        .post('/check-counterfeit')
        .send(validCounterfeitRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.counterfeitDetection).toBeDefined();
      expect(response.body.data.isCounterfeit).toBe(false);
    });

    it('should detect counterfeit products', async () => {
      const counterfeitRequest = {
        title: 'Replica Gucci Handbag',
        description: 'High quality replica Gucci bag'
      };

      const counterfeitResult = {
        ...mockCounterfeitResult,
        counterfeitDetection: {
          isCounterfeit: true,
          confidence: 0.9,
          matchedBrands: ['gucci'],
          suspiciousKeywords: ['suspicious_gucci_usage']
        }
      };

      mockService.moderateMarketplaceListing.mockResolvedValue(counterfeitResult);

      const response = await request(app)
        .post('/check-counterfeit')
        .send(counterfeitRequest)
        .expect(200);

      expect(response.body.data.isCounterfeit).toBe(true);
      expect(response.body.data.matchedBrands).toContain('gucci');
    });
  });

  describe('POST /detect-scam', () => {
    const validScamRequest = {
      title: 'Regular Product Listing',
      description: 'Normal product description',
      price: '100',
      currency: 'USD',
      sellerAddress: '0x1234567890123456789012345678901234567890'
    };

    it('should successfully detect scam patterns', async () => {
      const mockScamResult = {
        listingId: expect.any(String),
        overallDecision: 'allow' as const,
        confidence: 0.2,
        scamDetection: {
          isScam: false,
          confidence: 0.1,
          detectedPatterns: [],
          riskFactors: [],
          reasoning: 'No scam patterns detected'
        },
        sellerVerification: expect.any(Object),
        counterfeitDetection: expect.any(Object),
        aiModeration: expect.any(Object),
        requiredActions: [],
        riskScore: 0.2
      };

      mockService.moderateMarketplaceListing.mockResolvedValue(mockScamResult);

      const response = await request(app)
        .post('/detect-scam')
        .send(validScamRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scamDetection).toBeDefined();
      expect(response.body.data.isScam).toBe(false);
    });

    it('should detect scam patterns in suspicious listings', async () => {
      const scamRequest = {
        title: 'FREE NFT GIVEAWAY',
        description: 'Connect your wallet to claim free NFT!',
        price: '0',
        currency: 'ETH',
        sellerAddress: '0x1234567890123456789012345678901234567890'
      };

      const scamResult = {
        listingId: expect.any(String),
        overallDecision: 'block' as const,
        confidence: 0.8,
        scamDetection: {
          isScam: true,
          confidence: 0.8,
          detectedPatterns: ['fake_giveaway'],
          riskFactors: ['urgency_tactics'],
          reasoning: 'Detected 1 scam patterns with 80% confidence'
        },
        sellerVerification: expect.any(Object),
        counterfeitDetection: expect.any(Object),
        aiModeration: expect.any(Object),
        requiredActions: ['listing_blocked'],
        riskScore: 0.8
      };

      mockService.moderateMarketplaceListing.mockResolvedValue(scamResult);

      const response = await request(app)
        .post('/detect-scam')
        .send(scamRequest)
        .expect(200);

      expect(response.body.data.isScam).toBe(true);
      expect(response.body.data.detectedPatterns).toContain('fake_giveaway');
    });
  });

  describe('GET /seller/:sellerAddress', () => {
    const mockSellerResult = {
      listingId: expect.any(String),
      overallDecision: 'allow' as const,
      confidence: 0.8,
      sellerVerification: {
        tier: 'silver' as const,
        kycStatus: 'verified' as const,
        reputationScore: 75,
        transactionHistory: 25,
        riskLevel: 'medium' as const,
        verificationRequirements: []
      },
      counterfeitDetection: expect.any(Object),
      scamDetection: expect.any(Object),
      aiModeration: expect.any(Object),
      requiredActions: [],
      riskScore: 0.3
    };

    it('should get seller verification status', async () => {
      mockService.moderateMarketplaceListing.mockResolvedValue(mockSellerResult);

      const response = await request(app)
        .get('/seller/0x1234567890123456789012345678901234567890')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sellerVerification).toBeDefined();
      expect(response.body.data.tier).toBe('silver');
    });

    it('should return 400 for invalid seller address', async () => {
      const response = await request(app)
        .get('/seller/invalid_address')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid seller address format');
    });
  });

  describe('POST /bulk-moderate', () => {
    const validBulkRequest = {
      listings: [
        {
          listingId: 'listing_1',
          listingData: {
            title: 'Product 1',
            description: 'Description 1',
            price: '100',
            currency: 'USD',
            category: 'electronics',
            images: ['https://example.com/image1.jpg'],
            isHighValue: false,
            sellerAddress: '0x1234567890123456789012345678901234567890'
          },
          userId: '550e8400-e29b-41d4-a716-446655440000',
          userReputation: 75,
          walletAddress: '0x1234567890123456789012345678901234567890',
          metadata: {}
        },
        {
          listingId: 'listing_2',
          listingData: {
            title: 'Product 2',
            description: 'Description 2',
            price: '200',
            currency: 'USD',
            category: 'electronics',
            images: ['https://example.com/image2.jpg'],
            isHighValue: false,
            sellerAddress: '0x1234567890123456789012345678901234567890'
          },
          userId: '550e8400-e29b-41d4-a716-446655440000',
          userReputation: 75,
          walletAddress: '0x1234567890123456789012345678901234567890',
          metadata: {}
        }
      ]
    };

    it('should successfully process bulk moderation', async () => {
      const mockResult = {
        listingId: expect.any(String),
        overallDecision: 'allow' as const,
        confidence: 0.8,
        sellerVerification: expect.any(Object),
        counterfeitDetection: expect.any(Object),
        scamDetection: expect.any(Object),
        aiModeration: expect.any(Object),
        requiredActions: [],
        riskScore: 0.3
      };

      mockService.moderateMarketplaceListing.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/bulk-moderate')
        .send(validBulkRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toHaveLength(2);
      expect(response.body.data.summary.total).toBe(2);
      expect(response.body.data.summary.successful).toBe(2);
      expect(response.body.data.summary.failed).toBe(0);
    });

    it('should return 400 for empty listings array', async () => {
      const response = await request(app)
        .post('/bulk-moderate')
        .send({ listings: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('must not be empty');
    });

    it('should return 400 for too many listings', async () => {
      const tooManyListings = {
        listings: Array(51).fill(validBulkRequest.listings[0])
      };

      const response = await request(app)
        .post('/bulk-moderate')
        .send(tooManyListings)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Maximum 50 listings');
    });
  });

  describe('GET /stats', () => {
    it('should return moderation statistics', async () => {
      const response = await request(app)
        .get('/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalListingsModerated');
      expect(response.body.data).toHaveProperty('blockedListings');
      expect(response.body.data).toHaveProperty('reviewedListings');
      expect(response.body.data).toHaveProperty('allowedListings');
      expect(response.body.data).toHaveProperty('topRiskFactors');
      expect(response.body.data).toHaveProperty('dailyStats');
    });
  });
});