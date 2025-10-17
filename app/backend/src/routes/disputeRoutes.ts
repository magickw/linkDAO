/**
 * Dispute Resolution API Routes
 * RESTful endpoints for dispute management, evidence submission, and community voting
 */

import { Router } from 'express';
import { disputeController } from '../controllers/disputeController';

const router = Router();

// Dispute Routes
router.get('/', disputeController.getDisputes.bind(disputeController));
router.get('/:disputeId', disputeController.getDispute.bind(disputeController));
router.post('/:disputeId/assign', disputeController.assignDispute.bind(disputeController));
router.post('/:disputeId/resolve', disputeController.resolveDispute.bind(disputeController));
router.post('/:disputeId/notes', disputeController.addDisputeNote.bind(disputeController));

export default router;
