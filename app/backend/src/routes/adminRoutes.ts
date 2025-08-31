import { Router } from 'express';
import { adminController } from '../controllers/adminController';

const router = Router();

// Policy Configuration Routes
router.post('/policies', adminController.createPolicyConfiguration.bind(adminController));
router.put('/policies/:id', adminController.updatePolicyConfiguration.bind(adminController));
router.get('/policies', adminController.getPolicyConfigurations.bind(adminController));
router.delete('/policies/:id', adminController.deletePolicyConfiguration.bind(adminController));

// Threshold Configuration Routes
router.post('/thresholds', adminController.createThresholdConfiguration.bind(adminController));
router.put('/thresholds/:id', adminController.updateThresholdConfiguration.bind(adminController));
router.get('/thresholds', adminController.getThresholdConfigurations.bind(adminController));

// Vendor Configuration Routes
router.post('/vendors', adminController.createVendorConfiguration.bind(adminController));
router.put('/vendors/:id', adminController.updateVendorConfiguration.bind(adminController));
router.get('/vendors', adminController.getVendorConfigurations.bind(adminController));
router.patch('/vendors/:id/health', adminController.updateVendorHealthStatus.bind(adminController));

// Alert Configuration Routes
router.post('/alerts', adminController.createAlertConfiguration.bind(adminController));
router.put('/alerts/:id', adminController.updateAlertConfiguration.bind(adminController));
router.get('/alerts', adminController.getAlertConfigurations.bind(adminController));

// System Status Dashboard Routes
router.get('/dashboard/metrics', adminController.getDashboardMetrics.bind(adminController));
router.get('/dashboard/status', adminController.getSystemStatus.bind(adminController));
router.get('/dashboard/historical', adminController.getHistoricalMetrics.bind(adminController));

// Audit Log Analysis Routes
router.get('/audit/search', adminController.searchAuditLogs.bind(adminController));
router.get('/audit/analytics', adminController.getAuditAnalytics.bind(adminController));
router.get('/audit/compliance', adminController.generateComplianceReport.bind(adminController));
router.get('/audit/export', adminController.exportAuditLogs.bind(adminController));
router.get('/audit/violations', adminController.detectPolicyViolations.bind(adminController));
router.get('/audit/logs', adminController.getAuditLogs.bind(adminController));

export default router;