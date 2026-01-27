import { Router, Request, Response } from 'express';
import { returnAnalyticsService } from '../services/marketplace/returnAnalyticsService';
import {
    requirePermission,
    adminRateLimit,
    AuthenticatedRequest
} from '../middleware/adminAuthMiddleware';
import { safeLogger } from '../utils/logger';

const router = Router();

// Note: Authentication, admin role validation, and audit logging are handled by parent adminRoutes
// These routes are mounted under /api/admin/returns which already has:
// - authMiddleware
// - validateAdminRole
// - adminRateLimit()
// - auditAdminAction('admin_operation')

// Apply additional rate limiting to all routes (100 requests per 15 minutes default)
// This is in addition to the parent rate limiting
router.use(adminRateLimit());

// ============================================================================
// REAL-TIME METRICS ENDPOINT
// ============================================================================

/**
 * GET /api/admin/returns/metrics
 * Get real-time return metrics
 * Permission: returns.view or returns.analytics
 * Rate limit: 100 requests per 15 minutes
 * Cache: 30 seconds
 */
router.get(
    '/metrics',
    requirePermission('returns.view'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const metrics = await returnAnalyticsService.getRealtimeMetrics();

            res.json({
                success: true,
                data: metrics,
                meta: {
                    cached: true,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            safeLogger.error('Error fetching real-time metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch real-time metrics',
                details: error.message,
            });
        }
    }
);

// ============================================================================
// COMPREHENSIVE ANALYTICS ENDPOINT
// ============================================================================

/**
 * GET /api/admin/returns/analytics
 * Get comprehensive return analytics for a time period
 * Query params: sellerId (optional), start (required), end (required)
 * Permission: returns.analytics
 * Rate limit: 50 requests per 15 minutes
 * Cache: 10 minutes
 */
router.get(
    '/analytics',
    requirePermission('returns.analytics'),
    adminRateLimit(50, 15 * 60 * 1000),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { sellerId, start, end } = req.query;

            // Validate required parameters
            if (!start || !end) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters',
                    details: 'Both start and end date parameters are required',
                });
            }

            // Validate date format
            const startDate = new Date(start as string);
            const endDate = new Date(end as string);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    details: 'Dates must be valid ISO 8601 format',
                });
            }

            if (startDate > endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date range',
                    details: 'Start date must be before end date',
                });
            }

            const analytics = await returnAnalyticsService.getEnhancedAnalytics(
                sellerId as string,
                {
                    start: start as string,
                    end: end as string,
                }
            );

            res.json({
                success: true,
                data: analytics,
                meta: {
                    cached: true,
                    timestamp: new Date().toISOString(),
                    period: { start, end },
                    sellerId: sellerId || 'all',
                },
            });
        } catch (error: any) {
            safeLogger.error('Error fetching analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch analytics',
                details: error.message,
            });
        }
    }
);

// ============================================================================
// EVENT HISTORY ENDPOINT
// ============================================================================

/**
 * GET /api/admin/returns/events/:returnId
 * Get event history for a specific return
 * Permission: returns.view
 * Rate limit: 100 requests per 15 minutes
 * Cache: 10 minutes
 */
router.get(
    '/events/:returnId',
    requirePermission('returns.view'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { returnId } = req.params;

            if (!returnId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing return ID',
                    details: 'Return ID is required',
                });
            }

            const events = await returnAnalyticsService.getReturnEventHistory(returnId);

            res.json({
                success: true,
                data: events,
                meta: {
                    cached: true,
                    timestamp: new Date().toISOString(),
                    returnId,
                    count: events.length,
                },
            });
        } catch (error: any) {
            safeLogger.error('Error fetching event history:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    error: 'Return not found',
                    details: error.message,
                });
            }

            res.status(500).json({
                success: false,
                error: 'Failed to fetch event history',
                details: error.message,
            });
        }
    }
);

// ============================================================================
// STATUS DISTRIBUTION ENDPOINT
// ============================================================================

/**
 * GET /api/admin/returns/status-distribution
 * Get status distribution for a time period
 * Query params: start (required), end (required)
 * Permission: returns.analytics
 * Rate limit: 100 requests per 15 minutes
 * Cache: 10 minutes
 */
