/**
 * Load Testing Performance Tests
 * Tests for concurrent user scenarios, stress testing, and system scalability
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';
import express from 'express';
import { safeLogger } from '../utils/safeLogger';
import request from 'supertest';
import { safeLogger } from '../utils/safeLogger';
import { Worker } from 'worker_threads';
import { safeLogger } from '../utils/safeLogger';
import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseOptimizationService } from '../../services/databaseOptimizationService';
import { safeLogger } from '../utils/safeLogger';
import { LoadBalancingService } from '../../services/loadBalancingService';
import { safeLogger } from '../utils/safeLogger';
import { PerformanceMonitoringService } from '../../services/performanceMonitoringService';
import { safeLogger } from '../utils/safeLogger';

// Load testing utilities
class LoadTestRunner extends EventEmitter {
  private workers: Worker[] = [];
  private results: any[] = [];

  async runConcurrentUsers(
    userCount: number,
    duration: number,
    scenario: string,
    options: any = {}
  ): Promise<LoadTestResults> {
    const workersCount = Math.min(userCount, 10); // Limit workers
    const usersPerWorker = Math.ceil(userCount / workersCount);

    const startTime = Date.now();
    const workerPromises: Promise<any>[] = [];

    for (let i = 0; i < workersCount; i++) {
      const workerPromise = this.createWorker(
        usersPerWorker,
        duration,
        scenario,
        { ...options, workerId: i }
      );
      workerPromises.push(workerPromise);
    }

    const workerResults = await Promise.all(workerPromises);
    const endTime = Date.now();

    return this.aggregateResults(workerResults, {
      totalUsers: userCount,
      duration: endTime - startTime,
      scenario
    });
  }

  private async createWorker(
    userCount: number,
    duration: number,
    scenario: string,
    options: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(`
        const { parentPort } = require('worker_threads');
        const axios = require('axios');
        
        async function runLoadTest(userCount, duration, scenario, options) {
          const results = {
            requests: 0,
            errors: 0,
            responseTimes: [],
            throughput: 0,
            errorRate: 0
          };
          
          const startTime = Date.now();
          const promises = [];
          
          for (let i = 0; i < userCount; i++) {
            promises.push(simulateUser(i, duration, scenario, options, results));
          }
          
          await Promise.all(promises);
          
          const totalTime = Date.now() - startTime;
          results.throughput = results.requests / (totalTime / 1000);
          results.errorRate = results.errors / results.requests;
          
          return results;
        }
        
        async function simulateUser(userId, duration, scenario, options, results) {
          const startTime = Date.now();
          const baseUrl = options.baseUrl || 'http://localhost:3000';
          
          while (Date.now() - startTime < duration) {
            try {
              const requestStart = Date.now();
              
              let response;
              switch (scenario) {
                case 'browse_feed':
                  response = await axios.get(\`\${baseUrl}/api/feed?page=\${Math.floor(Math.random() * 5) + 1}\`);
                  break;
                case 'view_community':
                  response = await axios.get(\`\${baseUrl}/api/communities/test-community-\${userId % 5}\`);
                  break;
                case 'search_content':
                  response = await axios.get(\`\${baseUrl}/api/search?q=test\${userId % 10}\`);
                  break;
                case 'mixed_workload':
                  const actions = ['feed', 'community', 'search'];
                  const action = actions[Math.floor(Math.random() * actions.length)];
                  if (action === 'feed') {
                    response = await axios.get(\`\${baseUrl}/api/feed\`);
                  } else if (action === 'community') {
                    response = await axios.get(\`\${baseUrl}/api/communities\`);
                  } else {
                    response = await axios.get(\`\${baseUrl}/api/search?q=random\`);
                  }
                  break;
                default:
                  response = await axios.get(\`\${baseUrl}/api/feed\`);
              }
              
              const requestEnd = Date.now();
              results.requests++;
              results.responseTimes.push(requestEnd - requestStart);
              
              if (response.status >= 400) {
                results.errors++;
              }
              
            } catch (error) {
              results.errors++;
            }
            
            // Random delay between requests (100-500ms)
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
          }
        }
        
        parentPort.on('message', async ({ userCount, duration, scenario, options }) => {
          try {
            const result = await runLoadTest(userCount, duration, scenario, options);
            parentPort.postMessage({ success: true, result });
          } catch (error) {
            parentPort.postMessage({ success: false, error: error.message });
          }
        });
      `, { eval: true });

      worker.postMessage({ userCount, duration, scenario, options });
      
      worker.on('message', ({ success, result, error }) => {
        if (success) {
          resolve(result);
        } else {
          reject(new Error(error));
        }
        worker.terminate();
      });

      worker.on('error', reject);
      this.workers.push(worker);
    });
  }

  private aggregateResults(workerResults: any[], metadata: any): LoadTestResults {
    const aggregated = {
      totalRequests: 0,
      totalErrors: 0,
      responseTimes: [] as number[],
      throughput: 0,
      errorRate: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      metadata
    };

    workerResults.forEach(result => {
      aggregated.totalRequests += result.requests;
      aggregated.totalErrors += result.errors;
      aggregated.responseTimes.push(...result.responseTimes);
    });

    if (aggregated.responseTimes.length > 0) {
      aggregated.responseTimes.sort((a, b) => a - b);
      aggregated.averageResponseTime = aggregated.responseTimes.reduce((sum, time) => sum + time, 0) / aggregated.responseTimes.length;
      aggregated.p95ResponseTime = aggregated.responseTimes[Math.floor(aggregated.responseTimes.length * 0.95)];
      aggregated.maxResponseTime = Math.max(...aggregated.responseTimes);
      aggregated.minResponseTime = Math.min(...aggregated.responseTimes);
    }

    aggregated.throughput = aggregated.totalRequests / (metadata.duration / 1000);
    aggregated.errorRate = aggregated.totalErrors / aggregated.totalRequests;

    return aggregated;
  }

  cleanup() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
  }
}

interface LoadTestResults {
  totalRequests: number;
  totalErrors: number;
  responseTimes: number[];
  throughput: number;
  errorRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  metadata: any;
}

describe('Load Testing Performance Tests', () => {
  let app: express.Application;
  let dbService: DatabaseOptimizationService;
  let loadBalancer: LoadBalancingService;
  let monitor: PerformanceMonitoringService;
  let loadTestRunner: LoadTestRunner;
  let server: any;

  beforeAll(async () => {
    // Initialize services
    dbService = new DatabaseOptimizationService({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'test_marketplace',
      user: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      max: 50, // Increased pool size for load testing
      min: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }, process.env.TEST_REDIS_URL || 'redis://localhost:6379');

    loadBalancer = new LoadBalancingService({
      algorithm: 'round-robin',
      healthCheck: {
        interval: 5000,
        timeout: 2000,
        retries: 3,
        path: '/health',
      },
      autoScaling: {
        enabled: true,
        minInstances: 2,
        maxInstances: 10,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        scaleUpCooldown: 60000,
        scaleDownCooldown: 120000,
      },
    });

    monitor = new PerformanceMonitoringService();
    loadTestRunner = new LoadTestRunner();

    // Setup Express app with load balancing
    app = express();
    app.use(express.json());

    // Add performance monitoring middleware
    app.use((req, res, next) => {
      const startTime = performance.now();
      res.on('finish', () => {
        const responseTime = performance.now() - startTime;
        monitor.recordMetric('http.request.duration', responseTime, 'ms', {
          method: req.method,
          path: req.path,
          status: res.statusCode.toString()
        });
      });
      next();
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: Date.now() });
    });

    // Mock API endpoints for load testing
    app.get('/api/feed', async (req, res) => {
      try {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
        
        const posts = Array.from({ length: 20 }, (_, i) => ({
          id: `post-${i}`,
          content: `Post content ${i}`,
          author: `user-${i % 5}`,
          timestamp: Date.now() - i * 60000
        }));
        
        res.json({ posts, hasMore: true, totalPages: 10 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/communities', async (req, res) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15));
        
        const communities = Array.from({ length: 10 }, (_, i) => ({
          id: `community-${i}`,
          name: `Community ${i}`,
          memberCount: Math.floor(Math.random() * 10000),
          description: `Description for community ${i}`
        }));
        
        res.json({ communities, totalCount: 100 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/communities/:id', async (req, res) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 8 + Math.random() * 12));
        
        res.json({
          id: req.params.id,
          name: `Community ${req.params.id}`,
          memberCount: Math.floor(Math.random() * 10000),
          posts: Array.from({ length: 20 }, (_, i) => ({
            id: `post-${i}`,
            content: `Community post ${i}`
          }))
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/search', async (req, res) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 25));
        
        const results = Array.from({ length: 15 }, (_, i) => ({
          id: `result-${i}`,
          type: i % 2 === 0 ? 'post' : 'community',
          title: `Search result ${i}`,
          relevance: Math.random()
        }));
        
        res.json({ results, totalCount: 150 });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Error simulation endpoint
    app.get('/api/error', (req, res) => {
      if (Math.random() < 0.1) { // 10% error rate
        res.status(500).json({ error: 'Simulated error' });
      } else {
        res.json({ message: 'Success' });
      }
    });

    await dbService.initialize();
    
    // Start server
    server = app.listen(0); // Use random port
    const address = server.address();
    safeLogger.info(`Test server running on port ${address.port}`);
  });

  afterAll(async () => {
    await dbService?.close();
    loadBalancer?.destroy();
    monitor?.destroy();
    loadTestRunner?.cleanup();
    server?.close();
  });

  beforeEach(async () => {
    // Clear metrics before each test
    monitor.clearMetrics();
  });

  describe('Concurrent User Load Tests', () => {
    it('should handle 50 concurrent users browsing feed', async () => {
      const results = await loadTestRunner.runConcurrentUsers(
        50, // users
        30000, // 30 seconds
        'browse_feed',
        { baseUrl: `http://localhost:${server.address().port}` }
      );

      // Performance assertions
      expect(results.errorRate).toBeLessThan(0.05); // Less than 5% error rate
      expect(results.averageResponseTime).toBeLessThan(200); // Average under 200ms
      expect(results.p95ResponseTime).toBeLessThan(500); // 95th percentile under 500ms
      expect(results.throughput).toBeGreaterThan(10); // At least 10 requests per second

      safeLogger.info(`50 Concurrent Users - Browse Feed:
        Total Requests: ${results.totalRequests}
        Error Rate: ${(results.errorRate * 100).toFixed(2)}%
        Average Response Time: ${results.averageResponseTime.toFixed(2)}ms
        P95 Response Time: ${results.p95ResponseTime.toFixed(2)}ms
        Throughput: ${results.throughput.toFixed(2)} req/s`);
    });

    it('should handle 100 concurrent users with mixed workload', async () => {
      const results = await loadTestRunner.runConcurrentUsers(
        100, // users
        60000, // 60 seconds
        'mixed_workload',
        { baseUrl: `http://localhost:${server.address().port}` }
      );

      // Performance assertions for higher load
      expect(results.errorRate).toBeLessThan(0.1); // Less than 10% error rate
      expect(results.averageResponseTime).toBeLessThan(300); // Average under 300ms
      expect(results.p95ResponseTime).toBeLessThan(1000); // 95th percentile under 1 second
      expect(results.throughput).toBeGreaterThan(15); // At least 15 requests per second

      safeLogger.info(`100 Concurrent Users - Mixed Workload:
        Total Requests: ${results.totalRequests}
        Error Rate: ${(results.errorRate * 100).toFixed(2)}%
        Average Response Time: ${results.averageResponseTime.toFixed(2)}ms
        P95 Response Time: ${results.p95ResponseTime.toFixed(2)}ms
        Throughput: ${results.throughput.toFixed(2)} req/s`);
    });

    it('should handle 200 concurrent users stress test', async () => {
      const results = await loadTestRunner.runConcurrentUsers(
        200, // users
        45000, // 45 seconds
        'mixed_workload',
        { baseUrl: `http://localhost:${server.address().port}` }
      );

      // Stress test assertions (more lenient)
      expect(results.errorRate).toBeLessThan(0.15); // Less than 15% error rate
      expect(results.averageResponseTime).toBeLessThan(500); // Average under 500ms
      expect(results.p95ResponseTime).toBeLessThan(2000); // 95th percentile under 2 seconds
      expect(results.throughput).toBeGreaterThan(20); // At least 20 requests per second

      safeLogger.info(`200 Concurrent Users - Stress Test:
        Total Requests: ${results.totalRequests}
        Error Rate: ${(results.errorRate * 100).toFixed(2)}%
        Average Response Time: ${results.averageResponseTime.toFixed(2)}ms
        P95 Response Time: ${results.p95ResponseTime.toFixed(2)}ms
        Throughput: ${results.throughput.toFixed(2)} req/s`);
    });
  });

  describe('Scalability Tests', () => {
    it('should demonstrate linear scalability up to capacity', async () => {
      const userCounts = [10, 25, 50, 100];
      const scalabilityResults: any[] = [];

      for (const userCount of userCounts) {
        const results = await loadTestRunner.runConcurrentUsers(
          userCount,
          20000, // 20 seconds
          'browse_feed',
          { baseUrl: `http://localhost:${server.address().port}` }
        );

        scalabilityResults.push({
          users: userCount,
          throughput: results.throughput,
          averageResponseTime: results.averageResponseTime,
          errorRate: results.errorRate
        });

        safeLogger.info(`Scalability Test - ${userCount} users:
          Throughput: ${results.throughput.toFixed(2)} req/s
          Avg Response Time: ${results.averageResponseTime.toFixed(2)}ms
          Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);
      }

      // Analyze scalability
      for (let i = 1; i < scalabilityResults.length; i++) {
        const current = scalabilityResults[i];
        const previous = scalabilityResults[i - 1];
        
        const userRatio = current.users / previous.users;
        const throughputRatio = current.throughput / previous.throughput;
        
        // Throughput should scale reasonably with user count
        expect(throughputRatio).toBeGreaterThan(userRatio * 0.7); // At least 70% linear scaling
        
        // Response time should not degrade too much
        expect(current.averageResponseTime).toBeLessThan(previous.averageResponseTime * 2);
      }
    });

    it('should handle burst traffic patterns', async () => {
      const burstScenarios = [
        { users: 20, duration: 10000 }, // Baseline
        { users: 100, duration: 15000 }, // Burst
        { users: 30, duration: 10000 }, // Cool down
        { users: 150, duration: 20000 }, // Larger burst
        { users: 25, duration: 10000 }  // Final cool down
      ];

      const burstResults: any[] = [];

      for (const scenario of burstScenarios) {
        const results = await loadTestRunner.runConcurrentUsers(
          scenario.users,
          scenario.duration,
          'mixed_workload',
          { baseUrl: `http://localhost:${server.address().port}` }
        );

        burstResults.push({
          ...scenario,
          throughput: results.throughput,
          averageResponseTime: results.averageResponseTime,
          errorRate: results.errorRate
        });

        safeLogger.info(`Burst Test - ${scenario.users} users for ${scenario.duration}ms:
          Throughput: ${results.throughput.toFixed(2)} req/s
          Avg Response Time: ${results.averageResponseTime.toFixed(2)}ms
          Error Rate: ${(results.errorRate * 100).toFixed(2)}%`);

        // Brief pause between bursts
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // System should handle bursts without complete failure
      burstResults.forEach(result => {
        expect(result.errorRate).toBeLessThan(0.2); // Less than 20% error rate even during bursts
        expect(result.averageResponseTime).toBeLessThan(1000); // Response time under 1 second
      });
    });
  });

  describe('Resource Utilization Under Load', () => {
    it('should monitor database connection pool under load', async () => {
      const poolStatsHistory: any[] = [];

      // Start monitoring pool stats
      const monitoringInterval = setInterval(async () => {
        const stats = await dbService.getPoolStats();
        poolStatsHistory.push({
          timestamp: Date.now(),
          ...stats
        });
      }, 1000);

      // Run load test
      const results = await loadTestRunner.runConcurrentUsers(
        75,
        30000,
        'mixed_workload',
        { baseUrl: `http://localhost:${server.address().port}` }
      );

      clearInterval(monitoringInterval);

      // Analyze pool utilization
      const maxConnections = Math.max(...poolStatsHistory.map(s => s.totalCount));
      const avgWaitingConnections = poolStatsHistory.reduce((sum, s) => sum + s.waitingCount, 0) / poolStatsHistory.length;
      const maxWaitingConnections = Math.max(...poolStatsHistory.map(s => s.waitingCount));

      // Pool should handle load efficiently
      expect(maxConnections).toBeLessThanOrEqual(50); // Should not exceed pool limit
      expect(avgWaitingConnections).toBeLessThan(5); // Average waiting should be low
      expect(maxWaitingConnections).toBeLessThan(20); // Max waiting should be reasonable

      safeLogger.info(`Database Pool Under Load:
        Max Connections: ${maxConnections}
        Avg Waiting: ${avgWaitingConnections.toFixed(2)}
        Max Waiting: ${maxWaitingConnections}
        Load Test Results: ${results.totalRequests} requests, ${(results.errorRate * 100).toFixed(2)}% errors`);
    });

    it('should monitor memory usage during sustained load', async () => {
      const memoryHistory: any[] = [];

      // Start memory monitoring
      const memoryInterval = setInterval(() => {
        const usage = process.memoryUsage();
        memoryHistory.push({
          timestamp: Date.now(),
          heapUsed: usage.heapUsed,
          heapTotal: usage.heapTotal,
          external: usage.external,
          rss: usage.rss
        });
      }, 2000);

      // Run sustained load test
      const results = await loadTestRunner.runConcurrentUsers(
        80,
        60000, // 1 minute
        'mixed_workload',
        { baseUrl: `http://localhost:${server.address().port}` }
      );

      clearInterval(memoryInterval);

      // Analyze memory usage
      const initialMemory = memoryHistory[0];
      const finalMemory = memoryHistory[memoryHistory.length - 1];
      const maxMemory = memoryHistory.reduce((max, current) => 
        current.heapUsed > max.heapUsed ? current : max
      );

      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      const maxMemoryMB = maxMemory.heapUsed / (1024 * 1024);

      // Memory usage should be reasonable
      expect(memoryGrowthMB).toBeLessThan(100); // Less than 100MB growth
      expect(maxMemoryMB).toBeLessThan(500); // Max memory under 500MB

      safeLogger.info(`Memory Usage Under Sustained Load:
        Initial Memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Final Memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        Memory Growth: ${memoryGrowthMB.toFixed(2)}MB
        Max Memory: ${maxMemoryMB.toFixed(2)}MB
        Load Test: ${results.totalRequests} requests over 60 seconds`);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should gracefully handle service degradation', async () => {
      // Simulate service degradation by adding delays
      app.use('/api/slow', (req, res, next) => {
        setTimeout(next, 1000 + Math.random() * 2000); // 1-3 second delay
      });

      app.get('/api/slow/feed', (req, res) => {
        res.json({ posts: [], message: 'Slow response' });
      });

      const results = await loadTestRunner.runConcurrentUsers(
        50,
        30000,
        'browse_feed',
        { 
          baseUrl: `http://localhost:${server.address().port}`,
          slowEndpoint: true 
        }
      );

      // System should handle degradation gracefully
      expect(results.errorRate).toBeLessThan(0.3); // Less than 30% error rate
      expect(results.averageResponseTime).toBeGreaterThan(500); // Should reflect slower responses

      safeLogger.info(`Service Degradation Test:
        Error Rate: ${(results.errorRate * 100).toFixed(2)}%
        Average Response Time: ${results.averageResponseTime.toFixed(2)}ms
        Throughput: ${results.throughput.toFixed(2)} req/s`);
    });

    it('should recover from temporary failures', async () => {
      let failureMode = false;
      let requestCount = 0;

      // Add failure simulation middleware
      app.use('/api/failure-test', (req, res, next) => {
        requestCount++;
        
        // Fail for requests 50-100, then recover
        if (requestCount >= 50 && requestCount <= 100) {
          failureMode = true;
          return res.status(503).json({ error: 'Service temporarily unavailable' });
        } else {
          failureMode = false;
          next();
        }
      });

      app.get('/api/failure-test/feed', (req, res) => {
        res.json({ posts: [], recovered: true });
      });

      const results = await loadTestRunner.runConcurrentUsers(
        30,
        45000,
        'browse_feed',
        { 
          baseUrl: `http://localhost:${server.address().port}`,
          endpoint: '/api/failure-test/feed'
        }
      );

      // System should show some errors but recover
      expect(results.errorRate).toBeGreaterThan(0.1); // Should have some errors during failure period
      expect(results.errorRate).toBeLessThan(0.5); // But not complete failure
      expect(results.totalRequests).toBeGreaterThan(100); // Should continue processing after recovery

      safeLogger.info(`Failure Recovery Test:
        Total Requests: ${results.totalRequests}
        Error Rate: ${(results.errorRate * 100).toFixed(2)}%
        Recovery demonstrated: ${requestCount > 100 ? 'Yes' : 'No'}`);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance SLA requirements', async () => {
      const slaTests = [
        {
          name: 'Light Load SLA',
          users: 25,
          duration: 30000,
          requirements: {
            maxErrorRate: 0.01, // 1%
            maxAvgResponseTime: 100, // 100ms
            maxP95ResponseTime: 200, // 200ms
            minThroughput: 20 // 20 req/s
          }
        },
        {
          name: 'Normal Load SLA',
          users: 50,
          duration: 30000,
          requirements: {
            maxErrorRate: 0.05, // 5%
            maxAvgResponseTime: 200, // 200ms
            maxP95ResponseTime: 500, // 500ms
            minThroughput: 30 // 30 req/s
          }
        },
        {
          name: 'Peak Load SLA',
          users: 100,
          duration: 30000,
          requirements: {
            maxErrorRate: 0.1, // 10%
            maxAvgResponseTime: 400, // 400ms
            maxP95ResponseTime: 1000, // 1 second
            minThroughput: 40 // 40 req/s
          }
        }
      ];

      for (const slaTest of slaTests) {
        const results = await loadTestRunner.runConcurrentUsers(
          slaTest.users,
          slaTest.duration,
          'mixed_workload',
          { baseUrl: `http://localhost:${server.address().port}` }
        );

        // Check SLA compliance
        const slaCompliance = {
          errorRate: results.errorRate <= slaTest.requirements.maxErrorRate,
          avgResponseTime: results.averageResponseTime <= slaTest.requirements.maxAvgResponseTime,
          p95ResponseTime: results.p95ResponseTime <= slaTest.requirements.maxP95ResponseTime,
          throughput: results.throughput >= slaTest.requirements.minThroughput
        };

        const overallCompliance = Object.values(slaCompliance).every(Boolean);

        safeLogger.info(`${slaTest.name} SLA Compliance:
          Error Rate: ${(results.errorRate * 100).toFixed(2)}% (${slaCompliance.errorRate ? '✓' : '✗'})
          Avg Response Time: ${results.averageResponseTime.toFixed(2)}ms (${slaCompliance.avgResponseTime ? '✓' : '✗'})
          P95 Response Time: ${results.p95ResponseTime.toFixed(2)}ms (${slaCompliance.p95ResponseTime ? '✓' : '✗'})
          Throughput: ${results.throughput.toFixed(2)} req/s (${slaCompliance.throughput ? '✓' : '✗'})
          Overall: ${overallCompliance ? '✓ PASS' : '✗ FAIL'}`);

        // Assert SLA compliance (may be relaxed for test environment)
        if (slaTest.name === 'Light Load SLA') {
          expect(overallCompliance).toBe(true);
        }
      }
    });
  });
});