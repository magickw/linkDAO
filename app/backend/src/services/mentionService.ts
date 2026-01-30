/**
 * Mention Service
 * Extracts and tracks @mentions in posts, statuses, and comments
 */

import { db } from '../db';
import { mentions, users } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { enhancedNotificationService } from './enhancedNotificationService';

export interface MentionContext {
  postId?: string;
  statusId?: string;
  commentId?: string;
  authorId: string; // UUID of the person creating the mention
  authorWalletAddress: string; // Wallet address for notification
  authorHandle?: string; // Display name for notification
  content: string; // The full content containing mentions
  contentUrl?: string; // URL to the content (for notifications)
}

export interface Mention {
  mentionText: string; // The @mention text used
  userId: string; // UUID of the mentioned user
  walletAddress: string; // Wallet address of the mentioned user
}

export class MentionService {
  /**
   * Extract all @mentions from content
   * Supports: @handle, @ens.eth, @0x...address
   */
  extractMentions(content: string): string[] {
    if (!content) return [];

    // Match @mentions:
    // - @handle (alphanumeric, underscore, hyphen)
    // - @ens.eth (ENS names)
    // - @0x... (wallet addresses)
    const mentionRegex = /@([a-zA-Z0-9_-]+(?:\.eth)?|0x[a-fA-F0-9]{40})/g;
    const matches = content.match(mentionRegex);

    if (!matches) return [];

    // Remove @ prefix and deduplicate
    const uniqueMentions = [...new Set(matches.map(m => m.substring(1)))];

    return uniqueMentions;
  }

  /**
   * Resolve mention text to user IDs
   * Looks up by handle, ENS, or wallet address
   */
  async resolveMentions(mentionTexts: string[]): Promise<Mention[]> {
    if (!mentionTexts || mentionTexts.length === 0) return [];

    try {
      const resolvedMentions: Mention[] = [];

      for (const mentionText of mentionTexts) {
        let user;

        // Check if it's a wallet address (0x...)
        if (mentionText.startsWith('0x') && mentionText.length === 42) {
          const normalizedAddress = mentionText.toLowerCase();
          user = await db
            .select({ id: users.id, walletAddress: users.walletAddress })
            .from(users)
            .where(sql`LOWER(${users.walletAddress}) = ${normalizedAddress}`)
            .limit(1);
        }
        // Check if it's an ENS name
        else if (mentionText.endsWith('.eth')) {
          user = await db
            .select({ id: users.id, walletAddress: users.walletAddress })
            .from(users)
            .where(eq(users.ens, mentionText))
            .limit(1);
        }
        // Otherwise treat as handle
        else {
          user = await db
            .select({ id: users.id, walletAddress: users.walletAddress })
            .from(users)
            .where(eq(users.handle, mentionText))
            .limit(1);
        }

        if (user && user.length > 0) {
          resolvedMentions.push({
            mentionText,
            userId: user[0].id,
            walletAddress: user[0].walletAddress
          });
        } else {
          safeLogger.warn(`[MentionService] Could not resolve mention: @${mentionText}`);
        }
      }

      return resolvedMentions;
    } catch (error) {
      safeLogger.error('[MentionService] Error resolving mentions:', error);
      return [];
    }
  }

