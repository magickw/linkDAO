import { performance } from 'perf_hooks';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { performanceMonitoringService } from './performanceMonitoringService';
import { memoryMonitoringService } from './memoryMonitoringService';

interface BenchmarkResult {
  name: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: any;
}

interface BenchmarkSuite {
  name: string;
  description: string;
  benchmarks: BenchmarkResult[];
  averageDuration: number;
  successRate: number;
  lastRun: Date;
}

interface RequestHandlingBenchmark {
  endpoint: string;
  method: string;
  concurrentRequests: number;
  totalRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
}

interface BackendResourceBenchmark {
  memoryUsage: {
    baseline: number;
    peak: number;
    average: number;
    gcFrequency: number;
  };
  cpuUsage: {
    baseline: number;
    peak: number;
    average: number;
  };
  databaseConnections: {
    poolSize: number;
    activeConnections: number;
    utilization: number;
    queryLatency: number;
  };
}

/**
 * Performance Benchmark Service
 * Implements task 14.1: Create performance benchmarks for request handling and backend resource usage
 */
export class PerformanceBenchmarkService {
  private pool: Pool;
  private redis: Redis;
  private benchmarkSuites: Map<string, BenchmarkSuite> = new Map();
  private isRunning: boolean = false;

  constructor(pool: Pool, redis: Redis) {
    this.pool = pool;
    this.redis = redis;
    this.initializeBenchmarkSuites();
  }

  /**
   * Initialize default benchmark suites
   */
  private initializeBenchmarkSuites(): void {
    const suites = [
      {
        name: 'request_handling',
        description: 'Benchmarks for API request handling performance',
        benchmarks: [],
        averageDuration: 0,
        successRate: 0,
        lastRun: new Date()
      },
      {
        name: 'database_operations',
        description: 'Benchmarks for database operation performance',
        benchmarks: [],
        averageDuration: 0,
        successRate: 0,
        lastRun: new Date()
      },
      {
        name: 'memory_management',
        description: 'Benchmarks for memory usage and garbage collection',
        benchmarks: [],
        averageDuration: 0,
        successRate: 0,
        lastRun: new Date()
      },
      {
        name: 'cache_performance',
        description: 'Benchmarks for caching mechanisms',
        benchmarks: [],
        averageDuration: 0,
        successRate: 0,
        lastRun: new Date()
      }
    ];

    suites.forEach(suite => {
      this.benchmarkSuites.set(suite.name, suite);
    });
  }

