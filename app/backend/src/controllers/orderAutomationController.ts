import { Request, Response } from 'express';
import { orderAutomationService } from '../services/orderAutomationService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

class OrderAutomationController {
    /**
     * GET /api/orders/:orderId/automation-log
     * Get automation history for an order
     */
    async getAutomationLog(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;

            const history = await orderAutomationService.getAutomationHistory(orderId);

            res.json(apiResponse.success(history, 'Automation log retrieved'));
        } catch (error) {
            safeLogger.error('Error getting automation log:', error);
            res.status(500).json(apiResponse.error('Failed to get automation log'));
        }
    }

    /**
     * POST /api/orders/:orderId/automation/trigger
     * Manually trigger automation for an order
     */
    async triggerAutomation(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;

            await orderAutomationService.processOrder(orderId);

            res.json(apiResponse.success(null, 'Automation triggered successfully'));
        } catch (error) {
            safeLogger.error('Error triggering automation:', error);
            res.status(500).json(apiResponse.error('Failed to trigger automation'));
        }
    }

    /**
     * GET /api/automation/rules
     * Get all automation rules and their status
     */
    async getRules(req: Request, res: Response): Promise<void> {
        try {
            const rules = orderAutomationService.getRules();

            res.json(apiResponse.success(rules, 'Automation rules retrieved'));
        } catch (error) {
            safeLogger.error('Error getting automation rules:', error);
            res.status(500).json(apiResponse.error('Failed to get automation rules'));
        }
    }

    /**
     * PUT /api/automation/rules/:ruleName
     * Enable or disable an automation rule
     */
    async updateRule(req: Request, res: Response): Promise<void> {
        try {
            const { ruleName } = req.params;
            const { enabled } = req.body;

            if (typeof enabled !== 'boolean') {
                res.status(400).json(apiResponse.error('enabled must be a boolean', 400));
                return;
            }

            orderAutomationService.setRuleEnabled(ruleName, enabled);

            res.json(apiResponse.success(null, `Rule ${ruleName} ${enabled ? 'enabled' : 'disabled'}`));
        } catch (error) {
            safeLogger.error('Error updating automation rule:', error);
            res.status(500).json(apiResponse.error('Failed to update automation rule'));
        }
    }

    /**
     * POST /api/automation/process-all
     * Process all orders (admin only)
     */
    async processAll(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Add admin check
            const result = await orderAutomationService.processAllOrders();

            res.json(apiResponse.success(result, 'Batch automation completed'));
        } catch (error) {
            safeLogger.error('Error processing all orders:', error);
            res.status(500).json(apiResponse.error('Failed to process orders'));
        }
    }
}

export const orderAutomationController = new OrderAutomationController();
