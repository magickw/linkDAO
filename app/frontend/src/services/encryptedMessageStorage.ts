/**
 * Encrypted Message Storage System
 * Implements privacy-first IndexedDB storage for encrypted message data
 * with WebCrypto-based encryption/decryption using session-derived keys
 */

import { MessageEncryptionService } from './messageEncryptionService';

export interface EncryptedMessageEntry {
  conversationId: string;
  messageId: string;
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  timestamp: number;
  metadata: {
    sender: string;
    recipient: string;
    type: 'text' | 'attachment' | 'system';
    size: number;
    attachmentInfo?: {
      fileName: string;
      mimeType: string;
      size: number;
    };
  };
  keyId: string;
  version: number;
}

export interface ConversationMetadata {
  conversationId: string;
  participants: string[];
  lastMessageTimestamp: number;
  messageCount: number;
  encryptionEnabled: boolean;
  keyRotationTimestamp: number;
  lastAccessTimestamp: number;
}

export interface SessionKey {
  keyId: string;
  key: CryptoKey;
  derivedFrom: string; // session identifier
  createdAt: number;
  expiresAt: number;
  rotationCount: number;
}

export class EncryptedMessageStorage {
  private static instance: EncryptedMessageStorage;
  private db: IDBDatabase | null = null;
  private sessionKeys: Map<string, SessionKey> = new Map();
  private encryptionService: MessageEncryptionService;
  private currentSessionId: string = '';
  
