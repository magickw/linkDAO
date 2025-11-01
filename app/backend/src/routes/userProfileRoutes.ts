import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { UserProfileController } from '../controllers/userProfileController';
import { authMiddleware as authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const userProfileController = new UserProfileController();

router.post('/', csrfProtection,  authenticateToken, asyncHandler(userProfileController.createProfile));
router.get('/:id', asyncHandler(userProfileController.getProfileById));
router.get('/address/:address', asyncHandler(userProfileController.getProfileByAddress));
router.put('/:id', csrfProtection,  authenticateToken, asyncHandler(userProfileController.updateProfile));
router.delete('/:id', csrfProtection,  authenticateToken, asyncHandler(userProfileController.deleteProfile));
router.get('/', asyncHandler(userProfileController.getAllProfiles));

export default router;
