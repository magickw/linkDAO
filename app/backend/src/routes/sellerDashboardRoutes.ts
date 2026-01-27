import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerDashboardService } from '../services/marketplace/sellerDashboardService';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';
import { cachingMiddleware, rateLimitWithCache } from '../middleware/cachingMiddleware';
import { sanitizeWalletAddress } from '../utils/inputSanitization';

const router = Router();

/**
 * GET /api/marketplace/seller/dashboard/:walletAddress
 * Get seller dashboard statistics
 *
 * Note: This router is mounted at /api/marketplace/seller/dashboard
 * so the route path is just /:walletAddress
 */
router.get('/:walletAddress',
  rateLimitWithCache(req => `seller_dashboard:${req.ip}`, 60, 60), // 60 requests per minute
  cachingMiddleware.cache('sellerDashboard', { ttl: 60 }), // Cache for 1 minute
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ], 'Invalid wallet address');
      }

      const stats = await sellerDashboardService.getDashboardStats(walletAddress);

      return successResponse(res, stats, 200);
    } catch (error) {
      safeLogger.error('Error fetching dashboard stats:', error);
      
      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 503
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for dashboard stats:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

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
 * GET /api/marketplace/seller/dashboard/notifications/:walletAddress
 * Get seller notifications
 *
 * Note: This router is mounted at /api/marketplace/seller/dashboard
 * Changed path from /seller/notifications to /notifications to avoid double prefix
 */
router.get('/notifications/:walletAddress',
  rateLimitWithCache(req => `seller_notifications:${req.ip}`, 60, 60),
  cachingMiddleware.cache('sellerNotifications', { ttl: 30 }), // Cache for 30 seconds
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;
      const { limit = '20', offset = '0', unreadOnly = 'false' } = req.query;

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
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
      safeLogger.error('Error fetching notifications:', error);
      
      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 503
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for notifications:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

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
 * PUT /api/marketplace/seller/dashboard/notifications/:notificationId/read
 * Mark notification as read
 *
 * Note: This router is mounted at /api/marketplace/seller/dashboard
 */
router.put('/notifications/:notificationId/read', csrfProtection, 
  rateLimitWithCache(req => `mark_notification_read:${req.ip}`, 30, 60),
  cachingMiddleware.invalidate('sellerNotifications'),
  async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;

      await sellerDashboardService.markNotificationRead(parseInt(notificationId, 10));

      return successResponse(res, { message: 'Notification marked as read' }, 200);
    } catch (error) {
      safeLogger.error('Error marking notification as read:', error);
      
      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 503
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for mark notification read:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Notification not found',
            message: 'Unable to connect to database. Notification may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

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
 * GET /api/marketplace/seller/dashboard/analytics/:walletAddress
 * Get seller analytics data
 *
 * Note: This router is mounted at /api/marketplace/seller/dashboard
 */
router.get('/analytics/:walletAddress',
  rateLimitWithCache(req => `seller_analytics:${req.ip}`, 30, 60),
  cachingMiddleware.cache('sellerAnalytics', { ttl: 300 }), // Cache for 5 minutes
  async (req: Request, res: Response) => {
    try {
      let { walletAddress } = req.params;
      const { period = '30d' } = req.query;

      // Normalize wallet address to lowercase for consistent processing
      try {
        walletAddress = sanitizeWalletAddress(walletAddress);
      } catch (error) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      const analytics = await sellerDashboardService.getAnalytics(walletAddress, period as string);

      return successResponse(res, analytics, 200);
    } catch (error) {
      safeLogger.error('Error fetching analytics:', error);
      
      // Handle database connection errors specifically
      if (error && typeof error === 'object' && ('code' in error)) {
        const errorCode = (error as any).code;
        // If it's a database connection error, return 404 instead of 503
        // This prevents the service worker from aggressively backing off
        if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
          safeLogger.warn('Database connection error, returning 404 for analytics:', errorCode);
          return res.status(404).json({
            success: false,
            error: 'Seller profile not found',
            message: 'Unable to connect to database. Profile may not exist or try again later.',
            code: 'DATABASE_CONNECTION_ERROR'
          });
        }
      }

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
