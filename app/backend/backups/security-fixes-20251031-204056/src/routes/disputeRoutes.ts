/**
 * Dispute Resolution API Routes
 * RESTful endpoints for dispute management, evidence submission, and community voting
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { disputeController } from '../controllers/disputeController';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Dispute Routes
router.get('/', disputeController.getDisputes.bind(disputeController));
router.get('/:disputeId', disputeController.getDispute.bind(disputeController));
router.post('/:disputeId/assign', csrfProtection,  disputeController.assignDispute.bind(disputeController));
router.post('/:disputeId/resolve', csrfProtection,  disputeController.resolveDispute.bind(disputeController));
router.post('/:disputeId/notes', csrfProtection,  disputeController.addDisputeNote.bind(disputeController));

// Evidence Management Routes
router.post('/:disputeId/evidence', csrfProtection,  disputeController.uploadDisputeEvidence.bind(disputeController));
router.delete('/:disputeId/evidence/:evidenceId', csrfProtection,  disputeController.deleteDisputeEvidence.bind(disputeController));
router.patch('/:disputeId/evidence/:evidenceId/status', csrfProtection,  disputeController.updateEvidenceStatus.bind(disputeController));

// Communication Thread Routes
router.get('/:disputeId/messages', disputeController.getDisputeMessages.bind(disputeController));
router.post('/:disputeId/messages', csrfProtection,  disputeController.sendDisputeMessage.bind(disputeController));

export default router;
