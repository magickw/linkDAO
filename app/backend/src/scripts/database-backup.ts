import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import dotenv from "dotenv";
import { writeFile, readFile, mkdir } from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const execAsync = promisify(exec);

interface BackupOptions {
  includeData: boolean;
  schemaOnly: boolean;
  outputDir: string;
  compress: boolean;
}

interface BackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
  timestamp: string;
  size?: number;
}

class DatabaseBackupManager {
  private connectionString: string;
  private client: postgres.Sql;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.client = postgres(connectionString, { prepare: false });
  }

  async close() {
    await this.client.end();
  }

  private parseConnectionString(url: string) {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: urlObj.port || '5432',
      database: urlObj.pathname.slice(1),
      username: urlObj.username,
      password: urlObj.password
    };
  }

  async createBackup(options: BackupOptions): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result: BackupResult = {
      success: false,
      timestamp
    };

    try {
      // Ensure backup directory exists
      await mkdir(options.outputDir, { recursive: true });

      const dbConfig = this.parseConnectionString(this.connectionString);
      const backupFileName = `marketplace-backup-${timestamp}.sql`;
      const backupPath = path.join(options.outputDir, backupFileName);

      // Build pg_dump command
      let pgDumpCmd = `pg_dump`;
      
      // Connection parameters
      pgDumpCmd += ` --host=${dbConfig.host}`;
      pgDumpCmd += ` --port=${dbConfig.port}`;
      pgDumpCmd += ` --username=${dbConfig.username}`;
      pgDumpCmd += ` --dbname=${dbConfig.database}`;
      pgDumpCmd += ` --no-password`; // Use PGPASSWORD env var
      
      // Backup options
      if (options.schemaOnly) {
        pgDumpCmd += ` --schema-only`;
      } else if (!options.includeData) {
        pgDumpCmd += ` --data-only`;
      }
      
      pgDumpCmd += ` --verbose`;
      pgDumpCmd += ` --file=${backupPath}`;

      // Set password environment variable
      const env = { 
        ...process.env, 
        PGPASSWORD: dbConfig.password 
      };

      safeLogger.info(`🔄 Creating database backup...`);
      safeLogger.info(`📁 Output: ${backupPath}`);

      // Execute pg_dump
      const { stdout, stderr } = await execAsync(pgDumpCmd, { env });
      
      if (stderr && !stderr.includes('NOTICE')) {
        safeLogger.warn('⚠ pg_dump warnings:', stderr);
      }

      // Verify backup file was created
      const stats = await this.getFileStats(backupPath);
      if (!stats) {
        throw new Error('Backup file was not created');
      }

      result.success = true;
      result.backupPath = backupPath;
      result.size = stats.size;

      safeLogger.info(`✅ Backup created successfully`);
      safeLogger.info(`📊 Size: ${this.formatBytes(stats.size)}`);

      // Compress if requested
      if (options.compress) {
        const compressedPath = await this.compressBackup(backupPath);
        result.backupPath = compressedPath;
      }

    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      safeLogger.error('❌ Backup failed:', error);
    }

    return result;
  }

  async restoreBackup(backupPath: string): Promise<BackupResult> {
    const timestamp = new Date().toISOString();
    const result: BackupResult = {
      success: false,
      timestamp
    };

    try {
      const dbConfig = this.parseConnectionString(this.connectionString);

      // Build psql restore command
      let psqlCmd = `psql`;
      psqlCmd += ` --host=${dbConfig.host}`;
      psqlCmd += ` --port=${dbConfig.port}`;
      psqlCmd += ` --username=${dbConfig.username}`;
      psqlCmd += ` --dbname=${dbConfig.database}`;
      psqlCmd += ` --no-password`;
      psqlCmd += ` --file=${backupPath}`;

      const env = { 
        ...process.env, 
        PGPASSWORD: dbConfig.password 
      };

      safeLogger.info(`🔄 Restoring database from backup...`);
      safeLogger.info(`📁 Source: ${backupPath}`);

      const { stdout, stderr } = await execAsync(psqlCmd, { env });
      
      if (stderr && !stderr.includes('NOTICE')) {
        safeLogger.warn('⚠ psql warnings:', stderr);
      }

      result.success = true;
      safeLogger.info(`✅ Database restored successfully`);

    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      safeLogger.error('❌ Restore failed:', error);
    }

    return result;
  }

  async createSchemaBackup(): Promise<BackupResult> {
    safeLogger.info('📋 Creating schema-only backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', 'schema');
    
    return this.createBackup({
      includeData: false,
      schemaOnly: true,
      outputDir: backupDir,
      compress: true
    });
  }

  async createFullBackup(): Promise<BackupResult> {
    safeLogger.info('💾 Creating full database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups', 'full');
    
    return this.createBackup({
      includeData: true,
      schemaOnly: false,
      outputDir: backupDir,
      compress: true
    });
  }

  private async compressBackup(backupPath: string): Promise<string> {
    const compressedPath = `${backupPath}.gz`;
    
    try {
      await execAsync(`gzip ${backupPath}`);
      safeLogger.info(`🗜 Backup compressed: ${compressedPath}`);
      return compressedPath;
    } catch (error) {
      safeLogger.warn('⚠ Compression failed, keeping uncompressed backup');
      return backupPath;
    }
  }

  private async getFileStats(filePath: string) {
    try {
      const fs = await import('fs/promises');
      const stats = await fs.stat(filePath);
      return stats;
    } catch {
      return null;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async validateBackup(backupPath: string): Promise<boolean> {
    try {
      const content = await readFile(backupPath, 'utf-8');
      
      // Basic validation checks
      const hasHeader = content.includes('PostgreSQL database dump');
      const hasSchema = content.includes('CREATE TABLE') || content.includes('CREATE SCHEMA');
      const hasFooter = content.includes('PostgreSQL database dump complete');
      
      return hasHeader && (hasSchema || content.includes('COPY')) && hasFooter;
    } catch {
      return false;
    }
  }

  async listBackups(backupDir: string): Promise<string[]> {
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(backupDir);
      return files
        .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
        .sort()
        .reverse(); // Most recent first
    } catch {
      return [];
    }
  }
}

