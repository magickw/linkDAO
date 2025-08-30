import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import marketplaceModerationRoutes from '../routes/marketplaceModerationRoutes';
import { MarketplaceModerationService } from '../services/marketplaceModerationService';
import { MarketplaceService } from '../services/marketplaceService';

// Mock the services
jest.mock('../services/marketplaceModerationService');
jest.mock('../services/marketplaceService');
jest.mock('../services/databaseService');
jest.mock('../services/reputationService');
jest.mock('../services/kycService');

describe('Marketplace Moderation Integration Tests', () => {
  let app: express.Application;
  let mockModerationService: jest.Mocked<MarketplaceModerationService>;
  let mockMarketplaceService: jest.Mocked<MarketplaceService>;

  const mockListing = {
    id: '1',
    sellerWalletAddress: '0x1234567890123456789012345678901234567890',
    tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
    price: '1000',
    quantity: 1,
    itemType: 'NFT' as const,
    listingType: 'FIXED_PRICE' as const,
    status: 'ACTIVE' as const,
    startTime: new Date().toISOString(),
    metadataURI: 'Test NFT Listing',
    isEscrowed: false,
    nftStandard: 'ERC721' as const,
    tokenId: '123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace/moderation', marketplaceModerationRoutes);

    // Setup mocks
    mockModerationService = new MarketplaceModerationService() as jest.Mocked<MarketplaceModerationService>;
    mockMarketplaceService = new MarketplaceService() as jest.Mocked<MarketplaceService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/marketplace/moderation/verify', () => {
    it('should verify a high-value NFT listing successfully', async () => {
      const mockVerification = {
        listingId: '1',
        verificationLevel: 'enhanced' as const,
        sellerTier: 'verified' as const,
        riskScore: 0.3,
        proofOfOwnership: {
          signature: '0x' + 'a'.repeat(130),
          message: 'I own NFT 123 at contract 0xabcdef... - 1234567890',
          walletAddress: '0x1234567890123456789012345678901234567890',
          timestamp: Date.now(),
        },
      };

      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.verifyHighValueNFTListing.mockResolvedValue(mockVerification);

      const response = await request(app)
        .post('/api/marketplace/moderation/verify')
        .send({
          listingId: '1',
          proofOfOwnership: mockVerification.proofOfOwnership,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.verification).toEqual(mockVerification);
      expect(response.body.message).toContain('enhanced level');
    });

    it('should return 404 for non-existent listing', async () => {
      mockMarketplaceService.getListingById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/marketplace/moderation/verify')
        .send({
          listingId: 'non-existent',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Listing not found');
    });

    it('should return 400 for invalid request data', async () => {
      const response = await request(app)
        .post('/api/marketplace/moderation/verify')
        .send({
          // Missing required listingId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('POST /api/marketplace/moderation/moderate', () => {
    it('should moderate a listing and return decision', async () => {
      const mockDecision = {
        overallConfidence: 0.8,
        primaryCategory: 'scam_detected',
        action: 'block' as const,
        vendorResults: [
          {
            vendor: 'marketplace_verification',
            confidence: 0.7,
            categories: ['enhanced', 'verified'],
            reasoning: 'Seller tier: verified, Risk score: 0.3',
            cost: 0,
            latency: 100,
          },
        ],
        reasoning: 'Marketplace moderation: block - scam_detected (confidence: 0.8)',
      };

      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.moderateMarketplaceListing.mockResolvedValue(mockDecision);

      const response = await request(app)
        .post('/api/marketplace/moderation/moderate')
        .send({
          listingId: '1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.decision).toEqual(mockDecision);
      expect(response.body.message).toContain('block');
    });

    it('should handle moderation service errors', async () => {
      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.moderateMarketplaceListing.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/marketplace/moderation/moderate')
        .send({
          listingId: '1',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /api/marketplace/moderation/counterfeit/:listingId', () => {
    it('should detect counterfeit indicators', async () => {
      const mockDetection = {
        brandKeywords: ['nike', 'gucci'],
        suspiciousTerms: ['replica', 'fake'],
        priceAnalysis: {
          marketPrice: 1000,
          listingPrice: 100,
          priceDeviation: 0.9,
          isSuspicious: true,
        },
      };

      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.detectCounterfeit.mockResolvedValue(mockDetection);

      const response = await request(app)
        .get('/api/marketplace/moderation/counterfeit/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.detection).toEqual(mockDetection);
      expect(response.body.isCounterfeit).toBe(true);
    });

    it('should return false for legitimate items', async () => {
      const mockDetection = {
        brandKeywords: [],
        suspiciousTerms: [],
        priceAnalysis: undefined,
      };

      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.detectCounterfeit.mockResolvedValue(mockDetection);

      const response = await request(app)
        .get('/api/marketplace/moderation/counterfeit/1');

      expect(response.status).toBe(200);
      expect(response.body.isCounterfeit).toBe(false);
    });
  });

  describe('GET /api/marketplace/moderation/scam-patterns/:listingId', () => {
    it('should detect scam patterns', async () => {
      const mockPatterns = [
        {
          patternType: 'phishing' as const,
          confidence: 0.8,
          indicators: ['free nft', 'airdrop', 'click here'],
          description: 'Potential phishing attempt detected',
        },
        {
          patternType: 'fake_listing' as const,
          confidence: 0.6,
          indicators: ['urgent sale', 'must sell today'],
          description: 'Suspicious listing patterns detected',
        },
      ];

      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.detectScamPatterns.mockResolvedValue(mockPatterns);

      const response = await request(app)
        .get('/api/marketplace/moderation/scam-patterns/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.patterns).toEqual(mockPatterns);
      expect(response.body.highRiskPatterns).toHaveLength(1);
      expect(response.body.highRiskPatterns[0].patternType).toBe('phishing');
    });

    it('should return empty array for clean listings', async () => {
      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.detectScamPatterns.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/marketplace/moderation/scam-patterns/1');

      expect(response.status).toBe(200);
      expect(response.body.patterns).toHaveLength(0);
      expect(response.body.highRiskPatterns).toHaveLength(0);
    });
  });

  describe('GET /api/marketplace/moderation/seller-tier/:walletAddress', () => {
    it('should return seller tier information', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      mockModerationService.determineSellerTier.mockResolvedValue('verified');

      const response = await request(app)
        .get(`/api/marketplace/moderation/seller-tier/${walletAddress}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.walletAddress).toBe(walletAddress);
      expect(response.body.currentTier).toBe('verified');
      expect(response.body.verification).toBeDefined();
    });

    it('should return 400 for invalid wallet address', async () => {
      const response = await request(app)
        .get('/api/marketplace/moderation/seller-tier/invalid-address');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid wallet address format');
    });
  });

  describe('PUT /api/marketplace/moderation/seller-tier', () => {
    it('should update seller tier successfully', async () => {
      const updateData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        tier: 'premium',
        reason: 'Manual verification completed',
      };

      const response = await request(app)
        .put('/api/marketplace/moderation/seller-tier')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.newTier).toBe('premium');
      expect(response.body.message).toContain('premium');
    });

    it('should return 400 for invalid tier', async () => {
      const response = await request(app)
        .put('/api/marketplace/moderation/seller-tier')
        .send({
          walletAddress: '0x1234567890123456789012345678901234567890',
          tier: 'invalid-tier',
          reason: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('POST /api/marketplace/moderation/appeal', () => {
    it('should submit appeal successfully', async () => {
      const appealData = {
        listingId: '1',
        decisionId: 123,
        appealReason: 'The listing was incorrectly flagged as counterfeit',
        evidence: {
          authenticity_certificate: 'ipfs://...',
          purchase_receipt: 'ipfs://...',
        },
        appellantAddress: '0x1234567890123456789012345678901234567890',
      };

      const response = await request(app)
        .post('/api/marketplace/moderation/appeal')
        .send(appealData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.appeal).toBeDefined();
      expect(response.body.message).toBe('Appeal submitted successfully');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/marketplace/moderation/appeal')
        .send({
          listingId: '1',
          // Missing decisionId and appealReason
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  describe('GET /api/marketplace/moderation/history/:listingId', () => {
    it('should return moderation history', async () => {
      const response = await request(app)
        .get('/api/marketplace/moderation/history/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.listingId).toBe('1');
      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe('GET /api/marketplace/moderation/stats', () => {
    it('should return moderation statistics', async () => {
      const response = await request(app)
        .get('/api/marketplace/moderation/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.totalListingsModerated).toBeDefined();
      expect(response.body.stats.sellerTierDistribution).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      mockMarketplaceService.getListingById.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/marketplace/moderation/verify')
        .send({
          listingId: '1',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/marketplace/moderation/verify')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle missing content-type header', async () => {
      const response = await request(app)
        .post('/api/marketplace/moderation/verify')
        .send('listingId=1');

      // Express should handle this gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent verification requests', async () => {
      mockMarketplaceService.getListingById.mockResolvedValue(mockListing);
      mockModerationService.verifyHighValueNFTListing.mockResolvedValue({
        listingId: '1',
        verificationLevel: 'basic' as const,
        sellerTier: 'unverified' as const,
        riskScore: 0.1,
      });

      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/marketplace/moderation/verify')
          .send({ listingId: `${i + 1}` })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large evidence payloads in appeals', async () => {
      const largeEvidence = {
        documents: Array.from({ length: 100 }, (_, i) => `document_${i}`),
        images: Array.from({ length: 50 }, (_, i) => `ipfs://image_${i}`),
        metadata: {
          description: 'A'.repeat(10000), // Large text
        },
      };

      const response = await request(app)
        .post('/api/marketplace/moderation/appeal')
        .send({
          listingId: '1',
          decisionId: 123,
          appealReason: 'Incorrectly flagged',
          evidence: largeEvidence,
          appellantAddress: '0x1234567890123456789012345678901234567890',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should sanitize wallet addresses', async () => {
      const maliciousAddress = '0x1234567890123456789012345678901234567890<script>alert("xss")</script>';
      
      const response = await request(app)
        .get(`/api/marketplace/moderation/seller-tier/${encodeURIComponent(maliciousAddress)}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid wallet address format');
    });

    it('should handle SQL injection attempts in listing IDs', async () => {
      const maliciousListingId = "1'; DROP TABLE listings; --";
      
      mockMarketplaceService.getListingById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/marketplace/moderation/verify')
        .send({
          listingId: maliciousListingId,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Listing not found');
    });

    it('should limit request payload size', async () => {
      const oversizedPayload = {
        listingId: '1',
        evidence: 'A'.repeat(10 * 1024 * 1024), // 10MB string
      };

      const response = await request(app)
        .post('/api/marketplace/moderation/appeal')
        .send(oversizedPayload);

      // Should be handled by express.json() size limit
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});