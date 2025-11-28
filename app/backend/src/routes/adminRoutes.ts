import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import * as adminNotificationController from '../controllers/adminNotificationController';
import moderationRoutes from './moderationRoutes';
import sellerRoutes from './sellerRoutes';
import disputeRoutes from './disputeRoutes';
import userRoutes from './userRoutes';
import adminNewsletterRoutes from './adminNewsletterRoutes';
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

export default router;
