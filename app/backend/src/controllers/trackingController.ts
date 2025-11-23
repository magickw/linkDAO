import { Request, Response } from 'express';
import { trackingService } from '../services/trackingService';
import { safeLogger } from '../utils/safeLogger';

export class TrackingController {

    // Generic tracking endpoint
    async track(req: Request, res: Response) {
        try {
            const { event, data, timestamp, userId } = req.body;

            // Get IP and User Agent from request
            const ipAddress = req.ip || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];

            // If user is authenticated via middleware, use that ID over body ID
            const authenticatedUserId = (req as any).user?.id || userId;

            await trackingService.trackEvent({
                userId: authenticatedUserId,
                eventType: event,
                metadata: data,
                ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
                userAgent,
                path: data?.path, // Optional path from frontend
            });

            res.status(200).json({ success: true });
        } catch (error) {
            safeLogger.error('Error in track controller:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }

    // Track wallet connection/activity specifically
    async trackWallet(req: Request, res: Response) {
        try {
            const { walletAddress, activityType, chainId, metadata } = req.body;
            const userId = (req as any).user?.id;

            await trackingService.trackWalletActivity({
                walletAddress,
                userId,
                activityType,
                chainId,
                metadata
            });

            res.status(200).json({ success: true });
        } catch (error) {
            safeLogger.error('Error in trackWallet controller:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    // Get dashboard data
    async getDashboardData(req: Request, res: Response) {
        try {
            const [stats, recentActivity, riskFlags] = await Promise.all([
                trackingService.getMonitoringStats(),
                trackingService.getRecentActivity(),
                trackingService.getRiskFlags()
            ]);

            res.status(200).json({
                success: true,
                data: {
                    stats,
                    recentActivity,
                    riskFlags
                }
            });
        } catch (error) {
            safeLogger.error('Error getting dashboard data:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}

export const trackingController = new TrackingController();
