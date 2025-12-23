/**
 * Tests for Message Attachment Handler
 * Validates attachment privacy handling, signed URLs, and cleanup mechanisms
 */

import { MessageAttachmentHandler, messageAttachmentHandler } from '../messageAttachmentHandler';

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

const mockIDBDatabase = {
  transaction: jest.fn(),
  close: jest.fn(),
  objectStoreNames: { contains: jest.fn() },
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
  oncomplete: null,
  onerror: null,
};

const mockIDBObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  count: jest.fn(),
  openCursor: jest.fn(),
  createIndex: jest.fn(),
  index: jest.fn(),
};

const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
  error: null,
};

// Setup mocks
beforeAll(() => {
  global.indexedDB = mockIndexedDB as any;
  
  // Mock crypto API
  Object.defineProperty(global, 'crypto', {
    value: {
      subtle: {
        generateKey: jest.fn(),
        importKey: jest.fn(),
        exportKey: jest.fn(),
        encrypt: jest.fn(),
        decrypt: jest.fn(),
        deriveKey: jest.fn(),
        digest: jest.fn(),
      },
      getRandomValues: jest.fn((arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      }),
    },
    writable: true,
    configurable: true,
  });
});

describe('MessageAttachmentHandler', () => {
  let handler: MessageAttachmentHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup IndexedDB mocks
    mockIndexedDB.open.mockImplementation(() => {
      const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockIDBDatabase;
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
      return request as any;
    });

    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);

    // Setup crypto mocks
    (global.crypto.subtle.deriveKey as jest.Mock).mockResolvedValue({
      type: 'secret',
      algorithm: { name: 'AES-GCM', length: 256 },
    });

    (global.crypto.subtle.importKey as jest.Mock).mockResolvedValue({
      type: 'secret',
      algorithm: { name: 'AES-GCM', length: 256 },
    });

    (global.crypto.subtle.encrypt as jest.Mock).mockResolvedValue(
      new ArrayBuffer(100)
    );

    (global.crypto.subtle.decrypt as jest.Mock).mockResolvedValue(
      new ArrayBuffer(50)
    );

    (global.crypto.subtle.digest as jest.Mock).mockResolvedValue(
      new ArrayBuffer(32)
    );

    handler = MessageAttachmentHandler.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default policy', async () => {
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
        return request;
      });

      await expect(handler.initialize()).resolves.not.toThrow();
    });

    it('should initialize with custom policy', async () => {
      const customPolicy = {
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        maxCacheAge: 12 * 60 * 60 * 1000, // 12 hours
        respectPrivacyHeaders: false,
      };

      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
        return request;
      });

      await expect(handler.initialize(customPolicy)).resolves.not.toThrow();
    });

    it('should handle initialization errors', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.error = new Error('Database error');
          if (request.onerror) request.onerror({} as any);
        }, 0);
        return request as any;
      });

      await expect(handler.initialize()).rejects.toThrow();
    });
  });

  describe('Privacy-Aware Caching', () => {
    beforeEach(async () => {
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
        return request;
      });

      await handler.initialize();
    });

    it('should cache non-private attachments', async () => {
      const attachmentId = 'att-123';
      const data = new ArrayBuffer(1000);
      const metadata = {
        attachmentId,
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        conversationId: 'conv-123',
        messageId: 'msg-456',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: false,
      };

      await expect(
        handler.cacheAttachment(attachmentId, data, metadata)
      ).resolves.not.toThrow();

      expect(mockIDBObjectStore.put).toHaveBeenCalled();
    });

    it('should encrypt private attachments before caching', async () => {
      const attachmentId = 'att-private-123';
      const data = new ArrayBuffer(1000);
      const metadata = {
        attachmentId,
        fileName: 'private-doc.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        conversationId: 'conv-123',
        messageId: 'msg-456',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-123',
      };

      await handler.cacheAttachment(attachmentId, data, metadata);

      expect(global.crypto.subtle.deriveKey).toHaveBeenCalled();
      expect(global.crypto.subtle.encrypt).toHaveBeenCalled();
      expect(mockIDBObjectStore.put).toHaveBeenCalled();
    });

    it('should skip caching for sensitive file types', async () => {
      const attachmentId = 'att-exe-123';
      const data = new ArrayBuffer(1000);
      const metadata = {
        attachmentId,
        fileName: 'malware.exe',
        mimeType: 'application/x-executable',
        size: 1000,
        conversationId: 'conv-123',
        messageId: 'msg-456',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: false,
      };

      await handler.cacheAttachment(attachmentId, data, metadata);

      // Should not cache executable files
      expect(mockIDBObjectStore.put).not.toHaveBeenCalled();
    });

    it('should respect privacy headers when configured', async () => {
      await handler.initialize({ respectPrivacyHeaders: true });

      const attachmentId = 'att-private-no-key';
      const data = new ArrayBuffer(1000);
      const metadata = {
        attachmentId,
        fileName: 'private-doc.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        conversationId: 'conv-123',
        messageId: 'msg-456',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: true, // Private but no encryption key
      };

      await handler.cacheAttachment(attachmentId, data, metadata);

      // Should not cache private files without encryption key
      expect(mockIDBObjectStore.put).not.toHaveBeenCalled();
    });
  });

  describe('Attachment Retrieval', () => {
    beforeEach(async () => {
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
        return request;
      });

      await handler.initialize();
    });

    it('should retrieve cached non-private attachment', async () => {
      const attachmentId = 'att-123';
      const mockCacheEntry = {
        attachmentId,
        encryptedData: [1, 2, 3, 4, 5],
        iv: [],
        metadata: {
          attachmentId,
          fileName: 'document.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          conversationId: 'conv-123',
          messageId: 'msg-456',
          uploadedBy: 'user1',
          uploadTimestamp: Date.now(),
          isPrivate: false,
        },
        cacheTimestamp: Date.now(),
        lastAccessTimestamp: Date.now(),
        accessCount: 0,
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockCacheEntry;
          if (request.onsuccess) request.onsuccess({ target: request } as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const result = await handler.getCachedAttachment(attachmentId);

      expect(result).toBeTruthy();
      expect(result?.metadata.fileName).toBe('document.pdf');
    });

    it('should decrypt private attachments on retrieval', async () => {
      const attachmentId = 'att-private-123';
      const mockCacheEntry = {
        attachmentId,
        encryptedData: [1, 2, 3, 4, 5],
        iv: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        metadata: {
          attachmentId,
          fileName: 'private-doc.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          conversationId: 'conv-123',
          messageId: 'msg-456',
          uploadedBy: 'user1',
          uploadTimestamp: Date.now(),
          isPrivate: true,
        },
        cacheTimestamp: Date.now(),
        lastAccessTimestamp: Date.now(),
        accessCount: 0,
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockCacheEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const result = await handler.getCachedAttachment(attachmentId);

      expect(result).toBeTruthy();
      expect(global.crypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should return null for non-existent attachment', async () => {
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const result = await handler.getCachedAttachment('non-existent');
      expect(result).toBeNull();
    });

    it('should handle expired attachments', async () => {
      const attachmentId = 'att-expired';
      const mockCacheEntry = {
        attachmentId,
        encryptedData: [1, 2, 3],
        iv: [],
        metadata: {
          attachmentId,
          fileName: 'expired.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          conversationId: 'conv-123',
          messageId: 'msg-456',
          uploadedBy: 'user1',
          uploadTimestamp: Date.now(),
          isPrivate: false,
          expiresAt: Date.now() - 1000, // Expired
        },
        cacheTimestamp: Date.now() - 86400000, // 1 day ago
        lastAccessTimestamp: Date.now() - 86400000,
        accessCount: 0,
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockCacheEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.delete.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const result = await handler.getCachedAttachment(attachmentId);

      expect(result).toBeNull();
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith(attachmentId);
    });
  });

  describe('Signed URL Support', () => {
    beforeEach(async () => {
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.initialize();
    });

    it('should generate signed URL for attachment', async () => {
      const attachmentId = 'att-123';
      const mockCacheEntry = {
        attachmentId,
        encryptedData: [1, 2, 3],
        iv: [],
        metadata: {
          attachmentId,
          fileName: 'document.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          conversationId: 'conv-123',
          messageId: 'msg-456',
          uploadedBy: 'user1',
          uploadTimestamp: Date.now(),
          isPrivate: false,
        },
        cacheTimestamp: Date.now(),
        lastAccessTimestamp: Date.now(),
        accessCount: 0,
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockCacheEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const signedUrl = await handler.generateSignedUrl(attachmentId, 15, 10);

      expect(signedUrl).toBeTruthy();
      expect(signedUrl).toContain(`/api/attachments/${attachmentId}`);
      expect(signedUrl).toContain('token=');
      expect(signedUrl).toContain('expires=');
      expect(global.crypto.subtle.digest).toHaveBeenCalled();
    });

    it('should validate signed URL correctly', async () => {
      const attachmentId = 'att-123';
      const expiresAt = Date.now() + 900000; // 15 minutes from now
      
      // Mock token generation to return consistent value
      const mockToken = 'abc123def456';
      (global.crypto.subtle.digest as jest.Mock).mockResolvedValue(
        new TextEncoder().encode(mockToken).buffer
      );

      const mockCacheEntry = {
        attachmentId,
        signedUrlInfo: {
          url: `/api/attachments/${attachmentId}?token=${mockToken}&expires=${expiresAt}`,
          expiresAt,
          accessCount: 0,
          maxAccess: 10,
        },
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockCacheEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const isValid = await handler.validateSignedUrl(attachmentId, mockToken, expiresAt);
      expect(isValid).toBe(true);
    });

    it('should reject expired signed URLs', async () => {
      const attachmentId = 'att-123';
      const expiredTime = Date.now() - 1000; // 1 second ago
      const token = 'expired-token';

      const isValid = await handler.validateSignedUrl(attachmentId, token, expiredTime);
      expect(isValid).toBe(false);
    });

    it('should reject invalid tokens', async () => {
      const attachmentId = 'att-123';
      const expiresAt = Date.now() + 900000;
      const invalidToken = 'invalid-token';

      // Mock different token generation
      (global.crypto.subtle.digest as jest.Mock).mockResolvedValue(
        new TextEncoder().encode('correct-token').buffer
      );

      const isValid = await handler.validateSignedUrl(attachmentId, invalidToken, expiresAt);
      expect(isValid).toBe(false);
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.initialize();
    });

    it('should cleanup expired attachments', async () => {
      const expiredEntry = {
        attachmentId: 'att-expired',
        encryptedData: [1, 2, 3],
        iv: [],
        metadata: {
          attachmentId: 'att-expired',
          fileName: 'expired.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          conversationId: 'conv-123',
          messageId: 'msg-456',
          uploadedBy: 'user1',
          uploadTimestamp: Date.now(),
          isPrivate: false,
          expiresAt: Date.now() - 1000, // Expired
        },
        cacheTimestamp: Date.now() - 86400000, // 1 day ago
        lastAccessTimestamp: Date.now() - 86400000,
        accessCount: 0,
      };

      let cursorCallCount = 0;
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (cursorCallCount === 0) {
            request.result = {
              value: expiredEntry,
              continue: () => {
                cursorCallCount++;
                setTimeout(() => {
                  request.result = null;
                  if (request.onsuccess) request.onsuccess({} as any);
                }, 0);
              },
            };
          } else {
            request.result = null;
          }
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.delete.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.cleanup();

      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('att-expired');
    });

    it('should clear conversation attachments', async () => {
      const conversationId = 'conv-123';
      const attachmentEntries = [
        {
          attachmentId: 'att-1',
          encryptedData: [1, 2, 3],
          metadata: { conversationId },
        },
        {
          attachmentId: 'att-2',
          encryptedData: [4, 5, 6],
          metadata: { conversationId },
        },
      ];

      let cursorIndex = 0;
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (cursorIndex < attachmentEntries.length) {
            request.result = {
              value: attachmentEntries[cursorIndex],
              continue: () => {
                cursorIndex++;
                setTimeout(() => {
                  if (cursorIndex < attachmentEntries.length) {
                    request.result.value = attachmentEntries[cursorIndex];
                    if (request.onsuccess) request.onsuccess({} as any);
                  } else {
                    request.result = null;
                    if (request.onsuccess) request.onsuccess({} as any);
                  }
                }, 0);
              },
            };
          } else {
            request.result = null;
          }
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.delete.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.clearConversationAttachments(conversationId);

      expect(mockIDBObjectStore.delete).toHaveBeenCalledTimes(2);
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('att-1');
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('att-2');
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(async () => {
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.initialize();
    });

    it('should return cache statistics', async () => {
      mockIDBObjectStore.count.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = 3;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      let cursorCallCount = 0;
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (cursorCallCount === 0) {
            request.result = {
              value: {
                cacheTimestamp: Date.now() - 1000,
                encryptedData: [1, 2, 3, 4, 5], // 5 bytes
              },
              continue: () => {
                cursorCallCount++;
                setTimeout(() => {
                  request.result = null;
                  if (request.onsuccess) request.onsuccess({} as any);
                }, 0);
              },
            };
          } else {
            request.result = null;
          }
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const stats = await handler.getCacheStats();

      expect(stats).toHaveProperty('totalAttachments');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('maxCacheSize');
      expect(stats).toHaveProperty('cacheUtilization');
      expect(stats.totalAttachments).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.error = new Error('Database error');
          if (request.onerror) request.onerror({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.initialize();

      const attachmentId = 'att-123';
      const data = new ArrayBuffer(1000);
      const metadata = {
        attachmentId,
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        conversationId: 'conv-123',
        messageId: 'msg-456',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: false,
      };

      await expect(
        handler.cacheAttachment(attachmentId, data, metadata)
      ).rejects.toThrow();
    });

    it('should handle encryption errors', async () => {
      (global.crypto.subtle.encrypt as jest.Mock).mockRejectedValue(
        new Error('Encryption failed')
      );

      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.initialize();

      const attachmentId = 'att-private-123';
      const data = new ArrayBuffer(1000);
      const metadata = {
        attachmentId,
        fileName: 'private-doc.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        conversationId: 'conv-123',
        messageId: 'msg-456',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-123',
      };

      await expect(
        handler.cacheAttachment(attachmentId, data, metadata)
      ).rejects.toThrow('Encryption failed');
    });
  });

  describe('Cache Isolation and Session-Based Access Control', () => {
    beforeEach(async () => {
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.initialize();
    });

    it('should isolate attachments by conversation', async () => {
      const conv1AttachmentId = 'att-conv1-123';
      const conv2AttachmentId = 'att-conv2-456';
      
      const data = new ArrayBuffer(1000);
      
      const metadata1 = {
        attachmentId: conv1AttachmentId,
        fileName: 'doc1.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        conversationId: 'conv-1',
        messageId: 'msg-1',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-conv1',
      };

      const metadata2 = {
        attachmentId: conv2AttachmentId,
        fileName: 'doc2.pdf',
        mimeType: 'application/pdf',
        size: 1000,
        conversationId: 'conv-2',
        messageId: 'msg-2',
        uploadedBy: 'user2',
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-conv2',
      };

      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await handler.cacheAttachment(conv1AttachmentId, data, metadata1);
      await handler.cacheAttachment(conv2AttachmentId, data, metadata2);

      // Verify that different conversations use different encryption keys
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalledTimes(2);
    });

    it('should handle access count limits', async () => {
      const attachmentId = 'att-limited-access';
      const mockCacheEntry = {
        attachmentId,
        encryptedData: [1, 2, 3],
        iv: [],
        metadata: {
          attachmentId,
          fileName: 'limited.pdf',
          mimeType: 'application/pdf',
          size: 1000,
          conversationId: 'conv-123',
          messageId: 'msg-456',
          uploadedBy: 'user1',
          uploadTimestamp: Date.now(),
          isPrivate: false,
        },
        cacheTimestamp: Date.now(),
        lastAccessTimestamp: Date.now(),
        accessCount: 100, // At limit
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockCacheEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.delete.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const result = await handler.getCachedAttachment(attachmentId);

      expect(result).toBeNull();
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith(attachmentId);
    });
  });
});