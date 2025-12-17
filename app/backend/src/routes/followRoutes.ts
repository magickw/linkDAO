import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { FollowController } from '../controllers/followController';
import rateLimit from 'express-rate-limit';

// Rate limiting for follow endpoints
const followRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: {
    success: false,
    error: {
      code: 'FOLLOW_RATE_LIMIT_EXCEEDED',
      message: 'Too many follow requests, please try again later',
    }
  }
});

const router = express.Router();
const followController = new FollowController();

router.post('/follow', followRateLimit, csrfProtection,  followController.follow);
router.post('/unfollow', followRateLimit, csrfProtection,  followController.unfollow);
router.get('/followers/:address', followRateLimit, followController.getFollowers);
router.get('/following/:address', followRateLimit, followController.getFollowing);
router.get('/is-following/:follower/:following', followRateLimit, followController.isFollowing);
router.get('/count/:address', followRateLimit, followController.getFollowCount);

export default router;
