/**
 * Secure Key Storage System
 * Provides encrypted storage for private keys and sensitive wallet data
 */

import { encrypt, decrypt } from './cryptoUtils';
import { wipeString, wipeUint8Array, stringToSecureBuffer, secureBufferToString } from './secureMemory';
import { getStorage, getSecureStorage } from './storage';

export interface EncryptedWalletData {
  address: string;
  encryptedPrivateKey: string;
  encryptedMnemonic?: string; // Optional: for recovery purposes
  iv: string;
  salt: string;
  createdAt: number;
  lastAccessed: number;
}

export interface WalletMetadata {
  name: string;
  description?: string;
  isHardwareWallet: boolean;
  chainIds: number[];
}

interface DecryptedWallet {
  privateKey: string;
  mnemonic?: string;
  metadata?: WalletMetadata;
}

export class SecureKeyStorage {
  private static readonly STORAGE_PREFIX = 'linkdao_wallet_';
  private static readonly ACTIVE_WALLET_KEY = 'linkdao_active_wallet';
  private static readonly ENCRYPTION_VERSION = 1;

  /**
   * Encrypt and store a wallet's private key (and optionally mnemonic)
   */
  static async storeWallet(
    address: string,
    privateKey: string,
    password: string,
    metadata?: Partial<WalletMetadata>,
    mnemonic?: string
  ): Promise<void> {
    try {
      // Check if wallet already exists
      const existing = await this._getEncryptedWalletData(address);
      if (existing) {
        throw new Error('Wallet already exists');
      }

      // Encrypt the private key
      const { encrypted, iv, salt } = await encrypt(privateKey, password);

      // Create wallet data
      const walletData: EncryptedWalletData = {
        address: address.toLowerCase(),
        encryptedPrivateKey: encrypted,
        iv,
        salt,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };

      // Encrypt and store mnemonic if provided (for recovery)
      if (mnemonic) {
        const { encrypted: encryptedMnemonic } = await encrypt(mnemonic, password);
        walletData.encryptedMnemonic = encryptedMnemonic;
      }

      // Store in secure storage
      const storageKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}`;
      await getSecureStorage().setItem(storageKey, JSON.stringify(walletData));

      // Store metadata separately in regular storage
      if (metadata) {
        const metadataKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}_metadata`;
        await getStorage().setItem(metadataKey, JSON.stringify(metadata));
      }

