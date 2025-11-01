/**
 * Gas Fee Sponsorship Routes
 * API routes for gas fee sponsorship system
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
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
router.post('/apply', csrfProtection,  applyForSponsorship);
router.get('/history/:userId', getUserSponsorshipHistory);
router.get('/usage/:userId', getDailyUsage);

// Admin routes (would require authentication/authorization in production)
router.put('/tiers/:tierId', csrfProtection,  updateSponsorshipTier);
router.post('/tiers', csrfProtection,  createSponsorshipTier);

export { router as gasFeeSponsorshipRouter };
