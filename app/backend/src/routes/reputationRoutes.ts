import { Router } from 'express';
import { reputationController } from '../controllers/reputationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public routes (for internal system use)
router.get('/user/:userId', reputationController.getUserReputation);
router.get('/user/:userId/strictness', reputationController.getModerationStrictness);
router.get('/user/:userId/jury-eligibility', reputationController.checkJuryEligibility);
router.get('/user/:userId/penalties', reputationController.getActivePenalties);
router.get('/user/:userId/reporting-weight', reputationController.getReportingWeight);

// Protected routes (require authentication)
router.use(authMiddleware);

// Administrative routes for applying reputation changes
router.post('/violation', reputationController.applyViolationPenalty);
router.post('/reward-report', reputationController.rewardHelpfulReport);
router.post('/penalize-report', reputationController.penalizeFalseReport);
router.post('/restore-appeal', reputationController.restoreReputationForAppeal);
router.post('/update-juror', reputationController.updateJurorPerformance);
router.post('/initialize', reputationController.initializeUserReputation);

export default router;