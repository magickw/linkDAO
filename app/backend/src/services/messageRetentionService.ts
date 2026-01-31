/**
 * Message Retention Policy Service
 * Handles automated data expiration and cleanup for messages
 */

import { db } from '../db';
import { chatMessages, conversations, messageReadStatus, messageReactions, blockedUsers } from '../db/schema';
import { eq, lt, and, isNotNull, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { cacheService } from './cacheService';

// Retention configuration (can be overridden via environment variables)
const RETENTION_CONFIG = {
  // Message retention periods (in days)
  defaultMessageRetention: parseInt(process.env.MESSAGE_RETENTION_DAYS || '365', 10), // 1 year default
  deletedMessageRetention: parseInt(process.env.DELETED_MESSAGE_RETENTION_DAYS || '30', 10), // 30 days for soft-deleted
  readStatusRetention: parseInt(process.env.READ_STATUS_RETENTION_DAYS || '30', 10), // 30 days for read receipts
  typingIndicatorRetention: 1, // 1 day for typing indicators (ephemeral)
  blockListRetention: parseInt(process.env.BLOCK_LIST_RETENTION_DAYS || '0', 10), // 0 = never expire
  attachmentRetention: parseInt(process.env.ATTACHMENT_RETENTION_DAYS || '180', 10), // 6 months for attachments

  // Cleanup batch sizes
  batchSize: parseInt(process.env.RETENTION_BATCH_SIZE || '1000', 10),
  maxBatchesPerRun: parseInt(process.env.RETENTION_MAX_BATCHES || '10', 10),

  // Cleanup schedule
  runIntervalHours: parseInt(process.env.RETENTION_RUN_INTERVAL_HOURS || '24', 10)
};

interface RetentionStats {
  messagesDeleted: number;
  readStatusDeleted: number;
  reactionsDeleted: number;
  conversationsArchived: number;
  errors: number;
  duration: number;
}

interface ConversationRetentionPolicy {
  conversationId: string;
  retentionDays: number | null; // null = use default
  autoDeleteEnabled: boolean;
  lastCleanup?: Date;
}

/**
 * Message Retention Service
 */
class MessageRetentionService {
  private isRunning = false;
  private lastRunTime: Date | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Start the retention cleanup scheduler
   */
  startScheduler(): void {
    if (this.cleanupInterval) {
      safeLogger.warn('Retention scheduler already running');
      return;
    }

    const intervalMs = RETENTION_CONFIG.runIntervalHours * 60 * 60 * 1000;

    safeLogger.info('Starting message retention scheduler', {
      intervalHours: RETENTION_CONFIG.runIntervalHours,
      config: RETENTION_CONFIG
    });

    // Run immediately on startup
    this.runCleanup().catch(err => {
      safeLogger.error('Initial retention cleanup failed:', err);
    });

    // Schedule periodic runs
    this.cleanupInterval = setInterval(() => {
      this.runCleanup().catch(err => {
        safeLogger.error('Scheduled retention cleanup failed:', err);
      });
    }, intervalMs);
  }

  /**
   * Stop the retention cleanup scheduler
   */
  stopScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      safeLogger.info('Retention scheduler stopped');
    }
  }

  /**
   * Run the full retention cleanup process
   */
  async runCleanup(): Promise<RetentionStats> {
    if (this.isRunning) {
      safeLogger.warn('Retention cleanup already in progress, skipping');
      return {
        messagesDeleted: 0,
        readStatusDeleted: 0,
        reactionsDeleted: 0,
        conversationsArchived: 0,
        errors: 0,
        duration: 0
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const stats: RetentionStats = {
      messagesDeleted: 0,
      readStatusDeleted: 0,
      reactionsDeleted: 0,
      conversationsArchived: 0,
      errors: 0,
      duration: 0
    };

    try {
      safeLogger.info('Starting message retention cleanup');

      // 1. Clean up soft-deleted messages past retention
      const deletedMessagesResult = await this.cleanupSoftDeletedMessages();
      stats.messagesDeleted += deletedMessagesResult.deleted;
      stats.errors += deletedMessagesResult.errors;

      // 2. Clean up old messages based on retention policy
      const oldMessagesResult = await this.cleanupOldMessages();
      stats.messagesDeleted += oldMessagesResult.deleted;
      stats.errors += oldMessagesResult.errors;

      // 3. Clean up read status records
      const readStatusResult = await this.cleanupReadStatus();
      stats.readStatusDeleted = readStatusResult.deleted;
      stats.errors += readStatusResult.errors;

      // 4. Clean up orphaned reactions (messages deleted)
      const reactionsResult = await this.cleanupOrphanedReactions();
      stats.reactionsDeleted = reactionsResult.deleted;
      stats.errors += reactionsResult.errors;

      // 5. Archive inactive conversations
      const archiveResult = await this.archiveInactiveConversations();
      stats.conversationsArchived = archiveResult.archived;
      stats.errors += archiveResult.errors;

      stats.duration = Date.now() - startTime;
      this.lastRunTime = new Date();

      safeLogger.info('Message retention cleanup completed', stats);

      // Update cleanup stats in cache
      await cacheService.set('retention:last_stats', stats, 86400); // 24 hours

      return stats;
    } catch (error) {
      safeLogger.error('Retention cleanup failed:', error);
      stats.errors++;
      stats.duration = Date.now() - startTime;
      return stats;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up soft-deleted messages past retention period
   */
  private async cleanupSoftDeletedMessages(): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.deletedMessageRetention);

    try {
      for (let batch = 0; batch < RETENTION_CONFIG.maxBatchesPerRun; batch++) {
        const result = await db
          .delete(chatMessages)
          .where(
            and(
              isNotNull(chatMessages.deletedAt),
              lt(chatMessages.deletedAt, cutoffDate)
            )
          )
          .returning({ id: chatMessages.id });

        deleted += result.length;

        // If fewer than batch size, we're done
        if (result.length < RETENTION_CONFIG.batchSize) {
          break;
        }
      }

      safeLogger.debug('Soft-deleted messages cleanup completed', { deleted });
    } catch (error) {
      safeLogger.error('Error cleaning up soft-deleted messages:', error);
      errors++;
    }

    return { deleted, errors };
  }

  /**
   * Clean up old messages based on default retention policy
   */
  private async cleanupOldMessages(): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;

    // Only run if default retention is set (non-zero)
    if (RETENTION_CONFIG.defaultMessageRetention <= 0) {
      return { deleted, errors };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.defaultMessageRetention);

    try {
      // Get conversations with custom retention policies from cache or metadata
      const customRetentionConversations = await this.getCustomRetentionConversations();
      const excludeIds = customRetentionConversations.map(c => c.conversationId);

      for (let batch = 0; batch < RETENTION_CONFIG.maxBatchesPerRun; batch++) {
        // Build query excluding conversations with custom policies
        let query = db
          .delete(chatMessages)
          .where(
            and(
              lt(chatMessages.sentAt, cutoffDate),
              sql`${chatMessages.conversationId}::text NOT IN (${excludeIds.length > 0 ? excludeIds.map(id => `'${id}'`).join(',') : "''"})`
            )
          )
          .returning({ id: chatMessages.id });

        const result = await query;
        deleted += result.length;

        if (result.length < RETENTION_CONFIG.batchSize) {
          break;
        }
      }

      safeLogger.debug('Old messages cleanup completed', { deleted, cutoffDays: RETENTION_CONFIG.defaultMessageRetention });
    } catch (error) {
      safeLogger.error('Error cleaning up old messages:', error);
      errors++;
    }

    return { deleted, errors };
  }

  /**
   * Clean up old read status records
   */
  private async cleanupReadStatus(): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_CONFIG.readStatusRetention);

    try {
      const result = await db
        .delete(messageReadStatus)
        .where(lt(messageReadStatus.readAt, cutoffDate))
        .returning({ messageId: messageReadStatus.messageId });

      deleted = result.length;
      safeLogger.debug('Read status cleanup completed', { deleted });
    } catch (error) {
      safeLogger.error('Error cleaning up read status:', error);
      errors++;
    }

    return { deleted, errors };
  }

  /**
   * Clean up orphaned reactions (where message was deleted)
   */
  private async cleanupOrphanedReactions(): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;

    try {
      // Delete reactions where the message no longer exists
      const result = await db.execute(sql`
        DELETE FROM ${messageReactions}
        WHERE ${messageReactions.messageId} NOT IN (
          SELECT id FROM ${chatMessages}
        )
      `);

      deleted = (result as any).rowCount || 0;
      safeLogger.debug('Orphaned reactions cleanup completed', { deleted });
    } catch (error) {
      safeLogger.error('Error cleaning up orphaned reactions:', error);
      errors++;
    }

    return { deleted, errors };
  }

  /**
   * Archive inactive conversations
   */
  private async archiveInactiveConversations(): Promise<{ archived: number; errors: number }> {
    let archived = 0;
    let errors = 0;
    const inactiveDays = 180; // 6 months of inactivity
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    try {
      // Update conversations with no recent activity to archived status
      const result = await db
        .update(conversations)
        .set({
          metadata: sql`COALESCE(${conversations.metadata}, '{}'::jsonb) || '{"archived": true, "archivedAt": "${new Date().toISOString()}"}'::jsonb`
        })
        .where(
          and(
            lt(conversations.lastActivity, cutoffDate),
            sql`COALESCE((${conversations.metadata}->>'archived')::boolean, false) = false`
          )
        )
        .returning({ id: conversations.id });

      archived = result.length;
      safeLogger.debug('Inactive conversations archived', { archived, inactiveDays });
    } catch (error) {
      safeLogger.error('Error archiving inactive conversations:', error);
      errors++;
    }

    return { archived, errors };
  }

  /**
   * Get conversations with custom retention policies
   */
  private async getCustomRetentionConversations(): Promise<ConversationRetentionPolicy[]> {
    try {
      // Check cache first
      const cached = await cacheService.get('retention:custom_policies');
      if (cached) {
        return cached as ConversationRetentionPolicy[];
      }

      // Query conversations with custom retention in metadata
      const result = await db
        .select({
          id: conversations.id,
          metadata: conversations.metadata
        })
        .from(conversations)
        .where(
          sql`${conversations.metadata}->>'retentionDays' IS NOT NULL`
        );

      const policies: ConversationRetentionPolicy[] = result.map(row => {
        const metadata = row.metadata as any || {};
        return {
          conversationId: row.id,
          retentionDays: metadata.retentionDays ? parseInt(metadata.retentionDays, 10) : null,
          autoDeleteEnabled: metadata.autoDeleteEnabled || false
        };
      });

      // Cache for 1 hour
      await cacheService.set('retention:custom_policies', policies, 3600);

      return policies;
    } catch (error) {
      safeLogger.error('Error fetching custom retention policies:', error);
      return [];
    }
  }

  /**
   * Set custom retention policy for a conversation
   */
  async setConversationRetention(
    conversationId: string,
    retentionDays: number | null,
    autoDeleteEnabled: boolean = true
  ): Promise<boolean> {
    try {
      await db
        .update(conversations)
        .set({
          metadata: sql`COALESCE(${conversations.metadata}, '{}'::jsonb) || ${JSON.stringify({
            retentionDays,
            autoDeleteEnabled,
            retentionUpdatedAt: new Date().toISOString()
          })}::jsonb`
        })
        .where(eq(conversations.id, conversationId));

      // Invalidate cache
      await cacheService.del('retention:custom_policies');

      safeLogger.info('Conversation retention policy updated', {
        conversationId,
        retentionDays,
        autoDeleteEnabled
      });

      return true;
    } catch (error) {
      safeLogger.error('Error setting conversation retention:', error);
      return false;
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<{
    lastRunTime: Date | null;
    isRunning: boolean;
    config: typeof RETENTION_CONFIG;
    lastStats: RetentionStats | null;
  }> {
    const lastStats = await cacheService.get('retention:last_stats') as RetentionStats | null;

    return {
      lastRunTime: this.lastRunTime,
      isRunning: this.isRunning,
      config: RETENTION_CONFIG,
      lastStats
    };
  }

  /**
   * Manually trigger cleanup for a specific conversation
   */
  async cleanupConversation(conversationId: string, olderThanDays: number): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const result = await db
        .delete(chatMessages)
        .where(
          and(
            eq(chatMessages.conversationId, conversationId),
            lt(chatMessages.sentAt, cutoffDate)
          )
        )
        .returning({ id: chatMessages.id });

      safeLogger.info('Manual conversation cleanup completed', {
        conversationId,
        olderThanDays,
        deleted: result.length
      });

      return { deleted: result.length };
    } catch (error) {
      safeLogger.error('Error in manual conversation cleanup:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const messageRetentionService = new MessageRetentionService();
export default messageRetentionService;
