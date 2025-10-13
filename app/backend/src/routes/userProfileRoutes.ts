import express from 'express';
import { UserProfileController } from '../controllers/userProfileController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const userProfileController = new UserProfileController();

router.post('/', authenticateToken, asyncHandler(userProfileController.createProfile));
router.get('/:id', asyncHandler(userProfileController.getProfileById));
router.get('/address/:address', asyncHandler(userProfileController.getProfileByAddress));
router.put('/:id', authenticateToken, asyncHandler(userProfileController.updateProfile));
router.delete('/:id', authenticateToken, asyncHandler(userProfileController.deleteProfile));
router.get('/', asyncHandler(userProfileController.getAllProfiles));

export default router;