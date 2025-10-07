import { Request, Response } from 'express';
import { orderManagementService } from '../services/orderManagementService';

export class OrderManagementController {

  /**
   * Get detailed order information
   */
  async getOrderDetails(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
        return;
      }

      const order = await orderManagementService.getOrderDetails(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error getting order details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order details',
        error: error.message
      });
    }
  }

  /**
   * Get orders for a specific user
   */
  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const { 
        role = 'both', 
        status, 
        limit = '50', 
        offset = '0' 
      } = req.query;

      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
        return;
      }

      const parsedLimit = Math.min(parseInt(limit as string) || 50, 100);
      const parsedOffset = parseInt(offset as string) || 0;

      const orders = await orderManagementService.getUserOrders(
        walletAddress,
        role as 'buyer' | 'seller' | 'both',
        status as string,
        parsedLimit,
        parsedOffset
      );

      res.json({
        success: true,
        data: orders,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: orders.length === parsedLimit
        }
      });
    } catch (error) {
      console.error('Error getting user orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user orders',
        error: error.message
      });
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { status, updatedBy, notes, metadata } = req.body;

      if (!orderId || !status || !updatedBy) {
        res.status(400).json({
          success: false,
          message: 'Order ID, status, and updatedBy are required'
        });
        return;
      }

      const success = await orderManagementService.updateOrderStatus(
        orderId,
        status,
        updatedBy,
        notes,
        metadata
      );

      if (success) {
        res.json({
          success: true,
          message: 'Order status updated successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update order status'
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update order status',
        error: error.message
      });
    }
  }

  /**
   * Add tracking information to an order
   */
  async addOrderTracking(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { trackingNumber, carrier, estimatedDelivery } = req.body;

      if (!orderId || !trackingNumber || !carrier) {
        res.status(400).json({
          success: false,
          message: 'Order ID, tracking number, and carrier are required'
        });
        return;
      }

      const estimatedDate = estimatedDelivery ? new Date(estimatedDelivery) : undefined;

      const success = await orderManagementService.addOrderTracking(
        orderId,
        trackingNumber,
        carrier,
        estimatedDate
      );

      if (success) {
        res.json({
          success: true,
          message: 'Tracking information added successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to add tracking information'
        });
      }
    } catch (error) {
      console.error('Error adding order tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add tracking information',
        error: error.message
      });
    }
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const { role, days = '90' } = req.query;

      const parsedDays = Math.min(parseInt(days as string) || 90, 365);

      const analytics = await orderManagementService.getOrderAnalytics(
        walletAddress || undefined,
        role as 'buyer' | 'seller' | undefined,
        parsedDays
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting order analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order analytics',
        error: error.message
      });
    }
  }

  /**
   * Get platform-wide order analytics (no wallet address)
   */
  async getPlatformOrderAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { days = '90' } = req.query;

      const parsedDays = Math.min(parseInt(days as string) || 90, 365);

      const analytics = await orderManagementService.getOrderAnalytics(
        undefined,
        undefined,
        parsedDays
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting platform order analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get platform order analytics',
        error: error.message
      });
    }
  }
}

export const orderManagementController = new OrderManagementController();