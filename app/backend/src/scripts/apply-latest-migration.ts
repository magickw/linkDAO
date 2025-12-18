import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  safeLogger.info("Applying latest migration (0072_keen_arclight.sql)...");
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, "../../drizzle/0072_keen_arclight.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
    
    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split("--> statement-breakpoint")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    safeLogger.info(`Found ${statements.length} statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        safeLogger.info(`Executing statement ${i + 1}/${statements.length}...`);
        await client.unsafe(statement);
        safeLogger.info(`Statement ${i + 1} executed successfully`);
      } catch (error: any) {
        // Skip errors for already existing objects, non-existent tables/columns
        if (
          error.code === '42P07' || // duplicate_table
          error.code === '42710' || // duplicate_object
          error.code === '42P01' || // undefined_table
          error.code === '42703' || // undefined_column
          error.message?.includes('already exists') ||
          error.message?.includes('does not exist')
        ) {
          safeLogger.warn(`Skipping statement ${i + 1}:`, error.message);
        } else {
          safeLogger.error(`Error executing statement ${i + 1}:`, error);
          throw error;
        }
      }
    }
    
    // Mark migration as applied (only if not already applied)
    const existingMigration = await client.unsafe(`
      SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = '0072_keen_arclight'
    `);
    
    if (existingMigration.length === 0) {
      await client.unsafe(`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES ('0072_keen_arclight', EXTRACT(EPOCH FROM NOW())::bigint * 1000)
      `);
    }
    
    safeLogger.info("Migration applied successfully!");
  } catch (error) {
    safeLogger.error("Error applying migration:", error);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  safeLogger.error("Fatal error:", error);
  process.exit(1);
});
