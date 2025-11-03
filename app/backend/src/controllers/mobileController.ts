/// <reference path="../types/express.d.ts" />
import { Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { pushTokens, notificationPreferences } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import pushNotificationService from '../services/pushNotificationService';
import { posts, communities, communityMembers } from '../db/schema';
import mobileOfflineService from '../services/mobileOfflineService';
import offlineService from '../services/offlineService';

/**
 * Register a mobile push notification token
 */
export const registerMobilePushToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Mobile push token registered successfully',
      });
    } else {
      res.status(500).json({ error: 'Failed to register mobile push token' });
    }
  } catch (error) {
    safeLogger.error('Error registering mobile push token:', error);
    res.status(500).json({ error: 'Failed to register mobile push token' });
  }
};

/**
 * Unregister a mobile push notification token
 */
export const unregisterMobilePushToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        message: 'Mobile push token unregistered successfully',
      });
    } else {
      res.status(500).json({ error: 'Failed to unregister mobile push token' });
    }
  } catch (error) {
    safeLogger.error('Error unregistering mobile push token:', error);
    res.status(500).json({ error: 'Failed to unregister mobile push token' });
  }
};

/**
 * Update mobile notification preferences
 */
export const updateMobileNotificationPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { posts, comments, governance, moderation, mentions, digestFrequency } = req.body;

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

    // Update mobile-specific preferences
    const updatedPrefs = {
      ...currentPrefs,
      mobile: {
        posts: posts !== undefined ? posts : currentPrefs.mobile?.posts || true,
        comments: comments !== undefined ? comments : currentPrefs.mobile?.comments || true,
        governance: governance !== undefined ? governance : currentPrefs.mobile?.governance || true,
        moderation: moderation !== undefined ? moderation : currentPrefs.mobile?.moderation || true,
        mentions: mentions !== undefined ? mentions : currentPrefs.mobile?.mentions || true,
        digestFrequency: digestFrequency || currentPrefs.mobile?.digestFrequency || 'daily',
      }
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
    safeLogger.error('Error updating mobile notification preferences:', error);
    res.status(500).json({ error: 'Failed to update mobile notification preferences' });
  }
};

/**
 * Get mobile notification preferences
 */
export const getMobileNotificationPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
        preferences: prefs.mobile || {
          posts: true,
          comments: true,
          governance: true,
          moderation: true,
          mentions: true,
          digestFrequency: 'daily',
        },
      });
    } else {
      // Return default mobile preferences
      res.json({
        success: true,
        preferences: {
          posts: true,
          comments: true,
          governance: true,
          moderation: true,
          mentions: true,
          digestFrequency: 'daily',
        },
      });
    }
  } catch (error) {
    safeLogger.error('Error getting mobile notification preferences:', error);
    res.status(500).json({ error: 'Failed to get mobile notification preferences' });
  }
};

/**
 * Sync offline actions
 */
export const syncOfflineActions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;
    const { actions } = req.body;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!actions || !Array.isArray(actions)) {
      res.status(400).json({ error: 'Actions array is required' });
      return;
    }

    // Process actions using the mobile offline service
    const results = await mobileOfflineService.syncOfflineActions(userAddress, actions);

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    safeLogger.error('Error syncing offline actions:', error);
    res.status(500).json({ error: 'Failed to sync offline actions' });
  }
};

/**
 * Get cached content for offline browsing
 */
export const getOfflineContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get offline content using the mobile offline service
    const content = await mobileOfflineService.getOfflineContent(userAddress);

    res.json({
      success: true,
      data: content,
    });
  } catch (error) {
    safeLogger.error('Error getting offline content:', error);
    res.status(500).json({ error: 'Failed to get offline content' });
  }
};

/**
 * Prepare offline content
 */
export const prepareOfflineContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user's community IDs
    const communityIds = await mobileOfflineService.getUserCommunityIds(userAddress);

    // Prepare offline content
    const success = await mobileOfflineService.prepareOfflineContent(userAddress, communityIds);

    if (success) {
      res.json({
        success: true,
        message: 'Offline content prepared successfully',
      });
    } else {
      res.status(500).json({ error: 'Failed to prepare offline content' });
    }
  } catch (error) {
    safeLogger.error('Error preparing offline content:', error);
    res.status(500).json({ error: 'Failed to prepare offline content' });
  }
};

/**
 * Get offline statistics
 */
export const getOfflineStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const stats = await mobileOfflineService.getOfflineStats(userAddress);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    safeLogger.error('Error getting offline stats:', error);
    res.status(500).json({ error: 'Failed to get offline stats' });
  }
};

/**
 * Upload image from mobile device
 */
export const uploadImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userAddress = req.user?.walletAddress;
    const { imageData, filename } = req.body;

    if (!userAddress) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!imageData || !filename) {
      res.status(400).json({ error: 'Image data and filename are required' });
      return;
    }

    // In a real implementation, you would:
    // 1. Decode the base64 image data
    // 2. Validate the image
    // 3. Upload to IPFS or cloud storage
    // 4. Return the CID or URL

    // For now, we'll just simulate the process
    const cid = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    res.json({
      success: true,
      cid,
      url: `https://ipfs.io/ipfs/${cid}`,
    });
  } catch (error) {
    safeLogger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};
