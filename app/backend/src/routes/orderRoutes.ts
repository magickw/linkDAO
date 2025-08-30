import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const orderController = new OrderController();

// Rate limiting for order operations
const orderRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many order requests from this IP, please try again later.'
});

const createOrderRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 order creations per minute
  message: 'Too many order creation attempts, please try again later.'
});

// Validation schemas
const createOrderSchema = {
  body: {
    type: 'object',
    required: ['listingId', 'buyerAddress', 'sellerAddress', 'amount', 'paymentToken'],
    properties: {
      listingId: { type: 'string' },
      buyerAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      sellerAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      amount: { type: 'string' },
      paymentToken: { type: 'string' },
      quantity: { type: 'number', minimum: 1 },
      shippingAddress: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string' },
          phone: { type: 'string' }
        }
      },
      notes: { type: 'string' }
    }
  }
};

const updateOrderStatusSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { 
        type: 'string',
        enum: ['CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED']
      },
      metadata: { type: 'object' }
    }
  }
};

const processShippingSchema = {
  body: {
    type: 'object',
    required: ['carrier', 'service', 'fromAddress', 'packageInfo'],
    properties: {
      carrier: { type: 'string', enum: ['FEDEX', 'UPS', 'DHL', 'USPS'] },
      service: { type: 'string' },
      fromAddress: {
        type: 'object',
        required: ['name', 'street', 'city', 'state', 'postalCode', 'country'],
        properties: {
          name: { type: 'string' },
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string' },
          phone: { type: 'string' }
        }
      },
      packageInfo: {
        type: 'object',
        required: ['weight', 'dimensions', 'value', 'description'],
        properties: {
          weight: { type: 'number', minimum: 0.1 },
          dimensions: {
            type: 'object',
            required: ['length', 'width', 'height'],
            properties: {
              length: { type: 'number', minimum: 1 },
              width: { type: 'number', minimum: 1 },
              height: { type: 'number', minimum: 1 }
            }
          },
          value: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  }
};

const initiateDisputeSchema = {
  body: {
    type: 'object',
    required: ['initiatorAddress', 'reason'],
    properties: {
      initiatorAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
      reason: { type: 'string', minLength: 10 },
      evidence: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
};

// Order Management Routes

/**
 * @route POST /api/orders
 * @desc Create a new order
 * @access Private
 */
router.post(
  '/',
  createOrderRateLimit,
  authMiddleware,
  validateRequest(createOrderSchema),
  orderController.createOrder.bind(orderController)
);

/**
 * @route GET /api/orders/:id
 * @desc Get order by ID
 * @access Private
 */
router.get(
  '/:id',
  orderRateLimit,
  authMiddleware,
  orderController.getOrderById.bind(orderController)
);

/**
 * @route GET /api/orders/user/:userAddress
 * @desc Get orders by user address
 * @access Private
 */
router.get(
  '/user/:userAddress',
  orderRateLimit,
  authMiddleware,
  orderController.getOrdersByUser.bind(orderController)
);

/**
 * @route PUT /api/orders/:orderId/status
 * @desc Update order status
 * @access Private
 */
router.put(
  '/:orderId/status',
  orderRateLimit,
  authMiddleware,
  validateRequest(updateOrderStatusSchema),
  orderController.updateOrderStatus.bind(orderController)
);

/**
 * @route POST /api/orders/:orderId/shipping
 * @desc Process shipping for an order
 * @access Private
 */
router.post(
  '/:orderId/shipping',
  orderRateLimit,
  authMiddleware,
  validateRequest(processShippingSchema),
  orderController.processShipping.bind(orderController)
);

/**
 * @route POST /api/orders/:orderId/delivery/confirm
 * @desc Confirm delivery
 * @access Private
 */
router.post(
  '/:orderId/delivery/confirm',
  orderRateLimit,
  authMiddleware,
  orderController.confirmDelivery.bind(orderController)
);

/**
 * @route GET /api/orders/:orderId/history
 * @desc Get order history and timeline
 * @access Private
 */
router.get(
  '/:orderId/history',
  orderRateLimit,
  authMiddleware,
  orderController.getOrderHistory.bind(orderController)
);

/**
 * @route GET /api/orders/analytics/:userAddress
 * @desc Get order analytics for a user
 * @access Private
 */
router.get(
  '/analytics/:userAddress',
  orderRateLimit,
  authMiddleware,
  orderController.getOrderAnalytics.bind(orderController)
);

/**
 * @route POST /api/orders/:orderId/dispute
 * @desc Initiate dispute for an order
 * @access Private
 */
router.post(
  '/:orderId/dispute',
  orderRateLimit,
  authMiddleware,
  validateRequest(initiateDisputeSchema),
  orderController.initiateDispute.bind(orderController)
);

/**
 * @route DELETE /api/orders/:orderId
 * @desc Cancel order
 * @access Private
 */
router.delete(
  '/:orderId',
  orderRateLimit,
  authMiddleware,
  orderController.cancelOrder.bind(orderController)
);

/**
 * @route POST /api/orders/:orderId/refund
 * @desc Refund order
 * @access Private
 */
router.post(
  '/:orderId/refund',
  orderRateLimit,
  authMiddleware,
  orderController.refundOrder.bind(orderController)
);

/**
 * @route PUT /api/orders/bulk/status
 * @desc Bulk update order status
 * @access Private
 */
router.put(
  '/bulk/status',
  orderRateLimit,
  authMiddleware,
  orderController.bulkUpdateOrders.bind(orderController)
);

// Shipping Routes

/**
 * @route POST /api/orders/shipping/rates
 * @desc Get shipping rates
 * @access Private
 */
router.post(
  '/shipping/rates',
  orderRateLimit,
  authMiddleware,
  orderController.getShippingRates.bind(orderController)
);

/**
 * @route GET /api/orders/shipping/track/:trackingNumber/:carrier
 * @desc Track shipment
 * @access Private
 */
router.get(
  '/shipping/track/:trackingNumber/:carrier',
  orderRateLimit,
  authMiddleware,
  orderController.trackShipment.bind(orderController)
);

/**
 * @route POST /api/orders/shipping/validate-address
 * @desc Validate shipping address
 * @access Private
 */
router.post(
  '/shipping/validate-address',
  orderRateLimit,
  authMiddleware,
  orderController.validateAddress.bind(orderController)
);

// Blockchain Events Routes

/**
 * @route GET /api/orders/:orderId/blockchain-events
 * @desc Get blockchain events for an order
 * @access Private
 */
router.get(
  '/:orderId/blockchain-events',
  orderRateLimit,
  authMiddleware,
  orderController.getOrderBlockchainEvents.bind(orderController)
);

// Notification Routes

/**
 * @route GET /api/orders/notifications/:userAddress
 * @desc Get order notifications for a user
 * @access Private
 */
router.get(
  '/notifications/:userAddress',
  orderRateLimit,
  authMiddleware,
  orderController.getOrderNotifications.bind(orderController)
);

/**
 * @route PUT /api/orders/notifications/:notificationId/read
 * @desc Mark notification as read
 * @access Private
 */
router.put(
  '/notifications/:notificationId/read',
  orderRateLimit,
  authMiddleware,
  orderController.markNotificationAsRead.bind(orderController)
);

/**
 * @route PUT /api/orders/notifications/:userAddress/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put(
  '/notifications/:userAddress/read-all',
  orderRateLimit,
  authMiddleware,
  orderController.markAllNotificationsAsRead.bind(orderController)
);

/**
 * @route GET /api/orders/notifications/:userAddress/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get(
  '/notifications/:userAddress/unread-count',
  orderRateLimit,
  authMiddleware,
  orderController.getUnreadNotificationCount.bind(orderController)
);

/**
 * @route PUT /api/orders/notifications/:userAddress/preferences
 * @desc Update notification preferences
 * @access Private
 */
router.put(
  '/notifications/:userAddress/preferences',
  orderRateLimit,
  authMiddleware,
  orderController.updateNotificationPreferences.bind(orderController)
);

/**
 * @route GET /api/orders/notifications/:userAddress/preferences
 * @desc Get notification preferences
 * @access Private
 */
router.get(
  '/notifications/:userAddress/preferences',
  orderRateLimit,
  authMiddleware,
  orderController.getNotificationPreferences.bind(orderController)
);

// Statistics Routes (Admin only)

/**
 * @route GET /api/orders/statistics/overview
 * @desc Get order statistics overview
 * @access Admin
 */
router.get(
  '/statistics/overview',
  orderRateLimit,
  authMiddleware,
  // TODO: Add admin middleware
  orderController.getOrderStatistics.bind(orderController)
);

export default router;