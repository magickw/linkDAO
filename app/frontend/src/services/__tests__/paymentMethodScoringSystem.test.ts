/**
 * Payment Method Scoring System Tests
 * Basic validation tests for the scoring system implementation
 */

import PaymentMethodScoringSystem from '../paymentMethodScoringSystem';
import {
  PaymentMethod,
  PaymentMethodType,
  CostEstimate,
  PrioritizationContext,
  UserPreferences,
  AvailabilityStatus
} from '../../types/paymentPrioritization';

describe('PaymentMethodScoringSystem', () => {
  let scoringSystem: PaymentMethodScoringSystem;
  let mockMethod: PaymentMethod;
  let mockContext: PrioritizationContext;
  let mockCostEstimate: CostEstimate;

  beforeEach(() => {
    scoringSystem = new PaymentMethodScoringSystem();
    
    mockMethod = {
      id: 'usdc-mainnet',
      type: PaymentMethodType.STABLECOIN_USDC,
      name: 'USDC (Ethereum)',
      description: 'USD Coin on Ethereum mainnet',
      chainId: 1,
      enabled: true,
      supportedNetworks: [1]
    };

    mockCostEstimate = {
      totalCost: 105,
      baseCost: 100,
      gasFee: 5,
      estimatedTime: 3,
      confidence: 0.9,
      currency: 'USD',
      breakdown: {
        amount: 100,
        gasLimit: BigInt(21000),
        gasPrice: BigInt(20000000000),
        networkFee: 0,
        platformFee: 0
      }
    };

    const mockPreferences: UserPreferences = {
      preferredMethods: [],
      avoidedMethods: [],
      maxGasFeeThreshold: 25,
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: [],
      autoSelectBestOption: true
    };

    mockContext = {
      userContext: {
        chainId: 1,
        preferences: mockPreferences,
        walletBalances: [{
          token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', decimals: 6, chainId: 1 },
          balance: BigInt('1000000000'), // 1000 USDC
          balanceUSD: 1000,
          chainId: 1
        }]
      },
      transactionAmount: 100,
      transactionCurrency: 'USD',
      marketConditions: {
        gasConditions: [{
          chainId: 1,
          gasPrice: BigInt(20000000000),
          gasPriceUSD: 5,
          networkCongestion: 'low',
          blockTime: 12,
          lastUpdated: new Date()
        }],
        exchangeRates: [],
        networkAvailability: [],
        lastUpdated: new Date()
      },
      availablePaymentMethods: [mockMethod]
    };
  });

  describe('calculateMethodScore', () => {
    it('should calculate score for USDC method', async () => {
      const scoringComponents = await scoringSystem.calculateMethodScore(
        mockMethod,
        mockContext,
        mockCostEstimate
      );

      expect(scoringComponents.totalScore).toBeGreaterThan(0);
      expect(scoringComponents.totalScore).toBeLessThanOrEqual(1);
      expect(scoringComponents.costScore).toBeGreaterThan(0);
      expect(scoringComponents.availabilityScore).toBeGreaterThan(0);
      expect(scoringComponents.stablecoinBonus).toBeGreaterThan(0); // Should have stablecoin bonus
    });

    it('should give higher score to lower cost methods', async () => {
      const lowCostEstimate = { ...mockCostEstimate, totalCost: 101, gasFee: 1 };
      const highCostEstimate = { ...mockCostEstimate, totalCost: 120, gasFee: 20 };

      const lowCostScore = await scoringSystem.calculateMethodScore(
        mockMethod,
        mockContext,
        lowCostEstimate
      );

      const highCostScore = await scoringSystem.calculateMethodScore(
        mockMethod,
        mockContext,
        highCostEstimate
      );

      expect(lowCostScore.costScore).toBeGreaterThan(highCostScore.costScore);
    });

    it('should apply stablecoin bonus correctly', async () => {
      const usdcMethod = { ...mockMethod, type: PaymentMethodType.STABLECOIN_USDC };
      const ethMethod = { ...mockMethod, type: PaymentMethodType.NATIVE_ETH };

      const usdcScore = await scoringSystem.calculateMethodScore(
        usdcMethod,
        mockContext,
        mockCostEstimate
      );

      const ethScore = await scoringSystem.calculateMethodScore(
        ethMethod,
        mockContext,
        mockCostEstimate
      );

      expect(usdcScore.stablecoinBonus).toBeGreaterThan(0);
      expect(ethScore.stablecoinBonus).toBe(0);
    });
  });

  describe('validateScoring', () => {
    it('should validate correct scoring components', async () => {
      const scoringComponents = await scoringSystem.calculateMethodScore(
        mockMethod,
        mockContext,
        mockCostEstimate
      );

      const validation = scoringSystem.validateScoring(
        mockMethod,
        scoringComponents,
        mockContext
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid score ranges', () => {
      const invalidComponents = {
        costScore: 1.5, // Invalid - over 1.0
        preferenceScore: 0.5,
        availabilityScore: 0.8,
        stablecoinBonus: 0.1,
        networkOptimizationScore: 0.7,
        totalScore: 0.9
      };

      const validation = scoringSystem.validateScoring(
        mockMethod,
        invalidComponents,
        mockContext
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('configuration management', () => {
    it('should update method configuration', () => {
      const newConfig = {
        costWeight: 0.5,
        preferenceWeight: 0.3,
        availabilityWeight: 0.2
      };

      scoringSystem.updateMethodConfig(PaymentMethodType.STABLECOIN_USDC, newConfig);
      
      const updatedConfig = scoringSystem.getAllConfigs()[PaymentMethodType.STABLECOIN_USDC];
      expect(updatedConfig.costWeight).toBe(0.5);
      expect(updatedConfig.preferenceWeight).toBe(0.3);
      expect(updatedConfig.availabilityWeight).toBe(0.2);
    });

    it('should reset to default configurations', () => {
      // Modify config
      scoringSystem.updateMethodConfig(PaymentMethodType.STABLECOIN_USDC, { costWeight: 0.9 });
      
      // Reset
      scoringSystem.resetToDefaults();
      
      const config = scoringSystem.getAllConfigs()[PaymentMethodType.STABLECOIN_USDC];
      expect(config.costWeight).toBe(0.4); // Default value
    });
  });
});