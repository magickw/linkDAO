
import express from 'express';
import { ShippingController } from '../controllers/shippingController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const shippingController = new ShippingController();

// Apply auth to all shipping routes
router.use(authMiddleware);

// Rate calculation
router.post(
    '/rates',
    rateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many rate calculation requests' }),
    shippingController.calculateRates
);

// Label generation
router.post(
    '/labels',
    rateLimiter({ windowMs: 60 * 1000, max: 5, message: 'Too many label generation requests' }),
    shippingController.generateLabel
);

// Tracking
router.get(
    '/tracking/:trackingNumber',
    rateLimiter({ windowMs: 60 * 1000, max: 20, message: 'Too many tracking requests' }),
    shippingController.getTracking
);

export default router;
