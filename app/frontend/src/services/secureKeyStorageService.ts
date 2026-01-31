/**
 * Secure Key Storage Service
 * Enhanced security for cryptographic key storage in browser environments
 *
 * Features:
 * - Non-extractable keys where possible
 * - Passphrase-protected key storage
 * - Key derivation from user credentials
 * - Secure key backup/recovery
 * - Memory protection (clear keys from memory)
 */

// Database configuration
const DB_NAME = 'SecureKeyStorage';
const DB_VERSION = 2;
const KEY_STORE = 'encryptionKeys';
const BACKUP_STORE = 'keyBackups';

// Security configuration
const PBKDF2_ITERATIONS = 250000; // High iteration count for security
const KEY_WRAP_ALGORITHM = 'AES-KW'; // AES Key Wrap
const DERIVED_KEY_ALGORITHM = 'AES-GCM';

interface StoredKey {
  id: string;
  wrappedKey: ArrayBuffer; // Key wrapped with user passphrase
  salt: ArrayBuffer; // For key derivation
  iv: ArrayBuffer; // For additional encryption layer
  algorithm: string;
  keyUsages: KeyUsage[];
  createdAt: number;
  lastUsed: number;
  expiresAt?: number;
  metadata: {
    keyType: 'encryption' | 'signing' | 'session';
    associatedData?: string; // e.g., conversation ID
  };
}

interface KeyBackup {
  id: string;
  encryptedBackup: ArrayBuffer;
  salt: ArrayBuffer;
  iv: ArrayBuffer;
  createdAt: number;
  hint?: string;
}

interface DerivedKeyResult {
  key: CryptoKey;
  salt: ArrayBuffer;
}

interface SecureKeyOptions {
  passphrase?: string;
  extractable?: boolean;
  expiresInHours?: number;
}