router.get(
    '/status-distribution',
    requirePermission('returns.analytics'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { start, end } = req.query;

            // Validate required parameters
            if (!start || !end) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters',
                    details: 'Both start and end date parameters are required',
                });
            }

            // Validate date format
            const startDate = new Date(start as string);
            const endDate = new Date(end as string);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    details: 'Dates must be valid ISO 8601 format',
                });
            }

            const distribution = await returnAnalyticsService.getStatusDistribution({
                start: start as string,
                end: end as string,
            });

            res.json({
                success: true,
                data: distribution,
                meta: {
                    cached: true,
                    timestamp: new Date().toISOString(),
                    period: { start, end },
                },
            });
        } catch (error: any) {
            safeLogger.error('Error fetching status distribution:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch status distribution',
                details: error.message,
            });
        }
    }
);

// ============================================================================
// PROCESSING METRICS ENDPOINT
// ============================================================================

/**
 * GET /api/admin/returns/processing-metrics
 * Get processing time metrics
 * Query params: sellerId (required), start (required), end (required)
 * Permission: returns.analytics
 * Rate limit: 50 requests per 15 minutes
 * Cache: 10 minutes
 */
router.get(
    '/processing-metrics',
    requirePermission('returns.analytics'),
    adminRateLimit(50, 15 * 60 * 1000),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { sellerId, start, end } = req.query;

            // Validate required parameters
            if (!sellerId || !start || !end) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters',
                    details: 'sellerId, start, and end parameters are required',
                });
            }

            // Validate date format
            const startDate = new Date(start as string);
            const endDate = new Date(end as string);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    details: 'Dates must be valid ISO 8601 format',
                });
            }

            const metrics = await returnAnalyticsService.getProcessingTimeMetrics(
                sellerId as string,
                {
                    start: start as string,
                    end: end as string,
                }
            );

            res.json({
                success: true,
                data: metrics,
                meta: {
                    cached: true,
                    timestamp: new Date().toISOString(),
                    period: { start, end },
                    sellerId,
                },
            });
        } catch (error: any) {
            safeLogger.error('Error fetching processing metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch processing metrics',
                details: error.message,
            });
        }
    }
);

// ============================================================================
// CACHE WARMING ENDPOINT
// ============================================================================

/**
 * POST /api/admin/returns/cache/warm
 * Warm cache for a specific seller
 * Body: { sellerId: string }
 * Permission: returns.manage or system.settings
 * Rate limit: 10 requests per 15 minutes
 * Audit logged
 */
router.post(
    '/cache/warm',
    requirePermission('system.settings'),
    adminRateLimit(10, 15 * 60 * 1000),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { sellerId } = req.body;

            if (!sellerId) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameter',
                    details: 'sellerId is required in request body',
                });
            }

            await returnAnalyticsService.warmCache(sellerId);

            safeLogger.info('Cache warmed successfully', {
                sellerId,
                adminId: req.user?.id,
                timestamp: new Date().toISOString(),
            });

            res.json({
                success: true,
                data: {
                    message: 'Cache warmed successfully',
                    sellerId,
                },
                meta: {
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error: any) {
            safeLogger.error('Error warming cache:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to warm cache',
                details: error.message,
            });
        }
    }
);

// ============================================================================
// DRILL DOWN ANALYTICS ENDPOINT
// ============================================================================

/**
 * GET /api/admin/returns/analytics/drill-down
 * Get detailed drill-down data
 * Query params: type (category|seller|reason|status), value, start, end
 * Permission: returns.analytics
 * Rate limit: 50 requests per 15 minutes
 * Cache: 5 minutes
 */
router.get(
    '/analytics/drill-down',
    requirePermission('returns.analytics'),
    adminRateLimit(50, 15 * 60 * 1000),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { type, value, start, end } = req.query;

            // Validate required parameters
            if (!type || !value || !start || !end) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required parameters',
                    details: 'type, value, start, and end are required',
                });
            }

            const allowedTypes = ['category', 'seller', 'reason', 'status'];
            if (!allowedTypes.includes(type as string)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid drill-down type',
                    details: `Type must be one of: ${allowedTypes.join(', ')}`,
                });
            }

            // Validate date format
            const startDate = new Date(start as string);
            const endDate = new Date(end as string);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid date format',
                    details: 'Dates must be valid ISO 8601 format',
                });
            }

            const data = await returnAnalyticsService.getDrillDownAnalytics(
                type as 'category' | 'seller' | 'reason' | 'status',
                value as string,
                {
                    start: start as string,
                    end: end as string,
                }
            );

            res.json({
                success: true,
                data: data,
                meta: {
                    cached: true,
                    timestamp: new Date().toISOString(),
                    parameters: { type, value, start, end },
                },
            });
        } catch (error: any) {
            safeLogger.error('Error fetching drill-down analytics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch drill-down analytics',
                details: error.message,
            });
        }
    }
);

export default router;
