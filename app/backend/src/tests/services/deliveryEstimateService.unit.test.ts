
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { DeliveryEstimateService } from '../../services/deliveryEstimateService';
import { db } from '../../db';
import { orders } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Mock dependencies
jest.mock('../../db', () => ({
    db: {
        select: jest.fn(),
        update: jest.fn(),
    }
}));

jest.mock('../../services/notificationService');
jest.mock('../../utils/safeLogger', () => ({
    safeLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }
}));

describe('DeliveryEstimateService', () => {
    let service: DeliveryEstimateService;
    let mockNotificationService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DeliveryEstimateService();
        mockNotificationService = (service as any).notificationService;
    });

    describe('calculateInitialEstimate', () => {
        it('should calculate estimates for Express shipping', async () => {
            const result = await service.calculateInitialEstimate('seller-1', 'FedEx Express', '10001');

            expect(result).toBeDefined();
            // 2 handling + 1 transit min = 3 days
            // 2 handling + 3 transit max = 5 days
            const now = new Date();
            const minDiff = Math.round((result.minDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            const maxDiff = Math.round((result.maxDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

            expect(minDiff).toBeGreaterThanOrEqual(3);
            expect(maxDiff).toBeGreaterThanOrEqual(5);
        });

        it('should calculate estimates for Standard shipping', async () => {
            const result = await service.calculateInitialEstimate('seller-1', 'UPS Ground', '10001');

            // 2 handling + 3 transit min = 5 days
            // 2 handling + 7 transit max = 9 days
            const now = new Date();
            const minDiff = Math.round((result.minDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            const maxDiff = Math.round((result.maxDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

            expect(minDiff).toBeGreaterThanOrEqual(5);
            expect(maxDiff).toBeGreaterThanOrEqual(9);
        });
    });

    describe('updateEstimateFromCarrier', () => {
        it('should update DB with new estimate', async () => {
            const mockUpdate = {
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue({})
            };
            (db.update as jest.Mock).mockReturnValue(mockUpdate);

            // Mock checkSignificantChange query
            (db.select as jest.Mock).mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ estimatedDelivery: new Date() }])
            });

            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 5);

            await service.updateEstimateFromCarrier('order-1', {
                estimatedDelivery: newDate.toISOString(),
                status: 'IN_TRANSIT'
            });

            expect(db.update).toHaveBeenCalledWith(orders);
            expect(mockUpdate.set).toHaveBeenCalledWith(expect.objectContaining({
                estimatedDeliveryMin: expect.any(Date),
                estimatedDeliveryMax: expect.any(Date)
            }));
        });

        it('should notify for imminent delivery', async () => {
            (db.select as jest.Mock).mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ buyerId: 'buyer-1' }])
            });

            await service.updateEstimateFromCarrier('order-1', {
                status: 'OUT_FOR_DELIVERY'
            });

            expect(mockNotificationService.enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'buyer-1',
                title: 'Out for Delivery'
            }));
        });
    });

    describe('recalculateOnDelay', () => {
        it('should update estimate and notify buyer', async () => {
            // Mock existing order
            const currentMax = new Date();
            (db.select as jest.Mock).mockReturnValue({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{
                    estimatedDeliveryMax: currentMax,
                    estimatedDeliveryMin: currentMax,
                    buyerId: 'buyer-1'
                }])
            });

            const mockUpdate = {
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue({})
            };
            (db.update as jest.Mock).mockReturnValue(mockUpdate);

            await service.recalculateOnDelay('order-1', 'Weather Delay');

            expect(db.update).toHaveBeenCalled();
            expect(mockNotificationService.enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'buyer-1',
                title: 'Delivery Delayed'
            }));
        });
    });
});
