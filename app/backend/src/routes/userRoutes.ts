import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

// User Management Routes
router.get('/', userController.getUsers.bind(userController));
router.post('/:userId/suspend', userController.suspendUser.bind(userController));
router.post('/:userId/unsuspend', userController.unsuspendUser.bind(userController));
router.put('/:userId/role', userController.updateUserRole.bind(userController));

export default router;