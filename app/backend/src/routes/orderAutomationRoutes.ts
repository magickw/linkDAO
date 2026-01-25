import express from 'express';
import { orderAutomationController } from '../controllers/orderAutomationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * GET /api/orders/:orderId/automation-log
 * Get automation history for an order
 */
router.get('/orders/:orderId/automation-log', orderAutomationController.getAutomationLog.bind(orderAutomationController));

/**
 * POST /api/orders/:orderId/automation/trigger
 * Manually trigger automation for an order
 */
router.post('/orders/:orderId/automation/trigger', authMiddleware, orderAutomationController.triggerAutomation.bind(orderAutomationController));

/**
 * GET /api/automation/rules
 * Get all automation rules and their status
 */
router.get('/automation/rules', authMiddleware, orderAutomationController.getRules.bind(orderAutomationController));

/**
 * PUT /api/automation/rules/:ruleName
 * Enable or disable an automation rule (admin only)
 */
router.put('/automation/rules/:ruleName', authMiddleware, orderAutomationController.updateRule.bind(orderAutomationController));

/**
 * POST /api/automation/process-all
 * Process all orders (admin/cron only)
 */
router.post('/automation/process-all', orderAutomationController.processAll.bind(orderAutomationController));

export default router;
