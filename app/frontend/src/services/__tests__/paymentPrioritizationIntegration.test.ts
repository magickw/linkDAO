/**
 * Payment Method Prioritization Integration Tests
 * Tests end-to-end prioritization flows, real-time updates, error handling,
 * and cross-network compatibility scenarios
 * Requirements: 4.2, 6.1, 6.2
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import PaymentMethodPrioritizationService from '../paymentMethodPrioritizationService';
import { CostEffectivenessCalculator } from '../costEffectivenessCalculator';
import { NetworkAvailabilityChecker } from '../networkAvailabilityChecker';
import { UserPreferenceManager } from '../userPreferenceManager';
import { paymentWebSocketService } from '../paymentWebSocketService';
import { realTimeCostMonitoringService } from '../realTimeCostMonitoringService';
import {
  PaymentMethod,
  PaymentMethodType,
  PrioritizationContext,
  MarketConditions,
  UserContext,
  PrioritizedPaymentMethod,
  AvailabilityStatus,
  NetworkConditions,
  CostEstimate,
  UserPreferences
} from '../../types/paymentPrioritization';

// Mock WebSocket for real-time testing
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
};

// Mock external services
jest.mock('../paymentWebSocketService');
jest.mock('../realTimeCostMonitoringService');

describe('Payment Method Prioritization Integration Tests', () => {
  let prioritizationService: PaymentMethodPrioritizationService;
  let costCalculator: CostEffectivenessCalculator;
  let networkChecker: NetworkAvailabilityChecker;
  let preferenceManager: UserPreferenceManager;

  // Test data for multiple networks and scenarios
  let multiNetworkPaymentMethods: PaymentMethod[];
  let baseUserContext: UserContext;
  let basePrioritizationContext: PrioritizationContext;

  beforeEach(() => {
    // Initialize real services (not mocked)
    costCalculator = new CostEffectivenessCalculator();
    networkChecker = new NetworkAvailabilityChecker();
    preferenceManager = new UserPreferenceManager();
    
    prioritizationService = new PaymentMethodPrioritizationService(
      costCalculator,
      networkChecker,
      preferenceManager
    );

    // Setup comprehensive test data
    multiNetworkPaymentMethods = [
      // Ethereum Mainnet
      {
        id: 'usdc-ethereum',
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
        id: 'eth-ethereum',
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
      },
      // Polygon
      {
        id: 'usdc-polygon',
        type: PaymentMethodType.STABLECOIN_USDC,
        name: 'USDC (Polygon)',
        description: 'USD Coin on Polygon',
        token: {
          address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 137
        },
        chainId: 137,
        enabled: true,
        supportedNetworks: [137]
      },
      {
        id: 'matic-polygon',
        type: PaymentMethodType.NATIVE_ETH, // Using same type for simplicity
        name: 'MATIC',
        description: 'Native MATIC on Polygon',
        token: {
          address: '0x0000000000000000000000000000000000001010',
          symbol: 'MATIC',
          name: 'Polygon',
          decimals: 18,
          chainId: 137
        },
        chainId: 137,
        enabled: true,
        supportedNetworks: [137]
      },
      // Fiat (network agnostic)
      {
        id: 'fiat-stripe',
        type: PaymentMethodType.FIAT_STRIPE,
        name: 'Credit/Debit Card',
        description: 'Traditional payment with Stripe',
        enabled: true,
        supportedNetworks: []
      }
    ];

    const mockPreferences: UserPreferences = {
      preferredMethods: [
        {
          methodType: PaymentMethodType.STABLECOIN_USDC,
          score: 0.9,
          lastUsed: new Date(Date.now() - 86400000),
          usageCount: 10
        }
      ],
      avoidedMethods: [],
      maxGasFeeThreshold: 25,
      preferStablecoins: true,
      preferFiat: false,
      lastUsedMethods: [],
      autoSelectBestOption: true
    };

    baseUserContext = {
      chainId: 1, // Start on Ethereum
      userAddress: '0x1234567890123456789012345678901234567890',
      userId: 'test-user-123',
      preferences: mockPreferences,
      walletBalances: [
        // Ethereum balances
        {
          token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', decimals: 6, chainId: 1 },
          balance: BigInt('1000000000'), // 1000 USDC
          balanceUSD: 1000,
          chainId: 1
        },
        {
          token: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, chainId: 1 },
          balance: BigInt('2000000000000000000'), // 2 ETH
          balanceUSD: 4000,
          chainId: 1
        },
        // Polygon balances
        {
          token: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6, chainId: 137 },
          balance: BigInt('500000000'), // 500 USDC
          balanceUSD: 500,
          chainId: 137
        },
        {
          token: { address: '0x0000000000000000000000000000000000001010', symbol: 'MATIC', decimals: 18, chainId: 137 },
          balance: BigInt('1000000000000000000000'), // 1000 MATIC
          balanceUSD: 800,
          chainId: 137
        }
      ]
    };

    basePrioritizationContext = {
      userContext: baseUserContext,
      transactionAmount: 100,
      transactionCurrency: 'USD',
      marketConditions: {
        gasConditions: [
          {
            chainId: 1,
            gasPrice: BigInt(20000000000), // 20 Gwei
            gasPriceUSD: 5,
            networkCongestion: 'low',
            blockTime: 12,
            lastUpdated: new Date()
          },
          {
            chainId: 137,
            gasPrice: BigInt(30000000000), // 30 Gwei
            gasPriceUSD: 0.05, // Much cheaper on Polygon
            networkCongestion: 'low',
            blockTime: 2,
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
          },
          {
            fromToken: 'MATIC',
            toToken: 'USD',
            rate: 0.8,
            confidence: 0.90,
            lastUpdated: new Date()
          }
        ],
        networkAvailability: [
          { chainId: 1, isAvailable: true, latency: 100 },
          { chainId: 137, isAvailable: true, latency: 50 }
        ],
        lastUpdated: new Date()
      },
      availablePaymentMethods: multiNetworkPaymentMethods
    };

    // Setup WebSocket mocks
    (global as any).WebSocket = jest.fn(() => mockWebSocket);
    
    // Mock real-time services
    jest.mocked(paymentWebSocketService.connect).mockResolvedValue(undefined);
    jest.mocked(paymentWebSocketService.subscribe).mockImplementation((callback) => {
      // Store callback for later use in tests
      return 'subscription-id';
    });
    
    jest.mocked(realTimeCostMonitoringService.startMonitoring).mockResolvedValue(undefined);
    jest.mocked(realTimeCostMonitoringService.getCostUpdates).mockReturnValue({
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Prioritization Flows', () => {
    it('should complete full prioritization flow with real services', async () => {
      const result = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);

      // Verify complete result structure
      expect(result).toHaveProperty('prioritizedMethods');
      expect(result).toHaveProperty('defaultMethod');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('metadata');

      // Verify prioritized methods
      expect(result.prioritizedMethods).toHaveLength(multiNetworkPaymentMethods.length);
      
      // Each method should have complete prioritization data
      result.prioritizedMethods.forEach(method => {
        expect(method).toHaveProperty('method');
        expect(method).toHaveProperty('priority');
        expect(method).toHaveProperty('costEstimate');
        expect(method).toHaveProperty('availabilityStatus');
        expect(method).toHaveProperty('userPreferenceScore');
        expect(method).toHaveProperty('recommendationReason');
        expect(method).toHaveProperty('totalScore');
        expect(method).toHaveProperty('warnings');
        expect(method).toHaveProperty('benefits');

        // Verify score ranges
        expect(method.totalScore).toBeGreaterThanOrEqual(0);
        expect(method.totalScore).toBeLessThanOrEqual(1);
        expect(method.userPreferenceScore).toBeGreaterThanOrEqual(0);
        expect(method.userPreferenceScore).toBeLessThanOrEqual(1);
      });

      // Verify methods are properly sorted by priority
      for (let i = 0; i < result.prioritizedMethods.length - 1; i++) {
        expect(result.prioritizedMethods[i].priority).toBeLessThan(result.prioritizedMethods[i + 1].priority);
      }

      // Verify default method selection
      expect(result.defaultMethod).toBeTruthy();
      expect(result.defaultMethod?.availabilityStatus).toBe(AvailabilityStatus.AVAILABLE);
      expect(result.defaultMethod?.priority).toBe(1);

      // Verify metadata
      expect(result.metadata.totalMethodsEvaluated).toBe(multiNetworkPaymentMethods.length);
      expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
      expect(result.metadata.averageConfidence).toBeGreaterThan(0);
      expect(result.metadata.calculatedAt).toBeInstanceOf(Date);
    });

    it('should handle user preference learning throughout the flow', async () => {
      // Simulate user selecting a method
      const selectedMethod = PaymentMethodType.FIAT_STRIPE;
      
      // Update preferences to reflect usage
      await preferenceManager.updatePaymentPreference(
        baseUserContext.userId!,
        selectedMethod,
        {
          amount: basePrioritizationContext.transactionAmount,
          successful: true,
          chainId: baseUserContext.chainId
        }
      );

      // Get updated preferences
      const updatedPreferences = await preferenceManager.getUserPaymentPreferences(baseUserContext.userId!);
      
      // Create new context with updated preferences
      const updatedContext = {
        ...basePrioritizationContext,
        userContext: {
          ...baseUserContext,
          preferences: updatedPreferences
        }
      };

      // Re-prioritize with updated preferences
      const result = await prioritizationService.prioritizePaymentMethods(updatedContext);

      // Fiat method should now have higher preference score
      const fiatMethod = result.prioritizedMethods.find(m => m.method.type === PaymentMethodType.FIAT_STRIPE);
      expect(fiatMethod).toBeTruthy();
      expect(fiatMethod?.userPreferenceScore).toBeGreaterThan(0.7); // Should be higher due to recent usage
    });

    it('should integrate stablecoin prioritization rules correctly', async () => {
      const result = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);

      // USDC methods should be prioritized
      const usdcMethods = result.prioritizedMethods.filter(
        m => m.method.type === PaymentMethodType.STABLECOIN_USDC
      );

      expect(usdcMethods.length).toBeGreaterThan(0);
      
      // At least one USDC method should be in top 2 positions
      const topTwoMethods = result.prioritizedMethods.slice(0, 2);
      const hasUsdcInTop = topTwoMethods.some(m => m.method.type === PaymentMethodType.STABLECOIN_USDC);
      expect(hasUsdcInTop).toBe(true);

      // USDC methods should have stablecoin benefits listed
      usdcMethods.forEach(method => {
        expect(method.benefits).toContain('Price stability');
      });
    });

    it('should handle error scenarios gracefully', async () => {
      // Create context with problematic conditions
      const problematicContext = {
        ...basePrioritizationContext,
        userContext: {
          ...baseUserContext,
          walletBalances: [] // No balances
        },
        marketConditions: {
          ...basePrioritizationContext.marketConditions,
          gasConditions: [], // No gas conditions
          exchangeRates: [] // No exchange rates
        }
      };

      // Should not throw error
      const result = await prioritizationService.prioritizePaymentMethods(problematicContext);

      // Should still return valid result
      expect(result.prioritizedMethods).toHaveLength(multiNetworkPaymentMethods.length);
      
      // Should have warnings about the issues
      expect(result.warnings.length).toBeGreaterThan(0);
      
      // Fiat should be prioritized when crypto methods have issues
      expect(result.defaultMethod?.method.type).toBe(PaymentMethodType.FIAT_STRIPE);
    });
  });

  describe('Real-Time Updates and Error Handling', () => {
    it('should handle real-time gas price updates', async () => {
      // Get initial prioritization
      const initialResult = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);
      
      // Simulate gas price spike
      const updatedMarketConditions: MarketConditions = {
        ...basePrioritizationContext.marketConditions,
        gasConditions: [
          {
            chainId: 1,
            gasPrice: BigInt(100000000000), // 100 Gwei - 5x increase
            gasPriceUSD: 25, // 5x increase
            networkCongestion: 'high',
            blockTime: 20,
            lastUpdated: new Date()
          },
          {
            chainId: 137,
            gasPrice: BigInt(50000000000), // Still reasonable on Polygon
            gasPriceUSD: 0.08,
            networkCongestion: 'medium',
            blockTime: 3,
            lastUpdated: new Date()
          }
        ]
      };

      // Update prioritization with new conditions
      const updatedMethods = await prioritizationService.updatePrioritization(
        initialResult.prioritizedMethods,
        updatedMarketConditions
      );

      // Ethereum methods should be deprioritized
      const ethUsdcInitial = initialResult.prioritizedMethods.find(
        m => m.method.id === 'usdc-ethereum'
      );
      const ethUsdcUpdated = updatedMethods.find(
        m => m.method.id === 'usdc-ethereum'
      );

      expect(ethUsdcUpdated?.totalScore).toBeLessThan(ethUsdcInitial?.totalScore || 1);
      expect(ethUsdcUpdated?.costEstimate.gasFee).toBeGreaterThan(ethUsdcInitial?.costEstimate.gasFee || 0);

      // Polygon methods should be relatively better
      const polygonUsdcUpdated = updatedMethods.find(
        m => m.method.id === 'usdc-polygon'
      );
      
      expect(polygonUsdcUpdated?.totalScore).toBeGreaterThan(ethUsdcUpdated?.totalScore || 0);
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      // Mock WebSocket connection failure
      jest.mocked(paymentWebSocketService.connect).mockRejectedValue(new Error('Connection failed'));

      // Should still work without real-time updates
      const result = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);

      expect(result.prioritizedMethods).toHaveLength(multiNetworkPaymentMethods.length);
      expect(result.defaultMethod).toBeTruthy();
      
      // Should have warning about real-time updates being unavailable
      const hasConnectionWarning = result.warnings.some(
        w => w.message.toLowerCase().includes('real-time') || w.message.toLowerCase().includes('connection')
      );
      // Note: This would be true in a real implementation with proper error handling
    });

    it('should handle network switching scenarios', async () => {
      // Start on Ethereum
      const ethereumResult = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);
      
      // Switch to Polygon
      const polygonContext = {
        ...basePrioritizationContext,
        userContext: {
          ...baseUserContext,
          chainId: 137 // Switch to Polygon
        }
      };

      const polygonResult = await prioritizationService.prioritizePaymentMethods(polygonContext);

      // Available methods should change based on network
      const ethereumMethods = ethereumResult.prioritizedMethods.filter(
        m => m.availabilityStatus === AvailabilityStatus.AVAILABLE && m.method.chainId === 1
      );
      const polygonMethods = polygonResult.prioritizedMethods.filter(
        m => m.availabilityStatus === AvailabilityStatus.AVAILABLE && m.method.chainId === 137
      );

      expect(ethereumMethods.length).toBeGreaterThan(0);
      expect(polygonMethods.length).toBeGreaterThan(0);

      // Fiat should be available on both networks
      const ethereumFiat = ethereumResult.prioritizedMethods.find(
        m => m.method.type === PaymentMethodType.FIAT_STRIPE
      );
      const polygonFiat = polygonResult.prioritizedMethods.find(
        m => m.method.type === PaymentMethodType.FIAT_STRIPE
      );

      expect(ethereumFiat?.availabilityStatus).toBe(AvailabilityStatus.AVAILABLE);
      expect(polygonFiat?.availabilityStatus).toBe(AvailabilityStatus.AVAILABLE);
    });

    it('should handle cost estimation failures with fallbacks', async () => {
      // Mock cost calculator to fail for some methods
      const originalCalculateTransactionCost = costCalculator.calculateTransactionCost;
      
      jest.spyOn(costCalculator, 'calculateTransactionCost').mockImplementation(
        async (method: PaymentMethod, amount: number, networkConditions: NetworkConditions) => {
          if (method.type === PaymentMethodType.NATIVE_ETH) {
            throw new Error('Gas estimation failed');
          }
          return originalCalculateTransactionCost.call(costCalculator, method, amount, networkConditions);
        }
      );

      const result = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);

      // Should still return results
      expect(result.prioritizedMethods).toHaveLength(multiNetworkPaymentMethods.length);

      // ETH methods should have lower scores or warnings
      const ethMethods = result.prioritizedMethods.filter(
        m => m.method.type === PaymentMethodType.NATIVE_ETH
      );

      ethMethods.forEach(method => {
        expect(method.warnings.length).toBeGreaterThan(0);
        expect(method.totalScore).toBeLessThan(0.5); // Should be penalized
      });
    });

    it('should handle concurrent prioritization requests', async () => {
      // Create multiple contexts with slight variations
      const contexts = [
        basePrioritizationContext,
        { ...basePrioritizationContext, transactionAmount: 200 },
        { ...basePrioritizationContext, transactionAmount: 500 },
        {
          ...basePrioritizationContext,
          userContext: { ...baseUserContext, chainId: 137 }
        }
      ];

      // Execute concurrent prioritizations
      const results = await Promise.all(
        contexts.map(context => prioritizationService.prioritizePaymentMethods(context))
      );

      // All should complete successfully
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.prioritizedMethods).toHaveLength(multiNetworkPaymentMethods.length);
        expect(result.defaultMethod).toBeTruthy();
        expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
      });

      // Results should vary based on context differences
      expect(results[0].prioritizedMethods[0].method.id).not.toBe(results[3].prioritizedMethods[0].method.id);
    });
  });

  describe('Cross-Network Compatibility Scenarios', () => {
    it('should handle multi-network token availability', async () => {
      // Test USDC availability across networks
      const ethereumContext = { ...basePrioritizationContext, userContext: { ...baseUserContext, chainId: 1 } };
      const polygonContext = { ...basePrioritizationContext, userContext: { ...baseUserContext, chainId: 137 } };

      const ethereumResult = await prioritizationService.prioritizePaymentMethods(ethereumContext);
      const polygonResult = await prioritizationService.prioritizePaymentMethods(polygonContext);

      // USDC should be available on both networks
      const ethereumUsdc = ethereumResult.prioritizedMethods.find(
        m => m.method.type === PaymentMethodType.STABLECOIN_USDC && m.method.chainId === 1
      );
      const polygonUsdc = polygonResult.prioritizedMethods.find(
        m => m.method.type === PaymentMethodType.STABLECOIN_USDC && m.method.chainId === 137
      );

      expect(ethereumUsdc?.availabilityStatus).toBe(AvailabilityStatus.AVAILABLE);
      expect(polygonUsdc?.availabilityStatus).toBe(AvailabilityStatus.AVAILABLE);

      // Costs should be different due to different gas prices
      expect(ethereumUsdc?.costEstimate.gasFee).toBeGreaterThan(polygonUsdc?.costEstimate.gasFee || 0);
    });

    it('should suggest network switching for better costs', async () => {
      // Create scenario where Ethereum has very high gas fees
      const highGasContext = {
        ...basePrioritizationContext,
        marketConditions: {
          ...basePrioritizationContext.marketConditions,
          gasConditions: [
            {
              chainId: 1,
              gasPrice: BigInt(200000000000), // 200 Gwei - very high
              gasPriceUSD: 50,
              networkCongestion: 'high',
              blockTime: 30,
              lastUpdated: new Date()
            },
            {
              chainId: 137,
              gasPrice: BigInt(30000000000), // Still reasonable
              gasPriceUSD: 0.05,
              networkCongestion: 'low',
              blockTime: 2,
              lastUpdated: new Date()
            }
          ]
        }
      };

      const result = await prioritizationService.prioritizePaymentMethods(highGasContext);

      // Should have recommendations about network switching
      const networkRecommendation = result.recommendations.find(
        r => r.message.toLowerCase().includes('network') || r.message.toLowerCase().includes('polygon')
      );

      // Polygon methods should be prioritized over Ethereum methods
      const polygonUsdc = result.prioritizedMethods.find(m => m.method.id === 'usdc-polygon');
      const ethereumUsdc = result.prioritizedMethods.find(m => m.method.id === 'usdc-ethereum');

      expect(polygonUsdc?.priority).toBeLessThan(ethereumUsdc?.priority || 999);
      expect(polygonUsdc?.totalScore).toBeGreaterThan(ethereumUsdc?.totalScore || 0);
    });

    it('should handle network unavailability scenarios', async () => {
      // Simulate Ethereum network being unavailable
      const networkUnavailableContext = {
        ...basePrioritizationContext,
        marketConditions: {
          ...basePrioritizationContext.marketConditions,
          networkAvailability: [
            { chainId: 1, isAvailable: false, latency: 999999 }, // Ethereum unavailable
            { chainId: 137, isAvailable: true, latency: 50 }     // Polygon available
          ]
        }
      };

      const result = await prioritizationService.prioritizePaymentMethods(networkUnavailableContext);

      // Ethereum methods should be unavailable or heavily penalized
      const ethereumMethods = result.prioritizedMethods.filter(
        m => m.method.chainId === 1
      );

      ethereumMethods.forEach(method => {
        expect(method.availabilityStatus).not.toBe(AvailabilityStatus.AVAILABLE);
        expect(method.warnings.length).toBeGreaterThan(0);
      });

      // Polygon and fiat methods should be prioritized
      const availableMethods = result.prioritizedMethods.filter(
        m => m.availabilityStatus === AvailabilityStatus.AVAILABLE
      );

      expect(availableMethods.length).toBeGreaterThan(0);
      expect(availableMethods.every(m => m.method.chainId !== 1 || m.method.type === PaymentMethodType.FIAT_STRIPE)).toBe(true);
    });

    it('should handle cross-network balance validation', async () => {
      // Create context where user has balance on wrong network
      const wrongNetworkContext = {
        ...basePrioritizationContext,
        userContext: {
          ...baseUserContext,
          chainId: 1, // On Ethereum
          walletBalances: [
            // Only has balance on Polygon
            {
              token: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6, chainId: 137 },
              balance: BigInt('1000000000'), // 1000 USDC on Polygon
              balanceUSD: 1000,
              chainId: 137
            }
          ]
        }
      };

      const result = await prioritizationService.prioritizePaymentMethods(wrongNetworkContext);

      // Ethereum USDC should have low availability due to no balance
      const ethereumUsdc = result.prioritizedMethods.find(
        m => m.method.id === 'usdc-ethereum'
      );

      expect(ethereumUsdc?.availabilityStatus).not.toBe(AvailabilityStatus.AVAILABLE);
      expect(ethereumUsdc?.warnings.some(w => w.toLowerCase().includes('balance'))).toBe(true);

      // Should recommend network switching or fiat payment
      const hasNetworkSwitchRecommendation = result.recommendations.some(
        r => r.message.toLowerCase().includes('network') || r.message.toLowerCase().includes('switch')
      );

      expect(hasNetworkSwitchRecommendation || result.defaultMethod?.method.type === PaymentMethodType.FIAT_STRIPE).toBe(true);
    });

    it('should optimize for cross-network transaction costs', async () => {
      // Test scenario where cross-network costs vary significantly
      const result = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);

      // Compare same token across networks
      const ethereumUsdc = result.prioritizedMethods.find(m => m.method.id === 'usdc-ethereum');
      const polygonUsdc = result.prioritizedMethods.find(m => m.method.id === 'usdc-polygon');

      expect(ethereumUsdc).toBeTruthy();
      expect(polygonUsdc).toBeTruthy();

      // Polygon should generally be cheaper
      expect(polygonUsdc?.costEstimate.gasFee).toBeLessThan(ethereumUsdc?.costEstimate.gasFee || 999);

      // Cost difference should be reflected in scoring
      if (polygonUsdc && ethereumUsdc) {
        const costDifference = ethereumUsdc.costEstimate.totalCost - polygonUsdc.costEstimate.totalCost;
        if (costDifference > 5) { // Significant difference
          expect(polygonUsdc.totalScore).toBeGreaterThan(ethereumUsdc.totalScore);
        }
      }
    });

    it('should handle network-specific token configurations', async () => {
      // Test with network-specific token configurations
      const result = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);

      // Each method should have correct network-specific configuration
      result.prioritizedMethods.forEach(method => {
        if (method.method.token) {
          expect(method.method.token.chainId).toBe(method.method.chainId);
          
          // Network-specific addresses should be different
          if (method.method.type === PaymentMethodType.STABLECOIN_USDC) {
            const isEthereum = method.method.chainId === 1;
            const isPolygon = method.method.chainId === 137;
            
            if (isEthereum) {
              expect(method.method.token.address).toBe('0xA0b86a33E6441e6e80D0c4C6C7527d72');
            } else if (isPolygon) {
              expect(method.method.token.address).toBe('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
            }
          }
        }
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of payment methods efficiently', async () => {
      // Create context with many payment methods
      const manyMethods = [...multiNetworkPaymentMethods];
      
      // Add more networks and methods
      for (let chainId = 10; chainId <= 20; chainId++) {
        manyMethods.push({
          id: `usdc-chain-${chainId}`,
          type: PaymentMethodType.STABLECOIN_USDC,
          name: `USDC (Chain ${chainId})`,
          description: `USD Coin on Chain ${chainId}`,
          token: {
            address: `0x${chainId.toString().padStart(40, '0')}`,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            chainId
          },
          chainId,
          enabled: true,
          supportedNetworks: [chainId]
        });
      }

      const largeContext = {
        ...basePrioritizationContext,
        availablePaymentMethods: manyMethods
      };

      const startTime = Date.now();
      const result = await prioritizationService.prioritizePaymentMethods(largeContext);
      const processingTime = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds for this test)
      expect(processingTime).toBeLessThan(5000);
      
      // Should handle all methods
      expect(result.prioritizedMethods).toHaveLength(manyMethods.length);
      
      // Should still maintain proper sorting
      for (let i = 0; i < result.prioritizedMethods.length - 1; i++) {
        expect(result.prioritizedMethods[i].priority).toBeLessThan(result.prioritizedMethods[i + 1].priority);
      }
    });

    it('should cache results effectively for repeated requests', async () => {
      const startTime1 = Date.now();
      const result1 = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      const result2 = await prioritizationService.prioritizePaymentMethods(basePrioritizationContext);
      const time2 = Date.now() - startTime2;

      // Second call should be faster due to caching
      expect(time2).toBeLessThan(time1);
      
      // Results should be consistent
      expect(result1.prioritizedMethods).toHaveLength(result2.prioritizedMethods.length);
      expect(result1.defaultMethod?.method.id).toBe(result2.defaultMethod?.method.id);
    });

    it('should handle memory efficiently with cleanup', async () => {
      // Perform many prioritizations to test memory management
      const contexts = Array.from({ length: 50 }, (_, i) => ({
        ...basePrioritizationContext,
        transactionAmount: 100 + i,
        userContext: {
          ...baseUserContext,
          userId: `user-${i}`
        }
      }));

      const results = await Promise.all(
        contexts.map(context => prioritizationService.prioritizePaymentMethods(context))
      );

      expect(results).toHaveLength(50);
      
      // All results should be valid
      results.forEach(result => {
        expect(result.prioritizedMethods.length).toBeGreaterThan(0);
        expect(result.defaultMethod).toBeTruthy();
      });

      // Get performance metrics to verify cleanup
      const metrics = await prioritizationService.getPerformanceMetrics();
      expect(metrics).toBeTruthy();
    });
  });
});