/**
 * Backup and Recovery Service
 * Handles encrypted wallet backups and recovery
 */

import { encryptMnemonic, decryptMnemonic } from '@/utils/bip39Utils';
import { SecureKeyStorage } from '@/security/secureKeyStorage';
import { validateMnemonic, deriveAddressFromMnemonic } from '@/utils/bip39Utils';

export interface BackupData {
  id: string;
  name: string;
  mnemonicEncrypted: string;
  salt: string;
  iv: string;
  address: string;
  createdAt: string;
  lastAccessed?: string;
  description?: string;
  tags?: string[];
}

export interface BackupMetadata {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  lastAccessed?: string;
  description?: string;
  tags?: string[];
  size: number;
}

export interface RecoveryResult {
  success: boolean;
  address?: string;
  error?: string;
  warnings?: string[];
}

export class BackupRecoveryService {
  private static instance: BackupRecoveryService;
  private readonly BACKUP_STORAGE_KEY = 'linkdao_wallet_backups';

  private constructor() {}

  static getInstance(): BackupRecoveryService {
    if (!BackupRecoveryService.instance) {
      BackupRecoveryService.instance = new BackupRecoveryService();
    }
    return BackupRecoveryService.instance;
  }

  /**
   * Create an encrypted backup of a wallet
   */
  async createBackup(
    address: string,
    password: string,
    options?: {
      name?: string;
      description?: string;
      tags?: string[];
    }
  ): Promise<{
    success: boolean;
    backupId?: string;
    error?: string;
  }> {
    try {
      // Get wallet data
      const walletData = await SecureKeyStorage.getWallet(address, password);
      if (!walletData) {
        return {
          success: false,
          error: 'Wallet not found or invalid password',
        };
      }

      // Get mnemonic (in production, this would be stored separately)
      // For now, we'll use the private key to derive the mnemonic
      // In a real implementation, the mnemonic should be stored securely
      const mnemonic = await this.getMnemonicFromStorage(address, password);
      if (!mnemonic) {
        return {
          success: success: false,
          error: 'Mnemonic not found in storage',
        };
      }

      // Encrypt mnemonic
      const encryptedData = await encryptMnemonic(mnemonic, password);

      // Create backup metadata
      const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const backup: BackupData = {
        id: backupId,
        name: options?.name || `Backup ${new Date().toLocaleDateString()}`,
        mnemonicEncrypted: encryptedData.encrypted,
        salt: encryptedData.salt,
        iv: encryptedData.iv,
        address,
        createdAt: new Date().toISOString(),
        description: options?.description,
        tags: options?.tags || [],
      };

      // Store backup
      const backups = this.getBackups();
      backups.push(backup);
      this.saveBackups(backups);

      return {
        success: true,
        backupId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create backup',
      };
    }
  }

