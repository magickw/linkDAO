import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { moderationController } from '../controllers/moderationController';

const router = Router();

// Moderation Queue Routes
router.get('/history', moderationController.getModerationHistory.bind(moderationController));
router.get('/', moderationController.getModerationQueue.bind(moderationController));
router.post('/:itemId/assign', csrfProtection, moderationController.assignModerationItem.bind(moderationController));
router.post('/:itemId/resolve', csrfProtection, moderationController.resolveModerationItem.bind(moderationController));

export default router;
