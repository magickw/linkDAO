import express from 'express';
import { userNotificationController } from '../controllers/userNotificationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get('/', (req, res) => userNotificationController.getNotifications(req, res));
router.post('/:id/read', (req, res) => userNotificationController.markAsRead(req, res));
router.post('/read-all', (req, res) => userNotificationController.markAllAsRead(req, res));

export const userNotificationRoutes = router;
