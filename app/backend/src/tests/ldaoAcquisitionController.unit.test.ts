import { Request, Response } from 'express';
import { LDAOAcquisitionController } from '../controllers/ldaoAcquisitionController';
import { LDAOAcquisitionService } from '../services/ldaoAcquisitionService';
import { ldaoAcquisitionConfig } from '../config/ldaoAcquisitionConfig';

// Mock the service and config
jest.mock('../services/ldaoAcquisitionService');
jest.mock('../config/ldaoAcquisitionConfig');

describe('LDAOAcquisitionController', () => {
  let controller: LDAOAcquisitionController;
  let mockService: jest.Mocked<LDAOAcquisitionService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Create mock service
    mockService = {
      purchaseWithFiat: jest.fn(),
      purchaseWithCrypto: jest.fn(),
      getCurrentPrice: jest.fn(),
      getPriceQuote: jest.fn(),
      earnTokens: jest.fn(),
      getTransactionHistory: jest.fn(),
      getEarningHistory: jest.fn(),
      getSupportedPaymentMethods: jest.fn(),
      getSupportedNetworks: jest.fn(),
      swapOnDEX: jest.fn(),
      bridgeTokens: jest.fn(),
      getStakingPositions: jest.fn(),
      getServiceStatus: jest.fn(),
    } as any;

    controller = new LDAOAcquisitionController(mockService);

    // Setup mock Express objects
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    jest.clearAllMocks();
  });

  describe('purchaseTokens', () => {
    it('should successfully purchase tokens with fiat', async () => {
      const mockResult = {
        success: true,
        transactionId: 'tx_123',
        estimatedTokens: 1000,
        finalPrice: 10,
      };

      mockService.purchaseWithFiat.mockResolvedValue(mockResult);

      mockRequest.body = {
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      };

      await controller.purchaseTokens(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockResult);
      expect(mockService.purchaseWithFiat).toHaveBeenCalledWith({
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        amount: 1000,
        // Missing paymentMethod and userAddress
      };

      await controller.purchaseTokens(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: amount, paymentMethod, userAddress',
      });
    });

    it('should return 400 for invalid amount', async () => {
      mockRequest.body = {
        amount: -100,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      };

      await controller.purchaseTokens(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Amount must be greater than 0',
      });
    });
  });

  describe('getPrice', () => {
    it('should return current price', async () => {
      mockService.getCurrentPrice.mockResolvedValue(0.01);

      mockRequest.query = {};

      await controller.getPrice(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        price: 0.01,
        currency: 'USD',
      });
    });

    it('should return price quote for specific amount', async () => {
      const mockQuote = {
        pricePerToken: 0.01,
        totalPrice: 10,
        discount: 0.5,
        discountPercentage: 5,
        validUntil: new Date(),
      };

      mockService.getPriceQuote.mockResolvedValue(mockQuote);

      mockRequest.query = { amount: '1000', paymentToken: 'USDC' };

      await controller.getPrice(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        quote: mockQuote,
      });
      expect(mockService.getPriceQuote).toHaveBeenCalledWith(1000, 'USDC');
    });
  });

  describe('earnTokens', () => {
    it('should successfully earn tokens', async () => {
      const mockResult = {
        success: true,
        tokensEarned: 50,
        multiplier: 1.5,
      };

      mockService.earnTokens.mockResolvedValue(mockResult);

      mockRequest.body = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'post',
        activityId: 'post_123',
        metadata: { quality: 'high' },
      };

      await controller.earnTokens(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 for invalid activity type', async () => {
      mockRequest.body = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'invalid',
        activityId: 'post_123',
      };

      await controller.earnTokens(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid activity type. Must be one of: post, comment, referral, marketplace',
      });
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status', async () => {
      const mockStatus = {
        fiatPayment: true,
        dexIntegration: true,
        earnToOwn: true,
        staking: true,
        bridge: false,
      };

      mockService.getServiceStatus.mockReturnValue(mockStatus);

      await controller.getServiceStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            serviceStatus: mockStatus,
          }),
        })
      );
    });
  });
});
