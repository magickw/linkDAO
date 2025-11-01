import { LDAOAcquisitionService, IPaymentProcessor, IDEXIntegration, IEarningEngine, IPricingEngine } from '../services/ldaoAcquisitionService';
import { LDAOAcquisitionConfigManager } from '../config/ldaoAcquisitionConfig';
import { PurchaseRequest, EarnRequest, PurchaseResult, EarnResult, SwapResult, PriceQuote, PaymentMethod } from '../types/ldaoAcquisition';

// Mock implementations for testing
class MockPaymentProcessor implements IPaymentProcessor {
  async processPayment(request: PurchaseRequest): Promise<PurchaseResult> {
    if (request.amount > 10000) {
      return {
        success: false,
        error: 'Amount exceeds limit',
      };
    }

    return {
      success: true,
      transactionId: `mock_tx_${Date.now()}`,
      estimatedTokens: request.amount,
      finalPrice: request.amount * 0.01,
    };
  }

  getSupportedMethods(): PaymentMethod[] {
    return [
      { type: 'fiat', available: true, fees: 0.03 },
    ];
  }
}

class MockDEXIntegration implements IDEXIntegration {
  async getQuote(fromToken: string, toToken: string, amount: number): Promise<PriceQuote> {
    return {
      pricePerToken: 0.01,
      totalPrice: amount * 0.01,
      discount: 0,
      discountPercentage: 0,
      validUntil: new Date(Date.now() + 300000), // 5 minutes
    };
  }

  async executeSwap(fromToken: string, toToken: string, amount: number, userAddress: string): Promise<SwapResult> {
    if (amount > 1000) {
      return {
        success: false,
        error: 'Insufficient liquidity',
      };
    }

    return {
      success: true,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      amountOut: amount * 100, // Mock 1:100 ratio
    };
  }
}

class MockEarningEngine implements IEarningEngine {
  async calculateRewards(request: EarnRequest): Promise<number> {
    const baseRewards = {
      post: 10,
      comment: 5,
      referral: 25,
      marketplace: 15,
    };

    return baseRewards[request.activityType] || 0;
  }

  async distributeRewards(request: EarnRequest): Promise<EarnResult> {
    const tokensEarned = await this.calculateRewards(request);
    const multiplier = request.activityType === 'referral' ? 2.0 : 1.0;

    return {
      success: true,
      tokensEarned: tokensEarned * multiplier,
      multiplier,
    };
  }
}

class MockPricingEngine implements IPricingEngine {
  async getCurrentPrice(): Promise<number> {
    return 0.01; // $0.01 per LDAO
  }

  async getQuote(amount: number, paymentToken: string): Promise<PriceQuote> {
    const basePrice = 0.01;
    const discount = this.applyVolumeDiscount(amount);
    const discountedPrice = basePrice * (1 - discount);

    return {
      pricePerToken: discountedPrice,
      totalPrice: amount * discountedPrice,
      discount: amount * basePrice * discount,
      discountPercentage: discount * 100,
      validUntil: new Date(Date.now() + 300000),
    };
  }

  applyVolumeDiscount(amount: number): number {
    if (amount >= 50000) return 0.15;
    if (amount >= 25000) return 0.12;
    if (amount >= 10000) return 0.10;
    if (amount >= 5000) return 0.08;
    if (amount >= 1000) return 0.05;
    return 0;
  }
}

