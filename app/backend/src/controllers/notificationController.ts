/**
 * Notification Controller
 * Handles push notification requests
 */

import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { AuthenticatedRequest } from '../types';

export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    /**
     * Register device token
     */
    registerToken = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { token, platform, deviceInfo } = req.body;
            const userId = req.user!.walletAddress; // Use walletAddress as per user rules

            await this.notificationService.registerToken({
                userId,
                token,
                platform,
                deviceInfo,
            });

            res.json({
                success: true,
                message: 'Device token registered',
            });
        } catch (error) {
            console.error('Error registering token:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to register device token',
            });
        }
    };

    /**
     * Get notification preferences
     */
    getPreferences = async (req: AuthenticatedRequest, res: Response) => {
        try {
            const userId = req.user!.walletAddress;

            const preferences = await this.notificationService.getPreferences(userId);

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

            await this.notificationService.updatePreferences(userId, preferences);

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

            await this.notificationService.sendPushNotification({
                userId,
                title,
                body,
                data,
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
}
