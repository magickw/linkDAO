import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { notificationPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';
import pushNotificationService from '../services/pushNotificationService';

/**
 * Get notification preferences for a user
 */
export const getPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userAddress, userAddress))
      .limit(1);

    if (result.length > 0) {
      const prefs = JSON.parse(result[0].preferences);
      res.json({
        success: true,
        preferences: prefs,
      });
    } else {
      // Return default preferences
      res.json({
        success: true,
        preferences: {
          email: true,
          push: true,
          inApp: true,
          types: [
            'community_join',
            'new_post',
            'new_comment',
            'post_reply',
            'comment_reply',
            'post_upvote',
            'comment_upvote',
            'mention',
            'governance_proposal',
            'governance_vote',
            'governance_passed',
            'governance_executed',
            'moderation_action',
            'moderation_warning',
            'moderation_ban',
            'role_change',
            'role_promotion',
            'community_announcement',
          ],
        },
      });
    }
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
};

/**
 * Update notification preferences for a user
 */
export const updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { email, push, inApp, types } = req.body;

    // Validate input
    if (email === undefined && push === undefined && inApp === undefined && !types) {
      res.status(400).json({ error: 'At least one preference field is required' });
      return;
    }

    // Get existing preferences
    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userAddress, userAddress))
      .limit(1);

    const currentPrefs = existing.length > 0 ? JSON.parse(existing[0].preferences) : {
      email: true,
      push: true,
      inApp: true,
      types: [],
    };

    // Update preferences
    const updatedPrefs = {
      email: email !== undefined ? email : currentPrefs.email,
      push: push !== undefined ? push : currentPrefs.push,
      inApp: inApp !== undefined ? inApp : currentPrefs.inApp,
      types: types || currentPrefs.types,
    };

    const prefsJson = JSON.stringify(updatedPrefs);

    if (existing.length > 0) {
      // Update existing preferences
      await db
        .update(notificationPreferences)
        .set({
          preferences: prefsJson,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userAddress, userAddress));
    } else {
      // Insert new preferences
      await db.insert(notificationPreferences).values({
        userAddress,
        preferences: prefsJson,
      });
    }

    res.json({
      success: true,
      preferences: updatedPrefs,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};

/**
 * Register a push notification token
 */
export const registerPushToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { token, platform } = req.body;

    if (!token || !platform) {
      res.status(400).json({ error: 'Token and platform are required' });
      return;
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      res.status(400).json({ error: 'Invalid platform. Must be ios, android, or web' });
      return;
    }

    const success = await pushNotificationService.registerToken(
      userAddress,
      token,
      platform as 'ios' | 'android' | 'web'
    );

    if (success) {
      res.json({
        success: true,
        message: 'Push token registered successfully',
      });
    } else {
      res.status(500).json({ error: 'Failed to register push token' });
    }
  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
};

/**
 * Unregister a push notification token
 */
export const unregisterPushToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const success = await pushNotificationService.unregisterToken(token);

    if (success) {
      res.json({
        success: true,
        message: 'Push token unregistered successfully',
      });
    } else {
      res.status(500).json({ error: 'Failed to unregister push token' });
    }
  } catch (error) {
    console.error('Error unregistering push token:', error);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
};

/**
 * Test notification delivery (for debugging)
 */
export const testNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { type } = req.body;

    if (!type || !['email', 'push', 'both'].includes(type)) {
      res.status(400).json({ error: 'Invalid type. Must be email, push, or both' });
      return;
    }

    const testPayload = {
      userAddress,
      communityId: 'test-community',
      communityName: 'Test Community',
      type: 'community_announcement' as const,
      title: 'Test Notification',
      message: 'This is a test notification from LinkDAO',
      actionUrl: '/communities/test-community',
      contentPreview: 'Testing the notification delivery system',
    };

    const communityNotificationService = require('../services/communityNotificationService').default;

    if (type === 'email' || type === 'both') {
      await communityNotificationService.sendNotification({
        ...testPayload,
        // Force email only for this test
        metadata: { testMode: true },
      });
    }

    if (type === 'push' || type === 'both') {
      await pushNotificationService.sendToUser(userAddress, {
        title: 'Test Notification',
        body: 'This is a test push notification from LinkDAO',
        actionUrl: '/communities/test-community',
        data: { test: 'true' },
      });
    }

    res.json({
      success: true,
      message: `Test ${type} notification sent`,
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
};
