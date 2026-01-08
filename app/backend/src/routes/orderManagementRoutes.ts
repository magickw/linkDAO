import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { orderManagementController } from '../controllers/orderManagementController';

const router = Router();

// Order details and management
router.get('/:orderId', orderManagementController.getOrderDetails.bind(orderManagementController));
router.get('/details/:orderId', orderManagementController.getOrderDetails.bind(orderManagementController));
router.get('/user/:walletAddress', orderManagementController.getUserOrders.bind(orderManagementController));
router.put('/status/:orderId', csrfProtection, orderManagementController.updateOrderStatus.bind(orderManagementController));
router.put('/tracking/:orderId', csrfProtection, orderManagementController.addOrderTracking.bind(orderManagementController));

// Analytics
router.get('/analytics/:walletAddress', orderManagementController.getOrderAnalytics.bind(orderManagementController));
router.get('/analytics', orderManagementController.getPlatformOrderAnalytics.bind(orderManagementController));

export default router;
