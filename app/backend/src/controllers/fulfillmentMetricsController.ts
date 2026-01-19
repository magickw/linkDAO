import { Request, Response } from 'express';
import { fulfillmentMetricsService } from '../services/fulfillmentMetricsService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

class FulfillmentMetricsController {
    /**
     * GET /api/seller/metrics/fulfillment
     * Get fulfillment metrics for authenticated seller
     */
    async getMetrics(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const periodDays = parseInt(req.query.period as string) || 30;

            const metrics = await fulfillmentMetricsService.getSellerMetrics(userId, periodDays);

            res.json(apiResponse.success(metrics, 'Fulfillment metrics retrieved'));
        } catch (error) {
            safeLogger.error('Error getting fulfillment metrics:', error);
            res.status(500).json(apiResponse.error('Failed to get fulfillment metrics'));
        }
    }

    /**
     * GET /api/seller/metrics/performance
     * Get performance trends over time
     */
    async getPerformanceTrends(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const periodDays = parseInt(req.query.period as string) || 90;
            const intervalDays = parseInt(req.query.interval as string) || 7;

            const trends = await fulfillmentMetricsService.getPerformanceTrends(
                userId,
                periodDays,
                intervalDays
            );

            res.json(apiResponse.success(trends, 'Performance trends retrieved'));
        } catch (error) {
            safeLogger.error('Error getting performance trends:', error);
            res.status(500).json(apiResponse.error('Failed to get performance trends'));
        }
    }

    /**
     * GET /api/seller/metrics/comparison
     * Compare seller performance to platform average
     */
    async getComparison(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json(apiResponse.error('Authentication required', 401));
                return;
            }

            const periodDays = parseInt(req.query.period as string) || 30;

            const comparison = await fulfillmentMetricsService.compareToAverage(userId, periodDays);

            res.json(apiResponse.success(comparison, 'Comparison data retrieved'));
        } catch (error) {
            safeLogger.error('Error getting comparison:', error);
            res.status(500).json(apiResponse.error('Failed to get comparison data'));
        }
    }
}

export const fulfillmentMetricsController = new FulfillmentMetricsController();
