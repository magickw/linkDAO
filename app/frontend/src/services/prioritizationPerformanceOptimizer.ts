/**
 * Prioritization Performance Optimizer
 * Provides parallel processing, lazy loading, and result caching for payment method prioritization
 */

import {
  PaymentMethod,
  PaymentMethodType,
  PrioritizedPaymentMethod,
  CostEstimate,
  UserContext,
  NetworkConditions,
  AvailabilityStatus
} from '../types/paymentPrioritization';
import { intelligentCacheService } from './intelligentCacheService';

interface PrioritizationTask {
  id: string;
  method: PaymentMethod;
  priority: number;
  estimatedDuration: number;
}

interface ParallelProcessingResult<T> {
  results: T[];
  executionTime: number;
  errors: Error[];
  cacheHits: number;
  cacheMisses: number;
}

interface LazyLoadingConfig {
  batchSize: number;
  loadThreshold: number;
  preloadCount: number;
  maxConcurrency: number;
}

interface PerformanceMetrics {
  totalExecutionTime: number;
  parallelExecutionTime: number;
  cacheHitRate: number;
  averageTaskDuration: number;
  concurrencyLevel: number;
  memoryUsage: number;
}

export class PrioritizationPerformanceOptimizer {
  private readonly DEFAULT_LAZY_CONFIG: LazyLoadingConfig = {
    batchSize: 5,
    loadThreshold: 2,
    preloadCount: 3,
    maxConcurrency: 4
  };

  private taskQueue: PrioritizationTask[] = [];
  private activeWorkers = new Set<Promise<any>>();
  private performanceMetrics: PerformanceMetrics = {
    totalExecutionTime: 0,
    parallelExecutionTime: 0,
    cacheHitRate: 0,
    averageTaskDuration: 0,
    concurrencyLevel: 0,
    memoryUsage: 0
  };