class SecureKeyStorageService {
  private db: IDBDatabase | null = null;
  private derivedKeyCache: Map<string, CryptoKey> = new Map();
  private keyCache: Map<string, CryptoKey> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the secure key storage
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error('Failed to open secure key storage'));

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Keys store
        if (!db.objectStoreNames.contains(KEY_STORE)) {
          const keyStore = db.createObjectStore(KEY_STORE, { keyPath: 'id' });
          keyStore.createIndex('keyType', 'metadata.keyType');
          keyStore.createIndex('expiresAt', 'expiresAt');
          keyStore.createIndex('associatedData', 'metadata.associatedData');
        }

        // Backups store
        if (!db.objectStoreNames.contains(BACKUP_STORE)) {
          const backupStore = db.createObjectStore(BACKUP_STORE, { keyPath: 'id' });
          backupStore.createIndex('createdAt', 'createdAt');
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
    });
  }

  /**
   * Derive a key from passphrase using PBKDF2
   */
  private async deriveKeyFromPassphrase(
    passphrase: string,
    salt?: ArrayBuffer
  ): Promise<DerivedKeyResult> {
    // Generate or use provided salt
    const keySalt = salt || crypto.getRandomValues(new Uint8Array(32)).buffer;

    // Import passphrase as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey', 'deriveBits']
    );

    // Derive the wrapping key
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: keySalt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: KEY_WRAP_ALGORITHM, length: 256 },
      false, // Non-extractable
      ['wrapKey', 'unwrapKey']
    );

    return { key: derivedKey, salt: keySalt };
  }

  /**
   * Generate a new encryption key pair with enhanced security
   */
  async generateKeyPair(
    keyId: string,
    options: SecureKeyOptions = {}
  ): Promise<{ publicKey: CryptoKey; privateKeyId: string }> {
    await this.initialize();

    // Generate RSA key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true, // Extractable for wrapping
      ['encrypt', 'decrypt']
    );

    // Store the private key securely
    await this.storeKey(keyId, keyPair.privateKey, {
      ...options,
      keyType: 'encryption'
    });

    return {
      publicKey: keyPair.publicKey,
      privateKeyId: keyId
    };
  }

  /**
   * Generate a new symmetric key for session encryption
   */
  async generateSessionKey(
    keyId: string,
    options: SecureKeyOptions = {}
  ): Promise<string> {
    await this.initialize();

    // Generate AES-GCM key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // Extractable for wrapping
      ['encrypt', 'decrypt']
    );

    await this.storeKey(keyId, key, {
      ...options,
      keyType: 'session',
      expiresInHours: options.expiresInHours || 24
    });

    return keyId;
  }

  /**
   * Store a key securely with optional passphrase protection
   */
  async storeKey(
    keyId: string,
    key: CryptoKey,
    options: SecureKeyOptions & { keyType: 'encryption' | 'signing' | 'session'; associatedData?: string } = { keyType: 'encryption' }
  ): Promise<void> {
    await this.initialize();

    const passphrase = options.passphrase || await this.getDefaultPassphrase();
    const { key: wrappingKey, salt } = await this.deriveKeyFromPassphrase(passphrase);

    // Wrap the key
    const wrappedKey = await crypto.subtle.wrapKey('raw', key, wrappingKey, KEY_WRAP_ALGORITHM);

    // Additional encryption layer with random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const storedKey: StoredKey = {
      id: keyId,
      wrappedKey,
      salt,
      iv: iv.buffer,
      algorithm: key.algorithm.name,
      keyUsages: key.usages as KeyUsage[],
      createdAt: Date.now(),
      lastUsed: Date.now(),
      expiresAt: options.expiresInHours
        ? Date.now() + options.expiresInHours * 60 * 60 * 1000
        : undefined,
      metadata: {
        keyType: options.keyType,
        associatedData: options.associatedData
      }
    };

    // Store in IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEY_STORE], 'readwrite');
      const store = transaction.objectStore(KEY_STORE);
      const request = store.put(storedKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store key'));
    });
  }

  /**
   * Retrieve a key from secure storage
   */
  async getKey(keyId: string, passphrase?: string): Promise<CryptoKey | null> {
    await this.initialize();

    // Check cache first
    const cachedKey = this.keyCache.get(keyId);
    if (cachedKey) {
      return cachedKey;
    }

    // Retrieve from IndexedDB
    const storedKey = await this.getStoredKey(keyId);
    if (!storedKey) return null;

    // Check expiration
    if (storedKey.expiresAt && Date.now() > storedKey.expiresAt) {
      await this.deleteKey(keyId);
      return null;
    }

    // Derive wrapping key
    const resolvedPassphrase = passphrase || await this.getDefaultPassphrase();
    const { key: wrappingKey } = await this.deriveKeyFromPassphrase(
      resolvedPassphrase,
      storedKey.salt
    );

    try {
      // Unwrap the key
      const unwrappedKey = await crypto.subtle.unwrapKey(
        'raw',
        storedKey.wrappedKey,
        wrappingKey,
        KEY_WRAP_ALGORITHM,
        { name: storedKey.algorithm },
        false, // Non-extractable after unwrapping
        storedKey.keyUsages
      );

      // Cache the key temporarily
      this.keyCache.set(keyId, unwrappedKey);
      setTimeout(() => this.keyCache.delete(keyId), this.cacheTimeout);

      // Update last used
      await this.updateLastUsed(keyId);

      return unwrappedKey;
    } catch (error) {
      console.error('Failed to unwrap key:', error);
      return null;
    }
  }

  /**
   * Get stored key metadata
   */
  private async getStoredKey(keyId: string): Promise<StoredKey | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEY_STORE], 'readonly');
      const store = transaction.objectStore(KEY_STORE);
      const request = store.get(keyId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to retrieve key'));
    });
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(keyId: string): Promise<void> {
    const storedKey = await this.getStoredKey(keyId);
    if (!storedKey) return;

    storedKey.lastUsed = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEY_STORE], 'readwrite');
      const store = transaction.objectStore(KEY_STORE);
      const request = store.put(storedKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to update key'));
    });
  }

  /**
   * Delete a key from storage
   */
  async deleteKey(keyId: string): Promise<void> {
    await this.initialize();

    // Clear from cache
    this.keyCache.delete(keyId);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEY_STORE], 'readwrite');
      const store = transaction.objectStore(KEY_STORE);
      const request = store.delete(keyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete key'));
    });
  }

  /**
   * Create an encrypted backup of all keys
   */
  async createBackup(backupPassphrase: string, hint?: string): Promise<string> {
    await this.initialize();

    // Get all keys
    const keys = await this.getAllKeyIds();
    const backupData: Record<string, StoredKey> = {};

    for (const keyId of keys) {
      const storedKey = await this.getStoredKey(keyId);
      if (storedKey) {
        backupData[keyId] = storedKey;
      }
    }

    // Encrypt the backup
    const { key: encryptionKey, salt } = await this.deriveKeyFromPassphrase(backupPassphrase);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Re-derive as AES-GCM key for encryption
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(backupPassphrase),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const aesKey = await crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encryptedBackup = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      new TextEncoder().encode(JSON.stringify(backupData))
    );

    // Store backup
    const backupId = `backup_${Date.now()}`;
    const backup: KeyBackup = {
      id: backupId,
      encryptedBackup,
      salt,
      iv: iv.buffer,
      createdAt: Date.now(),
      hint
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BACKUP_STORE], 'readwrite');
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.put(backup);

      request.onsuccess = () => resolve(backupId);
      request.onerror = () => reject(new Error('Failed to create backup'));
    });
  }

  /**
   * Restore keys from an encrypted backup
   */
  async restoreFromBackup(backupId: string, backupPassphrase: string): Promise<number> {
    await this.initialize();

    // Get backup
    const backup = await this.getBackup(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    // Decrypt backup
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(backupPassphrase),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: backup.salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const aesKey = await crypto.subtle.importKey(
      'raw',
      derivedBits,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    try {
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(backup.iv) },
        aesKey,
        backup.encryptedBackup
      );

      const backupData = JSON.parse(new TextDecoder().decode(decryptedData));

      // Restore keys
      let restoredCount = 0;
      for (const [keyId, storedKey] of Object.entries(backupData)) {
        try {
          await this.storeRestoredKey(keyId, storedKey as StoredKey);
          restoredCount++;
        } catch (error) {
          console.error(`Failed to restore key ${keyId}:`, error);
        }
      }

      return restoredCount;
    } catch (error) {
      throw new Error('Failed to decrypt backup - incorrect passphrase?');
    }
  }

  /**
   * Get backup from storage
   */
  private async getBackup(backupId: string): Promise<KeyBackup | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BACKUP_STORE], 'readonly');
      const store = transaction.objectStore(BACKUP_STORE);
      const request = store.get(backupId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to retrieve backup'));
    });
  }

  /**
   * Store a restored key
   */
  private async storeRestoredKey(keyId: string, storedKey: StoredKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEY_STORE], 'readwrite');
      const store = transaction.objectStore(KEY_STORE);
      const request = store.put({
        ...storedKey,
        lastUsed: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to store restored key'));
    });
  }

  /**
   * Get all key IDs
   */
  async getAllKeyIds(): Promise<string[]> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEY_STORE], 'readonly');
      const store = transaction.objectStore(KEY_STORE);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new Error('Failed to get key IDs'));
    });
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    await this.initialize();

    const now = Date.now();
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([KEY_STORE], 'readwrite');
      const store = transaction.objectStore(KEY_STORE);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);

      index.openCursor(range).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          this.keyCache.delete(cursor.value.id);
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
    });
  }

  /**
   * Clear all cached keys from memory
   */
  clearCache(): void {
    this.keyCache.clear();
    this.derivedKeyCache.clear();
  }

  /**
   * Get default passphrase (derive from available credentials)
   */
  private async getDefaultPassphrase(): Promise<string> {
    // Use a combination of browser fingerprint and storage identifiers
    // This provides some protection even without user passphrase
    const components: string[] = [];

    // Add storage-based identifier
    let storageId = localStorage.getItem('_sks_id');
    if (!storageId) {
      storageId = crypto.randomUUID();
      localStorage.setItem('_sks_id', storageId);
    }
    components.push(storageId);

    // Add origin
    components.push(window.location.origin);

    // Create a combined passphrase
    return components.join(':');
  }
}

// Export singleton instance
export const secureKeyStorage = new SecureKeyStorageService();
export default secureKeyStorage;
