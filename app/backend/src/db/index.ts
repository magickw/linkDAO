import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

// For production, use the DATABASE_URL from environment variables
// For development, you can use a local PostgreSQL instance
const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";

// Disable prefetch as it's not supported in production environments
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });