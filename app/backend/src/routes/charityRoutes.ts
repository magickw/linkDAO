import { Router } from 'express';
import { charityController } from '../controllers/charityController';
import { csrfProtection } from '../middleware/csrfProtection';
import { requirePermission } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * @route GET /api/admin/charities
 * @desc Get all charity proposals
 * @access Admin only (governance.verify permission)
 */
router.get('/charities', requirePermission('governance.verify'), charityController.getCharities.bind(charityController));

/**
 * @route GET /api/admin/charities/stats
 * @desc Get charity statistics
 * @access Admin only (all admins can view stats)
 */
router.get('/charities/stats', charityController.getCharityStats.bind(charityController));

/**
 * @route GET /api/admin/charities/:id
 * @desc Get a single charity proposal
 * @access Admin only (governance.verify permission)
 */
router.get('/charities/:id', requirePermission('governance.verify'), charityController.getCharity.bind(charityController));

/**
 * @route POST /api/admin/charities/:id/approve
 * @desc Approve a charity proposal
 * @access Admin only (governance.verify permission)
 */
router.post('/charities/:id/approve', csrfProtection, requirePermission('governance.verify'), charityController.approveCharity.bind(charityController));

/**
 * @route POST /api/admin/charities/:id/reject
 * @desc Reject a charity proposal
 * @access Admin only (governance.verify permission)
 */
router.post('/charities/:id/reject', csrfProtection, requirePermission('governance.verify'), charityController.rejectCharity.bind(charityController));

export default router;
