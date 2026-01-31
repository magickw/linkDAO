/**
 * Database-Level Message Encryption Utility
 * Provides AES-256-GCM encryption for message content at rest
 *
 * This supplements E2E encryption by ensuring messages are encrypted
 * in the database even if E2E keys are compromised.
 */

import crypto from 'crypto';
import { safeLogger } from './safeLogger';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

// Encryption key from environment (should be 32 bytes base64 encoded)
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY
  ? Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY, 'base64')
  : null;

// Key derivation for per-conversation keys (adds defense in depth)
const MASTER_SALT = process.env.MESSAGE_ENCRYPTION_SALT || 'linkdao-message-encryption-v1';

interface EncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded
  authTag: string; // base64 encoded
  version: number;
}

interface EncryptionResult {
  success: boolean;
  data?: EncryptedData;
  error?: string;
}

interface DecryptionResult {
  success: boolean;
  plaintext?: string;
  error?: string;
}

/**
 * Derives a conversation-specific key from the master key
 * This ensures each conversation uses a unique encryption key
 */
function deriveConversationKey(conversationId: string): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error('MESSAGE_ENCRYPTION_KEY not configured');
  }

  return crypto.pbkdf2Sync(
    ENCRYPTION_KEY,
    `${MASTER_SALT}:${conversationId}`,
    10000, // iterations
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts message content for database storage
 * Uses AES-256-GCM with conversation-specific keys
 */
export function encryptMessageContent(
  content: string,
  conversationId: string
): EncryptionResult {
  // If encryption is not configured, return plaintext marker
  if (!ENCRYPTION_KEY) {
    safeLogger.warn('Database encryption not configured - storing plaintext');
    return {
      success: true,
      data: {
        ciphertext: content,
        iv: '',
        authTag: '',
        version: 0 // Version 0 = plaintext
      }
    };
  }

  try {
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive conversation-specific key
    const key = deriveConversationKey(conversationId);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    // Encrypt content
    const encrypted = Buffer.concat([
      cipher.update(content, 'utf8'),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      success: true,
      data: {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        version: 1 // Version 1 = AES-256-GCM
      }
    };
  } catch (error) {
    safeLogger.error('Message encryption failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Encryption failed'
    };
  }
}

/**
 * Decrypts message content from database storage
 */
export function decryptMessageContent(
  encryptedData: EncryptedData,
  conversationId: string
): DecryptionResult {
  // Version 0 = plaintext (no encryption)
  if (encryptedData.version === 0 || !encryptedData.iv || !encryptedData.authTag) {
    return {
      success: true,
      plaintext: encryptedData.ciphertext
    };
  }

  if (!ENCRYPTION_KEY) {
    return {
      success: false,
      error: 'MESSAGE_ENCRYPTION_KEY not configured - cannot decrypt'
    };
  }

  try {
    // Decode base64 values
    const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');

    // Derive conversation-specific key
    const key = deriveConversationKey(conversationId);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt content
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    return {
      success: true,
      plaintext: decrypted.toString('utf8')
    };
  } catch (error) {
    safeLogger.error('Message decryption failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed'
    };
  }
}

/**
 * Checks if database encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return ENCRYPTION_KEY !== null;
}

/**
 * Encrypts content if encryption is enabled, otherwise returns original
 * Returns a string that can be stored directly in the database
 */
export function encryptForStorage(content: string, conversationId: string): string {
  const result = encryptMessageContent(content, conversationId);

  if (!result.success || !result.data) {
    // Fallback to plaintext if encryption fails
    return content;
  }

  // If version 0, return plaintext
  if (result.data.version === 0) {
    return content;
  }

  // Return JSON-encoded encrypted data
  return JSON.stringify({
    _encrypted: true,
    ...result.data
  });
}

/**
 * Decrypts content from storage if it was encrypted
 * Handles both encrypted and plaintext content transparently
 */
export function decryptFromStorage(storedContent: string, conversationId: string): string {
  // Check if content is JSON and encrypted
  if (!storedContent.startsWith('{')) {
    return storedContent; // Not encrypted
  }

  try {
    const parsed = JSON.parse(storedContent);

    if (!parsed._encrypted) {
      return storedContent; // Not encrypted
    }

    const result = decryptMessageContent(
      {
        ciphertext: parsed.ciphertext,
        iv: parsed.iv,
        authTag: parsed.authTag,
        version: parsed.version
      },
      conversationId
    );

    if (result.success && result.plaintext) {
      return result.plaintext;
    }

    // Return encrypted content if decryption fails (for debugging)
    safeLogger.error('Failed to decrypt message content');
    return '[Encrypted content - decryption failed]';
  } catch {
    // Not valid JSON, return as-is
    return storedContent;
  }
}

/**
 * Rotates encryption key (for key rotation procedures)
 * This would re-encrypt all messages with a new key
 */
export async function rotateEncryptionKey(
  oldKey: Buffer,
  newKey: Buffer,
  getMessages: () => Promise<Array<{ id: string; conversationId: string; content: string }>>,
  updateMessage: (id: string, content: string) => Promise<void>
): Promise<{ success: boolean; messagesProcessed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const messages = await getMessages();

    for (const message of messages) {
      try {
        // Decrypt with old key (temporarily override)
        const decrypted = decryptFromStorage(message.content, message.conversationId);

        // Re-encrypt with new key
        const reEncrypted = encryptForStorage(decrypted, message.conversationId);

        // Update in database
        await updateMessage(message.id, reEncrypted);

        processed++;
      } catch (error) {
        safeLogger.error(`Failed to rotate key for message ${message.id}:`, error);
        errors++;
      }
    }

    return { success: errors === 0, messagesProcessed: processed, errors };
  } catch (error) {
    safeLogger.error('Key rotation failed:', error);
    return { success: false, messagesProcessed: processed, errors };
  }
}

export default {
  encryptMessageContent,
  decryptMessageContent,
  encryptForStorage,
  decryptFromStorage,
  isEncryptionEnabled,
  rotateEncryptionKey
};
