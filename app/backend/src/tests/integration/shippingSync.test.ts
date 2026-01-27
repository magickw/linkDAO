
import { describe, expect, it, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { db } from '../../db';
import { trackingRecords, orders, users, tracking_records } from '../../db/schema';
import { TrackingPollerService } from '../../services/trackingPollerService';
import { ShippingService } from '../../services/marketplace/shippingService';
import { OrderTimelineService } from '../../services/marketplace/orderTimelineService';
import { OrderService } from '../../services/marketplace/orderService';
import { OrderStatus } from '../../models/Order';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

// Mock Carrier APIs in ShippingService but keep DB logic real
jest.mock('../../services/marketplace/shippingService', () => {
  return {
    ShippingService: jest.fn().mockImplementation(() => {
      return {
        createShipment: jest.fn(),
        trackShipment: jest.fn(),
        getShippingRates: jest.fn(),
        validateAddress: jest.fn(),
        startDeliveryTracking: jest.fn()
      };
    })
  };
});

// Use the mock instead of requireActual if possible, or update path
// const originalModule = jest.requireActual('../../services/marketplace/shippingService') as any;

describe('Shipping & Tracking Integration', () => {
    let poller: TrackingPollerService;
    let orderService: OrderService;
    let testOrderId: string;
    let sellerId: string;
    let buyerId: string;

    beforeAll(async () => {
        poller = new TrackingPollerService();
        orderService = new OrderService();

        // Create Test Users
        sellerId = uuidv4();
        await db.insert(users).values({
            id: sellerId,
            walletAddress: `0xseller${Date.now()}`,
            handle: `test_seller_${Date.now()}`
        });

        buyerId = uuidv4();
        await db.insert(users).values({
            id: buyerId,
            walletAddress: `0xbuyer${Date.now()}`,
            handle: `test_buyer_${Date.now()}`
        });
    });

    beforeEach(async () => {
        // Create a fresh order for each test
        testOrderId = uuidv4();
        await db.insert(orders).values({
            id: testOrderId,
            buyerId,
            sellerId,
            buyerWalletAddress: `0xbuyer${Date.now()}`, // Using mock wallet for this record
            sellerWalletAddress: `0xseller${Date.now()}`,
            totalAmount: '100',
            currency: 'USDC',
            status: OrderStatus.SHIPPED,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    });

    afterAll(async () => {
        // Cleanup Users (Cascades)
        if (sellerId) await db.delete(users).where(eq(users.id, sellerId));
        if (buyerId) await db.delete(users).where(eq(users.id, buyerId));
    });

    it('should poll active tracking records and update status to DELIVERED', async () => {
        // 1. Create a tracking record in SHIPPED/IN_TRANSIT state
        await db.insert(trackingRecords).values({
            orderId: testOrderId,
            trackingNumber: 'DELIVERED123',
            carrier: 'FEDEX',
            status: 'IN_TRANSIT',
            lastUpdated: new Date(Date.now() - 7200000) // 2 hours ago
        });

        // 2. Run the poller (force execution)
        // We access private method by casting or just calling start/stop if we can't await it.
        // Ideally we should test the public API or expose a way to run once. 
        // For testability, let's assume we can trigger the logic.
        // Since `processTrackingUpdates` is private, we access it via `any` cast.
        await (poller as any).processTrackingUpdates();

        // 3. Verify Tracking Record Updated
        const updatedTracking = await db.select().from(trackingRecords).where(eq(trackingRecords.orderId, testOrderId)).then(res => res[0]);
        expect(updatedTracking.status).toBe('DELIVERED');

        // 4. Verify Order Status Updated
        const updatedOrder = await orderService.getOrderById(testOrderId);
        expect(updatedOrder?.status).toBe(OrderStatus.DELIVERED);
    });

    it('should sync carrier updates without changing order status if not delivered', async () => {
        // 1. Create a tracking record
        await db.insert(trackingRecords).values({
            orderId: testOrderId,
            trackingNumber: 'TRANSIT123',
            carrier: 'FEDEX',
            status: 'LABEL_CREATED',
            lastUpdated: new Date(Date.now() - 7200000)
        });

        // 2. Run Poller
        await (poller as any).processTrackingUpdates();

        // 3. Verify Tracking Record Updated
        const updatedTracking = await db.select().from(trackingRecords).where(eq(trackingRecords.orderId, testOrderId)).then(res => res[0]);
        expect(updatedTracking.status).toBe('IN_TRANSIT');

        // 4. Verify Order Status UNCHANGED
        const updatedOrder = await orderService.getOrderById(testOrderId);
        expect(updatedOrder?.status).toBe(OrderStatus.SHIPPED);
    });
});
