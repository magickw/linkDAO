import express, { Request, Response, NextFunction } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { BlockController } from '../controllers/blockController';
import rateLimit from 'express-rate-limit';

// Rate limiting for block endpoints
const blockRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'BLOCK_RATE_LIMIT_EXCEEDED',
      message: 'Too many block requests, please try again later',
    }
  }
});

// Async handler wrapper to properly handle promise rejections
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = express.Router();
const blockController = new BlockController();

router.post('/block', blockRateLimit, csrfProtection, asyncHandler((req, res) => blockController.blockUser(req, res)));
router.post('/unblock', blockRateLimit, csrfProtection, asyncHandler((req, res) => blockController.unblockUser(req, res)));
router.get('/is-blocked/:blocker/:blocked', blockRateLimit, asyncHandler((req, res) => blockController.isBlocked(req, res)));
router.get('/blocked-users/:address', blockRateLimit, asyncHandler((req, res) => blockController.getBlockedUsers(req, res)));
router.get('/blocked-by/:address', blockRateLimit, asyncHandler((req, res) => blockController.getBlockedBy(req, res)));

export default router;
