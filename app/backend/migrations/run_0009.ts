#!/usr/bin/env ts-node
/**
 * Migration Runner for User Monitoring System
 *
 * This script runs the 0009_create_user_monitoring_system migration
 * Usage: npm run migrate:0009
 *
 * Features:
 * - Automatic backup before migration
 * - Rollback on failure
 * - Verification after migration
 * - Detailed logging
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Database configuration from environment
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'linkdao',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

const MIGRATION_FILE = path.join(__dirname, '0009_create_user_monitoring_system.sql');
const BACKUP_DIR = path.join(__dirname, '../backups');

interface MigrationResult {
  success: boolean;
  message: string;
  tablesCreated?: string[];
  indexesCreated?: number;
  constraintsAdded?: number;
  error?: Error;
}

class MigrationRunner {
  private pool: Pool;
  private backupFile?: string;

  constructor() {
    this.pool = new Pool(DB_CONFIG);
  }

  /**
   * Create a database backup before migration
   */
  private async createBackup(): Promise<string> {
    console.log('📦 Creating database backup...');

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup_before_0009_${timestamp}.sql`);

    const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
    const pgDumpCmd = `PGPASSWORD="${DB_PASSWORD}" pg_dump -h ${DB_HOST || 'localhost'} -p ${DB_PORT || '5432'} -U ${DB_USER || 'postgres'} -d ${DB_NAME || 'linkdao'} > ${backupFile}`;

    try {
      await execAsync(pgDumpCmd);
      console.log(`✅ Backup created: ${backupFile}`);
      return backupFile;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw new Error('Backup failed. Migration aborted for safety.');
    }
  }

  /**
   * Check if migration has already been run
   */
  private async isMigrationAlreadyRun(): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'user_behavior_logs'
        ) as exists
      `);
      return result.rows[0].exists;
    } finally {
      client.release();
    }
  }

  /**
   * Verify dependencies exist
   */
  private async verifyDependencies(): Promise<void> {
    console.log('🔍 Verifying dependencies...');
    const client = await this.pool.connect();

    try {
      // Check if users table exists
      const usersExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'users'
        ) as exists
      `);

      if (!usersExists.rows[0].exists) {
        throw new Error('Required table "users" does not exist. Please run user migrations first.');
      }

      // Check if products table exists
      const productsExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'products'
        ) as exists
      `);

      if (!productsExists.rows[0].exists) {
        console.warn('⚠️  Warning: "products" table does not exist. Purchase tracking will be limited.');
      }

      console.log('✅ Dependencies verified');
    } finally {
      client.release();
    }
  }

  /**
   * Run the migration SQL
   */
  private async runMigration(): Promise<void> {
    console.log('🚀 Running migration 0009...');

    // Read migration file
    const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf-8');

    const client = await this.pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Execute migration
      await client.query(migrationSQL);

      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Migration executed successfully');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('❌ Migration failed, rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify migration results
   */
  private async verifyMigration(): Promise<{
    tablesCreated: string[];
    indexesCreated: number;
    constraintsAdded: number;
  }> {
    console.log('🔍 Verifying migration results...');
    const client = await this.pool.connect();

    try {
      // Check tables
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'user_behavior_logs',
            'user_transactions',
            'purchases',
            'wallet_activity',
            'risk_flags',
            'audit_logs'
          )
        ORDER BY table_name
      `);
      const tablesCreated = tablesResult.rows.map(r => r.table_name);

      // Check indexes
      const indexesResult = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN (
            'user_behavior_logs',
            'user_transactions',
            'purchases',
            'wallet_activity',
            'risk_flags',
            'audit_logs'
          )
      `);
      const indexesCreated = parseInt(indexesResult.rows[0].count);

      // Check constraints
      const constraintsResult = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_constraint
        WHERE conrelid IN (
          'user_behavior_logs'::regclass,
          'user_transactions'::regclass,
          'purchases'::regclass,
          'wallet_activity'::regclass,
          'risk_flags'::regclass,
          'audit_logs'::regclass
        )
      `);
      const constraintsAdded = parseInt(constraintsResult.rows[0].count);

      console.log(`✅ Tables created: ${tablesCreated.length}/6`);
      console.log(`   - ${tablesCreated.join(', ')}`);
      console.log(`✅ Indexes created: ${indexesCreated}`);
      console.log(`✅ Constraints added: ${constraintsAdded}`);

      return { tablesCreated, indexesCreated, constraintsAdded };
    } finally {
      client.release();
    }
  }

  /**
   * Record migration in migrations table
   */
  private async recordMigration(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Create migrations table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT NOW(),
          execution_time_ms INTEGER
        )
      `);

      // Record this migration
      await client.query(`
        INSERT INTO schema_migrations (version, name, execution_time_ms)
        VALUES ('0009', 'create_user_monitoring_system', $1)
        ON CONFLICT (version) DO NOTHING
      `, [0]); // execution_time_ms will be updated later if needed

      console.log('✅ Migration recorded in schema_migrations table');
    } finally {
      client.release();
    }
  }

  /**
   * Main migration execution
   */
  async run(): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('  Migration 0009: Create User Monitoring System');
      console.log('═══════════════════════════════════════════════════════\n');

      // Check if already run
      const alreadyRun = await this.isMigrationAlreadyRun();
      if (alreadyRun) {
        console.log('⚠️  Migration already applied. Skipping.');
        return {
          success: true,
          message: 'Migration already applied',
        };
      }

      // Create backup
      this.backupFile = await this.createBackup();

      // Verify dependencies
      await this.verifyDependencies();

      // Run migration
      await this.runMigration();

      // Verify results
      const verification = await this.verifyMigration();

      // Record migration
      await this.recordMigration();

      const executionTime = Date.now() - startTime;

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('✅ Migration 0009 completed successfully!');
      console.log(`⏱️  Execution time: ${executionTime}ms`);
      console.log('═══════════════════════════════════════════════════════\n');

      return {
        success: true,
        message: 'Migration completed successfully',
        ...verification,
      };

    } catch (error) {
      console.error('\n═══════════════════════════════════════════════════════');
      console.error('❌ Migration failed!');
      console.error('═══════════════════════════════════════════════════════\n');
      console.error(error);

      if (this.backupFile) {
        console.log(`\n📦 Backup available at: ${this.backupFile}`);
        console.log('To restore:');
        console.log(`psql -h ${DB_CONFIG.host} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} < ${this.backupFile}`);
      }

      return {
        success: false,
        message: 'Migration failed',
        error: error as Error,
      };
    } finally {
      await this.pool.end();
    }
  }
}

// Run migration if executed directly
if (require.main === module) {
  const runner = new MigrationRunner();

  runner.run()
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        console.error('Migration failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { MigrationRunner, MigrationResult };
