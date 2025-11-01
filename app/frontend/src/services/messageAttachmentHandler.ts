/**
 * Message Attachment Handler
 * Implements privacy-aware attachment caching logic with signed URL support
 * and automatic cleanup for sensitive attachment data
 */

import { encryptedMessageStorage } from './encryptedMessageStorage';

export interface AttachmentMetadata {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  conversationId: string;
  messageId: string;
  uploadedBy: string;
  uploadTimestamp: number;
  expiresAt?: number;
  isPrivate: boolean;
  encryptionKeyId?: string;
}

export interface SignedUrlInfo {
  url: string;
  expiresAt: number;
  accessCount: number;
  maxAccess: number;
}

export interface AttachmentCacheEntry {
  attachmentId: string;
  encryptedData: ArrayBuffer;
  iv: ArrayBuffer;
  metadata: AttachmentMetadata;
  signedUrlInfo?: SignedUrlInfo;
  cacheTimestamp: number;
  lastAccessTimestamp: number;
  accessCount: number;
}

export interface AttachmentCachePolicy {
  maxCacheSize: number; // bytes
  maxCacheAge: number; // milliseconds
  maxAccessCount: number;
  respectPrivacyHeaders: boolean;
  autoCleanupInterval: number; // milliseconds
  signedUrlExpiry: number; // milliseconds
}

export class MessageAttachmentHandler {
  private static instance: MessageAttachmentHandler;
  private db: IDBDatabase | null = null;
  private cacheSize: number = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private readonly DB_NAME = 'MessageAttachmentCache';
  private readonly DB_VERSION = 1;
  
  private readonly DEFAULT_POLICY: AttachmentCachePolicy = {
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
    maxAccessCount: 100,
    respectPrivacyHeaders: true,
    autoCleanupInterval: 60 * 60 * 1000, // 1 hour
    signedUrlExpiry: 15 * 60 * 1000 // 15 minutes
  };

  private policy: AttachmentCachePolicy = { ...this.DEFAULT_POLICY };

  private constructor() {}

  public static getInstance(): MessageAttachmentHandler {
    if (!MessageAttachmentHandler.instance) {
      MessageAttachmentHandler.instance = new MessageAttachmentHandler();
    }
    return MessageAttachmentHandler.instance;
  }

  /**
   * Initialize the attachment handler
   */
  async initialize(customPolicy?: Partial<AttachmentCachePolicy>): Promise<void> {
    try {
      if (customPolicy) {
        this.policy = { ...this.policy, ...customPolicy };
      }

      await this.openDatabase();
      await this.calculateCacheSize();
      this.setupAutoCleanup();
      
      console.log('Message attachment handler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize message attachment handler:', error);
      throw error;
    }
  }

