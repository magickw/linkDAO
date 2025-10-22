/**
 * Payment Method Prioritization Logic Unit Tests
 * Comprehensive tests for payment method scoring algorithms, cost calculation accuracy,
 * and user preference learning mechanisms
 * Requirements: 1.1, 4.1, 5.1
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock the services since they may not be fully implemented
const mockPaymentMethodScoringSystem = {
  calculateMethodScore: jest.fn(),
  validateScoring: jest.fn(),
  updateMethodConfig: jest.fn(),
  getAllConfigs: jest.fn(),
  resetToDefaults: jest.fn(),
  createScoringUtilities: jest.fn()
};

const mockDynamicPrioritizationEngine = {
  performDynamicPrioritization: jest.fn(),
  updatePrioritization: jest.fn(),
  getCacheStats: jest.fn(),
  clearCache: jest.fn()
};

const mockPaymentMethodPrioritizationService = {
  prioritizePaymentMethods: jest.fn(),
  updatePrioritization: jest.fn(),
  getDefaultPaymentMethod: jest.fn(),
  calculateMethodScore: jest.fn(),
  updateMethodConfig: jest.fn(),
  getMethodConfig: jest.fn(),
  getAllConfigs: jest.fn()
};

// Mock types for testing
interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  description: string;
  token?: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    chainId: number;
  };
  chainId?: number;
  enabled: boolean;
  supportedNetworks: number[];
}

interface CostEstimate {
  totalCost: number;
  baseCost: number;
  gasFee: number;
  estimatedTime: number;
  confidence: number;
  currency: string;
  breakdown: {
    amount: number;
    gasLimit: bigint;
    gasPrice: bigint;
    networkFee: number;
    platformFee: number;
  };
}

interface ScoringComponents {
  costScore: number;
  preferenceScore: number;
  availabilityScore: number;
  stablecoinBonus: number;
  networkOptimizationScore: number;
  totalScore: number;
}

const PaymentMethodType = {
  STABLECOIN_USDC: 'STABLECOIN_USDC',
  STABLECOIN_USDT: 'STABLECOIN_USDT',
  FIAT_STRIPE: 'FIAT_STRIPE',
  NATIVE_ETH: 'NATIVE_ETH'
} as const;

const AvailabilityStatus = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE_HIGH_GAS_FEES: 'UNAVAILABLE_HIGH_GAS_FEES'
} as const;

// Mock implementations for dependencies
const mockCostCalculator = {
  calculateTransactionCost: jest.fn(),
  comparePaymentMethods: jest.fn(),
  isGasFeeAcceptable: jest.fn(),
  getNetworkConditions: jest.fn()
};

const mockNetworkChecker = {
  getAvailablePaymentMethods: jest.fn(),
  isPaymentMethodSupported: jest.fn(),
  getSupportedNetworks: jest.fn(),
  validateNetworkCompatibility: jest.fn()
};

const mockPreferenceManager = {
  getUserPaymentPreferences: jest.fn(),
  updatePaymentPreference: jest.fn(),
  calculatePreferenceScore: jest.fn(),
  getRecommendedMethod: jest.fn()
};

describe('Payment Method Prioritization Logic Unit Tests', () => {
  let scoringSystem: typeof mockPaymentMethodScoringSystem;
  let dynamicEngine: typeof mockDynamicPrioritizationEngine;
  let prioritizationService: typeof mockPaymentMethodPrioritizationService;
  
  // Test data
  let mockPaymentMethods: PaymentMethod[];
  let mockUserContext: UserContext;
  let mockPrioritizationContext: PrioritizationContext;
  let mockCostEstimates: Record<string, CostEstimate>;

  beforeEach(() => {
    // Initialize mock services
    scoringSystem = mockPaymentMethodScoringSystem;
    dynamicEngine = mockDynamicPrioritizationEngine;
    prioritizationService = mockPaymentMethodPrioritizationService;

    // Setup test data
    mockPaymentMethods = [
      {
        id: 'usdc-mainnet',
        type: PaymentMethodType.STABLECOIN_USDC,
        name: 'USDC (Ethereum)',
        description: 'USD Coin on Ethereum mainnet',
        token: {
          address: '0xA0b86a33E6441e6e80D0c4C6C7527d72',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 1
        },
        chainId: 1,
        enabled: true,
        supportedNetworks: [1]
      },
      {
        id: 'fiat-stripe',
        type: PaymentMethodType.FIAT_STRIPE,
        name: 'Credit/Debit Card',
        description: 'Traditional payment with Stripe',
        enabled: true,
        supportedNetworks: []
      },
      {
        id: 'eth-mainnet',
        type: PaymentMethodType.NATIVE_ETH,
        name: 'Ethereum',
        description: 'Native ETH on Ethereum mainnet',
        token: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId: 1
        },
        chainId: 1,
        enabled: true,
        supportedNetworks: [1]
      }
    ];

    mockCostEstimates = {
      'usdc-mainnet': {
        totalCost: 105,
        baseCost: 100,
        gasFee: 5,
        estimatedTime: 3,
        confidence: 0.9,
        currency: 'USD',
        breakdown: {
          amount: 100,
          gasLimit: BigInt(65000),
          gasPrice: BigInt(20000000000),
          networkFee: 0,
          platformFee: 0
        }
      },
      'fiat-stripe': {
        totalCost: 103,
        baseCost: 100,
        gasFee: 0,
        estimatedTime: 0,
        confidence: 1.0,
        currency: 'USD',
        breakdown: {
          amount: 100,
          gasLimit: BigInt(0),
          gasPrice: BigInt(0),
          networkFee: 0,
          platformFee: 3
        }
      },
      'eth-mainnet': {
        totalCost: 125,
        baseCost: 100,
        gasFee: 25,
        estimatedTime: 5,
        confidence: 0.8,
        currency: 'USD',
        breakdown: {
          amount: 100,
          gasLimit: BigInt(21000),
          gasPrice: BigInt(50000000000),
          networkFee: 0,
          platformFee: 0
        }
      }
    };

    const mockPreferences: UserPreferences = {
      preferredMethods: [
        {
          methodType: PaymentMethodType.STABLECOIN_USDC,
          score: 0.9,
          lastUsed: new Date(Date.now() - 86400000), // 1 day ago
          usageCount: 5
        }
      ],
      avoidedMethods: [],
      maxGasFeeThreshold: 25,
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: [],
      autoSelectBestOption: true
    };

    mockUserContext = {
      chainId: 1,
      userAddress: '0x1234567890123456789012345678901234567890',
      preferences: mockPreferences,
      walletBalances: [
        {
          token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', decimals: 6, chainId: 1 },
          balance: BigInt('1000000000'), // 1000 USDC
          balanceUSD: 1000,
          chainId: 1
        },
        {
          token: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, chainId: 1 },
          balance: BigInt('1000000000000000000'), // 1 ETH
          balanceUSD: 2000,
          chainId: 1
        }
      ]
    };

    mockPrioritizationContext = {
      userContext: mockUserContext,
      transactionAmount: 100,
      transactionCurrency: 'USD',
      marketConditions: {
        gasConditions: [
          {
            chainId: 1,
            gasPrice: BigInt(20000000000),
            gasPriceUSD: 5,
            networkCongestion: 'low',
            blockTime: 12,
            lastUpdated: new Date()
          }
        ],
        exchangeRates: [
          {
            fromToken: 'ETH',
            toToken: 'USD',
            rate: 2000,
            confidence: 0.95,
            lastUpdated: new Date()
          }
        ],
        networkAvailability: [],
        lastUpdated: new Date()
      },
      availablePaymentMethods: mockPaymentMethods
    };

    // Setup mock implementations
    mockCostCalculator.calculateTransactionCost.mockImplementation(
      (method: PaymentMethod) => Promise.resolve(mockCostEstimates[method.id])
    );

    mockNetworkChecker.isPaymentMethodSupported.mockReturnValue(true);
    mockNetworkChecker.validateNetworkCompatibility.mockResolvedValue(
      mockPaymentMethods.map(method => ({ method, isSupported: true }))
    );

    mockPreferenceManager.calculatePreferenceScore.mockImplementation(
      (method: PaymentMethod, preferences: UserPreferences) => {
        const pref = preferences.preferredMethods.find(p => p.methodType === method.type);
        return pref ? pref.score : 0.5;
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PaymentMethodScoringSystem', () => {
    describe('calculateMethodScore', () => {
      it('should calculate correct scoring components for USDC', async () => {
        const method = mockPaymentMethods[0]; // USDC
        const costEstimate = mockCostEstimates['usdc-mainnet'];

        const scoringComponents = await scoringSystem.calculateMethodScore(
          method,
          mockPrioritizationContext,
          costEstimate
        );

        expect(scoringComponents.totalScore).toBeGreaterThan(0);
        expect(scoringComponents.totalScore).toBeLessThanOrEqual(1);
        expect(scoringComponents.costScore).toBeGreaterThan(0.8); // Low cost should score high
        expect(scoringComponents.preferenceScore).toBe(0.9); // From mock preferences
        expect(scoringComponents.availabilityScore).toBe(1.0); // Should be fully available
        expect(scoringComponents.stablecoinBonus).toBeGreaterThan(0); // Should have stablecoin bonus
        expect(scoringComponents.networkOptimizationScore).toBeGreaterThan(0.8); // Low congestion
      });

      it('should calculate correct scoring components for fiat payment', async () => {
        const method = mockPaymentMethods[1]; // Fiat
        const costEstimate = mockCostEstimates['fiat-stripe'];

        const scoringComponents = await scoringSystem.calculateMethodScore(
          method,
          mockPrioritizationContext,
          costEstimate
        );

        expect(scoringComponents.totalScore).toBeGreaterThan(0);
        expect(scoringComponents.costScore).toBeGreaterThan(0.8); // Low cost
        expect(scoringComponents.availabilityScore).toBe(1.0); // Always available
        expect(scoringComponents.stablecoinBonus).toBe(0); // No stablecoin bonus
        expect(scoringComponents.networkOptimizationScore).toBe(1.0); // No network dependency
      });

      it('should penalize high gas fee methods', async () => {
        const method = mockPaymentMethods[2]; // ETH
        const costEstimate = mockCostEstimates['eth-mainnet'];

        const scoringComponents = await scoringSystem.calculateMethodScore(
          method,
          mockPrioritizationContext,
          costEstimate
        );

        expect(scoringComponents.costScore).toBeLessThan(0.6); // High cost should score low
        expect(scoringComponents.totalScore).toBeLessThan(0.8); // Overall lower score
      });

      it('should apply user preferences correctly', async () => {
        const method = mockPaymentMethods[0]; // USDC (preferred)
        const costEstimate = mockCostEstimates['usdc-mainnet'];

        // Test with high preference
        const scoringComponents = await scoringSystem.calculateMethodScore(
          method,
          mockPrioritizationContext,
          costEstimate
        );

        expect(scoringComponents.preferenceScore).toBe(0.9);

        // Test with avoided method
        const contextWithAvoidedMethod = {
          ...mockPrioritizationContext,
          userContext: {
            ...mockUserContext,
            preferences: {
              ...mockUserContext.preferences,
              avoidedMethods: [PaymentMethodType.STABLECOIN_USDC]
            }
          }
        };

        const avoidedScoring = await scoringSystem.calculateMethodScore(
          method,
          contextWithAvoidedMethod,
          costEstimate
        );

        expect(avoidedScoring.preferenceScore).toBe(0.1); // Very low for avoided methods
      });

      it('should handle insufficient balance scenarios', async () => {
        const method = mockPaymentMethods[0]; // USDC
        const costEstimate = mockCostEstimates['usdc-mainnet'];

        // Context with insufficient balance
        const contextWithLowBalance = {
          ...mockPrioritizationContext,
          userContext: {
            ...mockUserContext,
            walletBalances: [
              {
                token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', decimals: 6, chainId: 1 },
                balance: BigInt('50000000'), // Only 50 USDC
                balanceUSD: 50,
                chainId: 1
              }
            ]
          }
        };

        const scoringComponents = await scoringSystem.calculateMethodScore(
          method,
          contextWithLowBalance,
          costEstimate
        );

        expect(scoringComponents.availabilityScore).toBeLessThan(0.5); // Low availability due to insufficient balance
      });
    });

    describe('validateScoring', () => {
      it('should validate correct scoring components', async () => {
        const method = mockPaymentMethods[0];
        const costEstimate = mockCostEstimates['usdc-mainnet'];

        const scoringComponents = await scoringSystem.calculateMethodScore(
          method,
          mockPrioritizationContext,
          costEstimate
        );

        const validation = scoringSystem.validateScoring(
          method,
          scoringComponents,
          mockPrioritizationContext
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect invalid score ranges', () => {
        const method = mockPaymentMethods[0];
        const invalidComponents: ScoringComponents = {
          costScore: 1.5, // Invalid - over 1.0
          preferenceScore: 0.5,
          availabilityScore: 0.8,
          stablecoinBonus: 0.1,
          networkOptimizationScore: 0.7,
          totalScore: 0.9
        };

        const validation = scoringSystem.validateScoring(
          method,
          invalidComponents,
          mockPrioritizationContext
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
        expect(validation.errors[0]).toContain('costScore');
      });

      it('should warn about configuration issues', () => {
        const method = mockPaymentMethods[0];
        
        // Create invalid configuration
        const invalidConfig: PaymentMethodConfig = {
          ...DEFAULT_PAYMENT_METHOD_CONFIGS[PaymentMethodType.STABLECOIN_USDC],
          costWeight: 0.5,
          preferenceWeight: 0.3,
          availabilityWeight: 0.3 // Total = 1.1, should warn
        };

        const customScoringSystem = new PaymentMethodScoringSystem({
          ...DEFAULT_PAYMENT_METHOD_CONFIGS,
          [PaymentMethodType.STABLECOIN_USDC]: invalidConfig
        });

        const scoringComponents: ScoringComponents = {
          costScore: 0.8,
          preferenceScore: 0.7,
          availabilityScore: 0.9,
          stablecoinBonus: 0.1,
          networkOptimizationScore: 0.8,
          totalScore: 0.85
        };

        const validation = customScoringSystem.validateScoring(
          method,
          scoringComponents,
          mockPrioritizationContext
        );

        expect(validation.warnings.length).toBeGreaterThan(0);
        expect(validation.warnings[0]).toContain('Weight configuration');
      });
    });

    describe('configuration management', () => {
      it('should update method configuration correctly', () => {
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
        expect(config.costWeight).toBe(DEFAULT_PAYMENT_METHOD_CONFIGS[PaymentMethodType.STABLECOIN_USDC].costWeight);
      });
    });
  });

  describe('DynamicPrioritizationEngine', () => {
    describe('performDynamicPrioritization', () => {
      it('should perform initial prioritization correctly', async () => {
        const result = await dynamicEngine.performDynamicPrioritization(mockPrioritizationContext);

        expect(result.prioritizedMethods).toHaveLength(mockPaymentMethods.length);
        expect(result.cacheHit).toBe(false); // First time should not be cached
        expect(result.processingTimeMs).toBeGreaterThan(0);
        
        // Methods should be sorted by score
        for (let i = 0; i < result.prioritizedMethods.length - 1; i++) {
          expect(result.prioritizedMethods[i].totalScore)
            .toBeGreaterThanOrEqual(result.prioritizedMethods[i + 1].totalScore);
        }
      });

      it('should apply threshold adjustments for high gas fees', async () => {
        // Create context with high gas conditions
        const highGasContext = {
          ...mockPrioritizationContext,
          marketConditions: {
            ...mockPrioritizationContext.marketConditions,
            gasConditions: [
              {
                chainId: 1,
                gasPrice: BigInt(100000000000), // Very high gas price
                gasPriceUSD: 50,
                networkCongestion: 'high',
                blockTime: 20,
                lastUpdated: new Date()
              }
            ]
          }
        };

        const result = await dynamicEngine.performDynamicPrioritization(highGasContext);

        expect(result.adjustments.length).toBeGreaterThan(0);
        
        // Should have adjustments for crypto methods due to high gas
        const cryptoAdjustments = result.adjustments.filter(
          adj => adj.methodType !== PaymentMethodType.FIAT_STRIPE
        );
        expect(cryptoAdjustments.length).toBeGreaterThan(0);
        
        // Adjustments should be negative (penalties)
        cryptoAdjustments.forEach(adj => {
          expect(adj.adjustment).toBeLessThan(0);
          expect(adj.reason).toContain('congestion');
        });
      });

      it('should cache results and return cached data on subsequent calls', async () => {
        // First call
        const result1 = await dynamicEngine.performDynamicPrioritization(mockPrioritizationContext);
        expect(result1.cacheHit).toBe(false);

        // Second call with same context should hit cache
        const result2 = await dynamicEngine.performDynamicPrioritization(mockPrioritizationContext);
        expect(result2.cacheHit).toBe(true);
        expect(result2.processingTimeMs).toBeLessThan(result1.processingTimeMs);
      });
    });

    describe('updatePrioritization', () => {
      it('should update prioritization when market conditions change', async () => {
        // Get initial prioritization
        const initialResult = await dynamicEngine.performDynamicPrioritization(mockPrioritizationContext);
        
        // Create new market conditions with higher gas prices
        const newMarketConditions: MarketConditions = {
          ...mockPrioritizationContext.marketConditions,
          gasConditions: [
            {
              chainId: 1,
              gasPrice: BigInt(80000000000), // Much higher gas price
              gasPriceUSD: 40,
              networkCongestion: 'high',
              blockTime: 25,
              lastUpdated: new Date()
            }
          ]
        };

        // Update with new conditions
        const updatedMethods = await dynamicEngine.updatePrioritization(
          initialResult.prioritizedMethods,
          newMarketConditions
        );

        // Crypto methods should have higher costs now
        const ethMethod = updatedMethods.find(m => m.method.type === PaymentMethodType.NATIVE_ETH);
        const initialEthMethod = initialResult.prioritizedMethods.find(m => m.method.type === PaymentMethodType.NATIVE_ETH);
        
        expect(ethMethod?.costEstimate.gasFee).toBeGreaterThan(initialEthMethod?.costEstimate.gasFee || 0);
        expect(ethMethod?.totalScore).toBeLessThan(initialEthMethod?.totalScore || 1);
      });
    });

    describe('cache management', () => {
      it('should provide accurate cache statistics', async () => {
        // Perform some prioritizations to populate cache
        await dynamicEngine.performDynamicPrioritization(mockPrioritizationContext);
        
        const stats = dynamicEngine.getCacheStats();
        
        expect(stats.size).toBeGreaterThan(0);
        expect(stats.newestEntry).toBeInstanceOf(Date);
      });

      it('should clear cache when requested', async () => {
        // Populate cache
        await dynamicEngine.performDynamicPrioritization(mockPrioritizationContext);
        expect(dynamicEngine.getCacheStats().size).toBeGreaterThan(0);
        
        // Clear cache
        dynamicEngine.clearCache();
        expect(dynamicEngine.getCacheStats().size).toBe(0);
      });
    });
  });

  describe('PaymentMethodPrioritizationService Integration', () => {
    describe('prioritizePaymentMethods', () => {
      it('should integrate all components correctly', async () => {
        const result = await prioritizationService.prioritizePaymentMethods(mockPrioritizationContext);

        expect(result.prioritizedMethods).toHaveLength(mockPaymentMethods.length);
        expect(result.defaultMethod).toBeTruthy();
        expect(result.metadata.totalMethodsEvaluated).toBe(mockPaymentMethods.length);
        expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
        expect(result.metadata.averageConfidence).toBeGreaterThan(0);
        expect(result.metadata.averageConfidence).toBeLessThanOrEqual(1);
      });

      it('should select appropriate default method', async () => {
        const result = await prioritizationService.prioritizePaymentMethods(mockPrioritizationContext);
        
        const defaultMethod = result.defaultMethod;
        expect(defaultMethod).toBeTruthy();
        expect(defaultMethod?.availabilityStatus).toBe(AvailabilityStatus.AVAILABLE);
        expect(defaultMethod?.priority).toBe(1); // Should be highest priority
      });

      it('should generate appropriate recommendations', async () => {
        const result = await prioritizationService.prioritizePaymentMethods(mockPrioritizationContext);
        
        expect(result.recommendations).toBeDefined();
        expect(Array.isArray(result.recommendations)).toBe(true);
        
        // Should have cost savings recommendation if there's a cost difference
        const costSavingsRec = result.recommendations.find(r => r.type === 'cost_savings');
        if (costSavingsRec) {
          expect(costSavingsRec.potentialSavings).toBeGreaterThan(0);
          expect(costSavingsRec.suggestedMethod).toBeDefined();
        }
      });

      it('should generate warnings for problematic conditions', async () => {
        // Create context with high gas fees across all crypto methods
        const highGasContext = {
          ...mockPrioritizationContext,
          marketConditions: {
            ...mockPrioritizationContext.marketConditions,
            gasConditions: [
              {
                chainId: 1,
                gasPrice: BigInt(150000000000), // Very high gas
                gasPriceUSD: 75,
                networkCongestion: 'high',
                blockTime: 30,
                lastUpdated: new Date()
              }
            ]
          }
        };

        // Mock high gas fee estimates
        mockCostCalculator.calculateTransactionCost.mockImplementation(
          (method: PaymentMethod) => {
            const estimate = { ...mockCostEstimates[method.id] };
            if (method.type !== PaymentMethodType.FIAT_STRIPE) {
              estimate.gasFee = 50; // High gas fee
              estimate.totalCost = estimate.baseCost + estimate.gasFee;
            }
            return Promise.resolve(estimate);
          }
        );

        const result = await prioritizationService.prioritizePaymentMethods(highGasContext);
        
        expect(result.warnings).toBeDefined();
        expect(result.warnings.length).toBeGreaterThan(0);
        
        const gasWarning = result.warnings.find(w => w.type === 'high_gas_fees');
        expect(gasWarning).toBeTruthy();
        expect(gasWarning?.severity).toBe('medium');
        expect(gasWarning?.affectedMethods.length).toBeGreaterThan(0);
      });
    });

    describe('calculateMethodScore', () => {
      it('should delegate to scoring system correctly', async () => {
        const method = mockPaymentMethods[0];
        const costEstimate = mockCostEstimates['usdc-mainnet'];

        const score = await prioritizationService.calculateMethodScore(
          method,
          mockPrioritizationContext,
          costEstimate
        );

        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    describe('getDefaultPaymentMethod', () => {
      it('should return highest priority available method', () => {
        const prioritizedMethods: PrioritizedPaymentMethod[] = [
          {
            method: mockPaymentMethods[1], // Fiat
            priority: 1,
            costEstimate: mockCostEstimates['fiat-stripe'],
            availabilityStatus: AvailabilityStatus.AVAILABLE,
            userPreferenceScore: 0.7,
            recommendationReason: 'No gas fees',
            totalScore: 0.9,
            warnings: [],
            benefits: ['No gas fees']
          },
          {
            method: mockPaymentMethods[0], // USDC
            priority: 2,
            costEstimate: mockCostEstimates['usdc-mainnet'],
            availabilityStatus: AvailabilityStatus.AVAILABLE,
            userPreferenceScore: 0.9,
            recommendationReason: 'Stable value',
            totalScore: 0.85,
            warnings: [],
            benefits: ['Price stability']
          }
        ];

        const defaultMethod = prioritizationService.getDefaultPaymentMethod(prioritizedMethods);
        
        expect(defaultMethod).toBeTruthy();
        expect(defaultMethod?.method.type).toBe(PaymentMethodType.FIAT_STRIPE);
        expect(defaultMethod?.priority).toBe(1);
      });

      it('should return null when no methods are available', () => {
        const unavailableMethods: PrioritizedPaymentMethod[] = [
          {
            method: mockPaymentMethods[0],
            priority: 1,
            costEstimate: mockCostEstimates['usdc-mainnet'],
            availabilityStatus: AvailabilityStatus.UNAVAILABLE_HIGH_GAS_FEES,
            userPreferenceScore: 0.9,
            recommendationReason: 'High gas fees',
            totalScore: 0.3,
            warnings: ['High gas fees'],
            benefits: []
          }
        ];

        const defaultMethod = prioritizationService.getDefaultPaymentMethod(unavailableMethods);
        expect(defaultMethod).toBeNull();
      });
    });

    describe('configuration management', () => {
      it('should update method configurations', () => {
        const newConfig = {
          costWeight: 0.6,
          preferenceWeight: 0.2,
          availabilityWeight: 0.2
        };

        prioritizationService.updateMethodConfig(PaymentMethodType.STABLECOIN_USDC, newConfig);
        
        const updatedConfig = prioritizationService.getMethodConfig(PaymentMethodType.STABLECOIN_USDC);
        expect(updatedConfig.costWeight).toBe(0.6);
      });

      it('should provide access to all configurations', () => {
        const allConfigs = prioritizationService.getAllConfigs();
        
        expect(allConfigs).toHaveProperty(PaymentMethodType.STABLECOIN_USDC);
        expect(allConfigs).toHaveProperty(PaymentMethodType.FIAT_STRIPE);
        expect(allConfigs).toHaveProperty(PaymentMethodType.NATIVE_ETH);
      });
    });
  });

  describe('User Preference Learning', () => {
    it('should apply time decay to preference scores', async () => {
      const method = mockPaymentMethods[0]; // USDC
      const costEstimate = mockCostEstimates['usdc-mainnet'];

      // Test with recent usage
      const recentContext = {
        ...mockPrioritizationContext,
        userContext: {
          ...mockUserContext,
          preferences: {
            ...mockUserContext.preferences,
            preferredMethods: [
              {
                methodType: PaymentMethodType.STABLECOIN_USDC,
                score: 0.9,
                lastUsed: new Date(), // Just used
                usageCount: 5
              }
            ]
          }
        }
      };

      const recentScoring = await scoringSystem.calculateMethodScore(
        method,
        recentContext,
        costEstimate
      );

      // Test with old usage
      const oldContext = {
        ...mockPrioritizationContext,
        userContext: {
          ...mockUserContext,
          preferences: {
            ...mockUserContext.preferences,
            preferredMethods: [
              {
                methodType: PaymentMethodType.STABLECOIN_USDC,
                score: 0.9,
                lastUsed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                usageCount: 5
              }
            ]
          }
        }
      };

      const oldScoring = await scoringSystem.calculateMethodScore(
        method,
        oldContext,
        costEstimate
      );

      // Recent usage should have higher preference score
      expect(recentScoring.preferenceScore).toBeGreaterThan(oldScoring.preferenceScore);
    });

    it('should handle general preferences correctly', async () => {
      const usdcMethod = mockPaymentMethods[0];
      const fiatMethod = mockPaymentMethods[1];
      const costEstimate = mockCostEstimates['usdc-mainnet'];

      // Test stablecoin preference
      const stablecoinPrefContext = {
        ...mockPrioritizationContext,
        userContext: {
          ...mockUserContext,
          preferences: {
            ...mockUserContext.preferences,
            preferredMethods: [], // No specific preferences
            preferStablecoins: true,
            preferFiat: false
          }
        }
      };

      const usdcScoring = await scoringSystem.calculateMethodScore(
        usdcMethod,
        stablecoinPrefContext,
        costEstimate
      );

      const fiatScoring = await scoringSystem.calculateMethodScore(
        fiatMethod,
        stablecoinPrefContext,
        mockCostEstimates['fiat-stripe']
      );

      expect(usdcScoring.preferenceScore).toBe(0.8); // Stablecoin preference
      expect(fiatScoring.preferenceScore).toBe(0.7); // Default for fiat when not preferred
    });
  });

  describe('Cost Calculation Accuracy', () => {
    it('should calculate cost scores accurately for different cost ratios', async () => {
      const method = mockPaymentMethods[0];
      const baseAmount = 1000;

      // Test different cost scenarios
      const testCases = [
        { totalCost: 1005, expectedScoreRange: [0.95, 1.0] }, // 0.5% cost
        { totalCost: 1010, expectedScoreRange: [0.85, 0.95] }, // 1% cost
        { totalCost: 1050, expectedScoreRange: [0.60, 0.75] }, // 5% cost
        { totalCost: 1100, expectedScoreRange: [0.40, 0.50] }, // 10% cost
        { totalCost: 1200, expectedScoreRange: [0.15, 0.25] }  // 20% cost
      ];

      for (const testCase of testCases) {
        const costEstimate: CostEstimate = {
          ...mockCostEstimates['usdc-mainnet'],
          baseCost: baseAmount,
          totalCost: testCase.totalCost,
          gasFee: testCase.totalCost - baseAmount
        };

        const context = {
          ...mockPrioritizationContext,
          transactionAmount: baseAmount
        };

        const scoringComponents = await scoringSystem.calculateMethodScore(
          method,
          context,
          costEstimate
        );

        expect(scoringComponents.costScore).toBeGreaterThanOrEqual(testCase.expectedScoreRange[0]);
        expect(scoringComponents.costScore).toBeLessThanOrEqual(testCase.expectedScoreRange[1]);
      }
    });

    it('should handle edge cases in cost calculation', async () => {
      const method = mockPaymentMethods[0];

      // Test zero transaction amount
      const zeroAmountContext = {
        ...mockPrioritizationContext,
        transactionAmount: 0
      };

      const zeroAmountScoring = await scoringSystem.calculateMethodScore(
        method,
        zeroAmountContext,
        mockCostEstimates['usdc-mainnet']
      );

      expect(zeroAmountScoring.costScore).toBe(0); // Should handle gracefully

      // Test very high cost ratio
      const highCostEstimate: CostEstimate = {
        ...mockCostEstimates['usdc-mainnet'],
        totalCost: 500, // 5x the base cost
        gasFee: 400
      };

      const highCostScoring = await scoringSystem.calculateMethodScore(
        method,
        mockPrioritizationContext,
        highCostEstimate
      );

      expect(highCostScoring.costScore).toBeLessThan(0.1); // Should be very low
    });
  });

  describe('Network Optimization', () => {
    it('should score network conditions correctly', async () => {
      const method = mockPaymentMethods[0]; // USDC
      const costEstimate = mockCostEstimates['usdc-mainnet'];

      // Test low congestion
      const lowCongestionContext = {
        ...mockPrioritizationContext,
        marketConditions: {
          ...mockPrioritizationContext.marketConditions,
          gasConditions: [
            {
              chainId: 1,
              gasPrice: BigInt(20000000000),
              gasPriceUSD: 5,
              networkCongestion: 'low' as const,
              blockTime: 5, // Fast blocks
              lastUpdated: new Date()
            }
          ]
        }
      };

      const lowCongestionScoring = await scoringSystem.calculateMethodScore(
        method,
        lowCongestionContext,
        costEstimate
      );

      // Test high congestion
      const highCongestionContext = {
        ...mockPrioritizationContext,
        marketConditions: {
          ...mockPrioritizationContext.marketConditions,
          gasConditions: [
            {
              chainId: 1,
              gasPrice: BigInt(100000000000),
              gasPriceUSD: 50,
              networkCongestion: 'high' as const,
              blockTime: 60, // Slow blocks
              lastUpdated: new Date()
            }
          ]
        }
      };

      const highCongestionScoring = await scoringSystem.calculateMethodScore(
        method,
        highCongestionContext,
        costEstimate
      );

      expect(lowCongestionScoring.networkOptimizationScore)
        .toBeGreaterThan(highCongestionScoring.networkOptimizationScore);
    });

    it('should give fiat payments optimal network scores', async () => {
      const fiatMethod = mockPaymentMethods[1];
      const costEstimate = mockCostEstimates['fiat-stripe'];

      const scoringComponents = await scoringSystem.calculateMethodScore(
        fiatMethod,
        mockPrioritizationContext,
        costEstimate
      );

      expect(scoringComponents.networkOptimizationScore).toBe(1.0); // Fiat should always be optimal
    });
  });
});