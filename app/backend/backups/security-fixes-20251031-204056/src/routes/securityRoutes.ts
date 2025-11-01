/**
 * Security Routes
 * 
 * API routes for security monitoring, compliance management,
 * vulnerability assessment, and key management.
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';
import { securityController } from '../controllers/securityController';
import { csrfProtection } from '../middleware/csrfProtection';
import { apiRateLimit, authRateLimit } from '../middleware/securityMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication to all security routes
router.use(authenticateToken);

// Security Dashboard Routes
router.get('/dashboard', apiRateLimit, securityController.getSecurityDashboard.bind(securityController));

// Security Events Routes
router.get('/events', apiRateLimit, securityController.getSecurityEvents.bind(securityController));

// Security Alerts Routes
router.get('/alerts', apiRateLimit, securityController.getSecurityAlerts.bind(securityController));
router.post('/alerts/:alertId/acknowledge', csrfProtection,  apiRateLimit, securityController.acknowledgeAlert.bind(securityController));
router.post('/alerts/:alertId/resolve', csrfProtection,  apiRateLimit, securityController.resolveAlert.bind(securityController));

// Vulnerability Management Routes
router.post('/vulnerabilities/scan', csrfProtection,  authRateLimit, securityController.startVulnerabilityScan.bind(securityController));
router.get('/vulnerabilities/reports', apiRateLimit, securityController.getVulnerabilityReports.bind(securityController));
router.put('/vulnerabilities/:vulnerabilityId/status', csrfProtection,  apiRateLimit, securityController.updateVulnerabilityStatus.bind(securityController));

// Compliance Routes
router.get('/compliance/dashboard', apiRateLimit, securityController.getComplianceDashboard.bind(securityController));
router.post('/compliance/reports', csrfProtection,  apiRateLimit, securityController.generateComplianceReport.bind(securityController));
router.post('/compliance/data-export', csrfProtection,  authRateLimit, securityController.requestDataExport.bind(securityController));
router.post('/compliance/data-deletion', csrfProtection,  authRateLimit, securityController.requestDataDeletion.bind(securityController));
router.post('/compliance/opt-out', csrfProtection,  authRateLimit, securityController.requestOptOut.bind(securityController));
router.post('/compliance/consent', csrfProtection,  apiRateLimit, securityController.recordConsent.bind(securityController));

// Key Management Routes
router.get('/keys/dashboard', apiRateLimit, securityController.getKeyManagementDashboard.bind(securityController));
router.post('/keys/generate', csrfProtection,  authRateLimit, securityController.generateKey.bind(securityController));
router.post('/keys/:keyId/rotate', csrfProtection,  authRateLimit, securityController.rotateKey.bind(securityController));
router.post('/keys/:keyId/revoke', csrfProtection,  authRateLimit, securityController.revokeKey.bind(securityController));

// Audit Logging Routes
router.get('/audit/logs', apiRateLimit, securityController.getAuditLogs.bind(securityController));
router.get('/audit/export', authRateLimit, securityController.exportAuditLogs.bind(securityController));

export default router;