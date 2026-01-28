/**
 * Notification Controller
 * Handles push notification requests
 */

import { Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { AuthenticatedRequest } from '../middleware/auth';
import { DatabaseService } from '../services/databaseService';

export class NotificationController {
    private notificationService: NotificationService;
    private databaseService: DatabaseService;

    constructor() {
        this.notificationService = new NotificationService();
        this.databaseService = new DatabaseService();
    }

    /**
     * Register device token
     */
    registerToken = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { token, platform, deviceInfo } = req.body;
            const userAddress = req.user!.walletAddress;

            if (!token || !platform) {
                return res.status(400).json({
                    success: false,
                    error: 'Token and platform are required',
                });
            }

            // Store token in database
            const success = await this.databaseService.storePushToken(userAddress, token, platform);

            if (success) {
                res.json({
                    success: true,
                    message: 'Device token registered successfully',
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to register device token',
                });
            }
        } catch (error) {
            console.error('Error registering token:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to register device token',
            });
        }
    };

    /**
     * Unregister device token
     */
    unregisterToken = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { token } = req.body;
            const userAddress = req.user!.walletAddress;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: 'Token is required',
                });
            }

            // Remove token from database
            const success = await this.databaseService.removePushToken(userAddress, token);

            if (success) {
                res.json({
                    success: true,
                    message: 'Device token unregistered successfully',
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to unregister device token',
                });
            }
        } catch (error) {
            console.error('Error unregistering token:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to unregister device token',
            });
        }
    };

    /**
     * Get notification preferences
     */
    getPreferences = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user!.walletAddress;

            const preferences = await this.notificationService.getNotificationPreferences(userId);

            res.json({
                success: true,
                data: preferences,
            });
        } catch (error) {
            console.error('Error getting preferences:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get preferences',
            });
        }
    };

    /**
     * Update notification preferences
     */
    updatePreferences = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user!.walletAddress;
            const preferences = req.body;

            await this.notificationService.updateNotificationPreferences(userId, preferences);

            res.json({
                success: true,
                message: 'Preferences updated',
            });
        } catch (error) {
            console.error('Error updating preferences:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update preferences',
            });
        }
    };

    /**
     * Send push notification
     */
    sendNotification = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { userId, title, body, data } = req.body;

            await this.notificationService.enqueueNotification(userId, {
                title,
                message: body,
                data,
                type: 'SYSTEM',
            });

            res.json({
                success: true,
                message: 'Notification sent',
            });
        } catch (error) {
            console.error('Error sending notification:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send notification',
            });
        }
    };

    /**
     * Get user notifications
     */
    getNotifications = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user!.walletAddress;
            const limit = parseInt(req.query.limit as string) || 20;
            const page = parseInt(req.query.page as string) || 1;
            const offset = (page - 1) * limit;

            const notifications = await this.notificationService.getUserNotifications(userId, { limit, offset });
            const unreadCount = await this.notificationService.getUnreadCount(userId);
            const totalCount = await this.notificationService.getTotalCount(userId);

            res.json({
                success: true,
                data: {
                    notifications,
                    pagination: {
                        page,
                        limit,
                        total: totalCount
                    },
                    unreadCount
                }
            });
        } catch (error) {
            console.error('Error getting notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get notifications'
            });
        }
    };

    /**
     * Mark notification as read
     */
    markAsRead = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user!.walletAddress;
            await this.notificationService.markAsRead(userId, id);
            
            res.json({ success: true, message: 'Marked as read' });
        } catch (error) {
            console.error('Error marking as read:', error);
            res.status(500).json({ success: false, error: 'Failed to mark as read' });
        }
    };

    /**
     * Mark all notifications as read
     */
    markAllAsRead = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user!.walletAddress;
            const success = await this.notificationService.markAllAsRead(userId);

            res.json({ success: true, message: 'All marked as read' });
        } catch (error) {
            console.error('Error marking all as read:', error);
            res.status(500).json({ success: false, error: 'Failed to mark all as read' });
        }
    };

    /**
     * Get unread count
     */
    getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user!.walletAddress;
            const count = await this.notificationService.getUnreadCount(userId);

            res.json({ success: true, count });
        } catch (error) {
            console.error('Error getting unread count:', error);
            res.status(500).json({ success: false, error: 'Failed to get unread count' });
        }
    };
}
