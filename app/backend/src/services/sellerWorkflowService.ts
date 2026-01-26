import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { OrderService } from './orderService';
import { ShippingService } from './shippingService';
import { NotificationService } from './notificationService';
import { OrderStatus } from '../models/Order';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError, UnauthorizedError } from '../middleware/errorHandler';

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
     * Helper to format shipping address from raw DB row
     */
    private formatShippingAddress(dbOrder: any): any {
        if (!dbOrder.shippingStreet && !dbOrder.shippingCity) return null;

        return {
            name: dbOrder.shippingName || '',
            street: dbOrder.shippingStreet || '',
            city: dbOrder.shippingCity || '',
            state: dbOrder.shippingState || '',
            postalCode: dbOrder.shippingPostalCode || '',
            country: dbOrder.shippingCountry || '',
            phone: dbOrder.shippingPhone || ''
        };
    }

    /**
     * Get seller order dashboard
     */
    async getOrderDashboard(sellerId: string): Promise<any> {
        try {
            safeLogger.info('[SellerWorkflowService] getOrderDashboard called', { sellerId });
            // Fetch all orders for seller (this could be optimized with specific status queries)
            // For now, we reuse existing method and filter/group in memory
            // In production, this should be a direct DB aggregation query

            const user = await this.databaseService.getUserById(sellerId);
            if (!user) {
                safeLogger.error('[SellerWorkflowService] Seller not found', { sellerId });
                throw new Error('Seller not found');
            }

            safeLogger.info('[SellerWorkflowService] User found', {
                userId: user.id,
                walletAddress: user.walletAddress
            });

            // Pass 'seller' role to only fetch orders where user is the seller
            // Use getOrdersByUserId to fetch directly by UUID, avoiding wallet address casing issues
            const sellerOrders = await this.orderService.getOrdersByUserId(user.id, 'seller');

            safeLogger.info('[SellerWorkflowService] Seller orders retrieved', {
                count: sellerOrders.length,
                userId: user.id,
                userAddress: user.walletAddress
            });

            // Transform orders to match SellerOrder frontend interface
            const transformOrder = (order: any) => {
                // Determine if order contains only digital goods (no physical items)
                const hasPhysicalItems = order.items?.some((item: any) => item.isPhysical === true)
                    || order.product?.isPhysical === true;

                // Determine if this is a service order
                const isServiceOrder = order.isServiceOrder === true
                    || order.items?.some((item: any) => item.isService === true)
                    || order.product?.isService === true;

                return {
                    id: order.id,
                    items: (order.items || []).map((item: any) => ({
                        listingId: item.productId || item.id,
                        title: item.productName || item.title || 'Unknown Product',
                        quantity: item.quantity || 1,
                        price: item.price || item.total || 0,
                        image: item.productImage || item.image,
                        isPhysical: item.isPhysical ?? false,
                        isService: item.isService ?? false,
                        serviceType: item.serviceType
                    })),
                    buyerAddress: order.buyerWalletAddress,
                    buyerName: order.buyerName,
                    totalAmount: parseFloat(order.amount) || order.total || 0,
                    currency: order.currency || order.paymentToken || 'USDC',
                    status: (order.status || 'pending').toLowerCase(),
                    escrowStatus: order.escrowId ? 'locked' : 'none',
                    paymentMethod: order.paymentToken ? 'crypto' : 'fiat',
                    shippingAddress: order.shippingAddress ? {
                        name: order.shippingAddress.name || '',
                        address: order.shippingAddress.street || order.shippingAddress.address || '',
                        city: order.shippingAddress.city || '',
                        state: order.shippingAddress.state || '',
                        zipCode: order.shippingAddress.postalCode || order.shippingAddress.zipCode || '',
                        country: order.shippingAddress.country || ''
                    } : undefined,
                    trackingNumber: order.trackingNumber,
                    estimatedDelivery: order.estimatedDelivery,
                    notes: order.notes,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    isPhysical: hasPhysicalItems,
                    requiresShipping: hasPhysicalItems,
                    // Service-specific fields
                    isService: isServiceOrder,
                    serviceStatus: order.serviceStatus || 'pending',
                    serviceSchedule: order.serviceSchedule,
                    serviceDeliverables: order.serviceDeliverables || [],
                    serviceCompletedAt: order.serviceCompletedAt,
                    buyerConfirmedAt: order.buyerConfirmedAt,
                    serviceNotes: order.serviceNotes,
                    serviceType: order.product?.serviceType || order.items?.[0]?.serviceType,
                    // Financial details
                    taxAmount: parseFloat(order.taxAmount || '0'),
                    shippingCost: parseFloat(order.shippingCost || '0'),
                    platformFee: parseFloat(order.platformFee || '0'),
                    taxBreakdown: order.taxBreakdown || [],
                    netRevenue: (parseFloat(order.amount) || parseFloat(order.total) || 0) - (parseFloat(order.platformFee || '0'))
                };
            };

            const transformedOrders = sellerOrders.map(transformOrder);

            const groupedOrders = {
                // Include 'paid', 'pending', 'payment_pending', and 'created' in the "New" tab
                // This ensures newly created orders that require seller attention are visible
                new: transformedOrders.filter(o =>
                    o.status === OrderStatus.PAID.toLowerCase() ||
                    o.status === 'pending' ||
                    o.status === OrderStatus.PAYMENT_PENDING.toLowerCase() ||
                    o.status === OrderStatus.CREATED.toLowerCase()
                ),
                processing: transformedOrders.filter(o => o.status === OrderStatus.PROCESSING.toLowerCase() && !o.trackingNumber),
                readyToShip: transformedOrders.filter(o => o.status === OrderStatus.PROCESSING.toLowerCase() && o.trackingNumber),
                shipped: transformedOrders.filter(o => o.status === OrderStatus.SHIPPED.toLowerCase()),
                completed: transformedOrders.filter(o => o.status === OrderStatus.DELIVERED.toLowerCase() || o.status === OrderStatus.COMPLETED.toLowerCase()),
                cancelled: transformedOrders.filter(o => o.status === OrderStatus.CANCELLED.toLowerCase() || o.status === OrderStatus.REFUNDED.toLowerCase() || o.status === OrderStatus.CANCELLATION_REQUESTED.toLowerCase()),
            };

            // Calculate total revenue from completed orders
            const totalRevenue = [...groupedOrders.completed, ...groupedOrders.shipped]
                .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

            const stats: SellerDashboardStats = {
                pendingCount: groupedOrders.new.length,
                processingCount: groupedOrders.processing.length + groupedOrders.readyToShip.length,
                readyToShipCount: groupedOrders.readyToShip.length,
                shippedCount: groupedOrders.shipped.length,
                completedCount: groupedOrders.completed.length,
                revenue: totalRevenue.toFixed(2)
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
            // order.sellerId might be the userId, or we compare wallet addresses. 
            // In getOrderDashboard we compared sellerWalletAddress. 
            // Let's assume input sellerId is walletAddress or mapped ID. context implies wallet address usually.
            // But getOrderById returns DB object. 
            // Safe check: if we assume sellerId passed here is the User ID (UUID), we should compare against order.sellerId 
            // OR if it's wallet, compare against sellerWalletAddress.
            // Authentication middleware usually gives us user ID (UUID).

            // Let's rely on standard check. The getOrderDashboard uses logic: orders.filter(o => o.sellerWalletAddress === sellerId)
            // But controller passes (req.user.id). This suggests sellerId is UUID.
            // So we should fix getOrderDashboard to compare sellerId (UUID) if possible, or mapping is happening elsewhere.
            // OrderService logic: keys are sellerId (UUID) and sellerWalletAddress.

            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Normalize status comparison to handle case differences
            const normalizedStatus = (order.status || '').toUpperCase();
            if (normalizedStatus !== OrderStatus.PAID) throw new Error('Order must be PAID to start processing');

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

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Check shipping address using helper (raw DB row has individual columns)
            const shippingAddress = this.formatShippingAddress(order);
            if (!shippingAddress) {
                safeLogger.warn(`Order ${orderId} has no shipping address. Skipping shipping check for digital goods or pickup.`);
            }

            // Generate Label (Mock for now)
            const labelUrl = `https://mock-carrier.com/label/${uuidv4()}.pdf`;
            const trackingNumber = `TRACK-${uuidv4().substring(0, 8).toUpperCase()}`;

            // Update with metadata - keep as PROCESSING but add readyToShip flag
            await this.orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING, {
                labelUrl,
                trackingNumber,
                carrier: packageDetails?.carrier || 'Generic',
                readyToShip: true
            });

            return { labelUrl, trackingNumber };
        } catch (error) {
            safeLogger.error('Error marking ready to ship:', error);
            throw error;
        }
    }

    /**
     * Helper to duplicate tracking validation logic
     */
    private validateTrackingNumber(trackingNumber: string, carrier: string): boolean {
        // Simple regex checks per carrier
        // DHL: 10 digits
        // FedEx: 12 or 15 digits
        // UPS: 1Z... (18 chars)
        // USPS: 20-22 digits

        if (!trackingNumber) return false;
        const cleanTrack = trackingNumber.replace(/\s/g, '');

        switch (carrier.toUpperCase()) {
            case 'DHL':
                return /^\d{10,11}$/.test(cleanTrack);
            case 'FEDEX':
                return /^\d{12,15}$/.test(cleanTrack);
            case 'UPS':
                return /^1Z[A-Z0-9]{16}$/i.test(cleanTrack);
            case 'USPS':
                return /^\d{20,22}$/.test(cleanTrack);
            default:
                // Allow generic for others
                return cleanTrack.length > 5;
        }
    }

    /**
     * Confirm shipment
     */
    async confirmShipment(orderId: string, sellerId: string, trackingNumber: string, carrier: string): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Validate tracking
            if (!this.validateTrackingNumber(trackingNumber, carrier)) {
                throw new Error(`Invalid tracking number format for carrier ${carrier}`);
            }

            // Update status to SHIPPED
            await this.orderService.updateOrderStatus(orderId, OrderStatus.SHIPPED, {
                trackingNumber,
                carrier,
                shippedAt: new Date()
            });

            // Start delivery monitoring
            await this.shippingService.startDeliveryTracking(orderId, trackingNumber, carrier);

            // Notify buyer
            await this.notificationService.notifyOrderStatusChange(order.buyerWalletAddress, orderId, OrderStatus.SHIPPED);

            return { success: true };
        } catch (error) {
            safeLogger.error('Error confirming shipment:', error);
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

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Format shipping address from raw DB columns
            const shippingAddress = this.formatShippingAddress(order);

            // Try to get product info for items
            let items = [];
            try {
                if (order.listingId) {
                    const product = await this.databaseService.getProductById(order.listingId);
                    if (product) {
                        items = [{
                            description: product.title || 'Product',
                            quantity: order.quantity || 1,
                            price: parseFloat(order.amount) || 0
                        }];
                    }
                }
            } catch (err) {
                safeLogger.warn(`Could not fetch product for packing slip: ${err}`);
            }

            // Fallback if no items found
            if (items.length === 0) {
                items = [{
                    description: 'Order Item',
                    quantity: order.quantity || 1,
                    price: parseFloat(order.amount) || 0
                }];
            }

            return {
                orderId: order.id,
                orderNumber: order.id.toString().slice(0, 8).toUpperCase(),
                date: order.createdAt || new Date(),
                buyerAddress: shippingAddress,
                items,
                totalAmount: parseFloat(order.amount) || 0,
                currency: order.paymentToken || 'USD',
                sellerId,
                notes: order.notes || ''
            };
        } catch (error) {
            safeLogger.error('Error generating packing slip:', error);
            throw error;
        }
    }

    /**
     * Bulk print packing slips for multiple orders
     */
    async bulkPrintPackingSlips(orderIds: string[], sellerId: string): Promise<{
        successful: string[];
        failed: Array<{ orderId: string; error: string }>;
        packingSlips: any[];
    }> {
        try {
            const successful: string[] = [];
            const failed: Array<{ orderId: string; error: string }> = [];
            const packingSlips: any[] = [];

            for (const orderId of orderIds) {
                try {
                    const packingSlip = await this.getPackingSlip(orderId, sellerId);
                    packingSlips.push(packingSlip);
                    successful.push(orderId);
                } catch (error) {
                    failed.push({
                        orderId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            safeLogger.info(`Bulk print packing slips: ${successful.length} successful, ${failed.length} failed`);

            return {
                successful,
                failed,
                packingSlips
            };
        } catch (error) {
            safeLogger.error('Error in bulk print packing slips:', error);
            throw error;
        }
    }

    /**
     * Bulk print shipping labels for multiple orders
     */
    async bulkPrintShippingLabels(orderIds: string[], sellerId: string): Promise<{
        successful: string[];
        failed: Array<{ orderId: string; error: string }>;
        labels: any[];
    }> {
        try {
            const successful: string[] = [];
            const failed: Array<{ orderId: string; error: string }> = [];
            const labels: any[] = [];

            for (const orderId of orderIds) {
                try {
                    const order = await this.databaseService.getOrderById(orderId);
                    if (!order) {
                        failed.push({ orderId, error: 'Order not found' });
                        continue;
                    }

                    const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
                    if (!isSeller) {
                        failed.push({ orderId, error: 'Unauthorized' });
                        continue;
                    }

                    // Generate shipping label (mocked for now)
                    const label = {
                        orderId,
                        labelUrl: `https://shipping-provider.com/label/${orderId}`,
                        trackingNumber: order.trackingNumber || `TRACK-${Date.now()}`,
                        carrier: order.shippingMethod || 'USPS',
                        generatedAt: new Date().toISOString()
                    };

                    labels.push(label);
                    successful.push(orderId);
                } catch (error) {
                    failed.push({
                        orderId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            safeLogger.info(`Bulk print shipping labels: ${successful.length} successful, ${failed.length} failed`);

            return {
                successful,
                failed,
                labels
            };
        } catch (error) {
            safeLogger.error('Error in bulk print shipping labels:', error);
            throw error;
        }
    }

    /**
     * Bulk ship multiple orders
     */
    async bulkShipOrders(
        orders: Array<{ orderId: string; trackingNumber: string; carrier?: string }>,
        sellerId: string
    ): Promise<{
        successful: string[];
        failed: Array<{ orderId: string; error: string }>;
    }> {
        try {
            const successful: string[] = [];
            const failed: Array<{ orderId: string; error: string }> = [];

            for (const orderData of orders) {
                try {
                    await this.confirmShipment(
                        orderData.orderId,
                        sellerId,
                        orderData.trackingNumber,
                        orderData.carrier
                    );
                    successful.push(orderData.orderId);
                } catch (error) {
                    failed.push({
                        orderId: orderData.orderId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            safeLogger.info(`Bulk ship orders: ${successful.length} successful, ${failed.length} failed`);

            return {
                successful,
                failed
            };
        } catch (error) {
            safeLogger.error('Error in bulk ship orders:', error);
            throw error;
        }
    }

    // ==================== SERVICE DELIVERY METHODS ====================

    /**
     * Schedule a service delivery
     */
    async scheduleService(
        orderId: string,
        sellerId: string,
        schedule: { date: string; time: string; timezone: string; notes?: string }
    ): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Validate order status - can schedule from PAID or PROCESSING status
            // Normalize status comparison to handle case differences
            const normalizedStatus = (order.status || '').toUpperCase();
            if (normalizedStatus !== OrderStatus.PAID && normalizedStatus !== OrderStatus.PROCESSING) {
                throw new Error(`Cannot schedule service for order with status: ${order.status}`);
            }

            // Update order with schedule information
            await this.databaseService.updateOrder(orderId, {
                scheduledDate: schedule.date,
                scheduledTime: schedule.time,
                scheduledTimezone: schedule.timezone,
                serviceNotes: schedule.notes,
                serviceStatus: 'scheduled'
            });

            // Update main order status to PROCESSING if it was PAID
            // Use the already-declared normalizedStatus variable
            if (normalizedStatus === OrderStatus.PAID) {
                await this.orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING, {
                    serviceScheduled: true,
                    scheduledDate: schedule.date,
                    scheduledTime: schedule.time
                });
            }

            // Notify buyer about the scheduled service
            await this.notificationService.notifyOrderStatusChange(
                order.buyerWalletAddress,
                orderId,
                'SERVICE_SCHEDULED' as any
            );

            safeLogger.info(`Service scheduled for order ${orderId}: ${schedule.date} ${schedule.time}`);

            return {
                success: true,
                scheduledDate: schedule.date,
                scheduledTime: schedule.time,
                timezone: schedule.timezone
            };
        } catch (error) {
            safeLogger.error('Error scheduling service:', error);
            throw error;
        }
    }

    /**
     * Add a deliverable to a service order
     */
    async addServiceDeliverable(
        orderId: string,
        sellerId: string,
        deliverable: { type: 'file' | 'link' | 'document'; url: string; name: string; description?: string }
    ): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Get existing deliverables
            let existingDeliverables = [];
            if (order.serviceDeliverables) {
                try {
                    existingDeliverables = typeof order.serviceDeliverables === 'string'
                        ? JSON.parse(order.serviceDeliverables)
                        : order.serviceDeliverables;
                } catch (e) {
                    existingDeliverables = [];
                }
            }

            // Add new deliverable
            const newDeliverable = {
                ...deliverable,
                uploadedAt: new Date().toISOString(),
                id: uuidv4()
            };
            existingDeliverables.push(newDeliverable);

            // Update order with new deliverables
            await this.databaseService.updateOrder(orderId, {
                serviceDeliverables: JSON.stringify(existingDeliverables)
            });

            safeLogger.info(`Deliverable added to order ${orderId}: ${deliverable.name}`);

            return {
                success: true,
                deliverable: newDeliverable,
                totalDeliverables: existingDeliverables.length
            };
        } catch (error) {
            safeLogger.error('Error adding deliverable:', error);
            throw error;
        }
    }

    /**
     * Remove a deliverable from a service order
     */
    async removeServiceDeliverable(
        orderId: string,
        sellerId: string,
        deliverableId: string
    ): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Get existing deliverables
            let existingDeliverables = [];
            if (order.serviceDeliverables) {
                try {
                    existingDeliverables = typeof order.serviceDeliverables === 'string'
                        ? JSON.parse(order.serviceDeliverables)
                        : order.serviceDeliverables;
                } catch (e) {
                    existingDeliverables = [];
                }
            }

            // Remove the deliverable
            const updatedDeliverables = existingDeliverables.filter((d: any) => d.id !== deliverableId);

            // Update order
            await this.databaseService.updateOrder(orderId, {
                serviceDeliverables: JSON.stringify(updatedDeliverables)
            });

            safeLogger.info(`Deliverable ${deliverableId} removed from order ${orderId}`);

            return {
                success: true,
                remainingDeliverables: updatedDeliverables.length
            };
        } catch (error) {
            safeLogger.error('Error removing deliverable:', error);
            throw error;
        }
    }

    /**
     * Mark service as in progress (can start from PAID, scheduled, or PROCESSING status)
     */
    async startService(orderId: string, sellerId: string): Promise<boolean> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Validate order status - can start service from PAID or PROCESSING status
            // Normalize status comparison to handle case differences
            const normalizedStatus = (order.status || '').toUpperCase();
            if (normalizedStatus !== OrderStatus.PAID && normalizedStatus !== OrderStatus.PROCESSING) {
                throw new Error(`Cannot start service for order with status: ${order.status}`);
            }

            // Update service status to in_progress
            await this.databaseService.updateOrder(orderId, {
                serviceStatus: 'in_progress'
            });

            // Update main order status to PROCESSING if it was PAID
            // Use the already-declared normalizedStatus variable
            if (normalizedStatus === OrderStatus.PAID) {
                await this.orderService.updateOrderStatus(orderId, OrderStatus.PROCESSING, {
                    serviceStarted: true,
                    serviceStartedAt: new Date()
                });
            }

            await this.notificationService.notifyOrderStatusChange(
                order.buyerWalletAddress,
                orderId,
                'SERVICE_STARTED' as any
            );

            safeLogger.info(`Service started for order ${orderId}`);
            return true;
        } catch (error) {
            safeLogger.error('Error starting service:', error);
            throw error;
        }
    }

    /**
     * Mark service as complete (awaiting buyer confirmation)
     */
    async markServiceComplete(orderId: string, sellerId: string, completionNotes?: string): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Validate order status - can only complete from PROCESSING status
            // Normalize status comparison to handle case differences
            const normalizedStatus = (order.status || '').toUpperCase();
            if (normalizedStatus !== OrderStatus.PROCESSING) {
                throw new Error(`Cannot complete service for order with status: ${order.status}. Order must be in PROCESSING status.`);
            }

            // Validate service status - must be in_progress or scheduled to complete
            const validServiceStatuses = ['in_progress', 'scheduled', 'pending'];
            if (order.serviceStatus && !validServiceStatuses.includes(order.serviceStatus)) {
                throw new Error(`Cannot complete service with status: ${order.serviceStatus}`);
            }

            const completedAt = new Date();

            await this.databaseService.updateOrder(orderId, {
                serviceStatus: 'completed',
                serviceCompletedAt: completedAt,
                serviceNotes: completionNotes || order.serviceNotes
            });

            // Update main order status to DELIVERED
            await this.orderService.updateOrderStatus(orderId, OrderStatus.DELIVERED);

            // Notify buyer to confirm
            await this.notificationService.notifyOrderStatusChange(
                order.buyerWalletAddress,
                orderId,
                'SERVICE_COMPLETED' as any
            );

            safeLogger.info(`Service marked complete for order ${orderId}`);

            return {
                success: true,
                completedAt
            };
        } catch (error) {
            safeLogger.error('Error marking service complete:', error);
            throw error;
        }
    }

    /**
     * Complete digital product delivery (for non-service digital goods)
     */
    async completeDigitalDelivery(orderId: string, sellerId: string, deliveryNotes?: string): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new NotFoundError('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new UnauthorizedError('Unauthorized');

            // For digital products, we can transition from PAID or PROCESSING to DELIVERED
            // Normalize status comparison to handle case differences (DB stores lowercase, enum is uppercase)
            // Allow PENDING status as well since some orders may appear as pending
            const normalizedStatus = (order.status || '').toUpperCase();

            // Idempotency check: If already delivered, return success
            if (normalizedStatus === OrderStatus.DELIVERED) {
                safeLogger.info(`Order ${orderId} already delivered. Skipping update.`);
                return { success: true, status: order.status, alreadyDelivered: true };
            }
            if (normalizedStatus !== OrderStatus.PAID &&
                normalizedStatus !== OrderStatus.PROCESSING &&
                normalizedStatus !== 'PENDING' &&
                normalizedStatus !== OrderStatus.PAYMENT_PENDING) {
                throw new ValidationError(`Order must be PAID, PROCESSING or PENDING to complete digital delivery. Current status: ${order.status}`);
            }

            const completedAt = new Date();

            // Update order status to DELIVERED
            await this.orderService.updateOrderStatus(orderId, OrderStatus.DELIVERED, {
                digitalDeliveryCompletedAt: completedAt,
                deliveryNotes: deliveryNotes || 'Digital product delivered'
            });

            // Notify buyer about the delivery
            await this.notificationService.notifyOrderStatusChange(
                order.buyerWalletAddress,
                orderId,
                OrderStatus.DELIVERED
            );

            safeLogger.info(`Digital delivery completed for order ${orderId}`);

            return {
                success: true,
                completedAt
            };
        } catch (error) {
            safeLogger.error('Error completing digital delivery:', error);
            throw error;
        }
    }

    /**
     * Get service details for an order
     */
    async getServiceDetails(orderId: string, sellerId: string): Promise<any> {
        try {
            const order = await this.databaseService.getOrderById(orderId);
            if (!order) throw new Error('Order not found');

            const isSeller = order.sellerId === sellerId || order.sellerWalletAddress === sellerId;
            if (!isSeller) throw new Error('Unauthorized');

            // Parse deliverables
            let deliverables = [];
            if (order.serviceDeliverables) {
                try {
                    deliverables = typeof order.serviceDeliverables === 'string'
                        ? JSON.parse(order.serviceDeliverables)
                        : order.serviceDeliverables;
                } catch (e) {
                    deliverables = [];
                }
            }

            return {
                orderId: order.id,
                serviceStatus: order.serviceStatus || 'pending',
                schedule: order.scheduledDate ? {
                    date: order.scheduledDate,
                    time: order.scheduledTime,
                    timezone: order.scheduledTimezone
                } : null,
                deliverables,
                completedAt: order.serviceCompletedAt,
                buyerConfirmedAt: order.buyerConfirmedAt,
                notes: order.serviceNotes
            };
        } catch (error) {
            safeLogger.error('Error getting service details:', error);
            throw error;
        }
    }
}
