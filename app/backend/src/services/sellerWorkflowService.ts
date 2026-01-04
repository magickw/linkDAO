import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { OrderService } from './orderService';
import { ShippingService } from './shippingService';
import { NotificationService } from './notificationService';
import { OrderStatus } from '../models/Order';
import { v4 as uuidv4 } from 'uuid';

export interface SellerDashboardStats {
    pendingCount: number;
    processingCount: number;
    readyToShipCount: number;
    shippedCount: number;
    completedCount: number;
    revenue: string;
}

export class SellerWorkflowService {
    private databaseService: DatabaseService;
    private orderService: OrderService;
    private shippingService: ShippingService;
    private notificationService: NotificationService;

    constructor() {
        this.databaseService = new DatabaseService();
        this.orderService = new OrderService();
        this.shippingService = new ShippingService();
        this.notificationService = new NotificationService();
    }

    /**
     * Get seller order dashboard
     */
    async getOrderDashboard(sellerId: string): Promise<any> {
        try {
            // Fetch all orders for seller (this could be optimized with specific status queries)
            // For now, we reuse existing method and filter/group in memory
            // In production, this should be a direct DB aggregation query

            const user = await this.databaseService.getUserById(sellerId);
            if (!user) throw new Error('Seller not found');

            const orders = await this.orderService.getOrdersByUser(user.walletAddress);
            // We need to filter for seller role
            const sellerOrders = orders.filter(o => o.sellerWalletAddress === sellerId);

            const groupedOrders = {
                new: sellerOrders.filter(o => o.status === OrderStatus.PAID),
                processing: sellerOrders.filter(o => o.status === OrderStatus.PROCESSING),
                readyToShip: sellerOrders.filter(o => o.status === OrderStatus.PROCESSING && o.trackingNumber),
                shipped: sellerOrders.filter(o => o.status === OrderStatus.SHIPPED),
                completed: sellerOrders.filter(o => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.COMPLETED),
                cancelled: sellerOrders.filter(o => o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REFUNDED),
            };

            const stats: SellerDashboardStats = {
                pendingCount: groupedOrders.new.length,
                processingCount: groupedOrders.processing.length,
                readyToShipCount: groupedOrders.readyToShip.length,
                shippedCount: groupedOrders.shipped.length,
                completedCount: groupedOrders.completed.length,
                revenue: '0' // Calculate revenue
            };

            return {
                stats,
                orders: groupedOrders
            };
        } catch (error) {
            safeLogger.error('Error fetching seller dashboard:', error);
            throw error;
        }
    }

    /**
     * Start processing an order
     */
    async startProcessing(orderId: string, sellerId: string): Promise<boolean> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');
            if (order.sellerWalletAddress !== sellerId) throw new Error('Unauthorized');
            if (order.status !== OrderStatus.PAID) throw new Error('Order must be PAID to start processing');

            await this.orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING);

            // Notify buyer
            await this.notificationService.notifyOrderStatusChange(order.buyerWalletAddress, orderId, OrderStatus.PROCESSING);

            return true;
        } catch (error) {
            safeLogger.error('Error starting processing:', error);
            throw error;
        }
    }

    /**
     * Generate shipping label and mark ready to ship
     */
    async markReadyToShip(orderId: string, sellerId: string, packageDetails: any): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');
            if (order.sellerWalletAddress !== sellerId) throw new Error('Unauthorized');

            // 1. Generate Label
            if (!order.shippingAddress) throw new Error('Shipping address missing');

            // 2. Update Order with tracking info
            const labelUrl = `https://mock-carrier.com/label/${uuidv4()}.pdf`;
            const trackingNumber = `TRACK-${uuidv4().substring(0, 8).toUpperCase()}`;

            await this.orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING, {
                labelUrl,
                trackingNumber,
                readyToShip: true
            });

            return { labelUrl, trackingNumber };
        } catch (error) {
            safeLogger.error('Error marking ready to ship:', error);
            throw error;
        }
    }

    /**
     * Generate packing slip data
     */
    async getPackingSlip(orderId: string, sellerId: string): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');
            if (order.sellerWalletAddress !== sellerId) throw new Error('Unauthorized');

            return {
                orderId: order.id,
                date: new Date(),
                buyer: order.shippingAddress,
                items: [
                    { description: 'Item A', quantity: 1 } // Mock
                ],
                sellerId
            };
        } catch (error) {
            safeLogger.error('Error generating packing slip:', error);
            throw error;
        }
    }
}
