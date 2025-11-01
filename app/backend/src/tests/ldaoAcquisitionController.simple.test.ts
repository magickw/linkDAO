import { Request, Response } from 'express';
import { LDAOAcquisitionController } from '../controllers/ldaoAcquisitionController';
import { LDAOAcquisitionService } from '../services/ldaoAcquisitionService';
import { ldaoAcquisitionConfig } from '../config/ldaoAcquisitionConfig';
import { PurchaseResult, EarnResult, SwapResult, BridgeResult } from '../types/ldaoAcquisition';

// Mock the service
jest.mock('../services/ldaoAcquisitionService');
jest.mock('../config/ldaoAcquisitionConfig');

const MockedLDAOAcquisitionService = LDAOAcquisitionService as jest.MockedClass<typeof LDAOAcquisitionService>;

describe('LDAOAcquisitionController', () => {
  let mockService: jest.Mocked<LDAOAcquisitionService>;
  let controller: LDAOAcquisitionController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    // Create mock service instance
    mockService = new MockedLDAOAcquisitionService(ldaoAcquisitionConfig) as jest.Mocked<LDAOAcquisitionService>;
    controller = new LDAOAcquisitionController(mockService);

    // Setup mock Express objects
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('purchaseTokens', () => {
    it('should successfully purchase tokens with fiat', async () => {
      const mockResult: PurchaseResult = {
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
      const req = mockRequest({
        amount: -100,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      });
      const res = mockResponse();

      await controller.purchaseTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Amount must be greater than 0',
      });
    });
  });

  describe('getPrice', () => {
    it('should return current price', async () => {
      mockService.getCurrentPrice.mockResolvedValue(0.01);

      const req = mockRequest({}, {});
      const res = mockResponse();

      await controller.getPrice(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
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

      const req = mockRequest({}, { amount: '1000', paymentToken: 'USDC' });
      const res = mockResponse();

      await controller.getPrice(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        quote: mockQuote,
      });
      expect(mockService.getPriceQuote).toHaveBeenCalledWith(1000, 'USDC');
    });
  });

  describe('earnTokens', () => {
    it('should successfully earn tokens', async () => {
      const mockResult: EarnResult = {
        success: true,
        tokensEarned: 50,
        multiplier: 1.5,
      };

      mockService.earnTokens.mockResolvedValue(mockResult);

      const req = mockRequest({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'post',
        activityId: 'post_123',
        metadata: { quality: 'high' },
      });
      const res = mockResponse();

      await controller.earnTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 for invalid activity type', async () => {
      const req = mockRequest({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'invalid',
        activityId: 'post_123',
      });
      const res = mockResponse();

      await controller.earnTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
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

      const req = mockRequest();
      const res = mockResponse();

      await controller.getServiceStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            serviceStatus: mockStatus,
          }),
        })
      );
    });
  });

  describe('swapTokens', () => {
    it('should successfully swap tokens', async () => {
      const mockResult: SwapResult = {
        success: true,
        txHash: '0xdef...',
        amountOut: 1000,
      };

      mockService.swapOnDEX.mockResolvedValue(mockResult);

      const req = mockRequest({
        fromToken: 'USDC',
        toToken: 'LDAO',
        amount: 10,
        userAddress: '0x789...',
      });
      const res = mockResponse();

      await controller.swapTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 for missing fields', async () => {
      const req = mockRequest({
        fromToken: 'USDC',
        // Missing toToken, amount, userAddress
      });
      const res = mockResponse();

      await controller.swapTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields: fromToken, toToken, amount, userAddress',
      });
    });
  });

  describe('bridgeTokens', () => {
    it('should successfully bridge tokens', async () => {
      const mockResult: BridgeResult = {
        success: true,
        txHash: '0xghi...',
        bridgeId: 'bridge_123',
      };

      mockService.bridgeTokens.mockResolvedValue(mockResult);

      const req = mockRequest({
        fromChain: 'ethereum',
        toChain: 'polygon',
        amount: 500,
        userAddress: '0xabc...',
      });
      const res = mockResponse();

      await controller.bridgeTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 for same source and destination chains', async () => {
      const req = mockRequest({
        fromChain: 'ethereum',
        toChain: 'ethereum',
        amount: 500,
        userAddress: '0xabc...',
      });
      const res = mockResponse();

      await controller.bridgeTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Source and destination chains cannot be the same',
      });
    });
  });
});
