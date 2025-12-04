import { Router } from 'express';
import { monthlyUpdateService } from '../services/monthlyUpdateService';
import { authMiddleware } from '../middleware/authMiddleware';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * POST /api/communities/:id/monthly-updates
 * Create a new monthly update
 * Requires authentication and admin/moderator role
 */
router.post('/communities/:id/monthly-updates', authMiddleware, async (req, res) => {
    try {
        const { id: communityId } = req.params;
        const { title, content, summary, month, year, highlights, metrics, mediaCids } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        if (!title || !content || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'Title, content, month, and year are required',
            });
        }

        const result = await monthlyUpdateService.createMonthlyUpdate({
            communityId,
            title,
            content,
            summary,
            month: parseInt(month, 10),
            year: parseInt(year, 10),
            highlights,
            metrics,
            mediaCids,
            createdBy: userId,
        });

        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(result.message === 'Permission denied' ? 403 : 400).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in create monthly update route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * PUT /api/monthly-updates/:id
 * Update a monthly update
 * Requires authentication and admin/moderator role
 */
router.put('/monthly-updates/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const result = await monthlyUpdateService.updateMonthlyUpdate(id, userId, updateData);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(result.message === 'Permission denied' ? 403 : 404).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in update monthly update route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * POST /api/monthly-updates/:id/publish
 * Publish a monthly update
 * Requires authentication and admin/moderator role
 */
router.post('/monthly-updates/:id/publish', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const result = await monthlyUpdateService.publishMonthlyUpdate(id, userId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(result.message === 'Permission denied' ? 403 : 404).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in publish monthly update route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * POST /api/monthly-updates/:id/unpublish
 * Unpublish a monthly update
 * Requires authentication and admin/moderator role
 */
router.post('/monthly-updates/:id/unpublish', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const result = await monthlyUpdateService.unpublishMonthlyUpdate(id, userId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(result.message === 'Permission denied' ? 403 : 404).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in unpublish monthly update route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/monthly-updates/:id
 * Delete a monthly update
 * Requires authentication and admin/moderator role
 */
router.delete('/monthly-updates/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const result = await monthlyUpdateService.deleteMonthlyUpdate(id, userId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(result.message === 'Permission denied' ? 403 : 404).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in delete monthly update route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * GET /api/monthly-updates/:id
 * Get a single monthly update by ID
 * Public access (for published updates)
 */
router.get('/monthly-updates/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const update = await monthlyUpdateService.getMonthlyUpdate(id);

        if (!update) {
            return res.status(404).json({
                success: false,
                message: 'Monthly update not found',
            });
        }

        // Check if published or user has access
        if (!update.isPublished) {
            // For unpublished updates, require auth
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(404).json({
                    success: false,
                    message: 'Monthly update not found',
                });
            }
        }

        return res.status(200).json({
            success: true,
            data: update,
        });
    } catch (error) {
        safeLogger.error('Error fetching monthly update:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly update',
        });
    }
});

/**
 * GET /api/communities/:id/monthly-updates
 * Get published monthly updates for a community
 * Public access
 */
router.get('/communities/:id/monthly-updates', async (req, res) => {
    try {
        const { id: communityId } = req.params;
        const limit = parseInt(req.query.limit as string || '12', 10);

        const updates = await monthlyUpdateService.getPublishedUpdates(communityId, limit);

        return res.status(200).json({
            success: true,
            data: updates,
        });
    } catch (error) {
        safeLogger.error('Error fetching published monthly updates:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly updates',
        });
    }
});

/**
 * GET /api/communities/:id/monthly-updates/all
 * Get all monthly updates for a community (for management)
 * Requires authentication and admin/moderator role
 */
router.get('/communities/:id/monthly-updates/all', authMiddleware, async (req, res) => {
    try {
        const { id: communityId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const updates = await monthlyUpdateService.getAllUpdates(communityId, userId);

        return res.status(200).json({
            success: true,
            data: updates,
        });
    } catch (error) {
        safeLogger.error('Error fetching all monthly updates:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly updates',
        });
    }
});

/**
 * GET /api/communities/:id/monthly-updates/latest
 * Get the latest published monthly update for a community
 * Public access
 */
router.get('/communities/:id/monthly-updates/latest', async (req, res) => {
    try {
        const { id: communityId } = req.params;

        const update = await monthlyUpdateService.getLatestUpdate(communityId);

        return res.status(200).json({
            success: true,
            data: update,
        });
    } catch (error) {
        safeLogger.error('Error fetching latest monthly update:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly update',
        });
    }
});

/**
 * GET /api/communities/:id/monthly-updates/:year/:month
 * Get monthly update for a specific month/year
 * Public access (for published updates)
 */
router.get('/communities/:id/monthly-updates/:year/:month', async (req, res) => {
    try {
        const { id: communityId, year, month } = req.params;

        const update = await monthlyUpdateService.getUpdateForMonth(
            communityId,
            parseInt(month, 10),
            parseInt(year, 10)
        );

        if (!update) {
            return res.status(404).json({
                success: false,
                message: 'Monthly update not found for this period',
            });
        }

        // Check if published
        if (!update.isPublished) {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(404).json({
                    success: false,
                    message: 'Monthly update not found for this period',
                });
            }
        }

        return res.status(200).json({
            success: true,
            data: update,
        });
    } catch (error) {
        safeLogger.error('Error fetching monthly update for period:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch monthly update',
        });
    }
});

export default router;
