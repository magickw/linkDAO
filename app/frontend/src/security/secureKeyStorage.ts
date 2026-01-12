/**
 * Secure Key Storage System
 * Provides encrypted storage for private keys and sensitive wallet data
 */

import { encrypt, decrypt } from '@/utils/cryptoUtils';

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
      const existing = await this.getWallet(address);
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

      // Store in localStorage
      const storageKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}`;
      localStorage.setItem(storageKey, JSON.stringify(walletData));

      // Store metadata separately
      if (metadata) {
        const metadataKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}_metadata`;
        localStorage.setItem(metadataKey, JSON.stringify(metadata));
      }

      // Set as active wallet
      this.setActiveWallet(address);
    } catch (error) {
      console.error('Failed to store wallet:', error);
      throw new Error('Failed to store wallet securely');
    }
  }

  /**
   * Retrieve and decrypt a wallet's private key (and optionally mnemonic)
   */
  static async getWallet(
    address: string,
    password?: string
  ): Promise<{ privateKey?: string; mnemonic?: string; metadata?: WalletMetadata }> {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}`;
      const encryptedData = localStorage.getItem(storageKey);

      if (!encryptedData) {
        return {};
      }

      const walletData: EncryptedWalletData = JSON.parse(encryptedData);

      // Update last accessed time
      walletData.lastAccessed = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(walletData));

      let privateKey: string | undefined;
      let mnemonic: string | undefined;

      // Only decrypt if password is provided
      if (password) {
        try {
          privateKey = await decrypt(
            walletData.encryptedPrivateKey,
            password,
            walletData.iv,
            walletData.salt
          );
        } catch (error) {
          throw new Error('Invalid password');
        }

        // Decrypt mnemonic if stored
        if (walletData.encryptedMnemonic) {
          try {
            mnemonic = await decrypt(
              walletData.encryptedMnemonic,
              password,
              walletData.iv,
              walletData.salt
            );
          } catch (error) {
            // If mnemonic decryption fails, continue without it
            console.warn('Failed to decrypt mnemonic:', error);
          }
        }
      }

      // Get metadata
      const metadataKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}_metadata`;
      const metadataData = localStorage.getItem(metadataKey);
      const metadata = metadataData ? JSON.parse(metadataData) : undefined;

      return { privateKey, mnemonic, metadata };
    } catch (error) {
      console.error('Failed to get wallet:', error);
      throw error;
    }
  }

  /**
   * Delete a wallet from storage
   */
  static async deleteWallet(address: string): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}`;
      const metadataKey = `${this.STORAGE_PREFIX}${address.toLowerCase()}_metadata`;

      localStorage.removeItem(storageKey);
      localStorage.removeItem(metadataKey);

      // Clear active wallet if this was the active one
      const activeWallet = this.getActiveWallet();
      if (activeWallet === address.toLowerCase()) {
        localStorage.removeItem(this.ACTIVE_WALLET_KEY);
      }
    } catch (error) {
      console.error('Failed to delete wallet:', error);
      throw new Error('Failed to delete wallet');
    }
  }

  /**
   * List all stored wallets
   */
  static listWallets(): string[] {
    const wallets: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_PREFIX) && !key.includes('_metadata')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.address) {
            wallets.push(data.address);
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    return wallets;
  }

  /**
   * Set the active wallet
   */
  static setActiveWallet(address: string): void {
    localStorage.setItem(this.ACTIVE_WALLET_KEY, address.toLowerCase());
  }

  /**
   * Get the active wallet address
   */
  static getActiveWallet(): string | null {
    return localStorage.getItem(this.ACTIVE_WALLET_KEY);
  }

  /**
   * Clear the active wallet
   */
  static clearActiveWallet(): void {
    localStorage.removeItem(this.ACTIVE_WALLET_KEY);
  }

  /**
   * Verify wallet password
   */
  static async verifyPassword(address: string, password: string): Promise<boolean> {
    try {
      const { privateKey } = await this.getWallet(address, password);
      return !!privateKey;
    } catch {
      return false;
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
      // Get current private key with old password
      const { privateKey, metadata } = await this.getWallet(address, oldPassword);

      if (!privateKey) {
        throw new Error('Invalid old password');
      }

      // Delete old wallet data
      await this.deleteWallet(address);

      // Store with new password
      await this.storeWallet(address, privateKey, newPassword, metadata);
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
      const { privateKey, metadata } = await this.getWallet(address, password);

      if (!privateKey) {
        throw new Error('Invalid password');
      }

      const exportData = {
        version: this.ENCRYPTION_VERSION,
        address,
        privateKey,
        metadata,
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
      const decryptedData = await decrypt(
        importPackage.encrypted,
        password,
        importPackage.iv,
        importPackage.salt
      );

      const importData = JSON.parse(decryptedData);

      // Store the imported wallet
      await this.storeWallet(
        importData.address,
        importData.privateKey,
        password,
        importData.metadata
      );

      return importData.address;
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