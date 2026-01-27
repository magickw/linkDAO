/// <reference path="../types/express.d.ts" />
/**
 * Order Tracking Controller - Handles order tracking and display system requests
 * Features: Order history, search, filtering, timeline, and notifications
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { OrderTrackingService } from '../services/marketplace/orderTrackingService';
import { AppError, NotFoundError, ValidationError, ForbiddenError } from '../middleware/errorHandler';

export class OrderTrackingController {
  private orderTrackingService: OrderTrackingService;

  constructor() {
    this.orderTrackingService = new OrderTrackingService();
  }

  /**
   * Get order history for a user
   */
  async getOrderHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { 
        page = 1, 
        limit = 20, 
        userType = 'buyer',
        status,
        dateFrom,
        dateTo,
        paymentMethod,
        minAmount,
        maxAmount,
        hasDispute,
        hasTracking
      } = req.query;

      // Build filters object
      const filters: any = {};
      if (status) filters.status = status;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (paymentMethod) filters.paymentMethod = paymentMethod;
      if (minAmount) filters.minAmount = parseFloat(minAmount as string);
      if (maxAmount) filters.maxAmount = parseFloat(maxAmount as string);
      if (hasDispute !== undefined) filters.hasDispute = hasDispute === 'true';
      if (hasTracking !== undefined) filters.hasTracking = hasTracking === 'true';

      const result = await this.orderTrackingService.getOrderHistory(
        userAddress as string,
        userType as 'buyer' | 'seller',
        parseInt(page as string),
        parseInt(limit as string),
        filters
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get detailed order information by ID
   */
  async getOrderById(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      const order = await this.orderTrackingService.getOrderById(orderId, userAddress);
      
      if (!order) {
        throw new NotFoundError('Order not found');
      }

      return res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order timeline/events
   */
  async getOrderTimeline(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      const timeline = await this.orderTrackingService.getOrderTimeline(orderId, userAddress);

      return res.json({
        success: true,
        data: timeline
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Search orders with advanced filtering
   */
  async searchOrders(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress, query, page = 1, limit = 20 } = req.body;

      const result = await this.orderTrackingService.searchOrders(
        userAddress,
        query,
        page,
        limit
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Update order status (seller only)
   */
  async updateOrderStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { status, metadata } = req.body;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      await this.orderTrackingService.updateOrderStatus(
        orderId,
        status,
        userAddress,
        metadata
      );

      return res.json({
        success: true,
        message: 'Order status updated successfully'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Add tracking information to order
   */
  async addTrackingInfo(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { trackingNumber, carrier, estimatedDelivery } = req.body;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      await this.orderTrackingService.addTrackingInfo(
        orderId,
        trackingNumber,
        carrier,
        userAddress,
        estimatedDelivery
      );

      return res.json({
        success: true,
        message: 'Tracking information added successfully'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Confirm delivery (buyer only)
   */
  async confirmDelivery(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { deliveryInfo } = req.body;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      await this.orderTrackingService.confirmDelivery(
        orderId,
        userAddress,
        deliveryInfo
      );

      return res.json({
        success: true,
        message: 'Delivery confirmed successfully'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order statistics for dashboard
   */
  async getOrderStatistics(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { userType = 'buyer', timeframe = 'month' } = req.query;

      const statistics = await this.orderTrackingService.getOrderStatistics(
        userAddress as string,
        userType as 'buyer' | 'seller',
        timeframe as 'week' | 'month' | 'year'
      );

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get tracking information for an order
   */
  async getTrackingInfo(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      const trackingInfo = await this.orderTrackingService.getTrackingInfo(orderId, userAddress);

      if (!trackingInfo) {
        throw new NotFoundError('Tracking information not found');
      }

      return res.json({
        success: true,
        data: trackingInfo
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Export order history to CSV
   */
  async exportOrderHistory(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { 
        userType = 'buyer', 
        format = 'csv',
        status,
        dateFrom,
        dateTo,
        paymentMethod
      } = req.query;

      // Build filters object
      const filters: any = {};
      if (status) filters.status = status;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (paymentMethod) filters.paymentMethod = paymentMethod;

      const exportData = await this.orderTrackingService.exportOrderHistory(
        userAddress as string,
        userType as 'buyer' | 'seller',
        format as 'csv' | 'json',
        filters
      );

      // Set appropriate headers for file download
      const filename = `orders-${userType}-${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      return res.send(exportData);
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

      const notifications = await this.orderTrackingService.getOrderNotifications(
        userAddress as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      return res.json({
        success: true,
        data: notifications
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const { notificationId } = req.params;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      await this.orderTrackingService.markNotificationAsRead(notificationId, userAddress);

      return res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order status counts for dashboard
   */
  async getOrderStatusCounts(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { userType = 'buyer' } = req.query;

      const statusCounts = await this.orderTrackingService.getOrderStatusCounts(
        userAddress as string,
        userType as 'buyer' | 'seller'
      );

      return res.json({
        success: true,
        data: statusCounts
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Bulk update order statuses
   */
  async bulkUpdateOrderStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { orderIds, status, metadata } = req.body;
      const userAddress = req.user?.address;

      if (!userAddress) {
        throw new ForbiddenError('User address not found');
      }

      const result = await this.orderTrackingService.bulkUpdateOrderStatus(
        orderIds,
        status,
        userAddress,
        metadata
      );

      return res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }

  /**
   * Get order trends and analytics
   */
  async getOrderTrends(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      const { 
        userType = 'buyer', 
        period = '30d', 
        groupBy = 'day' 
      } = req.query;

      const trends = await this.orderTrackingService.getOrderTrends(
        userAddress as string,
        userType as 'buyer' | 'seller',
        period as string,
        groupBy as 'day' | 'week' | 'month'
      );

      return res.json({
        success: true,
        data: trends
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message);
    }
  }
}
