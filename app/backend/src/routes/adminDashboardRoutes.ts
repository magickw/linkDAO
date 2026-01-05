import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminDashboardController } from '../controllers/adminDashboardController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(validateAdminRole);

// Dashboard configuration routes
router.get('/config', adminDashboardController.getDashboardConfig);
router.put('/config', csrfProtection, adminDashboardController.updateDashboardConfig);
router.post('/config/reset', csrfProtection, adminDashboardController.resetDashboardConfig);
router.post('/config/export', csrfProtection, adminDashboardController.exportDashboardConfig);
router.post('/config/import', csrfProtection, adminDashboardController.importDashboardConfig);

// Dashboard preferences routes
router.get('/preferences', adminDashboardController.getUserPreferences);
router.put('/preferences', csrfProtection, adminDashboardController.updateUserPreferences);

// Dashboard layout routes
router.get('/layout', adminDashboardController.getLayoutConfig);
router.put('/layout', csrfProtection, adminDashboardController.updateLayoutConfig);
router.post('/layout/widget', csrfProtection, adminDashboardController.addWidget);
router.put('/layout/widget/:widgetId', csrfProtection, adminDashboardController.updateWidget);
router.delete('/layout/widget/:widgetId', csrfProtection, adminDashboardController.removeWidget);

// Dashboard data routes
router.get('/metrics', adminDashboardController.getDashboardMetrics);
router.get('/alerts', adminDashboardController.getAlerts);
router.post('/alerts/:alertId/acknowledge', csrfProtection, adminDashboardController.acknowledgeAlert);
router.delete('/alerts/:alertId', csrfProtection, adminDashboardController.dismissAlert);

// Dashboard analytics routes
router.get('/analytics/usage', adminDashboardController.getDashboardUsageAnalytics);
router.get('/analytics/performance', adminDashboardController.getDashboardPerformanceMetrics);

// Financial monitoring routes
router.get('/financial/metrics', adminDashboardController.getFinancialMetrics);
router.get('/financial/transactions', adminDashboardController.getRecentTransactions);
router.post('/financial/reconcile', csrfProtection, adminDashboardController.reconcileOrders);
router.post('/financial/report', csrfProtection, adminDashboardController.generateFinancialReport);

// Audit log routes
router.get('/audit/logs', adminDashboardController.getAuditLogs);
router.get('/audit/statistics', adminDashboardController.getAuditStatistics);
router.get('/audit/resource/:resourceType/:resourceId', adminDashboardController.getResourceAuditLogs);

// Order search routes
router.get('/orders/search', adminDashboardController.searchOrders);
router.get('/orders/search/suggestions', adminDashboardController.getOrderSearchSuggestions);
router.get('/orders/search/filters', adminDashboardController.getOrderSearchFilters);

export default router;
