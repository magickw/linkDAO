import { Request, Response } from 'express';
import { shippingIntegrationService } from '../services/shippingIntegrationService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

class ShippingIntegrationController {
    /**
     * POST /api/shipping/rates
     * Get shipping rates for an order
     */
    async getRates(req: Request, res: Response): Promise<void> {
        try {
            const { fromAddress, toAddress, parcel } = req.body;

            if (!fromAddress || !toAddress || !parcel) {
                res.status(400).json(apiResponse.error('Missing required fields', 400));
                return;
            }

            const rates = await shippingIntegrationService.getRates(fromAddress, toAddress, parcel);

            res.json(apiResponse.success(rates, 'Shipping rates retrieved'));
        } catch (error) {
            safeLogger.error('Error getting shipping rates:', error);
            res.status(500).json(apiResponse.error('Failed to get shipping rates'));
        }
    }

    /**
     * POST /api/shipping/labels
     * Purchase a shipping label
     */
    async purchaseLabel(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const { orderId, rateId } = req.body;

            if (!orderId || !rateId) {
                res.status(400).json(apiResponse.error('Missing orderId or rateId', 400));
                return;
            }

            // TODO: Verify order belongs to user

            const label = await shippingIntegrationService.purchaseLabel(orderId, rateId);

            res.json(apiResponse.success(label, 'Shipping label purchased'));
        } catch (error) {
            safeLogger.error('Error purchasing shipping label:', error);
            res.status(500).json(apiResponse.error('Failed to purchase shipping label'));
        }
    }

    /**
     * GET /api/shipping/labels/:orderId
     * Get shipping label for an order
     */
    async getLabel(req: Request, res: Response): Promise<void> {
        try {
            const { orderId } = req.params;

            const label = await shippingIntegrationService.getLabelForOrder(orderId);

            if (!label) {
                res.status(404).json(apiResponse.error('Label not found', 404));
                return;
            }

            res.json(apiResponse.success(label, 'Shipping label retrieved'));
        } catch (error) {
            safeLogger.error('Error getting shipping label:', error);
            res.status(500).json(apiResponse.error('Failed to get shipping label'));
        }
    }

    /**
     * GET /api/shipping/track/:trackingNumber
     * Get tracking information
     */
    async getTracking(req: Request, res: Response): Promise<void> {
        try {
            const { trackingNumber } = req.params;
            const { carrier } = req.query;

            const tracking = await shippingIntegrationService.getTracking(
                trackingNumber,
                carrier as string
            );

            res.json(apiResponse.success(tracking, 'Tracking information retrieved'));
        } catch (error) {
            safeLogger.error('Error getting tracking info:', error);
            res.status(500).json(apiResponse.error('Failed to get tracking information'));
        }
    }

    /**
     * POST /api/shipping/webhooks/easypost
     * Handle EasyPost webhooks
     */
    async handleWebhook(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Verify webhook signature
            await shippingIntegrationService.handleWebhook(req.body);

            res.status(200).send('OK');
        } catch (error) {
            safeLogger.error('Error handling webhook:', error);
            res.status(500).send('Error');
        }
    }

    /**
     * POST /api/shipping/validate-address
     * Validate an address
     */
    async validateAddress(req: Request, res: Response): Promise<void> {
        try {
            const { address } = req.body;

            if (!address) {
                res.status(400).json(apiResponse.error('Address is required', 400));
                return;
            }

            const result = await shippingIntegrationService.validateAddress(address);

            res.json(apiResponse.success(result, 'Address validated'));
        } catch (error) {
            safeLogger.error('Error validating address:', error);
            res.status(500).json(apiResponse.error('Failed to validate address'));
        }
    }
}

export const shippingIntegrationController = new ShippingIntegrationController();
