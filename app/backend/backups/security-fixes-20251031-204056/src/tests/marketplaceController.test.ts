import { MarketplaceController } from '../controllers/marketplaceController';
import { MarketplaceService } from '../services/marketplaceService';
import { EnhancedEscrowService } from '../services/enhancedEscrowService';
import { Request, Response } from 'express';

// Mock the services
jest.mock('../services/marketplaceService');
jest.mock('../services/enhancedEscrowService');

describe('MarketplaceController', () => {
  let marketplaceController: MarketplaceController;
  let mockMarketplaceService: jest.Mocked<MarketplaceService>;
  let mockEnhancedEscrowService: jest.Mocked<EnhancedEscrowService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock services
    mockMarketplaceService = new MarketplaceService() as jest.Mocked<MarketplaceService>;
    mockEnhancedEscrowService = new EnhancedEscrowService(
      'http://localhost:8545',
      '0x123',
      '0x456'
    ) as jest.Mocked<EnhancedEscrowService>;
    
    // Create controller with mocked services
    marketplaceController = new MarketplaceController();
    
    // Mock the service instances in the controller
    (marketplaceController as any).marketplaceService = mockMarketplaceService;
    (marketplaceController as any).enhancedEscrowService = mockEnhancedEscrowService;
    
    // Create mock request and response objects
    mockRequest = {
      params: {},
      body: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('createListing', () => {
    it('should create a listing and return 201 status', async () => {
      const mockListing = {
        id: '1',
        sellerWalletAddress: '0x123',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        status: 'ACTIVE' as const,
        startTime: new Date().toISOString(),
        metadataURI: 'ipfs://test',
        isEscrowed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockRequest.body = {
        sellerWalletAddress: '0x123',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'ipfs://test'
      };
      
      mockMarketplaceService.createListing.mockResolvedValue(mockListing);
      
      await marketplaceController.createListing(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockListing);
      expect(mockMarketplaceService.createListing).toHaveBeenCalledWith(mockRequest.body);
    });

    it('should return 400 for invalid item type', async () => {
      mockRequest.body = {
        sellerAddress: '0x123',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'INVALID_TYPE',
        listingType: 'FIXED_PRICE',
        metadataURI: 'ipfs://test'
      };
      
      await expect(
        marketplaceController.createListing(mockRequest as Request, mockResponse as any)
      ).rejects.toThrow('Invalid item type');
    });
  });

  describe('createDispute', () => {
    it('should create a dispute with evidence and return 201 status', async () => {
      const mockDispute = {
        id: '1',
        escrowId: '1',
        reporterWalletAddress: '0x123',
        reason: 'Item not received',
        status: 'OPEN' as const,
        createdAt: new Date().toISOString(),
        evidence: ['ipfs://evidence1', 'ipfs://evidence2']
      };
      
      mockRequest.body = {
        escrowId: '1',
        reporterWalletAddress: '0x123',
        reason: 'Item not received',
        evidence: ['ipfs://evidence1', 'ipfs://evidence2']
      };
      
      mockMarketplaceService.createDispute.mockResolvedValue(mockDispute);
      
      await marketplaceController.createDispute(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockDispute);
      expect(mockMarketplaceService.createDispute).toHaveBeenCalledWith(
        '1',
        '0x123',
        'Item not received',
        ['ipfs://evidence1', 'ipfs://evidence2']
      );
    });
  });

  describe('createAIModeration', () => {
    it('should create an AI moderation record and return 201 status', async () => {
      const mockAIModeration = {
        id: '1',
        objectType: 'listing',
        objectId: '1',
        status: 'PENDING' as const,
        aiAnalysis: '{"riskScore": 20}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockRequest.body = {
        objectType: 'listing',
        objectId: '1',
        aiAnalysis: '{"riskScore": 20}'
      };
      
      mockMarketplaceService.createAIModeration.mockResolvedValue(mockAIModeration);
      
      await marketplaceController.createAIModeration(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockAIModeration);
      expect(mockMarketplaceService.createAIModeration).toHaveBeenCalledWith(
        'listing',
        '1',
        '{"riskScore": 20}'
      );
    });
  });

  describe('getAIModerationByObject', () => {
    it('should get AI moderation by object and return 200 status', async () => {
      const mockAIModeration = {
        id: '1',
        objectType: 'listing',
        objectId: '1',
        status: 'PENDING' as const,
        aiAnalysis: '{"riskScore": 20}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      mockRequest.params = {
        objectType: 'listing',
        objectId: '1'
      };
      
      mockMarketplaceService.getAIModerationByObject.mockResolvedValue(mockAIModeration);
      
      await marketplaceController.getAIModerationByObject(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.json).toHaveBeenCalledWith(mockAIModeration);
      expect(mockMarketplaceService.getAIModerationByObject).toHaveBeenCalledWith('listing', '1');
    });

    it('should return 404 if AI moderation record not found', async () => {
      mockRequest.params = {
        objectType: 'listing',
        objectId: '999'
      };
      
      mockMarketplaceService.getAIModerationByObject.mockResolvedValue(null);
      
      await marketplaceController.getAIModerationByObject(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'AI moderation record not found' });
    });
  });

  describe('updateAIModerationStatus', () => {
    it('should update AI moderation status and return 204 status', async () => {
      mockRequest.params = {
        id: '1'
      };
      
      mockRequest.body = {
        status: 'APPROVED' as const,
        aiAnalysis: '{"riskScore": 5}'
      };
      
      mockMarketplaceService.updateAIModerationStatus.mockResolvedValue(true);
      
      await marketplaceController.updateAIModerationStatus(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
      expect(mockMarketplaceService.updateAIModerationStatus).toHaveBeenCalledWith(
        '1',
        'APPROVED',
        '{"riskScore": 5}'
      );
    });

    it('should return 404 if AI moderation record not found', async () => {
      mockRequest.params = {
        id: '999'
      };
      
      mockRequest.body = {
        status: 'APPROVED' as const
      };
      
      mockMarketplaceService.updateAIModerationStatus.mockResolvedValue(false);
      
      await expect(
        marketplaceController.updateAIModerationStatus(mockRequest as Request, mockResponse as any)
      ).rejects.toThrow('AI moderation record not found');
    });
  });

  describe('getPendingAIModeration', () => {
    it('should get pending AI moderation records and return 200 status', async () => {
      const mockAIModerations = [
        {
          id: '1',
          objectType: 'listing',
          objectId: '1',
          status: 'PENDING' as const,
          aiAnalysis: '{"riskScore": 20}',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      mockMarketplaceService.getPendingAIModeration.mockResolvedValue(mockAIModerations);
      
      await marketplaceController.getPendingAIModeration(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.json).toHaveBeenCalledWith(mockAIModerations);
      expect(mockMarketplaceService.getPendingAIModeration).toHaveBeenCalled();
    });
  });
});