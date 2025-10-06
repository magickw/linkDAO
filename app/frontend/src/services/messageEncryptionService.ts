import { EncryptedMessage, MessageEncryptionInfo } from '../types/messaging';

export class MessageEncryptionService {
  private static instance: MessageEncryptionService;
  private keyPairs: Map<string, CryptoKeyPair> = new Map();
  private symmetricKeys: Map<string, CryptoKey> = new Map();

  private constructor() {}

  public static getInstance(): MessageEncryptionService {
    if (!MessageEncryptionService.instance) {
      MessageEncryptionService.instance = new MessageEncryptionService();
    }
    return MessageEncryptionService.instance;
  }

  /**
   * Generate a new RSA key pair for a user
   */
  async generateKeyPair(userAddress: string): Promise<CryptoKeyPair> {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      this.keyPairs.set(userAddress, keyPair);
      
      // Store key pair in IndexedDB for persistence
      await this.storeKeyPair(userAddress, keyPair);
      
      return keyPair;
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Key pair generation failed');
    }
  }

  /**
   * Get or generate key pair for a user
   */
  async getKeyPair(userAddress: string): Promise<CryptoKeyPair> {
    // Check memory cache first
    if (this.keyPairs.has(userAddress)) {
      return this.keyPairs.get(userAddress)!;
    }

    // Try to load from IndexedDB
    const storedKeyPair = await this.loadKeyPair(userAddress);
    if (storedKeyPair) {
      this.keyPairs.set(userAddress, storedKeyPair);
      return storedKeyPair;
    }

    // Generate new key pair if none exists
    return await this.generateKeyPair(userAddress);
  }

  /**
   * Export public key for sharing with other users
   */
  async exportPublicKey(userAddress: string): Promise<string> {
    try {
      const keyPair = await this.getKeyPair(userAddress);
      const exportedKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      
      // Convert to base64 for easy transmission
      const keyArray = new Uint8Array(exportedKey);
      return btoa(String.fromCharCode(...keyArray));
    } catch (error) {
      console.error('Failed to export public key:', error);
      throw new Error('Public key export failed');
    }
  }

  /**
   * Import public key from another user
   */
  async importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    try {
      // Convert from base64
      const keyData = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false, // not extractable
        ['encrypt']
      );

      return publicKey;
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw new Error('Public key import failed');
    }
  }

  /**
   * Encrypt a message for a specific recipient
   */
  async encryptMessage(
    content: string,
    recipientPublicKeyBase64: string,
    senderAddress: string
  ): Promise<EncryptedMessage> {
    try {
      // Generate symmetric key for this message
      const symmetricKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Generate IV for AES-GCM
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt message content with symmetric key
      const encodedContent = new TextEncoder().encode(content);
      const encryptedContent = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        symmetricKey,
        encodedContent
      );

      // Export symmetric key
      const exportedSymmetricKey = await crypto.subtle.exportKey('raw', symmetricKey);

      // Import recipient's public key
      const recipientPublicKey = await this.importPublicKey(recipientPublicKeyBase64);

      // Encrypt symmetric key with recipient's public key
      const encryptedKey = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        recipientPublicKey,
        exportedSymmetricKey
      );

      return {
        encryptedContent: Array.from(new Uint8Array(encryptedContent)),
        encryptedKey: Array.from(new Uint8Array(encryptedKey)),
        iv: Array.from(iv),
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw new Error('Message encryption failed');
    }
  }

  /**
   * Decrypt a message
   */
  async decryptMessage(
    encryptedMessage: EncryptedMessage,
    recipientAddress: string
  ): Promise<string> {
    try {
      // Get recipient's key pair
      const keyPair = await this.getKeyPair(recipientAddress);

      // Decrypt symmetric key with private key
      const encryptedKeyBuffer = new Uint8Array(encryptedMessage.encryptedKey).buffer;
      const symmetricKeyBuffer = await crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        keyPair.privateKey,
        encryptedKeyBuffer
      );

      // Import symmetric key
      const symmetricKey = await crypto.subtle.importKey(
        'raw',
        symmetricKeyBuffer,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Decrypt message content
      const encryptedContentBuffer = new Uint8Array(encryptedMessage.encryptedContent).buffer;
      const iv = new Uint8Array(encryptedMessage.iv);
      
      const decryptedContent = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        symmetricKey,
        encryptedContentBuffer
      );

      // Convert back to string
      return new TextDecoder().decode(decryptedContent);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Generate encryption info for a message
   */
  generateEncryptionInfo(conversationId: string): MessageEncryptionInfo {
    return {
      algorithm: 'RSA-OAEP + AES-GCM',
      keyId: `${conversationId}_${Date.now()}`,
      version: 1,
      metadata: {
        rsaKeySize: 2048,
        aesKeySize: 256,
        ivSize: 12,
        createdAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Verify message integrity
   */
  async verifyMessageIntegrity(
    originalContent: string,
    encryptedMessage: EncryptedMessage,
    recipientAddress: string
  ): Promise<boolean> {
    try {
      const decryptedContent = await this.decryptMessage(encryptedMessage, recipientAddress);
      return originalContent === decryptedContent;
    } catch (error) {
      console.error('Message integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Store key pair in IndexedDB
   */
  private async storeKeyPair(userAddress: string, keyPair: CryptoKeyPair): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['keyPairs'], 'readwrite');
      const store = transaction.objectStore('keyPairs');

      // Export keys for storage
      const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

      await store.put({
        userAddress,
        publicKey: Array.from(new Uint8Array(publicKey)),
        privateKey: Array.from(new Uint8Array(privateKey)),
        createdAt: new Date(),
      });

      await transaction.complete;
    } catch (error) {
      console.error('Failed to store key pair:', error);
    }
  }

  /**
   * Load key pair from IndexedDB
   */
  private async loadKeyPair(userAddress: string): Promise<CryptoKeyPair | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['keyPairs'], 'readonly');
      const store = transaction.objectStore('keyPairs');
      
      const result = await store.get(userAddress);
      if (!result) return null;

      // Import keys from storage
      const publicKeyBuffer = new Uint8Array(result.publicKey).buffer;
      const privateKeyBuffer = new Uint8Array(result.privateKey).buffer;

      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      );

      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      );

      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to load key pair:', error);
      return null;
    }
  }

  /**
   * Open IndexedDB database
   */
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MessageEncryption', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('keyPairs')) {
          const keyPairStore = db.createObjectStore('keyPairs', { keyPath: 'userAddress' });
          keyPairStore.createIndex('createdAt', 'createdAt');
        }

        if (!db.objectStoreNames.contains('publicKeys')) {
          const publicKeyStore = db.createObjectStore('publicKeys', { keyPath: 'userAddress' });
          publicKeyStore.createIndex('createdAt', 'createdAt');
        }
      };
    });
  }

  /**
   * Store public key of another user
   */
  async storePublicKey(userAddress: string, publicKeyBase64: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['publicKeys'], 'readwrite');
      const store = transaction.objectStore('publicKeys');

      await store.put({
        userAddress,
        publicKey: publicKeyBase64,
        createdAt: new Date(),
      });

      await transaction.complete;
    } catch (error) {
      console.error('Failed to store public key:', error);
    }
  }

  /**
   * Get stored public key of another user
   */
  async getStoredPublicKey(userAddress: string): Promise<string | null> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction(['publicKeys'], 'readonly');
      const store = transaction.objectStore('publicKeys');
      
      const result = await store.get(userAddress);
      return result ? result.publicKey : null;
    } catch (error) {
      console.error('Failed to get stored public key:', error);
      return null;
    }
  }

  /**
   * Clear all stored keys (for logout/reset)
   */
  async clearAllKeys(): Promise<void> {
    try {
      this.keyPairs.clear();
      this.symmetricKeys.clear();

      const db = await this.openDatabase();
      const transaction = db.transaction(['keyPairs', 'publicKeys'], 'readwrite');
      
      await transaction.objectStore('keyPairs').clear();
      await transaction.objectStore('publicKeys').clear();
      
      await transaction.complete;
    } catch (error) {
      console.error('Failed to clear keys:', error);
    }
  }

  /**
   * Get encryption status for a conversation
   */
  async getConversationEncryptionStatus(conversationId: string, participants: string[]): Promise<{
    isEncrypted: boolean;
    missingKeys: string[];
    readyForEncryption: boolean;
  }> {
    const missingKeys: string[] = [];
    
    for (const participant of participants) {
      const publicKey = await this.getStoredPublicKey(participant);
      if (!publicKey) {
        missingKeys.push(participant);
      }
    }

    return {
      isEncrypted: missingKeys.length === 0,
      missingKeys,
      readyForEncryption: missingKeys.length === 0,
    };
  }

  /**
   * Initialize encryption for a new conversation
   */
  async initializeConversationEncryption(
    conversationId: string,
    participants: string[],
    currentUserAddress: string
  ): Promise<boolean> {
    try {
      // Ensure current user has a key pair
      await this.getKeyPair(currentUserAddress);

      // Check if we have public keys for all participants
      const status = await this.getConversationEncryptionStatus(conversationId, participants);
      
      if (!status.readyForEncryption) {
        console.warn('Cannot initialize encryption: missing public keys for', status.missingKeys);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize conversation encryption:', error);
      return false;
    }
  }

  /**
   * Exchange keys with a new participant
   */
  async exchangeKeys(
    currentUserAddress: string,
    otherUserAddress: string
  ): Promise<{ success: boolean; publicKey?: string }> {
    try {
      // Get current user's public key
      const publicKey = await this.exportPublicKey(currentUserAddress);
      
      // In a real implementation, this would involve:
      // 1. Sending public key to the other user via secure channel
      // 2. Receiving their public key
      // 3. Verifying key authenticity (possibly via blockchain signatures)
      
      // For now, we'll simulate successful key exchange
      return {
        success: true,
        publicKey,
      };
    } catch (error) {
      console.error('Key exchange failed:', error);
      return { success: false };
    }
  }

  /**
   * Rotate keys for enhanced security
   */
  async rotateKeys(userAddress: string): Promise<boolean> {
    try {
      // Generate new key pair
      const newKeyPair = await this.generateKeyPair(userAddress);
      
      // In a real implementation, you would:
      // 1. Notify all conversation participants of the key change
      // 2. Re-encrypt recent messages with new keys
      // 3. Update key exchange records
      
      console.log('Keys rotated successfully for', userAddress);
      return true;
    } catch (error) {
      console.error('Key rotation failed:', error);
      return false;
    }
  }

  /**
   * Backup encrypted keys (for recovery)
   */
  async backupKeys(userAddress: string, passphrase: string): Promise<string> {
    try {
      const keyPair = await this.getKeyPair(userAddress);
      
      // Export keys
      const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);
      const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
      
      // Create backup object
      const backup = {
        userAddress,
        publicKey: Array.from(new Uint8Array(publicKey)),
        privateKey: Array.from(new Uint8Array(privateKey)),
        createdAt: new Date().toISOString(),
        version: 1,
      };
      
      // Encrypt backup with passphrase
      const backupString = JSON.stringify(backup);
      const encryptedBackup = await this.encryptWithPassphrase(backupString, passphrase);
      
      return btoa(JSON.stringify(encryptedBackup));
    } catch (error) {
      console.error('Key backup failed:', error);
      throw new Error('Key backup failed');
    }
  }

  /**
   * Restore keys from backup
   */
  async restoreKeys(backupData: string, passphrase: string): Promise<boolean> {
    try {
      // Decode backup
      const encryptedBackup = JSON.parse(atob(backupData));
      
      // Decrypt backup
      const backupString = await this.decryptWithPassphrase(encryptedBackup, passphrase);
      const backup = JSON.parse(backupString);
      
      // Import keys
      const publicKeyBuffer = new Uint8Array(backup.publicKey).buffer;
      const privateKeyBuffer = new Uint8Array(backup.privateKey).buffer;
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
      );
      
      const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
      );
      
      const keyPair = { publicKey, privateKey };
      
      // Store restored keys
      this.keyPairs.set(backup.userAddress, keyPair);
      await this.storeKeyPair(backup.userAddress, keyPair);
      
      return true;
    } catch (error) {
      console.error('Key restoration failed:', error);
      return false;
    }
  }

  /**
   * Encrypt data with passphrase (for backups)
   */
  private async encryptWithPassphrase(data: string, passphrase: string): Promise<any> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from passphrase
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Encrypt data
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );
    
    return {
      encryptedData: Array.from(new Uint8Array(encryptedData)),
      salt: Array.from(salt),
      iv: Array.from(iv),
    };
  }

  /**
   * Decrypt data with passphrase (for backups)
   */
  private async decryptWithPassphrase(encryptedObj: any, passphrase: string): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const salt = new Uint8Array(encryptedObj.salt);
    const iv = new Uint8Array(encryptedObj.iv);
    const encryptedData = new Uint8Array(encryptedObj.encryptedData);
    
    // Derive key from passphrase
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    return decoder.decode(decryptedData);
  }
}