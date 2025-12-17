import { Router } from 'express';
import { securityAuditController } from '../controllers/securityAuditController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Security Audit Routes
 * All routes require admin authentication
 */

// Apply admin authentication middleware to all routes
router.use(authMiddleware, validateAdminRole);

// Service initialization
router.post('/initialize',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 10 }), // 10 requests per minute
  securityAuditController.initializeService.bind(securityAuditController)
);

// Event logging routes (system use)
router.post('/events/security',
  csrfProtection,
  securityAuditController.logSecurityEvent.bind(securityAuditController)
);

router.post('/events/authentication',
  csrfProtection,
  securityAuditController.logAuthenticationEvent.bind(securityAuditController)
);

router.post('/events/data-access',
  csrfProtection,
  securityAuditController.logDataAccessEvent.bind(securityAuditController)
);

router.post('/events/admin-action',
  csrfProtection,
  securityAuditController.logAdminAction.bind(securityAuditController)
);

router.post('/events/security-incident',
  csrfProtection,
  securityAuditController.logSecurityIncident.bind(securityAuditController)
);

// Audit event querying
router.get('/events',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
  securityAuditController.queryAuditEvents.bind(securityAuditController)
);

// Incident management
router.post('/incidents',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  securityAuditController.reportIncident.bind(securityAuditController)
);

router.get('/incidents/:incidentId',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
  securityAuditController.getIncident.bind(securityAuditController)
);

router.get('/incidents',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
  securityAuditController.getAllIncidents.bind(securityAuditController)
);

router.put('/incidents/:incidentId/status',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  securityAuditController.updateIncidentStatus.bind(securityAuditController)
);

// Tamper detection
router.post('/tamper-detection',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  securityAuditController.recordTamperDetection.bind(securityAuditController)
);

router.put('/tamper-detection/resolve',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  securityAuditController.resolveTamperDetection.bind(securityAuditController)
);

// Reporting
router.get('/reports',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }), // 30 requests per minute
  securityAuditController.generateAuditReport.bind(securityAuditController)
);

export default router;