import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import WebSocket from 'ws';

// Import test utilities
import { createTestApp } from '../utils/testApp';
import { setupTestDatabase, cleanupTestDatabase } from '../utils/testDatabase';

// Import services for testing
import { sellerService } from '../../services/sellerService';
import { sellerCacheManager } from '../../services/sellerCacheManager';
import { sellerWebSocketService } from '../../services/sellerWebSocketService';
import { sellerSecurityService } from '../../services/sellerSecurityService';

describe('Seller Production Integration Tests', () => {
  let app: Express;
  let testWalletAddress: string;
  let wsServer: WebSocket.Server;

  beforeEach(async () => {
    app = await createTestApp();
    await setupTestDatabase();
    testWalletAddress = '0x1234567890123456789012345678901234567890';
    
    // Setup WebSocket server for real-time tests
    wsServer = new WebSocket.Server({ port: 8080 });
    
    // Clear any cached data
    await sellerCacheManager.clearAll();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    wsServer.close();
    jest.clearAllMocks();
  });

  describe('Production-like Environment Data Consistency', () => {
    it('should maintain data consistency under concurrent load', async () => {
      // Create initial seller profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Load Test Seller',
          storeName: 'Load Test Store',
          bio: 'Testing under load',
        })
        .expect(201);

      // Simulate 50 concurrent profile updates
      const updatePromises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .put(`/api/marketplace/seller/${testWalletAddress}`)
          .send({ displayName: `Updated Seller ${i}` })
      );

      const responses = await Promise.all(updatePromises);

      // All updates should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Final state should be consistent
      const finalProfile = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(finalProfile.body.data.displayName).toMatch(/Updated Seller \d+/);
    });

    it('should handle database connection pool exhaustion gracefully', async () => {
      // Create seller profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Pool Test Seller',
          storeName: 'Pool Test Store',
          bio: 'Testing connection pool',
        })
        .expect(201);

      // Simulate 100 concurrent requests to exhaust connection pool
      const requests = Array.from({ length: 100 }, () =>
        request(app).get(`/api/marketplace/seller/${testWalletAddress}`)
      );

      const responses = await Promise.all(requests);

      // Most requests should succeed, some might be queued
      const successfulResponses = responses.filter(r => r.status === 200);
      const queuedResponses = responses.filter(r => r.status === 503);

      expect(successfulResponses.length).toBeGreaterThan(80);
      expect(queuedResponses.length).toBeLessThan(20);

      // All successful responses should have consistent data
      successfulResponses.forEach(response => {
        expect(response.body.data.displayName).toBe('Pool Test Seller');
      });
    });

    it('should maintain referential integrity during complex operations', async () => {
      // Create seller with multiple related entities
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Integrity Test Seller',
          storeName: 'Integrity Test Store',
          bio: 'Testing referential integrity',
        })
        .expect(201);

      // Create multiple listings
      const listingPromises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post(`/api/marketplace/seller/listings/${testWalletAddress}`)
          .send({
            title: `Product ${i}`,
            description: `Description ${i}`,
            price: 100 + i,
            currency: 'USD',
          })
      );

      await Promise.all(listingPromises);

      // Update seller profile
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Integrity Test Seller' })
        .expect(200);

      // Verify all listings still reference correct seller
      const listingsResponse = await request(app)
        .get(`/api/marketplace/seller/listings/${testWalletAddress}`)
        .expect(200);

      expect(listingsResponse.body.data).toHaveLength(10);
      listingsResponse.body.data.forEach((listing: any) => {
        expect(listing.sellerId).toBe(testWalletAddress);
      });

      // Verify dashboard shows consistent data
      const dashboardResponse = await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      expect(dashboardResponse.body.data.profile.displayName).toBe('Updated Integrity Test Seller');
      expect(dashboardResponse.body.data.listings).toHaveLength(10);
    });

    it('should handle transaction rollbacks correctly', async () => {
      // Mock database transaction failure
      jest.spyOn(sellerService, 'updateSellerProfile').mockImplementationOnce(async () => {
        throw new Error('Transaction failed');
      });

      // Create initial profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Transaction Test Seller',
          storeName: 'Transaction Test Store',
          bio: 'Testing transactions',
        })
        .expect(201);

      // Attempt update that should fail
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Failed Update' })
        .expect(500);

      // Verify original data is preserved
      const profileResponse = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(profileResponse.body.data.displayName).toBe('Transaction Test Seller');
    });

    it('should handle cache invalidation failures without data corruption', async () => {
      // Create seller profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Cache Test Seller',
          storeName: 'Cache Test Store',
          bio: 'Testing cache failures',
        })
        .expect(201);

      // Mock cache invalidation failure
      jest.spyOn(sellerCacheManager, 'invalidateSellerCache').mockRejectedValueOnce(
        new Error('Cache invalidation failed')
      );

      // Update should still succeed
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Cache Test Seller' })
        .expect(200);

      // Data should be updated despite cache failure
      const profileResponse = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(profileResponse.body.data.displayName).toBe('Updated Cache Test Seller');
    });
  });

  describe('Error Handling and Recovery Scenarios', () => {
    it('should implement circuit breaker pattern for external services', async () => {
      // Mock external service failures
      let failureCount = 0;
      jest.spyOn(sellerService, 'validateSellerData').mockImplementation(async () => {
        failureCount++;
        if (failureCount <= 5) {
          throw new Error('External service unavailable');
        }
        return true;
      });

      // First 5 requests should fail
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/marketplace/seller/profile')
          .send({
            walletAddress: `0x${i.toString().padStart(40, '0')}`,
            displayName: `Test Seller ${i}`,
            storeName: `Test Store ${i}`,
            bio: 'Test bio',
          })
          .expect(500);
      }

      // Circuit should be open, next request should fail fast
      const circuitOpenResponse = await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: '0x1111111111111111111111111111111111111111',
          displayName: 'Circuit Test Seller',
          storeName: 'Circuit Test Store',
          bio: 'Test bio',
        })
        .expect(503);

      expect(circuitOpenResponse.body.error.message).toContain('Circuit breaker open');
    });

    it('should handle graceful degradation during partial system failures', async () => {
      // Create seller profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Degradation Test Seller',
          storeName: 'Degradation Test Store',
          bio: 'Testing graceful degradation',
        })
        .expect(201);

      // Mock analytics service failure
      jest.spyOn(sellerService, 'updateSellerAnalytics').mockRejectedValue(
        new Error('Analytics service unavailable')
      );

      // Profile update should still succeed without analytics
      const response = await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Degradation Test Seller' })
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Degradation Test Seller');
      expect(response.body.warnings).toContain('Analytics update failed');
    });

    it('should implement proper retry logic with exponential backoff', async () => {
      let attemptCount = 0;
      jest.spyOn(sellerService, 'getSellerProfile').mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary service failure');
        }
        return {
          walletAddress: testWalletAddress,
          displayName: 'Retry Test Seller',
          storeName: 'Retry Test Store',
          bio: 'Testing retry logic',
        };
      });

      const response = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(response.body.data.displayName).toBe('Retry Test Seller');
      expect(attemptCount).toBe(3);
    });

    it('should handle database deadlocks and retry transactions', async () => {
      // Create initial profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Deadlock Test Seller',
          storeName: 'Deadlock Test Store',
          bio: 'Testing deadlock handling',
        })
        .expect(201);

      let deadlockCount = 0;
      jest.spyOn(sellerService, 'updateSellerProfile').mockImplementation(async (walletAddress, updates) => {
        deadlockCount++;
        if (deadlockCount < 3) {
          const error = new Error('Deadlock detected');
          (error as any).code = 'ER_LOCK_DEADLOCK';
          throw error;
        }
        return {
          walletAddress,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      });

      const response = await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Deadlock Test Seller' })
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Deadlock Test Seller');
      expect(deadlockCount).toBe(3);
    });

    it('should handle memory pressure and implement backpressure', async () => {
      // Mock memory pressure
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        rss: 1024 * 1024 * 1024, // 1GB
        heapTotal: 512 * 1024 * 1024, // 512MB
        heapUsed: 480 * 1024 * 1024, // 480MB (high usage)
        external: 0,
        arrayBuffers: 0,
      }));

      // Requests should be throttled under memory pressure
      const response = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(503);

      expect(response.body.error.message).toContain('Service temporarily unavailable');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Real-time Features Under Load', () => {
    it('should handle multiple WebSocket connections efficiently', async () => {
      const connections: WebSocket[] = [];
      const messagePromises: Promise<any>[] = [];

      // Create 100 WebSocket connections
      for (let i = 0; i < 100; i++) {
        const ws = new WebSocket('ws://localhost:8080');
        connections.push(ws);

        const messagePromise = new Promise((resolve) => {
          ws.on('message', (data) => {
            resolve(JSON.parse(data.toString()));
          });
        });
        messagePromises.push(messagePromise);
      }

      // Wait for all connections to open
      await Promise.all(connections.map(ws => new Promise(resolve => {
        ws.on('open', resolve);
      })));

      // Broadcast message to all connections
      const testMessage = {
        type: 'seller_update',
        walletAddress: testWalletAddress,
        data: { displayName: 'Broadcast Test' },
      };

      connections.forEach(ws => {
        ws.send(JSON.stringify(testMessage));
      });

      // All connections should receive the message
      const messages = await Promise.all(messagePromises);
      expect(messages).toHaveLength(100);
      messages.forEach(message => {
        expect(message.type).toBe('seller_update');
        expect(message.data.displayName).toBe('Broadcast Test');
      });

      // Clean up connections
      connections.forEach(ws => ws.close());
    });

    it('should handle WebSocket message queuing during high load', async () => {
      const ws = new WebSocket('ws://localhost:8080');
      const receivedMessages: any[] = [];

      ws.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
      });

      await new Promise(resolve => ws.on('open', resolve));

      // Send 1000 messages rapidly
      const messages = Array.from({ length: 1000 }, (_, i) => ({
        type: 'order_update',
        walletAddress: testWalletAddress,
        data: { orderId: `order-${i}`, status: 'processing' },
      }));

      const startTime = Date.now();
      messages.forEach(message => {
        ws.send(JSON.stringify(message));
      });

      // Wait for all messages to be processed
      await new Promise(resolve => {
        const checkMessages = () => {
          if (receivedMessages.length === 1000) {
            resolve(undefined);
          } else {
            setTimeout(checkMessages, 10);
          }
        };
        checkMessages();
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(receivedMessages).toHaveLength(1000);
      expect(processingTime).toBeLessThan(5000); // Should process within 5 seconds

      ws.close();
    });

    it('should implement WebSocket connection pooling and load balancing', async () => {
      // Create connections from different "users"
      const userConnections = Array.from({ length: 50 }, (_, i) => ({
        walletAddress: `0x${i.toString().padStart(40, '0')}`,
        ws: new WebSocket('ws://localhost:8080'),
      }));

      // Wait for all connections
      await Promise.all(userConnections.map(({ ws }) => 
        new Promise(resolve => ws.on('open', resolve))
      ));

      // Verify connections are distributed across available workers
      const connectionCounts = await request(app)
        .get('/api/monitoring/websocket-stats')
        .expect(200);

      expect(connectionCounts.body.totalConnections).toBe(50);
      expect(connectionCounts.body.activeWorkers).toBeGreaterThan(1);

      // Clean up
      userConnections.forEach(({ ws }) => ws.close());
    });

    it('should handle WebSocket memory leaks and cleanup', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const connections: WebSocket[] = [];

      // Create and destroy connections repeatedly
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create 100 connections
        for (let i = 0; i < 100; i++) {
          const ws = new WebSocket('ws://localhost:8080');
          connections.push(ws);
        }

        // Wait for connections to open
        await Promise.all(connections.map(ws => 
          new Promise(resolve => ws.on('open', resolve))
        ));

        // Close all connections
        connections.forEach(ws => ws.close());
        connections.length = 0;

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should handle high-throughput seller operations', async () => {
      const startTime = Date.now();
      const operations: Promise<any>[] = [];

      // Create 1000 seller profiles concurrently
      for (let i = 0; i < 1000; i++) {
        const operation = request(app)
          .post('/api/marketplace/seller/profile')
          .send({
            walletAddress: `0x${i.toString().padStart(40, '0')}`,
            displayName: `Seller ${i}`,
            storeName: `Store ${i}`,
            bio: `Bio for seller ${i}`,
          });
        operations.push(operation);
      }

      const responses = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Should complete within 30 seconds
      expect(totalTime).toBeLessThan(30000);

      // Calculate throughput
      const throughput = 1000 / (totalTime / 1000); // operations per second
      expect(throughput).toBeGreaterThan(50); // At least 50 ops/sec
    });

    it('should maintain response times under sustained load', async () => {
      // Create initial seller
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Load Test Seller',
          storeName: 'Load Test Store',
          bio: 'Testing sustained load',
        })
        .expect(201);

      const responseTimes: number[] = [];

      // Make 500 requests with sustained load
      for (let i = 0; i < 500; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get(`/api/marketplace/seller/${testWalletAddress}`)
          .expect(200);
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        // Small delay to simulate realistic load
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      expect(avgResponseTime).toBeLessThan(100); // Average under 100ms
      expect(maxResponseTime).toBeLessThan(1000); // Max under 1 second
      expect(p95ResponseTime).toBeLessThan(200); // 95th percentile under 200ms
    });

    it('should optimize database query performance', async () => {
      // Create seller with many listings
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Query Test Seller',
          storeName: 'Query Test Store',
          bio: 'Testing query performance',
        })
        .expect(201);

      // Create 1000 listings
      const listingPromises = Array.from({ length: 1000 }, (_, i) =>
        request(app)
          .post(`/api/marketplace/seller/listings/${testWalletAddress}`)
          .send({
            title: `Product ${i}`,
            description: `Description ${i}`,
            price: Math.random() * 1000,
            currency: 'USD',
          })
      );

      await Promise.all(listingPromises);

      // Test complex dashboard query performance
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.body.data.listings).toHaveLength(1000);
      expect(queryTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should handle memory-intensive operations efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process large batch of seller data
      const largeBatch = Array.from({ length: 10000 }, (_, i) => ({
        walletAddress: `0x${i.toString().padStart(40, '0')}`,
        displayName: `Batch Seller ${i}`,
        storeName: `Batch Store ${i}`,
        bio: `Bio for batch seller ${i}`,
      }));

      const response = await request(app)
        .post('/api/marketplace/seller/batch')
        .send({ sellers: largeBatch })
        .expect(200);

      expect(response.body.processed).toBe(10000);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 200MB)
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
    });
  });

  describe('Security and Authentication Under Load', () => {
    it('should handle authentication failures gracefully under load', async () => {
      const unauthorizedRequests = Array.from({ length: 100 }, () =>
        request(app)
          .put(`/api/marketplace/seller/${testWalletAddress}`)
          .send({ displayName: 'Unauthorized Update' })
      );

      const responses = await Promise.all(unauthorizedRequests);

      // All requests should be rejected
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      });
    });

    it('should implement rate limiting effectively under attack', async () => {
      // Simulate brute force attack
      const attackRequests = Array.from({ length: 1000 }, () =>
        request(app)
          .get(`/api/marketplace/seller/${testWalletAddress}`)
      );

      const responses = await Promise.all(attackRequests);

      // Many requests should be rate limited
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(800);
    });

    it('should detect and prevent suspicious activity patterns', async () => {
      // Create seller profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Security Test Seller',
          storeName: 'Security Test Store',
          bio: 'Testing security',
        })
        .expect(201);

      // Simulate suspicious rapid updates
      const suspiciousUpdates = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .put(`/api/marketplace/seller/${testWalletAddress}`)
          .send({ displayName: `Suspicious Update ${i}` })
      );

      const responses = await Promise.all(suspiciousUpdates);

      // Later requests should be blocked
      const blockedCount = responses.filter(r => r.status === 403).length;
      expect(blockedCount).toBeGreaterThan(30);
    });

    it('should handle SQL injection attempts safely', async () => {
      const maliciousInputs = [
        "'; DROP TABLE sellers; --",
        "' OR '1'='1",
        "'; INSERT INTO sellers VALUES ('malicious'); --",
        "' UNION SELECT * FROM users; --",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/marketplace/seller/profile')
          .send({
            walletAddress: testWalletAddress,
            displayName: maliciousInput,
            storeName: 'Test Store',
            bio: 'Test bio',
          });

        // Should either sanitize input or reject request
        expect([201, 400]).toContain(response.status);
        
        if (response.status === 201) {
          // Input should be sanitized
          expect(response.body.data.displayName).not.toContain('DROP TABLE');
          expect(response.body.data.displayName).not.toContain('UNION SELECT');
        }
      }
    });
  });

  describe('Monitoring and Observability', () => {
    it('should provide comprehensive health check endpoints', async () => {
      const healthResponse = await request(app)
        .get('/api/health/seller-service')
        .expect(200);

      expect(healthResponse.body).toHaveProperty('status', 'healthy');
      expect(healthResponse.body).toHaveProperty('checks');
      expect(healthResponse.body.checks).toHaveProperty('database');
      expect(healthResponse.body.checks).toHaveProperty('cache');
      expect(healthResponse.body.checks).toHaveProperty('websocket');
    });

    it('should track performance metrics accurately', async () => {
      // Create seller and perform operations
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Metrics Test Seller',
          storeName: 'Metrics Test Store',
          bio: 'Testing metrics',
        })
        .expect(201);

      // Perform various operations
      await request(app).get(`/api/marketplace/seller/${testWalletAddress}`);
      await request(app).put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Metrics Test Seller' });

      // Check metrics
      const metricsResponse = await request(app)
        .get('/api/metrics/seller-service')
        .expect(200);

      expect(metricsResponse.body).toHaveProperty('requests_total');
      expect(metricsResponse.body).toHaveProperty('response_time_histogram');
      expect(metricsResponse.body).toHaveProperty('active_connections');
      expect(metricsResponse.body).toHaveProperty('cache_hit_rate');
    });

    it('should generate detailed error reports', async () => {
      // Trigger various error conditions
      await request(app)
        .get('/api/marketplace/seller/invalid-address')
        .expect(400);

      await request(app)
        .get('/api/marketplace/seller/0x9999999999999999999999999999999999999999')
        .expect(404);

      // Check error reports
      const errorReportResponse = await request(app)
        .get('/api/monitoring/error-report')
        .expect(200);

      expect(errorReportResponse.body).toHaveProperty('errors');
      expect(errorReportResponse.body.errors.length).toBeGreaterThan(0);
      
      const errors = errorReportResponse.body.errors;
      expect(errors.some((e: any) => e.type === 'VALIDATION_ERROR')).toBe(true);
      expect(errors.some((e: any) => e.type === 'NOT_FOUND_ERROR')).toBe(true);
    });

    it('should provide real-time system status dashboard', async () => {
      const statusResponse = await request(app)
        .get('/api/monitoring/system-status')
        .expect(200);

      expect(statusResponse.body).toHaveProperty('uptime');
      expect(statusResponse.body).toHaveProperty('memory_usage');
      expect(statusResponse.body).toHaveProperty('cpu_usage');
      expect(statusResponse.body).toHaveProperty('active_connections');
      expect(statusResponse.body).toHaveProperty('request_rate');
      expect(statusResponse.body).toHaveProperty('error_rate');
    });
  });
});
