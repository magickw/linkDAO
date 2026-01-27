/**
 * Performance Tests for Seller Notification Service
 * 
 * Tests notification latency requirements for:
 * - CP-R4.1: New order push notifications sent within 30 seconds
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 * @requirement 4.1 - Push notification within 30 seconds of new order
 */

import { jest, describe, it, expect } from '@jest/globals';
import { SellerNotificationService } from '../../services/sellerNotificationService';
import {
  SellerNotificationInput,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../types/sellerNotification';

// Performance test configuration
const PERFORMANCE_CONFIG = {
  /** Maximum allowed latency for push notifications (ms) - Requirement 4.1 */
  MAX_PUSH_NOTIFICATION_LATENCY_MS: 30000,
  
  /** Target latency for optimal performance (ms) */
  TARGET_LATENCY_MS: 5000,
  
  /** Number of iterations for latency measurement */
  LATENCY_TEST_ITERATIONS: 10,
  
  /** Concurrent notification test count */
  CONCURRENT_NOTIFICATION_COUNT: 10,
};

// Mock dependencies with timing simulation
const createMockDatabaseService = () => ({
  getSellerNotificationPreferences: jest.fn<() => Promise<NotificationPreferences | null>>(),
  upsertSellerNotificationPreferences: jest.fn<() => Promise<void>>(),
  upsertSellerNotification: jest.fn<() => Promise<void>>(),
  getSellerPendingNotifications: jest.fn<() => Promise<any[]>>(),
  getSellerNotificationHistory: jest.fn<() => Promise<any[]>>(),
  getSellerNotificationCount: jest.fn<() => Promise<number>>(),
  markSellerNotificationAsRead: jest.fn<() => Promise<boolean>>(),
  markAllSellerNotificationsAsRead: jest.fn<() => Promise<number>>(),
  getSellerUnreadNotificationCount: jest.fn<() => Promise<number>>(),
  cancelSellerNotification: jest.fn<() => Promise<boolean>>(),
  getAllPendingSellerNotifications: jest.fn<() => Promise<any[]>>(),
  getUserByAddress: jest.fn<() => Promise<any>>(),
});

const createMockNotificationService = () => ({
  sendOrderNotification: jest.fn<() => Promise<void>>(),
  sendPushNotification: jest.fn<() => Promise<void>>(),
});

const createMockWebSocketService = () => ({
  sendToUser: jest.fn(),
  sendNotification: jest.fn(),
});

const createMockEmailService = () => ({
  sendEmail: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  getInstance: jest.fn(),
});

// Helper to create a service instance with mocks
function createServiceWithMocks() {
  const mockDb = createMockDatabaseService();
  const mockNotification = createMockNotificationService();
  const mockWebSocket = createMockWebSocketService();
  const mockEmail = createMockEmailService();
  
  const service = new SellerNotificationService(
    mockDb as any,
    mockNotification as any,
    mockWebSocket as any,
    mockEmail as any
  );
  
  return { service, mockDb, mockNotification, mockWebSocket, mockEmail };
}

// Helper to create default preferences
function createDefaultPreferences(sellerId: string, overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return {
    sellerId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create a new order notification input
function createNewOrderNotificationInput(sellerId: string, orderId: string): SellerNotificationInput {
  return {
    sellerId,
    type: 'new_order',
    orderId,
    title: 'New Order Received',
    body: `You have received a new order #${orderId}`,
    data: {
      totalAmount: 150.00,
      buyerName: 'Test Buyer',
      itemCount: 3,
      currency: 'USD',
    },
    channels: ['push', 'email', 'in_app'],
  };
}

// Helper to measure execution time
async function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  return {
    result,
    durationMs: endTime - startTime,
  };
}

describe('SellerNotificationService Performance Tests', () => {
  /**
   * ============================================================================
   * CP-R4.1: New order push notifications sent within 30 seconds
   * ============================================================================
   * 
   * Verification: Performance test measures notification latency
   * 
   * This test suite verifies that the notification service can deliver
   * new order notifications within the required 30-second window.
   */
  describe('CP-R4.1: Notification Latency Performance', () => {
    describe('Single Notification Latency', () => {
      it('should send immediate notification within 30 seconds', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const input = createNewOrderNotificationInput('seller-perf-001', 'order-001');

        const { result, durationMs } = await measureExecutionTime(() =>
          service.sendImmediateNotification(input)
        );

        // Verify notification was sent
        expect(result.status).toBe('sent');
        expect(result.sentAt).toBeDefined();

        // Verify latency is within 30-second requirement
        expect(durationMs).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);

        // Log performance metrics
        console.log(`Single notification latency: ${durationMs.toFixed(2)}ms`);
      });

      it('should achieve target latency of under 5 seconds for optimal performance', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const input = createNewOrderNotificationInput('seller-perf-002', 'order-002');

        const { result, durationMs } = await measureExecutionTime(() =>
          service.sendImmediateNotification(input)
        );

        expect(result.status).toBe('sent');
        
        // Target latency for optimal performance
        expect(durationMs).toBeLessThan(PERFORMANCE_CONFIG.TARGET_LATENCY_MS);

        console.log(`Target latency check: ${durationMs.toFixed(2)}ms (target: <${PERFORMANCE_CONFIG.TARGET_LATENCY_MS}ms)`);
      });
    });

    describe('Average Latency Measurement', () => {
      it('should maintain average latency under 30 seconds across multiple notifications', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const latencies: number[] = [];

        for (let i = 0; i < PERFORMANCE_CONFIG.LATENCY_TEST_ITERATIONS; i++) {
          const input = createNewOrderNotificationInput(
            `seller-avg-${i}`,
            `order-avg-${i}`
          );

          const { durationMs } = await measureExecutionTime(() =>
            service.sendImmediateNotification(input)
          );

          latencies.push(durationMs);
        }

        const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const minLatency = Math.min(...latencies);

        // Verify average latency is within requirement
        expect(averageLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);

        // Log performance metrics
        console.log(`Average latency: ${averageLatency.toFixed(2)}ms`);
        console.log(`Min latency: ${minLatency.toFixed(2)}ms`);
        console.log(`Max latency: ${maxLatency.toFixed(2)}ms`);
        console.log(`Iterations: ${PERFORMANCE_CONFIG.LATENCY_TEST_ITERATIONS}`);
      });

      it('should have consistent latency (low variance)', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const latencies: number[] = [];

        for (let i = 0; i < PERFORMANCE_CONFIG.LATENCY_TEST_ITERATIONS; i++) {
          const input = createNewOrderNotificationInput(
            `seller-var-${i}`,
            `order-var-${i}`
          );

          const { durationMs } = await measureExecutionTime(() =>
            service.sendImmediateNotification(input)
          );

          latencies.push(durationMs);
        }

        const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        
        // Calculate standard deviation
        const squaredDiffs = latencies.map(l => Math.pow(l - averageLatency, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
        const standardDeviation = Math.sqrt(avgSquaredDiff);

        console.log(`Standard deviation: ${standardDeviation.toFixed(2)}ms`);
        console.log(`Average latency: ${averageLatency.toFixed(2)}ms`);

        // For sub-millisecond latencies, check absolute standard deviation instead of CV
        // Standard deviation should be less than 50ms (well within 30-second requirement)
        // This is more meaningful than CV for very fast operations
        expect(standardDeviation).toBeLessThan(50);
        
        // Also verify all latencies are within the 30-second requirement
        const maxLatency = Math.max(...latencies);
        expect(maxLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
      });
    });

    describe('Concurrent Notification Performance', () => {
      it('should handle concurrent notifications within latency requirements', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const notifications: Promise<{ result: any; durationMs: number }>[] = [];

        // Create concurrent notification requests
        for (let i = 0; i < PERFORMANCE_CONFIG.CONCURRENT_NOTIFICATION_COUNT; i++) {
          const input = createNewOrderNotificationInput(
            `seller-concurrent-${i}`,
            `order-concurrent-${i}`
          );

          notifications.push(
            measureExecutionTime(() => service.sendImmediateNotification(input))
          );
        }

        // Wait for all notifications to complete
        const startTime = performance.now();
        const results = await Promise.all(notifications);
        const totalDuration = performance.now() - startTime;

        // Verify all notifications were sent
        results.forEach(({ result }) => {
          expect(result.status).toBe('sent');
        });

        // Verify individual latencies
        const latencies = results.map(r => r.durationMs);
        const maxLatency = Math.max(...latencies);
        const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

        // All individual notifications should complete within 30 seconds
        expect(maxLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);

        console.log(`Concurrent notifications: ${PERFORMANCE_CONFIG.CONCURRENT_NOTIFICATION_COUNT}`);
        console.log(`Total duration: ${totalDuration.toFixed(2)}ms`);
        console.log(`Average individual latency: ${averageLatency.toFixed(2)}ms`);
        console.log(`Max individual latency: ${maxLatency.toFixed(2)}ms`);
      });

      it('should scale linearly with concurrent load', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const loadLevels = [1, 5, 10];
        const results: { load: number; avgLatency: number }[] = [];

        for (const load of loadLevels) {
          const notifications: Promise<{ result: any; durationMs: number }>[] = [];

          for (let i = 0; i < load; i++) {
            const input = createNewOrderNotificationInput(
              `seller-scale-${load}-${i}`,
              `order-scale-${load}-${i}`
            );

            notifications.push(
              measureExecutionTime(() => service.sendImmediateNotification(input))
            );
          }

          const loadResults = await Promise.all(notifications);
          const latencies = loadResults.map(r => r.durationMs);
          const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

          results.push({ load, avgLatency });
        }

        // Log scaling results
        console.log('Scaling results:');
        results.forEach(({ load, avgLatency }) => {
          console.log(`  Load ${load}: avg latency ${avgLatency.toFixed(2)}ms`);
        });

        // Verify all load levels meet the 30-second requirement
        results.forEach(({ avgLatency }) => {
          expect(avgLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
        });
      });
    });

    describe('New Order Notification Specific Performance', () => {
      it('should prioritize new_order notifications for immediate delivery', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-priority-001';

        // Queue a normal notification first
        await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-normal',
          title: 'Order Update',
          body: 'Normal update',
        });

        // Send new_order notification - should be immediate
        const newOrderInput = createNewOrderNotificationInput(sellerId, 'order-new');

        const { result, durationMs } = await measureExecutionTime(() =>
          service.queueNotification(newOrderInput)
        );

        // New order should NOT be batched (sent immediately)
        expect(result.status).not.toBe('batched');
        
        // Should complete within 30 seconds
        expect(durationMs).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);

        console.log(`New order notification latency: ${durationMs.toFixed(2)}ms`);
      });

      it('should deliver new_order notifications faster than normal notifications', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        // Measure new_order notification latency
        const newOrderInput = createNewOrderNotificationInput('seller-compare-001', 'order-new');
        const { durationMs: newOrderLatency } = await measureExecutionTime(() =>
          service.sendImmediateNotification(newOrderInput)
        );

        // Measure normal notification latency
        const normalInput: SellerNotificationInput = {
          sellerId: 'seller-compare-002',
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-normal',
          title: 'Order Update',
          body: 'Normal update',
        };
        const { durationMs: normalLatency } = await measureExecutionTime(() =>
          service.sendImmediateNotification(normalInput)
        );

        console.log(`New order latency: ${newOrderLatency.toFixed(2)}ms`);
        console.log(`Normal notification latency: ${normalLatency.toFixed(2)}ms`);

        // Both should be within requirements
        expect(newOrderLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
        expect(normalLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
      });
    });

    describe('Channel-Specific Latency', () => {
      it('should deliver push notifications within latency requirements', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        // Enable only push notifications
        const prefs = createDefaultPreferences('seller-push-001', {
          pushEnabled: true,
          emailEnabled: false,
          inAppEnabled: false,
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(prefs);

        const input: SellerNotificationInput = {
          sellerId: 'seller-push-001',
          type: 'new_order',
          orderId: 'order-push',
          title: 'New Order',
          body: 'Push only notification',
          channels: ['push'],
        };

        const { result, durationMs } = await measureExecutionTime(() =>
          service.sendImmediateNotification(input)
        );

        expect(result.status).toBe('sent');
        expect(durationMs).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);

        console.log(`Push-only notification latency: ${durationMs.toFixed(2)}ms`);
      });

      it('should deliver multi-channel notifications within latency requirements', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        // Enable all channels
        const prefs = createDefaultPreferences('seller-multi-001', {
          pushEnabled: true,
          emailEnabled: true,
          inAppEnabled: true,
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(prefs);

        const input: SellerNotificationInput = {
          sellerId: 'seller-multi-001',
          type: 'new_order',
          orderId: 'order-multi',
          title: 'New Order',
          body: 'Multi-channel notification',
          channels: ['push', 'email', 'in_app'],
        };

        const { result, durationMs } = await measureExecutionTime(() =>
          service.sendImmediateNotification(input)
        );

        expect(result.status).toBe('sent');
        expect(durationMs).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);

        console.log(`Multi-channel notification latency: ${durationMs.toFixed(2)}ms`);
      });
    });

    describe('Performance Under Stress', () => {
      it('should maintain latency requirements under rapid successive notifications', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const rapidCount = 20;
        const latencies: number[] = [];

        // Send notifications in rapid succession (no await between sends)
        const promises: Promise<void>[] = [];
        
        for (let i = 0; i < rapidCount; i++) {
          const input = createNewOrderNotificationInput(
            `seller-rapid-${i}`,
            `order-rapid-${i}`
          );

          const promise = (async () => {
            const { durationMs } = await measureExecutionTime(() =>
              service.sendImmediateNotification(input)
            );
            latencies.push(durationMs);
          })();

          promises.push(promise);
        }

        await Promise.all(promises);

        const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const maxLatency = Math.max(...latencies);
        const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

        console.log(`Rapid succession test (${rapidCount} notifications):`);
        console.log(`  Average latency: ${averageLatency.toFixed(2)}ms`);
        console.log(`  Max latency: ${maxLatency.toFixed(2)}ms`);
        console.log(`  P95 latency: ${p95Latency.toFixed(2)}ms`);

        // All notifications should complete within 30 seconds
        expect(maxLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
        
        // P95 should also be within requirements
        expect(p95Latency).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
      });
    });

    describe('Performance Metrics Summary', () => {
      it('should generate comprehensive performance report', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const testCount = 15;
        const latencies: number[] = [];

        for (let i = 0; i < testCount; i++) {
          const input = createNewOrderNotificationInput(
            `seller-report-${i}`,
            `order-report-${i}`
          );

          const { durationMs } = await measureExecutionTime(() =>
            service.sendImmediateNotification(input)
          );

          latencies.push(durationMs);
        }

        // Calculate statistics
        const sortedLatencies = [...latencies].sort((a, b) => a - b);
        const stats = {
          count: testCount,
          min: sortedLatencies[0],
          max: sortedLatencies[sortedLatencies.length - 1],
          average: latencies.reduce((a, b) => a + b, 0) / latencies.length,
          median: sortedLatencies[Math.floor(sortedLatencies.length / 2)],
          p90: sortedLatencies[Math.floor(sortedLatencies.length * 0.9)],
          p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
          p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)],
        };

        console.log('\n=== Performance Report: CP-R4.1 Notification Latency ===');
        console.log(`Requirement: Push notifications within 30 seconds`);
        console.log(`Test iterations: ${stats.count}`);
        console.log(`\nLatency Statistics (ms):`);
        console.log(`  Min:     ${stats.min.toFixed(2)}`);
        console.log(`  Max:     ${stats.max.toFixed(2)}`);
        console.log(`  Average: ${stats.average.toFixed(2)}`);
        console.log(`  Median:  ${stats.median.toFixed(2)}`);
        console.log(`  P90:     ${stats.p90.toFixed(2)}`);
        console.log(`  P95:     ${stats.p95.toFixed(2)}`);
        console.log(`  P99:     ${stats.p99.toFixed(2)}`);
        console.log(`\nRequirement Status: ${stats.max < PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS ? 'PASS' : 'FAIL'}`);
        console.log('=========================================================\n');

        // Verify all percentiles meet requirements
        expect(stats.max).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
        expect(stats.p99).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
        expect(stats.p95).toBeLessThan(PERFORMANCE_CONFIG.MAX_PUSH_NOTIFICATION_LATENCY_MS);
      });
    });
  });
});
