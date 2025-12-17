import { Router, Request, Response } from 'express';
import { communicationManagerController } from '../controllers/communicationManagerController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';

// Cache-busting comment: v1.0.3-build-2
const router = Router();

/**
 * Communication Management Routes
 * All routes require admin authentication
 */

// Apply admin authentication middleware to all routes
router.use(authMiddleware, validateAdminRole);

// Helper function to safely wrap controller methods
const safeHandler = (methodName: keyof typeof communicationManagerController) => {
  return async (req: Request, res: Response) => {
    try {
      const method = communicationManagerController?.[methodName];
      if (typeof method === 'function') {
        // Call the bound method
        await (method as any).call(communicationManagerController, req, res);
      } else {
        res.status(503).json({
          success: false,
          error: 'Communication manager service unavailable',
          message: `Controller method ${methodName} is not available`
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

// Communication logging and audit trail
router.post('/log',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
  safeHandler('logCommunication')
);

router.get('/logs',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
  safeHandler('getCommunicationLogs')
);

// Dispute escalation management
router.post('/escalation',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  safeHandler('createEscalationTrigger')
);

router.put('/escalation/:escalationId/resolve',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  safeHandler('resolveEscalation')
);

router.get('/escalations',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 100 }), // 100 requests per minute
  safeHandler('getEscalationTriggers')
);

router.post('/escalation/:escalationId/route',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  safeHandler('routeEscalation')
);

router.post('/escalation/:escalationId/preserve-context',
  csrfProtection,
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  safeHandler('preserveEscalationContext')
);

// Communication pattern detection and analytics
router.get('/patterns',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 50 }), // 50 requests per minute
  safeHandler('getCommunicationPatterns')
);

router.get('/analytics',
  rateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }), // 30 requests per minute
  safeHandler('getCommunicationAnalytics')
);

export default router;