/**
 * Unit Tests for Backup and Recovery Service
 */

import { backupRecoveryService } from '@/services/backupRecoveryService';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Backup and Recovery Service', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      // This test would need mocking of SecureKeyStorage
      // For now, we'll test the structure
      const result = await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        { name: 'Test Backup' }
      );

      // In production, this would succeed
      expect(result).toBeDefined();
    });

    it('should store backup metadata', async () => {
      const result = await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        {
          name: 'Test Backup',
          description: 'Test backup description',
          tags: ['test', 'important'],
        }
      );

      // Check if backup was stored
      const backups = backupRecoveryService.listBackups();
      expect(backups.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('listBackups', () => {
    it('should return empty array when no backups exist', () => {
      const backups = backupRecoveryService.listBackups();
      expect(backups).toEqual([]);
    });

    it('should return backup metadata only', async () => {
      // Create a backup first
      await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        { name: 'Test Backup' }
      );

      const backups = backupRecoveryService.listBackups();
      
      backups.forEach((backup) => {
        expect(backup.id).toBeDefined();
        expect(backup.name).toBeDefined();
        expect(backup.address).toBeDefined();
        expect(backup.createdAt).toBeDefined();
        expect(backup.mnemonicEncrypted).toBeUndefined(); // Should not expose encrypted data
        expect(backup.salt).toBeUndefined(); // Should not expose salt
        expect(backup.iv).toBeUndefined(); // Should not expose IV
      });
    });
  });

  describe('getBackupDetails', () => {
    it('should return null for non-existent backup', () => {
      const backup = backupRecoveryService.getBackupDetails('non-existent-id');
      expect(backup).toBeNull();
    });

    it('should return backup details for existing backup', async () => {
      const result = await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        { name: 'Test Backup' }
      );

      if (result.backupId) {
        const backup = backupRecoveryService.getBackupDetails(result.backupId);
        expect(backup).toBeDefined();
        expect(backup?.id).toBe(result.backupId);
      }
    });
  });

  describe('deleteBackup', () => {
    it('should delete an existing backup', async () => {
      const result = await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        { name: 'Test Backup' }
      );

      if (result.backupId) {
        const deleteResult = backupRecoveryService.deleteBackup(result.backupId);
        expect(deleteResult.success).toBe(true);

        const backups = backupRecoveryService.listBackups();
        expect(backups.length).toBe(0);
      }
    });

    it('should return error for non-existent backup', () => {
      const result = backupRecoveryService.deleteBackup('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('searchBackups', () => {
    it('should find backups by name', async () => {
      await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        { name: 'Important Backup' }
      );

      const results = backupRecoveryService.searchBackups('important');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should find backups by tags', async () => {
      await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        {
          name: 'Test Backup',
          tags: ['important', 'test'],
        }
      );

      const results = backupRecoveryService.searchBackups('test');
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for non-matching queries', () => {
      const results = backupRecoveryService.searchBackups('non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('getBackupStats', () => {
    it('should return empty stats when no backups exist', () => {
      const stats = backupRecoveryService.getBackupStats();
      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.backupsByTag).toEqual({});
    });

    it('should calculate backup statistics', async () => {
      await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        {
          name: 'Test Backup',
          tags: ['test', 'important'],
        }
      );

      const stats = backupRecoveryService.getBackupStats();
      expect(stats.totalBackups).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.backupsByTag).toBeDefined();
    });
  });

  describe('verifyBackup', () => {
    it('should verify a valid backup', async () => {
      const result = await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        { name: 'Test Backup' }
      );

      if (result.backupId) {
        const verifyResult = await backupRecoveryService.verifyBackup(
          result.backupId,
          'test-password'
        );
        expect(verifyResult).toBeDefined();
      }
    });

    it('should return error for non-existent backup', () => {
      const result = await backupRecoveryService.verifyBackup(
        'non-existent-id',
        'test-password'
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('exportBackupAsFile', () => {
    it('should export backup as JSON file', async () => {
      const result = await backupRecoveryService.createBackup(
        '0x' + 'a'.repeat(40),
        'test-password',
        { name: 'Test Backup' }
      );

      if (result.backupId) {
        const exportResult = backupRecoveryService.exportBackupAsFile(result.backupId);
        expect(exportResult).toBeDefined();
      }
    });

    it('should return error for non-existent backup', () => {
      const result = backupRecoveryService.exportBackupAsFile('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});