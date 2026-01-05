
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { adminDashboardService } from '../../services/adminDashboardService';
import { db } from '../../db';
import { FinancialMonitoringService } from '../../services/financialMonitoringService'; // Moved import to top

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

// Mock FinancialMonitoringService
jest.mock('../../services/financialMonitoringService');

describe('AdminDashboardService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mock for FinancialMonitoringService using 'as any' to avoid TS issues on loose mock
        (FinancialMonitoringService as any).mockImplementation(() => ({
            getFinancialMetrics: jest.fn<any>().mockResolvedValue({
                totalRevenue: '1000',
                escrowBalance: '500',
                disputedFunds: '0',
                platformFees: '25',
                completedPayouts: '975'
            })
        }));
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

            // Chain mock implementation using (db as any)
            (db as any).select
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

            (db as any).select
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
            (db as any).select.mockReturnValueOnce({ from: (jest.fn() as any).mockReturnValue({ where: (jest.fn() as any).mockResolvedValue(mockCount as any) }) });
            // 2. Data query
            (db as any).select.mockReturnValueOnce({
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

    describe('getOrderDetails', () => {
        it('should return order details with timeline and available actions', async () => {
            const mockOrder = { id: 'order-1', status: 'pending' };
            const mockTimeline = [
                { orderId: 'order-1', eventType: 'CREATED', timestamp: new Date() },
                { orderId: 'order-1', eventType: 'ADMIN_ACTION_NOTE', timestamp: new Date() }
            ];

            // 1. Order details
            (db as any).select.mockReturnValueOnce({
                from: (jest.fn() as any).mockReturnValue({
                    where: (jest.fn() as any).mockResolvedValue([mockOrder])
                })
            });
            // 2. Timeline
            (db as any).select.mockReturnValueOnce({
                from: (jest.fn() as any).mockReturnValue({
                    where: (jest.fn() as any).mockReturnValue({
                        orderBy: (jest.fn() as any).mockResolvedValue(mockTimeline)
                    })
                })
            });

            const result = await adminDashboardService.getOrderDetails('order-1');

            expect(result).not.toBeNull();
            expect(result!.id).toBe('order-1');
            expect(result?.availableActions).toContain('cancel');
            expect(result?.auditLog).toHaveLength(1); // One ADMIN_ action
        });
    });

    describe('performAdminAction', () => {
        it('should update order status on cancel', async () => {
            (db as any).insert.mockReturnValue({ values: (jest.fn() as any).mockResolvedValue({}) }); // Log event
            (db as any).update.mockReturnValue({ set: (jest.fn() as any).mockReturnValue({ where: (jest.fn() as any).mockResolvedValue({}) }) }); // Update order

            await adminDashboardService.performAdminAction('order-1', 'cancel', 'admin-1', 'Fraud suspected');

            expect(db.insert).toHaveBeenCalled();
            expect(db.update).toHaveBeenCalled();
        });
    });
});
