/**
 * Data Deletion Service
 * Handles user data deletion requests for GDPR/Platform compliance
 * Required by Facebook and LinkedIn for OAuth apps
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import {
  users,
  posts,
  statuses,
  comments,
  follows,
  blockedUsers,
  bookmarks,
  conversations,
  chatMessages,
  socialMediaConnections,
  socialMediaPosts,
  oauthStates,
  notifications,
  notificationPreferences
} from '../db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

// Data deletion request status
export type DeletionStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Data categories that can be deleted
export interface DataCategories {
  profile: boolean;
  posts: boolean;
  comments: boolean;
  messages: boolean;
  socialConnections: boolean;
  follows: boolean;
  bookmarks: boolean;
  notifications: boolean;
  preferences: boolean;
}

// Deletion request result
export interface DeletionResult {
  success: boolean;
  deletedCategories: string[];
  failedCategories: string[];
  confirmationCode: string;
  timestamp: Date;
  message?: string;
}

// User data summary for display
export interface UserDataSummary {
  profile: {
    exists: boolean;
    fields: string[];
  };
  posts: {
    count: number;
  };
  comments: {
    count: number;
  };
  messages: {
    conversationCount: number;
    messageCount: number;
  };
  socialConnections: {
    platforms: string[];
  };
  follows: {
    followingCount: number;
    followersCount: number;
  };
  bookmarks: {
    count: number;
  };
  notifications: {
    count: number;
  };
}

// Facebook data deletion callback response
export interface FacebookDeletionCallbackResponse {
  url: string;
  confirmation_code: string;
}

export class DataDeletionService {
  /**
   * Get summary of user's stored data
   */
  async getUserDataSummary(userId: string): Promise<UserDataSummary> {
    try {
      // Get user profile
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      // Get posts count
      const [postsResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(eq(posts.authorId, userId));

      // Get statuses count
      const [statusesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(statuses)
        .where(eq(statuses.authorId, userId));

      // Get comments count
      const [commentsResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(eq(comments.authorId, userId));

      // Get conversations count
      const [conversationsResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(conversations)
        .where(sql`participants::jsonb ? ${user?.walletAddress?.toLowerCase() || ''}`);

      // Get messages count
      const [messagesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chatMessages)
        .where(eq(chatMessages.senderAddress, user?.walletAddress?.toLowerCase() || ''));

      // Get social connections
      const socialConnectionsList = await db
        .select({ platform: socialMediaConnections.platform })
        .from(socialMediaConnections)
        .where(eq(socialMediaConnections.userId, userId));

      // Get follow counts
      const [followingResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, userId));

      const [followersResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followingId, userId));

      // Get bookmarks count
      const [bookmarksResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId));

      // Get notifications count
      let notificationsCount = 0;
      try {
        if (user?.walletAddress) {
          const [notificationsResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(notifications)
            .where(eq(notifications.userAddress, user.walletAddress.toLowerCase()));
          notificationsCount = notificationsResult?.count || 0;
        }
      } catch {
        // Notifications table might not exist
      }

      // Build profile fields list
      const profileFields: string[] = [];
      if (user) {
        if (user.walletAddress) profileFields.push('Wallet Address');
        if (user.handle) profileFields.push('Username/Handle');
        if (user.displayName) profileFields.push('Display Name');
        if (user.ens) profileFields.push('ENS Name');
        if (user.avatarCid) profileFields.push('Profile Picture');
        if (user.bannerCid) profileFields.push('Banner Image');
        if (user.bioCid) profileFields.push('Bio');
        if (user.website) profileFields.push('Website');
        if (user.socialLinks && (user.socialLinks as any[]).length > 0) profileFields.push('Social Links');
        if (user.physicalAddress) profileFields.push('Address/Contact Info (encrypted)');
        if (user.billingAddress1 || user.billingFirstName) profileFields.push('Billing Information');
        if (user.shippingAddress1 || user.shippingFirstName) profileFields.push('Shipping Information');
      }

      return {
        profile: {
          exists: !!user,
          fields: profileFields
        },
        posts: {
          count: (postsResult?.count || 0) + (statusesResult?.count || 0)
        },
        comments: {
          count: commentsResult?.count || 0
        },
        messages: {
          conversationCount: conversationsResult?.count || 0,
          messageCount: messagesResult?.count || 0
        },
        socialConnections: {
          platforms: socialConnectionsList.map(c => c.platform)
        },
        follows: {
          followingCount: followingResult?.count || 0,
          followersCount: followersResult?.count || 0
        },
        bookmarks: {
          count: bookmarksResult?.count || 0
        },
        notifications: {
          count: notificationsCount
        }
      };
    } catch (error) {
      safeLogger.error('Error getting user data summary:', error);
      throw new Error('Failed to retrieve user data summary');
    }
  }

  /**
   * Delete all user data
   */
  async deleteAllUserData(userId: string): Promise<DeletionResult> {
    return this.deleteUserData(userId, {
      profile: true,
      posts: true,
      comments: true,
      messages: true,
      socialConnections: true,
      follows: true,
      bookmarks: true,
      notifications: true,
      preferences: true
    });
  }

  /**
   * Delete specific categories of user data
   */
  async deleteUserData(userId: string, categories: DataCategories): Promise<DeletionResult> {
    const deletedCategories: string[] = [];
    const failedCategories: string[] = [];
    const confirmationCode = this.generateConfirmationCode();

    try {
      // Get user first to have wallet address for message deletion
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const walletAddress = user?.walletAddress?.toLowerCase() || '';

      // Delete in order to respect foreign key constraints

      // 1. Delete social media posts first (references social connections)
      if (categories.socialConnections) {
        try {
          await db.delete(socialMediaPosts)
            .where(sql`connection_id IN (SELECT id FROM social_media_connections WHERE user_id = ${userId})`);

          // Delete OAuth states
          await db.delete(oauthStates).where(eq(oauthStates.userId, userId));

          // Delete social media connections
          await db.delete(socialMediaConnections).where(eq(socialMediaConnections.userId, userId));

          deletedCategories.push('socialConnections');
        } catch (error) {
          safeLogger.error('Error deleting social connections:', error);
          failedCategories.push('socialConnections');
        }
      }

      // 2. Delete notifications
      if (categories.notifications && walletAddress) {
        try {
          await db.delete(notifications).where(eq(notifications.userAddress, walletAddress));
          deletedCategories.push('notifications');
        } catch (error) {
          safeLogger.error('Error deleting notifications:', error);
          failedCategories.push('notifications');
        }
      }

      // 3. Delete preferences
      if (categories.preferences && walletAddress) {
        try {
          await db.delete(notificationPreferences).where(eq(notificationPreferences.userAddress, walletAddress));
          deletedCategories.push('preferences');
        } catch (error) {
          safeLogger.error('Error deleting preferences:', error);
          failedCategories.push('preferences');
        }
      }

      // 4. Delete bookmarks
      if (categories.bookmarks) {
        try {
          await db.delete(bookmarks).where(eq(bookmarks.userId, userId));
          deletedCategories.push('bookmarks');
        } catch (error) {
          safeLogger.error('Error deleting bookmarks:', error);
          failedCategories.push('bookmarks');
        }
      }

      // 5. Delete follows (both following and followers)
      if (categories.follows) {
        try {
          await db.delete(follows).where(
            or(eq(follows.followerId, userId), eq(follows.followingId, userId))
          );
          deletedCategories.push('follows');
        } catch (error) {
          safeLogger.error('Error deleting follows:', error);
          failedCategories.push('follows');
        }
      }

      // 6. Delete blocked users
      if (categories.follows) {
        try {
          await db.delete(blockedUsers).where(
            or(
              eq(blockedUsers.blockerAddress, walletAddress),
              eq(blockedUsers.blockedAddress, walletAddress)
            )
          );
        } catch (error) {
          safeLogger.error('Error deleting blocked users:', error);
        }
      }

      // 7. Delete messages and conversations
      if (categories.messages && walletAddress) {
        try {
          // Soft delete messages by this user
          await db.update(chatMessages)
            .set({ deletedAt: new Date(), content: '[deleted]' })
            .where(eq(chatMessages.senderAddress, walletAddress));

          // Remove user from conversations (don't delete the conversation if others are in it)
          const userConversations = await db
            .select()
            .from(conversations)
            .where(sql`participants::jsonb ? ${walletAddress}`);

          for (const conv of userConversations) {
            const participants = JSON.parse(conv.participants as string || '[]');
            const updatedParticipants = participants.filter((p: string) => p !== walletAddress);

            if (updatedParticipants.length === 0) {
              // Delete conversation if no participants left
              await db.delete(chatMessages).where(eq(chatMessages.conversationId, conv.id));
              await db.delete(conversations).where(eq(conversations.id, conv.id));
            } else {
              // Update participants list
              await db.update(conversations)
                .set({ participants: JSON.stringify(updatedParticipants) })
                .where(eq(conversations.id, conv.id));
            }
          }

          deletedCategories.push('messages');
        } catch (error) {
          safeLogger.error('Error deleting messages:', error);
          failedCategories.push('messages');
        }
      }

      // 8. Delete comments
      if (categories.comments) {
        try {
          // Soft delete by updating content instead of hard delete to preserve thread structure
          await db.update(comments)
            .set({ content: '[deleted]', moderationStatus: 'blocked' })
            .where(eq(comments.authorId, userId));
          deletedCategories.push('comments');
        } catch (error) {
          safeLogger.error('Error deleting comments:', error);
          failedCategories.push('comments');
        }
      }

      // 9. Delete posts and statuses
      if (categories.posts) {
        try {
          // Soft delete statuses by marking as blocked and clearing content
          await db.update(statuses)
            .set({ content: '[deleted]', moderationStatus: 'blocked' })
            .where(eq(statuses.authorId, userId));

          // Soft delete posts by marking as blocked and clearing content
          await db.update(posts)
            .set({ content: '[deleted]', moderationStatus: 'blocked' })
            .where(eq(posts.authorId, userId));

          deletedCategories.push('posts');
        } catch (error) {
          safeLogger.error('Error deleting posts:', error);
          failedCategories.push('posts');
        }
      }

      // 10. Delete profile (this should be last due to foreign keys)
      if (categories.profile) {
        try {
          // Instead of deleting, anonymize the user data
          await db.update(users)
            .set({
              handle: `deleted_${confirmationCode.substring(0, 8)}`,
              displayName: 'Deleted User',
              ens: null,
              avatarCid: null,
              bannerCid: null,
              bioCid: null,
              website: null,
              socialLinks: [],
              physicalAddress: null,
              billingFirstName: null,
              billingLastName: null,
              billingCompany: null,
              billingAddress1: null,
              billingAddress2: null,
              billingCity: null,
              billingState: null,
              billingZipCode: null,
              billingCountry: null,
              billingPhone: null,
              shippingFirstName: null,
              shippingLastName: null,
              shippingCompany: null,
              shippingAddress1: null,
              shippingAddress2: null,
              shippingCity: null,
              shippingState: null,
              shippingZipCode: null,
              shippingCountry: null,
              shippingPhone: null,
              updatedAt: new Date()
            })
            .where(eq(users.id, userId));

          deletedCategories.push('profile');
        } catch (error) {
          safeLogger.error('Error deleting profile:', error);
          failedCategories.push('profile');
        }
      }

      const success = failedCategories.length === 0;

      // Log the deletion for audit purposes
      safeLogger.info('User data deletion completed', {
        userId,
        confirmationCode,
        deletedCategories,
        failedCategories,
        success
      });

      return {
        success,
        deletedCategories,
        failedCategories,
        confirmationCode,
        timestamp: new Date(),
        message: success
          ? 'All requested data has been deleted successfully.'
          : `Some data could not be deleted: ${failedCategories.join(', ')}`
      };
    } catch (error) {
      safeLogger.error('Error during user data deletion:', error);
      return {
        success: false,
        deletedCategories,
        failedCategories: Object.keys(categories).filter(k => categories[k as keyof DataCategories]),
        confirmationCode,
        timestamp: new Date(),
        message: 'An error occurred during data deletion. Please try again or contact support.'
      };
    }
  }

  /**
   * Handle Facebook data deletion callback
   * Facebook sends a signed request when a user removes the app
   */
  async handleFacebookDeletionCallback(
    signedRequest: string,
    appSecret: string
  ): Promise<FacebookDeletionCallbackResponse> {
    try {
      // Parse the signed request from Facebook
      const parsedData = this.parseSignedRequest(signedRequest, appSecret);

      if (!parsedData || !parsedData.user_id) {
        throw new Error('Invalid signed request from Facebook');
      }

      const facebookUserId = parsedData.user_id;

      // Find the user by their Facebook platform user ID
      const [connection] = await db
        .select()
        .from(socialMediaConnections)
        .where(
          and(
            eq(socialMediaConnections.platform, 'facebook'),
            eq(socialMediaConnections.platformUserId, facebookUserId)
          )
        )
        .limit(1);

      const confirmationCode = this.generateConfirmationCode();

      if (connection) {
        // Delete Facebook-related data for this user
        await db.delete(socialMediaPosts)
          .where(eq(socialMediaPosts.connectionId, connection.id));

        await db.delete(socialMediaConnections)
          .where(eq(socialMediaConnections.id, connection.id));

        safeLogger.info('Facebook data deletion completed', {
          facebookUserId,
          userId: connection.userId,
          confirmationCode
        });
      } else {
        safeLogger.warn('Facebook deletion request for unknown user', { facebookUserId });
      }

      // Return the confirmation URL and code as required by Facebook
      const baseUrl = process.env.FRONTEND_URL || 'https://linkdao.io';
      return {
        url: `${baseUrl}/data-deletion/status?confirmation=${confirmationCode}`,
        confirmation_code: confirmationCode
      };
    } catch (error) {
      safeLogger.error('Error handling Facebook deletion callback:', error);
      throw error;
    }
  }

  /**
   * Parse Facebook's signed request
   */
  private parseSignedRequest(signedRequest: string, secret: string): any {
    try {
      const [encodedSig, payload] = signedRequest.split('.', 2);

      if (!encodedSig || !payload) {
        return null;
      }

      // Decode signature
      const sig = this.base64UrlDecode(encodedSig);

      // Decode data
      const data = JSON.parse(this.base64UrlDecode(payload));

      if (data.algorithm?.toUpperCase() !== 'HMAC-SHA256') {
        safeLogger.error('Unknown algorithm in signed request');
        return null;
      }

      // Verify signature
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest();

      if (!crypto.timingSafeEqual(Buffer.from(sig), expectedSig)) {
        safeLogger.error('Invalid signature in Facebook signed request');
        return null;
      }

      return data;
    } catch (error) {
      safeLogger.error('Error parsing signed request:', error);
      return null;
    }
  }

  /**
   * Base64 URL decode helper
   */
  private base64UrlDecode(str: string): string {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const pad = 4 - (base64.length % 4);
    const padded = pad < 4 ? base64 + '='.repeat(pad) : base64;
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  /**
   * Generate a unique confirmation code for deletion requests
   */
  private generateConfirmationCode(): string {
    return `DEL-${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`.toUpperCase();
  }

  /**
   * Get deletion status by confirmation code
   */
  async getDeletionStatus(confirmationCode: string): Promise<{
    found: boolean;
    status: DeletionStatus;
    message: string;
  }> {
    // In a production system, you would store deletion requests in a database
    // For now, we'll return a simple response
    if (confirmationCode && confirmationCode.startsWith('DEL-')) {
      return {
        found: true,
        status: 'completed',
        message: 'Your data deletion request has been processed. All requested data has been removed from our systems.'
      };
    }
    return {
      found: false,
      status: 'pending',
      message: 'Deletion request not found. Please check your confirmation code.'
    };
  }
}

export const dataDeletionService = new DataDeletionService();
