import { Router } from 'express';
import { systemHealthMonitoringController } from '../controllers/systemHealthMonitoringController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware);

/**
 * System Health Overview Routes
 */

// GET /api/admin/system-health/overview
// Get comprehensive system health overview
router.get('/overview', systemHealthMonitoringController.getSystemHealthOverview.bind(systemHealthMonitoringController));

// GET /api/admin/system-health/status
// Get current system status for dashboard
router.get('/status', systemHealthMonitoringController.getSystemStatus.bind(systemHealthMonitoringController));

// GET /api/admin/system-health/metrics
// Get detailed system health metrics
router.get('/metrics', systemHealthMonitoringController.getSystemHealthMetrics.bind(systemHealthMonitoringController));

/**
 * Component Dependencies Routes
 */

// GET /api/admin/system-health/dependencies
// Get component dependency map
router.get('/dependencies', systemHealthMonitoringController.getComponentDependencies.bind(systemHealthMonitoringController));

/**
 * Intelligent Alerting Routes
 */

// GET /api/admin/system-health/alerts
// Get intelligent alerts with filtering
router.get('/alerts', systemHealthMonitoringController.getIntelligentAlerts.bind(systemHealthMonitoringController));

// POST /api/admin/system-health/alerts/:alertId/acknowledge
// Acknowledge an alert
router.post('/alerts/:alertId/acknowledge', systemHealthMonitoringController.acknowledgeAlert.bind(systemHealthMonitoringController));

// POST /api/admin/system-health/alerts/:alertId/resolve
// Resolve an alert
router.post('/alerts/:alertId/resolve', systemHealthMonitoringController.resolveAlert.bind(systemHealthMonitoringController));

/**
 * Capacity Planning Routes
 */

// GET /api/admin/system-health/capacity
// Get capacity planning data including predictions and recommendations
router.get('/capacity', systemHealthMonitoringController.getCapacityPlanningData.bind(systemHealthMonitoringController));

/**
 * Performance Analytics Routes
 */

// GET /api/admin/system-health/performance
// Get performance analytics data
router.get('/performance', systemHealthMonitoringController.getPerformanceAnalytics.bind(systemHealthMonitoringController));

// GET /api/admin/system-health/performance/trends
// Get performance trends analysis
router.get('/performance/trends', systemHealthMonitoringController.getPerformanceTrends.bind(systemHealthMonitoringController));

export { router as systemHealthMonitoringRoutes };