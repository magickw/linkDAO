import { EventEmitter } from 'events';

export interface BatchRequest {
  id: string;
  content: any;
  type: 'text' | 'image' | 'url';
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export interface VendorConfig {
  name: string;
  batchSize: number;
  batchTimeout: number;
  rateLimit: number;
  costPerRequest: number;
  enabled: boolean;
}

export interface BatchResult {
  requestId: string;
  result: any;
  error?: Error;
  latency: number;
  cost: number;
}

/**
 * Vendor API optimization service for batching and rate limiting
 * Optimizes API calls to reduce costs and improve performance
 */
export class VendorApiOptimizer extends EventEmitter {
  private batches: Map<string, BatchRequest[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly configs: Map<string, VendorConfig> = new Map();

  constructor() {
    super();
    this.initializeConfigs();
  }

  /**
   * Initialize vendor configurations
   */
  private initializeConfigs(): void {
    const defaultConfigs: VendorConfig[] = [
      {
        name: 'openai',
        batchSize: 20,
        batchTimeout: 2000,
        rateLimit: 100, // requests per minute
        costPerRequest: 0.002,
        enabled: true
      },
      {
        name: 'perspective',
        batchSize: 10,
        batchTimeout: 1500,
        rateLimit: 60,
        costPerRequest: 0.001,
        enabled: true
      },
      {
        name: 'google-vision',
        batchSize: 16,
        batchTimeout: 3000,
        rateLimit: 1800, // per minute
        costPerRequest: 0.0015,
        enabled: true
      },
      {
        name: 'aws-rekognition',
        batchSize: 10,
        batchTimeout: 2500,
        rateLimit: 50,
        costPerRequest: 0.001,
        enabled: true
      }
    ];

    defaultConfigs.forEach(config => {
      this.configs.set(config.name, config);
      this.batches.set(config.name, []);
      this.rateLimiters.set(config.name, { count: 0, resetTime: Date.now() + 60000 });
    });
  }

  /**
   * Add request to batch queue
   */
  async batchRequest<T>(
    vendor: string,
    content: any,
    type: 'text' | 'image' | 'url',
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const config = this.configs.get(vendor);
    if (!config || !config.enabled) {
      throw new Error(`Vendor ${vendor} not configured or disabled`);
    }

    // Check rate limit
    if (!this.checkRateLimit(vendor)) {
      throw new Error(`Rate limit exceeded for vendor ${vendor}`);
    }

    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest = {
        id: this.generateRequestId(),
        content,
        type,
        priority,
        timestamp: Date.now(),
        resolve,
        reject
      };

      const batch = this.batches.get(vendor)!;
      
      // Insert based on priority
      if (priority === 'high') {
        batch.unshift(request);
      } else {
        batch.push(request);
      }

      // Process batch if it's full or set timer
      if (batch.length >= config.batchSize) {
        this.processBatch(vendor);
      } else if (!this.timers.has(vendor)) {
        const timer = setTimeout(() => {
          this.processBatch(vendor);
        }, config.batchTimeout);
        this.timers.set(vendor, timer);
      }
    });
  }

  /**
   * Process batch for specific vendor
   */
  private async processBatch(vendor: string): Promise<void> {
    const config = this.configs.get(vendor)!;
    const batch = this.batches.get(vendor)!;
    
    if (batch.length === 0) return;

    // Clear timer
    const timer = this.timers.get(vendor);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(vendor);
    }

    // Extract requests to process
    const requestsToProcess = batch.splice(0, config.batchSize);
    
    try {
      const startTime = Date.now();
      const results = await this.callVendorAPI(vendor, requestsToProcess);
      const endTime = Date.now();
      
      // Process results
      results.forEach((result, index) => {
        const request = requestsToProcess[index];
        const batchResult: BatchResult = {
          requestId: request.id,
          result: result.data,
          error: result.error,
          latency: endTime - startTime,
          cost: config.costPerRequest
        };

        if (result.error) {
          request.reject(result.error);
        } else {
          request.resolve(result.data);
        }

        this.emit('batchResult', batchResult);
      });

      // Update rate limiter
      this.updateRateLimit(vendor, requestsToProcess.length);
      
      // Emit batch completion event
      this.emit('batchProcessed', {
        vendor,
        requestCount: requestsToProcess.length,
        latency: endTime - startTime,
        totalCost: config.costPerRequest * requestsToProcess.length
      });

    } catch (error) {
      // Reject all requests in batch
      requestsToProcess.forEach(request => {
        request.reject(error as Error);
      });
      
      this.emit('batchError', { vendor, error, requestCount: requestsToProcess.length });
    }
  }

  /**
   * Call vendor API with batch of requests
   */
  private async callVendorAPI(vendor: string, requests: BatchRequest[]): Promise<Array<{ data?: any; error?: Error }>> {
    // This would be implemented with actual vendor API calls
    // For now, return mock results
    return requests.map(request => {
      try {
        // Simulate API processing
        return {
          data: {
            id: request.id,
            confidence: Math.random(),
            categories: ['safe'],
            vendor
          }
        };
      } catch (error) {
        return { error: error as Error };
      }
    });
  }

  /**
   * Check if vendor is within rate limits
   */
  private checkRateLimit(vendor: string): boolean {
    const limiter = this.rateLimiters.get(vendor)!;
    const now = Date.now();

    // Reset counter if window has passed
    if (now >= limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = now + 60000; // 1 minute window
    }

    const config = this.configs.get(vendor)!;
    return limiter.count < config.rateLimit;
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(vendor: string, requestCount: number): void {
    const limiter = this.rateLimiters.get(vendor)!;
    limiter.count += requestCount;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get vendor statistics
   */
  getVendorStats(vendor: string): {
    queueSize: number;
    rateLimit: { current: number; max: number; resetTime: number };
    config: VendorConfig;
  } | null {
    const config = this.configs.get(vendor);
    const batch = this.batches.get(vendor);
    const limiter = this.rateLimiters.get(vendor);

    if (!config || !batch || !limiter) return null;

    return {
      queueSize: batch.length,
      rateLimit: {
        current: limiter.count,
        max: config.rateLimit,
        resetTime: limiter.resetTime
      },
      config
    };
  }

  /**
   * Update vendor configuration
   */
  updateVendorConfig(vendor: string, updates: Partial<VendorConfig>): void {
    const config = this.configs.get(vendor);
    if (config) {
      Object.assign(config, updates);
      this.emit('configUpdated', { vendor, config });
    }
  }

  /**
   * Flush all pending batches
   */
  async flushAll(): Promise<void> {
    const promises = Array.from(this.configs.keys()).map(vendor => 
      this.processBatch(vendor)
    );
    await Promise.all(promises);
  }

  /**
   * Get overall system statistics
   */
  getSystemStats(): {
    totalQueueSize: number;
    activeVendors: number;
    totalCostEstimate: number;
  } {
    let totalQueueSize = 0;
    let activeVendors = 0;
    let totalCostEstimate = 0;

    for (const [vendor, config] of this.configs) {
      if (config.enabled) {
        activeVendors++;
        const batch = this.batches.get(vendor)!;
        totalQueueSize += batch.length;
        totalCostEstimate += batch.length * config.costPerRequest;
      }
    }

    return {
      totalQueueSize,
      activeVendors,
      totalCostEstimate
    };
  }
}

export const vendorApiOptimizer = new VendorApiOptimizer();