import { Router } from 'express';
import { body, param } from 'express-validator';
import { sellerVerificationController } from '../controllers/sellerVerificationController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = Router();
const controller = sellerVerificationController;

// Validation middleware
const submitVerificationValidation = [
  param('sellerId').isUUID().withMessage('Valid seller ID is required'),
  body('legalName').notEmpty().withMessage('Legal name is required'),
  body('ein').optional().isLength({ min: 10, max: 10 }).withMessage('EIN must be in format ##-#######'),
  body('businessAddress').notEmpty().withMessage('Business address is required')
];

const verificationIdValidation = [
  param('id').isUUID().withMessage('Valid verification ID is required')
];

const approveVerificationValidation = [
  param('id').isUUID().withMessage('Valid verification ID is required'),
  body('verificationMethod').optional().isString().withMessage('Verification method must be a string'),
  body('verificationReference').optional().isString().withMessage('Verification reference must be a string'),
  body('riskScore').optional().isIn(['low', 'medium', 'high']).withMessage('Risk score must be low, medium, or high')
];

const rejectVerificationValidation = [
  param('id').isUUID().withMessage('Valid verification ID is required'),
  body('reason').notEmpty().withMessage('Rejection reason is required')
];

// Seller routes (authenticated sellers)
router.post(
  '/:sellerId/verification',
  authMiddleware,
  submitVerificationValidation,
  controller.submitVerification
);

router.get(
  '/:sellerId/verification',
  authMiddleware,
  controller.getVerificationStatus
);

// Admin routes (admin only)
router.get(
  '/verification/pending',
  adminMiddleware,
  controller.getPendingVerifications
);

router.get(
  '/verification/:id',
  adminMiddleware,
  verificationIdValidation,
  controller.getVerificationById
);

router.post(
  '/verification/:id/approve',
  adminMiddleware,
  approveVerificationValidation,
  controller.approveVerification
);

router.post(
  '/verification/:id/reject',
  adminMiddleware,
  rejectVerificationValidation,
  controller.rejectVerification
);

export default router;