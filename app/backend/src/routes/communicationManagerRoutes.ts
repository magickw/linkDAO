import { Router } from 'express';
import { communicationManagerController } from '../controllers/communicationManagerController';
import { adminAuthMiddleware } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * Communication Management Routes
 * All routes require admin authentication
 */

// Communication logging and audit trail
router.post('/log', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(100, 60), // 100 requests per minute
  communicationManagerController.logCommunication
);

router.get('/logs', 
  adminAuthMiddleware, 
  rateLimiter(100, 60), // 100 requests per minute
  communicationManagerController.getCommunicationLogs
);

// Dispute escalation management
router.post('/escalation', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  communicationManagerController.createEscalationTrigger
);

router.put('/escalation/:escalationId/resolve', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  communicationManagerController.resolveEscalation
);

router.get('/escalations', 
  adminAuthMiddleware, 
  rateLimiter(100, 60), // 100 requests per minute
  communicationManagerController.getEscalationTriggers
);

router.post('/escalation/:escalationId/route', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  communicationManagerController.routeEscalation
);

router.post('/escalation/:escalationId/preserve-context', 
  adminAuthMiddleware, 
  csrfProtection, 
  rateLimiter(50, 60), // 50 requests per minute
  communicationManagerController.preserveEscalationContext
);

// Communication pattern detection and analytics
router.get('/patterns', 
  adminAuthMiddleware, 
  rateLimiter(50, 60), // 50 requests per minute
  communicationManagerController.getCommunicationPatterns
);

router.get('/analytics', 
  adminAuthMiddleware, 
  rateLimiter(30, 60), // 30 requests per minute
  communicationManagerController.getCommunicationAnalytics
);

export default router;