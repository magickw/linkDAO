import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import { safeLogger } from '../utils/safeLogger';
import * as schema from "./schema";
import { safeLogger } from '../utils/safeLogger';
import dotenv from "dotenv";
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

// For production, use the DATABASE_URL from environment variables
// For development, you can use a local PostgreSQL instance
// If no DATABASE_URL is provided, the application will run without database connectivity
const connectionString = process.env.DATABASE_URL || "";

let client;
let db;

if (connectionString) {
  try {
    // Disable prefetch as it's not supported in production environments
    client = postgres(connectionString, { prepare: false });
    db = drizzle(client, { schema });
    safeLogger.info('✅ Database connection established successfully');
  } catch (error) {
    safeLogger.error('❌ Failed to establish database connection:', error);
    client = null;
    db = null;
  }
} else {
  safeLogger.warn('⚠️  No DATABASE_URL provided. Database operations will be disabled.');
  client = null;
  db = null;
}

export { db, client };