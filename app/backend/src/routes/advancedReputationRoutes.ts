import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { advancedReputationController } from '../controllers/advancedReputationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Advanced Reputation Impact Calculation
router.post('/impact', csrfProtection, advancedReputationController.calculateImpact.bind(advancedReputationController));

// Advanced Reputation Change Application
router.post('/apply', csrfProtection, advancedReputationController.applyAdvancedChange.bind(advancedReputationController));

// Advanced Reputation Analytics
router.get('/analytics/:userId', advancedReputationController.getAdvancedAnalytics.bind(advancedReputationController));

// Bulk Reputation Operations
router.post('/bulk', csrfProtection, validateAdminRole, advancedReputationController.performBulkOperation.bind(advancedReputationController));
router.get('/bulk/:operationId/status', advancedReputationController.getBulkOperationStatus.bind(advancedReputationController));

// Progressive Penalty System Configuration (Admin only)
router.post('/penalties/configure', csrfProtection, validateAdminRole, advancedReputationController.configureProgressivePenalty.bind(advancedReputationController));
router.post('/penalties/apply', csrfProtection, validateAdminRole, advancedReputationController.applyProgressivePenalty.bind(advancedReputationController));

// Reputation Impact Prediction
router.post('/predict', csrfProtection, advancedReputationController.predictReputationImpact.bind(advancedReputationController));

// Network Influence Analysis
router.get('/network/:userId', advancedReputationController.getNetworkInfluence.bind(advancedReputationController));

// Real-time Reputation Updates (Server-Sent Events)
router.get('/realtime/:userId', advancedReputationController.getRealTimeUpdates.bind(advancedReputationController));

export default router;