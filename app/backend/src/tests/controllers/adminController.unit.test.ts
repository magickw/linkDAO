
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { adminController } from '../../controllers/adminController';
import { adminDashboardService } from '../../services/adminDashboardService';

// Mock dependencies
jest.mock('../../services/adminDashboardService', () => ({
    adminDashboardService: {
        getOrderMetrics: jest.fn(),
        getOrders: jest.fn(),
        getDelayedOrders: jest.fn(),
        getOrderDetails: jest.fn(),
        performAdminAction: jest.fn(),
    },
}));

jest.mock('../../utils/safeLogger', () => ({
    safeLogger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('AdminController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRes = {
            json: jsonMock,
            status: statusMock,
        };
        jest.clearAllMocks();
    });

    describe('getOrderMetrics', () => {
        it('should return metrics successfully', async () => {
            const mockMetrics = { totalOrders: 10, totalRevenue: 1000 };
            (adminDashboardService.getOrderMetrics as jest.Mock).mockResolvedValue(mockMetrics);

            await adminController.getOrderMetrics(mockReq as Request, mockRes as Response);

            expect(adminDashboardService.getOrderMetrics).toHaveBeenCalled();
            expect(jsonMock).toHaveBeenCalledWith(mockMetrics);
        });

        it('should handle errors gracefully', async () => {
            (adminDashboardService.getOrderMetrics as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await adminController.getOrderMetrics(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch admin metrics' });
        });
    });

    describe('getOrders', () => {
        it('should call service with correct filters', async () => {
            mockReq = {
                query: {
                    page: '1',
                    limit: '10',
                    status: 'PAID',
                    minAmount: '100'
                }
            };

            const mockResult = { orders: [], total: 0 };
            (adminDashboardService.getOrders as jest.Mock).mockResolvedValue(mockResult);

            await adminController.getOrders(mockReq as Request, mockRes as Response);

            expect(adminDashboardService.getOrders).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'PAID',
                    minAmount: 100
                }),
                1,
                10
            );
            expect(jsonMock).toHaveBeenCalledWith(mockResult);
        });
    });

    describe('getOrderDetails', () => {
        it('should return order details when found', async () => {
            mockReq = { params: { id: 'order-123' } };
            const mockOrder = { id: 'order-123' };
            (adminDashboardService.getOrderDetails as jest.Mock).mockResolvedValue(mockOrder);

            await adminController.getOrderDetails(mockReq as Request, mockRes as Response);

            expect(adminDashboardService.getOrderDetails).toHaveBeenCalledWith('order-123');
            expect(jsonMock).toHaveBeenCalledWith(mockOrder);
        });

        it('should return 404 when not found', async () => {
            mockReq = { params: { id: 'order-123' } };
            (adminDashboardService.getOrderDetails as jest.Mock).mockResolvedValue(null);

            await adminController.getOrderDetails(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Order not found' });
        });
    });

    describe('performAdminAction', () => {
        it('should perform action successfully', async () => {
            mockReq = {
                params: { id: 'order-123' },
                body: { action: 'cancel', reason: 'Fraud' },
                user: { id: 'admin-1' }
            } as any;

            await adminController.performAdminAction(mockReq as Request, mockRes as Response);

            expect(adminDashboardService.performAdminAction).toHaveBeenCalledWith(
                'order-123',
                'cancel',
                'admin-1',
                'Fraud',
                undefined
            );
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should fail if inputs missing', async () => {
            mockReq = {
                params: { id: 'order-123' },
                body: { action: '' } // Missing reason
            } as any;

            await adminController.performAdminAction(mockReq as Request, mockRes as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(adminDashboardService.performAdminAction).not.toHaveBeenCalled();
        });
    });
});
