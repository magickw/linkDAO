import { Router } from 'express';
import {
  getStakingTiers,
  getFlexibleStakingOptions,
  calculateStakingRewards,
  createStakePosition,
  getUserStakePositions,
  calculateEarlyWithdrawalPenalty,
  processPartialUnstaking,
  processAutoCompounding,
  getUserStakingAnalytics,
  getStakingTierDetails,
  getStakePositionDetails,
  healthCheck
} from '../controllers/enhancedStakingController';

const router = Router();

// Health check
router.get('/health', healthCheck);

// Staking tiers
router.get('/tiers', getStakingTiers);
router.get('/tiers/:tierId', getStakingTierDetails);

// Flexible staking options
router.get('/options/:userId', getFlexibleStakingOptions);

// Staking calculations
router.post('/calculate-rewards', calculateStakingRewards);
router.get('/calculate-penalty/:positionId', calculateEarlyWithdrawalPenalty);

// Staking positions
router.post('/positions', createStakePosition);
router.get('/positions/:userId', getUserStakePositions);
router.get('/position/:positionId', getStakePositionDetails);

// Staking operations
router.post('/partial-unstake', processPartialUnstaking);
router.post('/auto-compound', processAutoCompounding);

// Analytics
router.get('/analytics/:userId', getUserStakingAnalytics);

export default router;