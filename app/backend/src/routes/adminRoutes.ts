import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import * as adminNotificationController from '../controllers/adminNotificationController';
import moderationRoutes from './moderationRoutes';
import sellerRoutes from './sellerRoutes';
import disputeRoutes from './disputeRoutes';
import userRoutes from './userRoutes';
import adminNewsletterRoutes from './adminNewsletterRoutes';
import adminReturnAnalyticsRoutes from './adminReturnAnalyticsRoutes';
import charityRoutes from './charityRoutes';
import employeeManagementRoutes from './employeeManagementRoutes';
import {
  validateAdminRole,
  requirePermission,
  requireRole,
  adminRateLimit,
  auditAdminAction
} from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware first
router.use(authMiddleware);

// Apply admin authentication to all routes
router.use(validateAdminRole);

// Apply rate limiting to all admin routes
router.use(adminRateLimit());

// Apply audit logging to all admin actions
router.use(auditAdminAction('admin_operation'));

// Policy Configuration Routes (requires system.settings permission)
router.post('/policies', csrfProtection, requirePermission('system.settings'), adminController.createPolicyConfiguration.bind(adminController));
router.put('/policies/:id', csrfProtection, requirePermission('system.settings'), adminController.updatePolicyConfiguration.bind(adminController));
router.get('/policies', requirePermission('system.settings'), adminController.getPolicyConfigurations.bind(adminController));
router.delete('/policies/:id', csrfProtection, requirePermission('system.settings'), adminRateLimit(10, 15 * 60 * 1000), adminController.deletePolicyConfiguration.bind(adminController));

// Threshold Configuration Routes (requires system.settings permission)
router.post('/thresholds', csrfProtection, requirePermission('system.settings'), adminController.createThresholdConfiguration.bind(adminController));
router.put('/thresholds/:id', csrfProtection, requirePermission('system.settings'), adminController.updateThresholdConfiguration.bind(adminController));
router.get('/thresholds', requirePermission('system.settings'), adminController.getThresholdConfigurations.bind(adminController));

// Vendor Configuration Routes (requires system.settings permission)
router.post('/vendors', csrfProtection, requirePermission('system.settings'), adminController.createVendorConfiguration.bind(adminController));
router.put('/vendors/:id', csrfProtection, requirePermission('system.settings'), adminController.updateVendorConfiguration.bind(adminController));
router.get('/vendors', requirePermission('system.settings'), adminController.getVendorConfigurations.bind(adminController));
router.patch('/vendors/:id/health', csrfProtection, requirePermission('system.settings'), adminController.updateVendorHealthStatus.bind(adminController));

// Alert Configuration Routes (requires system.settings permission)
router.post('/alerts', csrfProtection, requirePermission('system.settings'), adminController.createAlertConfiguration.bind(adminController));
router.put('/alerts/:id', csrfProtection, requirePermission('system.settings'), adminController.updateAlertConfiguration.bind(adminController));
router.get('/alerts', requirePermission('system.settings'), adminController.getAlertConfigurations.bind(adminController));

// Admin Notification Routes
router.get('/notifications', adminNotificationController.getAdminNotifications);
router.get('/notifications/unread-count', adminNotificationController.getUnreadNotificationCount);
router.get('/notifications/stats', adminNotificationController.getNotificationStats);
router.patch('/notifications/:notificationId/read', csrfProtection, adminNotificationController.markNotificationAsRead);
router.patch('/notifications/read-all', csrfProtection, adminNotificationController.markAllNotificationsAsRead);

// Mobile Push Notification Routes
router.post('/mobile/push/register', csrfProtection, adminNotificationController.registerMobilePushToken);
router.delete('/mobile/push/unregister', csrfProtection, adminNotificationController.unregisterMobilePushToken);

