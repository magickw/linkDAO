import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { pollController } from '../controllers/pollController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Public routes (no authentication required for viewing)
router.get('/poll/:pollId', pollController.getPoll.bind(pollController));
router.get('/post/:postId/poll', pollController.getPollByPost.bind(pollController));
router.get('/expiring-soon', pollController.getExpiringSoonPolls.bind(pollController));

// Protected routes (authentication required)
router.use(authenticateToken);

router.post('/create', csrfProtection,  pollController.createPoll.bind(pollController));
router.post('/poll/:pollId/vote', csrfProtection,  pollController.voteOnPoll.bind(pollController));
router.get('/user/voting-history', pollController.getUserVotingHistory.bind(pollController));

// Admin/moderator routes (TODO: Add role-based middleware)
router.delete('/poll/:pollId', csrfProtection,  pollController.deletePoll.bind(pollController));
router.patch('/poll/:pollId/expiration', csrfProtection,  pollController.updatePollExpiration.bind(pollController));

export default router;