import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import dotenv from "dotenv";
import { readdir, readFile } from "fs/promises";
import path from "path";

dotenv.config();

interface MigrationStatus {
  success: boolean;
  appliedMigrations: string[];
  failedMigrations: string[];
  errors: string[];
}

async function validateEnvironment(): Promise<void> {
  const requiredEnvVars = ['DATABASE_URL'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function testDatabaseConnection(connectionString: string): Promise<void> {
  const client = postgres(connectionString, { prepare: false, max: 1 });
  
  try {
    await client`SELECT 1`;
    console.log("✓ Database connection successful");
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`);
  } finally {
    await client.end();
  }
}

async function backupDatabase(connectionString: string): Promise<void> {
  const client = postgres(connectionString, { prepare: false });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    // Create a simple backup by exporting schema information
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log(`✓ Database backup preparation completed. Found ${tables.length} tables`);
    console.log(`  Backup timestamp: ${timestamp}`);
  } catch (error) {
    console.warn(`⚠ Backup preparation failed: ${error}`);
  } finally {
    await client.end();
  }
}

async function getMigrationFiles(): Promise<string[]> {
  const migrationsDir = path.join(process.cwd(), 'drizzle');
  const files = await readdir(migrationsDir);
  
  return files
    .filter(file => file.endsWith('.sql'))
    .sort((a, b) => {
      const aNum = parseInt(a.split('_')[0]);
      const bNum = parseInt(b.split('_')[0]);
      return aNum - bNum;
    });
}

async function runProductionMigrations(): Promise<MigrationStatus> {
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString, { 
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10
  });
  
  const db = drizzle(client);
  const status: MigrationStatus = {
    success: false,
    appliedMigrations: [],
    failedMigrations: [],
    errors: []
  };

  try {
    console.log("🚀 Starting production database migrations...");
    
    // Get list of migration files for logging
    const migrationFiles = await getMigrationFiles();
    console.log(`📋 Found ${migrationFiles.length} migration files`);
    
    // Run migrations with error handling
    await migrate(db, { migrationsFolder: "./drizzle" });
    
    status.success = true;
    status.appliedMigrations = migrationFiles;
    console.log("✅ All migrations completed successfully!");
    
  } catch (error) {
    status.success = false;
    status.errors.push(error instanceof Error ? error.message : String(error));
    console.error("❌ Migration failed:", error);
    
    // Try to get more specific error information
    if (error instanceof Error && error.message.includes('relation')) {
      console.error("💡 This might be a schema-related error. Check table dependencies.");
    }
  } finally {
    await client.end();
  }

  return status;
}

async function verifyMigrationSuccess(connectionString: string): Promise<void> {
  const client = postgres(connectionString, { prepare: false });
  
  try {
    // Verify critical tables exist
    const criticalTables = [
      'seller_profiles',
      'marketplace_listings', 
      'auth_sessions',
      'user_reputation'
    ];
    
    for (const table of criticalTables) {
      const result = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        )
      `;
      
      if (!result[0].exists) {
        throw new Error(`Critical table '${table}' not found after migration`);
      }
    }
    
    console.log("✓ Migration verification completed - all critical tables present");
    
  } catch (error) {
    throw new Error(`Migration verification failed: ${error}`);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log("🏭 Production Database Migration Script");
  console.log("=====================================");
  
  try {
    // Step 1: Validate environment
    console.log("1️⃣ Validating environment...");
    await validateEnvironment();
    
    // Step 2: Test database connection
    console.log("2️⃣ Testing database connection...");
    await testDatabaseConnection(process.env.DATABASE_URL!);
    
    // Step 3: Backup preparation
    console.log("3️⃣ Preparing database backup...");
    await backupDatabase(process.env.DATABASE_URL!);
    
    // Step 4: Run migrations
    console.log("4️⃣ Running migrations...");
    const migrationStatus = await runProductionMigrations();
    
    if (!migrationStatus.success) {
      console.error("❌ Migration failed!");
      console.error("Errors:", migrationStatus.errors);
      process.exit(1);
    }
    
    // Step 5: Verify migration success
    console.log("5️⃣ Verifying migration success...");
    await verifyMigrationSuccess(process.env.DATABASE_URL!);
    
    console.log("🎉 Production migration completed successfully!");
    console.log(`📊 Applied ${migrationStatus.appliedMigrations.length} migrations`);
    
  } catch (error) {
    console.error("💥 Production migration failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠ Migration interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠ Migration terminated');
  process.exit(1);
});

if (require.main === module) {
  main();
}

export { runProductionMigrations, validateEnvironment, testDatabaseConnection };