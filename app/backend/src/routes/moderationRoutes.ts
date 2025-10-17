import { Router } from 'express';
import { moderationController } from '../controllers/moderationController';

const router = Router();

// Moderation Queue Routes
router.get('/', moderationController.getModerationQueue.bind(moderationController));
router.post('/:itemId/assign', moderationController.assignModerationItem.bind(moderationController));
router.post('/:itemId/resolve', moderationController.resolveModerationItem.bind(moderationController));

export default router;