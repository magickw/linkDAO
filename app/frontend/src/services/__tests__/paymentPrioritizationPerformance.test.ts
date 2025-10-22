/**
 * Payment Method Prioritization Performance Tests
 * Load tests prioritization system under high volume, validates response time requirements,
 * and tests concurrent user scenarios
 * Requirements: 4.1, 4.3
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import PaymentMethodPrioritizationService from '../paymentMethodPrioritizationService';
import { CostEffectivenessCalculator } from '../costEffectivenessCalculator';
import { NetworkAvailabilityChecker } from '../networkAvailabilityChecker';
import { UserPreferenceManager } from '../userPreferenceManager';
import { prioritizationPerformanceOptimizer } from '../prioritizationPerformanceOptimizer';
import { intelligentCacheService } from '../intelligentCacheService';
import {
  PaymentMethod,
  PaymentMethodType,
  PrioritizationContext,
  MarketConditions,
  UserContext,
  CostEstimate,
  UserPreferences
} from '../../types/paymentPrioritization';

// Performance test utilities
class PerformanceTestRunner {
  private results: PerformanceTestResult[] = [];
  private concurrentExecutions: Map<string, Promise<any>> = new Map();

  async runLoadTest(
    testName: string,
    testFunction: () => Promise<any>,
    iterations: number,
    concurrency: number = 1
  ): Promise<LoadTestResult> {
    const startTime = Date.now();
    const results: PerformanceTestResult[] = [];
    const errors: Error[] = [];

    // Run tests in batches to control concurrency
    const batchSize = concurrency;
    const batches = Math.ceil(iterations / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchPromises: Promise<any>[] = [];
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, iterations);

      for (let i = batchStart; i < batchEnd; i++) {
        const iterationStart = Date.now();
        const promise = testFunction()
          .then(result => {
            const iterationTime = Date.now() - iterationStart;
            results.push({
              iteration: i,
              executionTime: iterationTime,
              success: true,
              result
            });
          })
          .catch(error => {
            const iterationTime = Date.now() - iterationStart;
            errors.push(error);
            results.push({
              iteration: i,
              executionTime: iterationTime,
              success: false,
              error: error.message
            });
          });

        batchPromises.push(promise);
      }

      await Promise.all(batchPromises);
    }

    const totalTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);
    const executionTimes = successfulResults.map(r => r.executionTime);

    return {
      testName,
      totalIterations: iterations,
      successfulIterations: successfulResults.length,
      failedIterations: errors.length,
      totalExecutionTime: totalTime,
      averageExecutionTime: executionTimes.length > 0 ? 
        executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      p95ExecutionTime: this.calculatePercentile(executionTimes, 95),
      p99ExecutionTime: this.calculatePercentile(executionTimes, 99),
      throughput: successfulResults.length / (totalTime / 1000), // requests per second
      errorRate: errors.length / iterations,
      errors: errors.slice(0, 10) // Keep first 10 errors for analysis
    };
  }

  async runConcurrentTest(
    testName: string,
    testFunction: () => Promise<any>,
    concurrentUsers: number,
    duration: number
  ): Promise<ConcurrentTestResult> {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const results: PerformanceTestResult[] = [];
    const errors: Error[] = [];
    const activePromises: Promise<any>[] = [];

    // Start concurrent users
    for (let user = 0; user < concurrentUsers; user++) {
      const userPromise = this.runUserSession(
        user,
        testFunction,
        startTime,
        endTime,
        results,
        errors
      );
      activePromises.push(userPromise);
    }

    // Wait for all users to complete
    await Promise.all(activePromises);

    const totalTime = Date.now() - startTime;
    const successfulResults = results.filter(r => r.success);
    const executionTimes = successfulResults.map(r => r.executionTime);

    return {
      testName,
      concurrentUsers,
      duration,
      totalRequests: results.length,
      successfulRequests: successfulResults.length,
      failedRequests: errors.length,
      averageExecutionTime: executionTimes.length > 0 ? 
        executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length : 0,
      p95ExecutionTime: this.calculatePercentile(executionTimes, 95),
      p99ExecutionTime: this.calculatePercentile(executionTimes, 99),
      throughput: successfulResults.length / (totalTime / 1000),
      errorRate: errors.length / results.length,
      memoryUsage: this.getMemoryUsage(),
      errors: errors.slice(0, 10)
    };
  }

  private async runUserSession(
    userId: number,
    testFunction: () => Promise<any>,
    startTime: number,
    endTime: number,
    results: PerformanceTestResult[],
    errors: Error[]
  ): Promise<void> {
    let requestCount = 0;

    while (Date.now() < endTime) {
      const iterationStart = Date.now();
      
      try {
        const result = await testFunction();
        const iterationTime = Date.now() - iterationStart;
        
        results.push({
          iteration: requestCount,
          executionTime: iterationTime,
          success: true,
          result,
          userId
        });
      } catch (error) {
        const iterationTime = Date.now() - iterationStart;
        errors.push(error as Error);
        
        results.push({
          iteration: requestCount,
          executionTime: iterationTime,
          success: false,
          error: (error as Error).message,
          userId
        });
      }

      requestCount++;
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private getMemoryUsage(): MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss
      };
    }
    
    // Fallback for browser environment
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    };
  }
}

interface PerformanceTestResult {
  iteration: number;
  executionTime: number;
  success: boolean;
  result?: any;
  error?: string;
  userId?: number;
}

interface LoadTestResult {
  testName: string;
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  throughput: number;
  errorRate: number;
  errors: Error[];
}

interface ConcurrentTestResult {
  testName: string;
  concurrentUsers: number;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: MemoryUsage;
  errors: Error[];
}

interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

describe('Payment Method Prioritization Performance Tests', () => {
  let prioritizationService: PaymentMethodPrioritizationService;
  let costCalculator: CostEffectivenessCalculator;
  let networkChecker: NetworkAvailabilityChecker;
  let preferenceManager: UserPreferenceManager;
  let performanceRunner: PerformanceTestRunner;

  // Test data for performance testing
  let testPaymentMethods: PaymentMethod[];
  let testContexts: PrioritizationContext[];
  let baseMarketConditions: MarketConditions;

  beforeEach(() => {
    // Initialize services
    costCalculator = new CostEffectivenessCalculator();
    networkChecker = new NetworkAvailabilityChecker();
    preferenceManager = new UserPreferenceManager();
    
    prioritizationService = new PaymentMethodPrioritizationService(
      costCalculator,
      networkChecker,
      preferenceManager
    );

    performanceRunner = new PerformanceTestRunner();

    // Setup comprehensive test data
    testPaymentMethods = [
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
        id: 'usdc-arbitrum',
        type: PaymentMethodType.STABLECOIN_USDC,
        name: 'USDC (Arbitrum)',
        description: 'USD Coin on Arbitrum',
        token: {
          address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 42161
        },
        chainId: 42161,
        enabled: true,
        supportedNetworks: [42161]
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
      {
        id: 'fiat-stripe',
        type: PaymentMethodType.FIAT_STRIPE,
        name: 'Credit/Debit Card',
        description: 'Traditional payment with Stripe',
        enabled: true,
        supportedNetworks: []
      }
    ];

    baseMarketConditions = {
      gasConditions: [
        {
          chainId: 1,
          gasPrice: BigInt(20000000000),
          gasPriceUSD: 5,
          networkCongestion: 'low',
          blockTime: 12,
          lastUpdated: new Date()
        },
        {
          chainId: 137,
          gasPrice: BigInt(30000000000),
          gasPriceUSD: 0.05,
          networkCongestion: 'low',
          blockTime: 2,
          lastUpdated: new Date()
        },
        {
          chainId: 42161,
          gasPrice: BigInt(1000000000),
          gasPriceUSD: 0.5,
          networkCongestion: 'low',
          blockTime: 1,
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
      networkAvailability: [
        { chainId: 1, isAvailable: true, latency: 100 },
        { chainId: 137, isAvailable: true, latency: 50 },
        { chainId: 42161, isAvailable: true, latency: 30 }
      ],
      lastUpdated: new Date()
    };

    // Create test contexts for different scenarios
    testContexts = Array.from({ length: 100 }, (_, i) => {
      const mockPreferences: UserPreferences = {
        preferredMethods: [
          {
            methodType: PaymentMethodType.STABLECOIN_USDC,
            score: 0.8 + (Math.random() * 0.2),
            lastUsed: new Date(Date.now() - Math.random() * 86400000 * 30),
            usageCount: Math.floor(Math.random() * 20)
          }
        ],
        avoidedMethods: [],
        maxGasFeeThreshold: 20 + Math.random() * 30,
        preferStablecoins: Math.random() > 0.3,
        preferFiat: Math.random() > 0.7,
        lastUsedMethods: [],
        autoSelectBestOption: true
      };

      const userContext: UserContext = {
        chainId: [1, 137, 42161][i % 3],
        userAddress: `0x${i.toString(16).padStart(40, '0')}`,
        userId: `user-${i}`,
        preferences: mockPreferences,
        walletBalances: [
          {
            token: { address: '0xA0b86a33E6441e6e80D0c4C6C7527d72', symbol: 'USDC', decimals: 6, chainId: 1 },
            balance: BigInt(Math.floor(Math.random() * 10000) * 1000000),
            balanceUSD: Math.floor(Math.random() * 10000),
            chainId: 1
          },
          {
            token: { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', decimals: 6, chainId: 137 },
            balance: BigInt(Math.floor(Math.random() * 5000) * 1000000),
            balanceUSD: Math.floor(Math.random() * 5000),
            chainId: 137
          }
        ]
      };

      return {
        userContext,
        transactionAmount: 50 + Math.random() * 500,
        transactionCurrency: 'USD',
        marketConditions: baseMarketConditions,
        availablePaymentMethods: testPaymentMethods
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Response Time Requirements', () => {
    it('should prioritize payment methods within 500ms for single request', async () => {
      const context = testContexts[0];
      
      const startTime = Date.now();
      const result = await prioritizationService.prioritizePaymentMethods(context);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(500); // 500ms requirement
      expect(result.prioritizedMethods).toHaveLength(testPaymentMethods.length);
      expect(result.defaultMethod).toBeTruthy();
    });

    it('should maintain response times under load', async () => {
      const testFunction = async () => {
        const context = testContexts[Math.floor(Math.random() * testContexts.length)];
        return await prioritizationService.prioritizePaymentMethods(context);
      };

      const loadTestResult = await performanceRunner.runLoadTest(
        'Response Time Under Load',
        testFunction,
        100, // 100 iterations
        10   // 10 concurrent
      );

      expect(loadTestResult.averageExecutionTime).toBeLessThan(500);
      expect(loadTestResult.p95ExecutionTime).toBeLessThan(1000); // 95% under 1 second
      expect(loadTestResult.p99ExecutionTime).toBeLessThan(2000); // 99% under 2 seconds
      expect(loadTestResult.errorRate).toBeLessThan(0.01); // Less than 1% error rate
      expect(loadTestResult.successfulIterations).toBeGreaterThan(95);

      console.log(`Load Test Results:
        Average Response Time: ${loadTestResult.averageExecutionTime.toFixed(2)}ms
        P95 Response Time: ${loadTestResult.p95ExecutionTime.toFixed(2)}ms
        P99 Response Time: ${loadTestResult.p99ExecutionTime.toFixed(2)}ms
        Throughput: ${loadTestResult.throughput.toFixed(2)} req/sec
        Error Rate: ${(loadTestResult.errorRate * 100).toFixed(2)}%`);
    });

    it('should handle cost calculation within 1000ms', async () => {
      const testFunction = async () => {
        const context = testContexts[Math.floor(Math.random() * testContexts.length)];
        const method = testPaymentMethods[Math.floor(Math.random() * testPaymentMethods.length)];
        const networkCondition = context.marketConditions.gasConditions[0];
        
        return await costCalculator.calculateTransactionCost(
          method,
          context.transactionAmount,
          networkCondition
        );
      };

      const loadTestResult = await performanceRunner.runLoadTest(
        'Cost Calculation Performance',
        testFunction,
        200, // 200 iterations
        20   // 20 concurrent
      );

      expect(loadTestResult.averageExecutionTime).toBeLessThan(1000); // 1 second requirement
      expect(loadTestResult.p95ExecutionTime).toBeLessThan(1500);
      expect(loadTestResult.errorRate).toBeLessThan(0.05); // Less than 5% error rate

      console.log(`Cost Calculation Results:
        Average Time: ${loadTestResult.averageExecutionTime.toFixed(2)}ms
        P95 Time: ${loadTestResult.p95ExecutionTime.toFixed(2)}ms
        Throughput: ${loadTestResult.throughput.toFixed(2)} req/sec`);
    });

    it('should handle real-time updates within 200ms', async () => {
      // Get initial prioritization
      const initialResult = await prioritizationService.prioritizePaymentMethods(testContexts[0]);
      
      const testFunction = async () => {
        // Create updated market conditions
        const updatedConditions: MarketConditions = {
          ...baseMarketConditions,
          gasConditions: baseMarketConditions.gasConditions.map(gc => ({
            ...gc,
            gasPrice: gc.gasPrice + BigInt(Math.floor(Math.random() * 10000000000)),
            gasPriceUSD: gc.gasPriceUSD + Math.random() * 5,
            lastUpdated: new Date()
          }))
        };

        return await prioritizationService.updatePrioritization(
          initialResult.prioritizedMethods,
          updatedConditions
        );
      };

      const loadTestResult = await performanceRunner.runLoadTest(
        'Real-time Update Performance',
        testFunction,
        50,  // 50 iterations
        5    // 5 concurrent
      );

      expect(loadTestResult.averageExecutionTime).toBeLessThan(200); // 200ms requirement
      expect(loadTestResult.p95ExecutionTime).toBeLessThan(500);
      expect(loadTestResult.errorRate).toBeLessThan(0.02);

      console.log(`Real-time Update Results:
        Average Time: ${loadTestResult.averageExecutionTime.toFixed(2)}ms
        P95 Time: ${loadTestResult.p95ExecutionTime.toFixed(2)}ms`);
    });
  });

  describe('High Volume Load Testing', () => {
    it('should handle 1000 prioritization requests efficiently', async () => {
      const testFunction = async () => {
        const context = testContexts[Math.floor(Math.random() * testContexts.length)];
        return await prioritizationService.prioritizePaymentMethods(context);
      };

      const loadTestResult = await performanceRunner.runLoadTest(
        'High Volume Load Test',
        testFunction,
        1000, // 1000 iterations
        50    // 50 concurrent
      );

      expect(loadTestResult.successfulIterations).toBeGreaterThan(950); // 95% success rate
      expect(loadTestResult.averageExecutionTime).toBeLessThan(1000);
      expect(loadTestResult.throughput).toBeGreaterThan(10); // At least 10 req/sec
      expect(loadTestResult.errorRate).toBeLessThan(0.05);

      console.log(`High Volume Load Test Results:
        Total Requests: ${loadTestResult.totalIterations}
        Successful: ${loadTestResult.successfulIterations}
        Failed: ${loadTestResult.failedIterations}
        Average Time: ${loadTestResult.averageExecutionTime.toFixed(2)}ms
        Throughput: ${loadTestResult.throughput.toFixed(2)} req/sec
        Error Rate: ${(loadTestResult.errorRate * 100).toFixed(2)}%`);
    });

    it('should handle burst traffic patterns', async () => {
      const burstSizes = [10, 50, 100, 200];
      const results: LoadTestResult[] = [];

      for (const burstSize of burstSizes) {
        const testFunction = async () => {
          const context = testContexts[Math.floor(Math.random() * testContexts.length)];
          return await prioritizationService.prioritizePaymentMethods(context);
        };

        const result = await performanceRunner.runLoadTest(
          `Burst Test - ${burstSize} concurrent`,
          testFunction,
          burstSize * 2, // 2x burst size iterations
          burstSize       // All concurrent
        );

        results.push(result);

        // Verify performance doesn't degrade significantly with burst size
        expect(result.averageExecutionTime).toBeLessThan(2000);
        expect(result.errorRate).toBeLessThan(0.1);
      }

      // Performance should not degrade linearly with burst size
      const smallBurstTime = results[0].averageExecutionTime;
      const largeBurstTime = results[results.length - 1].averageExecutionTime;
      
      expect(largeBurstTime).toBeLessThan(smallBurstTime * 3); // Should not be 3x slower

      console.log('Burst Test Results:');
      results.forEach(result => {
        console.log(`  ${result.testName}: ${result.averageExecutionTime.toFixed(2)}ms avg, ${result.throughput.toFixed(2)} req/sec`);
      });
    });

    it('should maintain performance with large payment method sets', async () => {
      // Create large set of payment methods
      const largeMethodSet: PaymentMethod[] = [...testPaymentMethods];
      
      // Add methods for multiple networks
      for (let chainId = 10; chainId <= 50; chainId++) {
        largeMethodSet.push({
          id: `usdc-chain-${chainId}`,
          type: PaymentMethodType.STABLECOIN_USDC,
          name: `USDC (Chain ${chainId})`,
          description: `USD Coin on Chain ${chainId}`,
          token: {
            address: `0x${chainId.toString(16).padStart(40, '0')}`,
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
        ...testContexts[0],
        availablePaymentMethods: largeMethodSet
      };

      const testFunction = async () => {
        return await prioritizationService.prioritizePaymentMethods(largeContext);
      };

      const loadTestResult = await performanceRunner.runLoadTest(
        'Large Method Set Performance',
        testFunction,
        50,  // 50 iterations
        10   // 10 concurrent
      );

      expect(loadTestResult.averageExecutionTime).toBeLessThan(3000); // 3 seconds for large sets
      expect(loadTestResult.errorRate).toBeLessThan(0.05);
      expect(loadTestResult.successfulIterations).toBeGreaterThan(45);

      console.log(`Large Method Set Results (${largeMethodSet.length} methods):
        Average Time: ${loadTestResult.averageExecutionTime.toFixed(2)}ms
        P95 Time: ${loadTestResult.p95ExecutionTime.toFixed(2)}ms
        Success Rate: ${((loadTestResult.successfulIterations / loadTestResult.totalIterations) * 100).toFixed(2)}%`);
    });
  });

  describe('Concurrent User Scenarios', () => {
    it('should handle 50 concurrent users for 30 seconds', async () => {
      const testFunction = async () => {
        const context = testContexts[Math.floor(Math.random() * testContexts.length)];
        return await prioritizationService.prioritizePaymentMethods(context);
      };

      const concurrentResult = await performanceRunner.runConcurrentTest(
        '50 Concurrent Users',
        testFunction,
        50,    // 50 concurrent users
        30000  // 30 seconds
      );

      expect(concurrentResult.successfulRequests).toBeGreaterThan(500); // At least 500 successful requests
      expect(concurrentResult.averageExecutionTime).toBeLessThan(1000);
      expect(concurrentResult.errorRate).toBeLessThan(0.05);
      expect(concurrentResult.throughput).toBeGreaterThan(15); // At least 15 req/sec

      console.log(`50 Concurrent Users Results:
        Total Requests: ${concurrentResult.totalRequests}
        Successful: ${concurrentResult.successfulRequests}
        Average Time: ${concurrentResult.averageExecutionTime.toFixed(2)}ms
        P95 Time: ${concurrentResult.p95ExecutionTime.toFixed(2)}ms
        Throughput: ${concurrentResult.throughput.toFixed(2)} req/sec
        Error Rate: ${(concurrentResult.errorRate * 100).toFixed(2)}%`);
    });

    it('should handle 100 concurrent users with mixed workloads', async () => {
      const workloadTypes = [
        // Standard prioritization
        async () => {
          const context = testContexts[Math.floor(Math.random() * testContexts.length)];
          return await prioritizationService.prioritizePaymentMethods(context);
        },
        // Real-time updates
        async () => {
          const context = testContexts[0];
          const result = await prioritizationService.prioritizePaymentMethods(context);
          const updatedConditions = {
            ...baseMarketConditions,
            lastUpdated: new Date()
          };
          return await prioritizationService.updatePrioritization(result.prioritizedMethods, updatedConditions);
        },
        // Cost calculations
        async () => {
          const context = testContexts[Math.floor(Math.random() * testContexts.length)];
          const method = testPaymentMethods[Math.floor(Math.random() * testPaymentMethods.length)];
          const networkCondition = context.marketConditions.gasConditions[0];
          return await costCalculator.calculateTransactionCost(method, context.transactionAmount, networkCondition);
        }
      ];

      const testFunction = async () => {
        const workload = workloadTypes[Math.floor(Math.random() * workloadTypes.length)];
        return await workload();
      };

      const concurrentResult = await performanceRunner.runConcurrentTest(
        '100 Concurrent Users - Mixed Workload',
        testFunction,
        100,   // 100 concurrent users
        45000  // 45 seconds
      );

      expect(concurrentResult.successfulRequests).toBeGreaterThan(1000);
      expect(concurrentResult.averageExecutionTime).toBeLessThan(1500);
      expect(concurrentResult.errorRate).toBeLessThan(0.1);
      expect(concurrentResult.throughput).toBeGreaterThan(20);

      console.log(`100 Concurrent Users - Mixed Workload Results:
        Total Requests: ${concurrentResult.totalRequests}
        Successful: ${concurrentResult.successfulRequests}
        Average Time: ${concurrentResult.averageExecutionTime.toFixed(2)}ms
        Throughput: ${concurrentResult.throughput.toFixed(2)} req/sec
        Error Rate: ${(concurrentResult.errorRate * 100).toFixed(2)}%
        Memory Usage: ${(concurrentResult.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle sustained load without memory leaks', async () => {
      const testFunction = async () => {
        const context = testContexts[Math.floor(Math.random() * testContexts.length)];
        return await prioritizationService.prioritizePaymentMethods(context);
      };

      // Run sustained load test
      const concurrentResult = await performanceRunner.runConcurrentTest(
        'Sustained Load Test',
        testFunction,
        25,    // 25 concurrent users
        60000  // 60 seconds
      );

      expect(concurrentResult.successfulRequests).toBeGreaterThan(500);
      expect(concurrentResult.errorRate).toBeLessThan(0.05);

      // Check memory usage is reasonable
      const memoryUsageMB = concurrentResult.memoryUsage.heapUsed / 1024 / 1024;
      expect(memoryUsageMB).toBeLessThan(500); // Less than 500MB

      console.log(`Sustained Load Test Results:
        Duration: 60 seconds
        Concurrent Users: 25
        Total Requests: ${concurrentResult.totalRequests}
        Successful: ${concurrentResult.successfulRequests}
        Memory Usage: ${memoryUsageMB.toFixed(2)}MB
        Final Throughput: ${concurrentResult.throughput.toFixed(2)} req/sec`);
    });
  });

  describe('Cache Performance and Optimization', () => {
    it('should demonstrate cache effectiveness', async () => {
      const context = testContexts[0];

      // First request (cache miss)
      const startTime1 = Date.now();
      const result1 = await prioritizationService.prioritizePaymentMethods(context);
      const time1 = Date.now() - startTime1;

      // Second request (cache hit)
      const startTime2 = Date.now();
      const result2 = await prioritizationService.prioritizePaymentMethods(context);
      const time2 = Date.now() - startTime2;

      // Cache hit should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5); // At least 50% faster
      expect(result1.prioritizedMethods).toHaveLength(result2.prioritizedMethods.length);

      console.log(`Cache Performance:
        First Request (miss): ${time1}ms
        Second Request (hit): ${time2}ms
        Improvement: ${((time1 - time2) / time1 * 100).toFixed(2)}%`);
    });

    it('should handle cache invalidation correctly', async () => {
      const context = testContexts[0];

      // Initial request
      await prioritizationService.prioritizePaymentMethods(context);

      // Request with different market conditions (should invalidate cache)
      const updatedContext = {
        ...context,
        marketConditions: {
          ...context.marketConditions,
          gasConditions: context.marketConditions.gasConditions.map(gc => ({
            ...gc,
            gasPrice: gc.gasPrice + BigInt(10000000000),
            lastUpdated: new Date()
          }))
        }
      };

      const startTime = Date.now();
      const result = await prioritizationService.prioritizePaymentMethods(updatedContext);
      const executionTime = Date.now() - startTime;

      // Should still be reasonably fast even with cache miss
      expect(executionTime).toBeLessThan(1000);
      expect(result.prioritizedMethods).toHaveLength(testPaymentMethods.length);
    });

    it('should optimize memory usage with intelligent caching', async () => {
      // Generate many different contexts to test cache management
      const manyContexts = Array.from({ length: 200 }, (_, i) => ({
        ...testContexts[i % testContexts.length],
        transactionAmount: 100 + i,
        userContext: {
          ...testContexts[i % testContexts.length].userContext,
          userId: `user-${i}`
        }
      }));

      const testFunction = async () => {
        const context = manyContexts[Math.floor(Math.random() * manyContexts.length)];
        return await prioritizationService.prioritizePaymentMethods(context);
      };

      const loadTestResult = await performanceRunner.runLoadTest(
        'Cache Memory Management',
        testFunction,
        300, // 300 iterations with different contexts
        20   // 20 concurrent
      );

      expect(loadTestResult.successfulIterations).toBeGreaterThan(280);
      expect(loadTestResult.errorRate).toBeLessThan(0.05);

      // Get performance metrics to verify cache is working
      const metrics = await prioritizationService.getPerformanceMetrics();
      expect(metrics).toBeTruthy();

      console.log(`Cache Memory Management Results:
        Requests: ${loadTestResult.totalIterations}
        Success Rate: ${((loadTestResult.successfulIterations / loadTestResult.totalIterations) * 100).toFixed(2)}%
        Average Time: ${loadTestResult.averageExecutionTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Optimization Validation', () => {
    it('should validate parallel cost calculation optimization', async () => {
      const context = testContexts[0];

      // Test with performance optimizer enabled
      const startTime = Date.now();
      const result = await prioritizationService.prioritizePaymentMethods(context);
      const optimizedTime = Date.now() - startTime;

      expect(result.metadata.parallelExecutionTime).toBeDefined();
      expect(result.metadata.cacheHits).toBeDefined();
      expect(result.metadata.cacheMisses).toBeDefined();

      // Performance should be reasonable
      expect(optimizedTime).toBeLessThan(1000);
      expect(result.prioritizedMethods).toHaveLength(testPaymentMethods.length);

      console.log(`Parallel Optimization Results:
        Total Time: ${optimizedTime}ms
        Parallel Execution Time: ${result.metadata.parallelExecutionTime}ms
        Cache Hits: ${result.metadata.cacheHits}
        Cache Misses: ${result.metadata.cacheMisses}`);
    });

    it('should validate intelligent cache service performance', async () => {
      // Test cache service directly
      const cacheKey = 'test-prioritization-key';
      const testData = { prioritizedMethods: [], timestamp: Date.now() };

      const startTime = Date.now();
      await intelligentCacheService.setCachedPrioritizationResult(cacheKey, testData);
      const cached = await intelligentCacheService.getCachedPrioritizationResult(cacheKey);
      const cacheTime = Date.now() - startTime;

      expect(cached).toBeTruthy();
      expect(cacheTime).toBeLessThan(50); // Cache operations should be very fast

      // Test cache metrics
      const metrics = intelligentCacheService.getCacheMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics.size).toBeGreaterThan(0);

      console.log(`Cache Service Performance:
        Cache Operation Time: ${cacheTime}ms
        Cache Size: ${metrics.size}
        Hit Rate: ${(metrics.hitRate * 100).toFixed(2)}%`);
    });

    it('should validate performance under stress conditions', async () => {
      // Create stress conditions with high concurrency and complex contexts
      const stressContexts = Array.from({ length: 50 }, (_, i) => ({
        ...testContexts[i % testContexts.length],
        availablePaymentMethods: [...testPaymentMethods, ...testPaymentMethods], // Double the methods
        marketConditions: {
          ...baseMarketConditions,
          gasConditions: [
            ...baseMarketConditions.gasConditions,
            ...baseMarketConditions.gasConditions.map(gc => ({
              ...gc,
              chainId: gc.chainId + 1000,
              gasPrice: gc.gasPrice + BigInt(Math.floor(Math.random() * 50000000000))
            }))
          ]
        }
      }));

      const testFunction = async () => {
        const context = stressContexts[Math.floor(Math.random() * stressContexts.length)];
        return await prioritizationService.prioritizePaymentMethods(context);
      };

      const stressResult = await performanceRunner.runConcurrentTest(
        'Stress Test',
        testFunction,
        75,    // 75 concurrent users
        30000  // 30 seconds
      );

      expect(stressResult.successfulRequests).toBeGreaterThan(200);
      expect(stressResult.errorRate).toBeLessThan(0.15); // Allow higher error rate under stress
      expect(stressResult.averageExecutionTime).toBeLessThan(3000); // 3 seconds under stress

      console.log(`Stress Test Results:
        Concurrent Users: 75
        Total Requests: ${stressResult.totalRequests}
        Successful: ${stressResult.successfulRequests}
        Error Rate: ${(stressResult.errorRate * 100).toFixed(2)}%
        Average Time: ${stressResult.averageExecutionTime.toFixed(2)}ms
        P99 Time: ${stressResult.p99ExecutionTime.toFixed(2)}ms
        Memory Usage: ${(stressResult.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});