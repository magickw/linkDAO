import * as admin from 'firebase-admin';
import { safeLogger } from '../utils/safeLogger';
import { Message, MulticastMessage } from 'firebase-admin/messaging';
import { db } from '../db';
import { pushTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface PushNotificationData {
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  data?: Record<string, string>;
  badge?: number;
}

export interface CommunityPushNotification extends PushNotificationData {
  communityId: string;
  communityName: string;
  notificationType: 'post' | 'comment' | 'governance' | 'moderation' | 'role_change' | 'mention';
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private firebaseApp: admin.app.App | null = null;
  private enabled: boolean = false;

  private constructor() {
    this.initializeFirebase();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private initializeFirebase(): void {
    try {
      // Check if Firebase credentials are provided
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      if (!serviceAccountPath && !serviceAccountJson) {
        safeLogger.warn('Push notification service disabled: Firebase credentials not configured');
        return;
      }

      let credential: admin.ServiceAccount;

      if (serviceAccountJson) {
        // Use JSON string from environment variable
        credential = JSON.parse(serviceAccountJson);
      } else if (serviceAccountPath) {
        // Use file path
        credential = require(serviceAccountPath);
      } else {
        return;
      }

      // Initialize Firebase Admin if not already initialized
      if (!admin.apps.length) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(credential),
        });
      } else {
        this.firebaseApp = admin.apps[0];
      }

      this.enabled = true;
      safeLogger.info('Push notification service initialized with Firebase');
    } catch (error) {
      safeLogger.error('Failed to initialize Firebase:', error);
      this.enabled = false;
    }
  }

  /**
   * Send push notification to a single device token
   */
  async sendToToken(token: string, notification: PushNotificationData): Promise<boolean> {
    if (!this.enabled || !this.firebaseApp) {
      safeLogger.info('[PushNotificationService] Push notifications disabled, skipping:', notification.title);
      return false;
    }

    try {
      const message: Message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          actionUrl: notification.actionUrl || '',
          ...notification.data,
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge,
              sound: 'default',
            },
          },
        },
        android: {
          notification: {
            clickAction: notification.actionUrl,
            sound: 'default',
          },
        },
      };

      const response = await admin.messaging().send(message);
      safeLogger.info('[PushNotificationService] Successfully sent message:', response);
      return true;
    } catch (error: any) {
      safeLogger.error('[PushNotificationService] Error sending notification:', error);

      // Handle invalid tokens
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await this.removeInvalidToken(token);
      }

      return false;
    }
  }

  /**
   * Send push notification to multiple device tokens
   */
  async sendToTokens(tokens: string[], notification: PushNotificationData): Promise<{
    successCount: number;
    failureCount: number;
  }> {
    if (!this.enabled || !this.firebaseApp) {
      safeLogger.info('[PushNotificationService] Push notifications disabled, skipping batch');
      return { successCount: 0, failureCount: 0 };
    }

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    try {
      const message: MulticastMessage = {
        tokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          actionUrl: notification.actionUrl || '',
          ...notification.data,
        },
        apns: {
          payload: {
            aps: {
              badge: notification.badge,
              sound: 'default',
            },
          },
        },
        android: {
          notification: {
            clickAction: notification.actionUrl,
            sound: 'default',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      safeLogger.info(
        `[PushNotificationService] Batch send completed: ${response.successCount} success, ${response.failureCount} failures`
      );

      // Remove invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (
          !resp.success &&
          (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered')
        ) {
          invalidTokens.push(tokens[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        await this.removeInvalidTokens(invalidTokens);
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error sending batch notification:', error);
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Send push notification to a user address
   */
  async sendToUser(userAddress: string, notification: PushNotificationData): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const tokens = await this.getUserTokens(userAddress);

      if (tokens.length === 0) {
        safeLogger.info(`[PushNotificationService] No push tokens found for user ${userAddress}`);
        return false;
      }

      const result = await this.sendToTokens(tokens, notification);
      return result.successCount > 0;
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error sending notification to user:', error);
      return false;
    }
  }

  /**
   * Send community notification to user
   */
  async sendCommunityNotification(
    userAddress: string,
    notification: CommunityPushNotification
  ): Promise<boolean> {
    const pushData: PushNotificationData = {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
      actionUrl: notification.actionUrl,
      data: {
        communityId: notification.communityId,
        communityName: notification.communityName,
        notificationType: notification.notificationType,
        ...notification.data,
      },
      badge: notification.badge,
    };

    return this.sendToUser(userAddress, pushData);
  }

  /**
   * Send notification to multiple users
   */
  async sendToMultipleUsers(
    userAddresses: string[],
    notification: PushNotificationData
  ): Promise<{
    successCount: number;
    failureCount: number;
  }> {
    if (!this.enabled) {
      return { successCount: 0, failureCount: 0 };
    }

    try {
      // Collect all tokens for all users
      const allTokens: string[] = [];

      for (const userAddress of userAddresses) {
        const tokens = await this.getUserTokens(userAddress);
        allTokens.push(...tokens);
      }

      if (allTokens.length === 0) {
        safeLogger.info('[PushNotificationService] No push tokens found for any users');
        return { successCount: 0, failureCount: 0 };
      }

      // Send to all tokens in batches (Firebase limit is 500 tokens per request)
      const batchSize = 500;
      let totalSuccess = 0;
      let totalFailure = 0;

      for (let i = 0; i < allTokens.length; i += batchSize) {
        const batch = allTokens.slice(i, i + batchSize);
        const result = await this.sendToTokens(batch, notification);
        totalSuccess += result.successCount;
        totalFailure += result.failureCount;
      }

      return { successCount: totalSuccess, failureCount: totalFailure };
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error sending to multiple users:', error);
      return { successCount: 0, failureCount: userAddresses.length };
    }
  }

  /**
   * Register a push token for a user
   */
  async registerToken(
    userAddress: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<boolean> {
    try {
      // Check if token already exists
      const existing = await db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.token, token))
        .limit(1);

      if (existing.length > 0) {
        safeLogger.info('[PushNotificationService] Token already registered');
        return true;
      }

      // Insert new token
      await db.insert(pushTokens).values({
        userAddress,
        token,
        platform,
      });

      safeLogger.info(`[PushNotificationService] Registered push token for ${userAddress} (${platform})`);
      return true;
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error registering token:', error);
      return false;
    }
  }

  /**
   * Unregister a push token
   */
  async unregisterToken(token: string): Promise<boolean> {
    try {
      await db.delete(pushTokens).where(eq(pushTokens.token, token));
      safeLogger.info('[PushNotificationService] Unregistered push token');
      return true;
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error unregistering token:', error);
      return false;
    }
  }

  /**
   * Get all push tokens for a user
   */
  private async getUserTokens(userAddress: string): Promise<string[]> {
    try {
      const tokens = await db
        .select({ token: pushTokens.token })
        .from(pushTokens)
        .where(eq(pushTokens.userAddress, userAddress));

      return tokens.map((t) => t.token);
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error getting user tokens:', error);
      return [];
    }
  }

  /**
   * Remove an invalid token from the database
   */
  private async removeInvalidToken(token: string): Promise<void> {
    try {
      await db.delete(pushTokens).where(eq(pushTokens.token, token));
      safeLogger.info('[PushNotificationService] Removed invalid token');
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error removing invalid token:', error);
    }
  }

  /**
   * Remove multiple invalid tokens from the database
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    try {
      for (const token of tokens) {
        await db.delete(pushTokens).where(eq(pushTokens.token, token));
      }
      safeLogger.info(`[PushNotificationService] Removed ${tokens.length} invalid tokens`);
    } catch (error) {
      safeLogger.error('[PushNotificationService] Error removing invalid tokens:', error);
    }
  }

  /**
   * Check if push notification service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

export default PushNotificationService.getInstance();
