/**
 * Security Audit Routes
 * API routes for security audit logging and reporting
 */

import { Router } from 'express';
import { securityAuditController } from '../controllers/securityAuditController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Query and reporting routes (admin only)
router.get('/events', adminAuthMiddleware, securityAuditController.queryAuditEvents.bind(securityAuditController));
router.post('/reports/generate', adminAuthMiddleware, securityAuditController.generateAuditReport.bind(securityAuditController));
router.get('/statistics', adminAuthMiddleware, securityAuditController.getAuditStatistics.bind(securityAuditController));
router.get('/compliance/summary', adminAuthMiddleware, securityAuditController.getComplianceSummary.bind(securityAuditController));
router.get('/export', adminAuthMiddleware, securityAuditController.exportAuditData.bind(securityAuditController));

// Event logging routes (system use)
router.post('/events/security', securityAuditController.logSecurityEvent.bind(securityAuditController));
router.post('/events/authentication', securityAuditController.logAuthenticationEvent.bind(securityAuditController));
router.post('/events/data-access', securityAuditController.logDataAccessEvent.bind(securityAuditController));
router.post('/events/admin-action', securityAuditController.logAdminAction.bind(securityAuditController));
router.post('/events/security-incident', securityAuditController.logSecurityIncident.bind(securityAuditController));

// Configuration routes (admin only)
router.post('/compliance/rules', adminAuthMiddleware, securityAuditController.createComplianceRule.bind(securityAuditController));
router.post('/retention/policies', adminAuthMiddleware, securityAuditController.createRetentionPolicy.bind(securityAuditController));

export default router;