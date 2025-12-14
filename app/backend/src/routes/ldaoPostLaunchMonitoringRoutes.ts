import { Router } from 'express';
import { ldaoPostLaunchMonitoringController } from '../controllers/ldaoPostLaunchMonitoringController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// System metrics endpoints
router.get('/metrics/system', ldaoPostLaunchMonitoringController.getSystemMetrics);
router.get('/metrics/performance', ldaoPostLaunchMonitoringController.getPerformanceMetrics);
router.get('/analytics/user-behavior', ldaoPostLaunchMonitoringController.getUserBehaviorAnalytics);

// Dashboard and health endpoints
router.get('/dashboard', ldaoPostLaunchMonitoringController.getDashboardData);
router.get('/health', ldaoPostLaunchMonitoringController.getHealthStatus);

// Admin-only endpoints
router.use(validateAdminRole);

router.get('/recommendations', ldaoPostLaunchMonitoringController.getOptimizationRecommendations);
router.get('/roadmap', ldaoPostLaunchMonitoringController.getFeatureRoadmap);
router.get('/alerts', ldaoPostLaunchMonitoringController.getAlerts);
router.post('/alerts/:alertId/acknowledge', ldaoPostLaunchMonitoringController.acknowledgeAlert);
router.get('/export', ldaoPostLaunchMonitoringController.exportMetrics);

export { router as ldaoPostLaunchMonitoringRoutes };