// System Status Dashboard Routes (all authenticated admins can view)
router.get('/dashboard/metrics', adminController.getDashboardMetrics.bind(adminController));
router.get('/dashboard/status', adminController.getSystemStatus.bind(adminController));
router.get('/dashboard/historical', requirePermission('system.analytics'), adminController.getHistoricalMetrics.bind(adminController));

// Admin Stats Route (all authenticated admins can view)
router.get('/stats', adminController.getAdminStats.bind(adminController));

// Audit Log Analysis Routes (requires system.audit permission)
router.get('/audit/search', requirePermission('system.audit'), adminController.searchAuditLogs.bind(adminController));
router.get('/audit/analytics', requirePermission('system.audit'), adminController.getAuditAnalytics.bind(adminController));
router.get('/audit/compliance', requireRole('admin'), adminController.generateComplianceReport.bind(adminController));
router.get('/audit/export', requireRole('admin'), adminRateLimit(10, 15 * 60 * 1000), adminController.exportAuditLogs.bind(adminController));
router.get('/audit/violations', requirePermission('system.audit'), adminController.detectPolicyViolations.bind(adminController));
router.get('/audit/logs', requirePermission('system.audit'), adminController.getAuditLogs.bind(adminController));

// Moderation Routes (with content.moderate permission)
router.use('/moderation', requirePermission('content.moderate'), moderationRoutes);

// Seller Applications Routes (with marketplace.seller_review permission)
router.use('/sellers', requirePermission('marketplace.seller_review'), sellerRoutes);

// Dispute Resolution Routes (with disputes.view permission)
router.use('/disputes', requirePermission('disputes.view'), disputeRoutes);

// User Management Routes (with users.view permission)
router.use('/users', requirePermission('users.view'), userRoutes);

// Newsletter Routes (with system.settings permission)
router.use('/newsletter', requirePermission('system.settings'), adminNewsletterRoutes);

// Employee Management Routes (requires admin or super_admin role)
router.use('/', employeeManagementRoutes);

// Charity Routes (with governance.verify permission)
router.use('/', charityRoutes);

// Return Analytics Routes (with returns.view permission, but allow system.analytics as fallback)
router.use('/returns', (req, res, next) => {
  const user = (req as any).user;
  // Allow if user has returns permissions, system.analytics, or is super_admin
  if (user && (
    user.permissions?.includes('returns.view') ||
    user.permissions?.includes('returns.analytics') ||
    user.permissions?.includes('system.analytics') ||
    user.permissions?.includes('*') ||
    user.role === 'super_admin' ||
    user.role === 'admin'
  )) {
    return next();
  }
  // If no permission, return empty data instead of 403 for GET requests
  if (req.method === 'GET') {
    return res.json({ success: true, data: {}, message: 'No permission for returns analytics' });
  }
  return res.status(403).json({ success: false, error: 'Insufficient permissions' });
}, adminReturnAnalyticsRoutes);

// Analytics Routes (with system.analytics permission)
router.get('/analytics/revenue', requirePermission('system.analytics'), adminController.getRevenueAnalytics.bind(adminController));
router.get('/analytics/disputes', requirePermission('system.analytics'), adminController.getDisputeAnalytics.bind(adminController));
router.get('/analytics/moderation', requirePermission('system.analytics'), adminController.getModerationAnalytics.bind(adminController));
router.get('/analytics/demographics', requirePermission('system.analytics'), adminController.getUserDemographics.bind(adminController));
router.get('/analytics/content', requirePermission('system.analytics'), adminController.getContentAnalytics.bind(adminController));

// Order Management Routes (Task 15)
router.get('/orders/metrics', adminController.getOrderMetrics.bind(adminController));
router.get('/orders/delayed', adminController.getDelayedOrders.bind(adminController));
router.get('/orders', adminController.getOrders.bind(adminController));
router.get('/orders/:id', adminController.getOrderDetails.bind(adminController));
router.post('/orders/:id/action', csrfProtection, requireRole('admin'), adminController.performAdminAction.bind(adminController));


export default router;
