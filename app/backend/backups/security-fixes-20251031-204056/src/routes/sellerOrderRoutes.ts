import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { sellerOrderService } from '../services/sellerOrderService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { cachingMiddleware, rateLimitWithCache } from '../middleware/cachingMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * GET /api/marketplace/seller/orders/:walletAddress
 * Get all orders for a seller
 */
router.get('/seller/orders/:walletAddress',
  rateLimitWithCache(req => `seller_orders:${req.ip}`, 60, 60), // 60 requests per minute
  cachingMiddleware.cache('sellerOrders', { ttl: 30 }), // Cache for 30 seconds
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { status, limit = '50', offset = '0', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ], 'Invalid wallet address');
      }

      // Validate limit and offset
      const parsedLimit = parseInt(limit as string, 10);
      const parsedOffset = parseInt(offset as string, 10);

      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return validationErrorResponse(res, [
          { field: 'limit', message: 'Limit must be between 1 and 100' }
        ]);
      }

      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return validationErrorResponse(res, [
          { field: 'offset', message: 'Offset must be 0 or greater' }
        ]);
      }

      const result = await sellerOrderService.getSellerOrders(
        walletAddress,
        {
          status: status as string,
          limit: parsedLimit,
          offset: parsedOffset,
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc',
        }
      );

      return successResponse(res, result, 200);
    } catch (error) {
      safeLogger.error('Error fetching seller orders:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Seller not found');
        }
      }

      return errorResponse(
        res,
        'ORDERS_FETCH_ERROR',
        'Failed to fetch seller orders',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * PUT /api/marketplace/seller/orders/:orderId/status
 * Update order status
 */
router.put('/seller/orders/:orderId/status', csrfProtection, 
  rateLimitWithCache(req => `order_status_update:${req.ip}`, 30, 60), // 30 requests per minute
  cachingMiddleware.invalidate('sellerOrders'),
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status, notes } = req.body;

      // Validate orderId
      const parsedOrderId = parseInt(orderId, 10);
      if (isNaN(parsedOrderId)) {
        return validationErrorResponse(res, [
          { field: 'orderId', message: 'Invalid order ID' }
        ]);
      }

      // Validate status
      const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
      if (!status || !validStatuses.includes(status)) {
        return validationErrorResponse(res, [
          { field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` }
        ]);
      }

      await sellerOrderService.updateOrderStatus(parsedOrderId, status, notes);

      return successResponse(res, {
        message: 'Order status updated successfully',
        orderId: parsedOrderId,
        newStatus: status
      }, 200);
    } catch (error) {
      safeLogger.error('Error updating order status:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Order not found');
        }
        if (error.message.includes('not authorized')) {
          return errorResponse(res, 'NOT_AUTHORIZED', 'Not authorized to update this order', 403);
        }
      }

      return errorResponse(
        res,
        'ORDER_UPDATE_ERROR',
        'Failed to update order status',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * PUT /api/marketplace/seller/orders/:orderId/tracking
 * Update order tracking information
 */
router.put('/seller/orders/:orderId/tracking', csrfProtection, 
  rateLimitWithCache(req => `order_tracking_update:${req.ip}`, 30, 60), // 30 requests per minute
  cachingMiddleware.invalidate('sellerOrders'),
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const { trackingNumber, trackingCarrier, estimatedDelivery, notes } = req.body;

      // Validate orderId
      const parsedOrderId = parseInt(orderId, 10);
      if (isNaN(parsedOrderId)) {
        return validationErrorResponse(res, [
          { field: 'orderId', message: 'Invalid order ID' }
        ]);
      }

      // Validate tracking number
      if (!trackingNumber || typeof trackingNumber !== 'string' || trackingNumber.trim().length === 0) {
        return validationErrorResponse(res, [
          { field: 'trackingNumber', message: 'Tracking number is required' }
        ]);
      }

      // Validate tracking carrier
      if (!trackingCarrier || typeof trackingCarrier !== 'string' || trackingCarrier.trim().length === 0) {
        return validationErrorResponse(res, [
          { field: 'trackingCarrier', message: 'Tracking carrier is required' }
        ]);
      }

      await sellerOrderService.updateOrderTracking(
        parsedOrderId,
        {
          trackingNumber: trackingNumber.trim(),
          trackingCarrier: trackingCarrier.trim(),
          estimatedDelivery,
          notes,
        }
      );

      return successResponse(res, {
        message: 'Order tracking updated successfully',
        orderId: parsedOrderId,
        trackingNumber: trackingNumber.trim(),
        trackingCarrier: trackingCarrier.trim(),
      }, 200);
    } catch (error) {
      safeLogger.error('Error updating order tracking:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Order not found');
        }
        if (error.message.includes('not authorized')) {
          return errorResponse(res, 'NOT_AUTHORIZED', 'Not authorized to update this order', 403);
        }
      }

      return errorResponse(
        res,
        'TRACKING_UPDATE_ERROR',
        'Failed to update order tracking',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * GET /api/marketplace/seller/orders/:orderId
 * Get single order details
 */
router.get('/seller/orders/detail/:orderId',
  rateLimitWithCache(req => `order_detail:${req.ip}`, 120, 60), // 120 requests per minute
  cachingMiddleware.cache('orderDetail', { ttl: 60 }), // Cache for 1 minute
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

      // Validate orderId
      const parsedOrderId = parseInt(orderId, 10);
      if (isNaN(parsedOrderId)) {
        return validationErrorResponse(res, [
          { field: 'orderId', message: 'Invalid order ID' }
        ]);
      }

      const order = await sellerOrderService.getOrderById(parsedOrderId);

      return successResponse(res, order, 200);
    } catch (error) {
      safeLogger.error('Error fetching order details:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Order not found');
        }
      }

      return errorResponse(
        res,
        'ORDER_FETCH_ERROR',
        'Failed to fetch order details',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

export default router;