  /**
   * List all backups (metadata only)
   */
  listBackups(): BackupMetadata[] {
    try {
      const backups = this.getBackups();
      return backups.map((backup) => ({
        id: backup.id,
        name: backup.name,
        address: backup.address,
        createdAt: backup.createdAt,
        lastAccessed: backup.lastAccessed,
        description: backup.description,
        tags: backup.tags,
        size: backup.mnemonicEncrypted.length,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get backup details
   */
  getBackupDetails(backupId: string): BackupData | null {
    try {
      const backups = this.getBackups();
      return backups.find((b) => b.id === backupId) || null;
    } catch {
      return null;
    }
  }

  /**
   * Delete a backup
   */
  deleteBackup(backupId: string): { success: boolean; error?: string } {
    try {
      const backups = this.getBackups();
      const filtered = backups.filter((b) => b.id !== backupId);
      
      if (backups.length === filtered.length) {
        return {
          success: false,
          error: 'Backup not found',
        };
      }

      this.saveBackups(filtered);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete backup',
      };
    }
  }

  /**
   * Restore wallet from backup
   */
  async restoreFromBackup(
    backupId: string,
    password: string,
    newPassword?: string
  ): Promise<RecoveryResult> {
    const warnings: string[] = [];

    try {
      // Get backup data
      const backup = this.getBackupDetails(backupId);
      if (!backup) {
        return {
          success: false,
          error: 'Backup not found',
        };
      }

      // Decrypt mnemonic
      const mnemonic = await decryptMnemonic(
        backup.mnemonicEncrypted,
        backup.salt,
        backup.iv,
        password
      );

      // Validate mnemonic
      if (!validateMnemonic(mnemonic)) {
        return {
          success: false,
          error: 'Invalid mnemonic in backup',
        };
      }

      // Derive address from mnemonic
      const derivedAddress = deriveAddressFromMnemonic(mnemonic);
      
      // Verify address matches
      if (derivedAddress.toLowerCase() !== backup.address.toLowerCase()) {
        warnings.push('Derived address does not match backup address');
      }

      // Store wallet with new password if provided
      const storagePassword = newPassword || password;
      const privateKey = await this.getPrivateKeyFromMnemonic(mnemonic);
      
      await SecureKeyStorage.storeWallet(
        derivedAddress,
        privateKey,
        storagePassword,
        {
          name: `Restored: ${backup.name}`,
          isHardwareWallet: false,
          chainIds: [1, 8453, 137, 42161],
        }
      );

      // Update last accessed time
      const backups = this.getBackups();
      const backupIndex = backups.findIndex((b) => b.id === backupId);
      if (backupIndex !== -1) {
        backups[backupIndex].lastAccessed = new Date().toISOString();
        this.saveBackups(backups);
      }

      return {
        success: true,
        address: derivedAddress,
        warnings,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to restore from backup',
      };
    }
  }

  /**
   * Export backup as JSON file
   */
  exportBackupAsFile(backupId: string): {
    success: boolean;
    fileUrl?: string;
    error?: string;
  } {
    try {
      const backup = this.getBackupDetails(backupId);
      if (!backup) {
        return {
          success: false,
          error: 'Backup not found',
        };
      }

      // Create file content
      const fileContent = JSON.stringify(backup, null, 2);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const fileUrl = URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `linkdao_backup_${backupId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileUrl);

      return {
        success: true,
        fileUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to export backup',
      };
    }
  }

  /**
   * Import backup from JSON file
   */
  async importBackupFromFile(file: File): Promise<{
    success: boolean;
    backupId?: string;
    error?: string;
  }> {
    try {
      const text = await file.text();
      const backupData = JSON.parse(text) as BackupData;

      // Validate backup structure
      if (!backupData.id || !backupData.mnemonicEncrypted || !backupData.salt || !backupData.iv) {
        return {
          success: false,
          error: 'Invalid backup file format',
        };
      }

      // Check if backup already exists
      const backups = this.getBackups();
      if (backups.some((b) => b.id === backupData.id)) {
        // Generate new ID for duplicate
        backupData.id = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Add to backups
      backups.push(backupData);
      this.saveBackups(backups);

      return {
        success: true,
        backupId: backupData.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to import backup',
      };
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: string, password: string): Promise<{
    success: boolean;
    valid: boolean;
    error?: string;
  }> {
    try {
      const backup = this.getBackupDetails(backupId);
      if (!backup) {
        return {
          success: false,
          valid: false,
          error: 'Backup not found',
        };
      }

      // Try to decrypt mnemonic
      const mnemonic = await decryptMnemonic(
        backup.mnemonicEncrypted,
        backup.salt,
        backup.iv,
        password
      );

      // Validate mnemonic
      const isValidMnemonic = validateMnemonic(mnemonic);

      // Derive and verify address
      const derivedAddress = deriveAddressFromMnemonic(mnemonic);
      const addressMatches = derivedAddress.toLowerCase() === backup.address.toLowerCase();

      return {
        success: true,
        valid: isValidMnemonic && addressMatches,
      };
    } catch (error: any) {
      return {
        success: false,
        valid: false,
        error: error.message || 'Failed to verify backup',
      };
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup?: string;
    newestBackup?: string;
    backupsByTag: Record<string, number>;
  } {
    try {
      const backups = this.getBackups();
      
      if (backups.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
          backupsByTag: {},
        };
      }

      const totalSize = backups.reduce((sum, b) => sum + b.mnemonicEncrypted.length, 0);
      const sortedByDate = [...backups].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const backupsByTag: Record<string, number> = {};
      backups.forEach((backup) => {
        backup.tags?.forEach((tag) => {
          backupsByTag[tag] = (backupsByTag[tag] || 0) + 1;
        });
      });

      return {
        totalBackups: backups.length,
        totalSize,
        oldestBackup: sortedByDate[0].createdAt,
        newestBackup: sortedByDate[sortedByDate.length - 1].createdAt,
        backupsByTag,
      };
    } catch {
      return {
        totalBackups: 0,
        totalSize: 0,
        backupsByTag: {},
      };
    }
  }

  /**
   * Search backups by name or tags
   */
  searchBackups(query: string): BackupMetadata[] {
    try {
      const backups = this.listBackups();
      const lowerQuery = query.toLowerCase();

      return backups.filter((backup) =>
        backup.name.toLowerCase().includes(lowerQuery) ||
        backup.description?.toLowerCase().includes(lowerQuery) ||
        backup.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    } catch {
      return [];
    }
  }

  // Private helper methods

  private getBackups(): BackupData[] {
    try {
      const stored = localStorage.getItem(this.BACKUP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveBackups(backups: BackupData[]): void {
    try {
      localStorage.setItem(this.BACKUP_STORAGE_KEY, JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to save backups:', error);
    }
  }

  private async getMnemonicFromStorage(
    address: string,
    password: string
  ): Promise<string | null> {
    // In production, the mnemonic should be stored separately from the private key
    // For now, we'll return null as it should be stored during wallet creation
    // This is a placeholder for the actual implementation
    return null;
  }

  private async getPrivateKeyFromMnemonic(mnemonic: string): Promise<string> {
    // In production, use proper BIP-39 derivation
    const { derivePrivateKeyFromMnemonic } = await import('@/utils/bip39Utils');
    return derivePrivateKeyFromMnemonic(mnemonic);
  }
}

// Export singleton instance
export const backupRecoveryService = BackupRecoveryService.getInstance();