import { Router } from 'express';
import { VerificationController } from '../controllers/verificationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware'; // To be confirmed

const router = Router();
const verificationController = new VerificationController();

// User Routes
router.post('/apply', authMiddleware, verificationController.submitRequest);
router.get('/my-requests', authMiddleware, verificationController.getMyRequests);

// Admin Routes
router.get('/admin/requests', authMiddleware, adminAuthMiddleware, verificationController.getAllPendingRequests);
router.post('/admin/review', authMiddleware, adminAuthMiddleware, verificationController.reviewRequest);
router.post('/admin/revoke', authMiddleware, adminAuthMiddleware, verificationController.revokeVerification);

export default router;
