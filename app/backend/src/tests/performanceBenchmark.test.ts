import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PerformanceOptimizationService, ContentInput } from '../services/performanceOptimizationService';
import { PerceptualHashingService } from '../services/perceptualHashingService';
import { TextHashingService } from '../services/textHashingService';
import { VendorApiOptimizer } from '../services/vendorApiOptimizer';
import { ModerationCacheService } from '../services/moderationCacheService';

interface BenchmarkResult {
  operation: string;
  totalTime: number;
  averageTime: number;
  throughput: number;
  memoryUsage?: number;
  cacheHitRate?: number;
  errorRate?: number;
}

describe('Performance Benchmarking Tests', () => {
  let performanceService: PerformanceOptimizationService;
  let benchmarkResults: BenchmarkResult[] = [];

  beforeEach(() => {
    performanceService = new PerformanceOptimizationService();
    benchmarkResults = [];
  });

  afterEach(async () => {
    await performanceService.cleanup();
    
    // Log benchmark results
    console.log('\n=== Performance Benchmark Results ===');
    benchmarkResults.forEach(result => {
      console.log(`${result.operation}:`);
      console.log(`  Total Time: ${result.totalTime}ms`);
      console.log(`  Average Time: ${result.averageTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.throughput.toFixed(2)} ops/sec`);
      if (result.cacheHitRate !== undefined) {
        console.log(`  Cache Hit Rate: ${(result.cacheHitRate * 100).toFixed(1)}%`);
      }
      if (result.errorRate !== undefined) {
        console.log(`  Error Rate: ${(result.errorRate * 100).toFixed(1)}%`);
      }
      console.log('');
    });
  });

  async function runBenchmark(
    operation: string,
    testFunction: () => Promise<void>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    let errors = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        await testFunction();
      } catch (error) {
        errors++;
      }
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;
    const throughput = (iterations / totalTime) * 1000;

    const result: BenchmarkResult = {
      operation,
      totalTime,
      averageTime,
      throughput,
      memoryUsage: endMemory - startMemory,
      errorRate: errors / iterations
    };

    benchmarkResults.push(result);
    return result;
  }

  describe('Text Hashing Performance', () => {
    it('should benchmark text hash generation', async () => {
      const textHashingService = new TextHashingService();
      const testTexts = Array.from({ length: 1000 }, (_, i) => 
        `This is test message number ${i} with some additional content to make it realistic`
      );

      let index = 0;
      const result = await runBenchmark(
        'Text Hash Generation',
        async () => {
          textHashingService.generateTextHashes(testTexts[index % testTexts.length]);
          index++;
        },
        1000
      );

      expect(result.averageTime).toBeLessThan(10); // Should be under 10ms per hash
      expect(result.throughput).toBeGreaterThan(100); // Should handle 100+ hashes per second
    });

    it('should benchmark text duplicate detection', async () => {
      const textHashingService = new TextHashingService();
      const baseTexts = Array.from({ length: 100 }, (_, i) => 
        `Base message ${i} for duplicate detection testing`
      );

      // Create existing content map
      const existingContent = new Map();
      baseTexts.forEach((text, i) => {
        existingContent.set(`content-${i}`, {
          hash: textHashingService.generateTextHashes(text),
          text
        });
      });

      const testTexts = [
        ...baseTexts.slice(0, 50), // 50% exact duplicates
        ...baseTexts.slice(0, 25).map(text => text + '!'), // 25% near duplicates
        ...Array.from({ length: 25 }, (_, i) => `New unique message ${i}`) // 25% unique
      ];

      let index = 0;
      const result = await runBenchmark(
        'Text Duplicate Detection',
        async () => {
          await textHashingService.checkForDuplicate(
            testTexts[index % testTexts.length],
            existingContent
          );
          index++;
        },
        100
      );

      expect(result.averageTime).toBeLessThan(50); // Should be under 50ms per check
      expect(result.throughput).toBeGreaterThan(20); // Should handle 20+ checks per second
    });
  });

  describe('Image Hashing Performance', () => {
    it('should benchmark image hash generation', async () => {
      const perceptualHashingService = new PerceptualHashingService();
      
      // Create test image buffers (simplified PNG-like data)
      const testImages = Array.from({ length: 50 }, (_, i) => {
        const size = 1000 + (i * 100); // Varying sizes
        return Buffer.alloc(size, i % 256);
      });

      let index = 0;
      const result = await runBenchmark(
        'Image Hash Generation',
        async () => {
          try {
            await perceptualHashingService.generateImageHash(testImages[index % testImages.length]);
          } catch (error) {
            // Expected for invalid image data in benchmark
          }
          index++;
        },
        50
      );

      expect(result.averageTime).toBeLessThan(1000); // Should be under 1 second per hash
      expect(result.throughput).toBeGreaterThan(1); // Should handle 1+ hashes per second
    });

    it('should benchmark image similarity calculation', async () => {
      const perceptualHashingService = new PerceptualHashingService();
      
      // Generate test hashes
      const testHashes = Array.from({ length: 100 }, (_, i) => 
        i.toString(16).padStart(16, '0')
      );

      let index = 0;
      const result = await runBenchmark(
        'Image Similarity Calculation',
        async () => {
          const hash1 = testHashes[index % testHashes.length];
          const hash2 = testHashes[(index + 1) % testHashes.length];
          perceptualHashingService.calculateSimilarity(hash1, hash2);
          index++;
        },
        1000
      );

      expect(result.averageTime).toBeLessThan(1); // Should be under 1ms per calculation
      expect(result.throughput).toBeGreaterThan(1000); // Should handle 1000+ calculations per second
    });
  });

  describe('Vendor API Optimization Performance', () => {
    it('should benchmark vendor API batching', async () => {
      const vendorOptimizer = new VendorApiOptimizer();
      
      const testContents = Array.from({ length: 200 }, (_, i) => 
        `Test content for vendor API batching ${i}`
      );

      let index = 0;
      const result = await runBenchmark(
        'Vendor API Batching',
        async () => {
          await vendorOptimizer.batchRequest(
            'openai',
            testContents[index % testContents.length],
            'text',
            'medium'
          );
          index++;
        },
        200
      );

      expect(result.averageTime).toBeLessThan(100); // Should be under 100ms per request
      expect(result.throughput).toBeGreaterThan(10); // Should handle 10+ requests per second
    });

    it('should benchmark concurrent vendor requests', async () => {
      const vendorOptimizer = new VendorApiOptimizer();
      
      const result = await runBenchmark(
        'Concurrent Vendor Requests',
        async () => {
          const requests = Array.from({ length: 10 }, (_, i) => 
            vendorOptimizer.batchRequest('openai', `Concurrent test ${i}`, 'text', 'medium')
          );
          await Promise.all(requests);
        },
        20
      );

      expect(result.averageTime).toBeLessThan(5000); // Should be under 5 seconds for 10 concurrent requests
      expect(result.throughput).toBeGreaterThan(0.2); // Should handle batches efficiently
    });
  });

  describe('Cache Performance', () => {
    it('should benchmark cache operations', async () => {
      const cacheService = new ModerationCacheService();
      
      const testResults = Array.from({ length: 1000 }, (_, i) => ({
        contentId: `cache-test-${i}`,
        decision: 'allow' as const,
        confidence: Math.random(),
        categories: ['safe'],
        vendorScores: { openai: Math.random() },
        timestamp: Date.now(),
        ttl: 3600
      }));

      // Benchmark cache writes
      let index = 0;
      const writeResult = await runBenchmark(
        'Cache Write Operations',
        async () => {
          await cacheService.cacheModerationResult(testResults[index % testResults.length]);
          index++;
        },
        1000
      );

      // Benchmark cache reads
      index = 0;
      const readResult = await runBenchmark(
        'Cache Read Operations',
        async () => {
          await cacheService.getModerationResult(`cache-test-${index % testResults.length}`);
          index++;
        },
        1000
      );

      expect(writeResult.averageTime).toBeLessThan(10); // Should be under 10ms per write
      expect(readResult.averageTime).toBeLessThan(5); // Should be under 5ms per read
      expect(writeResult.throughput).toBeGreaterThan(100); // Should handle 100+ writes per second
      expect(readResult.throughput).toBeGreaterThan(200); // Should handle 200+ reads per second

      await cacheService.close();
    });

    it('should benchmark batch cache operations', async () => {
      const cacheService = new ModerationCacheService();
      
      const batchSize = 100;
      const testResults = Array.from({ length: batchSize }, (_, i) => ({
        contentId: `batch-cache-${i}`,
        decision: 'allow' as const,
        confidence: Math.random(),
        categories: ['safe'],
        vendorScores: { openai: Math.random() },
        timestamp: Date.now(),
        ttl: 3600
      }));

      const result = await runBenchmark(
        'Batch Cache Operations',
        async () => {
          await cacheService.batchCacheModerationResults(testResults);
          const contentIds = testResults.map(r => r.contentId);
          await cacheService.batchGetModerationResults(contentIds);
        },
        10
      );

      expect(result.averageTime).toBeLessThan(1000); // Should be under 1 second for 100 items
      expect(result.throughput).toBeGreaterThan(1); // Should handle batches efficiently

      await cacheService.close();
    });
  });

  describe('End-to-End Performance', () => {
    it('should benchmark complete moderation pipeline', async () => {
      const testContents: ContentInput[] = Array.from({ length: 100 }, (_, i) => ({
        id: `e2e-test-${i}`,
        type: 'text',
        content: `End-to-end test message ${i} with varying content length and complexity`,
        userId: `user-${i % 10}`,
        metadata: { source: 'benchmark' }
      }));

      let index = 0;
      const result = await runBenchmark(
        'Complete Moderation Pipeline',
        async () => {
          await performanceService.processContent(testContents[index % testContents.length]);
          index++;
        },
        100
      );

      // Get cache hit rate from performance service
      const metrics = performanceService.getPerformanceMetrics();
      result.cacheHitRate = metrics.cacheHitRate;

      expect(result.averageTime).toBeLessThan(5000); // Should be under 5 seconds per item
      expect(result.throughput).toBeGreaterThan(0.2); // Should handle reasonable throughput
      expect(result.errorRate).toBeLessThan(0.1); // Should have low error rate
    });

    it('should benchmark batch processing performance', async () => {
      const batchSizes = [10, 25, 50, 100];
      
      for (const batchSize of batchSizes) {
        const testContents: ContentInput[] = Array.from({ length: batchSize }, (_, i) => ({
          id: `batch-${batchSize}-${i}`,
          type: 'text',
          content: `Batch test message ${i} for size ${batchSize}`,
          userId: `user-${i}`
        }));

        const result = await runBenchmark(
          `Batch Processing (${batchSize} items)`,
          async () => {
            await performanceService.batchProcessContent(testContents);
          },
          5
        );

        expect(result.averageTime).toBeLessThan(batchSize * 1000); // Should scale reasonably
        expect(result.errorRate).toBeLessThan(0.1);
      }
    });

    it('should benchmark system under sustained load', async () => {
      const loadDuration = 10000; // 10 seconds
      const requestInterval = 200; // Every 200ms
      let requestCount = 0;
      let successCount = 0;
      let totalTime = 0;

      const startTime = Date.now();
      
      const loadTest = setInterval(async () => {
        if (Date.now() - startTime >= loadDuration) {
          clearInterval(loadTest);
          return;
        }

        const content: ContentInput = {
          id: `load-test-${requestCount}`,
          type: 'text',
          content: `Load test message ${requestCount}`,
          userId: `user-${requestCount % 5}`
        };

        const requestStart = Date.now();
        try {
          await performanceService.processContent(content);
          successCount++;
          totalTime += Date.now() - requestStart;
        } catch (error) {
          // Track errors but continue
        }
        requestCount++;
      }, requestInterval);

      // Wait for load test to complete
      await new Promise(resolve => setTimeout(resolve, loadDuration + 1000));

      const result: BenchmarkResult = {
        operation: 'Sustained Load Test',
        totalTime: loadDuration,
        averageTime: totalTime / successCount,
        throughput: (successCount / loadDuration) * 1000,
        errorRate: (requestCount - successCount) / requestCount
      };

      benchmarkResults.push(result);

      expect(result.throughput).toBeGreaterThan(2); // Should handle at least 2 requests per second
      expect(result.errorRate).toBeLessThan(0.2); // Should have reasonable error rate under load
      expect(result.averageTime).toBeLessThan(10000); // Should maintain reasonable response times
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should benchmark memory efficiency', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process a large amount of content
      const largeDataset: ContentInput[] = Array.from({ length: 500 }, (_, i) => ({
        id: `memory-test-${i}`,
        type: 'text',
        content: `Memory efficiency test message ${i}`.repeat(50), // Larger content
        userId: `user-${i % 20}`
      }));

      const startTime = Date.now();
      await performanceService.batchProcessContent(largeDataset);
      const endTime = Date.now();

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerItem = memoryIncrease / largeDataset.length;

      const result: BenchmarkResult = {
        operation: 'Memory Efficiency Test',
        totalTime: endTime - startTime,
        averageTime: (endTime - startTime) / largeDataset.length,
        throughput: (largeDataset.length / (endTime - startTime)) * 1000,
        memoryUsage: memoryIncrease
      };

      benchmarkResults.push(result);

      expect(memoryPerItem).toBeLessThan(100000); // Should use less than 100KB per item
      expect(memoryIncrease).toBeLessThan(50000000); // Should use less than 50MB total
    });

    it('should benchmark garbage collection impact', async () => {
      const gcStats: any[] = [];
      
      // Monitor GC if available
      if (global.gc) {
        const originalGc = global.gc;
        global.gc = () => {
          const before = process.memoryUsage();
          originalGc();
          const after = process.memoryUsage();
          gcStats.push({
            before: before.heapUsed,
            after: after.heapUsed,
            freed: before.heapUsed - after.heapUsed
          });
        };
      }

      // Process content that should trigger GC
      const testContents: ContentInput[] = Array.from({ length: 200 }, (_, i) => ({
        id: `gc-test-${i}`,
        type: 'text',
        content: `GC test message ${i}`.repeat(100),
        userId: `user-${i}`
      }));

      const result = await runBenchmark(
        'GC Impact Test',
        async () => {
          const batch = testContents.slice(0, 10);
          await performanceService.batchProcessContent(batch);
          
          // Force GC if available
          if (global.gc) {
            global.gc();
          }
        },
        20
      );

      expect(result.averageTime).toBeLessThan(10000); // Should handle GC impact reasonably
      
      if (gcStats.length > 0) {
        const avgFreed = gcStats.reduce((sum, stat) => sum + stat.freed, 0) / gcStats.length;
        console.log(`Average memory freed per GC: ${(avgFreed / 1024 / 1024).toFixed(2)}MB`);
      }
    });
  });
});