      // Set as active wallet
      await this.setActiveWallet(address);
    } catch (error) {
      console.error('Failed to store wallet:', error);
      throw new Error('Failed to store wallet securely');
    }
  }

  /**
   * Securely executes a callback with the decrypted wallet data, ensuring memory is wiped afterwards.
   * This is the recommended way to access sensitive wallet data.
   */
  static async withDecryptedWallet<T>(
    address: string,
    password: string,
    callback: (wallet: DecryptedWallet) => Promise<T>
  ): Promise<T> {
    const walletData = await this._getEncryptedWalletData(address);
    if (!walletData) {
      throw new Error('Wallet not found');
    }

    let privateKey: string | undefined;
    let mnemonic: string | undefined;

    try {
      // Decrypt private key
      privateKey = await decrypt(
        walletData.encryptedPrivateKey,
        password,
        walletData.iv,
        walletData.salt
      );

      // Decrypt mnemonic if it exists
      if (walletData.encryptedMnemonic) {
        try {
          mnemonic = await decrypt(
            walletData.encryptedMnemonic,
            password,
            walletData.iv,
            walletData.salt
          );
        } catch (e) {
          console.warn('Failed to decrypt mnemonic, continuing without it.');
        }
      }

      const metadata = await this._getWalletMetadata(address);

      // Execute the callback with the decrypted data
      return await callback({ privateKey, mnemonic, metadata });

    } catch (error) {
      // Re-throw decryption errors as invalid password
      throw new Error('Invalid password');
    } finally {
      // SECURELY WIPE SENSITIVE DATA FROM MEMORY
      if (privateKey) {
        const buffer = stringToSecureBuffer(privateKey);
        wipeUint8Array(buffer);
      }
      if (mnemonic) {
        const buffer = stringToSecureBuffer(mnemonic);
        wipeUint8Array(buffer);
      }
    }
  }

  /**
   * Retrieve and decrypt a wallet's private key (and optionally mnemonic)
   * @deprecated Use `withDecryptedWallet` for better in-memory security.
   */
  static async getWallet(
    address: string,
    password?: string
  ): Promise<{ privateKey?: string; mnemonic?: string; metadata?: WalletMetadata }> {
    const walletData = await this._getEncryptedWalletData(address);
    if (!walletData) {
      return {};
    }

    // Only decrypt if password is provided
    if (password) {
      return this.withDecryptedWallet(address, password, async (decryptedWallet) => {
        return {
          privateKey: decryptedWallet.privateKey,
          mnemonic: decryptedWallet.mnemonic,
          metadata: decryptedWallet.metadata,
        };
      });
    }

    return { metadata: await this._getWalletMetadata(address) };
  }

  /**
   * Fetches the raw encrypted wallet data from storage.
   * @private
   */
  private static async _getEncryptedWalletData(address: string): Promise<EncryptedWalletData | null> {
    const storageKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}`;
    const encryptedData = await getSecureStorage().getItem(storageKey);

    if (!encryptedData) {
      return null;
    }

    const walletData: EncryptedWalletData = JSON.parse(encryptedData);

    // Update last accessed time
    walletData.lastAccessed = Date.now();
    await getSecureStorage().setItem(storageKey, JSON.stringify(walletData));

    return walletData;
  }

  /**
   * Fetches the wallet metadata from storage.
   * @private
   */
  private static async _getWalletMetadata(address: string): Promise<WalletMetadata | undefined> {
    const metadataKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}_metadata`;
    const metadataData = await getStorage().getItem(metadataKey);
    return metadataData ? JSON.parse(metadataData) : undefined;
  }

  /**
   * Get wallet metadata (public accessor)
   */
  static async getWalletMetadata(address: string): Promise<WalletMetadata | undefined> {
    return this._getWalletMetadata(address);
  }


  /**
   * Delete a wallet from storage
   */
  static async deleteWallet(address: string): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}`;
      const metadataKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}_metadata`;

      await getSecureStorage().removeItem(storageKey);
      await getStorage().removeItem(metadataKey);

      // Clear active wallet if this was the active one
      const activeWallet = await this.getActiveWallet();
      if (activeWallet === address.toLowerCase()) {
        await getStorage().removeItem(this.ACTIVE_WALLET_KEY);
      }
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      throw new Error('Failed to delete wallet');
    }
  }

  /**
   * List all stored wallets
   */
  static async listWallets(): Promise<string[]> {
    // This is more complex with AsyncStorage/SecureStore as they don't easily allow listing by prefix
    // We should probably maintain an index of wallet addresses
    const indexKey = `${this.STORAGE_PREFIX}index`;
    const indexData = await getStorage().getItem(indexKey);
    return indexData ? JSON.parse(indexData) : [];
  }

  /**
   * Set the active wallet
   */
  static async setActiveWallet(address: string): Promise<void> {
    await getStorage().setItem(this.ACTIVE_WALLET_KEY, address.toLowerCase());
    
    // Also update index if not already there
    const indexKey = `${this.STORAGE_PREFIX}index`;
    const indexData = await getStorage().getItem(indexKey);
    const index: string[] = indexData ? JSON.parse(indexData) : [];
    if (!index.includes(address.toLowerCase())) {
      index.push(address.toLowerCase());
      await getStorage().setItem(indexKey, JSON.stringify(index));
    }
  }

  /**
   * Get the active wallet address
   */
  static async getActiveWallet(): Promise<string | null> {
    return await getStorage().getItem(this.ACTIVE_WALLET_KEY);
  }

  /**
   * Clear the active wallet
   */
  static async clearActiveWallet(): Promise<void> {
    await getStorage().removeItem(this.ACTIVE_WALLET_KEY);
  }

  /**
   * Verify wallet password
   */
  static async verifyPassword(address: string, password: string): Promise<boolean> {
    try {
      return await this.withDecryptedWallet(address, password, async (wallet) => !!wallet.privateKey);
    } catch (error: any) {
      return false;
    }
  }
}

  /**
   * Change wallet password
   */
  static async changePassword(
    address: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const { privateKey, metadata, mnemonic } = await this.withDecryptedWallet(address, oldPassword, async (wallet) => {
        // Clone data needed for re-encryption, as it will be wiped after this callback
        return { privateKey: wallet.privateKey, metadata: wallet.metadata, mnemonic: wallet.mnemonic };
      });

      if (!privateKey) {
        throw new Error('Invalid old password');
      }

      // Delete old wallet data
      await this.deleteWallet(address);

      // Store with new password
      await this.storeWallet(address, privateKey, newPassword, metadata, mnemonic);

    } catch (error) {
      console.error('Failed to change password:', error);
      throw new Error('Failed to change password');
    }
  }

  /**
   * Export wallet data (for backup) - encrypted
   */
  static async exportWallet(address: string, password: string): Promise<string> {
    try {
      return await this.withDecryptedWallet(address, password, async (wallet) => {
        if (!wallet.privateKey) {
          throw new Error('Invalid password');
        }

        const exportData = {
          version: this.ENCRYPTION_VERSION,
          address,
          privateKey: wallet.privateKey, // This will be wiped after the callback
          metadata: wallet.metadata,
          exportedAt: Date.now(),
        };

        // Encrypt the export data with the wallet password
        const { encrypt } = await import('@/utils/cryptoUtils');
        const { encrypted, iv, salt } = await encrypt(JSON.stringify(exportData), password);

        // Return encrypted data with metadata needed for decryption
        const exportPackage = {
          version: this.ENCRYPTION_VERSION,
          encrypted,
          iv,
          salt,
          exportedAt: Date.now(),
        };

        return btoa(JSON.stringify(exportPackage));
      });
    } catch (error) {
      console.error('Failed to export wallet:', error);
      throw new Error('Failed to export wallet');
    }
  }

  /**
   * Import wallet data (from backup) - decrypt first
   */
  static async importWallet(
    encryptedData: string,
    password: string
  ): Promise<string> {
    try {
      const importPackage = JSON.parse(atob(encryptedData));

      if (importPackage.version !== this.ENCRYPTION_VERSION) {
        throw new Error('Incompatible wallet version');
      }

      // Decrypt the export package
      const { decrypt } = await import('@/utils/cryptoUtils');
      let decryptedDataJson: string | undefined;
      let importData: any;

      try {
        decryptedDataJson = await decrypt(
          importPackage.encrypted,
          password,
          importPackage.iv,
          importPackage.salt
        );
        importData = JSON.parse(decryptedDataJson);

        // Store the imported wallet
        await this.storeWallet(
          importData.address,
          importData.privateKey,
          password,
          importData.metadata
        );

        return importData.address;
      } finally {
        // Wipe decrypted data
        if (decryptedDataJson) wipeString(decryptedDataJson);
        if (importData && importData.privateKey) wipeString(importData.privateKey);
      }

    } catch (error) {
      console.error('Failed to import wallet:', error);
      throw new Error('Failed to import wallet');
    }
  }

  /**
   * Clear all wallet data (for testing/reset)
   */
  static clearAll(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_PREFIX) || key === this.ACTIVE_WALLET_KEY) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}