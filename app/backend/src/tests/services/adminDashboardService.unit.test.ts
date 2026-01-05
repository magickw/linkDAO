
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { adminDashboardService } from '../../services/adminDashboardService';
import { db } from '../../db';

// Mock DB
jest.mock('../../db', () => ({
    db: {
        select: jest.fn(),
        from: jest.fn(),
        where: jest.fn(),
        limit: jest.fn(),
        offset: jest.fn(),
        orderBy: jest.fn(),
        groupBy: jest.fn(),
        execute: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
    }
}));

describe('AdminDashboardService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getOrderMetrics', () => {
        it('should calculate metrics correctly', async () => {
            // Mock totals
            const mockTotals = [{ count: 100, revenue: 5000 }];

            // Mock status counts
            const mockStatus = [
                { status: 'DELIVERED', count: 80 },
                { status: 'DISPUTED', count: 5 },
                { status: 'CREATED', count: 15 }
            ];

            // Mock delivery time
            const mockDeliveryTime = [{ avgTime: 7200 }]; // 2 hours

            // Chain mock implementation
            (db.select as any)
                .mockReturnValueOnce({ from: (jest.fn() as any).mockResolvedValue(mockTotals) }) // 1. totals
                .mockReturnValueOnce({ from: (jest.fn() as any).mockReturnValue({ groupBy: (jest.fn() as any).mockResolvedValue(mockStatus) }) }) // 2. byStatus
                .mockReturnValueOnce({ from: (jest.fn() as any).mockReturnValue({ where: (jest.fn() as any).mockResolvedValue(mockDeliveryTime) }) }); // 4. deliveryTimes

            const metrics = await adminDashboardService.getOrderMetrics();

            expect(metrics.totalOrders).toBe(100);
            expect(metrics.totalRevenue).toBe(5000);
            expect(metrics.ordersByStatus['DELIVERED']).toBe(80);
            expect(metrics.disputeRate).toBe(5); // 5 / 100 * 100
            expect(metrics.averageFulfillmentTimeHours).toBe(2);
        });

        it('should handle zero orders', async () => {
            const mockTotals = [{ count: 0, revenue: 0 }];
            const mockStatus: any[] = [];
            const mockDeliveryTime: any[] = [];

            (db.select as any)
                .mockReturnValueOnce({ from: (jest.fn() as any).mockResolvedValue(mockTotals as any) })
                .mockReturnValueOnce({ from: (jest.fn() as any).mockReturnValue({ groupBy: (jest.fn() as any).mockResolvedValue(mockStatus as any) }) })
                .mockReturnValueOnce({ from: (jest.fn() as any).mockReturnValue({ where: (jest.fn() as any).mockResolvedValue(mockDeliveryTime as any) }) });

            const metrics = await adminDashboardService.getOrderMetrics();

            expect(metrics.totalOrders).toBe(0);
            expect(metrics.disputeRate).toBe(0);
        });
    });

    describe('getDelayedOrders', () => {
        it('should return delayed orders', async () => {
            const mockOrders = [
                { id: '1', status: 'SHIPPED', estimatedDeliveryMax: new Date(Date.now() - 86400000) } // Late
            ];
            const mockCount = [{ count: 1 }];

            // Chain mock implementation
            // 1. Count query
            (db.select as any).mockReturnValueOnce({ from: (jest.fn() as any).mockReturnValue({ where: (jest.fn() as any).mockResolvedValue(mockCount as any) }) });
            // 2. Data query
            (db.select as any).mockReturnValueOnce({
                from: (jest.fn() as any).mockReturnValue({
                    where: (jest.fn() as any).mockReturnValue({
                        limit: (jest.fn() as any).mockReturnValue({
                            offset: (jest.fn() as any).mockReturnValue({
                                orderBy: (jest.fn() as any).mockResolvedValue(mockOrders as any)
                            })
                        })
                    })
                })
            });

            const result = await adminDashboardService.getDelayedOrders(1, 10);

            expect(result.total).toBe(1);
            expect(result.orders).toHaveLength(1);
            expect(result.orders[0].id).toBe('1');
        });
    });
});
