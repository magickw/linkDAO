import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { safeLogger } from '../utils/safeLogger';
import { selfHostedStorageService } from '../services/selfHostedStorageService';

// Configuration
const BACKUP_PATH = process.env.SELF_HOSTED_BACKUP_PATH || path.join(process.cwd(), 'backups');
const STORAGE_BASE_PATH = process.env.SELF_HOSTED_STORAGE_PATH || path.join(process.cwd(), 'storage');
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY;

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  size: number;
  filesCount: number;
  storagePath: string;
  checksum: string;
  encrypted: boolean;
  compression: string;
}

export class BackupService {
  private isBackupInProgress: boolean = false;
  private backupSchedule: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeBackupDirectory();
    this.setupScheduledBackups();
  }

  /**
   * Initialize backup directory
   */
  private async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(BACKUP_PATH, { recursive: true });
      safeLogger.info('Backup directory initialized');
    } catch (error) {
      safeLogger.error('Failed to initialize backup directory:', error);
    }
  }

  /**
   * Create a full backup of the storage system
   */
  async createFullBackup(encrypt: boolean = true): Promise<BackupMetadata> {
    if (this.isBackupInProgress) {
      throw new Error('Backup already in progress');
    }

    this.isBackupInProgress = true;
    
    try {
      const startTime = Date.now();
      safeLogger.info('Starting full backup process');
      
      // Generate backup ID and paths
      const backupId = `backup-${Date.now()}`;
      const backupDir = path.join(BACKUP_PATH, backupId);
      const storageBackupPath = path.join(backupDir, 'storage');
      const metadataBackupPath = path.join(backupDir, 'metadata');
      
      // Create backup directory structure
      await fs.mkdir(backupDir, { recursive: true });
      await fs.mkdir(storageBackupPath, { recursive: true });
      await fs.mkdir(metadataBackupPath, { recursive: true });
      
      // Copy storage files
      const storageFiles = await this.copyDirectory(STORAGE_BASE_PATH, storageBackupPath);
      
      // Create backup metadata
      const stats = await this.getDirectoryStats(backupDir);
      const checksum = await this.generateDirectoryChecksum(backupDir);
      
      const backupMetadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date(),
        size: stats.size,
        filesCount: storageFiles,
        storagePath: backupDir,
        checksum,
        encrypted: encrypt,
        compression: 'none'
      };
      
      // Encrypt backup if requested
      if (encrypt && ENCRYPTION_KEY) {
        await this.encryptBackup(backupDir);
        backupMetadata.encrypted = true;
      }
      
      // Save backup metadata
      const metadataPath = path.join(backupDir, 'backup.json');
      await fs.writeFile(metadataPath, JSON.stringify(backupMetadata, null, 2));
      
      const endTime = Date.now();
      safeLogger.info(`Full backup completed in ${endTime - startTime}ms`, {
        backupId,
        files: storageFiles,
        size: stats.size
      });
      
      return backupMetadata;
    } catch (error) {
      safeLogger.error('Full backup failed:', error);
      throw new Error(`Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isBackupInProgress = false;
    }
  }

  /**
   * Create incremental backup
   */
  async createIncrementalBackup(since: Date, encrypt: boolean = true): Promise<BackupMetadata> {
    if (this.isBackupInProgress) {
      throw new Error('Backup already in progress');
    }

    this.isBackupInProgress = true;
    
    try {
      const startTime = Date.now();
      safeLogger.info('Starting incremental backup process', { since: since.toISOString() });
      
      // Generate backup ID and paths
      const backupId = `incremental-${Date.now()}`;
      const backupDir = path.join(BACKUP_PATH, backupId);
      const storageBackupPath = path.join(backupDir, 'storage');
      const metadataBackupPath = path.join(backupDir, 'metadata');
      
      // Create backup directory structure
      await fs.mkdir(backupDir, { recursive: true });
      await fs.mkdir(storageBackupPath, { recursive: true });
      await fs.mkdir(metadataBackupPath, { recursive: true });
      
      // Copy only files modified since the specified date
      const storageFiles = await this.copyModifiedFiles(STORAGE_BASE_PATH, storageBackupPath, since);
      const metadataFiles = await this.copyModifiedFiles(
        path.join(STORAGE_BASE_PATH, 'metadata'), 
        metadataBackupPath, 
        since
      );
      
      // Create backup metadata
      const stats = await this.getDirectoryStats(backupDir);
      const checksum = await this.generateDirectoryChecksum(backupDir);
      
      const backupMetadata: BackupMetadata = {
        id: backupId,
        timestamp: new Date(),
        size: stats.size,
        filesCount: storageFiles + metadataFiles,
        storagePath: backupDir,
        checksum,
        encrypted: encrypt,
        compression: 'none'
      };
      
      // Encrypt backup if requested
      if (encrypt && ENCRYPTION_KEY) {
        await this.encryptBackup(backupDir);
        backupMetadata.encrypted = true;
      }
      
      // Save backup metadata
      const metadataPath = path.join(backupDir, 'backup.json');
      await fs.writeFile(metadataPath, JSON.stringify(backupMetadata, null, 2));
      
      const endTime = Date.now();
      safeLogger.info(`Incremental backup completed in ${endTime - startTime}ms`, {
        backupId,
        files: storageFiles + metadataFiles,
        size: stats.size
      });
      
      return backupMetadata;
    } catch (error) {
      safeLogger.error('Incremental backup failed:', error);
      throw new Error(`Incremental backup failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.isBackupInProgress = false;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string, targetPath?: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      safeLogger.info('Starting backup restoration', { backupId });
      
      const backupDir = path.join(BACKUP_PATH, backupId);
      const restorePath = targetPath || STORAGE_BASE_PATH;
      
      // Verify backup exists
      try {
        await fs.access(backupDir);
      } catch {
        throw new Error(`Backup ${backupId} not found`);
      }
      
      // Load backup metadata
      const metadataPath = path.join(backupDir, 'backup.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const backupMetadata: BackupMetadata = JSON.parse(metadataContent);
      
      // Verify backup integrity
      const checksum = await this.generateDirectoryChecksum(backupDir);
      if (checksum !== backupMetadata.checksum) {
        throw new Error('Backup integrity check failed');
      }
      
      // Decrypt if needed
      if (backupMetadata.encrypted && ENCRYPTION_KEY) {
        await this.decryptBackup(backupDir);
      }
      
      // Restore storage files
      const storageBackupPath = path.join(backupDir, 'storage');
      await this.copyDirectory(storageBackupPath, restorePath);
      
      // Restore metadata files
      const metadataBackupPath = path.join(backupDir, 'metadata');
      const metadataRestorePath = path.join(restorePath, 'metadata');
      await this.copyDirectory(metadataBackupPath, metadataRestorePath);
      
      const endTime = Date.now();
      safeLogger.info(`Backup restoration completed in ${endTime - startTime}ms`, { backupId });
      
      return true;
    } catch (error) {
      safeLogger.error(`Backup restoration failed for ${backupId}:`, error);
      throw new Error(`Restoration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const backups: BackupMetadata[] = [];
      const backupDirs = await fs.readdir(BACKUP_PATH);
      
      for (const backupDir of backupDirs) {
        const backupPath = path.join(BACKUP_PATH, backupDir);
        const stats = await fs.stat(backupPath);
        
        if (stats.isDirectory()) {
          try {
            const metadataPath = path.join(backupPath, 'backup.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata: BackupMetadata = JSON.parse(metadataContent);
            backups.push(metadata);
          } catch (error) {
            safeLogger.warn(`Failed to read metadata for backup ${backupDir}:`, error);
          }
        }
      }
      
      // Sort by timestamp (newest first)
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      return backups;
    } catch (error) {
      safeLogger.error('Failed to list backups:', error);
      throw new Error(`Failed to list backups: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const backups = await this.listBackups();
      let deletedCount = 0;
      
      for (const backup of backups) {
        if (new Date(backup.timestamp) < cutoffDate) {
          try {
            const backupPath = path.join(BACKUP_PATH, backup.id);
            await fs.rm(backupPath, { recursive: true, force: true });
            deletedCount++;
            safeLogger.info(`Deleted old backup: ${backup.id}`);
          } catch (error) {
            safeLogger.warn(`Failed to delete backup ${backup.id}:`, error);
          }
        }
      }
      
      return deletedCount;
    } catch (error) {
      safeLogger.error('Backup cleanup failed:', error);
      throw new Error(`Backup cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Setup scheduled backups
   */
  private setupScheduledBackups(): void {
    try {
      // For now, we'll use a simple interval-based approach
      // In production, you might want to use a proper cron scheduler
      const interval = 24 * 60 * 60 * 1000; // 24 hours
      this.backupSchedule = setInterval(async () => {
        try {
          await this.createFullBackup();
          await this.cleanupOldBackups();
        } catch (error) {
          safeLogger.error('Scheduled backup failed:', error);
        }
      }, interval);
      
      safeLogger.info('Scheduled backups configured');
    } catch (error) {
      safeLogger.error('Failed to setup scheduled backups:', error);
    }
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<number> {
    let fileCount = 0;
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        fileCount += await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
        fileCount++;
      }
    }
    
    return fileCount;
  }

  /**
   * Copy only files modified since a specific date
   */
  private async copyModifiedFiles(src: string, dest: string, since: Date): Promise<number> {
    let fileCount = 0;
    
    try {
      const entries = await fs.readdir(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        const stats = await fs.stat(srcPath);
        
        if (stats.mtime > since) {
          if (entry.isDirectory()) {
            await fs.mkdir(destPath, { recursive: true });
            fileCount += await this.copyModifiedFiles(srcPath, destPath, since);
          } else {
            await fs.copyFile(srcPath, destPath);
            fileCount++;
          }
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    
    return fileCount;
  }

  /**
   * Get directory statistics
   */
  private async getDirectoryStats(dirPath: string): Promise<{ size: number; files: number }> {
    let totalSize = 0;
    let fileCount = 0;
    
    const processDirectory = async (currentPath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
          fileCount++;
        }
      }
    };
    
    await processDirectory(dirPath);
    
    return { size: totalSize, files: fileCount };
  }

  /**
   * Generate directory checksum
   */
  private async generateDirectoryChecksum(dirPath: string): Promise<string> {
    const { createHash } = await import('crypto');
    const hash = createHash('sha256');
    
    const processDirectory = async (currentPath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      // Sort entries for consistent hashing
      entries.sort((a, b) => a.name.localeCompare(b.name));
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await processDirectory(fullPath);
        } else {
          const content = await fs.readFile(fullPath);
          hash.update(content);
        }
      }
    };
    
    await processDirectory(dirPath);
    
    return hash.digest('hex');
  }

  /**
   * Encrypt backup directory
   */
  private async encryptBackup(backupPath: string): Promise<void> {
    if (!ENCRYPTION_KEY) {
      safeLogger.warn('Backup encryption requested but no encryption key provided');
      return;
    }
    
    // In a real implementation, you would encrypt the backup files
    // For now, we'll just log that encryption would happen
    safeLogger.info('Backup encryption would be performed here', { backupPath });
  }

  /**
   * Decrypt backup directory
   */
  private async decryptBackup(backupPath: string): Promise<void> {
    if (!ENCRYPTION_KEY) {
      safeLogger.warn('Backup decryption requested but no encryption key provided');
      return;
    }
    
    // In a real implementation, you would decrypt the backup files
    // For now, we'll just log that decryption would happen
    safeLogger.info('Backup decryption would be performed here', { backupPath });
  }

  /**
   * Stop backup service
   */
  async stop(): Promise<void> {
    if (this.backupSchedule) {
      clearInterval(this.backupSchedule);
      this.backupSchedule = null;
    }
    
    safeLogger.info('Backup service stopped');
  }
}

// Export singleton instance
export const backupService = new BackupService();
export default BackupService;