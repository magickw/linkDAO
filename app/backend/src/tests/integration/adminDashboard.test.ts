
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { adminDashboardService } from '../../services/adminDashboardService';
import { db } from '../../db';
import { orders, orderEvents } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// We assume a real DB connection or an in-memory test DB is configured in the environment
// If not, these tests might fail or need mocking like the unit tests.
// For this integration test, we will try to insert real data.

describe('AdminDashboardService Integration', () => {
    let orderId: string;
    const sellerId = uuidv4();
    const buyerId = uuidv4();

    beforeEach(async () => {
        // Clean up or setup
        orderId = uuidv4();
        await db.insert(orders).values({
            id: orderId,
            listingId: uuidv4(),
            buyerId: buyerId,
            buyerAddress: '0xBuyer',
            sellerId: sellerId,
            sellerAddress: '0xSeller',
            amount: '100',
            totalAmount: 100,
            currency: 'USDC',
            paymentToken: 'USDC',
            status: 'PAID',
            createdAt: new Date(),
            updatedAt: new Date()
        } as any);
    });

    afterEach(async () => {
        await db.delete(orders).where(eq(orders.id, orderId));
        await db.delete(orderEvents).where(eq(orderEvents.orderId, orderId));
    });

    it('getOrders Should filter by status', async () => {
        const result = await adminDashboardService.getOrders({ status: 'PAID' }, 1, 10);
        const order = result.orders.find(o => o.id === orderId);
        expect(order).toBeDefined();
        expect(order?.status).toBe('PAID');
    });

    it('performAdminAction Should update status and log event', async () => {
        await adminDashboardService.performAdminAction(orderId, 'override_status', 'admin1', 'Manual override', { newStatus: 'SHIPPED' });

        const updatedOrder = await db.select().from(orders).where(eq(orders.id, orderId)).then(r => r[0]);
        expect(updatedOrder.status).toBe('SHIPPED');

        const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId));
        const adminEvent = events.find(e => e.eventType === 'ADMIN_ACTION_OVERRIDE_STATUS');
        expect(adminEvent).toBeDefined();
    });
});
