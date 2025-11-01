import { EventEmitter } from 'events';
import { PerceptualHashingService, DuplicateDetectionResult } from './perceptualHashingService';
import { TextHashingService, TextDuplicateResult } from './textHashingService';
import { VendorApiOptimizer } from './vendorApiOptimizer';
import { ModerationCacheService, CachedModerationResult } from './moderationCacheService';
import { CircuitBreakerManager } from './circuitBreakerService';

export interface ContentInput {
  id: string;
  type: 'text' | 'image' | 'video' | 'url';
  content: string | Buffer;
  userId: string;
  metadata?: Record<string, any>;
}

export interface OptimizedModerationResult {
  contentId: string;
  fromCache: boolean;
  isDuplicate: boolean;
  duplicateInfo?: {
    originalContentId: string;
    similarity: number;
    type: 'exact' | 'near-exact' | 'semantic' | 'perceptual';
  };
  moderationResult?: CachedModerationResult;
  processingTime: number;
  cacheHit: boolean;
  vendorCalls: number;
  cost: number;
}

export interface PerformanceMetrics {
  totalRequests: number;
  cacheHitRate: number;
  duplicateDetectionRate: number;
  averageProcessingTime: number;
  totalCost: number;
  vendorApiCalls: number;
  circuitBreakerStats: Map<string, any>;
}

/**
 * Performance optimization service that coordinates all optimization components
 * Provides intelligent caching, duplicate detection, and vendor API optimization
 */
export class PerformanceOptimizationService extends EventEmitter {
  private readonly perceptualHashing: PerceptualHashingService;
  private readonly textHashing: TextHashingService;
  private readonly vendorOptimizer: VendorApiOptimizer;
  private readonly cache: ModerationCacheService;
  private readonly circuitBreakers: CircuitBreakerManager;

  // In-memory stores for duplicate detection (in production, use Redis)
  private textHashes = new Map<string, { hash: any; text: string }>();
  private imageHashes = new Map<string, string>();

