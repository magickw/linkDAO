import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { safeLogger } from '../../utils/safeLogger';
import request from 'supertest';
import { performance } from 'perf_hooks';
import { app } from '../../index';
import { createTestAdmin, createLargeTestDataset, cleanupTestData } from '../fixtures/testDataFactory';

describe('Admin Dashboard Performance Tests', () => {
  let adminToken: string;
  let testAdminId: string;

  beforeAll(async () => {
    // Create test admin
    const testAdmin = await createTestAdmin({
      email: 'perf-admin@test.com',
      role: 'super_admin',
      permissions: ['dashboard_access', 'analytics_view', 'system_monitoring']
    });
    testAdminId = testAdmin.id;
    adminToken = testAdmin.token;

    // Create large dataset for performance testing
    await createLargeTestDataset({
      users: 10000,
      posts: 50000,
      comments: 100000,
      transactions: 25000,
      moderationItems: 5000,
      sellers: 1000,
      disputes: 500
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Loading Performance', () => {
    it('should load dashboard metrics within acceptable time limits', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Should respond within 2 seconds
      expect(responseTime).toBeLessThan(2000);
      
      // Verify response contains expected data
      expect(response.body).toHaveProperty('realTimeUsers');
      expect(response.body).toHaveProperty('systemHealth');
      expect(response.body).toHaveProperty('moderationQueue');
      
      safeLogger.info(`Dashboard metrics loaded in ${responseTime.toFixed(2)}ms`);
    });

    it('should handle concurrent dashboard requests efficiently', async () => {
      const concurrentRequests = 20;
      const requests: Promise<any>[] = [];

      const startTime = performance.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const requestPromise = request(app)
          .get('/api/admin/dashboard/metrics')
          .set('Authorization', `Bearer ${adminToken}`);
        requests.push(requestPromise);
      }

      // Wait for all requests to complete
      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      const averageResponseTime = totalTime / concurrentRequests;
      expect(averageResponseTime).toBeLessThan(1000); // Less than 1 second average

      safeLogger.info(`${concurrentRequests} concurrent requests completed in ${totalTime.toFixed(2)}ms`);
      safeLogger.info(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
    });

    it('should efficiently paginate large datasets', async () => {
      const pageSize = 50;
      const startTime = performance.now();

      // Test pagination performance
      const response = await request(app)
        .get('/api/admin/users')
        .query({
          page: 1,
          limit: pageSize,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Should respond quickly even with large dataset
      expect(responseTime).toBeLessThan(1000);
      
      // Verify pagination structure
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.data).toHaveLength(pageSize);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');

      safeLogger.info(`Paginated query (${pageSize} items) completed in ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('Analytics Performance', () => {
    it('should generate analytics data efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .get('/api/admin/analytics/overview')
        .query({
          timeRange: '30d',
          metrics: 'users,content,engagement,revenue'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Analytics should complete within 5 seconds
      expect(responseTime).toBeLessThan(5000);
      
      // Verify analytics data structure
      expect(response.body).toHaveProperty('userMetrics');
      expect(response.body).toHaveProperty('contentMetrics');
      expect(response.body).toHaveProperty('engagementMetrics');
      expect(response.body).toHaveProperty('revenueMetrics');

      safeLogger.info(`Analytics overview generated in ${responseTime.toFixed(2)}ms`);
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/admin/analytics/custom-query')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          aggregations: [
            {
              field: 'user_engagement',
              operation: 'avg',
              groupBy: ['date', 'user_segment']
            },
            {
              field: 'content_views',
              operation: 'sum',
              groupBy: ['content_type', 'date']
            },
            {
              field: 'transaction_value',
              operation: 'sum',
              groupBy: ['seller_tier', 'date']
            }
          ],
          timeRange: {
            start: '2024-01-01',
            end: '2024-03-31'
          },
          filters: {
            user_status: 'active',
            content_status: 'published'
          }
        })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Complex queries should complete within 10 seconds
      expect(responseTime).toBeLessThan(10000);
      
      // Verify aggregation results
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);

      safeLogger.info(`Complex aggregation query completed in ${responseTime.toFixed(2)}ms`);
    });

    it('should optimize chart data generation', async () => {
      const chartTypes = ['line', 'bar', 'pie', 'heatmap'];
      const performanceResults: { [key: string]: number } = {};

      for (const chartType of chartTypes) {
        const startTime = performance.now();

        const response = await request(app)
          .get(`/api/admin/analytics/chart-data/${chartType}`)
          .query({
            metric: 'user_growth',
            timeRange: '90d',
            granularity: 'daily'
          })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const endTime = performance.now();
        const responseTime = endTime - startTime;
        performanceResults[chartType] = responseTime;

        // Chart data should generate within 3 seconds
        expect(responseTime).toBeLessThan(3000);
        
        // Verify chart data structure
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('labels');
        expect(response.body).toHaveProperty('metadata');
      }

      safeLogger.info('Chart generation performance:', performanceResults);
    });
  });

  describe('Real-Time Updates Performance', () => {
    it('should handle WebSocket connections efficiently', async () => {
      const WebSocket = require('ws');
      const connectionCount = 50;
      const connections: any[] = [];
      const connectionTimes: number[] = [];

      // Create multiple WebSocket connections
      for (let i = 0; i < connectionCount; i++) {
        const startTime = performance.now();
        
        const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}/admin-dashboard`, {
          headers: {
            Authorization: `Bearer ${adminToken}`
          }
        });

        const connectionPromise = new Promise<void>((resolve, reject) => {
          ws.on('open', () => {
            const endTime = performance.now();
            connectionTimes.push(endTime - startTime);
            connections.push(ws);
            resolve();
          });

          ws.on('error', reject);
        });

        await connectionPromise;
      }

      // Calculate connection performance metrics
      const averageConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);

      // Connections should establish quickly
      expect(averageConnectionTime).toBeLessThan(500); // Less than 500ms average
      expect(maxConnectionTime).toBeLessThan(2000); // Less than 2s maximum

      // Test broadcast performance
      const broadcastStartTime = performance.now();
      
      // Simulate metric update broadcast
      const testMetrics = {
        realTimeUsers: 150,
        systemLoad: 0.65,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connections (simulated)
      connections.forEach(ws => {
        ws.send(JSON.stringify({
          type: 'metrics_update',
          data: testMetrics
        }));
      });

      const broadcastEndTime = performance.now();
      const broadcastTime = broadcastEndTime - broadcastStartTime;

      // Broadcasting should be fast
      expect(broadcastTime).toBeLessThan(1000);

      // Cleanup connections
      connections.forEach(ws => ws.close());

      safeLogger.info(`WebSocket performance - Avg connection: ${averageConnectionTime.toFixed(2)}ms, Broadcast: ${broadcastTime.toFixed(2)}ms`);
    });

    it('should throttle high-frequency updates appropriately', async () => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      let messageCount = 0;
      const receivedMessages: any[] = [];
      const testDuration = 5000; // 5 seconds

      const messagePromise = new Promise<void>((resolve) => {
        ws.on('message', (data: Buffer) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'metrics_update') {
            messageCount++;
            receivedMessages.push({
              timestamp: Date.now(),
              data: message.data
            });
          }
        });

        // Stop collecting after test duration
        setTimeout(() => {
          resolve();
        }, testDuration);
      });

      // Send high-frequency updates (should be throttled)
      const updateInterval = setInterval(() => {
        // Simulate rapid metric updates
        const metrics = {
          realTimeUsers: Math.floor(Math.random() * 200),
          systemLoad: Math.random(),
          timestamp: new Date().toISOString()
        };

        // This would normally trigger a broadcast
        request(app)
          .post('/api/admin/dashboard/trigger-update')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ metrics })
          .catch(() => {}); // Ignore errors for this test
      }, 100); // Every 100ms

      await messagePromise;
      clearInterval(updateInterval);
      ws.close();

      // Should receive throttled updates (not every 100ms)
      const expectedMaxMessages = testDuration / 1000; // At most 1 per second
      expect(messageCount).toBeLessThanOrEqual(expectedMaxMessages * 2); // Allow some buffer

      safeLogger.info(`Received ${messageCount} throttled updates over ${testDuration}ms`);
    });
  });

  describe('AI Processing Performance', () => {
    it('should process AI insights generation efficiently', async () => {
      const startTime = performance.now();

      const response = await request(app)
        .post('/api/admin/ai-insights/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          analysisType: 'predictive',
          timeRange: '30d',
          metrics: ['user_growth', 'content_volume']
        })
        .expect(202);

      const jobId = response.body.jobId;

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await request(app)
          .get(`/api/admin/ai-insights/job/${jobId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        if (statusResponse.body.status === 'completed') {
          completed = true;
          const endTime = performance.now();
          const processingTime = endTime - startTime;

          // AI processing should complete within 30 seconds
          expect(processingTime).toBeLessThan(30000);
          
          // Verify insights were generated
          expect(statusResponse.body.insights).toBeDefined();
          expect(Array.isArray(statusResponse.body.insights)).toBe(true);

          safeLogger.info(`AI insights generated in ${processingTime.toFixed(2)}ms`);
        }
        
        attempts++;
      }

      expect(completed).toBe(true);
    });

    it('should handle concurrent AI processing requests', async () => {
      const concurrentJobs = 5;
      const jobPromises: Promise<any>[] = [];

      const startTime = performance.now();

      // Submit concurrent AI jobs
      for (let i = 0; i < concurrentJobs; i++) {
        const jobPromise = request(app)
          .post('/api/admin/ai-insights/generate')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            analysisType: 'anomaly_detection',
            timeRange: '7d',
            requestId: `concurrent-${i}`
          });
        
        jobPromises.push(jobPromise);
      }

      const responses = await Promise.all(jobPromises);
      
      // All jobs should be accepted (or some rate limited)
      responses.forEach(response => {
        expect([202, 429]).toContain(response.status);
      });

      const acceptedJobs = responses.filter(r => r.status === 202);
      expect(acceptedJobs.length).toBeGreaterThan(0);

      safeLogger.info(`${acceptedJobs.length}/${concurrentJobs} AI jobs accepted for concurrent processing`);
    });
  });

  describe('Database Performance', () => {
    it('should execute complex queries efficiently', async () => {
      const complexQueries = [
        {
          name: 'User engagement aggregation',
          endpoint: '/api/admin/analytics/user-engagement',
          expectedTime: 3000
        },
        {
          name: 'Content performance analysis',
          endpoint: '/api/admin/analytics/content-performance',
          expectedTime: 2000
        },
        {
          name: 'Seller metrics calculation',
          endpoint: '/api/admin/analytics/seller-metrics',
          expectedTime: 4000
        },
        {
          name: 'System health aggregation',
          endpoint: '/api/admin/system-health/detailed',
          expectedTime: 1500
        }
      ];

      for (const query of complexQueries) {
        const startTime = performance.now();

        const response = await request(app)
          .get(query.endpoint)
          .query({ timeRange: '90d' })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const endTime = performance.now();
        const queryTime = endTime - startTime;

        expect(queryTime).toBeLessThan(query.expectedTime);
        expect(response.body).toBeDefined();

        safeLogger.info(`${query.name}: ${queryTime.toFixed(2)}ms (expected < ${query.expectedTime}ms)`);
      }
    });

    it('should handle database connection pooling efficiently', async () => {
      const simultaneousQueries = 25;
      const queryPromises: Promise<any>[] = [];

      const startTime = performance.now();

      // Execute many simultaneous database queries
      for (let i = 0; i < simultaneousQueries; i++) {
        const queryPromise = request(app)
          .get('/api/admin/dashboard/metrics')
          .set('Authorization', `Bearer ${adminToken}`);
        
        queryPromises.push(queryPromise);
      }

      const responses = await Promise.all(queryPromises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All queries should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle connection pooling efficiently
      const averageQueryTime = totalTime / simultaneousQueries;
      expect(averageQueryTime).toBeLessThan(2000);

      safeLogger.info(`${simultaneousQueries} simultaneous queries completed in ${totalTime.toFixed(2)}ms`);
      safeLogger.info(`Average query time: ${averageQueryTime.toFixed(2)}ms`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate heavy load
      const heavyLoadPromises: Promise<any>[] = [];
      
      for (let i = 0; i < 100; i++) {
        const promise = request(app)
          .get('/api/admin/analytics/overview')
          .query({ timeRange: '90d' })
          .set('Authorization', `Bearer ${adminToken}`);
        
        heavyLoadPromises.push(promise);
      }

      await Promise.all(heavyLoadPromises);
      
      // Check memory usage after load
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);

      safeLogger.info(`Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      safeLogger.info(`Memory usage - Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      safeLogger.info(`Memory increase: ${memoryIncreasePercent.toFixed(2)}%`);
    });

    it('should handle garbage collection efficiently', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage();
      
      // Create memory pressure
      const largeDataRequests: Promise<any>[] = [];
      
      for (let i = 0; i < 50; i++) {
        const promise = request(app)
          .get('/api/admin/analytics/large-dataset')
          .query({ 
            timeRange: '1y',
            granularity: 'hourly',
            includeRawData: true
          })
          .set('Authorization', `Bearer ${adminToken}`);
        
        largeDataRequests.push(promise);
      }

      await Promise.all(largeDataRequests);

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      // Wait for GC to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage();
      const memoryDifference = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryDifferencePercent = (memoryDifference / initialMemory.heapUsed) * 100;

      // Memory should return close to initial levels after GC
      expect(Math.abs(memoryDifferencePercent)).toBeLessThan(25);

      safeLogger.info(`GC efficiency - Memory difference: ${memoryDifferencePercent.toFixed(2)}%`);
    });
  });

  describe('Scalability Validation', () => {
    it('should scale linearly with increased load', async () => {
      const loadLevels = [10, 25, 50, 100];
      const performanceResults: { [key: number]: number } = {};

      for (const loadLevel of loadLevels) {
        const startTime = performance.now();
        const requests: Promise<any>[] = [];

        // Generate load
        for (let i = 0; i < loadLevel; i++) {
          const request_promise = request(app)
            .get('/api/admin/dashboard/metrics')
            .set('Authorization', `Bearer ${adminToken}`);
          
          requests.push(request_promise);
        }

        const responses = await Promise.all(requests);
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const averageResponseTime = totalTime / loadLevel;

        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        performanceResults[loadLevel] = averageResponseTime;
        
        safeLogger.info(`Load level ${loadLevel}: ${averageResponseTime.toFixed(2)}ms average response time`);
      }

      // Performance should scale reasonably (not exponentially)
      const scalingFactor = performanceResults[100] / performanceResults[10];
      expect(scalingFactor).toBeLessThan(5); // Should not be more than 5x slower at 10x load

      safeLogger.info(`Scaling factor (100 vs 10 requests): ${scalingFactor.toFixed(2)}x`);
    });

    it('should handle sustained load over time', async () => {
      const testDuration = 30000; // 30 seconds
      const requestInterval = 500; // Every 500ms
      const responses: any[] = [];
      const responseTimes: number[] = [];

      const startTime = Date.now();
      let requestCount = 0;

      const loadTest = setInterval(async () => {
        const requestStart = performance.now();
        
        try {
          const response = await request(app)
            .get('/api/admin/dashboard/metrics')
            .set('Authorization', `Bearer ${adminToken}`);
          
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;
          
          responses.push(response);
          responseTimes.push(responseTime);
          requestCount++;
          
        } catch (error) {
          safeLogger.error('Request failed during sustained load test:', error);
        }

        // Stop after test duration
        if (Date.now() - startTime >= testDuration) {
          clearInterval(loadTest);
        }
      }, requestInterval);

      // Wait for test completion
      await new Promise(resolve => {
        const checkCompletion = setInterval(() => {
          if (Date.now() - startTime >= testDuration) {
            clearInterval(checkCompletion);
            resolve(void 0);
          }
        }, 100);
      });

      // Analyze sustained load performance
      const successfulRequests = responses.filter(r => r.status === 200).length;
      const successRate = (successfulRequests / requestCount) * 100;
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      // Should maintain high success rate and reasonable response times
      expect(successRate).toBeGreaterThan(95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(maxResponseTime).toBeLessThan(5000); // Max under 5 seconds

      safeLogger.info(`Sustained load test results:`);
      safeLogger.info(`- Requests: ${requestCount}`);
      safeLogger.info(`- Success rate: ${successRate.toFixed(2)}%`);
      safeLogger.info(`- Average response time: ${averageResponseTime.toFixed(2)}ms`);
      safeLogger.info(`- Max response time: ${maxResponseTime.toFixed(2)}ms`);
    });
  });
});
