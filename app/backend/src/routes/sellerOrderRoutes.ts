import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { sellerOrderService } from '../services/sellerOrderService';
import { SellerWorkflowService } from '../services/sellerWorkflowService';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';
import { cachingMiddleware, rateLimitWithCache } from '../middleware/cachingMiddleware';

const router = Router();
const sellerWorkflowService = new SellerWorkflowService();

/**
 * GET /api/marketplace/seller/orders/:walletAddress
 * Get all orders for a seller
 *
 * Note: This router is mounted at /api/marketplace/seller/orders
 * so the route path is just /:walletAddress
 */
router.get('/:walletAddress',
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
router.put('/:orderId/status', csrfProtection,
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

      await sellerOrderService.updateOrderStatus(parsedOrderId.toString(), status, notes);

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
router.put('/:orderId/tracking', csrfProtection,
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
        parsedOrderId.toString(),
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
router.get('/detail/:orderId',
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

      const order = await sellerOrderService.getOrderById(parsedOrderId.toString());

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

/**
 * POST /api/marketplace/seller/orders/bulk-status
 * Bulk update order status
 */
router.post('/bulk-status',
  authMiddleware,
  rateLimitWithCache(req => `bulk_status:${req.ip}`, 10, 60), // 10 requests per minute
  cachingMiddleware.invalidate('sellerOrders'),
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderIds, status, notes } = req.body;

      // Validate orderIds
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return validationErrorResponse(res, [
          { field: 'orderIds', message: 'orderIds must be a non-empty array' }
        ]);
      }

      if (orderIds.length > 50) {
        return validationErrorResponse(res, [
          { field: 'orderIds', message: 'Maximum 50 orders can be updated at once' }
        ]);
      }

      // Validate status
      const validStatuses = ['pending', 'processing', 'ready_to_ship', 'shipped', 'delivered', 'completed', 'cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return validationErrorResponse(res, [
          { field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` }
        ]);
      }

      const result = await sellerOrderService.bulkUpdateStatus(orderIds, status, sellerId, notes);

      return successResponse(res, {
        message: `Bulk status update completed`,
        success: result.success,
        failed: result.failed,
        errors: result.errors,
      }, 200);
    } catch (error) {
      safeLogger.error('Error bulk updating order status:', error);
      return errorResponse(
        res,
        'BULK_UPDATE_ERROR',
        'Failed to bulk update order status',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * GET /api/marketplace/seller/orders/:orderId/messages
 * Get messages for an order
 */
router.get('/:orderId/messages',
  authMiddleware,
  rateLimitWithCache(req => `order_messages:${req.ip}`, 60, 60),
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderId } = req.params;

      const messages = await sellerOrderService.getOrderMessages(orderId, sellerId);

      return successResponse(res, { messages }, 200);
    } catch (error) {
      safeLogger.error('Error fetching order messages:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Order not found');
        }
        if (error.message.includes('not authorized')) {
          return errorResponse(res, 'NOT_AUTHORIZED', error.message, 403);
        }
      }

      return errorResponse(
        res,
        'MESSAGES_FETCH_ERROR',
        'Failed to fetch order messages',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * POST /api/marketplace/seller/orders/:orderId/messages
 * Send a message on an order
 */
router.post('/:orderId/messages',
  authMiddleware,
  rateLimitWithCache(req => `send_message:${req.ip}`, 30, 60),
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderId } = req.params;
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return validationErrorResponse(res, [
          { field: 'message', message: 'Message is required' }
        ]);
      }

      if (message.length > 2000) {
        return validationErrorResponse(res, [
          { field: 'message', message: 'Message must be less than 2000 characters' }
        ]);
      }

      const result = await sellerOrderService.sendOrderMessage(orderId, sellerId, message.trim());

      return successResponse(res, {
        message: 'Message sent successfully',
        ...result,
      }, 201);
    } catch (error) {
      safeLogger.error('Error sending order message:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Order not found');
        }
        if (error.message.includes('not authorized')) {
          return errorResponse(res, 'NOT_AUTHORIZED', error.message, 403);
        }
      }

      return errorResponse(
        res,
        'MESSAGE_SEND_ERROR',
        'Failed to send message',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * GET /api/marketplace/seller/orders/export
 * Export orders to CSV
 */
router.get('/export',
  authMiddleware,
  rateLimitWithCache(req => `order_export:${req.ip}`, 5, 60), // 5 requests per minute
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderIds } = req.query;
      const parsedOrderIds = orderIds ? String(orderIds).split(',') : undefined;

      const csv = await sellerOrderService.exportOrdersToCSV(sellerId, parsedOrderIds);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=orders-${Date.now()}.csv`);
      return res.send(csv);
    } catch (error) {
      safeLogger.error('Error exporting orders:', error);
      return errorResponse(
        res,
        'EXPORT_ERROR',
        'Failed to export orders',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });


/**
 * POST /api/marketplace/seller/orders/:orderId/process
 * Start processing an order
 */
router.post('/:orderId/process',
  authMiddleware,
  rateLimitWithCache(req => `order_process:${req.ip}`, 30, 60),
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderId } = req.params;
      await sellerWorkflowService.startProcessing(orderId, sellerId);

      return successResponse(res, { message: 'Order processing started' }, 200);
    } catch (error: any) {
      if (error.message.includes('not found')) return notFoundResponse(res, error.message);
      if (error.message.includes('authorized')) return errorResponse(res, 'FORBIDDEN', error.message, 403);
      return errorResponse(res, 'PROCESS_ERROR', error.message, 500);
    }
  }
);

