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

export default router;
