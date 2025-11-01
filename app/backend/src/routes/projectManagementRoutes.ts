import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { projectManagementController } from '../controllers/projectManagementController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Time Tracking Routes
router.post('/time-tracking/start', csrfProtection,  [
  body('bookingId').isUUID().withMessage('Valid booking ID is required'),
  body('milestoneId').optional().isUUID().withMessage('Milestone ID must be a valid UUID'),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  body('hourlyRate').optional().isDecimal().withMessage('Hourly rate must be a valid decimal'),
  validateRequest
], projectManagementController.startTimeTracking.bind(projectManagementController));

router.post('/time-tracking/stop', csrfProtection,  [
  body('timeTrackingId').isUUID().withMessage('Valid time tracking ID is required'),
  body('description').optional().isString().trim().isLength({ max: 500 }),
  validateRequest
], projectManagementController.stopTimeTracking.bind(projectManagementController));

router.get('/time-tracking/active', 
  projectManagementController.getActiveTimeTracking.bind(projectManagementController)
);

router.get('/time-tracking/booking/:bookingId', [
  param('bookingId').isUUID().withMessage('Valid booking ID is required'),
  validateRequest
], projectManagementController.getTimeTracking.bind(projectManagementController));

// Deliverables Routes
router.post('/deliverables', csrfProtection,  [
  body('bookingId').isUUID().withMessage('Valid booking ID is required'),
  body('milestoneId').optional().isUUID().withMessage('Milestone ID must be a valid UUID'),
  body('title').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be 1-255 characters'),
  body('description').optional().isString().trim().isLength({ max: 1000 }),
  body('deliverableType').isIn(['file', 'link', 'text', 'code', 'design']).withMessage('Invalid deliverable type'),
  body('content').optional().isString(),
  body('url').optional().isURL().withMessage('URL must be valid'),
  body('fileHash').optional().isString().isLength({ min: 1, max: 128 }),
  body('fileName').optional().isString().isLength({ min: 1, max: 255 }),
  body('fileSize').optional().isInt({ min: 0 }),
  body('fileType').optional().isString().isLength({ min: 1, max: 100 }),
  validateRequest
], projectManagementController.createDeliverable.bind(projectManagementController));

router.put('/deliverables/:deliverableId', csrfProtection,  [
  param('deliverableId').isUUID().withMessage('Valid deliverable ID is required'),
  body('title').optional().isString().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().isString().trim().isLength({ max: 1000 }),
  body('content').optional().isString(),
  body('url').optional().isURL(),
  body('status').optional().isIn(['pending', 'in_progress', 'submitted', 'approved', 'rejected']),
  body('revisionNotes').optional().isString().trim().isLength({ max: 1000 }),
  validateRequest
], projectManagementController.updateDeliverable.bind(projectManagementController));

router.get('/deliverables/booking/:bookingId', [
  param('bookingId').isUUID().withMessage('Valid booking ID is required'),
  validateRequest
], projectManagementController.getDeliverables.bind(projectManagementController));

// Milestone Payments Routes
router.post('/milestone-payments', csrfProtection,  [
  body('milestoneId').isUUID().withMessage('Valid milestone ID is required'),
  body('amount').isDecimal().withMessage('Amount must be a valid decimal'),
  body('currency').isString().isLength({ min: 3, max: 10 }).withMessage('Currency must be 3-10 characters'),
  body('paymentMethod').isIn(['crypto', 'fiat', 'escrow']).withMessage('Invalid payment method'),
  body('releaseConditions').optional().isString().trim().isLength({ max: 1000 }),
  body('heldUntil').optional().isISO8601().withMessage('Held until must be a valid date'),
  validateRequest
], projectManagementController.createMilestonePayment.bind(projectManagementController));

router.put('/milestone-payments/:paymentId/process', csrfProtection,  [
  param('paymentId').isUUID().withMessage('Valid payment ID is required'),
  body('status').isIn(['pending', 'processing', 'held', 'released', 'refunded', 'disputed']).withMessage('Invalid status'),
  body('transactionHash').optional().isString().isLength({ min: 1, max: 66 }),
  validateRequest
], projectManagementController.processMilestonePayment.bind(projectManagementController));