/**
 * POST /api/marketplace/seller/orders/:orderId/ready
 * Mark order as ready to ship
 */
router.post('/:orderId/ready',
  authMiddleware,
  rateLimitWithCache(req => `order_ready:${req.ip}`, 30, 60),
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderId } = req.params;
      const packageDetails = req.body;
      const result = await sellerWorkflowService.markReadyToShip(orderId, sellerId, packageDetails);

      return successResponse(res, result, 200);
    } catch (error: any) {
      if (error.message.includes('not found')) return notFoundResponse(res, error.message);
      if (error.message.includes('authorized')) return errorResponse(res, 'FORBIDDEN', error.message, 403);
      return errorResponse(res, 'READY_ERROR', error.message, 500);
    }
  }
);

/**
 * POST /api/marketplace/seller/orders/:orderId/ship
 * Confirm shipment
 */
router.post('/:orderId/ship',
  authMiddleware,
  rateLimitWithCache(req => `order_ship:${req.ip}`, 30, 60),
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderId } = req.params;
      const { trackingNumber, carrier } = req.body;

      if (!trackingNumber || !carrier) {
        return validationErrorResponse(res, [{ field: 'tracking', message: 'Tracking number and carrier required' }]);
      }

      const result = await sellerWorkflowService.confirmShipment(orderId, sellerId, trackingNumber, carrier);

      return successResponse(res, result, 200);
    } catch (error: any) {
      if (error.message.includes('Invalid tracking')) return validationErrorResponse(res, [{ field: 'trackingNumber', message: error.message }]);
      if (error.message.includes('not found')) return notFoundResponse(res, error.message);
      if (error.message.includes('authorized')) return errorResponse(res, 'FORBIDDEN', error.message, 403);
      return errorResponse(res, 'SHIP_ERROR', error.message, 500);
    }
  }
);

/**
 * GET /api/marketplace/seller/orders/:orderId/packing-slip
 * Get packing slip
 */
router.get('/:orderId/packing-slip',
  authMiddleware,
  rateLimitWithCache(req => `order_slip:${req.ip}`, 60, 60),
  async (req: Request, res: Response) => {
    try {
      const sellerId = (req as any).user?.id;
      if (!sellerId) return errorResponse(res, 'UNAUTHORIZED', 'User not authenticated', 401);

      const { orderId } = req.params;
      const result = await sellerWorkflowService.getPackingSlip(orderId, sellerId);

      return successResponse(res, result, 200);
    } catch (error: any) {
      if (error.message.includes('not found')) return notFoundResponse(res, error.message);
      if (error.message.includes('authorized')) return errorResponse(res, 'FORBIDDEN', error.message, 403);
      return errorResponse(res, 'SLIP_ERROR', error.message, 500);
    }
  }
);

export default router;
