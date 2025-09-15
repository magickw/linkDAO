/**
 * DAO Shipping Partners Routes
 * API routes for DAO shipping partner management
 */

import { Router } from 'express';
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
router.post('/quote', createShippingQuote);
router.get('/analytics', getPartnerAnalytics);

// Governance routes
router.get('/proposals', getActiveProposals);
router.post('/proposals', createPartnerProposal);
router.post('/proposals/vote', submitProposalVote);

// Partner management routes
router.put('/partners/:partnerId/metrics', updatePartnerMetrics);
router.get('/partners/:partnerId/verify', verifyPartnerRequirements);

export { router as daoShippingPartnersRouter };", "original_text": "", "replace_all": false}]