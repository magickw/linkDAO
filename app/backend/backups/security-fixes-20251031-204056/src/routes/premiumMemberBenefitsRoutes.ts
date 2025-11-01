import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import {
  checkPremiumMembershipStatus,
  getExclusiveStakingPools,
  calculatePremiumPenaltyDiscount,
  getPremiumAnalytics,
  createCustomStakingOption,
  getPremiumStakingEvents,
  getPremiumMemberDashboard,
  validatePremiumAccess
} from '../controllers/premiumMemberBenefitsController';

const router = Router();

// Premium membership status
router.get('/status/:userId', checkPremiumMembershipStatus);

// Premium member dashboard
router.get('/dashboard/:userId', getPremiumMemberDashboard);

// Access validation
router.get('/validate-access/:userId', validatePremiumAccess);

// Exclusive staking pools
router.get('/exclusive-pools/:userId', getExclusiveStakingPools);

// Premium analytics
router.get('/analytics/:userId', getPremiumAnalytics);

// Penalty discounts
router.post('/penalty-discount/:userId', csrfProtection,  calculatePremiumPenaltyDiscount);

// Custom staking options
router.post('/custom-staking/:userId', csrfProtection,  createCustomStakingOption);

// Premium events and promotions
router.get('/events/:userId', getPremiumStakingEvents);

export default router;