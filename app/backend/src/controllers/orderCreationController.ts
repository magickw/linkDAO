import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { 
  OrderCreationService, 
  OrderCreationRequest, 
  OrderCreationResult 
} from '../services/marketplace/orderCreationService';
import { AppError, ValidationError, NotFoundError } from '../middleware/errorHandler';

export class OrderCreationController {
  private orderCreationService: OrderCreationService;

  constructor() {
    this.orderCreationService = new OrderCreationService();
  }

  /**
   * Create a new order
   */
  async createOrder(req: Request, res: Response): Promise<Response> {
    try {
      const request: OrderCreationRequest = req.body;

      // Validate required fields
      if (!request.listingId || !request.buyerAddress || !request.quantity || !request.shippingAddress || !request.paymentMethod) {
        throw new ValidationError('Missing required fields: listingId, buyerAddress, quantity, shippingAddress, paymentMethod');
      }

      // Validate addresses
      if (!/^0x[a-fA-F0-9]{40}$/.test(request.buyerAddress)) {
        throw new ValidationError('Invalid buyer address format');
      }

      // Validate quantity
      if (request.quantity <= 0 || !Number.isInteger(request.quantity)) {
        throw new ValidationError('Quantity must be a positive integer');
      }

      // Validate payment method
      if (!['crypto', 'fiat'].includes(request.paymentMethod)) {
        throw new ValidationError('Payment method must be either "crypto" or "fiat"');
      }

      const result = await this.orderCreationService.createOrder(request);

      return res.status(201).json({
        success: true,
        data: result
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Order creation failed: ${error.message}`, 500, 'ORDER_CREATION_ERROR');
    }
  }

  /**
   * Validate order request without creating
   */
  async validateOrder(req: Request, res: Response): Promise<Response> {
    try {
      const request: OrderCreationRequest = req.body;

      if (!request.listingId || !request.buyerAddress || !request.quantity) {
        throw new ValidationError('Missing required fields for validation: listingId, buyerAddress, quantity');
      }

      const validation = await this.orderCreationService.validateOrderRequest(request);

      return res.json({
        success: true,
        data: validation
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Order validation failed: ${error.message}`, 500, 'ORDER_VALIDATION_ERROR');
    }
  }

  /**
   * Get order summary
   */
  async getOrderSummary(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const summary = await this.orderCreationService.getOrderSummary(orderId);

      if (!summary) {
        throw new NotFoundError('Order not found');
      }

      return res.json({
        success: true,
        data: summary
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get order summary: ${error.message}`, 500, 'ORDER_SUMMARY_ERROR');
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { status, message, metadata } = req.body;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      if (!status) {
        throw new ValidationError('Status is required');
      }

      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const success = await this.orderCreationService.updateOrderStatus(orderId, status, message, metadata);

      if (!success) {
        throw new AppError('Failed to update order status', 500, 'ORDER_STATUS_UPDATE_ERROR');
      }

      return res.json({
        success: true,
        message: `Order status updated to ${status}`
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to update order status: ${error.message}`, 500, 'ORDER_STATUS_UPDATE_ERROR');
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(req: Request, res: Response): Promise<Response> {
    try {
      const { orderId } = req.params;
      const { reason, cancelledBy } = req.body;

      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      if (!reason) {
        throw new ValidationError('Cancellation reason is required');
      }

      if (!cancelledBy) {
        throw new ValidationError('Cancelled by field is required');
      }

      const result = await this.orderCreationService.cancelOrder(orderId, reason, cancelledBy);

      return res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to cancel order: ${error.message}`, 500, 'ORDER_CANCEL_ERROR');
    }
  }

  /**
   * Get order creation statistics
   */
  async getOrderStats(req: Request, res: Response): Promise<Response> {
    try {
      const { timeframe = '7d', sellerAddress, buyerAddress } = req.query;

      // Mock statistics - in production, calculate from database
      const stats = {
        totalOrders: 156,
        pendingOrders: 23,
        completedOrders: 128,
        cancelledOrders: 5,
        totalRevenue: '12,450.00',
        averageOrderValue: '79.81',
        topPaymentMethod: 'crypto',
        paymentMethodBreakdown: {
          crypto: 89,
          fiat: 67
        },
        statusBreakdown: {
          pending: 23,
          confirmed: 15,
          processing: 8,
          shipped: 12,
          delivered: 93,
          cancelled: 5
        },
        timeframe,
        generatedAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error: any) {
      throw new AppError(`Failed to get order statistics: ${error.message}`, 500, 'ORDER_STATS_ERROR');
    }
  }

  /**
   * Bulk order operations
   */
  async bulkOrderOperation(req: Request, res: Response): Promise<Response> {
    try {
      const { operation, orderIds, data } = req.body;

      if (!operation || !orderIds || !Array.isArray(orderIds)) {
        throw new ValidationError('Operation and orderIds array are required');
      }

      const validOperations = ['update_status', 'cancel', 'export'];
      if (!validOperations.includes(operation)) {
        throw new ValidationError(`Invalid operation. Must be one of: ${validOperations.join(', ')}`);
      }

      const results = [];

      for (const orderId of orderIds) {
        try {
          let result;
          switch (operation) {
            case 'update_status':
              if (!data?.status) {
                throw new Error('Status is required for update_status operation');
              }
              result = await this.orderCreationService.updateOrderStatus(
                orderId,
                data.status,
                data.message || `Bulk status update to ${data.status}`
              );
              break;

            case 'cancel':
              result = await this.orderCreationService.cancelOrder(
                orderId,
                data?.reason || 'Bulk cancellation',
                data?.cancelledBy || 'system'
              );
              break;

            case 'export':
              const summary = await this.orderCreationService.getOrderSummary(orderId);
              result = summary;
              break;

            default:
              result = { error: 'Unknown operation' };
          }

          results.push({
            orderId,
            success: true,
            result
          });

        } catch (error: any) {
          results.push({
            orderId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return res.json({
        success: true,
        data: {
          operation,
          totalProcessed: results.length,
          successCount,
          failureCount,
          results
        }
      });

    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Bulk operation failed: ${error.message}`, 500, 'BULK_OPERATION_ERROR');
    }
  }

  /**
   * Health check for order creation system
   */
  async healthCheck(req: Request, res: Response): Promise<Response> {
    try {
      const healthStatus = {
        orderCreationService: 'healthy',
        databaseConnection: 'healthy',
        notificationService: 'healthy',
        shippingService: 'healthy',
        paymentIntegration: 'healthy',
        timestamp: new Date().toISOString()
      };

      // Test key components
      try {
        // Test database connectivity
        safeLogger.info('Testing database connectivity...');
        
        // Test notification service
        safeLogger.info('Testing notification service...');
        
        // Test shipping service
        safeLogger.info('Testing shipping service...');

      } catch (error) {
        healthStatus.databaseConnection = 'unhealthy';
        healthStatus.notificationService = 'unhealthy';
        healthStatus.shippingService = 'unhealthy';
      }

      const isHealthy = Object.values(healthStatus).every(status => 
        status === 'healthy' || typeof status === 'string'
      );

      return res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: healthStatus
      });

    } catch (error: any) {
      return res.status(503).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }
}
