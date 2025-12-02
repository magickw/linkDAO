import { Router } from 'express';
import { providerHealthController } from '../controllers/providerHealthController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * Provider Health Monitoring Routes
 * All routes require admin authentication
 */

// Get comprehensive provider health status
router.get(
  '/health',
  adminAuthMiddleware,
  providerHealthController.getProviderHealth
);

// Get health history for a specific provider
router.get(
  '/health/:provider/history',
  adminAuthMiddleware,
  providerHealthController.getProviderHealthHistory
);

// Get health alerts for all providers
router.get(
  '/health/alerts',
  adminAuthMiddleware,
  providerHealthController.getHealthAlerts
);

// Test provider connectivity
router.post(
  '/health/:provider/test',
  adminAuthMiddleware,
  providerHealthController.testProviderConnectivity
);

export default router;
