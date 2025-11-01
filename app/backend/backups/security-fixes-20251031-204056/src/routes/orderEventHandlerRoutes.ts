import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validation';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { orderEventHandlerController } from '../controllers/orderEventHandlerController';
import { csrfProtection } from '../middleware/csrfProtection';

const router = express.Router();

// Apply authentication middleware to all order event routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many order event requests from this IP'
}));

// Handle order event
router.post('/handle', csrfProtection, 
  validateRequest({
    body: {
      orderId: { type: 'number', required: true },
      eventType: { type: 'string', required: true },
      eventData: { type: 'object', optional: true }
    }
  }),
  orderEventHandlerController.handleOrderEvent
);

// Process pending order events
router.post('/process-pending', csrfProtection, 
  orderEventHandlerController.processPendingEvents
);

export default router;