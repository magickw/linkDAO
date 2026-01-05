
import { Request, Response } from 'express';
import { ShippingService } from '../services/shippingService';
import { ApiResponse } from '../utils/apiResponse';
import { safeLogger } from '../utils/safeLogger';

export class ShippingController {
    private shippingService: ShippingService;

    constructor() {
        this.shippingService = new ShippingService();
    }

    /**
     * Calculate shipping rates
     * POST /api/shipping/rates
     */
    calculateRates = async (req: Request, res: Response) => {
        try {
            const { fromAddress, toAddress, packageInfo } = req.body;

            if (!fromAddress || !toAddress || !packageInfo) {
                return ApiResponse.badRequest(res, 'Missing required fields');
            }

            const rates = await this.shippingService.getShippingRates(fromAddress, toAddress, packageInfo);
            return ApiResponse.success(res, rates);
        } catch (error) {
            safeLogger.error('Error calculating rates:', error);
            return ApiResponse.serverError(res, 'Failed to calculate rates', error);
        }
    };

    /**
     * Generate shipping label
     * POST /api/shipping/labels
     */
    generateLabel = async (req: Request, res: Response) => {
        try {
            const { orderId, carrier, service, fromAddress, toAddress, packageInfo } = req.body;

            // Basic validation
            if (!orderId || !carrier || !service || !fromAddress || !toAddress || !packageInfo) {
                return ApiResponse.badRequest(res, 'Missing required fields');
            }

            const shipment = await this.shippingService.createShipment({
                orderId,
                carrier,
                service,
                fromAddress,
                toAddress,
                packageInfo
            });

            return ApiResponse.success(res, shipment);
        } catch (error) {
            safeLogger.error('Error generating label:', error);
            return ApiResponse.serverError(res, 'Failed to generate label', error);
        }
    };

    /**
     * Get tracking updates
     * GET /api/shipping/tracking/:trackingNumber
     */
    getTracking = async (req: Request, res: Response) => {
        try {
            const { trackingNumber } = req.params;
            const carrier = req.query.carrier as string;

            if (!trackingNumber || !carrier) {
                return ApiResponse.badRequest(res, 'Tracking number and carrier are required');
            }

            const trackingInfo = await this.shippingService.trackShipment(trackingNumber, carrier);
            return ApiResponse.success(res, trackingInfo);
        } catch (error) {
            safeLogger.error('Error fetching tracking:', error);
            return ApiResponse.serverError(res, 'Failed to fetch tracking info', error);
        }
    };
}
