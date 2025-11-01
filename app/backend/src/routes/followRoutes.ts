import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { FollowController } from '../controllers/followController';

const router = express.Router();
const followController = new FollowController();

router.post('/follow', csrfProtection,  followController.follow);
router.post('/unfollow', csrfProtection,  followController.unfollow);
router.get('/followers/:address', followController.getFollowers);
router.get('/following/:address', followController.getFollowing);
router.get('/is-following/:follower/:following', followController.isFollowing);
router.get('/count/:address', followController.getFollowCount);

export default router;
