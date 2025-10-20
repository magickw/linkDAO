import { Router, Request, Response } from 'express';
import { sellerDashboardService } from '../services/sellerDashboardService';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';
import { cachingMiddleware, rateLimitWithCache } from '../middleware/cachingMiddleware';

const router = Router();

/**
 * GET /api/marketplace/seller/dashboard/:walletAddress
 * Get seller dashboard statistics
 */
router.get('/seller/dashboard/:walletAddress',
  rateLimitWithCache(req => `seller_dashboard:${req.ip}`, 60, 60), // 60 requests per minute
  cachingMiddleware.cache('sellerDashboard', { ttl: 60 }), // Cache for 1 minute
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ], 'Invalid wallet address');
      }

      const stats = await sellerDashboardService.getDashboardStats(walletAddress);

      return successResponse(res, stats, 200);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return notFoundResponse(res, 'Seller profile not found');
        }
      }

      return errorResponse(
        res,
        'DASHBOARD_FETCH_ERROR',
        'Failed to fetch dashboard statistics',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * GET /api/marketplace/seller/notifications/:walletAddress
 * Get seller notifications
 */
router.get('/seller/notifications/:walletAddress',
  rateLimitWithCache(req => `seller_notifications:${req.ip}`, 60, 60),
  cachingMiddleware.cache('sellerNotifications', { ttl: 30 }), // Cache for 30 seconds
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { limit = '20', offset = '0', unreadOnly = 'false' } = req.query;

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      const notifications = await sellerDashboardService.getNotifications(
        walletAddress,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10),
        unreadOnly === 'true'
      );

      return successResponse(res, notifications, 200);
    } catch (error) {
      console.error('Error fetching notifications:', error);

      return errorResponse(
        res,
        'NOTIFICATIONS_FETCH_ERROR',
        'Failed to fetch notifications',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * PUT /api/marketplace/seller/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/seller/notifications/:notificationId/read',
  rateLimitWithCache(req => `mark_notification_read:${req.ip}`, 30, 60),
  cachingMiddleware.invalidate('sellerNotifications'),
  async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;

      await sellerDashboardService.markNotificationRead(parseInt(notificationId, 10));

      return successResponse(res, { message: 'Notification marked as read' }, 200);
    } catch (error) {
      console.error('Error marking notification as read:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return notFoundResponse(res, 'Notification not found');
      }

      return errorResponse(
        res,
        'NOTIFICATION_UPDATE_ERROR',
        'Failed to mark notification as read',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

/**
 * GET /api/marketplace/seller/analytics/:walletAddress
 * Get seller analytics data
 */
router.get('/seller/analytics/:walletAddress',
  rateLimitWithCache(req => `seller_analytics:${req.ip}`, 30, 60),
  cachingMiddleware.cache('sellerAnalytics', { ttl: 300 }), // Cache for 5 minutes
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const { period = '30d' } = req.query;

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      const analytics = await sellerDashboardService.getAnalytics(walletAddress, period as string);

      return successResponse(res, analytics, 200);
    } catch (error) {
      console.error('Error fetching analytics:', error);

      return errorResponse(
        res,
        'ANALYTICS_FETCH_ERROR',
        'Failed to fetch analytics data',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  });

export default router;