  // Performance tracking
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    duplicatesDetected: 0,
    totalProcessingTime: 0,
    totalCost: 0,
    vendorApiCalls: 0
  };

  constructor() {
    super();
    
    this.perceptualHashing = new PerceptualHashingService();
    this.textHashing = new TextHashingService();
    this.vendorOptimizer = new VendorApiOptimizer();
    this.cache = new ModerationCacheService();
    this.circuitBreakers = new CircuitBreakerManager();

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for monitoring and metrics
   */
  private setupEventListeners(): void {
    this.vendorOptimizer.on('batchProcessed', (event) => {
      this.metrics.vendorApiCalls += event.requestCount;
      this.metrics.totalCost += event.totalCost;
      this.emit('vendorBatchProcessed', event);
    });

    this.circuitBreakers.on('circuitOpened', (event) => {
      this.emit('circuitBreakerOpened', event);
    });

    this.circuitBreakers.on('circuitClosed', (event) => {
      this.emit('circuitBreakerClosed', event);
    });
  }

  /**
   * Process content with full optimization pipeline
   */
  async processContent(input: ContentInput): Promise<OptimizedModerationResult> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Step 1: Check cache first
      const cachedResult = await this.checkCache(input.id);
      if (cachedResult) {
        this.metrics.cacheHits++;
        return {
          contentId: input.id,
          fromCache: true,
          isDuplicate: false,
          moderationResult: cachedResult,
          processingTime: Date.now() - startTime,
          cacheHit: true,
          vendorCalls: 0,
          cost: 0
        };
      }

      // Step 2: Check for duplicates
      const duplicateResult = await this.checkForDuplicates(input);
      if (duplicateResult.isDuplicate) {
        this.metrics.duplicatesDetected++;
        
        // Get moderation result from original content
        const originalResult = await this.cache.getModerationResult(duplicateResult.originalContentId!);
        
        return {
          contentId: input.id,
          fromCache: false,
          isDuplicate: true,
          duplicateInfo: {
            originalContentId: duplicateResult.originalContentId!,
            similarity: duplicateResult.similarity,
            type: duplicateResult.duplicateType as any
          },
          moderationResult: originalResult || undefined,
          processingTime: Date.now() - startTime,
          cacheHit: false,
          vendorCalls: 0,
          cost: 0
        };
      }

      // Step 3: Process with vendor APIs (with optimization)
      const moderationResult = await this.processWithVendors(input);
      
      // Step 4: Cache results and hashes
      await this.cacheResults(input, moderationResult, duplicateResult);

      const processingTime = Date.now() - startTime;
      this.metrics.totalProcessingTime += processingTime;

      return {
        contentId: input.id,
        fromCache: false,
        isDuplicate: false,
        moderationResult,
        processingTime,
        cacheHit: false,
        vendorCalls: 1, // Simplified - actual count would come from vendor optimizer
        cost: 0.002 // Estimated cost
      };

    } catch (error) {
      this.emit('processingError', { contentId: input.id, error });
      throw error;
    }
  }

  /**
   * Check cache for existing moderation result
   */
  private async checkCache(contentId: string): Promise<CachedModerationResult | null> {
    return await this.cache.getModerationResult(contentId);
  }

  /**
   * Check for duplicate content using appropriate hashing method
   */
  private async checkForDuplicates(input: ContentInput): Promise<{
    isDuplicate: boolean;
    similarity: number;
    duplicateType: string;
    originalContentId?: string;
  }> {
    if (input.type === 'text') {
      const result = await this.textHashing.checkForDuplicate(
        input.content as string,
        this.textHashes
      );
      
      return {
        isDuplicate: result.isDuplicate,
        similarity: result.similarity,
        duplicateType: result.duplicateType,
        originalContentId: result.originalContentId
      };
    }

    if (input.type === 'image' || input.type === 'video') {
      const result = await this.perceptualHashing.checkForDuplicate(
        input.content as Buffer,
        this.imageHashes
      );
      
      return {
        isDuplicate: result.isDuplicate,
        similarity: result.similarity,
        duplicateType: 'perceptual',
        originalContentId: result.originalContentId
      };
    }

    return {
      isDuplicate: false,
      similarity: 0,
      duplicateType: 'none'
    };
  }

  /**
   * Process content with vendor APIs using optimization
   */
  private async processWithVendors(input: ContentInput): Promise<CachedModerationResult> {
    const circuitBreaker = this.circuitBreakers.getCircuitBreaker(
      'moderation-ensemble',
      {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
        expectedErrors: ['TimeoutError', 'RateLimitError'],
        slowCallThreshold: 0.3,
        slowCallDurationThreshold: 10000
      },
      () => this.fallbackModeration(input)
    );

    return await circuitBreaker.execute(async () => {
      // Use vendor optimizer for batching
      const results = await Promise.all([
        this.vendorOptimizer.batchRequest('openai', input.content, input.type, 'medium'),
        this.vendorOptimizer.batchRequest('perspective', input.content, input.type, 'medium')
      ]);

      // Aggregate results
      const aggregatedResult = this.aggregateVendorResults(results);
      
      return {
        contentId: input.id,
        decision: aggregatedResult.decision,
        confidence: aggregatedResult.confidence,
        categories: aggregatedResult.categories,
        vendorScores: aggregatedResult.vendorScores,
        timestamp: Date.now(),
        ttl: 3600
      };
    });
  }

  /**
   * Fallback moderation when vendors are unavailable
   */
  private async fallbackModeration(input: ContentInput): Promise<CachedModerationResult> {
    // Simple rule-based fallback
    const content = input.content.toString().toLowerCase();
    const suspiciousPatterns = ['scam', 'phishing', 'hack', 'steal', 'fraud'];
    
    const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
      content.includes(pattern)
    );

    return {
      contentId: input.id,
      decision: hasSuspiciousContent ? 'block' : 'allow',
      confidence: 0.6, // Lower confidence for fallback
      categories: hasSuspiciousContent ? ['suspicious'] : ['safe'],
      vendorScores: { fallback: hasSuspiciousContent ? 0.8 : 0.2 },
      timestamp: Date.now(),
      ttl: 1800 // Shorter TTL for fallback results
    };
  }

  /**
   * Aggregate results from multiple vendors
   */
  private aggregateVendorResults(results: any[]): {
    decision: 'allow' | 'limit' | 'block' | 'review';
    confidence: number;
    categories: string[];
    vendorScores: Record<string, number>;
  } {
    const vendorScores: Record<string, number> = {};
    const allCategories = new Set<string>();
    let totalConfidence = 0;
    let maxRisk = 0;

    results.forEach((result, index) => {
      const vendorName = index === 0 ? 'openai' : 'perspective';
      vendorScores[vendorName] = result.confidence || 0;
      
      if (result.categories) {
        result.categories.forEach((cat: string) => allCategories.add(cat));
      }
      
      totalConfidence += result.confidence || 0;
      maxRisk = Math.max(maxRisk, result.confidence || 0);
    });

    const avgConfidence = totalConfidence / results.length;
    
    // Decision logic based on aggregated scores
    let decision: 'allow' | 'limit' | 'block' | 'review' = 'allow';
    if (maxRisk >= 0.9) {
      decision = 'block';
    } else if (maxRisk >= 0.7) {
      decision = 'review';
    } else if (maxRisk >= 0.5) {
      decision = 'limit';
    }

    return {
      decision,
      confidence: avgConfidence,
      categories: Array.from(allCategories),
      vendorScores
    };
  }

  /**
   * Cache results and content hashes
   */
  private async cacheResults(
    input: ContentInput,
    moderationResult: CachedModerationResult,
    duplicateResult: any
  ): Promise<void> {
    // Cache moderation result
    await this.cache.cacheModerationResult(moderationResult);

    // Cache content hashes for future duplicate detection
    if (input.type === 'text') {
      const textHash = this.textHashing.generateTextHashes(input.content as string);
      this.textHashes.set(input.id, { hash: textHash, text: input.content as string });
      await this.cache.cacheTextHash(input.id, textHash);
    }

    if (input.type === 'image' || input.type === 'video') {
      const imageHash = await this.perceptualHashing.generateImageHash(input.content as Buffer);
      this.imageHashes.set(input.id, imageHash.hash);
      await this.cache.cacheImageHash(input.id, imageHash);
    }
  }

  /**
   * Batch process multiple content items
   */
  async batchProcessContent(inputs: ContentInput[]): Promise<OptimizedModerationResult[]> {
    // Process in parallel with concurrency limit
    const concurrencyLimit = 10;
    const results: OptimizedModerationResult[] = [];
    
    for (let i = 0; i < inputs.length; i += concurrencyLimit) {
      const batch = inputs.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(input => this.processContent(input))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheHitRate = this.metrics.totalRequests > 0 
      ? this.metrics.cacheHits / this.metrics.totalRequests 
      : 0;
    
    const duplicateDetectionRate = this.metrics.totalRequests > 0
      ? this.metrics.duplicatesDetected / this.metrics.totalRequests
      : 0;

    const averageProcessingTime = this.metrics.totalRequests > 0
      ? this.metrics.totalProcessingTime / this.metrics.totalRequests
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      cacheHitRate,
      duplicateDetectionRate,
      averageProcessingTime,
      totalCost: this.metrics.totalCost,
      vendorApiCalls: this.metrics.vendorApiCalls,
      circuitBreakerStats: this.circuitBreakers.getAllStats()
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      duplicatesDetected: 0,
      totalProcessingTime: 0,
      totalCost: 0,
      vendorApiCalls: 0
    };
  }

  /**
   * Warm up cache with frequently accessed content
   */
  async warmupCache(contentIds: string[]): Promise<void> {
    const cachedResults = await this.cache.batchGetModerationResults(contentIds);
    this.emit('cacheWarmedUp', { 
      requestedCount: contentIds.length, 
      cachedCount: cachedResults.size 
    });
  }

  /**
   * Optimize system configuration based on metrics
   */
  async optimizeConfiguration(): Promise<void> {
    const metrics = this.getPerformanceMetrics();
    
    // Adjust cache TTL based on hit rate
    if (metrics.cacheHitRate < 0.7) {
      // Increase cache TTL to improve hit rate
      this.emit('configurationOptimized', { 
        action: 'increase_cache_ttl',
        reason: 'low_hit_rate',
        currentHitRate: metrics.cacheHitRate
      });
    }

    // Adjust vendor batch sizes based on performance
    if (metrics.averageProcessingTime > 5000) {
      // Increase batch sizes to reduce overhead
      this.vendorOptimizer.updateVendorConfig('openai', { batchSize: 25 });
      this.vendorOptimizer.updateVendorConfig('perspective', { batchSize: 15 });
      
      this.emit('configurationOptimized', {
        action: 'increase_batch_sizes',
        reason: 'high_processing_time',
        currentTime: metrics.averageProcessingTime
      });
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.vendorOptimizer.flushAll();
    await this.cache.close();
    this.removeAllListeners();
  }
}

export const performanceOptimizationService = new PerformanceOptimizationService();