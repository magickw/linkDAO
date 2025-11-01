import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { OrderCreationController } from '../controllers/orderCreationController';
import { csrfProtection } from '../middleware/csrfProtection';
import { apiLimiter } from '../middleware/rateLimiter';
import { csrfProtection } from '../middleware/csrfProtection';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const orderCreationController = new OrderCreationController();

// Order creation routes
router.post('/create', csrfProtection,  authenticateToken, apiLimiter, orderCreationController.createOrder.bind(orderCreationController));
router.get('/summary/:orderId', authenticateToken, apiLimiter, orderCreationController.getOrderSummary.bind(orderCreationController));
router.post('/cancel/:orderId', csrfProtection,  authenticateToken, apiLimiter, orderCreationController.cancelOrder.bind(orderCreationController));
router.get('/stats', authenticateToken, apiLimiter, orderCreationController.getOrderStats.bind(orderCreationController));

export default router;