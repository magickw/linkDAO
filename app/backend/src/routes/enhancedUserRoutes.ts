import { Router } from 'express';
import { EnhancedUserController } from '../controllers/enhancedUserController';

const router = Router();
const userController = new EnhancedUserController();

// User profile routes
router.get('/profile/:userId', userController.getUserProfile.bind(userController));
router.get('/profile/address/:address', userController.getUserProfileByAddress.bind(userController));
router.get('/profile/handle/:handle', userController.getUserProfileByHandle.bind(userController));

// User discovery routes
router.get('/suggestions/:userId', userController.getSuggestedUsers.bind(userController));
router.get('/search', userController.searchUsers.bind(userController));
router.get('/trending', userController.getTrendingUsers.bind(userController));

// Follow/unfollow routes
router.post('/follow/:userId/:targetUserId', userController.followUser.bind(userController));
router.delete('/follow/:userId/:targetUserId', userController.unfollowUser.bind(userController));
router.get('/follow-status/:userId/:targetUserId', userController.checkFollowStatus.bind(userController));

// Social connections routes
router.get('/followers/:userId', userController.getFollowers.bind(userController));
router.get('/following/:userId', userController.getFollowing.bind(userController));

export default router;