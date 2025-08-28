import express from 'express';
import { UserProfileController } from '../controllers/userProfileController';

const router = express.Router();
const userProfileController = new UserProfileController();

router.post('/', userProfileController.createProfile);
router.get('/:id', userProfileController.getProfileById);
router.get('/address/:address', userProfileController.getProfileByAddress);
router.put('/:id', userProfileController.updateProfile);
router.delete('/:id', userProfileController.deleteProfile);
router.get('/', userProfileController.getAllProfiles);

export default router;