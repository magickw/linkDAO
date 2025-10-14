import express from 'express';
import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const aiController = new AIController();

// Public routes
router.post('/moderate/listing/:listingId', (req, res) => aiController.analyzeListing(req, res));
router.post('/arbitrate/dispute/:disputeId', (req, res) => aiController.assistDisputeResolution(req, res));
router.get('/fraud/detect/:userAddress', (req, res) => aiController.detectFraud(req, res));
router.post('/pricing/suggest', (req, res) => aiController.suggestPrice(req, res));

// Protected routes (require authentication)
router.post('/moderate/process-pending', authenticateToken, (req, res) => aiController.processPendingModeration(req, res));

export default router;
