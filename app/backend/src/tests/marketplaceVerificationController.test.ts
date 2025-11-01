import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response } from 'express';
import { MarketplaceVerificationController } from '../controllers/marketplaceVerificationController';

// Mock the service
vi.mock('../services/marketplaceVerificationService.js', () => ({
  marketplaceVerificationService: {
    verifyHighValueListing: vi.fn(),
    detectCounterfeit: vi.fn(),
    verifyProofOfOwnership: vi.fn(),
    getSellerVerificationTier: vi.fn(),
    detectScamPatterns: vi.fn()
  }
}));

describe('MarketplaceVerificationController', () => {
  let controller: MarketplaceVerificationController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockService: any;

  beforeEach(async () => {
    controller = new MarketplaceVerificationController();
    mockService = (await import('../services/marketplaceVerificationService.js')).marketplaceVerificationService;
    
    mockReq = {
      body: {},
      params: {}
    };
    
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis()
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyHighValueListing', () => {
    it('should verify high-value listing successfully', async () => {
      const mockResult = {
        verified: true,
        tier: 'premium',
        score: 85,
        requirements: [],
        warnings: []
      };

      mockService.verifyHighValueListing.mockResolvedValue(mockResult);

      mockReq.body = {
        listingId: 'listing-123',
        sellerAddress: '0x123',
        priceUSD: 15000,
        priceETH: 8
      };

      await controller.verifyHighValueListing(mockReq as Request, mockRes as Response);

      expect(mockService.verifyHighValueListing).toHaveBeenCalledWith(
        'listing-123',
        '0x123',
        15000,
        8
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        verification: mockResult
      });
    });

    it('should return 400 for invalid request data', async () => {
      mockReq.body = {
        listingId: 'listing-123',
        // Missing required fields
      };

      await controller.verifyHighValueListing(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid request data',
        details: expect.any(Array)
      });
    });

    it('should handle service errors', async () => {
      mockService.verifyHighValueListing.mockRejectedValue(new Error('Service error'));

      mockReq.body = {
        listingId: 'listing-123',
        sellerAddress: '0x123',
        priceUSD: 15000,
        priceETH: 8
      };

      await controller.verifyHighValueListing(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Failed to verify listing'
      });
    });
  });

  describe('detectCounterfeit', () => {
    it('should detect counterfeit successfully', async () => {
      const mockResult = {
        isCounterfeit: true,
        confidence: 85,
        brandMatches: ['nike']
      };

      mockService.detectCounterfeit.mockResolvedValue(mockResult);

      mockReq.body = {
        title: 'Nike Air Jordan Replica',
        description: 'Unofficial Nike inspired design',
        metadata: { category: 'sneakers' }
      };

      await controller.detectCounterfeit(mockReq as Request, mockRes as Response);

      expect(mockService.detectCounterfeit).toHaveBeenCalledWith(
        'Nike Air Jordan Replica',
        'Unofficial Nike inspired design',
        { category: 'sneakers' }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        counterfeit: mockResult
      });
    });

    it('should handle missing metadata', async () => {
      const mockResult = {
        isCounterfeit: false,
        confidence: 0,
        brandMatches: []
      };

      mockService.detectCounterfeit.mockResolvedValue(mockResult);

      mockReq.body = {
        title: 'Original Art',
        description: 'My original artwork'
        // No metadata
      };

      await controller.detectCounterfeit(mockReq as Request, mockRes as Response);

      expect(mockService.detectCounterfeit).toHaveBeenCalledWith(
        'Original Art',
        'My original artwork',
        {}
      );
    });
  });

  describe('verifyProofOfOwnership', () => {
    it('should verify proof of ownership successfully', async () => {
      mockService.verifyProofOfOwnership.mockResolvedValue(true);

      mockReq.body = {
        signature: '0xsignature',
        message: 'I own NFT 123',
        walletAddress: '0x123',
        tokenId: '123',
        contractAddress: '0xabc',
        timestamp: Date.now()
      };

      await controller.verifyProofOfOwnership(mockReq as Request, mockRes as Response);

      expect(mockService.verifyProofOfOwnership).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        verified: true,
        proof: {
          walletAddress: '0x123',
          tokenId: '123',
          contractAddress: '0xabc',
          timestamp: expect.any(Number)
        }
      });
    });

    it('should return false for invalid proof', async () => {
      mockService.verifyProofOfOwnership.mockResolvedValue(false);

      mockReq.body = {
        signature: '0xinvalid',
        message: 'I own NFT 123',
        walletAddress: '0x123',
        tokenId: '123',
        contractAddress: '0xabc',
        timestamp: Date.now()
      };

      await controller.verifyProofOfOwnership(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        verified: false,
        proof: expect.any(Object)
      });
    });
  });

  describe('getSellerVerificationTier', () => {
    it('should get seller verification tier successfully', async () => {
      const mockResult = {
        verified: true,
        tier: 'verified',
        score: 75,
        requirements: [],
        warnings: []
      };

      mockService.getSellerVerificationTier.mockResolvedValue(mockResult);

      mockReq.params = { sellerAddress: '0x123' };

      await controller.getSellerVerificationTier(mockReq as Request, mockRes as Response);

      expect(mockService.getSellerVerificationTier).toHaveBeenCalledWith('0x123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        verification: mockResult
      });
    });

    it('should return 400 for missing seller address', async () => {
      mockReq.params = {}; // No sellerAddress

      await controller.getSellerVerificationTier(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Seller address is required'
      });
    });
  });

  describe('detectScamPatterns', () => {
    it('should detect scam patterns successfully', async () => {
      const mockResult = {
        isScam: true,
        confidence: 90,
        patterns: ['free nft', 'guaranteed profit']
      };

      mockService.detectScamPatterns.mockResolvedValue(mockResult);

      mockReq.body = {
        title: 'FREE NFT GIVEAWAY',
        description: 'Guaranteed profit! Send ETH to get more back!',
        priceETH: 0.001,
        sellerReputation: 10
      };

      await controller.detectScamPatterns(mockReq as Request, mockRes as Response);

      expect(mockService.detectScamPatterns).toHaveBeenCalledWith(
        'FREE NFT GIVEAWAY',
        'Guaranteed profit! Send ETH to get more back!',
        0.001,
        10
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        scam: mockResult
      });
    });
  });

  describe('verifyMarketplaceListing', () => {
    it('should perform comprehensive verification successfully', async () => {
      // Mock all service methods
      mockService.verifyHighValueListing.mockResolvedValue({
        verified: true,
        tier: 'premium',
        score: 85,
        requirements: [],
        warnings: []
      });

      mockService.detectCounterfeit.mockResolvedValue({
        isCounterfeit: false,
        confidence: 10,
        brandMatches: []
      });

      mockService.getSellerVerificationTier.mockResolvedValue({
        verified: true,
        tier: 'verified',
        score: 75,
        requirements: [],
        warnings: []
      });

      mockService.detectScamPatterns.mockResolvedValue({
        isScam: false,
        confidence: 5,
        patterns: []
      });

      mockService.verifyProofOfOwnership.mockResolvedValue(true);

      mockReq.body = {
        listingId: 'listing-123',
        sellerAddress: '0x123',
        title: 'Legitimate NFT',
        description: 'A legitimate NFT listing',
        priceUSD: 1000,
        priceETH: 0.5,
        metadata: {},
        proofOfOwnership: {
          signature: '0xsignature',
          message: 'I own this NFT',
          walletAddress: '0x123',
          tokenId: '123',
          contractAddress: '0xabc',
          timestamp: Date.now()
        }
      };

      await controller.verifyMarketplaceListing(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        verification: {
          listingId: 'listing-123',
          action: 'allow',
          riskScore: expect.any(Number),
          issues: expect.any(Array),
          details: {
            highValue: expect.any(Object),
            counterfeit: expect.any(Object),
            seller: expect.any(Object),
            scam: expect.any(Object),
            ownership: true
          }
        }
      });
    });

    it('should block high-risk listings', async () => {
      // Mock high-risk responses
      mockService.verifyHighValueListing.mockResolvedValue({
        verified: false,
        tier: 'basic',
        score: 20,
        requirements: ['KYC required'],
        warnings: []
      });

      mockService.detectCounterfeit.mockResolvedValue({
        isCounterfeit: true,
        confidence: 90,
        brandMatches: ['nike']
      });

      mockService.getSellerVerificationTier.mockResolvedValue({
        verified: false,
        tier: 'basic',
        score: 30,
        requirements: ['KYC verification'],
        warnings: ['High dispute rate']
      });

      mockService.detectScamPatterns.mockResolvedValue({
        isScam: true,
        confidence: 85,
        patterns: ['free nft', 'guaranteed profit']
      });

      mockService.verifyProofOfOwnership.mockResolvedValue(false);

      mockReq.body = {
        listingId: 'listing-456',
        sellerAddress: '0x456',
        title: 'FREE Nike NFT',
        description: 'Guaranteed profit! Get rich quick!',
        priceUSD: 50000,
        priceETH: 25
      };

      await controller.verifyMarketplaceListing(mockReq as Request, mockRes as Response);

      const response = (mockRes.json as any).mock.calls[0][0];
      expect(response.verification.action).toBe('block');
      expect(response.verification.riskScore).toBeGreaterThanOrEqual(80);
      expect(response.verification.issues.length).toBeGreaterThan(0);
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = {
        listingId: 'listing-123'
        // Missing required fields
      };

      await controller.verifyMarketplaceListing(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required fields: listingId, sellerAddress, title, description'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockService.verifyHighValueListing.mockRejectedValue(new Error('Service error'));

      mockReq.body = {
        listingId: 'listing-123',
        sellerAddress: '0x123',
        title: 'Test NFT',
        description: 'Test description'
      };

      await controller.verifyMarketplaceListing(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Failed to verify marketplace listing'
      });
    });
  });
});
