import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { avatarService } from '../services/avatarMediaService'; // Note: Ensure export matches
import { safeLogger } from '../utils/safeLogger';

const router = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WEBP and GIF are allowed.'));
        }
    }
});

// GET /api/avatars/:userId
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { size } = req.query; // Size parameter might be used for generating specific URL params

        // TODO: support size param in service if needed, currently service handles basic URL
        const url = await avatarService.getUserAvatarUrl(userId);

        // If size mapping is needed, we could append it here, but let's rely on service
        res.json({ url });
    } catch (error) {
        safeLogger.error('Error fetching avatar URL:', error);
        res.status(500).json({ error: 'Failed to fetch avatar URL' });
    }
});

// POST /api/avatars/upload
router.post('/upload', authenticateToken, upload.single('avatar'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No avatar file provided' });
        }

        const userId = (req.user as any)?.userId || req.body.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await avatarService.uploadAvatar(
            userId,
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype
        );

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Upload failed' });
        }

        res.json(result);
    } catch (error) {
        safeLogger.error('Error uploading avatar:', error);
        res.status(500).json({ error: 'Avatar upload failed' });
    }
});

// DELETE /api/avatars/:userId
router.delete('/:userId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const requestingUser = (req.user as any)?.userId;

        // Only allow users to delete their own avatar, or admins
        if (userId !== requestingUser && !(req.user as any)?.isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const success = await avatarService.deleteAvatar(userId);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Avatar not found or could not be deleted' });
        }
    } catch (error) {
        safeLogger.error('Error deleting avatar:', error);
        res.status(500).json({ error: 'Failed to delete avatar' });
    }
});

export default router;