  /**
   * Cache an attachment with privacy-aware logic
   */
  async cacheAttachment(
    attachmentId: string,
    data: ArrayBuffer,
    metadata: AttachmentMetadata,
    signedUrlInfo?: SignedUrlInfo
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Check privacy headers and policies
      if (!this.shouldCacheAttachment(metadata)) {
        console.log(`Skipping cache for private attachment: ${attachmentId}`);
        return;
      }

      // Check cache size limits
      if (this.cacheSize + data.byteLength > this.policy.maxCacheSize) {
        await this.evictOldEntries(data.byteLength);
      }

      // Encrypt attachment data if it's private
      let encryptedData: ArrayBuffer;
      let iv: ArrayBuffer;

      if (metadata.isPrivate) {
        const result = await this.encryptAttachmentData(data, metadata.conversationId);
        encryptedData = result.encryptedData;
        iv = result.iv;
      } else {
        encryptedData = data;
        iv = new ArrayBuffer(0);
      }

      // Create cache entry
      const cacheEntry: AttachmentCacheEntry = {
        attachmentId,
        encryptedData,
        iv,
        metadata,
        signedUrlInfo,
        cacheTimestamp: Date.now(),
        lastAccessTimestamp: Date.now(),
        accessCount: 0
      };

      // Store in IndexedDB
      await this.storeCacheEntry(cacheEntry);
      this.cacheSize += data.byteLength;

      console.log(`Cached attachment: ${attachmentId} (${data.byteLength} bytes)`);

    } catch (error) {
      console.error('Failed to cache attachment:', error);
      throw error;
    }
  }

  /**
   * Retrieve cached attachment
   */
  async getCachedAttachment(attachmentId: string): Promise<{
    data: ArrayBuffer;
    metadata: AttachmentMetadata;
    signedUrlInfo?: SignedUrlInfo;
  } | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const cacheEntry = await this.getCacheEntry(attachmentId);
      if (!cacheEntry) return null;

      // Check if entry has expired
      if (this.isCacheEntryExpired(cacheEntry)) {
        await this.removeCacheEntry(attachmentId);
        return null;
      }

      // Check access limits
      if (cacheEntry.accessCount >= this.policy.maxAccessCount) {
        await this.removeCacheEntry(attachmentId);
        return null;
      }

      // Decrypt data if necessary
      let data: ArrayBuffer;
      if (cacheEntry.metadata.isPrivate && cacheEntry.iv.byteLength > 0) {
        data = await this.decryptAttachmentData(
          cacheEntry.encryptedData,
          cacheEntry.iv,
          cacheEntry.metadata.conversationId
        );
      } else {
        data = cacheEntry.encryptedData;
      }

      // Update access statistics
      await this.updateAccessStats(attachmentId);

      return {
        data,
        metadata: cacheEntry.metadata,
        signedUrlInfo: cacheEntry.signedUrlInfo
      };

    } catch (error) {
      console.error('Failed to get cached attachment:', error);
      return null;
    }
  }

  /**
   * Generate signed URL for secure attachment access
   */
  async generateSignedUrl(
    attachmentId: string,
    expiryMinutes: number = 15,
    maxAccess: number = 10
  ): Promise<string | null> {
    try {
      const cacheEntry = await this.getCacheEntry(attachmentId);
      if (!cacheEntry) return null;

      // Generate signed URL with expiry and access limits
      const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);
      const token = await this.generateSecureToken(attachmentId, expiresAt);
      
      const signedUrl = `/api/attachments/${attachmentId}?token=${token}&expires=${expiresAt}`;

      // Update signed URL info in cache
      const signedUrlInfo: SignedUrlInfo = {
        url: signedUrl,
        expiresAt,
        accessCount: 0,
        maxAccess
      };

      await this.updateSignedUrlInfo(attachmentId, signedUrlInfo);

      return signedUrl;

    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      return null;
    }
  }

  /**
   * Validate signed URL and check access permissions
   */
  async validateSignedUrl(attachmentId: string, token: string, expires: number): Promise<boolean> {
    try {
      // Check expiry
      if (Date.now() > expires) {
        return false;
      }

      // Validate token
      const expectedToken = await this.generateSecureToken(attachmentId, expires);
      if (token !== expectedToken) {
        return false;
      }

      // Check access limits
      const cacheEntry = await this.getCacheEntry(attachmentId);
      if (!cacheEntry || !cacheEntry.signedUrlInfo) {
        return false;
      }

      if (cacheEntry.signedUrlInfo.accessCount >= cacheEntry.signedUrlInfo.maxAccess) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('Failed to validate signed URL:', error);
      return false;
    }
  }

  /**
   * Remove attachment from cache
   */
  async removeAttachment(attachmentId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const cacheEntry = await this.getCacheEntry(attachmentId);
      if (cacheEntry) {
        this.cacheSize -= cacheEntry.encryptedData.byteLength;
      }

      await this.removeCacheEntry(attachmentId);
      console.log(`Removed attachment from cache: ${attachmentId}`);

    } catch (error) {
      console.error('Failed to remove attachment:', error);
      throw error;
    }
  }

  /**
   * Clear all attachments for a conversation
   */
  async clearConversationAttachments(conversationId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const transaction = this.db.transaction(['attachments'], 'readwrite');
      const store = transaction.objectStore('attachments');
      const index = store.index('conversationId');

      const attachmentsToDelete: string[] = [];
      let sizeReduction = 0;

      // Find all attachments for this conversation
      const cursor = index.openCursor(IDBKeyRange.only(conversationId));
      await new Promise<void>((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry: AttachmentCacheEntry = cursor.value;
            attachmentsToDelete.push(entry.attachmentId);
            sizeReduction += entry.encryptedData.byteLength;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      // Delete all found attachments
      for (const attachmentId of attachmentsToDelete) {
        await this.removeCacheEntry(attachmentId);
      }

      this.cacheSize -= sizeReduction;
      console.log(`Cleared ${attachmentsToDelete.length} attachments for conversation: ${conversationId}`);

    } catch (error) {
      console.error('Failed to clear conversation attachments:', error);
      throw error;
    }
  }

  /**
   * Perform cleanup of expired and old attachments
   */
  async cleanup(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['attachments'], 'readwrite');
      const store = transaction.objectStore('attachments');
      
      const expiredAttachments: string[] = [];
      let sizeReduction = 0;
      const now = Date.now();

      // Find expired attachments
      const cursor = store.openCursor();
      await new Promise<void>((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry: AttachmentCacheEntry = cursor.value;
            
            if (this.isCacheEntryExpired(entry) || 
                entry.accessCount >= this.policy.maxAccessCount ||
                (now - entry.lastAccessTimestamp) > this.policy.maxCacheAge) {
              
              expiredAttachments.push(entry.attachmentId);
              sizeReduction += entry.encryptedData.byteLength;
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      // Remove expired attachments
      for (const attachmentId of expiredAttachments) {
        await this.removeCacheEntry(attachmentId);
      }

      this.cacheSize -= sizeReduction;
      console.log(`Cleanup completed: removed ${expiredAttachments.length} expired attachments`);

    } catch (error) {
      console.error('Attachment cleanup failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalAttachments: number;
    cacheSize: number;
    maxCacheSize: number;
    cacheUtilization: number;
    oldestAttachment: number;
    newestAttachment: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const transaction = this.db.transaction(['attachments'], 'readonly');
      const store = transaction.objectStore('attachments');

      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;

      // Get timestamp range
      const cursor = store.openCursor();
      await new Promise<void>((resolve, reject) => {
        cursor.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry: AttachmentCacheEntry = cursor.value;
            oldestTimestamp = Math.min(oldestTimestamp, entry.cacheTimestamp);
            newestTimestamp = Math.max(newestTimestamp, entry.cacheTimestamp);
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursor.onerror = () => reject(cursor.error);
      });

      return {
        totalAttachments: count,
        cacheSize: this.cacheSize,
        maxCacheSize: this.policy.maxCacheSize,
        cacheUtilization: (this.cacheSize / this.policy.maxCacheSize) * 100,
        oldestAttachment: count > 0 ? oldestTimestamp : 0,
        newestAttachment: newestTimestamp
      };

    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalAttachments: 0,
        cacheSize: 0,
        maxCacheSize: this.policy.maxCacheSize,
        cacheUtilization: 0,
        oldestAttachment: 0,
        newestAttachment: 0
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

        if (!db.objectStoreNames.contains('attachments')) {
          const store = db.createObjectStore('attachments', { keyPath: 'attachmentId' });
          store.createIndex('conversationId', ['metadata', 'conversationId']);
          store.createIndex('cacheTimestamp', 'cacheTimestamp');
          store.createIndex('lastAccessTimestamp', 'lastAccessTimestamp');
          store.createIndex('isPrivate', ['metadata', 'isPrivate']);
        }
      };
    });
  }

  private shouldCacheAttachment(metadata: AttachmentMetadata): boolean {
    // Check if attachment should be cached based on privacy policies
    if (!this.policy.respectPrivacyHeaders) {
      return true;
    }

    // Don't cache if explicitly marked as private and no encryption key
    if (metadata.isPrivate && !metadata.encryptionKeyId) {
      return false;
    }

    // Check file size limits
    if (metadata.size > this.policy.maxCacheSize / 10) { // Max 10% of cache for single file
      return false;
    }

    // Check MIME type restrictions for sensitive content
    const sensitiveTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program'
    ];

    if (sensitiveTypes.includes(metadata.mimeType)) {
      return false;
    }

    return true;
  }

  private async encryptAttachmentData(
    data: ArrayBuffer,
    conversationId: string
  ): Promise<{ encryptedData: ArrayBuffer; iv: ArrayBuffer }> {
    // Generate IV for encryption
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Get encryption key from encrypted message storage
    const encryptedStorage = encryptedMessageStorage;
    
    // For now, use a simple key derivation - in production, this should use
    // the same session keys as the message storage
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(conversationId),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('attachment-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      encryptedData,
      iv: iv.buffer
    };
  }

  private async decryptAttachmentData(
    encryptedData: ArrayBuffer,
    iv: ArrayBuffer,
    conversationId: string
  ): Promise<ArrayBuffer> {
    // Derive the same key used for encryption
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(conversationId),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('attachment-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      encryptedData
    );
  }

  private async generateSecureToken(attachmentId: string, expiresAt: number): Promise<string> {
    const data = `${attachmentId}:${expiresAt}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async storeCacheEntry(entry: AttachmentCacheEntry): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['attachments'], 'readwrite');
    const store = transaction.objectStore('attachments');

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

  private async getCacheEntry(attachmentId: string): Promise<AttachmentCacheEntry | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['attachments'], 'readonly');
    const store = transaction.objectStore('attachments');
    const request = store.get(attachmentId);

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

  private async removeCacheEntry(attachmentId: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['attachments'], 'readwrite');
    const store = transaction.objectStore('attachments');

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(attachmentId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateAccessStats(attachmentId: string): Promise<void> {
    const entry = await this.getCacheEntry(attachmentId);
    if (!entry) return;

    entry.accessCount++;
    entry.lastAccessTimestamp = Date.now();

    await this.storeCacheEntry(entry);
  }

  private async updateSignedUrlInfo(attachmentId: string, signedUrlInfo: SignedUrlInfo): Promise<void> {
    const entry = await this.getCacheEntry(attachmentId);
    if (!entry) return;

    entry.signedUrlInfo = signedUrlInfo;
    await this.storeCacheEntry(entry);
  }

  private isCacheEntryExpired(entry: AttachmentCacheEntry): boolean {
    const now = Date.now();
    
    // Check cache age
    if (now - entry.cacheTimestamp > this.policy.maxCacheAge) {
      return true;
    }

    // Check attachment expiry
    if (entry.metadata.expiresAt && now > entry.metadata.expiresAt) {
      return true;
    }

    // Check signed URL expiry
    if (entry.signedUrlInfo && now > entry.signedUrlInfo.expiresAt) {
      return true;
    }

    return false;
  }

  private async evictOldEntries(requiredSpace: number): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['attachments'], 'readwrite');
    const store = transaction.objectStore('attachments');
    const index = store.index('lastAccessTimestamp');

    let freedSpace = 0;
    const entriesToEvict: string[] = [];

    // Find oldest entries to evict
    const cursor = index.openCursor();
    await new Promise<void>((resolve, reject) => {
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && freedSpace < requiredSpace) {
          const entry: AttachmentCacheEntry = cursor.value;
          entriesToEvict.push(entry.attachmentId);
          freedSpace += entry.encryptedData.byteLength;
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursor.onerror = () => reject(cursor.error);
    });

    // Remove evicted entries
    for (const attachmentId of entriesToEvict) {
      await this.removeCacheEntry(attachmentId);
    }

    this.cacheSize -= freedSpace;
    console.log(`Evicted ${entriesToEvict.length} old attachments to free ${freedSpace} bytes`);
  }

  private async calculateCacheSize(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['attachments'], 'readonly');
    const store = transaction.objectStore('attachments');

    let totalSize = 0;
    const cursor = store.openCursor();

    await new Promise<void>((resolve, reject) => {
      cursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry: AttachmentCacheEntry = cursor.value;
          totalSize += entry.encryptedData.byteLength;
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursor.onerror = () => reject(cursor.error);
    });

    this.cacheSize = totalSize;
  }

  private setupAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('Auto cleanup failed:', error);
      }
    }, this.policy.autoCleanupInterval);
  }

  /**
   * Shutdown the attachment handler
   */
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const messageAttachmentHandler = MessageAttachmentHandler.getInstance();