
import { describe, expect, it, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { db } from '../../db';
import { orders, users } from '../../db/schema';
import { DeliveryEstimateService } from '../../services/deliveryEstimateService';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { OrderStatus } from '../../models/Order';

// We want real DB but mocked NotificationService to avoid spamming/errors
// But we want to verify notification calls...
// Easier to spy on NotificationService prototype if we import it.
// Or just let it run if it doesn't really send emails in test env.
// For integration, let's mock the NotificationService within DeliveryEstimateService instance if possible,
// or just verify DB state changes.

describe('Delivery Estimate Integration', () => {
    let service: DeliveryEstimateService;
    let sellerId: string;
    let buyerId: string;
    let testOrderId: string;

    beforeAll(async () => {
        service = new DeliveryEstimateService();

        // Create Users
        sellerId = uuidv4();
        await db.insert(users).values({
            id: sellerId,
            walletAddress: `0xseller${Date.now()}`,
            handle: `est_seller_${Date.now()}`
        });

        buyerId = uuidv4();
        await db.insert(users).values({
            id: buyerId,
            walletAddress: `0xbuyer${Date.now()}`,
            handle: `est_buyer_${Date.now()}`
        });
    });

    beforeEach(async () => {
        testOrderId = uuidv4();
        await db.insert(orders).values({
            id: testOrderId,
            buyerId,
            sellerId,
            buyerAddress: `0xbuyer${Date.now()}`,
            amount: '100',
            status: OrderStatus.SHIPPED,
            estimatedDelivery: new Date(),
            createdAt: new Date()
        });
    });

    afterAll(async () => {
        if (sellerId) await db.delete(users).where(eq(users.id, sellerId));
        if (buyerId) await db.delete(users).where(eq(users.id, buyerId));
    });

    it('should calculate and persist initial estimate', async () => {
        const estimates = await service.calculateInitialEstimate(sellerId, 'UPS Ground', {});

        expect(estimates.minDate).toBeInstanceOf(Date);
        expect(estimates.maxDate).toBeInstanceOf(Date);
        expect(estimates.maxDate.getTime()).toBeGreaterThan(estimates.minDate.getTime());
    });

    it('should update estimate in database from carrier info', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        await service.updateEstimateFromCarrier(testOrderId, {
            estimatedDelivery: futureDate.toISOString(),
            status: 'IN_TRANSIT'
        });

        const updatedOrder = await db.select().from(orders).where(eq(orders.id, testOrderId)).then(res => res[0]);
        // Allow small time diff (DB precision)
        expect(new Date(updatedOrder.estimatedDeliveryMax!).getTime()).toBeCloseTo(futureDate.getTime(), -3);
    });

    it('should recalculate on delay', async () => {
        // Set initial
        const initialDate = new Date();
        await db.update(orders).set({ estimatedDeliveryMax: initialDate }).where(eq(orders.id, testOrderId));

        // Delay
        await service.recalculateOnDelay(testOrderId, 'Storm');

        const updatedOrder = await db.select().from(orders).where(eq(orders.id, testOrderId)).then(res => res[0]);

        const expectedDate = new Date(initialDate);
        expectedDate.setDate(expectedDate.getDate() + 3);

        expect(new Date(updatedOrder.estimatedDeliveryMax!).getDate()).toBe(expectedDate.getDate());
    });
});