  /**
   * Process cost calculations in parallel for multiple payment methods
   */
  async parallelCostCalculation(
    methods: PaymentMethod[],
    userContext: UserContext,
    transactionAmount: number
  ): Promise<ParallelProcessingResult<CostEstimate>> {
    const startTime = performance.now();
    const results: CostEstimate[] = [];
    const errors: Error[] = [];
    let cacheHits = 0;
    let cacheMisses = 0;

    // Create cost calculation tasks
    const tasks = methods.map((method, index) => ({
      id: `cost_${method.type}_${index}`,
      method,
      priority: this.getMethodPriority(method.type),
      estimatedDuration: this.estimateTaskDuration('cost_calculation', method.type)
    }));

    // Sort tasks by priority and estimated duration
    tasks.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.estimatedDuration - b.estimatedDuration;
    });

    // Process tasks in parallel with controlled concurrency
    const maxConcurrency = Math.min(4, methods.length);
    const semaphore = new Semaphore(maxConcurrency);

    const promises = tasks.map(async (task) => {
      await semaphore.acquire();
      
      try {
        const cacheKey = this.generateCostCacheKey(task.method, userContext, transactionAmount);
        
        // Check cache first
        const cached = await intelligentCacheService.getCachedPrioritizationResult(cacheKey);
        if (cached) {
          cacheHits++;
          return cached;
        }

        cacheMisses++;
        
        // Calculate cost estimate
        const costEstimate = await this.calculateCostEstimate(
          task.method,
          userContext,
          transactionAmount
        );

        // Cache the result
        await intelligentCacheService.cachePrioritizationResult(cacheKey, costEstimate);

        return costEstimate;
      } catch (error) {
        errors.push(error as Error);
        return null;
      } finally {
        semaphore.release();
      }
    });

    const taskResults = await Promise.all(promises);
    
    // Filter out null results and collect valid estimates
    for (const result of taskResults) {
      if (result) {
        results.push(result);
      }
    }

    const executionTime = performance.now() - startTime;
    this.updatePerformanceMetrics('parallel_cost_calculation', executionTime, maxConcurrency);

    return {
      results,
      executionTime,
      errors,
      cacheHits,
      cacheMisses
    };
  }

  /**
   * Implement lazy loading for non-critical prioritization data
   */
  async lazyLoadPrioritizationData(
    methods: PaymentMethod[],
    userContext: UserContext,
    config: Partial<LazyLoadingConfig> = {}
  ): Promise<{
    immediate: PrioritizedPaymentMethod[];
    lazy: Promise<PrioritizedPaymentMethod[]>;
  }> {
    const finalConfig = { ...this.DEFAULT_LAZY_CONFIG, ...config };
    
    // Separate critical and non-critical methods
    const criticalMethods = this.getCriticalMethods(methods);
    const nonCriticalMethods = this.getNonCriticalMethods(methods);

    // Load critical methods immediately
    const immediateResults = await this.processCriticalMethods(criticalMethods, userContext);

    // Set up lazy loading for non-critical methods
    const lazyResults = this.processNonCriticalMethodsLazily(
      nonCriticalMethods,
      userContext,
      finalConfig
    );

    return {
      immediate: immediateResults,
      lazy: lazyResults
    };
  }

  /**
   * Create and cache prioritization results with intelligent caching
   */
  async cachePrioritizationResults(
    contextKey: string,
    results: PrioritizedPaymentMethod[],
    userContext: UserContext
  ): Promise<void> {
    const cacheData = {
      results,
      userContext: {
        userAddress: userContext.userAddress,
        chainId: userContext.chainId,
        // Don't cache sensitive data
      },
      timestamp: Date.now(),
      version: '1.0'
    };

    // Calculate TTL based on result volatility
    const ttl = this.calculateResultCacheTTL(results);
    
    await intelligentCacheService.cachePrioritizationResult(
      contextKey,
      cacheData,
      ttl
    );
  }

  /**
   * Batch process multiple prioritization requests
   */
  async batchProcessPrioritization(
    requests: Array<{
      methods: PaymentMethod[];
      userContext: UserContext;
      transactionAmount: number;
    }>
  ): Promise<Array<PrioritizedPaymentMethod[]>> {
    const startTime = performance.now();
    
    // Group similar requests for optimization
    const groupedRequests = this.groupSimilarRequests(requests);
    
    // Process groups in parallel
    const results = await Promise.all(
      groupedRequests.map(group => this.processRequestGroup(group))
    );

    // Flatten results back to original order
    const flatResults = this.flattenGroupedResults(results, requests);

    const executionTime = performance.now() - startTime;
    this.updatePerformanceMetrics('batch_processing', executionTime, groupedRequests.length);

    return flatResults;
  }

  /**
   * Preload common prioritization scenarios
   */
  async preloadCommonScenarios(): Promise<void> {
    const commonScenarios = [
      {
        methods: [PaymentMethodType.STABLECOIN_USDC, PaymentMethodType.FIAT_STRIPE, PaymentMethodType.NATIVE_ETH],
        chainId: 1, // Mainnet
        amounts: [100, 500, 1000]
      },
      {
        methods: [PaymentMethodType.STABLECOIN_USDC, PaymentMethodType.NATIVE_ETH],
        chainId: 137, // Polygon
        amounts: [50, 200, 500]
      }
    ];

    const preloadTasks = commonScenarios.flatMap(scenario =>
      scenario.amounts.map(amount => ({
        methods: scenario.methods.map(type => ({ type } as PaymentMethod)),
        userContext: { chainId: scenario.chainId } as UserContext,
        transactionAmount: amount
      }))
    );

    // Process preload tasks with lower priority
    await this.batchProcessPrioritization(preloadTasks);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Optimize memory usage by cleaning up old cache entries
   */
  async optimizeMemoryUsage(): Promise<void> {
    // Clear old prioritization results
    await intelligentCacheService.invalidateByPattern(
      'prioritization_results',
      /^prioritization_.*_\d{13}$/ // Match timestamped keys older than threshold
    );

    // Force garbage collection of task queue
    this.taskQueue = this.taskQueue.filter(task => 
      Date.now() - parseInt(task.id.split('_').pop() || '0') < 300000 // 5 minutes
    );

    // Update memory usage metric
    this.performanceMetrics.memoryUsage = this.estimateMemoryUsage();
  }

  // Private methods

  private async calculateCostEstimate(
    method: PaymentMethod,
    userContext: UserContext,
    transactionAmount: number
  ): Promise<CostEstimate> {
    // This would integrate with actual cost calculation services
    // For now, return a mock estimate
    const baseCost = transactionAmount;
    const gasFee = method.type === PaymentMethodType.NATIVE_ETH ? 25 : 5;
    
    return {
      totalCost: baseCost + gasFee,
      baseCost,
      gasFee,
      exchangeRate: 1,
      estimatedTime: this.getEstimatedTransactionTime(method.type),
      confidence: 0.9,
      currency: 'USD',
      breakdown: {
        amount: baseCost,
        networkFee: gasFee,
        platformFee: 0
      }
    };
  }

  private generateCostCacheKey(
    method: PaymentMethod,
    userContext: UserContext,
    transactionAmount: number
  ): string {
    return `cost_${method.type}_${userContext.chainId}_${Math.round(transactionAmount)}_${Date.now()}`;
  }

  private getMethodPriority(methodType: PaymentMethodType): number {
    const priorities = {
      [PaymentMethodType.STABLECOIN_USDC]: 1,
      [PaymentMethodType.FIAT_STRIPE]: 2,
      [PaymentMethodType.STABLECOIN_USDT]: 3,
      [PaymentMethodType.NATIVE_ETH]: 4
    };
    return priorities[methodType] || 5;
  }

  private estimateTaskDuration(taskType: string, methodType: PaymentMethodType): number {
    // Estimate task duration in milliseconds
    const baseDurations = {
      cost_calculation: 100,
      preference_calculation: 50,
      availability_check: 75
    };

    const methodMultipliers = {
      [PaymentMethodType.NATIVE_ETH]: 1.5, // ETH calculations are more complex
      [PaymentMethodType.STABLECOIN_USDC]: 1.0,
      [PaymentMethodType.STABLECOIN_USDT]: 1.0,
      [PaymentMethodType.FIAT_STRIPE]: 0.8 // Fiat is simpler
    };

    const baseDuration = baseDurations[taskType as keyof typeof baseDurations] || 100;
    const multiplier = methodMultipliers[methodType] || 1.0;

    return baseDuration * multiplier;
  }

  private getCriticalMethods(methods: PaymentMethod[]): PaymentMethod[] {
    // Critical methods are those with high priority or user preference
    return methods.filter(method => 
      method.type === PaymentMethodType.STABLECOIN_USDC ||
      method.type === PaymentMethodType.FIAT_STRIPE
    );
  }

  private getNonCriticalMethods(methods: PaymentMethod[]): PaymentMethod[] {
    return methods.filter(method => 
      method.type !== PaymentMethodType.STABLECOIN_USDC &&
      method.type !== PaymentMethodType.FIAT_STRIPE
    );
  }

  private async processCriticalMethods(
    methods: PaymentMethod[],
    userContext: UserContext
  ): Promise<PrioritizedPaymentMethod[]> {
    // Process critical methods with high priority
    const results: PrioritizedPaymentMethod[] = [];
    
    for (const method of methods) {
      const costEstimate = await this.calculateCostEstimate(method, userContext, 100);
      results.push({
        method,
        priority: this.getMethodPriority(method.type),
        costEstimate,
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        userPreferenceScore: 0.8,
        recommendationReason: 'High priority method',
        totalScore: 0.8 // Combined weighted score
      });
    }

    return results;
  }

  private async processNonCriticalMethodsLazily(
    methods: PaymentMethod[],
    userContext: UserContext,
    config: LazyLoadingConfig
  ): Promise<PrioritizedPaymentMethod[]> {
    // Process non-critical methods in batches
    const results: PrioritizedPaymentMethod[] = [];
    
    for (let i = 0; i < methods.length; i += config.batchSize) {
      const batch = methods.slice(i, i + config.batchSize);
      
      // Add small delay to avoid blocking critical operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const batchResults = await Promise.all(
        batch.map(async (method) => {
          const costEstimate = await this.calculateCostEstimate(method, userContext, 100);
          return {
            method,
            priority: this.getMethodPriority(method.type),
            costEstimate,
            availabilityStatus: AvailabilityStatus.AVAILABLE,
            userPreferenceScore: 0.5,
            recommendationReason: 'Alternative option',
            totalScore: 0.5
          };
        })
      );
      
      results.push(...batchResults);
    }

    return results;
  }

  private groupSimilarRequests(
    requests: Array<{
      methods: PaymentMethod[];
      userContext: UserContext;
      transactionAmount: number;
    }>
  ): Array<Array<typeof requests[0]>> {
    // Group requests by chain ID and similar transaction amounts
    const groups = new Map<string, typeof requests>();
    
    for (const request of requests) {
      const groupKey = `${request.userContext.chainId}_${Math.round(request.transactionAmount / 100) * 100}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(request);
    }

    return Array.from(groups.values());
  }

  private async processRequestGroup(
    group: Array<{
      methods: PaymentMethod[];
      userContext: UserContext;
      transactionAmount: number;
    }>
  ): Promise<Array<PrioritizedPaymentMethod[]>> {
    // Process similar requests together for efficiency
    return Promise.all(
      group.map(async (request) => {
        const costResults = await this.parallelCostCalculation(
          request.methods,
          request.userContext,
          request.transactionAmount
        );

        return request.methods.map((method, index) => ({
          method,
          priority: this.getMethodPriority(method.type),
          costEstimate: costResults.results[index] || {
            totalCost: request.transactionAmount,
            baseCost: request.transactionAmount,
            gasFee: 0,
            estimatedTime: 60,
            confidence: 0.5,
            currency: 'USD',
            breakdown: {
              amount: request.transactionAmount,
              networkFee: 0,
              platformFee: 0
            }
          },
          availabilityStatus: AvailabilityStatus.AVAILABLE,
          userPreferenceScore: 0.7,
          recommendationReason: 'Standard option',
          totalScore: 0.7
        }));
      })
    );
  }

  private flattenGroupedResults(
    groupedResults: Array<Array<PrioritizedPaymentMethod[]>>,
    originalRequests: Array<any>
  ): Array<PrioritizedPaymentMethod[]> {
    // Flatten grouped results back to match original request order
    const flattened: Array<PrioritizedPaymentMethod[]> = [];
    let requestIndex = 0;

    for (const group of groupedResults) {
      for (const result of group) {
        flattened[requestIndex] = result;
        requestIndex++;
      }
    }

    return flattened;
  }

  private calculateResultCacheTTL(results: PrioritizedPaymentMethod[]): number {
    // Calculate TTL based on result volatility
    const hasVolatileMethods = results.some(result => 
      result.method.type === PaymentMethodType.NATIVE_ETH
    );

    const hasHighConfidence = results.every(result => 
      result.costEstimate.confidence > 0.8
    );

    if (hasVolatileMethods) {
      return 30 * 1000; // 30 seconds for volatile methods
    } else if (hasHighConfidence) {
      return 120 * 1000; // 2 minutes for high confidence
    } else {
      return 60 * 1000; // 1 minute default
    }
  }

  private getEstimatedTransactionTime(methodType: PaymentMethodType): number {
    const times = {
      [PaymentMethodType.STABLECOIN_USDC]: 30,
      [PaymentMethodType.STABLECOIN_USDT]: 30,
      [PaymentMethodType.NATIVE_ETH]: 60,
      [PaymentMethodType.FIAT_STRIPE]: 10
    };
    return times[methodType] || 45;
  }

  private updatePerformanceMetrics(
    operation: string,
    executionTime: number,
    concurrency: number
  ): void {
    this.performanceMetrics.totalExecutionTime += executionTime;
    this.performanceMetrics.parallelExecutionTime = Math.max(
      this.performanceMetrics.parallelExecutionTime,
      executionTime
    );
    this.performanceMetrics.concurrencyLevel = Math.max(
      this.performanceMetrics.concurrencyLevel,
      concurrency
    );
    this.performanceMetrics.averageTaskDuration = 
      this.performanceMetrics.totalExecutionTime / Math.max(1, this.taskQueue.length);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let usage = 0;
    usage += this.taskQueue.length * 200; // Estimated bytes per task
    usage += this.activeWorkers.size * 1000; // Estimated bytes per active worker
    return usage;
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

// Export singleton instance
export const prioritizationPerformanceOptimizer = new PrioritizationPerformanceOptimizer();

export default PrioritizationPerformanceOptimizer;