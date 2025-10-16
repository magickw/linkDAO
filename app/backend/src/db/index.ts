import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

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
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Failed to establish database connection:', error);
    client = null;
    db = null;
  }
} else {
  console.warn('⚠️  No DATABASE_URL provided. Database operations will be disabled.');
  client = null;
  db = null;
}

export { db, client };