describe('LDAOAcquisitionService Integration Tests', () => {
  let service: LDAOAcquisitionService;
  let configManager: LDAOAcquisitionConfigManager;
  let mockPaymentProcessor: MockPaymentProcessor;
  let mockDEXIntegration: MockDEXIntegration;
  let mockEarningEngine: MockEarningEngine;
  let mockPricingEngine: MockPricingEngine;

  beforeEach(() => {
    // Create mock config manager
    configManager = new LDAOAcquisitionConfigManager();
    
    // Override config for testing
    configManager.updateConfig({
      treasuryContract: '0x123...',
      supportedTokens: ['ETH', 'USDC', 'USDT'],
      supportedNetworks: ['ethereum', 'polygon'],
      fiatPaymentEnabled: true,
      dexIntegrationEnabled: true,
      earnToOwnEnabled: true,
      stakingEnabled: true,
      bridgeEnabled: false,
    });

    // Create mock dependencies
    mockPaymentProcessor = new MockPaymentProcessor();
    mockDEXIntegration = new MockDEXIntegration();
    mockEarningEngine = new MockEarningEngine();
    mockPricingEngine = new MockPricingEngine();

    // Create service with dependencies
    service = new LDAOAcquisitionService(configManager, {
      paymentProcessor: mockPaymentProcessor,
      dexIntegration: mockDEXIntegration,
      earningEngine: mockEarningEngine,
      pricingEngine: mockPricingEngine,
    });
  });

  describe('Fiat Purchase Flow', () => {
    it('should successfully process fiat purchase', async () => {
      const request: PurchaseRequest = {
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      };

      const result = await service.purchaseWithFiat(request);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.estimatedTokens).toBe(1000);
      expect(result.finalPrice).toBe(10);
    });

    it('should handle fiat purchase limits', async () => {
      const request: PurchaseRequest = {
        amount: 15000, // Exceeds mock limit
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      };

      const result = await service.purchaseWithFiat(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount exceeds limit');
    });

    it('should fail when fiat payment is disabled', async () => {
      configManager.updateConfig({ fiatPaymentEnabled: false });

      const request: PurchaseRequest = {
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      };

      const result = await service.purchaseWithFiat(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fiat payment is not enabled');
    });
  });

  describe('Crypto Purchase Flow', () => {
    it('should successfully process crypto purchase', async () => {
      const request: PurchaseRequest = {
        amount: 500,
        paymentMethod: 'crypto',
        paymentToken: 'ETH',
        userAddress: '0x456...',
      };

      const result = await service.purchaseWithCrypto(request);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.estimatedTokens).toBe(500);
      expect(result.finalPrice).toBe(5); // 500 * 0.01
    });
  });

  describe('DEX Integration', () => {
    it('should successfully execute DEX swap', async () => {
      const result = await service.swapOnDEX('USDC', 'LDAO', 100, '0x789...');

      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.amountOut).toBe(10000); // 100 * 100 (mock ratio)
    });

    it('should handle insufficient liquidity', async () => {
      const result = await service.swapOnDEX('USDC', 'LDAO', 2000, '0x789...');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient liquidity');
    });

    it('should fail when DEX integration is disabled', async () => {
      configManager.updateConfig({ dexIntegrationEnabled: false });

      const result = await service.swapOnDEX('USDC', 'LDAO', 100, '0x789...');

      expect(result.success).toBe(false);
      expect(result.error).toBe('DEX integration is not enabled');
    });
  });

  describe('Earn-to-Own System', () => {
    it('should successfully earn tokens for post activity', async () => {
      const request: EarnRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'post',
        activityId: 'post_123',
      };

      const result = await service.earnTokens(request);

      expect(result.success).toBe(true);
      expect(result.tokensEarned).toBe(10); // Base reward for post
      expect(result.multiplier).toBe(1.0);
    });

    it('should apply multiplier for referral activity', async () => {
      const request: EarnRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'referral',
        activityId: 'ref_456',
      };

      const result = await service.earnTokens(request);

      expect(result.success).toBe(true);
      expect(result.tokensEarned).toBe(50); // 25 * 2.0 multiplier
      expect(result.multiplier).toBe(2.0);
    });

    it('should fail when earn-to-own is disabled', async () => {
      configManager.updateConfig({ earnToOwnEnabled: false });

      const request: EarnRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        activityType: 'post',
        activityId: 'post_123',
      };

      const result = await service.earnTokens(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Earn-to-own is not enabled');
    });
  });

  describe('Pricing Engine', () => {
    it('should return current price', async () => {
      const price = await service.getCurrentPrice();
      expect(price).toBe(0.01);
    });

    it('should apply volume discounts correctly', async () => {
      const quote = await service.getPriceQuote(10000, 'USDC');

      expect(quote.pricePerToken).toBeCloseTo(0.009, 6); // 0.01 * (1 - 0.10)
      expect(quote.totalPrice).toBeCloseTo(90, 2); // 10000 * 0.009
      expect(quote.discount).toBe(10); // 10000 * 0.01 * 0.10
      expect(quote.discountPercentage).toBe(10);
    });

    it('should handle maximum volume discount', async () => {
      const quote = await service.getPriceQuote(100000, 'ETH');

      expect(quote.pricePerToken).toBeCloseTo(0.0085, 6); // 0.01 * (1 - 0.15)
      expect(quote.discountPercentage).toBe(15);
    });
  });

  describe('Service Status and Configuration', () => {
    it('should return correct service status', () => {
      const status = service.getServiceStatus();

      expect(status.fiatPayment).toBe(true);
      expect(status.dexIntegration).toBe(true);
      expect(status.earnToOwn).toBe(true);
      expect(status.staking).toBe(false); // No staking service injected
      expect(status.bridge).toBe(false); // Disabled in config
    });

    it('should return supported payment methods', () => {
      const methods = service.getSupportedPaymentMethods();

      expect(methods).toHaveLength(4); // 3 crypto + 1 fiat
      expect(methods.some(m => m.type === 'crypto' && m.token === 'ETH')).toBe(true);
      expect(methods.some(m => m.type === 'crypto' && m.token === 'USDC')).toBe(true);
      expect(methods.some(m => m.type === 'crypto' && m.token === 'USDT')).toBe(true);
      expect(methods.some(m => m.type === 'fiat')).toBe(true);
    });

    it('should return supported networks', () => {
      const networks = service.getSupportedNetworks();

      expect(networks).toEqual(['ethereum', 'polygon']);
    });
  });

  describe('Bridge Operations', () => {
    it('should fail when bridge is disabled', async () => {
      const result = await service.bridgeTokens('ethereum', 'polygon', 1000, '0xabc...');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bridge is not enabled');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing pricing engine', async () => {
      const serviceWithoutPricing = new LDAOAcquisitionService(configManager);

      await expect(serviceWithoutPricing.getCurrentPrice()).rejects.toThrow('Pricing engine not configured');
    });

    it('should handle missing payment processor', async () => {
      const serviceWithoutPayment = new LDAOAcquisitionService(configManager);

      const request: PurchaseRequest = {
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      };

      const result = await serviceWithoutPayment.purchaseWithFiat(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment processor not configured');
    });
  });

  describe('Dependency Injection', () => {
    it('should allow setting dependencies after construction', async () => {
      const newService = new LDAOAcquisitionService(configManager);
      
      // Initially should fail
      const initialResult = await newService.purchaseWithFiat({
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      });
      expect(initialResult.success).toBe(false);

      // Set dependency and try again
      newService.setPaymentProcessor(mockPaymentProcessor);
      newService.setPricingEngine(mockPricingEngine);

      const finalResult = await newService.purchaseWithFiat({
        amount: 1000,
        paymentMethod: 'fiat',
        userAddress: '0x123...',
      });
      expect(finalResult.success).toBe(true);
    });
  });
});
