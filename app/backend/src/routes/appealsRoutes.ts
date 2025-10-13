import { Router } from 'express';
import express from 'express';
import { AppealsController } from '../controllers/appealsController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const appealsController = new AppealsController();

router.post('/', authenticateToken, asyncHandler(appealsController.createAppeal));
router.get('/', authenticateToken, asyncHandler(appealsController.getAppeals));
router.get('/:id', authenticateToken, asyncHandler(appealsController.getAppealById));
router.put('/:id', authenticateToken, asyncHandler(appealsController.updateAppeal));
router.delete('/:id', authenticateToken, asyncHandler(appealsController.deleteAppeal));

export default router;
