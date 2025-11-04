import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { EnhancedUserController } from '../controllers/enhancedUserController';
import rateLimit from 'express-rate-limit';

// Rate limiting for user endpoints
const userRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500, // Increased to 500 requests per minute
  message: {
    success: false,
    error: {
      code: 'USER_RATE_LIMIT_EXCEEDED',
      message: 'Too many user requests, please try again later',
    }
  }
});

const router = Router();
const userController = new EnhancedUserController();

// User profile routes
router.get('/profile/:userId', userRateLimit, userController.getUserProfile.bind(userController));
router.get('/profile/address/:address', userRateLimit, userController.getUserProfileByAddress.bind(userController));
router.get('/profile/handle/:handle', userRateLimit, userController.getUserProfileByHandle.bind(userController));

// User community memberships routes
router.get('/:address/memberships', userRateLimit, userController.getUserMemberships.bind(userController));

// User discovery routes
router.get('/suggestions/:userId', userRateLimit, userController.getSuggestedUsers.bind(userController));
router.get('/search', userRateLimit, userController.searchUsers.bind(userController));
router.get('/trending', userRateLimit, userController.getTrendingUsers.bind(userController));

// Follow/unfollow routes
router.post('/follow/:userId/:targetUserId', userRateLimit, csrfProtection,  userController.followUser.bind(userController));
router.delete('/follow/:userId/:targetUserId', userRateLimit, csrfProtection,  userController.unfollowUser.bind(userController));
router.get('/follow-status/:userId/:targetUserId', userRateLimit, userController.checkFollowStatus.bind(userController));

// Social connections routes
router.get('/followers/:userId', userRateLimit, userController.getFollowers.bind(userController));
router.get('/following/:userId', userRateLimit, userController.getFollowing.bind(userController));

export default router;