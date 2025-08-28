import express from 'express';
import { FollowController } from '../controllers/followController';

const router = express.Router();
const followController = new FollowController();

router.post('/follow', followController.follow);
router.post('/unfollow', followController.unfollow);
router.get('/followers/:address', followController.getFollowers);
router.get('/following/:address', followController.getFollowing);
router.get('/is-following/:follower/:following', followController.isFollowing);
router.get('/count/:address', followController.getFollowCount);

export default router;