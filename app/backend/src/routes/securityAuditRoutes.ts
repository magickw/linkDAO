import { Router } from 'express';
import { securityAuditController } from '../controllers/securityAuditController';
import { adminAuthMiddleware } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Security Audit Routes
 * All routes require admin authentication
 */

// Service initialization
router.post('/initialize', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(10, 60), // 10 requests per minute
  securityAuditController.initializeService
);

// Event logging routes (system use)
router.post('/events/security', 
  csrfProtection, 
  securityAuditController.logSecurityEvent
);

router.post('/events/authentication', 
  csrfProtection, 
  securityAuditController.logAuthenticationEvent
);

router.post('/events/data-access', 
  csrfProtection, 
  securityAuditController.logDataAccessEvent
);

router.post('/events/admin-action', 
  csrfProtection, 
  securityAuditController.logAdminAction
);

router.post('/events/security-incident', 
  csrfProtection, 
  securityAuditController.logSecurityIncident
);

// Audit event querying
router.get('/events', 
  adminAuthMiddleware, 
  rateLimiter(100, 60), // 100 requests per minute
  securityAuditController.queryAuditEvents
);

// Incident management
router.post('/incidents', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  securityAuditController.reportIncident
);

router.get('/incidents/:incidentId', 
  adminAuthMiddleware, 
  rateLimiter(100, 60), // 100 requests per minute
  securityAuditController.getIncident
);

router.get('/incidents', 
  adminAuthMiddleware, 
  rateLimiter(100, 60), // 100 requests per minute
  securityAuditController.getAllIncidents
);

router.put('/incidents/:incidentId/status', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  securityAuditController.updateIncidentStatus
);

// Tamper detection
router.post('/tamper-detection', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  securityAuditController.recordTamperDetection
);

router.put('/tamper-detection/resolve', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  securityAuditController.resolveTamperDetection
);

// Reporting
router.get('/reports', 
  adminAuthMiddleware, 
  rateLimiter(30, 60), // 30 requests per minute
  securityAuditController.generateAuditReport
);

export default router;