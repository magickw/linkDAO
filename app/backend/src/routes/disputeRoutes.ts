/**
 * Dispute Resolution API Routes
 * RESTful endpoints for dispute management, evidence submission, and community voting
 */

import { Router } from 'express';
import { DisputeController } from '../controllers/disputeController';

const disputeRouter = Router();
const disputeController = new DisputeController();

// Community dispute routes
disputeRouter.get('/community', 
  disputeController.getCommunityDisputes.bind(disputeController)
);

// Individual dispute routes
disputeRouter.get('/:id', 
  disputeController.getDisputeById.bind(disputeController)
);

disputeRouter.post('/', 
  disputeController.createDispute.bind(disputeController)
);

// Evidence submission
disputeRouter.post('/:id/evidence', 
  disputeController.submitEvidence.bind(disputeController)
);

// Community voting
disputeRouter.post('/:id/vote', 
  disputeController.castVote.bind(disputeController)
);

// Arbitration
disputeRouter.post('/:id/arbitrate', 
  disputeController.arbitrateDispute.bind(disputeController)
);

// Analytics and statistics
disputeRouter.get('/analytics', 
  disputeController.getDisputeAnalytics.bind(disputeController)
);

// User dispute history
disputeRouter.get('/user/:userId', 
  disputeController.getUserDisputes.bind(disputeController)
);

// Order-specific disputes
disputeRouter.get('/order/:orderId', 
  disputeController.getOrderDisputes.bind(disputeController)
);

export { disputeRouter };
