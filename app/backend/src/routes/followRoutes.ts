import express, { Request, Response, NextFunction } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { FollowController } from '../controllers/followController';
import rateLimit from 'express-rate-limit';

// Rate limiting for follow endpoints
const followRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'FOLLOW_RATE_LIMIT_EXCEEDED',
      message: 'Too many follow requests, please try again later',
    }
  }
});

// Async handler wrapper to properly handle promise rejections
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

const router = express.Router();
const followController = new FollowController();

router.post('/follow', followRateLimit, csrfProtection, asyncHandler((req, res) => followController.follow(req, res)));
router.post('/unfollow', followRateLimit, csrfProtection, asyncHandler((req, res) => followController.unfollow(req, res)));
router.get('/followers/:address', followRateLimit, asyncHandler((req, res) => followController.getFollowers(req, res)));
router.get('/following/:address', followRateLimit, asyncHandler((req, res) => followController.getFollowing(req, res)));
router.get('/is-following/:follower/:following', followRateLimit, asyncHandler((req, res) => followController.isFollowing(req, res)));
router.get('/count/:address', followRateLimit, asyncHandler((req, res) => followController.getFollowCount(req, res)));

export default router;
