import { MessageEncryptionService } from '../messageEncryptionService';
import { EncryptedMessage } from '../../types/messaging';

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// Setup mocks
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock TextEncoder/TextDecoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn((text) => new Uint8Array(Buffer.from(text, 'utf8'))),
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn((buffer) => Buffer.from(buffer).toString('utf8')),
}));

// Mock btoa/atob
global.btoa = jest.fn((str) => Buffer.from(str, 'binary').toString('base64'));
global.atob = jest.fn((str) => Buffer.from(str, 'base64').toString('binary'));

describe('MessageEncryptionService', () => {
  let encryptionService: MessageEncryptionService;
  let mockKeyPair: CryptoKeyPair;
  let mockSymmetricKey: CryptoKey;
  let mockDB: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (MessageEncryptionService as any).instance = undefined;
    encryptionService = MessageEncryptionService.getInstance();

    // Mock key pair
    mockKeyPair = {
      publicKey: { type: 'public' } as CryptoKey,
      privateKey: { type: 'private' } as CryptoKey,
    };

    // Mock symmetric key
    mockSymmetricKey = { type: 'secret' } as CryptoKey;

    // Mock IndexedDB database
    mockDB = {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({ onsuccess: null, onerror: null })),
          get: jest.fn(() => ({ onsuccess: null, onerror: null, result: null })),
          delete: jest.fn(() => ({ onsuccess: null, onerror: null })),
          clear: jest.fn(() => ({ onsuccess: null, onerror: null })),
          createIndex: jest.fn(),
        })),
        complete: Promise.resolve(),
      })),
      objectStoreNames: {
        contains: jest.fn(() => false),
      },
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn(),
      })),
    };

    // Mock IndexedDB open
    mockIndexedDB.open.mockImplementation(() => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: mockDB,
    }));
  });

  describe('Key Generation and Management', () => {
    it('should generate a new RSA key pair', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      
      // Mock database operations
      const mockTransaction = {
        objectStore: jest.fn(() => ({
          put: jest.fn(() => ({
            onsuccess: null,
            onerror: null,
          })),
        })),
        complete: Promise.resolve(),
      };
      
      mockDB.transaction.mockReturnValue(mockTransaction);
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256)) // public key
        .mockResolvedValueOnce(new ArrayBuffer(512)); // private key

      const keyPair = await encryptionService.generateKeyPair(userAddress);

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );
      expect(keyPair).toBe(mockKeyPair);
    });

    it('should export public key as base64', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const mockExportedKey = new ArrayBuffer(256);
      
      // Mock getting key pair
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      mockCrypto.subtle.exportKey.mockResolvedValue(mockExportedKey);

      const publicKeyBase64 = await encryptionService.exportPublicKey(userAddress);

      expect(mockCrypto.subtle.exportKey).toHaveBeenCalledWith('spki', mockKeyPair.publicKey);
      expect(typeof publicKeyBase64).toBe('string');
      expect(global.btoa).toHaveBeenCalled();
    });

    it('should import public key from base64', async () => {
      const publicKeyBase64 = 'mockBase64PublicKey';
      const mockImportedKey = { type: 'public' } as CryptoKey;
      
      mockCrypto.subtle.importKey.mockResolvedValue(mockImportedKey);

      const importedKey = await encryptionService.importPublicKey(publicKeyBase64);

      expect(global.atob).toHaveBeenCalledWith(publicKeyBase64);
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'spki',
        expect.any(ArrayBuffer),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );
      expect(importedKey).toBe(mockImportedKey);
    });

    it('should handle key generation errors', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const error = new Error('Key generation failed');
      
      mockCrypto.subtle.generateKey.mockRejectedValue(error);

      await expect(encryptionService.generateKeyPair(userAddress)).rejects.toThrow('Key pair generation failed');
    });
  });

  describe('Message Encryption and Decryption', () => {
    it('should encrypt a message successfully', async () => {
      const content = 'Hello, this is a secret message!';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1234567890123456789012345678901234567890';
      
      const mockEncryptedContent = new ArrayBuffer(64);
      const mockEncryptedKey = new ArrayBuffer(256);
      const mockIV = new Uint8Array(12);
      const mockRecipientPublicKey = { type: 'public' } as CryptoKey;
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(mockIV);
      mockCrypto.subtle.encrypt
        .mockResolvedValueOnce(mockEncryptedContent) // message encryption
        .mockResolvedValueOnce(mockEncryptedKey); // key encryption
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue(mockRecipientPublicKey);

      const encryptedMessage = await encryptionService.encryptMessage(
        content,
        recipientPublicKeyBase64,
        senderAddress
      );

      expect(encryptedMessage).toEqual({
        encryptedContent: Array.from(new Uint8Array(mockEncryptedContent)),
        encryptedKey: Array.from(new Uint8Array(mockEncryptedKey)),
        iv: Array.from(mockIV),
      });

      // Verify symmetric key generation
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Verify message encryption with AES-GCM
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: mockIV },
        mockSymmetricKey,
        expect.any(Uint8Array)
      );

      // Verify key encryption with RSA-OAEP
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        { name: 'RSA-OAEP' },
        mockRecipientPublicKey,
        expect.any(ArrayBuffer)
      );
    });

    it('should decrypt a message successfully', async () => {
      const originalContent = 'Hello, this is a secret message!';
      const recipientAddress = '0x1234567890123456789012345678901234567890';
      const encryptedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      };
      
      const mockDecryptedKey = new ArrayBuffer(32);
      const mockDecryptedContent = new ArrayBuffer(64);
      
      // Mock getting key pair
      (encryptionService as any).keyPairs.set(recipientAddress, mockKeyPair);
      
      mockCrypto.subtle.decrypt
        .mockResolvedValueOnce(mockDecryptedKey) // key decryption
        .mockResolvedValueOnce(mockDecryptedContent); // message decryption
      mockCrypto.subtle.importKey.mockResolvedValue(mockSymmetricKey);
      
      // Mock TextDecoder
      const mockTextDecoder = {
        decode: jest.fn().mockReturnValue(originalContent),
      };
      (global.TextDecoder as jest.Mock).mockImplementation(() => mockTextDecoder);

      const decryptedContent = await encryptionService.decryptMessage(
        encryptedMessage,
        recipientAddress
      );

      expect(decryptedContent).toBe(originalContent);

      // Verify key decryption with RSA-OAEP
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        { name: 'RSA-OAEP' },
        mockKeyPair.privateKey,
        expect.any(ArrayBuffer)
      );

      // Verify message decryption with AES-GCM
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalledWith(
        { name: 'AES-GCM', iv: expect.any(Uint8Array) },
        mockSymmetricKey,
        expect.any(ArrayBuffer)
      );
    });

    it('should handle encryption errors', async () => {
      const content = 'Hello, this is a secret message!';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1234567890123456789012345678901234567890';
      
      mockCrypto.subtle.generateKey.mockRejectedValue(new Error('Encryption failed'));

      await expect(encryptionService.encryptMessage(
        content,
        recipientPublicKeyBase64,
        senderAddress
      )).rejects.toThrow('Message encryption failed');
    });

    it('should handle decryption errors', async () => {
      const recipientAddress = '0x1234567890123456789012345678901234567890';
      const encryptedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      };
      
      // Mock getting key pair
      (encryptionService as any).keyPairs.set(recipientAddress, mockKeyPair);
      mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

      await expect(encryptionService.decryptMessage(
        encryptedMessage,
        recipientAddress
      )).rejects.toThrow('Message decryption failed');
    });
  });

  describe('Message Integrity Verification', () => {
    it('should verify message integrity successfully', async () => {
      const originalContent = 'Hello, this is a secret message!';
      const recipientAddress = '0x1234567890123456789012345678901234567890';
      const encryptedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      };
      
      // Mock successful decryption that returns original content
      jest.spyOn(encryptionService, 'decryptMessage').mockResolvedValue(originalContent);

      const isValid = await encryptionService.verifyMessageIntegrity(
        originalContent,
        encryptedMessage,
        recipientAddress
      );

      expect(isValid).toBe(true);
      expect(encryptionService.decryptMessage).toHaveBeenCalledWith(
        encryptedMessage,
        recipientAddress
      );
    });

    it('should detect message integrity failure', async () => {
      const originalContent = 'Hello, this is a secret message!';
      const tamperedContent = 'Hello, this is a tampered message!';
      const recipientAddress = '0x1234567890123456789012345678901234567890';
      const encryptedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      };
      
      // Mock decryption that returns different content
      jest.spyOn(encryptionService, 'decryptMessage').mockResolvedValue(tamperedContent);

      const isValid = await encryptionService.verifyMessageIntegrity(
        originalContent,
        encryptedMessage,
        recipientAddress
      );

      expect(isValid).toBe(false);
    });

    it('should handle verification errors gracefully', async () => {
      const originalContent = 'Hello, this is a secret message!';
      const recipientAddress = '0x1234567890123456789012345678901234567890';
      const encryptedMessage: EncryptedMessage = {
        encryptedContent: [1, 2, 3, 4],
        encryptedKey: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      };
      
      // Mock decryption failure
      jest.spyOn(encryptionService, 'decryptMessage').mockRejectedValue(new Error('Decryption failed'));

      const isValid = await encryptionService.verifyMessageIntegrity(
        originalContent,
        encryptedMessage,
        recipientAddress
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Encryption Info Generation', () => {
    it('should generate encryption info with correct structure', () => {
      const conversationId = 'conv-123';
      const encryptionInfo = encryptionService.generateEncryptionInfo(conversationId);

      expect(encryptionInfo).toEqual({
        algorithm: 'RSA-OAEP + AES-GCM',
        keyId: expect.stringMatching(/^conv-123_\d+$/),
        version: 1,
        metadata: {
          rsaKeySize: 2048,
          aesKeySize: 256,
          ivSize: 12,
          createdAt: expect.any(String),
        },
      });

      // Verify timestamp format
      expect(new Date(encryptionInfo.metadata.createdAt)).toBeInstanceOf(Date);
    });
  });

  describe('Conversation Encryption Status', () => {
    it('should return encryption status for conversation', async () => {
      const conversationId = 'conv-123';
      const participants = ['0x1111', '0x2222', '0x3333'];
      
      // Mock stored public keys
      jest.spyOn(encryptionService, 'getStoredPublicKey')
        .mockResolvedValueOnce('publicKey1')
        .mockResolvedValueOnce(null) // Missing key for 0x2222
        .mockResolvedValueOnce('publicKey3');

      const status = await encryptionService.getConversationEncryptionStatus(
        conversationId,
        participants
      );

      expect(status).toEqual({
        isEncrypted: false,
        missingKeys: ['0x2222'],
        readyForEncryption: false,
      });
    });

    it('should return ready status when all keys are available', async () => {
      const conversationId = 'conv-123';
      const participants = ['0x1111', '0x2222'];
      
      // Mock all keys available
      jest.spyOn(encryptionService, 'getStoredPublicKey')
        .mockResolvedValueOnce('publicKey1')
        .mockResolvedValueOnce('publicKey2');

      const status = await encryptionService.getConversationEncryptionStatus(
        conversationId,
        participants
      );

      expect(status).toEqual({
        isEncrypted: true,
        missingKeys: [],
        readyForEncryption: true,
      });
    });
  });

  describe('Key Exchange', () => {
    it('should perform key exchange successfully', async () => {
      const currentUserAddress = '0x1111';
      const otherUserAddress = '0x2222';
      const mockPublicKey = 'mockPublicKeyBase64';
      
      jest.spyOn(encryptionService, 'exportPublicKey').mockResolvedValue(mockPublicKey);

      const result = await encryptionService.exchangeKeys(currentUserAddress, otherUserAddress);

      expect(result).toEqual({
        success: true,
        publicKey: mockPublicKey,
      });
    });

    it('should handle key exchange errors', async () => {
      const currentUserAddress = '0x1111';
      const otherUserAddress = '0x2222';
      
      jest.spyOn(encryptionService, 'exportPublicKey').mockRejectedValue(new Error('Export failed'));

      const result = await encryptionService.exchangeKeys(currentUserAddress, otherUserAddress);

      expect(result).toEqual({
        success: false,
      });
    });
  });

  describe('Key Rotation', () => {
    it('should rotate keys successfully', async () => {
      const userAddress = '0x1111';
      
      jest.spyOn(encryptionService, 'generateKeyPair').mockResolvedValue(mockKeyPair);

      const result = await encryptionService.rotateKeys(userAddress);

      expect(result).toBe(true);
      expect(encryptionService.generateKeyPair).toHaveBeenCalledWith(userAddress);
    });

    it('should handle key rotation errors', async () => {
      const userAddress = '0x1111';
      
      jest.spyOn(encryptionService, 'generateKeyPair').mockRejectedValue(new Error('Generation failed'));

      const result = await encryptionService.rotateKeys(userAddress);

      expect(result).toBe(false);
    });
  });

  describe('Key Backup and Restore', () => {
    it('should create encrypted backup', async () => {
      const userAddress = '0x1111';
      const passphrase = 'securePassphrase123';
      
      // Mock key pair retrieval
      (encryptionService as any).keyPairs.set(userAddress, mockKeyPair);
      
      // Mock key exports
      mockCrypto.subtle.exportKey
        .mockResolvedValueOnce(new ArrayBuffer(256)) // public key
        .mockResolvedValueOnce(new ArrayBuffer(512)); // private key
      
      // Mock encryption with passphrase
      jest.spyOn(encryptionService as any, 'encryptWithPassphrase').mockResolvedValue({
        encryptedData: [1, 2, 3, 4],
        salt: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      });

      const backup = await encryptionService.backupKeys(userAddress, passphrase);

      expect(typeof backup).toBe('string');
      expect(global.btoa).toHaveBeenCalled();
    });

    it('should restore keys from backup', async () => {
      const backupData = 'mockBackupData';
      const passphrase = 'securePassphrase123';
      
      // Mock backup decoding and decryption
      global.atob = jest.fn().mockReturnValue(JSON.stringify({
        encryptedData: [1, 2, 3, 4],
        salt: [5, 6, 7, 8],
        iv: [9, 10, 11, 12],
      }));
      
      jest.spyOn(encryptionService as any, 'decryptWithPassphrase').mockResolvedValue(JSON.stringify({
        userAddress: '0x1111',
        publicKey: [1, 2, 3],
        privateKey: [4, 5, 6],
        createdAt: new Date().toISOString(),
        version: 1,
      }));
      
      // Mock key imports
      mockCrypto.subtle.importKey
        .mockResolvedValueOnce(mockKeyPair.publicKey)
        .mockResolvedValueOnce(mockKeyPair.privateKey);

      const result = await encryptionService.restoreKeys(backupData, passphrase);

      expect(result).toBe(true);
    });

    it('should handle backup creation errors', async () => {
      const userAddress = '0x1111';
      const passphrase = 'securePassphrase123';
      
      jest.spyOn(encryptionService, 'getKeyPair').mockRejectedValue(new Error('Key not found'));

      await expect(encryptionService.backupKeys(userAddress, passphrase)).rejects.toThrow('Key backup failed');
    });

    it('should handle restore errors', async () => {
      const backupData = 'invalidBackupData';
      const passphrase = 'wrongPassphrase';
      
      global.atob = jest.fn().mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      const result = await encryptionService.restoreKeys(backupData, passphrase);

      expect(result).toBe(false);
    });
  });

  describe('Key Storage and Retrieval', () => {
    it('should store and retrieve public keys', async () => {
      const userAddress = '0x1111';
      const publicKeyBase64 = 'mockPublicKey';
      
      // Mock successful storage
      const mockPutRequest = { onsuccess: null, onerror: null };
      const mockGetRequest = { onsuccess: null, onerror: null, result: { publicKey: publicKeyBase64 } };
      
      const mockStore = {
        put: jest.fn().mockReturnValue(mockPutRequest),
        get: jest.fn().mockReturnValue(mockGetRequest),
      };
      
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      
      mockDB.transaction.mockReturnValue(mockTransaction);

      // Store public key
      await encryptionService.storePublicKey(userAddress, publicKeyBase64);
      
      // Simulate successful storage
      setTimeout(() => {
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess();
      }, 0);

      // Retrieve public key
      const retrievedKey = await encryptionService.getStoredPublicKey(userAddress);
      
      // Simulate successful retrieval
      setTimeout(() => {
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess();
      }, 0);

      expect(mockStore.put).toHaveBeenCalledWith({
        userAddress,
        publicKey: publicKeyBase64,
        createdAt: expect.any(Date),
      });
    });

    it('should clear all keys', async () => {
      const mockClearRequest = { onsuccess: null, onerror: null };
      
      const mockStore = {
        clear: jest.fn().mockReturnValue(mockClearRequest),
      };
      
      const mockTransaction = {
        objectStore: jest.fn().mockReturnValue(mockStore),
        complete: Promise.resolve(),
      };
      
      mockDB.transaction.mockReturnValue(mockTransaction);

      await encryptionService.clearAllKeys();

      expect(mockStore.clear).toHaveBeenCalledTimes(2); // keyPairs and publicKeys stores
    });
  });

  describe('Conversation Encryption Initialization', () => {
    it('should initialize conversation encryption successfully', async () => {
      const conversationId = 'conv-123';
      const participants = ['0x1111', '0x2222'];
      const currentUserAddress = '0x1111';
      
      jest.spyOn(encryptionService, 'getKeyPair').mockResolvedValue(mockKeyPair);
      jest.spyOn(encryptionService, 'getConversationEncryptionStatus').mockResolvedValue({
        isEncrypted: true,
        missingKeys: [],
        readyForEncryption: true,
      });

      const result = await encryptionService.initializeConversationEncryption(
        conversationId,
        participants,
        currentUserAddress
      );

      expect(result).toBe(true);
    });

    it('should fail initialization when keys are missing', async () => {
      const conversationId = 'conv-123';
      const participants = ['0x1111', '0x2222'];
      const currentUserAddress = '0x1111';
      
      jest.spyOn(encryptionService, 'getKeyPair').mockResolvedValue(mockKeyPair);
      jest.spyOn(encryptionService, 'getConversationEncryptionStatus').mockResolvedValue({
        isEncrypted: false,
        missingKeys: ['0x2222'],
        readyForEncryption: false,
      });

      const result = await encryptionService.initializeConversationEncryption(
        conversationId,
        participants,
        currentUserAddress
      );

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty content encryption', async () => {
      const content = '';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      mockCrypto.subtle.encrypt
        .mockResolvedValueOnce(new ArrayBuffer(0))
        .mockResolvedValueOnce(new ArrayBuffer(256));
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue({ type: 'public' } as CryptoKey);

      const encryptedMessage = await encryptionService.encryptMessage(
        content,
        recipientPublicKeyBase64,
        senderAddress
      );

      expect(encryptedMessage.encryptedContent).toEqual([]);
    });

    it('should handle invalid public key format', async () => {
      const invalidPublicKey = 'invalidBase64!@#$%';
      
      global.atob = jest.fn().mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      await expect(encryptionService.importPublicKey(invalidPublicKey)).rejects.toThrow('Public key import failed');
    });

    it('should handle database connection failures', async () => {
      const userAddress = '0x1111';
      
      mockIndexedDB.open.mockImplementation(() => ({
        onsuccess: null,
        onerror: () => new Error('Database connection failed'),
        onupgradeneeded: null,
      }));

      // Should not throw but handle gracefully
      const keyPair = await encryptionService.generateKeyPair(userAddress);
      expect(keyPair).toBeDefined();
    });

    it('should handle concurrent encryption operations', async () => {
      const content1 = 'Message 1';
      const content2 = 'Message 2';
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      // Setup mocks for concurrent operations
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      mockCrypto.subtle.encrypt
        .mockResolvedValue(new ArrayBuffer(64))
        .mockResolvedValue(new ArrayBuffer(256));
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue({ type: 'public' } as CryptoKey);

      const [encrypted1, encrypted2] = await Promise.all([
        encryptionService.encryptMessage(content1, recipientPublicKeyBase64, senderAddress),
        encryptionService.encryptMessage(content2, recipientPublicKeyBase64, senderAddress),
      ]);

      expect(encrypted1).toBeDefined();
      expect(encrypted2).toBeDefined();
      expect(encrypted1.iv).not.toEqual(encrypted2.iv); // Should have different IVs
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large message encryption', async () => {
      const largeContent = 'A'.repeat(1024 * 1024); // 1MB message
      const recipientPublicKeyBase64 = 'mockRecipientPublicKey';
      const senderAddress = '0x1111';
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockSymmetricKey);
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
      mockCrypto.subtle.encrypt
        .mockResolvedValueOnce(new ArrayBuffer(1024 * 1024))
        .mockResolvedValueOnce(new ArrayBuffer(256));
      mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
      mockCrypto.subtle.importKey.mockResolvedValue({ type: 'public' } as CryptoKey);

      const encryptedMessage = await encryptionService.encryptMessage(
        largeContent,
        recipientPublicKeyBase64,
        senderAddress
      );

      expect(encryptedMessage).toBeDefined();
      expect(encryptedMessage.encryptedContent.length).toBe(1024 * 1024);
    });

    it('should manage memory efficiently with multiple key pairs', async () => {
      const userAddresses = Array.from({ length: 100 }, (_, i) => `0x${i.toString().padStart(40, '0')}`);
      
      mockCrypto.subtle.generateKey.mockResolvedValue(mockKeyPair);
      mockCrypto.subtle.exportKey
        .mockResolvedValue(new ArrayBuffer(256))
        .mockResolvedValue(new ArrayBuffer(512));

      // Generate multiple key pairs
      const keyPairs = await Promise.all(
        userAddresses.map(address => encryptionService.generateKeyPair(address))
      );

      expect(keyPairs).toHaveLength(100);
      expect((encryptionService as any).keyPairs.size).toBe(100);
    });
  });
});