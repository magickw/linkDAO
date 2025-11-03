/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { adminNotificationService } from '../services/adminNotificationService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get admin notifications
 */
export const getAdminNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Admin ID not found in request'
      });
    }

    const { limit = 50, offset = 0 } = req.query;
    
    const notifications = await adminNotificationService.getAdminNotifications(
      adminId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: notifications,
      metadata: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        count: notifications.length
      }
    });
  } catch (error) {
    safeLogger.error('Error getting admin notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { notificationId } = req.params;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Admin ID not found in request'
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'Notification ID is required'
      });
    }

    const success = await adminNotificationService.markAsRead(notificationId);
    
    if (success) {
      res.json({
        success: true,
        data: { notificationId, markedAsRead: true }
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }
  } catch (error) {
    safeLogger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Admin ID not found in request'
      });
    }

    const success = await adminNotificationService.markAllAsRead(adminId);
    
    res.json({
      success: true,
      data: { adminId, allMarkedAsRead: success }
    });
  } catch (error) {
    safeLogger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Admin ID not found in request'
      });
    }

    const count = await adminNotificationService.getUnreadCount(adminId);
    
    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    safeLogger.error('Error getting unread notification count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread notification count',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Admin ID not found in request'
      });
    }

    const stats = await adminNotificationService.getNotificationStats(adminId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    safeLogger.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Register mobile push token
 */
export const registerMobilePushToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { token, platform } = req.body;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Admin ID not found in request'
      });
    }

    if (!token || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Token and platform are required'
      });
    }

    // This would integrate with your push notification service
    // For now, we'll just log it
    safeLogger.info(`Registered push token for admin ${adminId}: ${token} (${platform})`);
    
    res.json({
      success: true,
      message: 'Mobile push token registered successfully'
    });
  } catch (error) {
    safeLogger.error('Error registering mobile push token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register mobile push token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Unregister mobile push token
 */
export const unregisterMobilePushToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { token } = req.body;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Admin ID not found in request'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // This would integrate with your push notification service
    // For now, we'll just log it
    safeLogger.info(`Unregistered push token for admin ${adminId}: ${token}`);
    
    res.json({
      success: true,
      message: 'Mobile push token unregistered successfully'
    });
  } catch (error) {
    safeLogger.error('Error unregistering mobile push token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister mobile push token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
