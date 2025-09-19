import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { OrderCreationController } from '../controllers/orderCreationController';
import { validateRequest } from '../middleware/validateRequest';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const orderCreationController = new OrderCreationController();

// Apply rate limiting to all order creation routes
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many order requests, please try again later'
}));

/**
 * @route POST /api/orders/create
 * @desc Create a new order
 * @access Public
 */
router.post('/create',
  [
    body('listingId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Listing ID is required'),
    body('buyerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Buyer address must be a valid Ethereum address'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('shippingAddress')
      .isObject()
      .withMessage('Shipping address is required'),
    body('shippingAddress.fullName')
      .isString()
      .isLength({ min: 2 })
      .withMessage('Full name is required and must be at least 2 characters'),
    body('shippingAddress.addressLine1')
      .isString()
      .isLength({ min: 5 })
      .withMessage('Address line 1 is required and must be at least 5 characters'),
    body('shippingAddress.city')
      .isString()
      .isLength({ min: 2 })
      .withMessage('City is required and must be at least 2 characters'),
    body('shippingAddress.state')
      .isString()
      .isLength({ min: 2 })
      .withMessage('State/Province is required'),
    body('shippingAddress.postalCode')
      .isString()
      .isLength({ min: 3 })
      .withMessage('Postal code is required and must be at least 3 characters'),
    body('shippingAddress.country')
      .isString()
      .isLength({ min: 2 })
      .withMessage('Country is required'),
    body('shippingAddress.phoneNumber')
      .optional()
      .isString()
      .matches(/^\+?[\d\s\-\(\)]{10,}$/)
      .withMessage('Phone number format is invalid'),
    body('paymentMethod')
      .isIn(['crypto', 'fiat'])
      .withMessage('Payment method must be either crypto or fiat'),
    body('paymentDetails')
      .optional()
      .isObject()
      .withMessage('Payment details must be an object'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  validateRequest,
  orderCreationController.createOrder.bind(orderCreationController)
);

/**
 * @route POST /api/orders/validate
 * @desc Validate order request without creating
 * @access Public
 */
router.post('/validate',
  [
    body('listingId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Listing ID is required'),
    body('buyerAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Buyer address must be a valid Ethereum address'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('paymentMethod')
      .optional()
      .isIn(['crypto', 'fiat'])
      .withMessage('Payment method must be either crypto or fiat')
  ],
  validateRequest,
  orderCreationController.validateOrder.bind(orderCreationController)
);

/**
 * @route GET /api/orders/:orderId/summary
 * @desc Get order summary
 * @access Public
 */
router.get('/:orderId/summary',
  [
    param('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required')
  ],
  validateRequest,
  orderCreationController.getOrderSummary.bind(orderCreationController)
);

/**
 * @route PUT /api/orders/:orderId/status
 * @desc Update order status
 * @access Public
 */
router.put('/:orderId/status',
  [
    param('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
    body('status')
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid status value'),
    body('message')
      .optional()
      .isString()
      .withMessage('Message must be a string'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  validateRequest,
  orderCreationController.updateOrderStatus.bind(orderCreationController)
);

/**
 * @route POST /api/orders/:orderId/cancel
 * @desc Cancel order
 * @access Public
 */
router.post('/:orderId/cancel',
  [
    param('orderId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Order ID is required'),
    body('reason')
      .isString()
      .isLength({ min: 5 })
      .withMessage('Cancellation reason is required and must be at least 5 characters'),
    body('cancelledBy')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Cancelled by field is required')
  ],
  validateRequest,
  orderCreationController.cancelOrder.bind(orderCreationController)
);

/**
 * @route GET /api/orders/stats
 * @desc Get order creation statistics
 * @access Public
 */
router.get('/stats',
  [
    query('timeframe')
      .optional()
      .isIn(['1d', '7d', '30d', '90d', '1y'])
      .withMessage('Invalid timeframe'),
    query('sellerAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid seller address format'),
    query('buyerAddress')
      .optional()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid buyer address format')
  ],
  validateRequest,
  orderCreationController.getOrderStats.bind(orderCreationController)
);

/**
 * @route POST /api/orders/bulk
 * @desc Bulk order operations
 * @access Public
 */
router.post('/bulk',
  [
    body('operation')
      .isIn(['update_status', 'cancel', 'export'])
      .withMessage('Invalid bulk operation'),
    body('orderIds')
      .isArray({ min: 1 })
      .withMessage('Order IDs array is required and must not be empty'),
    body('orderIds.*')
      .isString()
      .withMessage('Each order ID must be a string'),
    body('data')
      .optional()
      .isObject()
      .withMessage('Data must be an object')
  ],
  validateRequest,
  orderCreationController.bulkOrderOperation.bind(orderCreationController)
);

/**
 * @route GET /api/orders/health
 * @desc Health check for order creation system
 * @access Public
 */
router.get('/health',
  orderCreationController.healthCheck.bind(orderCreationController)
);

export default router;