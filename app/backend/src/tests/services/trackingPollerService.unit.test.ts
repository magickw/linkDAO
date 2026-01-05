
import { TrackingPollerService } from '../../services/trackingPollerService';
import { ShippingService } from '../../services/shippingService';
import { OrderTimelineService } from '../../services/orderTimelineService';
import { NotificationService } from '../../services/notificationService';
import { OrderService } from '../../services/orderService';
import { db } from '../../db';

// Mock dependencies
jest.mock('../../services/shippingService');
jest.mock('../../services/orderTimelineService');
jest.mock('../../services/notificationService');
jest.mock('../../services/orderService');
jest.mock('../../db', () => ({
    db: {
        select: jest.fn(),
        update: jest.fn(),
    }
}));
jest.mock('../../utils/safeLogger', () => ({
    safeLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }
}));

describe('TrackingPollerService', () => {
    let service: TrackingPollerService;
    let mockShippingService: jest.Mocked<ShippingService>;
    let mockOrderTimelineService: jest.Mocked<OrderTimelineService>;
    let mockNotificationService: jest.Mocked<NotificationService>;
    let mockOrderService: jest.Mocked<OrderService>;

    beforeEach(() => {
        // Clear mocks
        jest.clearAllMocks();

        // Initialize service
        service = new TrackingPollerService();

        // Access mocked instances
        mockShippingService = (service as any).shippingService;
        mockOrderTimelineService = (service as any).orderTimelineService;
        mockNotificationService = (service as any).notificationService;
        mockOrderService = (service as any).orderService;
    });

    it('should start and stop the cron job', () => {
        // Mock cron.schedule
        const mockStop = jest.fn();
        const cron = require('node-cron');
        jest.spyOn(cron, 'schedule').mockReturnValue({ stop: mockStop });

        service.start();
        expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));

        service.stop();
        expect(mockStop).toHaveBeenCalled();
    });

    // Note: Testing private method processTrackingUpdates requires casting to any or exporting it for testing
    // We will assume we can access it via cast for this unit test

    it('should process active tracking records', async () => {
        // Mock DB response
        const mockRecords = [
            { id: 1, orderId: 'order-1', trackingNumber: 'TRACK123', carrier: 'FEDEX', status: 'IN_TRANSIT' }
        ];

        const mockDbSelect = {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(mockRecords)
        };
        (db.select as jest.Mock).mockReturnValue(mockDbSelect);

        // Mock Shipping Service response
        const mockTrackingInfo = {
            status: 'OUT_FOR_DELIVERY',
            trackingNumber: 'TRACK123',
            carrier: 'FEDEX',
            events: []
        };
        mockShippingService.trackShipment.mockResolvedValue(mockTrackingInfo as any);

        // Mock DB Update
        const mockDbUpdate = {
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue({})
        };
        (db.update as jest.Mock).mockReturnValue(mockDbUpdate);

        // Run processTrackingUpdates
        await (service as any).processTrackingUpdates();

        // Verify flow
        expect(mockShippingService.trackShipment).toHaveBeenCalledWith('TRACK123', 'FEDEX');
        expect(db.update).toHaveBeenCalled();
        expect(mockOrderTimelineService.syncCarrierTracking).toHaveBeenCalledWith('order-1', mockTrackingInfo);
    });

    it('should handle delivery updates', async () => {
        // Mock Active Record
        const mockRecords = [
            { id: 1, orderId: 'order-1', trackingNumber: 'TRACK123', carrier: 'FEDEX', status: 'IN_TRANSIT' }
        ];

        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(mockRecords)
        });

        // Mock Delivery Info
        const mockTrackingInfo = {
            status: 'DELIVERED', // Changed status
            trackingNumber: 'TRACK123',
            carrier: 'FEDEX',
            events: []
        };
        mockShippingService.trackShipment.mockResolvedValue(mockTrackingInfo as any);

        (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue({})
        });

        // Mock Order Service
        mockOrderService.getOrderById.mockResolvedValue({
            id: 'order-1',
            buyerWalletAddress: '0xbuyer',
            sellerWalletAddress: '0xseller'
        } as any);

        // Run
        await (service as any).processTrackingUpdates();

        // Verify Delivery Handling
        expect(mockOrderService.updateOrderStatus).toHaveBeenCalledWith('order-1', 'delivered');
        expect(mockNotificationService.notifyOrderStatusChange).toHaveBeenCalledWith('0xbuyer', 'order-1', 'delivered');
    });

    it('should handle exceptions', async () => {
        // Mock Active Record
        const mockRecords = [
            { id: 1, orderId: 'order-1', trackingNumber: 'TRACK123', carrier: 'FEDEX', status: 'IN_TRANSIT' }
        ];

        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(mockRecords)
        });

        // Mock Exception Info
        const mockTrackingInfo = {
            status: 'EXCEPTION',
            trackingNumber: 'TRACK123',
            carrier: 'FEDEX',
            events: []
        };
        mockShippingService.trackShipment.mockResolvedValue(mockTrackingInfo as any);

        (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue({})
        });

        mockOrderService.getOrderById.mockResolvedValue({
            id: 'order-1',
            sellerId: 'seller-id',
        } as any);

        // Run
        await (service as any).processTrackingUpdates();

        // Verify Exception Handling
        expect(mockNotificationService.enqueueNotification).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'seller-id',
            type: 'ORDER_UPDATE',
            title: 'Delivery Exception' // Matching string in implementation
        }));
    });
});
