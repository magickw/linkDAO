
import { Request, Response } from 'express';
import communityNotificationService from '../services/communityNotificationService';
import { safeLogger } from '../utils/safeLogger';
import { users } from '../db/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

export class UserNotificationController {

    /**
     * Get user notifications
     */
    async getNotifications(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Get user wallet address (since notification service uses address)
            const userResult = await db
                .select({ walletAddress: users.walletAddress })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (userResult.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userResult[0];

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const offset = (page - 1) * limit;

            const result = await communityNotificationService.getUserNotifications(
                user.walletAddress,
                limit,
                offset
            );

            res.json(result);
        } catch (error) {
            safeLogger.error('Error getting user notifications:', error);
            res.status(500).json({ error: 'Failed to get notifications' });
        }
    }

    /**
     * Get a single notification by ID
     */
    async getNotification(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'Notification ID is required' });
            }

            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Get user wallet address
            const userResult = await db
                .select({ walletAddress: users.walletAddress })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (userResult.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userResult[0];

            const notification = await communityNotificationService.getNotificationById(
                parseInt(id),
                user.walletAddress
            );

            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            res.json(notification);
        } catch (error) {
            safeLogger.error('Error getting notification:', error);
            res.status(500).json({ error: 'Failed to get notification' });
        }
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const userResult = await db
                .select({ walletAddress: users.walletAddress })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (userResult.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userResult[0];

            // Use the service to get notifications which includes unread count
            // Limit 1 is efficient enough for now
            const result = await communityNotificationService.getUserNotifications(
                user.walletAddress,
                1,
                0
            );

            res.json({ count: result.unreadCount });
        } catch (error) {
            safeLogger.error('Error getting unread count:', error);
            res.status(500).json({ error: 'Failed to get unread count' });
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'Notification ID is required' });
            }

            await communityNotificationService.markAsRead(parseInt(id));
            res.json({ success: true });
        } catch (error) {
            safeLogger.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const userResult = await db
                .select({ walletAddress: users.walletAddress })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (userResult.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userResult[0];

            await communityNotificationService.markAllAsRead(user.walletAddress);
            res.json({ success: true });
        } catch (error) {
            safeLogger.error('Error marking all notifications as read:', error);
            res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    }
}


export const userNotificationController = new UserNotificationController();
