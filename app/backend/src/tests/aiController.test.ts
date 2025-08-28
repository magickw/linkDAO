import { AIController } from '../controllers/aiController';
import { AIService } from '../services/aiService';
import { Request, Response } from 'express';

// Mock the AI service
jest.mock('../services/aiService');

describe('AIController', () => {
  let aiController: AIController;
  let mockAIService: jest.Mocked<AIService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock service
    mockAIService = new AIService() as jest.Mocked<AIService>;
    
    // Create controller with mocked service
    aiController = new AIController();
    
    // Mock the service instance in the controller
    (aiController as any).aiService = mockAIService;
    
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

  describe('analyzeListing', () => {
    it('should analyze a listing and return 200 status', async () => {
      const mockResult = {
        listingId: '1',
        riskScore: 20,
        status: 'APPROVED',
        analysis: 'Low risk listing',
        aiModerationId: '1'
      };
      
      mockRequest.params = {
        listingId: '1'
      };
      
      mockAIService.analyzeListing.mockResolvedValue(mockResult);
      
      await aiController.analyzeListing(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(mockAIService.analyzeListing).toHaveBeenCalledWith('1');
    });

    it('should return 400 if listing ID is missing', async () => {
      mockRequest.params = {};
      
      await expect(
        aiController.analyzeListing(mockRequest as Request, mockResponse as any)
      ).rejects.toThrow('Listing ID is required');
    });
  });

  describe('assistDisputeResolution', () => {
    it('should assist with dispute resolution and return 200 status', async () => {
      const mockResult = {
        disputeId: '1',
        analysis: 'Buyer likely to win based on evidence',
        aiModerationId: '1'
      };
      
      mockRequest.params = {
        disputeId: '1'
      };
      
      mockAIService.assistDisputeResolution.mockResolvedValue(mockResult);
      
      await aiController.assistDisputeResolution(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(mockAIService.assistDisputeResolution).toHaveBeenCalledWith('1');
    });

    it('should return 400 if dispute ID is missing', async () => {
      mockRequest.params = {};
      
      await expect(
        aiController.assistDisputeResolution(mockRequest as Request, mockResponse as any)
      ).rejects.toThrow('Dispute ID is required');
    });
  });

  describe('detectFraud', () => {
    it('should detect fraud and return 200 status', async () => {
      const mockResult = {
        userAddress: '0x123',
        riskScore: 30,
        analysis: 'Low fraud risk'
      };
      
      mockRequest.params = {
        userAddress: '0x123'
      };
      
      mockAIService.detectFraud.mockResolvedValue(mockResult);
      
      await aiController.detectFraud(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(mockAIService.detectFraud).toHaveBeenCalledWith('0x123');
    });

    it('should return 400 if user address is missing', async () => {
      mockRequest.params = {};
      
      await expect(
        aiController.detectFraud(mockRequest as Request, mockResponse as any)
      ).rejects.toThrow('User address is required');
    });
  });

  describe('suggestPrice', () => {
    it('should suggest a price and return 200 status', async () => {
      const mockResult = {
        itemType: 'DIGITAL',
        metadataURI: 'Test digital item',
        suggestion: 'Suggested price range: 0.5-1.5 ETH'
      };
      
      mockRequest.body = {
        itemType: 'DIGITAL',
        metadataURI: 'Test digital item'
      };
      
      mockAIService.suggestPrice.mockResolvedValue(mockResult);
      
      await aiController.suggestPrice(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
      expect(mockAIService.suggestPrice).toHaveBeenCalledWith('DIGITAL', 'Test digital item');
    });

    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = {
        itemType: 'DIGITAL'
        // metadataURI is missing
      };
      
      await expect(
        aiController.suggestPrice(mockRequest as Request, mockResponse as any)
      ).rejects.toThrow('Item type and metadata URI are required');
    });
  });

  describe('processPendingModeration', () => {
    it('should process pending moderation and return 200 status', async () => {
      mockAIService.processPendingModeration.mockResolvedValue();
      
      await aiController.processPendingModeration(
        mockRequest as Request,
        mockResponse as any
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Pending moderation processed successfully' });
      expect(mockAIService.processPendingModeration).toHaveBeenCalled();
    });
  });
});