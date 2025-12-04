import { Router } from 'express';
import { announcementService } from '../services/announcementService';
import { authMiddleware } from '../middleware/authMiddleware';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * POST /api/communities/:id/announcements
 * Create a new announcement
 * Requires authentication and admin/moderator role
 */
router.post('/communities/:id/announcements', authMiddleware, async (req, res) => {
    try {
        const { id: communityId } = req.params;
        const { title, content, type, expiresAt } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required',
            });
        }

        const result = await announcementService.createAnnouncement({
            communityId,
            title,
            content,
            type: type || 'info',
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            createdBy: userId,
        });

        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(403).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in create announcement route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * PUT /api/announcements/:id
 * Update an announcement
 * Requires authentication and admin/moderator role
 */
router.put('/announcements/:id', authMiddleware, async (req, res) => {
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

        const result = await announcementService.updateAnnouncement(id, userId, {
            ...updateData,
            expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined,
        });

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(403).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in update announcement route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * DELETE /api/announcements/:id
 * Delete an announcement
 * Requires authentication and admin/moderator role
 */
router.delete('/announcements/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const result = await announcementService.deleteAnnouncement(id, userId);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(403).json(result);
        }
    } catch (error) {
        safeLogger.error('Error in delete announcement route:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

/**
 * GET /api/communities/:id/announcements
 * Get active announcements for a community
 * Public access
 */
router.get('/communities/:id/announcements', async (req, res) => {
    try {
        const { id: communityId } = req.params;

        const announcements = await announcementService.getActiveAnnouncements(communityId);

        return res.status(200).json({
            success: true,
            data: announcements,
        });
    } catch (error) {
        safeLogger.error('Error fetching active announcements:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch announcements',
        });
    }
});

/**
 * GET /api/communities/:id/announcements/all
 * Get all announcements for a community (for management)
 * Requires authentication and admin/moderator role
 */
router.get('/communities/:id/announcements/all', authMiddleware, async (req, res) => {
    try {
        const { id: communityId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const announcements = await announcementService.getAllAnnouncements(communityId, userId);

        return res.status(200).json({
            success: true,
            data: announcements,
        });
    } catch (error) {
        safeLogger.error('Error fetching all announcements:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch announcements',
        });
    }
});

export default router;
