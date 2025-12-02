import { Router, Request, Response } from 'express';
import { communicationManagerController } from '../controllers/communicationManagerController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';

// Cache-busting comment: v1.0.3-build-2
const router = Router();

/**
 * Communication Management Routes
 * All routes require admin authentication
 */

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
  adminAuthMiddleware,
  csrfProtection,
  rateLimiter(100, 60), // 100 requests per minute
  safeHandler('logCommunication')
);

router.get('/logs',
  adminAuthMiddleware,
  rateLimiter(100, 60), // 100 requests per minute
  safeHandler('getCommunicationLogs')
);

// Dispute escalation management
router.post('/escalation',
  adminAuthMiddleware,
  csrfProtection,
  rateLimiter(50, 60), // 50 requests per minute
  safeHandler('createEscalationTrigger')
);

router.put('/escalation/:escalationId/resolve',
  adminAuthMiddleware,
  csrfProtection,
  rateLimiter(50, 60), // 50 requests per minute
  safeHandler('resolveEscalation')
);

router.get('/escalations',
  adminAuthMiddleware,
  rateLimiter(100, 60), // 100 requests per minute
  safeHandler('getEscalationTriggers')
);

router.post('/escalation/:escalationId/route',
  adminAuthMiddleware,
  csrfProtection,
  rateLimiter(50, 60), // 50 requests per minute
  safeHandler('routeEscalation')
);

router.post('/escalation/:escalationId/preserve-context',
  adminAuthMiddleware,
  csrfProtection,
  rateLimiter(50, 60), // 50 requests per minute
  safeHandler('preserveEscalationContext')
);

// Communication pattern detection and analytics
router.get('/patterns',
  adminAuthMiddleware,
  rateLimiter(50, 60), // 50 requests per minute
  safeHandler('getCommunicationPatterns')
);

router.get('/analytics',
  adminAuthMiddleware,
  rateLimiter(30, 60), // 30 requests per minute
  safeHandler('getCommunicationAnalytics')
);

export default router;