// Communication Routes
router.post('/threads', csrfProtection,  [
  body('bookingId').isUUID().withMessage('Valid booking ID is required'),
  body('milestoneId').optional().isUUID().withMessage('Milestone ID must be a valid UUID'),
  body('threadType').isIn(['general', 'milestone', 'deliverable', 'payment', 'support']).withMessage('Invalid thread type'),
  body('title').isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be 1-255 characters'),
  body('isPrivate').optional().isBoolean(),
  validateRequest
], projectManagementController.createProjectThread.bind(projectManagementController));

router.post('/messages', csrfProtection,  [
  body('threadId').isUUID().withMessage('Valid thread ID is required'),
  body('messageType').optional().isIn(['text', 'file', 'image', 'code', 'milestone_update', 'payment_update', 'system']),
  body('content').optional().isString().trim().isLength({ max: 5000 }),
  body('fileAttachments').optional().isArray(),
  body('codeLanguage').optional().isString().isLength({ max: 50 }),
  body('replyTo').optional().isUUID(),
  validateRequest
], projectManagementController.sendProjectMessage.bind(projectManagementController));

router.get('/threads/booking/:bookingId', [
  param('bookingId').isUUID().withMessage('Valid booking ID is required'),
  validateRequest
], projectManagementController.getProjectThreads.bind(projectManagementController));

router.get('/messages/thread/:threadId', [
  param('threadId').isUUID().withMessage('Valid thread ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  validateRequest
], projectManagementController.getProjectMessages.bind(projectManagementController));

// Approval Routes
router.post('/approvals', csrfProtection,  [
  body('bookingId').isUUID().withMessage('Valid booking ID is required'),
  body('milestoneId').optional().isUUID().withMessage('Milestone ID must be a valid UUID'),
  body('deliverableId').optional().isUUID().withMessage('Deliverable ID must be a valid UUID'),
  body('approvalType').isIn(['milestone', 'deliverable', 'payment', 'completion']).withMessage('Invalid approval type'),
  body('autoApproveAt').optional().isISO8601().withMessage('Auto approve date must be valid'),
  validateRequest
], projectManagementController.createApproval.bind(projectManagementController));

router.put('/approvals/:approvalId/process', csrfProtection,  [
  param('approvalId').isUUID().withMessage('Valid approval ID is required'),
  body('status').isIn(['approved', 'rejected', 'changes_requested']).withMessage('Invalid approval status'),
  body('feedback').optional().isString().trim().isLength({ max: 1000 }),
  validateRequest
], projectManagementController.processApproval.bind(projectManagementController));

// File Management Routes
router.post('/files', csrfProtection,  [
  body('bookingId').isUUID().withMessage('Valid booking ID is required'),
  body('milestoneId').optional().isUUID().withMessage('Milestone ID must be a valid UUID'),
  body('deliverableId').optional().isUUID().withMessage('Deliverable ID must be a valid UUID'),
  body('fileName').isString().trim().isLength({ min: 1, max: 255 }).withMessage('File name is required'),
  body('fileHash').isString().isLength({ min: 1, max: 128 }).withMessage('File hash is required'),
  body('fileSize').isInt({ min: 1 }).withMessage('File size must be positive'),
  body('fileType').isString().isLength({ min: 1, max: 100 }).withMessage('File type is required'),
  body('accessLevel').optional().isIn(['public', 'project', 'milestone', 'private']),
  validateRequest
], projectManagementController.uploadProjectFile.bind(projectManagementController));

router.get('/files/booking/:bookingId', [
  param('bookingId').isUUID().withMessage('Valid booking ID is required'),
  query('milestoneId').optional().isUUID().withMessage('Milestone ID must be a valid UUID'),
  validateRequest
], projectManagementController.getProjectFiles.bind(projectManagementController));

// Dashboard Route
router.get('/dashboard/:bookingId', [
  param('bookingId').isUUID().withMessage('Valid booking ID is required'),
  validateRequest
], projectManagementController.getProjectDashboard.bind(projectManagementController));

export default router;
