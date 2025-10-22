import { LDAOAcquisitionController } from '../controllers/ldaoAcquisitionController';
import { LDAOAcquisitionService } from '../services/ldaoAcquisitionService';
import { ldaoAcquisitionConfig } from '../config/ldaoAcquisitionConfig';
import { PurchaseResult, EarnResult, SwapResult, BridgeResult } from '../types/ldaoAcquisition';

// Mock the service
jest.mock('../services/ldaoAcquisitionService');
jest.mock('../config/ldaoAcquisitionConfig');

const MockedLDAOAcquisitionService = LDAOAcquisitionService as jest.MockedClass<typeof LDAOAcquisitionService>;

// Mock Express Request and Response
const mockRequest = (body: any = {}, query: any = {}) => ({
  body,
  query,
});

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('LDAOAcquisitionController', () => {
  let mockService: jest.Mocked<LDAOAcquisitionService>;
  let controller: LDAOAcquisitionController;

  beforeEach(() => {
    // Create mock service instance
    mockService = new MockedLDAOAcquisitionService(ldaoAcquisitionConfig) as jest.Mocked<LDAOAcquisitionService>;
    controller = new LDAOAcquisitionController(mockService);
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

      const req = mockRequest({
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      });
      const res = mockResponse();

      await controller.purchaseTokens(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
      expect(mockService.purchaseWithFiat).toHaveBeenCalledWith({
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      });
    });

    it('should successfully purchase tokens with crypto', async () => {
      const mockResult: PurchaseResult = {
        success: true,
        transactionId: 'tx_456',
        txHash: '0xabc...',
        estimatedTokens: 500,
        finalPrice: 5,
      };

      mockService.purchaseWithCrypto.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ldao/purchase')
        .send({
          amount: 500,
          paymentMethod: 'crypto',
          paymentToken: 'ETH',
          userAddress: '0x456...',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockService.purchaseWithCrypto).toHaveBeenCalledWith({
        amount: 500,
        paymentMethod: 'crypto',
        paymentToken: 'ETH',
        userAddress: '0x456...',
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/ldao/purchase')
        .send({
          amount: 1000,
          // Missing paymentMethod and userAddress
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/api/ldao/purchase')
        .send({
          amount: -100,
          paymentMethod: 'fiat',
          userAddress: '0x123...',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Amount must be greater than 0');
    });

    it('should return 400 for invalid payment method', async () => {
      const response = await request(app)
        .post('/api/ldao/purchase')
        .send({
          amount: 1000,
          paymentMethod: 'invalid',
          userAddress: '0x123...',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid payment method');
    });

    it('should handle service errors', async () => {
      mockService.purchaseWithFiat.mockResolvedValue({
        success: false,
        error: 'Payment processor unavailable',
      });

      const response = await request(app)
        .post('/api/ldao/purchase')
        .send({
          amount: 1000,
          paymentMethod: 'fiat',
          userAddress: '0x123...',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment processor unavailable');
    });
  });

  describe('GET /api/ldao/price', () => {
    it('should return current price', async () => {
      mockService.getCurrentPrice.mockResolvedValue(0.01);

      const response = await request(app).get('/api/ldao/price');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
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

      const response = await request(app)
        .get('/api/ldao/price')
        .query({ amount: 1000, paymentToken: 'USDC' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        quote: mockQuote,
      });
      expect(mockService.getPriceQuote).toHaveBeenCalledWith(1000, 'USDC');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .get('/api/ldao/price')
        .query({ amount: -100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid amount parameter');
    });
  });

  describe('POST /api/ldao/earn', () => {
    it('should successfully earn tokens', async () => {
      const mockResult: EarnResult = {
        success: true,
        tokensEarned: 50,
        multiplier: 1.5,
      };

      mockService.earnTokens.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ldao/earn')
        .send({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          activityType: 'post',
          activityId: 'post_123',
          metadata: { quality: 'high' },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 for invalid activity type', async () => {
      const response = await request(app)
        .post('/api/ldao/earn')
        .send({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          activityType: 'invalid',
          activityId: 'post_123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid activity type');
    });
  });

  describe('GET /api/ldao/history', () => {
    it('should return transaction history', async () => {
      const mockTransactions = [
        {
          id: 'tx_1',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 1000,
          paymentMethod: 'fiat' as const,
          paymentToken: 'USD',
          pricePerToken: 0.01,
          discountApplied: 0,
          status: 'completed' as const,
          createdAt: new Date(),
        },
      ];

      const mockEarnings = [
        {
          id: 'earn_1',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          activityType: 'post' as const,
          tokensEarned: 50,
          multiplier: 1.0,
          isPremiumBonus: false,
          createdAt: new Date(),
        },
      ];

      mockService.getTransactionHistory.mockResolvedValue(mockTransactions);
      mockService.getEarningHistory.mockResolvedValue(mockEarnings);

      const response = await request(app)
        .get('/api/ldao/history')
        .query({ userId: '123e4567-e89b-12d3-a456-426614174000' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toEqual(mockTransactions);
      expect(response.body.data.earnings).toEqual(mockEarnings);
    });

    it('should return 400 for missing userId', async () => {
      const response = await request(app).get('/api/ldao/history');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required parameter: userId');
    });
  });

  describe('GET /api/ldao/payment-methods', () => {
    it('should return supported payment methods', async () => {
      const mockPaymentMethods = [
        { type: 'crypto' as const, token: 'ETH', available: true },
        { type: 'crypto' as const, token: 'USDC', available: true },
        { type: 'fiat' as const, available: true },
      ];

      const mockNetworks = ['ethereum', 'polygon', 'arbitrum'];

      mockService.getSupportedPaymentMethods.mockReturnValue(mockPaymentMethods);
      mockService.getSupportedNetworks.mockReturnValue(mockNetworks);

      const response = await request(app).get('/api/ldao/payment-methods');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          paymentMethods: mockPaymentMethods,
          supportedNetworks: mockNetworks,
        },
      });
    });
  });

  describe('POST /api/ldao/swap', () => {
    it('should successfully swap tokens', async () => {
      const mockResult: SwapResult = {
        success: true,
        txHash: '0xdef...',
        amountOut: 1000,
      };

      mockService.swapOnDEX.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ldao/swap')
        .send({
          fromToken: 'USDC',
          toToken: 'LDAO',
          amount: 10,
          userAddress: '0x789...',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/ldao/swap')
        .send({
          fromToken: 'USDC',
          // Missing toToken, amount, userAddress
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/ldao/bridge', () => {
    it('should successfully bridge tokens', async () => {
      const mockResult: BridgeResult = {
        success: true,
        txHash: '0xghi...',
        bridgeId: 'bridge_123',
      };

      mockService.bridgeTokens.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/ldao/bridge')
        .send({
          fromChain: 'ethereum',
          toChain: 'polygon',
          amount: 500,
          userAddress: '0xabc...',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 for same source and destination chains', async () => {
      const response = await request(app)
        .post('/api/ldao/bridge')
        .send({
          fromChain: 'ethereum',
          toChain: 'ethereum',
          amount: 500,
          userAddress: '0xabc...',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Source and destination chains cannot be the same');
    });
  });

  describe('GET /api/ldao/staking', () => {
    it('should return staking positions', async () => {
      const mockPositions = [
        {
          id: 'stake_1',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 1000,
          lockPeriod: 30,
          aprRate: 0.12,
          startDate: new Date(),
          endDate: new Date(),
          isAutoCompound: true,
          status: 'active' as const,
        },
      ];

      mockService.getStakingPositions.mockResolvedValue(mockPositions);

      const response = await request(app)
        .get('/api/ldao/staking')
        .query({ userId: '123e4567-e89b-12d3-a456-426614174000' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockPositions,
      });
    });
  });

  describe('GET /api/ldao/status', () => {
    it('should return service status', async () => {
      const mockStatus = {
        fiatPayment: true,
        dexIntegration: true,
        earnToOwn: true,
        staking: true,
        bridge: false,
      };

      mockService.getServiceStatus.mockReturnValue(mockStatus);

      const response = await request(app).get('/api/ldao/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.serviceStatus).toEqual(mockStatus);
    });
  });
});