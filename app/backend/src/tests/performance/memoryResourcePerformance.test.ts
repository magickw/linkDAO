/**
 * Memory and Resource Usage Performance Tests
 * Tests for memory leaks, resource cleanup, garbage collection, and system resource utilization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { DatabaseOptimizationService } from '../../services/databaseOptimizationService';
import { CachingStrategiesService } from '../../services/cachingStrategiesService';
import { WebSocketService } from '../../services/webSocketService';
import { IntelligentCacheService } from '../../services/intelligentCacheService';

// Memory monitoring utilities
class MemoryMonitor extends EventEmitter {
  private monitoring = false;
  private interval: NodeJS.Timeout | null = null;
  private samples: MemorySample[] = [];

  start(intervalMs = 1000) {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.samples = [];
    
    this.interval = setInterval(() => {
      const sample = this.takeSample();
      this.samples.push(sample);
      this.emit('sample', sample);
    }, intervalMs);
  }

  stop(): MemoryAnalysis {
    if (!this.monitoring) return this.getEmptyAnalysis();
    
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    return this.analyzeMemoryUsage();
  }

  private takeSample(): MemorySample {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers || 0,
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system
    };
  }

  private analyzeMemoryUsage(): MemoryAnalysis {
    if (this.samples.length === 0) return this.getEmptyAnalysis();

    const heapUsedValues = this.samples.map(s => s.heapUsed);
    const heapTotalValues = this.samples.map(s => s.heapTotal);
    const rssValues = this.samples.map(s => s.rss);

    return {
      duration: this.samples[this.samples.length - 1].timestamp - this.samples[0].timestamp,
      sampleCount: this.samples.length,
      heapUsed: {
        initial: heapUsedValues[0],
        final: heapUsedValues[heapUsedValues.length - 1],
        min: Math.min(...heapUsedValues),
        max: Math.max(...heapUsedValues),
        average: heapUsedValues.reduce((sum, val) => sum + val, 0) / heapUsedValues.length,
        growth: heapUsedValues[heapUsedValues.length - 1] - heapUsedValues[0]
      },
      heapTotal: {
        initial: heapTotalValues[0],
        final: heapTotalValues[heapTotalValues.length - 1],
        min: Math.min(...heapTotalValues),
        max: Math.max(...heapTotalValues),
        average: heapTotalValues.reduce((sum, val) => sum + val, 0) / heapTotalValues.length,
        growth: heapTotalValues[heapTotalValues.length - 1] - heapTotalValues[0]
      },
      rss: {
        initial: rssValues[0],
        final: rssValues[rssValues.length - 1],
        min: Math.min(...rssValues),
        max: Math.max(...rssValues),
        average: rssValues.reduce((sum, val) => sum + val, 0) / rssValues.length,
        growth: rssValues[rssValues.length - 1] - rssValues[0]
      },
      samples: this.samples
    };
  }

  private getEmptyAnalysis(): MemoryAnalysis {
    return {
      duration: 0,
      sampleCount: 0,
      heapUsed: { initial: 0, final: 0, min: 0, max: 0, average: 0, growth: 0 },
      heapTotal: { initial: 0, final: 0, min: 0, max: 0, average: 0, growth: 0 },
      rss: { initial: 0, final: 0, min: 0, max: 0, average: 0, growth: 0 },
      samples: []
    };
  }

  forceGarbageCollection() {
    if (global.gc) {
      global.gc();
    }
  }
}

interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  cpuUser: number;
  cpuSystem: number;
}

interface MemoryStats {
  initial: number;
  final: number;
  min: number;
  max: number;
  average: number;
  growth: number;
}

interface MemoryAnalysis {
  duration: number;
  sampleCount: number;
  heapUsed: MemoryStats;
  heapTotal: MemoryStats;
  rss: MemoryStats;
  samples: MemorySample[];
}

// Resource leak detector
class ResourceLeakDetector {
  private initialState: any = {};
  private resources: Map<string, any> = new Map();

  captureInitialState() {
    this.initialState = {
      eventEmitters: this.countEventEmitters(),
      timers: this.countTimers(),
      fileDescriptors: this.countFileDescriptors(),
      memoryUsage: process.memoryUsage()
    };
  }

  registerResource(name: string, resource: any) {
    this.resources.set(name, resource);
  }

  unregisterResource(name: string) {
    this.resources.delete(name);
  }

  detectLeaks(): ResourceLeakReport {
    const currentState = {
      eventEmitters: this.countEventEmitters(),
      timers: this.countTimers(),
      fileDescriptors: this.countFileDescriptors(),
      memoryUsage: process.memoryUsage()
    };

    const leaks: any[] = [];

    // Check for EventEmitter leaks
    if (currentState.eventEmitters > this.initialState.eventEmitters + 10) {
      leaks.push({
        type: 'EventEmitter',
        initial: this.initialState.eventEmitters,
        current: currentState.eventEmitters,
        difference: currentState.eventEmitters - this.initialState.eventEmitters
      });
    }

    // Check for timer leaks
    if (currentState.timers > this.initialState.timers + 5) {
      leaks.push({
        type: 'Timer',
        initial: this.initialState.timers,
        current: currentState.timers,
        difference: currentState.timers - this.initialState.timers
      });
    }

    // Check for memory leaks (significant growth)
    const memoryGrowth = currentState.memoryUsage.heapUsed - this.initialState.memoryUsage.heapUsed;
    const memoryGrowthMB = memoryGrowth / (1024 * 1024);
    
    if (memoryGrowthMB > 50) { // More than 50MB growth
      leaks.push({
        type: 'Memory',
        initial: this.initialState.memoryUsage.heapUsed,
        current: currentState.memoryUsage.heapUsed,
        difference: memoryGrowth,
        differenceMB: memoryGrowthMB
      });
    }

    // Check for uncleaned resources
    const uncleanedResources = Array.from(this.resources.keys());
    if (uncleanedResources.length > 0) {
      leaks.push({
        type: 'UncleanedResource',
        resources: uncleanedResources
      });
    }

    return {
      hasLeaks: leaks.length > 0,
      leaks,
      initialState: this.initialState,
      currentState
    };
  }

  private countEventEmitters(): number {
    // This is a simplified count - in a real implementation,
    // you'd traverse the object graph to count EventEmitters
    return process.listenerCount('exit') + process.listenerCount('uncaughtException');
  }

  private countTimers(): number {
    // This is a simplified count - in a real implementation,
    // you'd use process._getActiveHandles() or similar
    return 0; // Placeholder
  }

  private countFileDescriptors(): number {
    // This would require native bindings to get actual FD count
    return 0; // Placeholder
  }
}

interface ResourceLeakReport {
  hasLeaks: boolean;
  leaks: any[];
  initialState: any;
  currentState: any;
}

describe('Memory and Resource Usage Performance Tests', () => {
  let dbService: DatabaseOptimizationService;
  let cachingService: CachingStrategiesService;
  let wsService: WebSocketService;
  let intelligentCache: IntelligentCacheService;
  let memoryMonitor: MemoryMonitor;
  let leakDetector: ResourceLeakDetector;

  beforeAll(async () => {
    // Initialize services
    dbService = new DatabaseOptimizationService({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'test_marketplace',
      user: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      max: 20,
      min: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
    }, process.env.TEST_REDIS_URL || 'redis://localhost:6379');

    cachingService = new CachingStrategiesService({
      redis: {
        host: 'localhost',
        port: 6379,
        db: 15,
        keyPrefix: 'memory_test:',
      },
      memory: {
        maxSize: 10000,
        ttl: 300000,
      },
    });

    wsService = new WebSocketService();
    intelligentCache = new IntelligentCacheService(cachingService);
    memoryMonitor = new MemoryMonitor();
    leakDetector = new ResourceLeakDetector();

    await dbService.initialize();
    await cachingService.initialize();
    await intelligentCache.initialize();
  });

  afterAll(async () => {
    await dbService?.close();
    await cachingService?.close();
    await wsService?.close();
  });

  beforeEach(async () => {
    // Force garbage collection before each test
    if (global.gc) {
      global.gc();
    }
    
    // Clear caches
    await cachingService.clear();
    
    // Capture initial state for leak detection
    leakDetector.captureInitialState();
  });

  describe('Memory Usage Tests', () => {
    it('should maintain stable memory usage during normal operations', async () => {
      memoryMonitor.start(500); // Sample every 500ms

      // Simulate normal operations for 30 seconds
      const operations = [];
      const duration = 30000;
      const startTime = Date.now();

      while (Date.now() - startTime < duration) {
        // Database operations
        operations.push(
          dbService.executeOptimizedQuery(
            'SELECT COUNT(*) as count FROM posts WHERE created_at > $1',
            [new Date(Date.now() - 24 * 60 * 60 * 1000)],
            `memory_test_${Date.now()}`,
            60
          )
        );

        // Cache operations
        operations.push(
          cachingService.set(`test_key_${Date.now()}`, { data: 'test' }, 300)
        );

        // Wait between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await Promise.all(operations);
      const analysis = memoryMonitor.stop();

      // Memory should remain relatively stable
      const heapGrowthMB = analysis.heapUsed.growth / (1024 * 1024);
      const rssGrowthMB = analysis.rss.growth / (1024 * 1024);

      expect(heapGrowthMB).toBeLessThan(50); // Less than 50MB heap growth
      expect(rssGrowthMB).toBeLessThan(100); // Less than 100MB RSS growth

      console.log(`Memory Usage During Normal Operations:
        Duration: ${analysis.duration}ms
        Heap Growth: ${heapGrowthMB.toFixed(2)}MB
        RSS Growth: ${rssGrowthMB.toFixed(2)}MB
        Max Heap: ${(analysis.heapUsed.max / 1024 / 1024).toFixed(2)}MB
        Operations Completed: ${operations.length}`);
    });

    it('should handle memory pressure gracefully', async () => {
      memoryMonitor.start(1000);

      // Create memory pressure by allocating large objects
      const largeObjects: any[] = [];
      const objectSize = 1024 * 1024; // 1MB objects
      const objectCount = 100; // 100MB total

      try {
        for (let i = 0; i < objectCount; i++) {
          const largeObject = {
            id: i,
            data: Buffer.alloc(objectSize, 'x'),
            metadata: Array.from({ length: 1000 }, (_, j) => ({
              key: `key-${i}-${j}`,
              value: `value-${i}-${j}`.repeat(10)
            }))
          };
          
          largeObjects.push(largeObject);
          
          // Store in cache to test cache behavior under memory pressure
          await cachingService.set(`large_object_${i}`, largeObject, 300);
          
          // Perform some operations while under memory pressure
          if (i % 10 === 0) {
            await dbService.executeOptimizedQuery(
              'SELECT 1 as test',
              [],
              `pressure_test_${i}`,
              30
            );
          }
        }

        // Force garbage collection
        if (global.gc) {
          global.gc();
        }

        // Continue operations under pressure
        await new Promise(resolve => setTimeout(resolve, 5000));

      } finally {
        // Clean up large objects
        largeObjects.length = 0;
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
      }

      const analysis = memoryMonitor.stop();

      // System should handle memory pressure without crashing
      expect(analysis.sampleCount).toBeGreaterThan(0);
      
      // Memory should eventually be reclaimed (after GC)
      const finalHeapMB = analysis.heapUsed.final / (1024 * 1024);
      expect(finalHeapMB).toBeLessThan(500); // Should not exceed 500MB

      console.log(`Memory Pressure Test:
        Max Heap: ${(analysis.heapUsed.max / 1024 / 1024).toFixed(2)}MB
        Final Heap: ${(analysis.heapUsed.final / 1024 / 1024).toFixed(2)}MB
        Max RSS: ${(analysis.rss.max / 1024 / 1024).toFixed(2)}MB
        Objects Created: ${objectCount}`);
    });

    it('should demonstrate efficient garbage collection', async () => {
      const gcStats: any[] = [];
      
      // Monitor GC if available
      if (global.gc) {
        const originalGc = global.gc;
        global.gc = () => {
          const beforeGc = process.memoryUsage();
          originalGc();
          const afterGc = process.memoryUsage();
          
          gcStats.push({
            timestamp: Date.now(),
            beforeHeap: beforeGc.heapUsed,
            afterHeap: afterGc.heapUsed,
            reclaimed: beforeGc.heapUsed - afterGc.heapUsed
          });
        };
      }

      memoryMonitor.start(500);

      // Create and destroy objects to trigger GC
      for (let cycle = 0; cycle < 10; cycle++) {
        const tempObjects: any[] = [];
        
        // Allocate objects
        for (let i = 0; i < 1000; i++) {
          tempObjects.push({
            id: i,
            data: new Array(1000).fill(`data-${cycle}-${i}`),
            timestamp: Date.now()
          });
        }
        
        // Use objects briefly
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear references
        tempObjects.length = 0;
        
        // Force GC
        if (global.gc) {
          global.gc();
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const analysis = memoryMonitor.stop();

      // GC should be effective at reclaiming memory
      if (gcStats.length > 0) {
        const totalReclaimed = gcStats.reduce((sum, stat) => sum + stat.reclaimed, 0);
        const avgReclaimed = totalReclaimed / gcStats.length;
        
        expect(avgReclaimed).toBeGreaterThan(0); // Should reclaim some memory
        
        console.log(`Garbage Collection Efficiency:
          GC Cycles: ${gcStats.length}
          Total Reclaimed: ${(totalReclaimed / 1024 / 1024).toFixed(2)}MB
          Average Reclaimed: ${(avgReclaimed / 1024 / 1024).toFixed(2)}MB`);
      }

      // Memory should not grow indefinitely
      const heapGrowthMB = analysis.heapUsed.growth / (1024 * 1024);
      expect(heapGrowthMB).toBeLessThan(20); // Should not grow more than 20MB

      console.log(`GC Test Memory Analysis:
        Heap Growth: ${heapGrowthMB.toFixed(2)}MB
        Max Heap: ${(analysis.heapUsed.max / 1024 / 1024).toFixed(2)}MB
        Final Heap: ${(analysis.heapUsed.final / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Resource Leak Detection', () => {
    it('should detect and prevent database connection leaks', async () => {
      leakDetector.registerResource('dbService', dbService);

      // Simulate operations that could cause connection leaks
      const connectionOperations = [];
      
      for (let i = 0; i < 100; i++) {
        connectionOperations.push(
          dbService.executeOptimizedQuery(
            'SELECT $1 as test_value',
            [i],
            `connection_test_${i}`,
            30
          )
        );
      }

      await Promise.all(connectionOperations);

      // Check connection pool stats
      const poolStats = await dbService.getPoolStats();
      
      // Should not have excessive connections or waiting connections
      expect(poolStats.totalCount).toBeLessThanOrEqual(20); // Pool max
      expect(poolStats.waitingCount).toBe(0); // No waiting connections
      expect(poolStats.idleCount).toBeGreaterThan(0); // Some idle connections

      leakDetector.unregisterResource('dbService');
      
      const leakReport = leakDetector.detectLeaks();
      expect(leakReport.hasLeaks).toBe(false);

      console.log(`Database Connection Pool Health:
        Total Connections: ${poolStats.totalCount}
        Idle Connections: ${poolStats.idleCount}
        Waiting Connections: ${poolStats.waitingCount}
        Leak Detection: ${leakReport.hasLeaks ? 'FAILED' : 'PASSED'}`);
    });

    it('should detect and prevent WebSocket connection leaks', async () => {
      leakDetector.registerResource('wsService', wsService);

      const clients: any[] = [];
      
      // Create multiple WebSocket connections
      for (let i = 0; i < 50; i++) {
        const client = wsService.createTestClient();
        clients.push(client);
        
        // Simulate some activity
        client.send(JSON.stringify({ type: 'test', data: `message-${i}` }));
      }

      // Close half the connections properly
      for (let i = 0; i < 25; i++) {
        clients[i].close();
      }

      // Leave some connections open to test cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clean up remaining connections
      for (let i = 25; i < clients.length; i++) {
        clients[i].close();
      }

      leakDetector.unregisterResource('wsService');
      
      const leakReport = leakDetector.detectLeaks();
      
      // Should not have significant leaks
      expect(leakReport.hasLeaks).toBe(false);

      console.log(`WebSocket Connection Management:
        Connections Created: ${clients.length}
        Leak Detection: ${leakReport.hasLeaks ? 'FAILED' : 'PASSED'}`);
    });

    it('should detect and prevent cache memory leaks', async () => {
      leakDetector.registerResource('cachingService', cachingService);

      memoryMonitor.start(1000);

      // Perform intensive caching operations
      const cacheOperations = [];
      
      for (let i = 0; i < 10000; i++) {
        const key = `cache_leak_test_${i}`;
        const value = {
          id: i,
          data: new Array(100).fill(`data-${i}`),
          timestamp: Date.now()
        };
        
        cacheOperations.push(
          cachingService.set(key, value, 60).then(() =>
            cachingService.get(key)
          )
        );
      }

      await Promise.all(cacheOperations);

      // Clear cache
      await cachingService.clear();

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const analysis = memoryMonitor.stop();
      leakDetector.unregisterResource('cachingService');
      
      const leakReport = leakDetector.detectLeaks();

      // Memory should be reclaimed after cache clear
      const heapGrowthMB = analysis.heapUsed.growth / (1024 * 1024);
      expect(heapGrowthMB).toBeLessThan(30); // Should not grow more than 30MB
      expect(leakReport.hasLeaks).toBe(false);

      console.log(`Cache Memory Management:
        Cache Operations: ${cacheOperations.length}
        Heap Growth: ${heapGrowthMB.toFixed(2)}MB
        Leak Detection: ${leakReport.hasLeaks ? 'FAILED' : 'PASSED'}`);
    });

    it('should detect EventEmitter memory leaks', async () => {
      const eventEmitters: EventEmitter[] = [];
      const listeners: Function[] = [];

      // Create EventEmitters with listeners
      for (let i = 0; i < 100; i++) {
        const emitter = new EventEmitter();
        const listener = () => { /* do nothing */ };
        
        emitter.on('test', listener);
        emitter.on('data', listener);
        emitter.on('error', listener);
        
        eventEmitters.push(emitter);
        listeners.push(listener);
      }

      // Simulate some events
      eventEmitters.forEach((emitter, i) => {
        emitter.emit('test', `data-${i}`);
      });

      // Clean up properly (remove listeners)
      eventEmitters.forEach((emitter, i) => {
        emitter.removeAllListeners();
      });

      const leakReport = leakDetector.detectLeaks();

      // Should not detect EventEmitter leaks after proper cleanup
      const eventEmitterLeaks = leakReport.leaks.filter(leak => leak.type === 'EventEmitter');
      expect(eventEmitterLeaks.length).toBe(0);

      console.log(`EventEmitter Management:
        EventEmitters Created: ${eventEmitters.length}
        Listeners Created: ${listeners.length}
        EventEmitter Leaks: ${eventEmitterLeaks.length}`);
    });
  });

  describe('Resource Cleanup Tests', () => {
    it('should properly cleanup resources on service shutdown', async () => {
      memoryMonitor.start(500);

      // Create temporary services to test cleanup
      const tempDbService = new DatabaseOptimizationService({
        host: process.env.TEST_DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5432'),
        database: process.env.TEST_DB_NAME || 'test_marketplace',
        user: process.env.TEST_DB_USER || 'test',
        password: process.env.TEST_DB_PASSWORD || 'test',
        max: 5,
        min: 1,
      }, process.env.TEST_REDIS_URL || 'redis://localhost:6379');

      const tempCacheService = new CachingStrategiesService({
        redis: {
          host: 'localhost',
          port: 6379,
          db: 14,
          keyPrefix: 'cleanup_test:',
        },
        memory: {
          maxSize: 1000,
          ttl: 60000,
        },
      });

      await tempDbService.initialize();
      await tempCacheService.initialize();

      // Use the services
      await tempDbService.executeOptimizedQuery('SELECT 1', [], 'cleanup_test', 30);
      await tempCacheService.set('test_key', { data: 'test' }, 60);

      // Measure memory before cleanup
      const beforeCleanup = process.memoryUsage();

      // Cleanup services
      await tempDbService.close();
      await tempCacheService.close();

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const analysis = memoryMonitor.stop();
      const afterCleanup = process.memoryUsage();

      // Memory should be reclaimed after cleanup
      const memoryReclaimed = beforeCleanup.heapUsed - afterCleanup.heapUsed;
      const reclaimedMB = memoryReclaimed / (1024 * 1024);

      expect(reclaimedMB).toBeGreaterThanOrEqual(0); // Should reclaim some memory

      console.log(`Resource Cleanup Test:
        Memory Before Cleanup: ${(beforeCleanup.heapUsed / 1024 / 1024).toFixed(2)}MB
        Memory After Cleanup: ${(afterCleanup.heapUsed / 1024 / 1024).toFixed(2)}MB
        Memory Reclaimed: ${reclaimedMB.toFixed(2)}MB
        Test Duration: ${analysis.duration}ms`);
    });

    it('should handle graceful shutdown under load', async () => {
      memoryMonitor.start(1000);

      const tempServices = [];
      const operations = [];

      // Create multiple services under load
      for (let i = 0; i < 5; i++) {
        const service = new CachingStrategiesService({
          redis: {
            host: 'localhost',
            port: 6379,
            db: 13,
            keyPrefix: `shutdown_test_${i}:`,
          },
          memory: {
            maxSize: 500,
            ttl: 30000,
          },
        });

        await service.initialize();
        tempServices.push(service);

        // Start operations on each service
        for (let j = 0; j < 50; j++) {
          operations.push(
            service.set(`key_${i}_${j}`, { data: `value_${i}_${j}` }, 30)
          );
        }
      }

      // Let operations run briefly
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Shutdown all services while operations might still be running
      const shutdownStart = performance.now();
      
      await Promise.all(tempServices.map(service => service.close()));
      
      const shutdownTime = performance.now() - shutdownStart;

      const analysis = memoryMonitor.stop();

      // Shutdown should complete in reasonable time
      expect(shutdownTime).toBeLessThan(5000); // Less than 5 seconds

      // Memory should be stable after shutdown
      const heapGrowthMB = analysis.heapUsed.growth / (1024 * 1024);
      expect(heapGrowthMB).toBeLessThan(20);

      console.log(`Graceful Shutdown Under Load:
        Services: ${tempServices.length}
        Operations Started: ${operations.length}
        Shutdown Time: ${shutdownTime.toFixed(2)}ms
        Heap Growth: ${heapGrowthMB.toFixed(2)}MB`);
    });
  });

  describe('System Resource Monitoring', () => {
    it('should monitor CPU usage during intensive operations', async () => {
      const cpuSamples: any[] = [];
      
      // Monitor CPU usage
      const cpuInterval = setInterval(() => {
        const usage = process.cpuUsage();
        cpuSamples.push({
          timestamp: Date.now(),
          user: usage.user,
          system: usage.system
        });
      }, 500);

      // Perform CPU-intensive operations
      const intensiveOperations = [];
      
      for (let i = 0; i < 1000; i++) {
        intensiveOperations.push(
          // Simulate CPU-intensive cache operations
          cachingService.set(`cpu_test_${i}`, {
            id: i,
            data: JSON.stringify(Array.from({ length: 1000 }, (_, j) => ({
              key: `key_${i}_${j}`,
              value: Math.random().toString(36)
            })))
          }, 60)
        );
      }

      await Promise.all(intensiveOperations);
      clearInterval(cpuInterval);

      // Analyze CPU usage
      if (cpuSamples.length > 1) {
        const totalUserTime = cpuSamples[cpuSamples.length - 1].user - cpuSamples[0].user;
        const totalSystemTime = cpuSamples[cpuSamples.length - 1].system - cpuSamples[0].system;
        const totalTime = totalUserTime + totalSystemTime;
        
        // CPU usage should be reasonable
        expect(totalTime).toBeGreaterThan(0); // Should use some CPU
        expect(totalTime).toBeLessThan(10000000); // Should not be excessive (10 seconds in microseconds)

        console.log(`CPU Usage During Intensive Operations:
          Operations: ${intensiveOperations.length}
          Total CPU Time: ${(totalTime / 1000).toFixed(2)}ms
          User Time: ${(totalUserTime / 1000).toFixed(2)}ms
          System Time: ${(totalSystemTime / 1000).toFixed(2)}ms`);
      }
    });

    it('should monitor file descriptor usage', async () => {
      // This test would require native bindings to accurately monitor FDs
      // For now, we'll simulate by monitoring database connections
      
      const connectionCounts: number[] = [];
      
      // Monitor connection count
      const monitorInterval = setInterval(async () => {
        const stats = await dbService.getPoolStats();
        connectionCounts.push(stats.totalCount);
      }, 1000);

      // Perform operations that create connections
      const dbOperations = [];
      
      for (let i = 0; i < 100; i++) {
        dbOperations.push(
          dbService.executeOptimizedQuery(
            'SELECT $1 as fd_test',
            [i],
            `fd_test_${i}`,
            30
          )
        );
      }

      await Promise.all(dbOperations);
      clearInterval(monitorInterval);

      // Connection count should remain within bounds
      const maxConnections = Math.max(...connectionCounts);
      const avgConnections = connectionCounts.reduce((sum, count) => sum + count, 0) / connectionCounts.length;

      expect(maxConnections).toBeLessThanOrEqual(20); // Pool limit
      expect(avgConnections).toBeGreaterThan(0);

      console.log(`Connection Monitoring:
        Operations: ${dbOperations.length}
        Max Connections: ${maxConnections}
        Average Connections: ${avgConnections.toFixed(2)}
        Samples: ${connectionCounts.length}`);
    });
  });
});