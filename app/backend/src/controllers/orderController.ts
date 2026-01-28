import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { OrderService } from '../services/orderService';
import { ShippingService } from '../services/shippingService';
import { ReceiptService } from '../services/receiptService';
import { NotificationService } from '../services/notificationService';
import { BlockchainEventService } from '../services/blockchainEventService';
import { safeLogger } from '../utils/safeLogger';
import {
  CreateOrderInput,
  UpdateOrderInput,
  OrderStatus,
  ShippingInfo
} from '../models/Order';
import { AppError, NotFoundError, ValidationError } from '../middleware/errorHandler';

import { OrderTimelineService } from '../services/orderTimelineService';

const orderService = new OrderService();
const shippingService = new ShippingService();
const receiptService = new ReceiptService();
const notificationService = new NotificationService();
const blockchainEventService = new BlockchainEventService();
const orderTimelineService = new OrderTimelineService();

export class OrderController {
  /**
   * Create a new order
   */
  async createOrder(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreateOrderInput = req.body;

      // Validate required fields
      // Normalize aliases
      if (!input.amount && (input as any).price) {
        input.amount = (input as any).price;
      }
      if (!input.paymentToken && (input as any).tokenAddress) {
        input.paymentToken = (input as any).tokenAddress;
      }

      if (!input.listingId || !input.buyerAddress || !input.sellerAddress || !input.amount || !input.paymentToken) {
        throw new ValidationError('Missing required fields');
      }

      const order = await orderService.createOrder(input);
      return res.status(201).json(order);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const order = await orderService.getOrderById(id);

      if (!order) {
        throw new NotFoundError('Order not found');
      }

      return res.json(order);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get orders by authenticated user (uses token ID)
   * @query role - Optional: 'buyer' (default) or 'seller'
   */
  async getMyOrders(req: Request, res: Response): Promise<Response> {
    try {
      const userAddress = req.user?.walletAddress;
      if (!userAddress) {
        return res.status(401).json({ message: 'Unauthorized: Wallet address not found' });
      }

      const { status, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc', role } = req.query;

      const result = await orderService.getOrdersByUser(
        userAddress,
        role as 'buyer' | 'seller',
        { status: status as string },
        sortBy as string,
        sortOrder as 'asc' | 'desc',
        parseInt(limit as string),
        parseInt(offset as string)
      );

      const page = Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1;
      const totalPages = Math.ceil(result.total / parseInt(limit as string));

      return res.status(200).json({
        orders: result.orders,
        total: result.total,
        page,
        limit: parseInt(limit as string),
        totalPages
      });
    } catch (error) {
      safeLogger.error('Error in getMyOrders:', error);
      return res.status(500).json({ message: 'Failed to retrieve user orders' });
    }
  }

  /**
   * Get orders by user address
   * @query role - Optional: 'buyer' to get only orders placed as buyer, 'seller' to get only orders received as seller
   */
  async getOrdersByUser(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { status, limit = 50, offset = 0, role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Validate role if provided
      if (role && role !== 'buyer' && role !== 'seller') {
        return res.status(400).json({ message: "Invalid role specified. Must be 'buyer' or 'seller'." });
      }

      // Validate sortOrder if provided
      if (sortOrder && sortOrder !== 'asc' && sortOrder !== 'desc') {
        return res.status(400).json({ message: "Invalid sortOrder specified. Must be 'asc' or 'desc'." });
      }

      // Basic validation for limit and offset
      const numLimit = parseInt(limit as string, 10);
      const numOffset = parseInt(offset as string, 10);

      if (isNaN(numLimit) || isNaN(numOffset)) {
        return res.status(400).json({ message: "Invalid limit or offset." });
      }

      const filters = {
        ...(status && { status: status as string }),
      };

      const result = await orderService.getOrdersByUser(
        userAddress,
        role as 'buyer' | 'seller',
        filters,
        sortBy as string,
        sortOrder as 'asc' | 'desc',
        numLimit,
        numOffset
      );

      const page = Math.floor(numOffset / numLimit) + 1;
      const totalPages = Math.ceil(result.total / numLimit);

      return res.status(200).json({
        orders: result.orders,
        total: result.total,
        page,
        limit: numLimit,
        totalPages
      });
    } catch (error) {
      safeLogger.error('Error in getOrdersByUser controller:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { status, metadata } = req.body;

      if (!status) {
        throw new ValidationError('Status is required');
      }

      // Validate status
      if (!Object.values(OrderStatus).includes(status)) {
        throw new ValidationError('Invalid order status');
      }

      const success = await orderService.updateOrderStatus(orderId, status, metadata);

      if (!success) {
        throw new NotFoundError('Order not found');
      }

      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Process shipping for an order
   */
  async processShipping(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const shippingInfo: ShippingInfo = req.body;

      if (!shippingInfo.carrier || !shippingInfo.service) {
        throw new ValidationError('Carrier and service are required');
      }

      const success = await orderService.processShipping(orderId, shippingInfo);

      if (!success) {
        throw new NotFoundError('Order not found or cannot be shipped');
      }

      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Confirm delivery
   */
  async confirmDelivery(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { deliveryInfo } = req.body;

      if (!deliveryInfo) {
        throw new ValidationError('Delivery info is required');
      }

      const success = await orderService.confirmDelivery(orderId, deliveryInfo);

      if (!success) {
        throw new NotFoundError('Order not found');
      }

      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order history and timeline
   */
  async getOrderHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const history = await orderService.getOrderHistory(orderId);
      return res.json(history);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { timeframe = 'month' } = req.query;

      if (!['week', 'month', 'year'].includes(timeframe as string)) {
        throw new ValidationError('Invalid timeframe. Must be week, month, or year');
      }

      const analytics = await orderService.getOrderAnalytics(userAddress, timeframe as any);
      return res.json(analytics);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Initiate dispute
   */
  async initiateDispute(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { initiatorAddress, reason, evidence } = req.body;

      if (!initiatorAddress || !reason) {
        throw new ValidationError('Initiator address and reason are required');
      }

      const success = await orderService.initiateDispute(orderId, initiatorAddress, reason, evidence);

      if (!success) {
        throw new NotFoundError('Order not found or dispute cannot be initiated');
      }

      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get shipping rates
   */
  async getShippingRates(req: Request, res: Response): Promise<Response> {
    try {
      const { fromAddress, toAddress, packageInfo } = req.body;

      if (!fromAddress || !toAddress || !packageInfo) {
        throw new ValidationError('From address, to address, and package info are required');
      }

      const rates = await shippingService.getShippingRates(fromAddress, toAddress, packageInfo);
      return res.json(rates);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Track shipment
   */
  async trackShipment(req: Request, res: Response): Promise<Response> {
    try {
      const { trackingNumber, carrier } = req.params;

      const trackingInfo = await shippingService.trackShipment(trackingNumber, carrier);
      return res.json(trackingInfo);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get tracking info for an order
   */
  async getTrackingInfo(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const tracking = await orderService.getOrderTracking(orderId);
      return res.json(tracking);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Approve cancellation request
   */
  async approveCancellation(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { resolutionNotes } = req.body;
      const userId = (req as any).user.id;
      const userAddress = (req as any).user.walletAddress || sanitizeWalletAddress(userId); // Fallback if ID is address, though middleware should set user

      // More robust address extraction from auth middleware
      const processorAddress = (req as any).user.walletAddress;

      const success = await orderService.processCancellation(
        orderId,
        processorAddress,
        'approve',
        resolutionNotes
      );

      return res.json({ success });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Deny cancellation request
   */
  async denyCancellation(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { resolutionNotes } = req.body;
      const processorAddress = (req as any).user.walletAddress;

      const success = await orderService.processCancellation(
        orderId,
        processorAddress,
        'reject',
        resolutionNotes
      );

      return res.json({ success });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Validate shipping address
   */
  async validateAddress(req: Request, res: Response): Promise<Response> {
    try {
      const address = req.body;

      if (!address.street || !address.city || !address.postalCode || !address.country) {
        throw new ValidationError('Street, city, postal code, and country are required');
      }

      const validation = await shippingService.validateAddress(address);
      return res.json(validation);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get blockchain events for an order
   */
  async getOrderBlockchainEvents(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { escrowId, fromBlock = 0 } = req.query;

      if (!escrowId) {
        throw new ValidationError('Escrow ID is required');
      }

      const events = await blockchainEventService.getOrderEvents(
        orderId,
        escrowId as string,
        Number(fromBlock)
      );

      return res.json(events);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order notifications
   */
  async getOrderNotifications(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const notifications = await notificationService.getUserNotifications(
        userAddress,
        Number(limit),
        Number(offset)
      );

      return res.json(notifications);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const { notificationId } = req.params;

      const success = await notificationService.markAsRead(notificationId);

      if (!success) {
        throw new NotFoundError('Notification not found');
      }

      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;

      const success = await notificationService.markAllAsRead(userAddress);

      if (!success) {
        throw new AppError('Failed to mark notifications as read');
      }

      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;

      const count = await notificationService.getUnreadCount(userAddress);
      return res.json({ count });
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const preferences = req.body;

      const success = await notificationService.updateNotificationPreferences(userAddress, preferences);

      if (!success) {
        throw new AppError('Failed to update notification preferences');
      }

      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;

      const preferences = await notificationService.getNotificationPreferences(userAddress);
      return res.json(preferences);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(req: Request, res: Response): Promise<Response> {
    try {
      const { timeframe = 'month' } = req.query;

      // This would typically require admin permissions
      // For now, we'll return mock statistics
      const statistics = {
        totalOrders: 1250,
        totalVolume: '2500000',
        averageOrderValue: '2000',
        completionRate: 0.95,
        disputeRate: 0.02,
        topCategories: [
          { category: 'Electronics', orderCount: 450, volume: '900000' },
          { category: 'Fashion', orderCount: 320, volume: '640000' },
          { category: 'Home & Garden', orderCount: 280, volume: '560000' }
        ],
        monthlyTrends: [
          { month: '2024-01', orderCount: 380, volume: '760000' },
          { month: '2024-02', orderCount: 420, volume: '840000' },
          { month: '2024-03', orderCount: 450, volume: '900000' }
        ]
      };

      return res.json(statistics);
    } catch (error: any) {
      throw new AppError(error.message);
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;

      const success = await orderService.updateOrderStatus(orderId, OrderStatus.CANCELLED, { reason });

      if (!success) {
        throw new NotFoundError('Order not found or cannot be cancelled');
      }

      return res.status(200).json({ success: true, message: 'Order cancelled successfully' });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Refund order
   */
  async refundOrder(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { reason, amount } = req.body;

      const success = await orderService.updateOrderStatus(orderId, OrderStatus.REFUNDED, { reason, amount });

      if (!success) {
        throw new NotFoundError('Order not found or cannot be refunded');
      }

      return res.status(200).json({ success: true, message: 'Order refunded successfully' });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Bulk update orders
   */
  async bulkUpdateOrders(req: Request, res: Response): Promise<Response> {
    try {
      const { orderIds, status, metadata } = req.body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new ValidationError('Order IDs array is required');
      }

      if (!status) {
        throw new ValidationError('Status is required');
      }

      const promises = orderIds.map(orderId =>
        orderService.updateOrderStatus(orderId, status, metadata)
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      return res.json({
        total: results.length,
        successful,
        failed
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Request order cancellation
   */
  async requestCancellation(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { requesterAddress, reason, description } = req.body;

      if (!requesterAddress || !reason) {
        throw new ValidationError('Requester address and reason are required');
      }

      const success = await orderService.requestCancellation(orderId, requesterAddress, reason, description);

      if (!success) {
        throw new AppError('Failed to request cancellation');
      }

      return res.status(200).json({ message: 'Cancellation requested successfully' });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order receipt
   */
  async getReceipt(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;

      const receipts = await receiptService.getReceiptByOrderId(orderId);

      if (!receipts || receipts.length === 0) {
        throw new NotFoundError('Receipt not found for this order');
      }

      // Return the most recent receipt
      return res.json(receipts[0]);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order timeline
   */
  async getTimeline(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const timeline = await orderTimelineService.getTimeline(orderId);
      return res.json(timeline);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }
}
