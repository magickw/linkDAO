import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { TipController } from '../controllers/tipController';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const tipController = new TipController();

// POST /tips - Create a new tip
router.post('/', csrfProtection,  tipController.createTip);

// GET /users/:id/earnings - Get earnings for a user
router.get('/users/:id/earnings', tipController.getUserEarnings);

// POST /rewards/claim - Claim rewards
router.post('/rewards/claim', csrfProtection,  tipController.claimRewards);

// GET /posts/:id/tips - Get tips for a post
router.get('/posts/:id/tips', tipController.getPostTips);

export default router;