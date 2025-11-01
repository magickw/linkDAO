/**
 * Security Audit Routes
 * API routes for security audit logging and reporting
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { securityAuditController } from '../controllers/securityAuditController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Query and reporting routes (admin only)
router.get('/events', adminAuthMiddleware, securityAuditController.queryAuditEvents.bind(securityAuditController));
router.post('/reports/generate', csrfProtection,  adminAuthMiddleware, securityAuditController.generateAuditReport.bind(securityAuditController));
router.get('/statistics', adminAuthMiddleware, securityAuditController.getAuditStatistics.bind(securityAuditController));
router.get('/compliance/summary', adminAuthMiddleware, securityAuditController.getComplianceSummary.bind(securityAuditController));
router.get('/export', adminAuthMiddleware, securityAuditController.exportAuditData.bind(securityAuditController));

// Event logging routes (system use)
router.post('/events/security', csrfProtection,  securityAuditController.logSecurityEvent.bind(securityAuditController));
router.post('/events/authentication', csrfProtection,  securityAuditController.logAuthenticationEvent.bind(securityAuditController));
router.post('/events/data-access', csrfProtection,  securityAuditController.logDataAccessEvent.bind(securityAuditController));
router.post('/events/admin-action', csrfProtection,  securityAuditController.logAdminAction.bind(securityAuditController));
router.post('/events/security-incident', csrfProtection,  securityAuditController.logSecurityIncident.bind(securityAuditController));

// Configuration routes (admin only)
router.post('/compliance/rules', csrfProtection,  adminAuthMiddleware, securityAuditController.createComplianceRule.bind(securityAuditController));
router.post('/retention/policies', csrfProtection,  adminAuthMiddleware, securityAuditController.createRetentionPolicy.bind(securityAuditController));

export default router;