/**
 * Order Tracking Routes - API endpoints for order tracking and display system
 * Features: Order history, search, filtering, timeline, and notifications
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { OrderTrackingController } from '../controllers/orderTrackingController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validation';
import { csrfProtection } from '../middleware/csrfProtection';
import { body, param, query } from 'express-validator';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const orderTrackingController = new OrderTrackingController();

// Validation schemas
const orderIdValidation = [
  param('orderId').isString().notEmpty().withMessage('Order ID is required')
];

const userAddressValidation = [
  param('userAddress').isEthereumAddress().withMessage('Valid Ethereum address is required')
];

const searchValidation = [
  body('userAddress').isEthereumAddress().withMessage('Valid user address is required'),
  body('query').optional().isObject().withMessage('Query must be an object'),
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const statusUpdateValidation = [
  body('status').isIn([
    'CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 
    'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 
    'CANCELLED', 'REFUNDED'
  ]).withMessage('Invalid order status'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
];

const trackingValidation = [
  body('trackingNumber').isString().notEmpty().withMessage('Tracking number is required'),
  body('carrier').isString().notEmpty().withMessage('Carrier is required'),
  body('estimatedDelivery').optional().isISO8601().withMessage('Invalid estimated delivery date')
];

/**
 * @route GET /api/marketplace/orders/user/:userAddress
 * @desc Get order history for a user
 * @access Private
 */
router.get(
  '/user/:userAddress',
  authenticateToken,
  userAddressValidation,
  validateRequest,
  orderTrackingController.getOrderHistory.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/:orderId
 * @desc Get detailed order information by ID
 * @access Private
 */
router.get(
  '/:orderId',
  authenticateToken,
  orderIdValidation,
  validateRequest,
  orderTrackingController.getOrderById.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/:orderId/timeline
 * @desc Get order timeline/events
 * @access Private
 */
router.get(
  '/:orderId/timeline',
  authenticateToken,
  orderIdValidation,
  validateRequest,
  orderTrackingController.getOrderTimeline.bind(orderTrackingController)
);

/**
 * @route POST /api/marketplace/orders/search
 * @desc Search orders with advanced filtering
 * @access Private
 */
router.post(
  '/search',
  authenticateToken,
  searchValidation,
  validateRequest,
  orderTrackingController.searchOrders.bind(orderTrackingController)
);

/**
 * @route PUT /api/marketplace/orders/:orderId/status
 * @desc Update order status (seller only)
 * @access Private
 */
router.put(
  '/:orderId/status',
  authenticateToken,
  orderIdValidation,
  statusUpdateValidation,
  validateRequest,
  orderTrackingController.updateOrderStatus.bind(orderTrackingController)
);

/**
 * @route PUT /api/marketplace/orders/:orderId/tracking
 * @desc Add tracking information to order
 * @access Private
 */
router.put(
  '/:orderId/tracking',
  authenticateToken,
  orderIdValidation,
  trackingValidation,
  validateRequest,
  orderTrackingController.addTrackingInfo.bind(orderTrackingController)
);

/**
 * @route POST /api/marketplace/orders/:orderId/confirm-delivery
 * @desc Confirm delivery (buyer only)
 * @access Private
 */
router.post(
  '/:orderId/confirm-delivery',
  authenticateToken,
  orderIdValidation,
  validateRequest,
  orderTrackingController.confirmDelivery.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/statistics/:userAddress
 * @desc Get order statistics for dashboard
 * @access Private
 */
router.get(
  '/statistics/:userAddress',
  authenticateToken,
  userAddressValidation,
  [
    query('userType').optional().isIn(['buyer', 'seller']).withMessage('Invalid user type'),
    query('timeframe').optional().isIn(['week', 'month', 'year']).withMessage('Invalid timeframe')
  ],
  validateRequest,
  orderTrackingController.getOrderStatistics.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/:orderId/tracking
 * @desc Get tracking information for an order
 * @access Private
 */
router.get(
  '/:orderId/tracking',
  authenticateToken,
  orderIdValidation,
  validateRequest,
  orderTrackingController.getTrackingInfo.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/export/:userAddress
 * @desc Export order history to CSV
 * @access Private
 */
router.get(
  '/export/:userAddress',
  authenticateToken,
  userAddressValidation,
  [
    query('userType').optional().isIn(['buyer', 'seller']).withMessage('Invalid user type'),
    query('format').optional().isIn(['csv', 'json']).withMessage('Invalid export format'),
    query('status').optional().isString().withMessage('Status must be a string'),
    query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
    query('dateTo').optional().isISO8601().withMessage('Invalid date format')
  ],
  validateRequest,
  orderTrackingController.exportOrderHistory.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/notifications/:userAddress
 * @desc Get order notifications
 * @access Private
 */
router.get(
  '/notifications/:userAddress',
  authenticateToken,
  userAddressValidation,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  validateRequest,
  orderTrackingController.getOrderNotifications.bind(orderTrackingController)
);

/**
 * @route PUT /api/marketplace/orders/notifications/:notificationId/read
 * @desc Mark notification as read
 * @access Private
 */
router.put(
  '/notifications/:notificationId/read',
  authenticateToken,
  [param('notificationId').isString().notEmpty().withMessage('Notification ID is required')],
  validateRequest,
  orderTrackingController.markNotificationAsRead.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/bulk/status-counts/:userAddress
 * @desc Get order status counts for dashboard
 * @access Private
 */
router.get(
  '/bulk/status-counts/:userAddress',
  authenticateToken,
  userAddressValidation,
  [query('userType').optional().isIn(['buyer', 'seller']).withMessage('Invalid user type')],
  validateRequest,
  orderTrackingController.getOrderStatusCounts.bind(orderTrackingController)
);

/**
 * @route POST /api/marketplace/orders/bulk/update-status
 * @desc Bulk update order statuses
 * @access Private
 */
router.post(
  '/bulk/update-status',
  authenticateToken,
  [
    body('orderIds').isArray({ min: 1 }).withMessage('Order IDs array is required'),
    body('orderIds.*').isString().notEmpty().withMessage('Each order ID must be a non-empty string'),
    body('status').isIn([
      'CREATED', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 
      'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 
      'CANCELLED', 'REFUNDED'
    ]).withMessage('Invalid order status'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
  ],
  validateRequest,
  orderTrackingController.bulkUpdateOrderStatus.bind(orderTrackingController)
);

/**
 * @route GET /api/marketplace/orders/analytics/trends/:userAddress
 * @desc Get order trends and analytics
 * @access Private
 */
router.get(
  '/analytics/trends/:userAddress',
  authenticateToken,
  userAddressValidation,
  [
    query('userType').optional().isIn(['buyer', 'seller']).withMessage('Invalid user type'),
    query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
    query('groupBy').optional().isIn(['day', 'week', 'month']).withMessage('Invalid groupBy')
  ],
  validateRequest,
  orderTrackingController.getOrderTrends.bind(orderTrackingController)
);

export default router;