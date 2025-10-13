import express from 'express';
import { AIController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const aiController = new AIController();

// AI Analysis Routes
router.post('/analyze/listing/:listingId', authenticateToken, asyncHandler(aiController.analyzeListing));
router.post('/assist/dispute/:disputeId', authenticateToken, asyncHandler(aiController.assistDisputeResolution));
router.post('/detect/fraud/:userAddress', authenticateToken, asyncHandler(aiController.detectFraud));
router.post('/suggest/price', authenticateToken, asyncHandler(aiController.suggestPrice));
router.post('/moderate/pending', authenticateToken, asyncHandler(aiController.processPendingModeration));

export default router;