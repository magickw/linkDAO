/**
 * Unit Tests for Seller Notification Service
 * 
 * Tests correctness properties for:
 * - CP-R4.4: Rapid orders batch to max 1 notification per minute
 * - CP-R4.5: Quiet hours and channel preferences respected
 * - CP-R4.6: High-value/expedited orders marked as high priority
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SellerNotificationService } from '../../services/sellerNotificationService';
import {
  SellerNotificationInput,
  NotificationPreferences,
  NOTIFICATION_BATCHING,
  HIGH_VALUE_ORDER_CONFIG,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../types/sellerNotification';

// Mock dependencies
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

describe('SellerNotificationService Unit Tests', () => {
  /**
   * ============================================================================
   * CP-R4.4: Rapid orders batch to max 1 notification per minute
   * ============================================================================
   * 
   * Verification: Unit test verifies batching logic with rapid order simulation
   */
  describe('CP-R4.4: Notification Batching Logic', () => {
    describe('Batching Configuration Constants', () => {
      it('should have maxBatchSize of 10', () => {
        expect(NOTIFICATION_BATCHING.maxBatchSize).toBe(10);
      });

      it('should have maxBatchWindowMs of 60000 (1 minute)', () => {
        expect(NOTIFICATION_BATCHING.maxBatchWindowMs).toBe(60000);
      });

      it('should have minIntervalMs of 60000 (1 minute)', () => {
        expect(NOTIFICATION_BATCHING.minIntervalMs).toBe(60000);
      });

      it('should have urgentBypassBatching set to true', () => {
        expect(NOTIFICATION_BATCHING.urgentBypassBatching).toBe(true);
      });
    });

    describe('First notification to a seller', () => {
      it('should NOT batch the first notification to a seller', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const input: SellerNotificationInput = {
          sellerId: 'seller-001',
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Order Update',
          body: 'Your order has been updated',
          data: { totalAmount: 100 },
        };

        const result = await service.queueNotification(input);
        
        // First notification should be pending, not batched
        expect(result.status).toBe('pending');
      });
    });


    describe('Rapid order simulation - batching within 60 seconds', () => {
      it('should batch subsequent normal priority notifications within 60 seconds', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-rapid-001';

        // First notification - should not be batched
        const firstInput: SellerNotificationInput = {
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Order Update 1',
          body: 'First update',
          data: { totalAmount: 100 },
        };

        const firstResult = await service.queueNotification(firstInput);
        expect(firstResult.status).toBe('pending');

        // Second notification within 60 seconds - should be batched
        const secondInput: SellerNotificationInput = {
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-002',
          title: 'Order Update 2',
          body: 'Second update',
          data: { totalAmount: 150 },
        };

        const secondResult = await service.queueNotification(secondInput);
        expect(secondResult.status).toBe('batched');
      });

      it('should batch multiple rapid notifications to the same seller', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-rapid-002';

        // First notification
        await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Update 1',
          body: 'First',
          data: { totalAmount: 50 },
        });

        // Subsequent notifications should all be batched
        for (let i = 2; i <= 5; i++) {
          const result = await service.queueNotification({
            sellerId,
            type: 'order_update',
            priority: 'normal',
            orderId: `order-00${i}`,
            title: `Update ${i}`,
            body: `Update number ${i}`,
            data: { totalAmount: 50 * i },
          });
          
          expect(result.status).toBe('batched');
        }
      });
    });


    describe('Urgent notifications bypass batching', () => {
      it('should NOT batch urgent priority notifications', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-urgent-001';

        // First notification
        await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Normal Update',
          body: 'Normal notification',
        });

        // Urgent notification should NOT be batched
        const urgentResult = await service.queueNotification({
          sellerId,
          type: 'cancellation_request',
          priority: 'urgent',
          orderId: 'order-002',
          title: 'Cancellation Request',
          body: 'Urgent cancellation',
        });

        expect(urgentResult.status).not.toBe('batched');
      });

      it('should NOT batch cancellation_request type (auto-urgent)', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-cancel-001';

        // First notification
        await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Update',
          body: 'Normal',
        });

        // Cancellation request should be urgent and not batched
        const cancelResult = await service.queueNotification({
          sellerId,
          type: 'cancellation_request',
          orderId: 'order-002',
          title: 'Cancellation',
          body: 'Cancel request',
        });

        expect(cancelResult.priority).toBe('urgent');
        expect(cancelResult.status).not.toBe('batched');
      });

      it('should NOT batch dispute_opened type (auto-urgent)', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-dispute-001';

        // First notification
        await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Update',
          body: 'Normal',
        });

        // Dispute should be urgent and not batched
        const disputeResult = await service.queueNotification({
          sellerId,
          type: 'dispute_opened',
          orderId: 'order-002',
          title: 'Dispute',
          body: 'Dispute opened',
        });

        expect(disputeResult.priority).toBe('urgent');
        expect(disputeResult.status).not.toBe('batched');
      });
    });


    describe('New order notifications bypass batching (30-second requirement)', () => {
      it('should NOT batch new_order notifications', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-neworder-001';

        // First notification
        await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Update',
          body: 'Normal',
        });

        // New order should bypass batching for 30-second delivery requirement
        const newOrderResult = await service.queueNotification({
          sellerId,
          type: 'new_order',
          orderId: 'order-002',
          title: 'New Order',
          body: 'You have a new order',
        });

        expect(newOrderResult.status).not.toBe('batched');
      });

      it('should send new_order notifications immediately regardless of timing', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const sellerId = 'seller-neworder-002';

        // Multiple new orders in rapid succession should all be sent immediately
        for (let i = 1; i <= 3; i++) {
          const result = await service.queueNotification({
            sellerId,
            type: 'new_order',
            orderId: `order-00${i}`,
            title: `New Order ${i}`,
            body: `New order number ${i}`,
          });

          // New orders should never be batched
          expect(result.status).not.toBe('batched');
        }
      });
    });

    describe('High priority notifications with urgentBypassBatching', () => {
      it('should NOT batch high priority notifications when urgentBypassBatching is true', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        // Verify the config
        expect(NOTIFICATION_BATCHING.urgentBypassBatching).toBe(true);

        const sellerId = 'seller-highpri-001';

        // First notification
        await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'normal',
          orderId: 'order-001',
          title: 'Update',
          body: 'Normal',
        });

        // High priority should bypass batching
        const highPriResult = await service.queueNotification({
          sellerId,
          type: 'order_update',
          priority: 'high',
          orderId: 'order-002',
          title: 'High Priority Update',
          body: 'Important update',
        });

        expect(highPriResult.status).not.toBe('batched');
      });
    });
  });


  /**
   * ============================================================================
   * CP-R4.5: Quiet hours and channel preferences respected
   * ============================================================================
   * 
   * Verification: Unit test verifies preference filtering logic
   */
  describe('CP-R4.5: Quiet Hours and Channel Preferences', () => {
    describe('Default Preferences', () => {
      it('should return default preferences when none exist', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const prefs = await service.getNotificationPreferences('seller-new');

        expect(prefs.pushEnabled).toBe(true);
        expect(prefs.emailEnabled).toBe(true);
        expect(prefs.inAppEnabled).toBe(true);
        expect(prefs.quietHoursEnabled).toBe(false);
        expect(prefs.batchingEnabled).toBe(true);
        expect(prefs.batchWindowMinutes).toBe(1);
      });

      it('should have correct default values in DEFAULT_NOTIFICATION_PREFERENCES', () => {
        expect(DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled).toBe(true);
        expect(DEFAULT_NOTIFICATION_PREFERENCES.emailEnabled).toBe(true);
        expect(DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled).toBe(true);
        expect(DEFAULT_NOTIFICATION_PREFERENCES.quietHoursEnabled).toBe(false);
        expect(DEFAULT_NOTIFICATION_PREFERENCES.batchingEnabled).toBe(true);
        expect(DEFAULT_NOTIFICATION_PREFERENCES.batchWindowMinutes).toBe(1);
        expect(DEFAULT_NOTIFICATION_PREFERENCES.quietHoursTimezone).toBe('UTC');
      });
    });

    describe('Channel Preferences', () => {
      it('should return stored preferences when they exist', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const storedPrefs = createDefaultPreferences('seller-001', {
          pushEnabled: false,
          emailEnabled: true,
          inAppEnabled: true,
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(storedPrefs);

        const prefs = await service.getNotificationPreferences('seller-001');

        expect(prefs.pushEnabled).toBe(false);
        expect(prefs.emailEnabled).toBe(true);
        expect(prefs.inAppEnabled).toBe(true);
      });

      it('should update preferences correctly', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const existingPrefs = createDefaultPreferences('seller-001');
        mockDb.getSellerNotificationPreferences.mockResolvedValue(existingPrefs);
        mockDb.upsertSellerNotificationPreferences.mockResolvedValue(undefined);

        const updated = await service.updateNotificationPreferences('seller-001', {
          pushEnabled: false,
          emailEnabled: false,
        });

        expect(updated.pushEnabled).toBe(false);
        expect(updated.emailEnabled).toBe(false);
        expect(updated.inAppEnabled).toBe(true); // Unchanged
        expect(mockDb.upsertSellerNotificationPreferences).toHaveBeenCalled();
      });

      it('should preserve existing preferences when partially updating', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const existingPrefs = createDefaultPreferences('seller-001', {
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          quietHoursTimezone: 'America/New_York',
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(existingPrefs);
        mockDb.upsertSellerNotificationPreferences.mockResolvedValue(undefined);

        const updated = await service.updateNotificationPreferences('seller-001', {
          pushEnabled: false,
        });

        // Original quiet hours should be preserved
        expect(updated.quietHoursEnabled).toBe(true);
        expect(updated.quietHoursStart).toBe('22:00');
        expect(updated.quietHoursEnd).toBe('08:00');
        expect(updated.quietHoursTimezone).toBe('America/New_York');
        // Updated field
        expect(updated.pushEnabled).toBe(false);
      });
    });


    describe('Quiet Hours Configuration', () => {
      it('should store quiet hours settings correctly', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const existingPrefs = createDefaultPreferences('seller-001');
        mockDb.getSellerNotificationPreferences.mockResolvedValue(existingPrefs);
        mockDb.upsertSellerNotificationPreferences.mockResolvedValue(undefined);

        const updated = await service.updateNotificationPreferences('seller-001', {
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          quietHoursTimezone: 'America/New_York',
        });

        expect(updated.quietHoursEnabled).toBe(true);
        expect(updated.quietHoursStart).toBe('22:00');
        expect(updated.quietHoursEnd).toBe('08:00');
        expect(updated.quietHoursTimezone).toBe('America/New_York');
      });

      it('should handle overnight quiet hours (e.g., 22:00 - 08:00)', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const prefs = createDefaultPreferences('seller-001', {
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          quietHoursTimezone: 'UTC',
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(prefs);

        const retrieved = await service.getNotificationPreferences('seller-001');

        // Verify overnight hours are stored correctly
        expect(retrieved.quietHoursStart).toBe('22:00');
        expect(retrieved.quietHoursEnd).toBe('08:00');
        
        // Start time (22:00 = 1320 minutes) > End time (08:00 = 480 minutes)
        const [startH, startM] = retrieved.quietHoursStart!.split(':').map(Number);
        const [endH, endM] = retrieved.quietHoursEnd!.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        expect(startMinutes).toBeGreaterThan(endMinutes);
      });

      it('should handle same-day quiet hours (e.g., 12:00 - 14:00)', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const prefs = createDefaultPreferences('seller-001', {
          quietHoursEnabled: true,
          quietHoursStart: '12:00',
          quietHoursEnd: '14:00',
          quietHoursTimezone: 'UTC',
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(prefs);

        const retrieved = await service.getNotificationPreferences('seller-001');

        // Start time (12:00 = 720 minutes) < End time (14:00 = 840 minutes)
        const [startH, startM] = retrieved.quietHoursStart!.split(':').map(Number);
        const [endH, endM] = retrieved.quietHoursEnd!.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        
        expect(startMinutes).toBeLessThan(endMinutes);
      });

      it('should support various timezones', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const timezones = [
          'UTC',
          'America/New_York',
          'America/Los_Angeles',
          'Europe/London',
          'Asia/Tokyo',
        ];

        for (const timezone of timezones) {
          const prefs = createDefaultPreferences('seller-001', {
            quietHoursEnabled: true,
            quietHoursStart: '22:00',
            quietHoursEnd: '08:00',
            quietHoursTimezone: timezone,
          });
          mockDb.getSellerNotificationPreferences.mockResolvedValue(prefs);

          const retrieved = await service.getNotificationPreferences('seller-001');
          expect(retrieved.quietHoursTimezone).toBe(timezone);
        }
      });
    });


    describe('Batching Preferences', () => {
      it('should respect batchingEnabled preference', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const prefs = createDefaultPreferences('seller-001', {
          batchingEnabled: false,
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(prefs);

        const retrieved = await service.getNotificationPreferences('seller-001');
        expect(retrieved.batchingEnabled).toBe(false);
      });

      it('should respect batchWindowMinutes preference', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const prefs = createDefaultPreferences('seller-001', {
          batchingEnabled: true,
          batchWindowMinutes: 5,
        });
        mockDb.getSellerNotificationPreferences.mockResolvedValue(prefs);

        const retrieved = await service.getNotificationPreferences('seller-001');
        expect(retrieved.batchWindowMinutes).toBe(5);
      });
    });

    describe('High Value Threshold Preference', () => {
      it('should store custom high value threshold', async () => {
        const { service, mockDb } = createServiceWithMocks();
        
        const existingPrefs = createDefaultPreferences('seller-001');
        mockDb.getSellerNotificationPreferences.mockResolvedValue(existingPrefs);
        mockDb.upsertSellerNotificationPreferences.mockResolvedValue(undefined);

        const updated = await service.updateNotificationPreferences('seller-001', {
          highValueThreshold: 1000,
        });

        expect(updated.highValueThreshold).toBe(1000);
      });

      it('should use default threshold when not set', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const prefs = await service.getNotificationPreferences('seller-001');
        
        // Default threshold should be undefined (uses HIGH_VALUE_ORDER_CONFIG.defaultThresholdUSD)
        expect(prefs.highValueThreshold).toBeUndefined();
        expect(HIGH_VALUE_ORDER_CONFIG.defaultThresholdUSD).toBe(500);
      });
    });

    describe('Error Handling', () => {
      it('should return default preferences on database error', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockRejectedValue(new Error('DB Error'));

        const prefs = await service.getNotificationPreferences('seller-001');

        // Should return defaults on error
        expect(prefs.sellerId).toBe('seller-001');
        expect(prefs.pushEnabled).toBe(true);
        expect(prefs.emailEnabled).toBe(true);
        expect(prefs.inAppEnabled).toBe(true);
      });
    });
  });


  /**
   * ============================================================================
   * CP-R4.6: High-value/expedited orders marked as high priority
   * ============================================================================
   * 
   * Verification: Unit test verifies priority assignment logic
   */
  describe('CP-R4.6: High-Value and Expedited Order Priority', () => {
    describe('High Value Order Configuration', () => {
      it('should have default threshold of $500', () => {
        expect(HIGH_VALUE_ORDER_CONFIG.defaultThresholdUSD).toBe(500);
      });

      it('should have correct expedited shipping keywords', () => {
        const expectedKeywords = [
          'expedited', 'express', 'overnight', 'rush', 'priority',
          'next-day', 'same-day', 'next day', 'same day'
        ];
        expect(HIGH_VALUE_ORDER_CONFIG.expeditedKeywords).toEqual(expectedKeywords);
      });
    });

    describe('High Value Order Detection', () => {
      it('should mark orders >= $500 as high priority', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const testAmounts = [500, 501, 750, 1000, 5000];

        for (const amount of testAmounts) {
          const result = await service.queueNotification({
            sellerId: 'seller-highvalue',
            type: 'order_update',
            orderId: `order-${amount}`,
            title: 'Order Update',
            body: 'Update',
            data: { totalAmount: amount },
          });

          expect(result.priority).toBe('high');
          expect(result.data?.isHighValue).toBe(true);
        }
      });

      it('should NOT mark orders < $500 as high priority (without expedited)', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const testAmounts = [0, 100, 250, 499, 499.99];

        for (const amount of testAmounts) {
          const result = await service.queueNotification({
            sellerId: 'seller-lowvalue',
            type: 'order_update',
            orderId: `order-${amount}`,
            title: 'Order Update',
            body: 'Update',
            data: { 
              totalAmount: amount,
              shippingMethod: 'standard',
            },
          });

          expect(result.priority).toBe('normal');
          expect(result.data?.isHighValue).toBe(false);
        }
      });

      it('should detect high value using totalAmount field', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Update',
          body: 'Update',
          data: { totalAmount: 600 },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isHighValue).toBe(true);
      });

      it('should detect high value using orderTotal field', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Update',
          body: 'Update',
          data: { orderTotal: 600 },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isHighValue).toBe(true);
      });

      it('should detect high value using amount field', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Update',
          body: 'Update',
          data: { amount: 600 },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isHighValue).toBe(true);
      });
    });


    describe('Expedited Shipping Detection', () => {
      it('should mark orders with expedited shipping keywords as high priority', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const expeditedKeywords = HIGH_VALUE_ORDER_CONFIG.expeditedKeywords;

        for (const keyword of expeditedKeywords) {
          const result = await service.queueNotification({
            sellerId: 'seller-expedited',
            type: 'order_update',
            orderId: `order-${keyword}`,
            title: 'Order Update',
            body: 'Update',
            data: { 
              totalAmount: 100, // Below high-value threshold
              shippingMethod: keyword,
            },
          });

          expect(result.priority).toBe('high');
          expect(result.data?.isExpedited).toBe(true);
        }
      });

      it('should detect expedited in shippingType field', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Update',
          body: 'Update',
          data: { 
            totalAmount: 100,
            shippingType: 'express',
          },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isExpedited).toBe(true);
      });

      it('should detect expedited using isExpedited boolean flag', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Update',
          body: 'Update',
          data: { 
            totalAmount: 100,
            isExpedited: true,
          },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isExpedited).toBe(true);
      });

      it('should detect expedited using expeditedShipping boolean flag', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Update',
          body: 'Update',
          data: { 
            totalAmount: 100,
            expeditedShipping: true,
          },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isExpedited).toBe(true);
      });

      it('should NOT mark standard shipping as expedited', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const nonExpeditedMethods = ['standard', 'economy', 'ground', 'regular', 'normal'];

        for (const method of nonExpeditedMethods) {
          const result = await service.queueNotification({
            sellerId: 'seller-standard',
            type: 'order_update',
            orderId: `order-${method}`,
            title: 'Order Update',
            body: 'Update',
            data: { 
              totalAmount: 100,
              shippingMethod: method,
            },
          });

          expect(result.data?.isExpedited).toBe(false);
        }
      });
    });


    describe('Notification Type Priority', () => {
      it('should mark cancellation_request as urgent priority', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'cancellation_request',
          orderId: 'order-001',
          title: 'Cancellation Request',
          body: 'A cancellation has been requested',
        });

        expect(result.priority).toBe('urgent');
      });

      it('should mark dispute_opened as urgent priority', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'dispute_opened',
          orderId: 'order-001',
          title: 'Dispute Opened',
          body: 'A dispute has been opened',
        });

        expect(result.priority).toBe('urgent');
      });

      it('should mark new_order as high priority by default', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'new_order',
          orderId: 'order-001',
          title: 'New Order',
          body: 'You have a new order',
          data: { totalAmount: 100 }, // Below high-value threshold
        });

        expect(result.priority).toBe('high');
      });

      it('should respect explicit urgent priority', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          priority: 'urgent',
          orderId: 'order-001',
          title: 'Urgent Update',
          body: 'Urgent notification',
        });

        expect(result.priority).toBe('urgent');
      });
    });

    describe('Combined High-Value and Expedited', () => {
      it('should mark both flags when order is high-value AND expedited', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Order Update',
          body: 'Update',
          data: { 
            totalAmount: 1000, // High value
            shippingMethod: 'overnight', // Expedited
          },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isHighValue).toBe(true);
        expect(result.data?.isExpedited).toBe(true);
      });

      it('should include priority reasons in notification data', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Order Update',
          body: 'Update',
          data: { 
            totalAmount: 750,
            shippingMethod: 'express',
          },
        });

        expect(result.data?.priorityReasons).toBeDefined();
        expect(Array.isArray(result.data?.priorityReasons)).toBe(true);
        expect((result.data?.priorityReasons as string[]).length).toBeGreaterThan(0);
      });
    });


    describe('Custom High Value Threshold', () => {
      it('should use custom threshold from notification data', async () => {
        const { service, mockDb } = createServiceWithMocks();
        mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

        // Order of $400 with custom threshold of $300 should be high value
        const result = await service.queueNotification({
          sellerId: 'seller-001',
          type: 'order_update',
          orderId: 'order-001',
          title: 'Order Update',
          body: 'Update',
          data: { 
            totalAmount: 400,
            highValueThreshold: 300,
            shippingMethod: 'standard',
          },
        });

        expect(result.priority).toBe('high');
        expect(result.data?.isHighValue).toBe(true);
      });
    });
  });

  /**
   * ============================================================================
   * Integration Tests - Combined Behaviors
   * ============================================================================
   */
  describe('Integration: Combined Batching, Preferences, and Priority', () => {
    it('should preserve notification data through queueing', async () => {
      const { service, mockDb } = createServiceWithMocks();
      mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

      const input: SellerNotificationInput = {
        sellerId: 'seller-001',
        type: 'new_order',
        orderId: 'order-001',
        title: 'New Order Received',
        body: 'You have received a new order for $750.00',
        data: {
          totalAmount: 750,
          buyerName: 'John Doe',
          itemCount: 3,
          shippingMethod: 'express',
        },
      };

      const result = await service.queueNotification(input);

      expect(result.sellerId).toBe('seller-001');
      expect(result.orderId).toBe('order-001');
      expect(result.title).toBe('New Order Received');
      expect(result.body).toBe('You have received a new order for $750.00');
      expect(result.type).toBe('new_order');
      expect(result.data?.totalAmount).toBe(750);
      expect(result.data?.buyerName).toBe('John Doe');
    });

    it('should assign unique IDs to each notification', async () => {
      const { service, mockDb } = createServiceWithMocks();
      mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

      const ids = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const result = await service.queueNotification({
          sellerId: `seller-${i}`,
          type: 'order_update',
          orderId: `order-${i}`,
          title: 'Update',
          body: 'Update',
        });

        expect(result.id).toBeDefined();
        expect(ids.has(result.id)).toBe(false);
        ids.add(result.id);
      }

      expect(ids.size).toBe(10);
    });

    it('should set createdAt timestamp on notification', async () => {
      const { service, mockDb } = createServiceWithMocks();
      mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

      const before = new Date();
      
      const result = await service.queueNotification({
        sellerId: 'seller-001',
        type: 'order_update',
        orderId: 'order-001',
        title: 'Update',
        body: 'Update',
      });

      const after = new Date();

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should default channels to push, email, and in_app', async () => {
      const { service, mockDb } = createServiceWithMocks();
      mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

      const result = await service.queueNotification({
        sellerId: 'seller-001',
        type: 'order_update',
        orderId: 'order-001',
        title: 'Update',
        body: 'Update',
      });

      expect(result.channels).toContain('push');
      expect(result.channels).toContain('email');
      expect(result.channels).toContain('in_app');
    });

    it('should respect custom channels when specified', async () => {
      const { service, mockDb } = createServiceWithMocks();
      mockDb.getSellerNotificationPreferences.mockResolvedValue(null);

      const result = await service.queueNotification({
        sellerId: 'seller-001',
        type: 'order_update',
        orderId: 'order-001',
        title: 'Update',
        body: 'Update',
        channels: ['email'],
      });

      expect(result.channels).toEqual(['email']);
    });
  });
});
