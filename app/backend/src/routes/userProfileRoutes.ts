import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { UserProfileController } from '../controllers/userProfileController';
import { authMiddleware as authenticateToken } from '../middleware/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const userProfileController = new UserProfileController();

// Note: More specific routes (like /address/:address) must come BEFORE generic routes (like /:id)
// to prevent Express from matching /address/0x123 as /:id with id="address"

router.post('/', csrfProtection,  authenticateToken, asyncHandler(userProfileController.createProfile));
router.get('/address/:address', asyncHandler(userProfileController.getProfileByAddress));
router.get('/public/:walletAddress', asyncHandler(userProfileController.getPublicProfile));
router.get('/:id', asyncHandler(userProfileController.getProfileById));
router.put('/:id', csrfProtection,  authenticateToken, asyncHandler(userProfileController.updateProfile));
router.delete('/:id', csrfProtection,  authenticateToken, asyncHandler(userProfileController.deleteProfile));

export default router;
