import { Router } from 'express';
import { charityController } from '../controllers/charityController';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';

const router = Router();

/**
 * @route GET /api/admin/charities
 * @desc Get all charity proposals
 * @access Admin only
 */
router.get('/charities', authenticate, requireAdmin, (req, res) => {
    charityController.getCharities(req, res);
});

/**
 * @route GET /api/admin/charities/stats
 * @desc Get charity statistics
 * @access Admin only
 */
router.get('/charities/stats', authenticate, requireAdmin, (req, res) => {
    charityController.getCharityStats(req, res);
});

/**
 * @route GET /api/admin/charities/:id
 * @desc Get a single charity proposal
 * @access Admin only
 */
router.get('/charities/:id', authenticate, requireAdmin, (req, res) => {
    charityController.getCharity(req, res);
});

/**
 * @route POST /api/admin/charities/:id/approve
 * @desc Approve a charity proposal
 * @access Admin only
 */
router.post('/charities/:id/approve', authenticate, requireAdmin, (req, res) => {
    charityController.approveCharity(req, res);
});

/**
 * @route POST /api/admin/charities/:id/reject
 * @desc Reject a charity proposal
 * @access Admin only
 */
router.post('/charities/:id/reject', authenticate, requireAdmin, (req, res) => {
    charityController.rejectCharity(req, res);
});

export default router;
