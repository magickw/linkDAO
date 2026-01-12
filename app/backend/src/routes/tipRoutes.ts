import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { TipController } from '../controllers/tipController';
import rateLimit from 'express-rate-limit';

// Rate limiting for tip endpoints
const tipRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'TIP_RATE_LIMIT_EXCEEDED',
      message: 'Too many tip requests, please try again later',
    }
  }
});

const tipCreationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 tip creations per minute
  message: {
    success: false,
    error: {
      code: 'TIP_CREATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many tip creations, please try again later',
    }
  }
});

const router = Router();
const tipController = new TipController();

// POST /tips - Create a new tip
router.post('/', authMiddleware, tipCreationRateLimit, csrfProtection, tipController.createTip);

// GET /users/:id/earnings - Get earnings for a user
router.get('/users/:id/earnings', tipRateLimit, tipController.getUserEarnings);

// POST /rewards/claim - Claim rewards
router.post('/rewards/claim', authMiddleware, tipCreationRateLimit, csrfProtection, tipController.claimRewards);

// GET /posts/:id/tips - Get tips for a post
router.get('/posts/:id/tips', tipRateLimit, tipController.getPostTips);

// POST /received - Get tips received by a user
router.post('/received', tipRateLimit, tipController.getReceivedTips);

// POST /sent - Get tips sent by a user
router.post('/sent', tipRateLimit, tipController.getSentTips);

// GET /total/:address - Get total tips for a user
router.get('/total/:address', tipRateLimit, tipController.getUserTotalTips);

export default router;
