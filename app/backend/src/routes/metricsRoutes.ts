import { Router, Request, Response } from 'express';
import { getMonitor } from '../db/connectionPoolMonitor';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * GET /api/metrics/db/pool
 * Get current database connection pool metrics
 */
router.get('/db/pool', (req: Request, res: Response) => {
    try {
        const monitor = getMonitor();

        if (!monitor) {
            return res.status(503).json({
                error: 'Connection pool monitor not initialized',
            });
        }

        const metrics = monitor.getCurrentMetrics();

        res.json({
            success: true,
            metrics,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        safeLogger.error('Error fetching pool metrics:', error);
        res.status(500).json({
            error: 'Failed to fetch pool metrics',
        });
    }
});

/**
 * GET /api/metrics/db/pool/history
 * Get database connection pool metrics history
 */
router.get('/db/pool/history', (req: Request, res: Response) => {
    try {
        const monitor = getMonitor();

        if (!monitor) {
            return res.status(503).json({
                error: 'Connection pool monitor not initialized',
            });
        }

        const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
        const history = monitor.getMetricsHistory(limit);

        res.json({
            success: true,
            history,
            count: history.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        safeLogger.error('Error fetching pool metrics history:', error);
        res.status(500).json({
            error: 'Failed to fetch pool metrics history',
        });
    }
});

/**
 * GET /api/metrics/db/pool/summary
 * Get database connection pool metrics summary
 */
router.get('/db/pool/summary', (req: Request, res: Response) => {
    try {
        const monitor = getMonitor();

        if (!monitor) {
            return res.status(503).json({
                error: 'Connection pool monitor not initialized',
            });
        }

        // Default to last 5 minutes
        const periodMs = req.query.period ? parseInt(req.query.period as string) : 300000;
        const summary = monitor.getMetricsSummary(periodMs);
        const recommendations = monitor.getRecommendations();

        res.json({
            success: true,
            summary,
            recommendations,
            period: `${periodMs / 1000}s`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        safeLogger.error('Error fetching pool metrics summary:', error);
        res.status(500).json({
            error: 'Failed to fetch pool metrics summary',
        });
    }
});

/**
 * GET /api/metrics/db/health
 * Get database health status
 */
router.get('/db/health', async (req: Request, res: Response) => {
    try {
        const monitor = getMonitor();

        if (!monitor) {
            return res.status(503).json({
                success: false,
                healthy: false,
                error: 'Connection pool monitor not initialized',
            });
        }

        const metrics = monitor.getCurrentMetrics();
        const summary = monitor.getMetricsSummary();

        // Determine health status
        const healthy =
            metrics.poolUtilization < 95 &&
            summary.totalErrors < 10 &&
            summary.avgQueryDuration < 2000;

        const status = healthy ? 'healthy' : 'degraded';

        res.status(healthy ? 200 : 503).json({
            success: true,
            healthy,
            status,
            metrics: {
                poolUtilization: `${metrics.poolUtilization.toFixed(1)}%`,
                activeConnections: metrics.activeConnections,
                maxConnections: metrics.maxConnections,
                avgQueryDuration: `${summary.avgQueryDuration.toFixed(0)}ms`,
                errorRate: summary.totalErrors,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        safeLogger.error('Error checking database health:', error);
        res.status(500).json({
            success: false,
            healthy: false,
            error: 'Failed to check database health',
        });
    }
});

export default router;
