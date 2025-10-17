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

// Evidence Management Routes
router.post('/:disputeId/evidence', disputeController.uploadDisputeEvidence.bind(disputeController));
router.delete('/:disputeId/evidence/:evidenceId', disputeController.deleteDisputeEvidence.bind(disputeController));
router.patch('/:disputeId/evidence/:evidenceId/status', disputeController.updateEvidenceStatus.bind(disputeController));

// Communication Thread Routes
router.get('/:disputeId/messages', disputeController.getDisputeMessages.bind(disputeController));
router.post('/:disputeId/messages', disputeController.sendDisputeMessage.bind(disputeController));

export default router;