  private readonly DB_NAME = 'EncryptedMessageStorage';
  private readonly DB_VERSION = 1;
  private readonly KEY_ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SESSION_KEY_EXPIRY = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.encryptionService = MessageEncryptionService.getInstance();
    this.currentSessionId = this.generateSessionId();
  }

  public static getInstance(): EncryptedMessageStorage {
    if (!EncryptedMessageStorage.instance) {
      EncryptedMessageStorage.instance = new EncryptedMessageStorage();
    }
    return EncryptedMessageStorage.instance;
  }

  /**
   * Initialize the encrypted message storage system
   */
  async initialize(): Promise<void> {
    try {
      await this.openDatabase();
      await this.initializeSessionKeys();
      await this.setupKeyRotation();
      console.log('Encrypted message storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize encrypted message storage:', error);
      throw error;
    }
  }

  /**
   * Store an encrypted message
   */
  async storeMessage(
    conversationId: string,
    messageId: string,
    messageContent: string,
    sender: string,
    recipient: string,
    type: 'text' | 'attachment' | 'system' = 'text',
    attachmentInfo?: { fileName: string; mimeType: string; size: number }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get or create session key for this conversation
      const sessionKey = await this.getOrCreateSessionKey(conversationId);
      
      // Generate IV for encryption
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt message content
      const encoder = new TextEncoder();
      const messageData = encoder.encode(messageContent);
      
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sessionKey.key,
        messageData
      );

      // Create encrypted message entry
      const entry: EncryptedMessageEntry = {
        conversationId,
        messageId,
        encryptedData,
        iv: iv.buffer,
        timestamp: Date.now(),
        metadata: {
          sender,
          recipient,
          type,
          size: messageData.length,
          attachmentInfo
        },
        keyId: sessionKey.keyId,
        version: 1
      };

      // Store in IndexedDB
      await this.storeEncryptedEntry(entry);
      
      // Update conversation metadata
      await this.updateConversationMetadata(conversationId, [sender, recipient]);
      
    } catch (error) {
      console.error('Failed to store encrypted message:', error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt a message
   */
  async getMessage(conversationId: string, messageId: string): Promise<{
    content: string;
    metadata: EncryptedMessageEntry['metadata'];
    timestamp: number;
  } | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Retrieve encrypted entry
      const entry = await this.getEncryptedEntry(conversationId, messageId);
      if (!entry) return null;

      // Get session key
      const sessionKey = this.sessionKeys.get(entry.keyId);
      if (!sessionKey) {
        // Try to derive key from session
        const derivedKey = await this.deriveSessionKey(conversationId, entry.keyId);
        if (!derivedKey) {
          throw new Error('Unable to decrypt message: key not available');
        }
      }

      // Decrypt message content
      const key = sessionKey?.key || (await this.deriveSessionKey(conversationId, entry.keyId))!;
      const iv = new Uint8Array(entry.iv);
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        entry.encryptedData
      );

      const decoder = new TextDecoder();
      const content = decoder.decode(decryptedData);

      // Update access timestamp
      await this.updateMessageAccessTime(conversationId, messageId);

      return {
        content,
        metadata: entry.metadata,
        timestamp: entry.timestamp
      };

    } catch (error) {
      console.error('Failed to retrieve encrypted message:', error);
      throw error;
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    messageId: string;
    content: string;
    metadata: EncryptedMessageEntry['metadata'];
    timestamp: number;
  }>> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const entries = await this.getConversationEntries(conversationId, limit, offset);
      const messages = [];

      for (const entry of entries) {
        try {
          const message = await this.getMessage(conversationId, entry.messageId);
          if (message) {
            messages.push({
              messageId: entry.messageId,
              ...message
            });
          }
        } catch (error) {
          console.warn(`Failed to decrypt message ${entry.messageId}:`, error);
          // Continue with other messages
        }
      }

      return messages.sort((a, b) => a.timestamp - b.timestamp);

    } catch (error) {
      console.error('Failed to get conversation messages:', error);
      throw error;
    }
  }

  /**
   * Delete a message (secure deletion)
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const transaction = this.db.transaction(['messages'], 'readwrite');
      const store = transaction.objectStore('messages');
      
      // Get the entry first to ensure it exists
      const entry = await this.getEncryptedEntry(conversationId, messageId);
      if (!entry) return;

      // Delete from IndexedDB
      const deleteRequest = store.delete([conversationId, messageId]);
      
      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });

      // Update conversation metadata
      await this.decrementMessageCount(conversationId);

    } catch (error) {
      console.error('Failed to delete encrypted message:', error);
      throw error;
    }
  }

  /**
   * Clear all messages for a conversation
   */
  async clearConversation(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const transaction = this.db.transaction(['messages', 'conversations'], 'readwrite');
      const messageStore = transaction.objectStore('messages');
      const conversationStore = transaction.objectStore('conversations');

      // Delete all messages for this conversation
      const range = IDBKeyRange.bound([conversationId], [conversationId, '\uffff']);
      const deleteRequest = messageStore.delete(range);

      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });

      // Reset conversation metadata
      const conversationRequest = conversationStore.get(conversationId);
      conversationRequest.onsuccess = () => {
        const conversation = conversationRequest.result;
        if (conversation) {
          conversation.messageCount = 0;
          conversation.lastMessageTimestamp = Date.now();
          conversationStore.put(conversation);
        }
      };

    } catch (error) {
      console.error('Failed to clear conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation metadata
   */
  async getConversationMetadata(conversationId: string): Promise<ConversationMetadata | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const transaction = this.db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const request = store.get(conversationId);

      return new Promise<ConversationMetadata | null>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('Failed to get conversation metadata:', error);
      return null;
    }
  }

  /**
   * Rotate encryption keys for enhanced security
   */
  async rotateConversationKeys(conversationId: string): Promise<void> {
    try {
      // Generate new session key
      const newSessionKey = await this.generateSessionKey(conversationId);
      
      // Store new key
      this.sessionKeys.set(newSessionKey.keyId, newSessionKey);
      await this.storeSessionKey(newSessionKey);

      // Update conversation metadata
      const metadata = await this.getConversationMetadata(conversationId);
      if (metadata) {
        metadata.keyRotationTimestamp = Date.now();
        await this.updateConversationMetadataRecord(metadata);
      }

      console.log(`Keys rotated for conversation ${conversationId}`);

    } catch (error) {
      console.error('Failed to rotate conversation keys:', error);
      throw error;
    }
  }

  /**
   * Clean up expired keys and old messages
   */
  async cleanup(): Promise<void> {
    try {
      await this.cleanupExpiredKeys();
      await this.cleanupOldMessages();
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalMessages: number;
    totalConversations: number;
    storageUsed: number;
    oldestMessage: number;
    newestMessage: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const transaction = this.db.transaction(['messages', 'conversations'], 'readonly');
      const messageStore = transaction.objectStore('messages');
      const conversationStore = transaction.objectStore('conversations');

      const messageCount = await new Promise<number>((resolve, reject) => {
        const request = messageStore.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const conversationCount = await new Promise<number>((resolve, reject) => {
        const request = conversationStore.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Estimate storage usage
      let storageUsed = 0;
      let oldestMessage = Date.now();
      let newestMessage = 0;

      const cursor = messageStore.openCursor();
      await new Promise<void>((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry: EncryptedMessageEntry = cursor.value;
            storageUsed += entry.metadata.size;
            oldestMessage = Math.min(oldestMessage, entry.timestamp);
            newestMessage = Math.max(newestMessage, entry.timestamp);
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      return {
        totalMessages: messageCount,
        totalConversations: conversationCount,
        storageUsed,
        oldestMessage: messageCount > 0 ? oldestMessage : 0,
        newestMessage
      };

    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalMessages: 0,
        totalConversations: 0,
        storageUsed: 0,
        oldestMessage: 0,
        newestMessage: 0
      };
    }
  }

  // Private methods

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Messages store
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { 
            keyPath: ['conversationId', 'messageId'] 
          });
          messageStore.createIndex('conversationId', 'conversationId');
          messageStore.createIndex('timestamp', 'timestamp');
          messageStore.createIndex('sender', ['metadata', 'sender']);
        }

        // Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { 
            keyPath: 'conversationId' 
          });
          conversationStore.createIndex('lastMessageTimestamp', 'lastMessageTimestamp');
          conversationStore.createIndex('participants', 'participants', { multiEntry: true });
        }

        // Session keys store
        if (!db.objectStoreNames.contains('sessionKeys')) {
          const keyStore = db.createObjectStore('sessionKeys', { keyPath: 'keyId' });
          keyStore.createIndex('conversationId', 'derivedFrom');
          keyStore.createIndex('expiresAt', 'expiresAt');
        }
      };
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeSessionKeys(): Promise<void> {
    // Load existing session keys from IndexedDB
    if (!this.db) return;

    const transaction = this.db.transaction(['sessionKeys'], 'readonly');
    const store = transaction.objectStore('sessionKeys');
    const request = store.getAll();

    const keys = await new Promise<any[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const keyData of keys) {
      if (keyData.expiresAt > Date.now()) {
        // Import the key
        const key = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData.keyMaterial),
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );

        const sessionKey: SessionKey = {
          keyId: keyData.keyId,
          key,
          derivedFrom: keyData.derivedFrom,
          createdAt: keyData.createdAt,
          expiresAt: keyData.expiresAt,
          rotationCount: keyData.rotationCount
        };

        this.sessionKeys.set(keyData.keyId, sessionKey);
      }
    }
  }

  private async getOrCreateSessionKey(conversationId: string): Promise<SessionKey> {
    // Look for existing valid key
    for (const [keyId, sessionKey] of this.sessionKeys) {
      if (sessionKey.derivedFrom === conversationId && sessionKey.expiresAt > Date.now()) {
        return sessionKey;
      }
    }

    // Create new session key
    return await this.generateSessionKey(conversationId);
  }

  private async generateSessionKey(conversationId: string): Promise<SessionKey> {
    // Derive key from session and conversation ID
    const keyMaterial = await this.deriveKeyMaterial(this.currentSessionId, conversationId);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );

    const sessionKey: SessionKey = {
      keyId: `${conversationId}_${Date.now()}`,
      key,
      derivedFrom: conversationId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_KEY_EXPIRY,
      rotationCount: 0
    };

    this.sessionKeys.set(sessionKey.keyId, sessionKey);
    await this.storeSessionKey(sessionKey);

    return sessionKey;
  }

  private async deriveKeyMaterial(sessionId: string, conversationId: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const sessionData = encoder.encode(sessionId);
    const conversationData = encoder.encode(conversationId);
    
    // Import session data as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      sessionData,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive key using PBKDF2
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: conversationData,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Export as raw key material
    return await crypto.subtle.exportKey('raw', derivedKey);
  }

  private async deriveSessionKey(conversationId: string, keyId: string): Promise<CryptoKey | null> {
    try {
      const keyMaterial = await this.deriveKeyMaterial(this.currentSessionId, conversationId);
      return await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('Failed to derive session key:', error);
      return null;
    }
  }

  private async storeSessionKey(sessionKey: SessionKey): Promise<void> {
    if (!this.db) return;

    const keyMaterial = await crypto.subtle.exportKey('raw', sessionKey.key);

    const keyData = {
      keyId: sessionKey.keyId,
      keyMaterial: Array.from(new Uint8Array(keyMaterial)),
      derivedFrom: sessionKey.derivedFrom,
      createdAt: sessionKey.createdAt,
      expiresAt: sessionKey.expiresAt,
      rotationCount: sessionKey.rotationCount
    };

    const transaction = this.db.transaction(['sessionKeys'], 'readwrite');
    const store = transaction.objectStore('sessionKeys');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(keyData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async storeEncryptedEntry(entry: EncryptedMessageEntry): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');

    // Convert ArrayBuffers to arrays for storage
    const storageEntry = {
      ...entry,
      encryptedData: Array.from(new Uint8Array(entry.encryptedData)),
      iv: Array.from(new Uint8Array(entry.iv))
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(storageEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getEncryptedEntry(conversationId: string, messageId: string): Promise<EncryptedMessageEntry | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const request = store.get([conversationId, messageId]);

    const result = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!result) return null;

    // Convert arrays back to ArrayBuffers
    return {
      ...result,
      encryptedData: new Uint8Array(result.encryptedData).buffer,
      iv: new Uint8Array(result.iv).buffer
    };
  }

  private async getConversationEntries(
    conversationId: string, 
    limit: number, 
    offset: number
  ): Promise<EncryptedMessageEntry[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('conversationId');
    
    const entries: EncryptedMessageEntry[] = [];
    let count = 0;
    let skipped = 0;

    const cursor = index.openCursor(IDBKeyRange.only(conversationId));
    
    await new Promise<void>((resolve, reject) => {
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          if (skipped < offset) {
            skipped++;
            cursor.continue();
            return;
          }

          const result = cursor.value;
          entries.push({
            ...result,
            encryptedData: new Uint8Array(result.encryptedData).buffer,
            iv: new Uint8Array(result.iv).buffer
          });
          count++;
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursor.onerror = () => reject(cursor.error);
    });

    return entries;
  }

  private async updateConversationMetadata(conversationId: string, participants: string[]): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    
    const request = store.get(conversationId);
    request.onsuccess = () => {
      let metadata: ConversationMetadata = request.result;
      
      if (!metadata) {
        metadata = {
          conversationId,
          participants,
          lastMessageTimestamp: Date.now(),
          messageCount: 1,
          encryptionEnabled: true,
          keyRotationTimestamp: Date.now(),
          lastAccessTimestamp: Date.now()
        };
      } else {
        metadata.lastMessageTimestamp = Date.now();
        metadata.messageCount++;
        metadata.lastAccessTimestamp = Date.now();
      }

      store.put(metadata);
    };
  }

  private async updateConversationMetadataRecord(metadata: ConversationMetadata): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(metadata);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateMessageAccessTime(conversationId: string, messageId: string): Promise<void> {
    // Update conversation last access time
    const metadata = await this.getConversationMetadata(conversationId);
    if (metadata) {
      metadata.lastAccessTimestamp = Date.now();
      await this.updateConversationMetadataRecord(metadata);
    }
  }

  private async decrementMessageCount(conversationId: string): Promise<void> {
    const metadata = await this.getConversationMetadata(conversationId);
    if (metadata && metadata.messageCount > 0) {
      metadata.messageCount--;
      await this.updateConversationMetadataRecord(metadata);
    }
  }

  private async setupKeyRotation(): Promise<void> {
    // Set up automatic key rotation
    setInterval(async () => {
      try {
        await this.rotateExpiredKeys();
      } catch (error) {
        console.error('Automatic key rotation failed:', error);
      }
    }, this.KEY_ROTATION_INTERVAL);
  }

  private async rotateExpiredKeys(): Promise<void> {
    const now = Date.now();
    const conversationsToRotate = new Set<string>();

    // Find keys that need rotation
    for (const [keyId, sessionKey] of this.sessionKeys) {
      if (now - sessionKey.createdAt > this.KEY_ROTATION_INTERVAL) {
        conversationsToRotate.add(sessionKey.derivedFrom);
      }
    }

    // Rotate keys for each conversation
    for (const conversationId of conversationsToRotate) {
      try {
        await this.rotateConversationKeys(conversationId);
      } catch (error) {
        console.error(`Failed to rotate keys for conversation ${conversationId}:`, error);
      }
    }
  }

  private async cleanupExpiredKeys(): Promise<void> {
    if (!this.db) return;

    const now = Date.now();
    const transaction = this.db.transaction(['sessionKeys'], 'readwrite');
    const store = transaction.objectStore('sessionKeys');
    const index = store.index('expiresAt');

    // Delete expired keys
    const range = IDBKeyRange.upperBound(now);
    await new Promise<void>((resolve, reject) => {
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Clean up memory cache
    for (const [keyId, sessionKey] of this.sessionKeys) {
      if (sessionKey.expiresAt <= now) {
        this.sessionKeys.delete(keyId);
      }
    }
  }

  private async cleanupOldMessages(): Promise<void> {
    // This could implement policies for cleaning up very old messages
    // For now, we'll just log that cleanup was called
    console.log('Message cleanup completed - no old messages removed');
  }
}

// Export singleton instance
export const encryptedMessageStorage = EncryptedMessageStorage.getInstance();