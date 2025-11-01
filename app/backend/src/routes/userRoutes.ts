import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { userController } from '../controllers/userController';
import { adminController } from '../controllers/adminController';

const router = Router();

// User Management Routes
router.get('/', userController.getUsers.bind(userController));
router.get('/:userId/activity', adminController.getUserActivity.bind(adminController));
router.post('/:userId/suspend', csrfProtection,  userController.suspendUser.bind(userController));
router.post('/:userId/unsuspend', csrfProtection,  userController.unsuspendUser.bind(userController));
router.put('/:userId/role', csrfProtection,  userController.updateUserRole.bind(userController));

export default router;
