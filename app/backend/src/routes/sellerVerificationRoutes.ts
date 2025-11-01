import { Router } from 'express';
import { body, param } from 'express-validator';
import { SellerVerificationController } from '../controllers/sellerVerificationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();
const controller = new SellerVerificationController();

// Admin routes (admin only)
router.get(
  '/verification/pending',
  validateAdminRole,
  (req, res) => controller.getPendingVerifications(req, res)
);

router.get(
  '/verification/:id',
  validateAdminRole,
  [
    param('id').isUUID().withMessage('Valid verification ID is required')
  ],
  (req, res) => controller.getVerificationById(req, res)
);

router.post(
  '/verification/:id/approve',
  validateAdminRole,
  [
    param('id').isUUID().withMessage('Valid verification ID is required'),
    body('verificationMethod').optional().isString().withMessage('Verification method must be a string'),
    body('verificationReference').optional().isString().withMessage('Verification reference must be a string'),
    body('riskScore').optional().isIn(['low', 'medium', 'high']).withMessage('Risk score must be low, medium, or high')
  ],
  (req, res) => controller.approveVerification(req, res)
);

router.post(
  '/verification/:id/reject',
  validateAdminRole,
  [
    param('id').isUUID().withMessage('Valid verification ID is required'),
    body('reason').notEmpty().withMessage('Rejection reason is required')
  ],
  (req, res) => controller.rejectVerification(req, res)
);

// Seller routes (authenticated sellers)
router.post(
  '/:sellerId/verification',
  authMiddleware,
  [
    param('sellerId').isUUID().withMessage('Valid seller ID is required'),
    body('legalName').notEmpty().withMessage('Legal name is required'),
    body('ein').optional().isLength({ min: 10, max: 10 }).withMessage('EIN must be in format ##-#######'),
    body('businessAddress').notEmpty().withMessage('Business address is required')
  ],
  (req, res) => controller.submitVerification(req, res)
);

router.get(
  '/:sellerId/verification',
  authMiddleware,
  (req, res) => controller.getVerificationStatus(req, res)
);

export default router;