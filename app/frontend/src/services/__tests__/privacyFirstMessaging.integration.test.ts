/**
 * Integration Tests for Privacy-First Messaging Storage
 * Tests the complete integration between encrypted message storage,
 * attachment handling, and cache isolation
 */

import { EncryptedMessageStorage } from '../encryptedMessageStorage';
import { MessageAttachmentHandler } from '../messageAttachmentHandler';
import { MessageEncryptionService } from '../messageEncryptionService';

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
  clear: jest.fn(),
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

describe('Privacy-First Messaging Integration', () => {
  let messageStorage: EncryptedMessageStorage;
  let attachmentHandler: MessageAttachmentHandler;
  let encryptionService: MessageEncryptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup IndexedDB mocks
    mockIndexedDB.open.mockImplementation(() => {
      const request = { ...mockIDBRequest };
      setTimeout(() => {
        request.result = mockIDBDatabase;
        if (request.onsuccess) request.onsuccess({} as any);
      }, 0);
      return request as any;
    });

    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);

    // Setup crypto mocks
    (global.crypto.subtle.generateKey as jest.Mock).mockResolvedValue({
      publicKey: { type: 'public', algorithm: { name: 'RSA-OAEP' } },
      privateKey: { type: 'private', algorithm: { name: 'RSA-OAEP' } },
    });

    (global.crypto.subtle.deriveKey as jest.Mock).mockResolvedValue({
      type: 'secret',
      algorithm: { name: 'AES-GCM', length: 256 },
    });

    (global.crypto.subtle.importKey as jest.Mock).mockResolvedValue({
      type: 'secret',
      algorithm: { name: 'AES-GCM', length: 256 },
    });

    (global.crypto.subtle.exportKey as jest.Mock).mockResolvedValue(
      new ArrayBuffer(32)
    );

    (global.crypto.subtle.encrypt as jest.Mock).mockResolvedValue(
      new ArrayBuffer(100)
    );

    (global.crypto.subtle.decrypt as jest.Mock).mockResolvedValue(
      new TextEncoder().encode('decrypted content').buffer
    );

    (global.crypto.subtle.digest as jest.Mock).mockResolvedValue(
      new ArrayBuffer(32)
    );

    messageStorage = EncryptedMessageStorage.getInstance();
    attachmentHandler = MessageAttachmentHandler.getInstance();
    encryptionService = MessageEncryptionService.getInstance();
  });

  describe('End-to-End Message Flow', () => {
    beforeEach(async () => {
      // Setup successful database operations
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
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

      await messageStorage.initialize();
      await attachmentHandler.initialize();
    });

    it('should handle complete message with attachment flow', async () => {
      const conversationId = 'conv-integration-test';
      const messageId = 'msg-with-attachment';
      const sender = 'user1';
      const recipient = 'user2';
      const messageContent = 'Please see the attached document';
      
      // Store message
      await messageStorage.storeMessage(
        conversationId,
        messageId,
        messageContent,
        sender,
        recipient,
        'text'
      );

      // Store attachment
      const attachmentId = 'att-document';
      const attachmentData = new ArrayBuffer(2048);
      const attachmentMetadata = {
        attachmentId,
        fileName: 'important-document.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        conversationId,
        messageId,
        uploadedBy: sender,
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-123',
      };

      await attachmentHandler.cacheAttachment(
        attachmentId,
        attachmentData,
        attachmentMetadata
      );

      // Verify both message and attachment were encrypted
      expect(global.crypto.subtle.encrypt).toHaveBeenCalledTimes(2); // Message + attachment
      expect(mockIDBObjectStore.put).toHaveBeenCalledTimes(4); // Message, conversation metadata, attachment, session key
    });

    it('should maintain data isolation between conversations', async () => {
      const conv1 = 'conv-1';
      const conv2 = 'conv-2';
      
      // Store messages in different conversations
      await messageStorage.storeMessage(conv1, 'msg-1', 'Message for conv1', 'user1', 'user2');
      await messageStorage.storeMessage(conv2, 'msg-2', 'Message for conv2', 'user3', 'user4');

      // Store attachments in different conversations
      const attachment1Data = new ArrayBuffer(1024);
      const attachment1Metadata = {
        attachmentId: 'att-1',
        fileName: 'doc1.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        conversationId: conv1,
        messageId: 'msg-1',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-conv1',
      };

      const attachment2Data = new ArrayBuffer(1024);
      const attachment2Metadata = {
        attachmentId: 'att-2',
        fileName: 'doc2.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        conversationId: conv2,
        messageId: 'msg-2',
        uploadedBy: 'user3',
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-conv2',
      };

      await attachmentHandler.cacheAttachment('att-1', attachment1Data, attachment1Metadata);
      await attachmentHandler.cacheAttachment('att-2', attachment2Data, attachment2Metadata);

      // Verify different encryption keys were derived for different conversations
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalledTimes(4); // 2 for messages, 2 for attachments
    });

    it('should handle session-based access control', async () => {
      const conversationId = 'conv-session-test';
      const messageId = 'msg-session';
      
      // Store message
      await messageStorage.storeMessage(
        conversationId,
        messageId,
        'Session-controlled message',
        'user1',
        'user2'
      );

      // Mock message retrieval with stored entry
      const mockMessageEntry = {
        conversationId,
        messageId,
        encryptedData: [1, 2, 3, 4, 5],
        iv: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        timestamp: Date.now(),
        metadata: {
          sender: 'user1',
          recipient: 'user2',
          type: 'text',
          size: 100,
        },
        keyId: 'session-key-123',
        version: 1,
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockMessageEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      // Retrieve message
      const retrievedMessage = await messageStorage.getMessage(conversationId, messageId);

      expect(retrievedMessage).toBeTruthy();
      expect(retrievedMessage?.content).toBe('decrypted content');
      
      // Verify session-based key derivation was used
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalled();
    });
  });

  describe('Privacy and Security Validation', () => {
    beforeEach(async () => {
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
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

      await messageStorage.initialize();
      await attachmentHandler.initialize({ respectPrivacyHeaders: true });
    });

    it('should respect privacy headers for attachments', async () => {
      const conversationId = 'conv-privacy-test';
      const attachmentId = 'att-private-no-key';
      const attachmentData = new ArrayBuffer(1024);
      
      // Attachment marked as private but no encryption key provided
      const privateAttachmentMetadata = {
        attachmentId,
        fileName: 'private-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        conversationId,
        messageId: 'msg-private',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: true, // Private but no encryptionKeyId
      };

      await attachmentHandler.cacheAttachment(
        attachmentId,
        attachmentData,
        privateAttachmentMetadata
      );

      // Should not cache private attachment without encryption key
      expect(mockIDBObjectStore.put).not.toHaveBeenCalled();
    });

    it('should prevent caching of sensitive file types', async () => {
      const conversationId = 'conv-security-test';
      const attachmentId = 'att-executable';
      const attachmentData = new ArrayBuffer(1024);
      
      const executableMetadata = {
        attachmentId,
        fileName: 'suspicious.exe',
        mimeType: 'application/x-executable',
        size: 1024,
        conversationId,
        messageId: 'msg-exe',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: false,
      };

      await attachmentHandler.cacheAttachment(
        attachmentId,
        attachmentData,
        executableMetadata
      );

      // Should not cache executable files
      expect(mockIDBObjectStore.put).not.toHaveBeenCalled();
    });

    it('should handle key rotation securely', async () => {
      const conversationId = 'conv-rotation-test';
      
      // Store initial message
      await messageStorage.storeMessage(
        conversationId,
        'msg-before-rotation',
        'Message before key rotation',
        'user1',
        'user2'
      );

      // Mock conversation metadata for rotation
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = {
            conversationId,
            participants: ['user1', 'user2'],
            lastMessageTimestamp: Date.now(),
            messageCount: 1,
            encryptionEnabled: true,
            keyRotationTimestamp: Date.now() - 86400000, // 1 day ago
            lastAccessTimestamp: Date.now(),
          };
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      // Rotate keys
      await messageStorage.rotateConversationKeys(conversationId);

      // Store message after rotation
      await messageStorage.storeMessage(
        conversationId,
        'msg-after-rotation',
        'Message after key rotation',
        'user1',
        'user2'
      );

      // Verify new keys were generated
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalledTimes(3); // Initial + rotation + new message
    });
  });

  describe('Cleanup and Data Management', () => {
    beforeEach(async () => {
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
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

      await messageStorage.initialize();
      await attachmentHandler.initialize();
    });

    it('should cleanup conversation data completely', async () => {
      const conversationId = 'conv-cleanup-test';
      
      // Store message and attachment
      await messageStorage.storeMessage(
        conversationId,
        'msg-cleanup',
        'Message to be cleaned up',
        'user1',
        'user2'
      );

      const attachmentData = new ArrayBuffer(1024);
      const attachmentMetadata = {
        attachmentId: 'att-cleanup',
        fileName: 'cleanup-doc.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        conversationId,
        messageId: 'msg-cleanup',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: false,
      };

      await attachmentHandler.cacheAttachment(
        'att-cleanup',
        attachmentData,
        attachmentMetadata
      );

      // Setup delete mocks
      mockIDBObjectStore.delete.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = {
            conversationId,
            messageCount: 1,
            lastMessageTimestamp: Date.now(),
          };
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      // Mock cursor for attachment cleanup
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = {
            value: {
              attachmentId: 'att-cleanup',
              encryptedData: [1, 2, 3],
              metadata: { conversationId },
            },
            continue: () => {
              setTimeout(() => {
                request.result = null;
                if (request.onsuccess) request.onsuccess({} as any);
              }, 0);
            },
          };
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      // Clear conversation
      await messageStorage.clearConversation(conversationId);
      await attachmentHandler.clearConversationAttachments(conversationId);

      // Verify cleanup operations
      expect(mockIDBObjectStore.delete).toHaveBeenCalledTimes(2); // Message range + attachment
    });

    it('should handle automatic cleanup of expired data', async () => {
      // Mock expired entries
      const expiredMessageEntry = {
        conversationId: 'conv-expired',
        messageId: 'msg-expired',
        timestamp: Date.now() - 86400000, // 1 day ago
        keyId: 'expired-key',
      };

      const expiredAttachmentEntry = {
        attachmentId: 'att-expired',
        encryptedData: [1, 2, 3],
        metadata: {
          expiresAt: Date.now() - 1000, // Expired
        },
        cacheTimestamp: Date.now() - 86400000,
        lastAccessTimestamp: Date.now() - 86400000,
        accessCount: 0,
      };

      // Mock cursors to return expired entries
      let messageCleanupCalled = false;
      let attachmentCleanupCalled = false;

      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (!messageCleanupCalled && !attachmentCleanupCalled) {
            // First call for message cleanup
            messageCleanupCalled = true;
            request.result = null; // No expired messages for simplicity
          } else if (messageCleanupCalled && !attachmentCleanupCalled) {
            // Second call for attachment cleanup
            attachmentCleanupCalled = true;
            request.result = {
              value: expiredAttachmentEntry,
              continue: () => {
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

      // Run cleanup
      await messageStorage.cleanup();
      await attachmentHandler.cleanup();

      // Verify expired attachment was deleted
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('att-expired');
    });
  });

  describe('Error Recovery and Resilience', () => {
    beforeEach(async () => {
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
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

      await messageStorage.initialize();
      await attachmentHandler.initialize();
    });

    it('should handle partial encryption failures gracefully', async () => {
      const conversationId = 'conv-error-test';
      
      // Mock encryption failure for messages but success for attachments
      let encryptCallCount = 0;
      (global.crypto.subtle.encrypt as jest.Mock).mockImplementation(() => {
        encryptCallCount++;
        if (encryptCallCount === 1) {
          return Promise.reject(new Error('Message encryption failed'));
        }
        return Promise.resolve(new ArrayBuffer(100));
      });

      // Try to store message (should fail)
      await expect(
        messageStorage.storeMessage(
          conversationId,
          'msg-fail',
          'This message will fail to encrypt',
          'user1',
          'user2'
        )
      ).rejects.toThrow('Message encryption failed');

      // Reset encryption mock for attachment
      (global.crypto.subtle.encrypt as jest.Mock).mockResolvedValue(
        new ArrayBuffer(100)
      );

      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      // Try to store attachment (should succeed)
      const attachmentData = new ArrayBuffer(1024);
      const attachmentMetadata = {
        attachmentId: 'att-success',
        fileName: 'success.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        conversationId,
        messageId: 'msg-success',
        uploadedBy: 'user1',
        uploadTimestamp: Date.now(),
        isPrivate: true,
        encryptionKeyId: 'key-123',
      };

      await expect(
        attachmentHandler.cacheAttachment('att-success', attachmentData, attachmentMetadata)
      ).resolves.not.toThrow();
    });

    it('should handle database corruption gracefully', async () => {
      // Mock database corruption scenario
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.error = new Error('Database corrupted');
          if (request.onerror) request.onerror({} as any);
        }, 0);
        return request;
      });

      // Try to retrieve message
      const result = await messageStorage.getMessage('conv-corrupt', 'msg-corrupt');
      
      // Should handle error gracefully and return null
      expect(result).toBeNull();
    });
  });
});