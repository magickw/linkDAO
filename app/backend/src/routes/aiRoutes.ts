import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const aiController = new AIController();

// Public routes
router.post('/moderate/listing/:listingId', csrfProtection,  (req, res) => aiController.analyzeListing(req, res));
router.post('/arbitrate/dispute/:disputeId', csrfProtection,  (req, res) => aiController.assistDisputeResolution(req, res));
router.get('/fraud/detect/:userAddress', (req, res) => aiController.detectFraud(req, res));
router.post('/pricing/suggest', csrfProtection,  (req, res) => aiController.suggestPrice(req, res));

// Protected routes (require authentication)
router.post('/moderate/process-pending', csrfProtection,  authenticateToken, (req, res) => aiController.processPendingModeration(req, res));

export default router;