  /**
   * Process mentions in content and create mention records
   */
  async processMentions(context: MentionContext): Promise<number> {
    try {
      // Extract mention texts
      const mentionTexts = this.extractMentions(context.content);
      if (mentionTexts.length === 0) {
        return 0;
      }

      safeLogger.info(`[MentionService] Found ${mentionTexts.length} mentions in content`);

      // Resolve mentions to user IDs
      const resolvedMentions = await this.resolveMentions(mentionTexts);
      if (resolvedMentions.length === 0) {
        return 0;
      }

      safeLogger.info(`[MentionService] Resolved ${resolvedMentions.length} valid mentions`);

      // Create mention records and send notifications
      let createdCount = 0;
      for (const mention of resolvedMentions) {
        // Don't create mention if user mentions themselves
        if (mention.userId === context.authorId) {
          continue;
        }

        // Extract content snippet (50 chars before and after the mention)
        const mentionPosition = context.content.indexOf(`@${mention.mentionText}`);
        const snippetStart = Math.max(0, mentionPosition - 50);
        const snippetEnd = Math.min(context.content.length, mentionPosition + mention.mentionText.length + 51);
        const contentSnippet = context.content.substring(snippetStart, snippetEnd);

        // Create mention record
        await db.insert(mentions).values({
          postId: context.postId,
          statusId: context.statusId,
          commentId: context.commentId,
          mentionedUserId: mention.userId,
          mentioningUserId: context.authorId,
          contentSnippet,
          mentionText: `@${mention.mentionText}`,
          isNotified: false,
          isRead: false
        });

        // Send notification
        try {
          await enhancedNotificationService.createSocialNotification({
            userId: mention.walletAddress,
            type: 'mention',
            priority: 'high', // Mentions are high priority
            title: 'You were mentioned',
            message: `${context.authorHandle || 'Someone'} mentioned you: ${contentSnippet}`,
            actionUrl: context.contentUrl || (
              context.postId ? `/post/${context.postId}` :
              context.statusId ? `/status/${context.statusId}` :
              context.commentId ? `/comment/${context.commentId}` : '/'
            ),
            actorId: context.authorWalletAddress,
            actorHandle: context.authorHandle || context.authorWalletAddress.substring(0, 10),
            postId: context.postId || context.statusId,
            commentId: context.commentId
          });

          // Mark as notified
          await db
            .update(mentions)
            .set({
              isNotified: true,
              notifiedAt: new Date()
            })
            .where(and(
              eq(mentions.mentionedUserId, mention.userId),
              eq(mentions.mentioningUserId, context.authorId),
              context.postId ? eq(mentions.postId, context.postId) :
              context.statusId ? eq(mentions.statusId, context.statusId) :
              eq(mentions.commentId, context.commentId!)
            ));

          createdCount++;
          safeLogger.info(`[MentionService] Notified @${mention.mentionText} (${mention.walletAddress})`);
        } catch (notifyError) {
          safeLogger.error('[MentionService] Failed to send mention notification:', notifyError);
          // Continue processing other mentions
        }
      }

      return createdCount;
    } catch (error) {
      safeLogger.error('[MentionService] Error processing mentions:', error);
      return 0;
    }
  }

  /**
   * Get mentions for a user
   */
  async getMentionsForUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<any[]> {
    try {
      const { limit = 50, offset = 0, unreadOnly = false } = options;

      let query = db
        .select({
          id: mentions.id,
          postId: mentions.postId,
          statusId: mentions.statusId,
          commentId: mentions.commentId,
          mentionText: mentions.mentionText,
          contentSnippet: mentions.contentSnippet,
          isRead: mentions.isRead,
          createdAt: mentions.createdAt,
          mentioningUser: {
            id: users.id,
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            avatarCid: users.avatarCid
          }
        })
        .from(mentions)
        .innerJoin(users, eq(mentions.mentioningUserId, users.id))
        .where(eq(mentions.mentionedUserId, userId));

      if (unreadOnly) {
        query = query.where(eq(mentions.isRead, false));
      }

      const results = await query
        .orderBy(desc(mentions.createdAt))
        .limit(limit)
        .offset(offset);

      return results;
    } catch (error) {
      safeLogger.error('[MentionService] Error getting mentions for user:', error);
      return [];
    }
  }

  /**
   * Get unread mention count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
        .from(mentions)
        .where(and(
          eq(mentions.mentionedUserId, userId),
          eq(mentions.isRead, false)
        ));

      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('[MentionService] Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark mention as read
   */
  async markAsRead(mentionId: string, userId: string): Promise<boolean> {
    try {
      await db
        .update(mentions)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(mentions.id, mentionId),
          eq(mentions.mentionedUserId, userId) // Ensure user can only mark their own mentions as read
        ));

      return true;
    } catch (error) {
      safeLogger.error('[MentionService] Error marking mention as read:', error);
      return false;
    }
  }

  /**
   * Mark all mentions as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await db
        .update(mentions)
        .set({
          isRead: true,
          readAt: new Date()
        })
        .where(and(
          eq(mentions.mentionedUserId, userId),
          eq(mentions.isRead, false)
        ));

      return true;
    } catch (error) {
      safeLogger.error('[MentionService] Error marking all mentions as read:', error);
      return false;
    }
  }
}

// Export singleton instance
export const mentionService = new MentionService();
