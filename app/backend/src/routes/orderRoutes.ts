import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { OrderController } from '../controllers/orderController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimit } from 'express-rate-limit';
import { body, param } from 'express-validator';

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
const createOrderValidation = [
  body('listingId').isString().notEmpty(),
  body('buyerAddress').matches(/^0x[a-fA-F0-9]{40}$/),
  body('sellerAddress').matches(/^0x[a-fA-F0-9]{40}$/),
  body('amount').optional().isString(),
  body('price').optional().isString(), // Alias for amount
  body('paymentToken').optional().isString(),
  body('tokenAddress').optional().isString(), // Alias for paymentToken
  body('quantity').optional().isInt({ min: 1 }),
  body('shippingAddress.name').optional().isString(),
  body('shippingAddress.street').optional().isString(),
  body('shippingAddress.city').optional().isString(),
  body('shippingAddress.state').optional().isString(),
  body('shippingAddress.postalCode').optional().isString(),
  body('shippingAddress.country').optional().isString(),
  body('shippingAddress.phone').optional().isString(),
  body('shippingAddress.phone').optional().isString(),
  body('notes').optional().isString(),
  // Custom validation to ensure required fields are present (either direct or alias)
  body().custom((value) => {
    if (!value.amount && !value.price) {
      throw new Error('Amount (or price) is required');
    }
    if (!value.paymentToken && !value.tokenAddress) {
      throw new Error('Payment token (or token address) is required');
    }
    return true;
  })
];

const updateOrderStatusValidation = [
  body('status').isIn(['CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED']),
  body('metadata').optional().isObject()
];

const processShippingValidation = [
  body('carrier').isIn(['FEDEX', 'UPS', 'DHL', 'USPS']),
  body('service').isString().notEmpty(),
  body('fromAddress.name').isString().notEmpty(),
  body('fromAddress.street').isString().notEmpty(),
  body('fromAddress.city').isString().notEmpty(),
  body('fromAddress.state').isString().notEmpty(),
  body('fromAddress.postalCode').isString().notEmpty(),
  body('fromAddress.country').isString().notEmpty(),
  body('fromAddress.phone').optional().isString(),
  body('packageInfo.weight').isFloat({ min: 0.1 }),
  body('packageInfo.dimensions.length').isFloat({ min: 1 }),
  body('packageInfo.dimensions.width').isFloat({ min: 1 }),
  body('packageInfo.dimensions.height').isFloat({ min: 1 }),
  body('packageInfo.value').isString().notEmpty(),
  body('packageInfo.description').isString().notEmpty()
];

const initiateDisputeValidation = [
  body('initiatorAddress').matches(/^0x[a-fA-F0-9]{40}$/),
  body('reason').isString().isLength({ min: 10 }),
  body('evidence').optional().isArray()
];

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
  createOrderValidation,
  validateRequest,
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
  updateOrderStatusValidation,
  validateRequest,
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
  processShippingValidation,
  validateRequest,
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
 * @route GET /api/orders/:orderId/timeline
 * @desc Get detailed order timeline with milestones
 * @access Private
 */
router.get(
  '/:orderId/timeline',
  orderRateLimit,
  authMiddleware,
  orderController.getTimeline.bind(orderController)
);

/**
 * @route GET /api/orders/:orderId/tracking
 * @desc Get tracking info for an order
 * @access Private
 */
router.get(
  '/:orderId/tracking',
  orderRateLimit,
  authMiddleware,
  orderController.getTrackingInfo.bind(orderController)
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
  initiateDisputeValidation,
  validateRequest,
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
 * @route POST /api/orders/:orderId/cancel-request
 * @desc Request order cancellation
 * @access Private
 */
router.post(
  '/:orderId/cancel-request',
  orderRateLimit,
  authMiddleware,
  validateRequest,
  orderController.requestCancellation.bind(orderController)
);

/**
 * @route POST /api/orders/:orderId/cancel/approve
 * @desc Approve cancellation request (Seller only)
 * @access Private
 */
router.post(
  '/:orderId/cancel/approve',
  orderRateLimit,
  authMiddleware,
  orderController.approveCancellation.bind(orderController)
);

/**
 * @route POST /api/orders/:orderId/cancel/deny
 * @desc Deny cancellation request (Seller only)
 * @access Private
 */
router.post(
  '/:orderId/cancel/deny',
  orderRateLimit,
  authMiddleware,
  orderController.denyCancellation.bind(orderController)
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
 * @route GET /api/orders/:orderId/receipt
 * @desc Get order receipt
 * @access Private
 */
router.get(
  '/:orderId/receipt',
  orderRateLimit,
  authMiddleware,
  orderController.getReceipt.bind(orderController)
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
