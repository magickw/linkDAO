/**
 * Message Deduplication Utility
 * Prevents duplicate messages during sync failures or network issues
 */

import { db } from '../db';
import { chatMessages } from '../db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { cacheService } from './cacheService';
import crypto from 'crypto';

// Deduplication configuration
const DEDUP_WINDOW_MS = 60000; // 60 seconds - window to check for duplicates
const DEDUP_CACHE_TTL = 300; // 5 minutes - cache TTL for dedup keys
const MAX_RECENT_HASHES = 100; // Max number of message hashes to cache per conversation

interface MessageFingerprint {
  conversationId: string;
  senderAddress: string;
  contentHash: string;
  timestamp: number;
}

interface DeduplicationResult {
  isDuplicate: boolean;
  existingMessageId?: string;
  fingerprint: string;
}

/**
 * Generate a content hash for message deduplication
 */
function generateContentHash(content: string, attachments?: any[]): string {
  const hasher = crypto.createHash('sha256');

  // Hash the content
  hasher.update(content || '');

  // Include attachment info in hash
  if (attachments && attachments.length > 0) {
    const attachmentInfo = attachments.map(a => `${a.filename}:${a.size}`).join('|');
    hasher.update(attachmentInfo);
  }

  return hasher.digest('hex').substring(0, 16); // Use first 16 chars for efficiency
}

/**
 * Generate a unique fingerprint for a message
 */
function generateMessageFingerprint(
  conversationId: string,
  senderAddress: string,
  content: string,
  attachments?: any[]
): MessageFingerprint {
  const contentHash = generateContentHash(content, attachments);

  return {
    conversationId,
    senderAddress: senderAddress.toLowerCase(),
    contentHash,
    timestamp: Date.now()
  };
}

/**
 * Create a cache key for deduplication
 */
function createDedupCacheKey(fingerprint: MessageFingerprint): string {
  return `dedup:${fingerprint.conversationId}:${fingerprint.senderAddress}:${fingerprint.contentHash}`;
}

/**
 * Check if a message is a duplicate
 */
export async function checkForDuplicate(
  conversationId: string,
  senderAddress: string,
  content: string,
  attachments?: any[]
): Promise<DeduplicationResult> {
  const fingerprint = generateMessageFingerprint(conversationId, senderAddress, content, attachments);
  const cacheKey = createDedupCacheKey(fingerprint);

  try {
    // Check cache first (fast path)
    const cachedMessageId = await cacheService.get(cacheKey);
    if (cachedMessageId) {
      safeLogger.debug('Duplicate message detected via cache', {
        conversationId,
        senderAddress,
        contentHash: fingerprint.contentHash
      });

      return {
        isDuplicate: true,
        existingMessageId: cachedMessageId as string,
        fingerprint: fingerprint.contentHash
      };
    }

    // Check database within time window
    const windowStart = new Date(Date.now() - DEDUP_WINDOW_MS);

    const existingMessages = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.senderAddress, senderAddress.toLowerCase()),
          gte(chatMessages.sentAt, windowStart),
          sql`md5(${chatMessages.content}) = md5(${content})`
        )
      )
      .limit(1);

    if (existingMessages.length > 0) {
      // Cache for future requests
      await cacheService.set(cacheKey, existingMessages[0].id, DEDUP_CACHE_TTL);

      safeLogger.debug('Duplicate message detected via database', {
        conversationId,
        senderAddress,
        existingMessageId: existingMessages[0].id
      });

      return {
        isDuplicate: true,
        existingMessageId: existingMessages[0].id,
        fingerprint: fingerprint.contentHash
      };
    }

    return {
      isDuplicate: false,
      fingerprint: fingerprint.contentHash
    };
  } catch (error) {
    safeLogger.error('Error checking for duplicate message:', error);
    // On error, allow the message through to prevent message loss
    return {
      isDuplicate: false,
      fingerprint: fingerprint.contentHash
    };
  }
}

/**
 * Register a message as sent (add to dedup cache)
 */
export async function registerSentMessage(
  messageId: string,
  conversationId: string,
  senderAddress: string,
  content: string,
  attachments?: any[]
): Promise<void> {
  const fingerprint = generateMessageFingerprint(conversationId, senderAddress, content, attachments);
  const cacheKey = createDedupCacheKey(fingerprint);

  try {
    await cacheService.set(cacheKey, messageId, DEDUP_CACHE_TTL);

    // Also maintain a list of recent message hashes per conversation
    const recentHashesKey = `recent_hashes:${conversationId}:${senderAddress}`;
    const recentHashes = (await cacheService.get(recentHashesKey) as string[]) || [];

    recentHashes.unshift(fingerprint.contentHash);

    // Keep only recent hashes
    if (recentHashes.length > MAX_RECENT_HASHES) {
      recentHashes.length = MAX_RECENT_HASHES;
    }

    await cacheService.set(recentHashesKey, recentHashes, DEDUP_CACHE_TTL * 2);
  } catch (error) {
    safeLogger.error('Error registering sent message for dedup:', error);
    // Non-critical error, continue
  }
}

/**
 * Batch check for duplicates (for sync operations)
 */
export async function batchCheckDuplicates(
  messages: Array<{
    conversationId: string;
    senderAddress: string;
    content: string;
    attachments?: any[];
  }>
): Promise<Map<string, DeduplicationResult>> {
  const results = new Map<string, DeduplicationResult>();

  for (const message of messages) {
    const result = await checkForDuplicate(
      message.conversationId,
      message.senderAddress,
      message.content,
      message.attachments
    );

    const key = `${message.conversationId}:${message.senderAddress}:${generateContentHash(message.content, message.attachments)}`;
    results.set(key, result);
  }

  return results;
}

/**
 * Clean up old deduplication entries
 */
export async function cleanupDedupCache(): Promise<{ cleaned: number }> {
  // Cache service handles TTL automatically
  // This is a placeholder for any additional cleanup logic
  safeLogger.debug('Dedup cache cleanup triggered');
  return { cleaned: 0 };
}

/**
 * Idempotency key generator for client-side deduplication
 */
export function generateIdempotencyKey(
  conversationId: string,
  senderAddress: string,
  timestamp: number
): string {
  const input = `${conversationId}:${senderAddress}:${timestamp}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}

/**
 * Validate idempotency key format
 */
export function isValidIdempotencyKey(key: string): boolean {
  return /^[a-f0-9]{32}$/.test(key);
}

/**
 * Check and register idempotency key
 */
export async function checkIdempotencyKey(
  key: string
): Promise<{ exists: boolean; messageId?: string }> {
  if (!isValidIdempotencyKey(key)) {
    return { exists: false };
  }

  const cacheKey = `idempotency:${key}`;
  const existingId = await cacheService.get(cacheKey);

  if (existingId) {
    return { exists: true, messageId: existingId as string };
  }

  return { exists: false };
}

/**
 * Register idempotency key after successful message send
 */
export async function registerIdempotencyKey(
  key: string,
  messageId: string
): Promise<void> {
  if (!isValidIdempotencyKey(key)) {
    return;
  }

  const cacheKey = `idempotency:${key}`;
  await cacheService.set(cacheKey, messageId, DEDUP_CACHE_TTL);
}

export default {
  checkForDuplicate,
  registerSentMessage,
  batchCheckDuplicates,
  cleanupDedupCache,
  generateIdempotencyKey,
  isValidIdempotencyKey,
  checkIdempotencyKey,
  registerIdempotencyKey,
  generateContentHash
};
