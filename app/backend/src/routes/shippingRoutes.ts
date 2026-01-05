
import express from 'express';
import { ShippingController } from '../controllers/shippingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitWithCache } from '../middleware/rateLimitWithCache';

const router = express.Router();
const shippingController = new ShippingController();

// Apply auth to all shipping routes
router.use(authMiddleware);

// Rate calculation
router.post(
    '/rates',
    rateLimitWithCache('shipping_rates', 60, 10), // 10 request per minute
    shippingController.calculateRates
);

// Label generation
router.post(
    '/labels',
    rateLimitWithCache('shipping_labels', 60, 5), // 5 requests per minute
    shippingController.generateLabel
);

// Tracking
router.get(
    '/tracking/:trackingNumber',
    rateLimitWithCache('shipping_tracking', 60, 20),
    shippingController.getTracking
);

export default router;