async function main() {
  safeLogger.info("💾 Database Backup & Recovery Tool");
  safeLogger.info("==================================");
  
  if (!process.env.DATABASE_URL) {
    safeLogger.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const backupManager = new DatabaseBackupManager(process.env.DATABASE_URL);
  const command = process.argv[2];

  try {
    switch (command) {
      case 'schema':
        await backupManager.createSchemaBackup();
        break;
        
      case 'full':
        await backupManager.createFullBackup();
        break;
        
      case 'restore':
        const backupPath = process.argv[3];
        if (!backupPath) {
          safeLogger.error("❌ Backup file path is required for restore");
          process.exit(1);
        }
        await backupManager.restoreBackup(backupPath);
        break;
        
      case 'list':
        const backupDir = process.argv[3] || path.join(process.cwd(), 'backups');
        const backups = await backupManager.listBackups(backupDir);
        safeLogger.info("📋 Available backups:");
        backups.forEach(backup => safeLogger.info(`  - ${backup}`));
        break;
        
      default:
        safeLogger.info("Usage:");
        safeLogger.info("  npm run backup schema  - Create schema-only backup");
        safeLogger.info("  npm run backup full    - Create full database backup");
        safeLogger.info("  npm run backup restore <path> - Restore from backup");
        safeLogger.info("  npm run backup list [dir] - List available backups");
        break;
    }
  } catch (error) {
    safeLogger.error("💥 Backup operation failed:", error);
    process.exit(1);
  } finally {
    await backupManager.close();
  }
}

if (require.main === module) {
  main();
}

export { DatabaseBackupManager };
