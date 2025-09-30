/**
 * Gas Fee Sponsorship Routes
 * API routes for gas fee sponsorship system
 */

import { Router } from 'express';
import {
  getSponsorshipTiers,
  checkSponsorshipEligibility,
  applyForSponsorship,
  getSponsorshipStats,
  getUserSponsorshipHistory,
  getGasEstimates,
  getSponsorshipPoolBalance,
  updateSponsorshipTier,
  createSponsorshipTier,
  getDailyUsage
} from '../controllers/gasFeeSponsorshipController';

const router = Router();

// Public routes
router.get('/tiers', getSponsorshipTiers);
router.get('/gas-estimates', getGasEstimates);
router.get('/stats', getSponsorshipStats);
router.get('/pool/balance', getSponsorshipPoolBalance);

// User-specific routes
router.get('/eligibility/:userId', checkSponsorshipEligibility);
router.post('/apply', applyForSponsorship);
router.get('/history/:userId', getUserSponsorshipHistory);
router.get('/usage/:userId', getDailyUsage);

// Admin routes (would require authentication/authorization in production)
router.put('/tiers/:tierId', updateSponsorshipTier);
router.post('/tiers', createSponsorshipTier);

export { router as gasFeeSponsorshipRouter };