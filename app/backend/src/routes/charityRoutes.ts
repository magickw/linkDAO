import { Router } from 'express';
import { charityController } from '../controllers/charityController';
import { authenticateToken } from '../middleware/auth';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * @route GET /api/admin/charities
 * @desc Get all charity proposals
 * @access Admin only
 */
router.get('/charities', authenticateToken, validateAdminRole, (req, res) => {
    return charityController.getCharities(req, res);
});

/**
 * @route GET /api/admin/charities/stats
 * @desc Get charity statistics
 * @access Admin only
 */
router.get('/charities/stats', authenticateToken, validateAdminRole, (req, res) => {
    return charityController.getCharityStats(req, res);
});

/**
 * @route GET /api/admin/charities/:id
 * @desc Get a single charity proposal
 * @access Admin only
 */
router.get('/charities/:id', authenticateToken, validateAdminRole, (req, res) => {
    return charityController.getCharity(req, res);
});

/**
 * @route POST /api/admin/charities/:id/approve
 * @desc Approve a charity proposal
 * @access Admin only
 */
router.post('/charities/:id/approve', authenticateToken, validateAdminRole, (req, res) => {
    return charityController.approveCharity(req, res);
});

/**
 * @route POST /api/admin/charities/:id/reject
 * @desc Reject a charity proposal
 * @access Admin only
 */
router.post('/charities/:id/reject', authenticateToken, validateAdminRole, (req, res) => {
    return charityController.rejectCharity(req, res);
});

export default router;
