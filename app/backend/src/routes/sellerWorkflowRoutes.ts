import { Router } from 'express';
import { SellerWorkflowController } from '../controllers/sellerWorkflowController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const controller = new SellerWorkflowController();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

/**
 * @route GET /api/seller/orders/dashboard
 * @desc Get seller order dashboard
 * @access Private
 */
router.get(
    '/dashboard',
    limiter,
    authMiddleware,
    controller.getDashboard.bind(controller)
);

/**
 * @route POST /api/seller/orders/:orderId/process
 * @desc Start processing an order
 * @access Private
 */
router.post(
    '/:orderId/process',
    limiter,
    authMiddleware,
    controller.startProcessing.bind(controller)
);

/**
 * @route POST /api/seller/orders/:orderId/ready
 * @desc Mark order as ready to ship (generate label)
 * @access Private
 */
router.post(
    '/:orderId/ready',
    limiter,
    authMiddleware,
    controller.markReadyToShip.bind(controller)
);

/**
 * @route POST /api/seller/orders/:orderId/ship
 * @desc Confirm shipment (add tracking)
 * @access Private
 */
router.post(
    '/:orderId/ship',
    limiter,
    authMiddleware,
    controller.confirmShipment.bind(controller)
);

/**
 * @route GET /api/seller/orders/:orderId/packing-slip
 * @desc Get packing slip
 * @access Private
 */
router.get(
    '/:orderId/packing-slip',
    limiter,
    authMiddleware,
    controller.getPackingSlip.bind(controller)
);

/**
 * @route POST /api/seller/orders/bulk/packing-slips
 * @desc Bulk print packing slips
 * @access Private
 */
router.post(
    '/bulk/packing-slips',
    limiter,
    authMiddleware,
    controller.bulkPrintPackingSlips.bind(controller)
);

/**
 * @route POST /api/seller/orders/bulk/labels
 * @desc Bulk print shipping labels
 * @access Private
 */
router.post(
    '/bulk/labels',
    limiter,
    authMiddleware,
    controller.bulkPrintShippingLabels.bind(controller)
);

/**
 * @route POST /api/seller/orders/bulk/ship
 * @desc Bulk ship orders
 * @access Private
 */
router.post(
    '/bulk/ship',
    limiter,
    authMiddleware,
    controller.bulkShipOrders.bind(controller)
);

// ==================== SERVICE DELIVERY ROUTES ====================

/**
 * @route POST /api/seller/orders/:orderId/service/schedule
 * @desc Schedule a service delivery
 * @access Private
 */
router.post(
    '/:orderId/service/schedule',
    limiter,
    authMiddleware,
    controller.scheduleService.bind(controller)
);

/**
 * @route GET /api/seller/orders/:orderId/service
 * @desc Get service details
 * @access Private
 */
router.get(
    '/:orderId/service',
    limiter,
    authMiddleware,
    controller.getServiceDetails.bind(controller)
);

/**
 * @route POST /api/seller/orders/:orderId/service/deliverables
 * @desc Add a deliverable to a service order
 * @access Private
 */
router.post(
    '/:orderId/service/deliverables',
    limiter,
    authMiddleware,
    controller.addServiceDeliverable.bind(controller)
);

/**
 * @route DELETE /api/seller/orders/:orderId/service/deliverables/:deliverableId
 * @desc Remove a deliverable from a service order
 * @access Private
 */
router.delete(
    '/:orderId/service/deliverables/:deliverableId',
    limiter,
    authMiddleware,
    controller.removeServiceDeliverable.bind(controller)
);

/**
 * @route POST /api/seller/orders/:orderId/service/start
 * @desc Start a service
 * @access Private
 */
router.post(
    '/:orderId/service/start',
    limiter,
    authMiddleware,
    controller.startService.bind(controller)
);

/**
 * @route POST /api/seller/orders/:orderId/service/complete
 * @desc Mark service as complete
 * @access Private
 */
router.post(
    '/:orderId/service/complete',
    limiter,
    authMiddleware,
    controller.markServiceComplete.bind(controller)
);

export default router;
