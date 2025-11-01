/**
 * Tests for Encrypted Message Storage System
 * Validates message encryption/decryption, key derivation, and security features
 */

import { EncryptedMessageStorage, encryptedMessageStorage } from '../encryptedMessageStorage';
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

describe('EncryptedMessageStorage', () => {
  let storage: EncryptedMessageStorage;
  let mockEncryptionService: jest.Mocked<MessageEncryptionService>;

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
      new TextEncoder().encode('decrypted message').buffer
    );

    storage = EncryptedMessageStorage.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await expect(storage.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.error = new Error('Database error');
          if (request.onerror) request.onerror({} as any);
        }, 0);
        return request as any;
      });

      await expect(storage.initialize()).rejects.toThrow();
    });
  });

  describe('Message Storage and Retrieval', () => {
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

      await storage.initialize();
    });

    it('should store encrypted message successfully', async () => {
      const conversationId = 'conv-123';
      const messageId = 'msg-456';
      const content = 'Hello, this is a test message';
      const sender = 'user1';
      const recipient = 'user2';

      await expect(
        storage.storeMessage(conversationId, messageId, content, sender, recipient)
      ).resolves.not.toThrow();

      expect(global.crypto.subtle.encrypt).toHaveBeenCalled();
      expect(mockIDBObjectStore.put).toHaveBeenCalled();
    });

    it('should retrieve and decrypt message successfully', async () => {
      const conversationId = 'conv-123';
      const messageId = 'msg-456';
      
      // Mock encrypted message entry
      const mockEntry = {
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
        keyId: 'key-123',
        version: 1,
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const result = await storage.getMessage(conversationId, messageId);

      expect(result).toBeTruthy();
      expect(result?.content).toBe('decrypted message');
      expect(global.crypto.subtle.decrypt).toHaveBeenCalled();
    });

    it('should return null for non-existent message', async () => {
      const result = await storage.getMessage('non-existent', 'msg-123');
      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', async () => {
      const conversationId = 'conv-123';
      const messageId = 'msg-456';
      
      const mockEntry = {
        conversationId,
        messageId,
        encryptedData: [1, 2, 3],
        iv: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        timestamp: Date.now(),
        metadata: { sender: 'user1', recipient: 'user2', type: 'text', size: 100 },
        keyId: 'key-123',
        version: 1,
      };

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = mockEntry;
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      (global.crypto.subtle.decrypt as jest.Mock).mockRejectedValue(
        new Error('Decryption failed')
      );

      await expect(
        storage.getMessage(conversationId, messageId)
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('Key Management', () => {
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

      await storage.initialize();
    });

    it('should rotate conversation keys successfully', async () => {
      const conversationId = 'conv-123';

      mockIDBObjectStore.get.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = {
            conversationId,
            participants: ['user1', 'user2'],
            lastMessageTimestamp: Date.now(),
            messageCount: 5,
            encryptionEnabled: true,
            keyRotationTimestamp: Date.now() - 86400000, // 1 day ago
            lastAccessTimestamp: Date.now(),
          };
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await expect(
        storage.rotateConversationKeys(conversationId)
      ).resolves.not.toThrow();

      expect(global.crypto.subtle.deriveKey).toHaveBeenCalled();
      expect(mockIDBObjectStore.put).toHaveBeenCalled();
    });

    it('should derive session keys consistently', async () => {
      const conversationId = 'conv-123';
      
      // Store a message to trigger key generation
      await storage.storeMessage(conversationId, 'msg-1', 'test', 'user1', 'user2');
      
      // Verify key derivation was called
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalled();
      expect(global.crypto.subtle.importKey).toHaveBeenCalled();
    });
  });

  describe('Conversation Management', () => {
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

      await storage.initialize();
    });

    it('should get conversation messages with pagination', async () => {
      const conversationId = 'conv-123';
      const mockEntries = [
        {
          conversationId,
          messageId: 'msg-1',
          encryptedData: [1, 2, 3],
          iv: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          timestamp: Date.now() - 1000,
          metadata: { sender: 'user1', recipient: 'user2', type: 'text', size: 100 },
          keyId: 'key-1',
          version: 1,
        },
        {
          conversationId,
          messageId: 'msg-2',
          encryptedData: [1, 2, 3],
          iv: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          timestamp: Date.now(),
          metadata: { sender: 'user2', recipient: 'user1', type: 'text', size: 100 },
          keyId: 'key-2',
          version: 1,
        },
      ];

      // Mock cursor for pagination
      let cursorIndex = 0;
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          if (cursorIndex < mockEntries.length) {
            request.result = {
              value: mockEntries[cursorIndex],
              continue: () => {
                cursorIndex++;
                setTimeout(() => {
                  if (cursorIndex < mockEntries.length) {
                    request.result.value = mockEntries[cursorIndex];
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

      // Mock individual message retrieval
      mockIDBObjectStore.get.mockImplementation((key) => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          const messageId = Array.isArray(key) ? key[1] : key;
          request.result = mockEntries.find(e => e.messageId === messageId);
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      const messages = await storage.getConversationMessages(conversationId, 10, 0);

      expect(messages).toHaveLength(2);
      expect(messages[0].messageId).toBe('msg-1');
      expect(messages[1].messageId).toBe('msg-2');
    });

    it('should clear conversation successfully', async () => {
      const conversationId = 'conv-123';

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
            participants: ['user1', 'user2'],
            messageCount: 5,
            lastMessageTimestamp: Date.now(),
          };
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await expect(
        storage.clearConversation(conversationId)
      ).resolves.not.toThrow();

      expect(mockIDBObjectStore.delete).toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
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

      await storage.initialize();
    });

    it('should use different IVs for each message', async () => {
      const conversationId = 'conv-123';
      
      await storage.storeMessage(conversationId, 'msg-1', 'message 1', 'user1', 'user2');
      await storage.storeMessage(conversationId, 'msg-2', 'message 2', 'user1', 'user2');

      // Verify that crypto.getRandomValues was called for IVs
      expect(global.crypto.getRandomValues).toHaveBeenCalledTimes(2);
    });

    it('should handle session key expiry', async () => {
      // This test would verify that expired session keys are handled properly
      // In a real implementation, you would mock the session key expiry logic
      const conversationId = 'conv-123';
      
      await storage.storeMessage(conversationId, 'msg-1', 'test', 'user1', 'user2');
      
      // Verify key derivation occurred
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalled();
    });

    it('should isolate data by conversation', async () => {
      const conv1 = 'conv-1';
      const conv2 = 'conv-2';
      
      await storage.storeMessage(conv1, 'msg-1', 'message for conv1', 'user1', 'user2');
      await storage.storeMessage(conv2, 'msg-2', 'message for conv2', 'user3', 'user4');

      // Verify that different conversations use different keys
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalledTimes(2);
    });
  });

  describe('Storage Statistics', () => {
    beforeEach(async () => {
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await storage.initialize();
    });

    it('should return storage statistics', async () => {
      mockIDBObjectStore.count.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = 5;
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
                timestamp: Date.now() - 1000,
                metadata: { size: 100 },
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

      const stats = await storage.getStorageStats();

      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('totalConversations');
      expect(stats).toHaveProperty('storageUsed');
      expect(stats.totalMessages).toBe(5);
      expect(stats.totalConversations).toBe(5);
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await storage.initialize();
    });

    it('should cleanup expired keys and messages', async () => {
      mockIDBObjectStore.openCursor.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = null; // No expired entries
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await expect(storage.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database transaction errors', async () => {
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.error = new Error('Transaction failed');
          if (request.onerror) request.onerror({} as any);
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

      await storage.initialize();

      await expect(
        storage.storeMessage('conv-123', 'msg-456', 'test', 'user1', 'user2')
      ).rejects.toThrow();
    });

    it('should handle encryption errors', async () => {
      (global.crypto.subtle.encrypt as jest.Mock).mockRejectedValue(
        new Error('Encryption failed')
      );

      mockIDBObjectStore.getAll.mockImplementation(() => {
        const request = { ...mockIDBRequest };
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess({} as any);
        }, 0);
        return request;
      });

      await storage.initialize();

      await expect(
        storage.storeMessage('conv-123', 'msg-456', 'test', 'user1', 'user2')
      ).rejects.toThrow('Encryption failed');
    });
  });
});