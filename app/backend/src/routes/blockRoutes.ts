import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { BlockController } from '../controllers/blockController';
import rateLimit from 'express-rate-limit';

// Rate limiting for block endpoints
const blockRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'BLOCK_RATE_LIMIT_EXCEEDED',
      message: 'Too many block requests, please try again later',
    }
  }
});

const router = express.Router();
const blockController = new BlockController();

router.post('/block', blockRateLimit, csrfProtection, blockController.blockUser);
router.post('/unblock', blockRateLimit, csrfProtection, blockController.unblockUser);
router.get('/is-blocked/:blocker/:blocked', blockRateLimit, blockController.isBlocked);
router.get('/blocked-users/:address', blockRateLimit, blockController.getBlockedUsers);
router.get('/blocked-by/:address', blockRateLimit, blockController.getBlockedBy);

export default router;