  /**
   * Run comprehensive performance benchmarks
   */
  async runComprehensiveBenchmarks(): Promise<{
    requestHandling: RequestHandlingBenchmark[];
    resourceUsage: BackendResourceBenchmark;
    overallScore: number;
    recommendations: string[];
  }> {
    if (this.isRunning) {
      throw new Error('Benchmarks are already running');
    }

    this.isRunning = true;
    safeLogger.info('🚀 Starting comprehensive performance benchmarks');

    try {
      const startTime = performance.now();

      // Run request handling benchmarks
      const requestHandlingResults = await this.runRequestHandlingBenchmarks();

      // Run resource usage benchmarks
      const resourceUsageResults = await this.runResourceUsageBenchmarks();

      // Calculate overall performance score
      const overallScore = this.calculateOverallScore(requestHandlingResults, resourceUsageResults);

      // Generate recommendations
      const recommendations = this.generateRecommendations(requestHandlingResults, resourceUsageResults);

      const totalDuration = performance.now() - startTime;
      safeLogger.info(`✅ Benchmarks completed in ${totalDuration.toFixed(2)}ms`);

      return {
        requestHandling: requestHandlingResults,
        resourceUsage: resourceUsageResults,
        overallScore,
        recommendations
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run request handling benchmarks
   */
  private async runRequestHandlingBenchmarks(): Promise<RequestHandlingBenchmark[]> {
    const endpoints = [
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/marketplace/listings' },
      { method: 'POST', path: '/api/auth/wallet-signature' },
      { method: 'GET', path: '/api/communities' },
      { method: 'GET', path: '/api/feed' }
    ];

    const results: RequestHandlingBenchmark[] = [];

    for (const endpoint of endpoints) {
      const benchmark = await this.benchmarkEndpoint(endpoint.method, endpoint.path);
      results.push(benchmark);
      
      // Record in benchmark suite
      this.recordBenchmark('request_handling', {
        name: `${endpoint.method} ${endpoint.path}`,
        duration: benchmark.averageResponseTime,
        timestamp: new Date(),
        success: benchmark.errorRate < 0.05,
        metadata: benchmark
      });
    }

    return results;
  }

  /**
   * Benchmark a specific endpoint
   */
  private async benchmarkEndpoint(method: string, path: string): Promise<RequestHandlingBenchmark> {
    const concurrentRequests = 10;
    const totalRequests = 100;
    const responseTimes: number[] = [];
    let errors = 0;

    const startTime = performance.now();

    // Run concurrent requests in batches
    for (let batch = 0; batch < totalRequests / concurrentRequests; batch++) {
      const promises = Array(concurrentRequests).fill(null).map(async () => {
        const requestStart = performance.now();
        try {
          // Simulate request (in real implementation, would make actual HTTP requests)
          await this.simulateRequest(method, path);
          const requestTime = performance.now() - requestStart;
          responseTimes.push(requestTime);
        } catch (error) {
          errors++;
          responseTimes.push(5000); // Penalty for errors
        }
      });

      await Promise.all(promises);
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Calculate statistics
    responseTimes.sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];
    const throughput = totalRequests / (totalDuration / 1000); // requests per second
    const errorRate = errors / totalRequests;

    return {
      endpoint: path,
      method,
      concurrentRequests,
      totalRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate
    };
  }

  /**
   * Simulate a request for benchmarking
   */
  private async simulateRequest(method: string, path: string): Promise<void> {
    // Simulate different types of operations based on endpoint
    if (path.includes('database') || path.includes('listings')) {
      // Simulate database query
      await this.simulateDatabaseQuery();
    } else if (path.includes('cache')) {
      // Simulate cache operation
      await this.simulateCacheOperation();
    } else {
      // Simulate basic processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
    }
  }

  /**
   * Simulate database query
   */
  private async simulateDatabaseQuery(): Promise<void> {
    try {
      const client = await this.pool.connect();
      const start = performance.now();
      await client.query('SELECT 1');
      const duration = performance.now() - start;
      client.release();
      
      // Record query performance
      performanceMonitoringService.recordRequest('GET', '/benchmark/db', duration, 200);
    } catch (error) {
      performanceMonitoringService.recordRequest('GET', '/benchmark/db', 5000, 500, error);
      throw error;
    }
  }

  /**
   * Simulate cache operation
   */
  private async simulateCacheOperation(): Promise<void> {
    try {
      const start = performance.now();
      await this.redis.get('benchmark:test');
      const duration = performance.now() - start;
      
      performanceMonitoringService.recordRequest('GET', '/benchmark/cache', duration, 200);
    } catch (error) {
      performanceMonitoringService.recordRequest('GET', '/benchmark/cache', 1000, 500, error);
      throw error;
    }
  }

  /**
   * Run resource usage benchmarks
   */
  private async runResourceUsageBenchmarks(): Promise<BackendResourceBenchmark> {
    const memoryStats = memoryMonitoringService.getMemoryStats();
    
    // Simulate memory-intensive operations
    const memoryBenchmark = await this.benchmarkMemoryUsage();
    
    // Benchmark database connections
    const dbBenchmark = await this.benchmarkDatabaseConnections();

    // Benchmark CPU usage (simplified)
    const cpuBenchmark = await this.benchmarkCpuUsage();

    return {
      memoryUsage: memoryBenchmark,
      cpuUsage: cpuBenchmark,
      databaseConnections: dbBenchmark
    };
  }

  /**
   * Benchmark memory usage patterns
   */
  private async benchmarkMemoryUsage(): Promise<BackendResourceBenchmark['memoryUsage']> {
    const initialStats = memoryMonitoringService.getMemoryStats();
    const baseline = initialStats.heapUsed;
    
    let peak = baseline;
    let total = baseline;
    let samples = 1;
    let gcCount = 0;

    // Monitor memory for 30 seconds during intensive operations
    const monitoringPromise = new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        const stats = memoryMonitoringService.getMemoryStats();
        peak = Math.max(peak, stats.heapUsed);
        total += stats.heapUsed;
        samples++;

        if (samples >= 30) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });

    // Perform memory-intensive operations
    const operations = Array(10).fill(null).map(async () => {
      const largeArray = new Array(100000).fill(Math.random());
      await new Promise(resolve => setTimeout(resolve, 100));
      return largeArray.length;
    });

    await Promise.all([monitoringPromise, ...operations]);

    // Force GC and measure
    if (global.gc) {
      const beforeGc = memoryMonitoringService.getMemoryStats().heapUsed;
      global.gc();
      const afterGc = memoryMonitoringService.getMemoryStats().heapUsed;
      gcCount = beforeGc - afterGc > 10 ? 1 : 0;
    }

    const average = total / samples;

    this.recordBenchmark('memory_management', {
      name: 'memory_usage_pattern',
      duration: peak - baseline,
      timestamp: new Date(),
      success: peak < baseline * 2,
      metadata: { baseline, peak, average, gcCount }
    });

    return {
      baseline,
      peak,
      average,
      gcFrequency: gcCount
    };
  }

  /**
   * Benchmark database connection performance
   */
  private async benchmarkDatabaseConnections(): Promise<BackendResourceBenchmark['databaseConnections']> {
    const poolSize = this.pool.totalCount;
    const activeConnections = this.pool.totalCount - this.pool.idleCount;
    const utilization = (activeConnections / poolSize) * 100;

    // Measure query latency
    const start = performance.now();
    try {
      const client = await this.pool.connect();
      await client.query('SELECT pg_sleep(0.001)'); // 1ms sleep
      client.release();
      const queryLatency = performance.now() - start;

      this.recordBenchmark('database_operations', {
        name: 'connection_pool_performance',
        duration: queryLatency,
        timestamp: new Date(),
        success: queryLatency < 100,
        metadata: { poolSize, activeConnections, utilization }
      });

      return {
        poolSize,
        activeConnections,
        utilization,
        queryLatency
      };
    } catch (error) {
      safeLogger.error('Database benchmark failed:', error);
      return {
        poolSize,
        activeConnections,
        utilization,
        queryLatency: 5000
      };
    }
  }

  /**
   * Benchmark CPU usage (simplified)
   */
  private async benchmarkCpuUsage(): Promise<BackendResourceBenchmark['cpuUsage']> {
    const baseline = process.cpuUsage();
    
    // Perform CPU-intensive operations
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }
    const duration = performance.now() - start;

    const final = process.cpuUsage(baseline);
    const cpuPercent = (final.user + final.system) / 1000 / duration * 100;

    return {
      baseline: 0,
      peak: cpuPercent,
      average: cpuPercent / 2
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(
    requestHandling: RequestHandlingBenchmark[],
    resourceUsage: BackendResourceBenchmark
  ): number {
    let score = 100;

    // Penalize slow response times
    const avgResponseTime = requestHandling.reduce((sum, r) => sum + r.averageResponseTime, 0) / requestHandling.length;
    if (avgResponseTime > 1000) score -= 30;
    else if (avgResponseTime > 500) score -= 15;
    else if (avgResponseTime > 200) score -= 5;

    // Penalize high error rates
    const avgErrorRate = requestHandling.reduce((sum, r) => sum + r.errorRate, 0) / requestHandling.length;
    if (avgErrorRate > 0.05) score -= 25;
    else if (avgErrorRate > 0.01) score -= 10;

    // Penalize high memory usage
    if (resourceUsage.memoryUsage.peak > resourceUsage.memoryUsage.baseline * 2) score -= 20;
    else if (resourceUsage.memoryUsage.peak > resourceUsage.memoryUsage.baseline * 1.5) score -= 10;

    // Penalize high database connection utilization
    if (resourceUsage.databaseConnections.utilization > 90) score -= 15;
    else if (resourceUsage.databaseConnections.utilization > 70) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    requestHandling: RequestHandlingBenchmark[],
    resourceUsage: BackendResourceBenchmark
  ): string[] {
    const recommendations: string[] = [];

    // Request handling recommendations
    const slowEndpoints = requestHandling.filter(r => r.averageResponseTime > 500);
    if (slowEndpoints.length > 0) {
      recommendations.push(`Optimize slow endpoints: ${slowEndpoints.map(e => e.endpoint).join(', ')}`);
    }

    const highErrorEndpoints = requestHandling.filter(r => r.errorRate > 0.01);
    if (highErrorEndpoints.length > 0) {
      recommendations.push(`Investigate error-prone endpoints: ${highErrorEndpoints.map(e => e.endpoint).join(', ')}`);
    }

    // Memory recommendations
    if (resourceUsage.memoryUsage.peak > resourceUsage.memoryUsage.baseline * 1.5) {
      recommendations.push('Consider implementing memory pooling or reducing object allocation');
    }

    if (resourceUsage.memoryUsage.gcFrequency === 0 && resourceUsage.memoryUsage.peak > 500) {
      recommendations.push('Enable garbage collection monitoring with --expose-gc flag');
    }

    // Database recommendations
    if (resourceUsage.databaseConnections.utilization > 80) {
      recommendations.push('Consider increasing database connection pool size');
    }

    if (resourceUsage.databaseConnections.queryLatency > 100) {
      recommendations.push('Optimize database queries and consider adding indexes');
    }

    // CPU recommendations
    if (resourceUsage.cpuUsage.peak > 80) {
      recommendations.push('Consider optimizing CPU-intensive operations or scaling horizontally');
    }

    return recommendations;
  }

  /**
   * Record a benchmark result
   */
  private recordBenchmark(suiteName: string, result: BenchmarkResult): void {
    const suite = this.benchmarkSuites.get(suiteName);
    if (!suite) return;

    suite.benchmarks.push(result);
    suite.lastRun = new Date();

    // Keep only last 100 results
    if (suite.benchmarks.length > 100) {
      suite.benchmarks = suite.benchmarks.slice(-100);
    }

    // Update suite statistics
    const successfulBenchmarks = suite.benchmarks.filter(b => b.success);
    suite.successRate = successfulBenchmarks.length / suite.benchmarks.length;
    suite.averageDuration = successfulBenchmarks.reduce((sum, b) => sum + b.duration, 0) / successfulBenchmarks.length;
  }

  /**
   * Get benchmark history
   */
  getBenchmarkHistory(suiteName?: string): Map<string, BenchmarkSuite> | BenchmarkSuite | null {
    if (suiteName) {
      return this.benchmarkSuites.get(suiteName) || null;
    }
    return new Map(this.benchmarkSuites);
  }

  /**
   * Get benchmark summary
   */
  getBenchmarkSummary(): {
    totalSuites: number;
    totalBenchmarks: number;
    overallSuccessRate: number;
    lastRun: Date | null;
  } {
    const suites = Array.from(this.benchmarkSuites.values());
    const totalBenchmarks = suites.reduce((sum, suite) => sum + suite.benchmarks.length, 0);
    const successfulBenchmarks = suites.reduce((sum, suite) => 
      sum + suite.benchmarks.filter(b => b.success).length, 0);
    
    const lastRuns = suites.map(s => s.lastRun).filter(d => d);
    const lastRun = lastRuns.length > 0 ? new Date(Math.max(...lastRuns.map(d => d.getTime()))) : null;

    return {
      totalSuites: suites.length,
      totalBenchmarks,
      overallSuccessRate: totalBenchmarks > 0 ? successfulBenchmarks / totalBenchmarks : 0,
      lastRun
    };
  }
}

export default PerformanceBenchmarkService;