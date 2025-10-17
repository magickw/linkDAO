import express from 'express';
import { adminDashboardController } from '../controllers/adminDashboardController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(validateAdminRole);

// Dashboard configuration routes
router.get('/config', adminDashboardController.getDashboardConfig);
router.put('/config', adminDashboardController.updateDashboardConfig);
router.post('/config/reset', adminDashboardController.resetDashboardConfig);
router.post('/config/export', adminDashboardController.exportDashboardConfig);
router.post('/config/import', adminDashboardController.importDashboardConfig);

// Dashboard preferences routes
router.get('/preferences', adminDashboardController.getUserPreferences);
router.put('/preferences', adminDashboardController.updateUserPreferences);

// Dashboard layout routes
router.get('/layout', adminDashboardController.getLayoutConfig);
router.put('/layout', adminDashboardController.updateLayoutConfig);
router.post('/layout/widget', adminDashboardController.addWidget);
router.put('/layout/widget/:widgetId', adminDashboardController.updateWidget);
router.delete('/layout/widget/:widgetId', adminDashboardController.removeWidget);

// Dashboard data routes
router.get('/metrics', adminDashboardController.getDashboardMetrics);
router.get('/alerts', adminDashboardController.getAlerts);
router.post('/alerts/:alertId/acknowledge', adminDashboardController.acknowledgeAlert);
router.delete('/alerts/:alertId', adminDashboardController.dismissAlert);

// Dashboard analytics routes
router.get('/analytics/usage', adminDashboardController.getDashboardUsageAnalytics);
router.get('/analytics/performance', adminDashboardController.getDashboardPerformanceMetrics);

export default router;