import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import { safeLogger } from '../utils/safeLogger';
import dotenv from "dotenv";
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

async function main() {
  // For production, use the DATABASE_URL from environment variables
  // For development, you can use a local PostgreSQL instance
  const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";

  // Disable prefetch as it's not supported in production environments
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  safeLogger.info("Running migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    safeLogger.info("Migrations completed successfully!");
  } catch (error) {
    safeLogger.error("Error running migrations:", error);
  } finally {
    await client.end();
  }
}

main();