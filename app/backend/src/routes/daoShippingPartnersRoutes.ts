/**
 * DAO Shipping Partners Routes
 * API routes for DAO shipping partner management
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import {
  getShippingPartners,
  getPartnerById,
  createShippingQuote,
  getActiveProposals,
  submitProposalVote,
  createPartnerProposal,
  updatePartnerMetrics,
  getPartnerAnalytics,
  verifyPartnerRequirements
} from '../controllers/daoShippingPartnersController';

const router = Router();

// Public routes
router.get('/partners', getShippingPartners);
router.get('/partners/:partnerId', getPartnerById);
router.post('/quote', csrfProtection,  createShippingQuote);
router.get('/analytics', getPartnerAnalytics);

// Governance routes
router.get('/proposals', getActiveProposals);
router.post('/proposals', csrfProtection,  createPartnerProposal);
router.post('/proposals/vote', csrfProtection,  submitProposalVote);

// Partner management routes
router.put('/partners/:partnerId/metrics', csrfProtection,  updatePartnerMetrics);
router.get('/partners/:partnerId/verify', verifyPartnerRequirements);

export { router as daoShippingPartnersRouter };
