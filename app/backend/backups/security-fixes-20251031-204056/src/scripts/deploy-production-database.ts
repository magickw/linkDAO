import { runProductionMigrations, validateEnvironment, testDatabaseConnection } from './production-migrate';
import { safeLogger } from '../utils/safeLogger';
import { ProductionDataSeeder } from './seed-production-data';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseBackupManager } from './database-backup';
import { safeLogger } from '../utils/safeLogger';
import dotenv from "dotenv";
import { safeLogger } from '../utils/safeLogger';
import path from "path";
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

interface DeploymentOptions {
  skipBackup?: boolean;
  skipSeeding?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

interface DeploymentResult {
  success: boolean;
  steps: {
    backup?: boolean;
    migration?: boolean;
    seeding?: boolean;
    verification?: boolean;
  };
  errors: string[];
  warnings: string[];
}

class ProductionDatabaseDeployer {
  private connectionString: string;
  private backupManager: DatabaseBackupManager;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.backupManager = new DatabaseBackupManager(connectionString);
  }

  async close() {
    await this.backupManager.close();
  }

  async deployDatabase(options: DeploymentOptions = {}): Promise<DeploymentResult> {
    const result: DeploymentResult = {
      success: false,
      steps: {},
      errors: [],
      warnings: []
    };

    safeLogger.info("🚀 Production Database Deployment");
    safeLogger.info("=================================");
    
    if (options.dryRun) {
      safeLogger.info("🔍 DRY RUN MODE - No changes will be made");
    }

    try {
      // Step 1: Environment validation
      safeLogger.info("1️⃣ Validating environment...");
      await validateEnvironment();
      await testDatabaseConnection(this.connectionString);

      // Step 2: Pre-deployment backup
      if (!options.skipBackup && !options.dryRun) {
        safeLogger.info("2️⃣ Creating pre-deployment backup...");
        const backupResult = await this.backupManager.createFullBackup();
        result.steps.backup = backupResult.success;
        
        if (!backupResult.success) {
          result.warnings.push(`Backup failed: ${backupResult.error}`);
          safeLogger.warn("⚠ Backup failed, continuing with deployment...");
        } else {
          safeLogger.info(`✅ Backup created: ${backupResult.backupPath}`);
        }
      }

      // Step 3: Run migrations
      safeLogger.info("3️⃣ Running database migrations...");
      if (!options.dryRun) {
        const migrationResult = await runProductionMigrations();
        result.steps.migration = migrationResult.success;
        
        if (!migrationResult.success) {
          result.errors.push(...migrationResult.errors);
          throw new Error("Migration failed");
        }
      } else {
        safeLogger.info("  🔍 DRY RUN: Would run migrations");
        result.steps.migration = true;
      }

      // Step 4: Seed initial data
      if (!options.skipSeeding) {
        safeLogger.info("4️⃣ Seeding initial data...");
        if (!options.dryRun) {
          const seeder = new ProductionDataSeeder(this.connectionString);
          try {
            await seeder.seedSellerProfiles();
            await seeder.seedMarketplaceListings();
            await seeder.seedUserReputation();
            await seeder.verifySeededData();
            result.steps.seeding = true;
          } finally {
            await seeder.close();
          }
        } else {
          safeLogger.info("  🔍 DRY RUN: Would seed initial data");
          result.steps.seeding = true;
        }
      }

      // Step 5: Post-deployment verification
      safeLogger.info("5️⃣ Verifying deployment...");
      await this.verifyDeployment();
      result.steps.verification = true;

      result.success = true;
      safeLogger.info("🎉 Database deployment completed successfully!");

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      safeLogger.error("💥 Database deployment failed:", error);
    }

    return result;
  }

  private async verifyDeployment(): Promise<void> {
    const seeder = new ProductionDataSeeder(this.connectionString);
    
    try {
      await seeder.verifySeededData();
      safeLogger.info("✅ Deployment verification passed");
    } finally {
      await seeder.close();
    }
  }

  async rollbackDeployment(backupPath: string): Promise<boolean> {
    safeLogger.info("🔄 Rolling back database deployment...");
    
    try {
      const restoreResult = await this.backupManager.restoreBackup(backupPath);
      
      if (restoreResult.success) {
        safeLogger.info("✅ Database rollback completed successfully");
        return true;
      } else {
        safeLogger.error("❌ Database rollback failed:", restoreResult.error);
        return false;
      }
    } catch (error) {
      safeLogger.error("💥 Rollback failed:", error);
      return false;
    }
  }

  async getDeploymentStatus(): Promise<any> {
    const seeder = new ProductionDataSeeder(this.connectionString);
    
    try {
      // Check if critical tables exist and have data
      const status = {
        tablesExist: false,
        hasData: false,
        lastDeployment: null
      };

      // This would be implemented based on your specific needs
      await seeder.verifySeededData();
      status.tablesExist = true;
      status.hasData = true;

      return status;
    } catch (error) {
      return {
        tablesExist: false,
        hasData: false,
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      await seeder.close();
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    safeLogger.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const deployer = new ProductionDatabaseDeployer(process.env.DATABASE_URL);
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'deploy':
        const options: DeploymentOptions = {
          skipBackup: process.argv.includes('--skip-backup'),
          skipSeeding: process.argv.includes('--skip-seeding'),
          dryRun: process.argv.includes('--dry-run'),
          force: process.argv.includes('--force')
        };
        
        const result = await deployer.deployDatabase(options);
        
        if (!result.success) {
          safeLogger.error("❌ Deployment failed");
          result.errors.forEach(error => safeLogger.error(`  - ${error}`));
          process.exit(1);
        }
        break;
        
      case 'rollback':
        const backupPath = process.argv[3];
        if (!backupPath) {
          safeLogger.error("❌ Backup file path is required for rollback");
          process.exit(1);
        }
        
        const rollbackSuccess = await deployer.rollbackDeployment(backupPath);
        if (!rollbackSuccess) {
          process.exit(1);
        }
        break;
        
      case 'status':
        const status = await deployer.getDeploymentStatus();
        safeLogger.info("📊 Deployment Status:");
        safeLogger.info(JSON.stringify(status, null, 2));
        break;
        
      default:
        safeLogger.info("Usage:");
        safeLogger.info("  npm run deploy:db deploy [--skip-backup] [--skip-seeding] [--dry-run]");
        safeLogger.info("  npm run deploy:db rollback <backup-path>");
        safeLogger.info("  npm run deploy:db status");
        break;
    }
  } catch (error) {
    safeLogger.error("💥 Deployment operation failed:", error);
    process.exit(1);
  } finally {
    await deployer.close();
  }
}

if (require.main === module) {
  main();
}

export { ProductionDatabaseDeployer };